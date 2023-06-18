import asyncio
from typing import Any, Callable
from websockets.server import serve, WebSocketServerProtocol
import json

from llmtaskgraph.task_graph import TaskGraph


class WebSocketServer:
    def __init__(
        self,
        initial_task_graph: TaskGraph,
        function_registry: dict[str, Callable[..., Any]],
    ):
        self.initial_task_graph: TaskGraph = initial_task_graph
        self.state = "waiting"
        self.task_graph: TaskGraph = initial_task_graph
        self.function_registry = function_registry
        self.graph_exec = None
        self.recv: asyncio.Future[str] | None = None

    async def server(self, websocket: WebSocketServerProtocol):
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
                print("Waiting for updated task graph...")
                await self.get_updated_graph(websocket)
                self.state = "running"
            elif self.state == "running":
                # run TaskGraph until it is complete or a stop message is received, sending realtime updates to the client
                print("Running task graph...")
                await self.execute_current_graph(websocket)
                self.state = "waiting"
                await self.send_graph(websocket, self.state, self.task_graph)

    async def execute_current_graph(self, websocket: WebSocketServerProtocol):
        reveal_type(websocket)
        # Start the current task graph, if it isn't already running
        if not self.graph_exec:
            self.graph_exec = asyncio.create_task(
                self.task_graph.run(self.function_registry)
            )
        # Also listen for a stop message
        self.recv = asyncio.create_task(websocket.recv())  # type: ignore

        while not self.graph_exec.done() and not self.recv.done():
            # Wait one second or until something happens
            await asyncio.wait(
                [self.recv, self.graph_exec],
                timeout=1,
                return_when=asyncio.FIRST_COMPLETED,
            )

            if self.recv.done():
                # We must have received a stop message. Cancel the task graph and break out of the loop.
                message_data = json.loads(await self.recv)
                assert message_data["command"] == "STOP"

                self.graph_exec.cancel()
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

        if self.graph_exec.done() and self.graph_exec.exception() is not None:
            print("Task graph failed.")

        if not self.recv.done():
            self.recv.cancel()
            try:
                await self.recv
            except asyncio.CancelledError:
                pass

        self.graph_exec = None
        self.recv = None

    async def send_graph(
        self, websocket: WebSocketServerProtocol, state: str, graph: TaskGraph
    ):
        await websocket.send(
            json.dumps({"backend_state": state, "graph": graph.to_json()})
        )

    async def get_updated_graph(self, websocket: WebSocketServerProtocol):
        message_data = json.loads(await websocket.recv())
        assert message_data["command"] == "START"
        self.task_graph = TaskGraph.from_json(message_data["graph"])

    def run(self, host: str = "localhost", port: int = 5678):
        print("Starting server.")
        start_server = serve(self.server, host, port)
        asyncio.get_event_loop().run_until_complete(start_server)
        asyncio.get_event_loop().run_forever()
