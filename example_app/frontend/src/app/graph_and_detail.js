import { useState } from "react";

import { Graph, TaskDetail } from "llmtaskgraph";

export function GraphAndDetail({ serializedGraph, onEdit, editEnabled }) {
  const [selectedTaskId, updateSelectedTaskId] = useState(null);

  return (
    <div className={"graph-and-detail"}>
      <Graph
        serializedGraph={serializedGraph}
        selectedTaskId={selectedTaskId}
        onTaskSelected={updateSelectedTaskId}
      />
      <TaskDetail
        key={selectedTaskId}
        graph={serializedGraph}
        taskId={selectedTaskId}
        onEdit={onEdit}
        editEnabled={editEnabled}
      />
    </div>
  );
}
