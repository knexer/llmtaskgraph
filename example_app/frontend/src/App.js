import React, { useState, useEffect } from "react";
import { GraphAndDetail } from "./app/graph_and_detail";

const serverUrl = "ws://localhost:5678";

function allTasks(graph) {
  return graph.tasks.flatMap((task) => [task].concat(task.type === "TaskGraphTask" ? allTasks(task.subgraph) : []));
}

export default function App() {
  const [serialized_graph, setSerializedGraph] = useState(null);
  const [ws, setWs] = useState(null);

  // Initialize WebSocket connection when the component mounts
  useEffect(() => {
    const ws = new WebSocket(serverUrl);
    setWs(ws);

    console.log("Connecting to server");

    ws.onopen = () => {
      console.log("Connected to server");
    };

    ws.onmessage = (event) => {
      console.log("Updated graph received")
      const data = JSON.parse(event.data);
      setSerializedGraph(data);
    };

    ws.onclose = () => {
      console.log('Connection closed');
    };

    // Clean up the connection when the component unmounts
    return () => ws.close();
  }, []);

  const handleEdit = (task_id, output_data) => {
    // Deep copy the serialized graph
    const new_graph = JSON.parse(JSON.stringify(serialized_graph));

    // Find the task
    const task = allTasks(new_graph).find((task) => task.task_id === task_id);
    if (!task) return;

    // Update the output_data
    task.output_data = output_data;

    // Update the state
    setSerializedGraph(new_graph);
  };

  const sendGraph = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not connected");
      return;
    }
    console.log("Sending updated task graph")
    ws.send(JSON.stringify(serialized_graph));
  };

  return (
    <div className="app">
      {serialized_graph ? (
        <>
          <button onClick={sendGraph}>Run</button>
          <GraphAndDetail serialized_graph={serialized_graph} onEdit={handleEdit} />
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
