import React from "react";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import useLayoutedGraph from "./graph_layout";

import { TaskNode } from "./task_node";

import "reactflow/dist/style.css";

const nodeTypes = {
  Task: TaskNode,
};

export default function Graph({
  serializedGraph,
  selectedTaskId,
  onTaskSelected,
}) {
  const graph = useLayoutedGraph(serializedGraph);

  if (!graph) {
    return <div>Loading...</div>;
  }

  const onNodeClick = (_, node) => {
    // Possibly also somehow highlight the selected node?
    // Possibly also highlight related nodes?
    onTaskSelected(node.data.task.task_id);
  };

  const onPaneClick = (_) => {
    onTaskSelected(null);
  };

  // Update each node in graph.nodes based on selected task.
  const relatedTaskIds = selectedTaskId
    ? serializedGraph.getRelatedTaskIds(selectedTaskId)
    : new Set(serializedGraph.allTasks().map((task) => task.task_id));
  const nodesWithSelectionState = graph.nodes.map((node) => {
    const selectionState =
      node.id === selectedTaskId
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
