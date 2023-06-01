import React, { useState, useEffect } from "react";
import { GraphAndDetail } from "./app/graph_and_detail";
import { SerializedGraph } from "llmtaskgraph";
import StatusBar from "./app/status_bar";
import useWebSocket from "./app/websocket";

const serverUrl = "ws://localhost:5678";

export default function App() {
  const [serializedGraph, setSerializedGraph] = useState(null);
  const { message, sendMessage } = useWebSocket(serverUrl);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (message) {
      console.log("Updated graph received");
      const parsedMessage = JSON.parse(message);
      const backendState = parsedMessage.backend_state;

      if (backendState === "RUNNING" && startTime === null) {
        setStartTime(new Date());
      } else if (backendState === "DONE") {
        setStartTime(null);
      }

      const graph = parsedMessage.graph;
      setSerializedGraph(new SerializedGraph(graph));
    }
  }, [message]);

  const handleEdit = (taskId, fieldName, fieldData) => {
    // Deep copy the serialized graph
    const newGraph = serializedGraph.copy();

    if (taskId === undefined) {
      // We're editing the graph itself. The only editable field is graph_input.
      if (fieldName !== "graph_input") {
        console.log("Invalid field name");
        return;
      }

      newGraph.serialized_graph.graph_input = fieldData;
      newGraph.invalidateSubgraph(newGraph.serialized_graph);
    } else {
      // Find the task
      const task = newGraph.getTask(taskId);
      if (!task) {
        console.log(`Task ${taskId} not found`);
        return;
      }

      // Update the field
      task[fieldName] = fieldData;
      newGraph.onTaskUpdated(taskId, fieldName);
    }

    // Update the state
    setSerializedGraph(newGraph);
  };

  const sendGraph = () => {
    console.log("Sending updated task graph");
    sendMessage(JSON.stringify(serializedGraph.serialized_graph));
  };

  return (
    <div className="app">
      {serializedGraph ? (
        <>
          <StatusBar startTime={startTime} onRun={sendGraph} />
          <GraphAndDetail
            serialized_graph={serializedGraph}
            onEdit={handleEdit}
          />
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
