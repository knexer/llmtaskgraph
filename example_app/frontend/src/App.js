import React, { useState, useEffect } from "react";
import { GraphAndDetail } from "./app/graph_and_detail";
import { SerializedGraph } from "llmtaskgraph";
import StatusBar from "./app/status_bar";
import useSession, { SessionState } from "./app/session";

const serverUrl = "ws://localhost:5678";

export default function App() {
  const [serializedGraph, setSerializedGraph] = useState(null);
  const { connected, sessionState, graphData, sendGraphData } =
    useSession(serverUrl);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (graphData) {
      if (sessionState === SessionState.RUNNING && startTime === null) {
        setStartTime(new Date());
      } else if (sessionState === SessionState.EDITING) {
        setStartTime(null);
      }

      setSerializedGraph(new SerializedGraph(graphData));
    }
  }, [graphData]);

  const handleEdit = (taskId, fieldName, fieldData) => {
    // Deep copy the serialized graph
    const newGraph = serializedGraph.copy();

    // There are two cases: editing the graph itself, or editing a task.
    if (taskId === undefined) {
      // We're editing the graph itself. The only editable field is graph_input.
      if (fieldName !== "graph_input") {
        throw new Error("Invalid field name");
      }

      newGraph.graphData.graph_input = fieldData;
      newGraph.invalidateSubgraph(newGraph.graphData);
    } else {
      // We're editing a task.
      const task = newGraph.getTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update the specified field.
      task[fieldName] = fieldData;
      newGraph.onTaskUpdated(taskId, fieldName);
    }

    // Update the state
    setSerializedGraph(newGraph);
  };

  const sendGraph = () => {
    sendGraphData(serializedGraph.graphData);
  };

  return (
    <div className="app">
      {connected && serializedGraph ? (
        <>
          <StatusBar startTime={startTime} onRun={sendGraph} />
          <GraphAndDetail
            serializedGraph={serializedGraph}
            onEdit={handleEdit}
            editEnabled={sessionState === SessionState.EDITING}
          />
        </>
      ) : (
        <p>Waiting for server...</p>
      )}
    </div>
  );
}
