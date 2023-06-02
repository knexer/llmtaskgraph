import asyncio
import websockets
import json

from llmtaskgraph.task_graph import TaskGraph


class WebSocketServer:
    def __init__(self, initial_task_graph, function_registry):
        self.initial_task_graph: TaskGraph = initial_task_graph
        self.state = "waiting"
        self.task_graph: TaskGraph = initial_task_graph
        self.function_registry = function_registry

    async def server(self, websocket, path):
        print("Client connected.")
        # Send the initial task graph to the client so it can reset us to the initial state if it wants to
        await websocket.send(
            json.dumps(
                {
                    "backend_state": "connected",
                    "graph": self.task_graph.to_json(),
                    "initial_graph": self.initial_task_graph.to_json(),
                }
            )
        )

        # Main event loop:
        while True:
            # Has two modes depending on current state:
            if self.state == "waiting":
                # wait for a start message with an updated task graph
                await self.get_updated_graph(websocket)
                print("Updated task graph received, running...")
                self.state = "running"
            elif self.state == "running":
                # run TaskGraph until it is complete or a stop message is received, sending realtime updates to the client
                await self.execute_current_graph(websocket)
                print("Task graph completed, waiting for new graph...")
                self.state = "waiting"
                await self.send_graph(websocket, self.state, self.task_graph)

    async def execute_current_graph(self, websocket):
        # Start the current task graph
        graph_exec = asyncio.create_task(self.task_graph.run(self.function_registry))
        # Also listen for a stop message
        recv = asyncio.create_task(websocket.recv())

        while not graph_exec.done() and not recv.done():
            # Wait one second or until something happens
            await asyncio.wait(
                [recv, graph_exec], timeout=1, return_when=asyncio.FIRST_COMPLETED
            )

            if recv.done():
                # We must have received a stop message. Cancel the task graph and break out of the loop.
                message_data = json.loads(await recv)
                assert message_data["command"] == "STOP"

                graph_exec.cancel()
                self.task_graph = (
                    TaskGraph.from_json(message_data["graph"])
                    if message_data["graph"]
                    else self.task_graph
                )
                print("Task graph stopped by frontend.")
                break

            # Send an updated graph to the client
            await self.send_graph(websocket, self.state, self.task_graph)
            print("Task graph update sent.")

        if graph_exec.done() and graph_exec.exception() is not None:
            print("Task graph failed.")

        if not recv.done():
            recv.cancel()
            try:
                await recv
            except asyncio.CancelledError:
                pass

    async def send_graph(self, websocket, state, graph: TaskGraph):
        await websocket.send(
            json.dumps({"backend_state": state, "graph": graph.to_json()})
        )

    async def get_updated_graph(self, websocket):
        message_data = json.loads(await websocket.recv())
        assert message_data["command"] == "START"
        self.task_graph = TaskGraph.from_json(message_data["graph"])

    def run(self, host="localhost", port=5678):
        print("Starting server.")
        start_server = websockets.serve(self.server, host, port)  # type: ignore
        asyncio.get_event_loop().run_until_complete(start_server)
        asyncio.get_event_loop().run_forever()
