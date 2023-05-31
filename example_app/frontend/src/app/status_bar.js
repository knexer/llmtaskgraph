import React from "react";

export default function StatusBar({ startTime, onRun, onStop }) {
  const elapsedTime = (startTime) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="status-bar">
      <div>LLMTaskGraph</div>
      {startTime ? (
        <>
          <div>Running for {elapsedTime(startTime)}</div>
          {/* <button onClick={onStop}>Stop</button> */}
        </>
      ) : (
        <button onClick={onRun}>Run</button>
      )}
    </div>
  );
}
