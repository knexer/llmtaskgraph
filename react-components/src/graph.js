import React from "react";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import useLayoutedGraph from "./graph_layout";

import { TaskNode } from "./task_node";

import "reactflow/dist/style.css";

const nodeTypes = {
  Task: TaskNode,
};

export default function Graph({
  serialized_graph,
  selected_task_id,
  select_task_id,
}) {
  const graph = useLayoutedGraph(serialized_graph);

  if (!graph) {
    return <div>Loading...</div>;
  }

  const onNodeClick = (_, node) => {
    // Possibly also somehow highlight the selected node?
    // Possibly also highlight related nodes?
    select_task_id(node.data.task.task_id);
  };

  const onPaneClick = (_) => {
    select_task_id(null);
  };

  // Update each node in graph.nodes based on selected task.
  const relatedTaskIds = selected_task_id
    ? serialized_graph.getRelatedTaskIds(selected_task_id)
    : new Set(serialized_graph.allTasks().map((task) => task.task_id));
  const nodesWithSelectionState = graph.nodes.map((node) => {
    const selectionState =
      node.id === selected_task_id
        ? "selected"
        : relatedTaskIds.has(node.id)
        ? "related"
        : "unrelated";
    return { ...node, data: { ...node.data, selectionState } };
  });

  return (
    <div className="graph">
      <ReactFlow
        nodes={nodesWithSelectionState}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        elementsSelectable={true}
        fitView={true}
        fitViewOptions={{ padding: 0.1 }}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesDraggable={false}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
