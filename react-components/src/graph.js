import React, { useEffect } from "react";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import elkLayout from "./graph_layout";

import { TaskNode } from "./task_node";

import "reactflow/dist/style.css";

function makeNode(graph, task, direction, parentId) {
  return {
    id: task.task_id,
    parentNode: parentId,
    type: "Task",
    data: { graph: graph, task: task, direction: direction },
  };
}

function makeNodes(graph, task, direction, parentId = null) {
  const node = makeNode(graph, task, direction, parentId);
  if (task.type === "TaskGraphTask") {
    return [node].concat(
      task.subgraph.tasks.flatMap((subgraphTask) =>
        makeNodes(graph, subgraphTask, direction, node.id)
      )
    );
  }
  return [node];
}

function makeEdge(task, dep_task_id, tasks, sourceHandle = "output") {
  const dep_task = tasks.find((t) => t.task_id === dep_task_id);
  const edge = {
    id: `${task.task_id}-${dep_task.task_id}`,
    source: dep_task.task_id,
    target: task.task_id,
    sourceHandle: sourceHandle,
  };
  return edge;
}

function makeEdges(task, tasks) {
  const deps = task.deps.map((dep) => makeEdge(task, dep, tasks));
  const kwdeps = Object.values(task.kwdeps).map((dep) =>
    makeEdge(task, dep, tasks)
  );
  const created_by = task.created_by
    ? [makeEdge(task, task.created_by, tasks, "task creation")]
    : [];
  return deps.concat(kwdeps).concat(created_by);
}

const nodeTypes = {
  Task: TaskNode,
};

export default function Graph({
  serialized_graph,
  selected_task_id,
  select_task_id,
}) {
  // Create nodes from serialized graph

  // Create graph state
  const [graph, setGraph] = React.useState(null);

  // elkLayout is async
  useEffect(() => {
    const direction = "TB"; // TB or LR

    const all_tasks = serialized_graph.allTasks();
    const initialNodes = serialized_graph.serialized_graph.tasks.flatMap(
      (task) => makeNodes(serialized_graph, task, direction)
    );
    const initialEdges = all_tasks.flatMap((task) =>
      makeEdges(task, all_tasks)
    );

    elkLayout(initialNodes, initialEdges, direction).then((layouted) => {
      setGraph(layouted);
    });
    return () => {};
  }, [serialized_graph]);

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
  graph.nodes = graph.nodes.map((node) => {
    const selection_state =
      node.id === selected_task_id
        ? "selected"
        : relatedTaskIds.has(node.id)
        ? "related"
        : "unrelated";
    return { ...node, data: { ...node.data, selection_state } };
  });

  return (
    <div className="graph">
      <ReactFlow
        nodes={graph.nodes}
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

// TODO:
// styling: show task state visually - with color?
// add node selection:
// - refocus the graph around the selected node?
// - allow editing of task - change outputs, invalidate the task, etc. - producing an updated serialized graph
// subgraph support for TaskGraphTask
