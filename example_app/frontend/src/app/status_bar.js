import React from "react";

export default function StatusBar({ onRun }) {
  return (
    <div className="status-bar">
      <div>LLMTaskGraph</div>
      <button onClick={onRun}>Run</button>
    </div>
  );
}
