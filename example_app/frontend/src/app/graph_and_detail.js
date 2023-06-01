import { useState } from "react";

import { Graph, TaskDetail } from "llmtaskgraph";

export function GraphAndDetail({ serialized_graph, onEdit }) {
  const [selectedTaskId, updateSelectedTaskId] = useState(null);

  return (
    <div className={"graph-and-detail"}>
      <Graph
        serialized_graph={serialized_graph}
        selected_task_id={selectedTaskId}
        select_task_id={updateSelectedTaskId}
      />
      <TaskDetail
        key={selectedTaskId}
        graph={serialized_graph}
        taskId={selectedTaskId}
        onEdit={onEdit}
      />
    </div>
  );
}
