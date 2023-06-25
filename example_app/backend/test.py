import os
from dotenv import load_dotenv

import openai

from llmtaskgraph.function_registry import FunctionRegistry

from .server import WebSocketServer
from llmtaskgraph.task import PythonTask
from llmtaskgraph.task_graph import GraphContext, TaskGraph

load_dotenv()
openai.api_key = os.environ["OPENAI_API_KEY"]

task_graph = TaskGraph()
function_registry = FunctionRegistry()

nested_task_ran = False


def nested_task():
    global nested_task_ran
    nested_task_ran = True
    print("nested task ran")
    return "nested task ran"


nested_task_id = function_registry.register_no_context(nested_task)


# create a task that creates other tasks
def add_nested_task(context: GraphContext):
    print("ran add_nested_task")

    context.add_task(PythonTask(nested_task_id))
    print("nested task created")
    return "nested task created"


add_nested_task_id = function_registry.register(add_nested_task)
task_graph.add_task(PythonTask(add_nested_task_id))
task_graph.graph_input = {}

server = WebSocketServer(task_graph, function_registry)
print("Created server.")
server.run()

assert nested_task_ran
