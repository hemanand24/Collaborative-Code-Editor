import Editor from "@monaco-editor/react";

export default function MonacoEditor({ code, onChange, language }) {
  return (
    <Editor
      height="60vh"
      language={language}
      value={code}
      onChange={(value) => onChange(value)}
      options={{
        minimap: { enabled: false },
        fontSize: 16,
        automaticLayout: true,
      }}
    />
  );
}
