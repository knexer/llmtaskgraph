import React, { useState, useEffect } from "react";

import ELK from "elkjs";

function makeNodes(graph, task, direction, parentId = null) {
  const node = {
    id: task.task_id,
    parentNode: parentId,
    type: "Task",
    data: { graph: graph, task: task, direction: direction },
  };
  if (task.type === "TaskGraphTask") {
    return [node].concat(
      task.subgraph.tasks.flatMap((subgraphTask) =>
        makeNodes(graph, subgraphTask, direction, node.id)
      )
    );
  }
  return [node];
}

function makeEdge(task, depTaskId, tasks, sourceHandle = "output") {
  const depTask = tasks.find((t) => t.task_id === depTaskId);
  const edge = {
    id: `${task.task_id}-${depTask.task_id}`,
    source: depTask.task_id,
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
  const createdBy = task.created_by
    ? [makeEdge(task, task.created_by, tasks, "task creation")]
    : [];
  return deps.concat(kwdeps).concat(createdBy);
}

const useLayoutedGraph = (serializedGraph) => {
  const [graph, setGraph] = useState(null);

  // elkLayout is async
  useEffect(() => {
    const direction = "TB"; // TB or LR

    const allTasks = serializedGraph.allTasks();
    const initialNodes = serializedGraph.graphData.tasks.flatMap((task) =>
      makeNodes(serializedGraph, task, direction)
    );
    const initialEdges = allTasks.flatMap((task) => makeEdges(task, allTasks));

    elkLayout(initialNodes, initialEdges, direction).then((layouted) => {
      console.log("layouted");
      setGraph(layouted);
    });
    return () => {};
  }, [serializedGraph]);

  return graph;
};

const elk = new ELK();

async function elkLayout(nodes, edges, direction /* = "TB" or "LR" */) {
  // Nodes is a flat list, but each node in nodes may have a parent field with the id of their containing node. ELK needs a tree.
  // E.g.: for input:
  //   [{id: "a", parent: null}, {id: "b", parent: "a"}, {id: "c", parent: "a"}]
  // E.g.: output should be:
  //   {id: "root", children: [{id: "a", children: [{id: "b"}, {id: "c"}]}]}

  const nodeChildren = {};
  const rootNodes = [];
  nodes.forEach((node) => {
    const parentId = node.parentNode;
    if (parentId) {
      if (nodeChildren[parentId]) {
        nodeChildren[parentId].push(node);
      } else {
        nodeChildren[parentId] = [node];
      }
    } else {
      rootNodes.push(node);
    }
  });

  const layoutOptions = {
    "elk.algorithm": "layered",
    "elk.direction": direction === "TB" ? "DOWN" : "RIGHT",
    "elk.spacing.nodeNode": 50,
    "elk.padding": "[top=50,left=25,bottom=0,right=0]",
  };

  const elkTree = (node) => {
    const children = nodeChildren[node.id];
    if (children) {
      return {
        id: node.id,
        layoutOptions: {
          ...layoutOptions,
          "elk.layered.spacing.nodeNodeBetweenLayers": 75,
        },
        children: children.map(elkTree),
      };
    } else {
      return {
        id: node.id,
        width: 172,
        height: 50,
      };
    }
  };
  const graph = {
    id: "root",
    layoutOptions: {
      ...layoutOptions,
      "elk.layered.spacing.nodeNodeBetweenLayers": 50,
    },
    children: rootNodes.map(elkTree),
    edges: edges,
  };

  const layoutedGraph = await elk.layout(graph);

  // Update nodes with the x and y coordinates from ELK
  // We must recurse through ELK's tree and match it up to our flat list of nodes
  const updateNodes = (elkNode, nodeMap) => {
    const node = nodeMap[elkNode.id];
    node.position = { x: elkNode.x, y: elkNode.y };
    if (node.data.task.type === "TaskGraphTask") {
      node.data.width = elkNode.width;
      node.data.height = elkNode.height;
    }
    if (elkNode.children) {
      elkNode.children.forEach((child) => updateNodes(child, nodeMap));
    }
  };

  const nodeMap = {};
  nodes.forEach((node) => {
    nodeMap[node.id] = node;
  });

  layoutedGraph.children.forEach((child) => updateNodes(child, nodeMap));

  return {
    nodes,
    edges,
    width: layoutedGraph.width,
    height: layoutedGraph.height,
  };
}

export default useLayoutedGraph;
