import asyncio
import websockets
import json

from llmtaskgraph.task_graph import TaskGraph

class WebSocketServer:
    def __init__(self, initial_task_graph, function_registry, graph_input):
        self.task_graph = initial_task_graph
        self.function_registry = function_registry
        self.graph_input = graph_input

    async def server(self, websocket, path):
        print("Client connected.")
        # Send the initial task graph to the client
        await self.send_graph(websocket)
        print("Initial task graph sent.")

        # Main event loop:
        # - run TaskGraph until it is complete, sending realtime updates to the client
        # - then wait for an updated task graph and repeat
        while True:
            await self.execute_current_graph(websocket)
            print("Task graph completed.")
            await self.get_updated_graph(websocket)
            print("Updated task graph received.")

    async def execute_current_graph(self, websocket):
        # Start the current task graph
        asyncio.create_task(self.task_graph.run(self.function_registry, self.graph_input))

        # Let tasks start so we have something to wait for below.
        await asyncio.sleep(0)
        print("Task graph started.")

        # Send updates once per second
        while self.task_graph.started:
            await asyncio.sleep(1)
            # Serialize the current task graph and send it to the client
            print("Sending task graph update.")
            await self.send_graph(websocket)
            print("Task graph update sent.")

        # Serialize the final task graph and send it to the client
        print("Sending final task graph.")
        await self.send_graph(websocket)

    async def send_graph(self, websocket):
        # Serialize the current task graph and send it to the client
        task_graph_data = self.task_graph.to_json()
        await websocket.send(json.dumps(task_graph_data))

    async def get_updated_graph(self, websocket):
        print("Waiting for updated task graph.")
        # Wait for the next task graph update
        message = await websocket.recv()

        # Deserialize the message into a TaskGraph
        task_graph_data = json.loads(message)

        # Update the current task graph
        self.task_graph = TaskGraph.from_json(task_graph_data)

    def run(self, host='localhost', port=5678):
        print("Starting server.")
        start_server = websockets.serve(self.server, host, port) # type: ignore
        print("Server started.")
        asyncio.get_event_loop().run_until_complete(start_server)
        print("Server running.")
        asyncio.get_event_loop().run_forever()
