const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const Docker = require("dockerode");

const docker = new Docker();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("New client:", socket.id);

  socket.on("code_change", (data) => socket.broadcast.emit("code_change", data));
  socket.on("language_change", (newLang) => socket.broadcast.emit("language_change", newLang));
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// LANGUAGE CONFIG
const languageConfigs = {
  javascript: {
    image: "node:18",
    extension: "js",
    cmd: (filename) => ["node", `/code/${filename}`],
  },
  python: {
    image: "python:3.11",
    extension: "py",
    cmd: (filename) => ["python", `/code/${filename}`],
  },
  cpp: {
    image: "gcc",
    extension: "cpp",
    cmd: (filename) => ["/bin/sh", "-c", `g++ /code/${filename} -o /code/a.out && /code/a.out`],
  },
  java: {
    image: "openjdk:17",
    extension: "java",
    cmd: () => ["/bin/sh", "-c", `cd /code && javac Main.java && java Main`],
  },
};

app.post("/run", async (req, res) => {
  const { language, code } = req.body;
  const config = languageConfigs[language];

  if (!config) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  const filename = language === "java" ? "Main.java" : `main-${Date.now()}.${config.extension}`;
  const filePath = path.join(__dirname, filename);

  try {
    fs.writeFileSync(filePath, code);

    const container = await docker.createContainer({
      Image: config.image,
      Cmd: config.cmd(filename),
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [`${__dirname}:/code`],
        AutoRemove: true,
      },
    });

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    let output = "";
    stream.on("data", (chunk) => {
      output += chunk.toString();
    });

    await container.start();

    container.wait().then(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      // Broadcast output to all clients
      io.emit("code_output", output);

      res.json({ output });
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: err.toString() });
  }
});


const PORT = 4000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
