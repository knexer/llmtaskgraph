import ELK from "elkjs";

const elk = new ELK();

async function elkLayout(nodes, edges, direction /* = "TB" or "LR" */) {
    // Nodes is a flat list, but nodes may have a parent field with the id of their containing node. ELK needs a tree.
    // E.g.: [{id: "a", parent: null}, {id: "b", parent: "a"}, {id: "c", parent: "a"}] is input
    // E.g.: {id: "root", children: [{id: "a", children: [{id: "b"}, {id: "c"}]}]} is output

    // First, make a map from node id to node
    const nodeMap = {};
    nodes.forEach((node) => {
        nodeMap[node.id] = node;
    });
    // Then, make a map from node id to list of children
    const childrenMap = {};
    const rootNodes = [];
    nodes.forEach((node) => {
        const parentId = node.parentNode;
        if (parentId) {
            if (childrenMap[parentId]) {
                childrenMap[parentId].push(node);
            } else {
                childrenMap[parentId] = [node];
            }
        } else {
            rootNodes.push(node);
        }
    });
    // Then, recursively build the tree
    const buildTree = (node) => {
        const children = childrenMap[node.id];
        if (children) {
            return {
                id: node.id,
                layoutOptions: {
                    "elk.algorithm": "layered",
                    "elk.direction": direction === "TB" ? "DOWN" : "RIGHT",
                    "elk.layered.spacing.nodeNodeBetweenLayers": 75,
                    "elk.spacing.nodeNode": 50,
                    "elk.padding": "[top=50,left=25,bottom=0,right=0]"
                },
                children: children.map((child) => buildTree(child))
            };
        } else {
            return {
                id: node.id,
                width: 172,
                height: 50
            };
        }
    };
    const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": direction === "TB" ? "DOWN" : "RIGHT",
            "elk.layered.spacing.nodeNodeBetweenLayers": 50,
            "elk.spacing.nodeNode": 50,
            "elk.padding": "[top=50,left=25,bottom=0,right=0]"
        },
        children: rootNodes.map((node) => buildTree(node)),
        edges: edges
    };

    const root = await elk.layout(graph);

    // Update nodes with the x and y coordinates from ELK
    // We must recurse through ELK's tree and match it up to our flat list of nodes
    const updateNodes = (elkNode, nodeMap) => {
        const node = nodeMap[elkNode.id];
        node.position = {x: elkNode.x, y: elkNode.y};
        if (node.data.task.type === "TaskGraphTask") {
            node.data.width = elkNode.width;
            node.data.height = elkNode.height;
        }
        if (elkNode.children) {
            elkNode.children.forEach((child) => updateNodes(child, nodeMap));
        }
    };
    root.children.forEach((child) => updateNodes(child, nodeMap));

    return {nodes, edges, width: root.width, height: root.height};
};

export default elkLayout;