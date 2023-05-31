import React, { useState, useEffect, useRef } from "react";
import { GraphAndDetail } from "./app/graph_and_detail";
import { SerializedGraph } from "llmtaskgraph";
import StatusBar from "./app/status_bar";

const serverUrl = "ws://localhost:5678";

export default function App() {
  const [serialized_graph, setSerializedGraph] = useState(null);
  const [ws, setWs] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const startTimeRef = useRef(null);
  startTimeRef.current = startTime;

  // Initialize WebSocket connection when the component mounts
  useEffect(() => {
    const ws = new WebSocket(serverUrl);
    setWs(ws);

    console.log("Connecting to server");

    ws.onopen = () => {
      console.log("Connected to server");
    };

    ws.onmessage = (event) => {
      console.log("Updated graph received");
      const message = JSON.parse(event.data);
      const backendState = message.backend_state;

      if (backendState === "RUNNING" && startTimeRef.current === null) {
        setStartTime(new Date());
      } else if (backendState === "DONE") {
        setStartTime(null);
      }
      const graph = message.graph;
      setSerializedGraph(new SerializedGraph(graph));
    };

    ws.onclose = () => {
      console.log("Connection closed");
    };

    // Clean up the connection when the component unmounts
    return () => ws.close();
  }, []);

  const handleEdit = (task_id, fieldName, fieldData) => {
    // Deep copy the serialized graph
    const new_graph = serialized_graph.copy();

    if (task_id === undefined) {
      // We're editing the graph itself. The only editable field is graph_input.
      if (fieldName !== "graph_input") {
        console.log("Invalid field name");
        return;
      }

      new_graph.serialized_graph.graph_input = fieldData;
      new_graph.invalidateSubgraph(new_graph.serialized_graph);
    } else {
      // Find the task
      const task = new_graph.getTask(task_id);
      if (!task) {
        console.log(`Task ${task_id} not found`);
        return;
      }

      // Update the field
      task[fieldName] = fieldData;
      new_graph.onTaskUpdated(task_id, fieldName);
    }

    // Update the state
    setSerializedGraph(new_graph);
  };

  const sendGraph = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not connected");
      return;
    }
    console.log("Sending updated task graph");
    ws.send(JSON.stringify(serialized_graph.serialized_graph));
  };

  return (
    <div className="app">
      {serialized_graph ? (
        <>
          <StatusBar startTime={startTime} onRun={sendGraph} />
          <GraphAndDetail
            serialized_graph={serialized_graph}
            onEdit={handleEdit}
          />
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
