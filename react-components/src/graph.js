import React, {useEffect} from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
} from "reactflow";
import elkLayout from "./graph_layout";

import { TaskNode } from "./task_node";

import "reactflow/dist/style.css";

function allTasks(graph) {
  return graph.tasks.flatMap((task) => [task].concat(task.type === "TaskGraphTask" ? allTasks(task.subgraph) : []));
}

function makeNode(task, direction, parentId) {
  return {
    id: task.task_id,
    parentNode: parentId,
    type: "Task",
    data: { task: task, direction: direction },
  };
}

function makeNodes(task, direction, parentId = null) {
  const node = makeNode(task, direction, parentId);
  if (task.type === "TaskGraphTask") {
    return [node].concat(task.subgraph.tasks.flatMap((subgraphTask) => makeNodes(subgraphTask, direction, node.id)));
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
  const deps = task.deps.map((dep) =>
    makeEdge(task, dep, tasks)
  );
  const kwdeps = Object.values(task.kwdeps).map((dep) =>
    makeEdge(task, dep, tasks)
  );
  const created_by = task.created_by
    ? [makeEdge(task, task.created_by, tasks, "task creation")]
    : [];
  return deps.concat(kwdeps).concat(created_by);
}

const nodeTypes = {
  "Task": TaskNode,
};

export default function Graph({ serialized_graph, select_task_id }) {
  // Create nodes from serialized graph

  // Create graph state
  const [graph, setGraph] = React.useState(null);

  // elkLayout is async
  useEffect(() => {
    const direction = "TB"; // TB or LR

    const all_tasks = allTasks(serialized_graph);
    const initialNodes = serialized_graph.tasks.flatMap((task) =>
      makeNodes(task, direction)
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
  };

  const onNodeClick = (_, node) => {
    // Possibly also somehow highlight the selected node?
    // Possibly also highlight related nodes?
    select_task_id(node.data.task.task_id);
  };

  const onPaneClick = (_) => {
    select_task_id(null);
  };

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
