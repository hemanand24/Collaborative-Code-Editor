import { useState, useEffect } from "react";
import io from "socket.io-client";
import MonacoEditor from "./MonacoEditor";
import './App.css';

const socket = io("http://localhost:4000");

export default function App() {
  const [code, setCode] = useState("// Start typing here...");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");

  const languages = [
    { label: "JavaScript", value: "javascript" },
    { label: "Python", value: "python" },
    { label: "C++", value: "cpp" },
    { label: "Java", value: "java" },
  ];

  useEffect(() => {
    socket.on("code_change", setCode);
    socket.on("language_change", setLanguage);
    socket.on("code_output", setOutput);  // Listen for output

    return () => {
      socket.off("code_change");
      socket.off("language_change");
      socket.off("code_output");
    };
  }, []);

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit("code_change", value);
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    socket.emit("language_change", newLang);
  };

  const handleRunCode = async () => {
    try {
      await fetch("http://localhost:4000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      // Don't set output here - it comes via socket event
    } catch (err) {
      setOutput("Error connecting to server.");
    }
  };

  return (
    <div className="container">
      <h1 className="title">Collaborative Code Editor</h1>

      <div className="toolbar">
        <label htmlFor="language-select" className="label">Language:</label>
        <select
          id="language-select"
          value={language}
          onChange={handleLanguageChange}
          className="select"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        <button className="run-button" onClick={handleRunCode}>
          Run
        </button>
      </div>

      <MonacoEditor code={code} onChange={handleCodeChange} language={language} />

      <div className="output-container">
        <h2>Output:</h2>
        <pre className="output">{output}</pre>
      </div>
    </div>
  );
}
