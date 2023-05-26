import asyncio
import json
import re
import os
from dotenv import load_dotenv

import openai

from .server import WebSocketServer
from llmtaskgraph.task import PythonTask
from llmtaskgraph.task_graph import TaskGraph

load_dotenv()
openai.api_key = os.environ["OPENAI_API_KEY"]



nested_task_ran = False

def nested_task(_):
    global nested_task_ran
    nested_task_ran = True
    print("nested task ran")
    return "nested task ran"


# create a task that creates other tasks
def add_nested_task(context):
    print("ran add_nested_task")

    context.add_task(PythonTask("nested_task"))
    print("nested task created")
    return "nested task created"


task_graph = TaskGraph()
function_registry = {}
function_registry["nested_task"] = nested_task
function_registry["add_nested_task"] = add_nested_task
task_graph.add_task(PythonTask("add_nested_task"))

server = WebSocketServer(task_graph, function_registry, {})
print("Created server.")
server.run()

assert nested_task_ran
