import { useState } from "react";

import {Graph, TaskDetail} from "llmtaskgraph";

export function GraphAndDetail({ serialized_graph, onEdit }) {
  const [selected_task_id, update_selected_task_id] = useState(null);

  return (
    <div className={"graph-and-detail"}>
      <Graph
        serialized_graph={serialized_graph}
        select_task_id={update_selected_task_id}
      />
      <TaskDetail key={selected_task_id} graph={serialized_graph} task_id={selected_task_id} onEdit={onEdit} />
    </div>
  );
}
