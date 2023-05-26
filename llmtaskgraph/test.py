import asyncio
import json
import re
import os
from dotenv import load_dotenv

import openai

from .task import LLMTask, PythonTask
from .task_graph import TaskGraph

load_dotenv()
openai.api_key = os.environ["OPENAI_API_KEY"]


def prompt(_):
    print("ran prompt")
    return "Give a numbered list of five fast food items."


def parse_ideas(_, response):
    print("ran parse_ideas")
    # The regular expression pattern:
    # It looks for a number followed by a '.', ':', or ')' (with optional spaces)
    # and then captures any text until it finds a newline character or the end of the string
    pattern = re.compile(r"\d[\.\:\)]\s*(.*?)(?=\n\d|$)", re.MULTILINE)

    # Find all matches using the 'findall' method
    matches = pattern.findall(response)

    # Return the matches
    return matches


def join_ideas(_, *ideas):
    print("ran join_ideas")
    # ideas is a map from task id to an array of ideas
    all_ideas = []
    for ideas in ideas:
        all_ideas = all_ideas + ideas
    return all_ideas


task_graph = TaskGraph()
function_registry = {}
function_registry["prompt"] = prompt
function_registry["parse_ideas"] = parse_ideas
llm_tasks = [
    LLMTask(
        "prompt", {"model": "gpt-3.5-turbo", "n": 1, "temperature": 1}, "parse_ideas"
    )
    for _ in range(3)
]

for task in llm_tasks:
    task_graph.add_task(task)

function_registry["join_ideas"] = join_ideas
join_task = PythonTask("join_ideas", *llm_tasks)
task_graph.add_output_task(join_task)

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


function_registry["nested_task"] = nested_task
function_registry["add_nested_task"] = add_nested_task
task_graph.add_task(PythonTask("add_nested_task"))


# create a task that throws an exception
def throw_exception(_):
    raise Exception("test exception")


function_registry["throw_exception"] = throw_exception
task_graph.add_task(PythonTask("throw_exception"))

print("serializing task graph")
serialized = json.dumps(task_graph.to_json())
print(serialized)
task_graph_2: TaskGraph = TaskGraph.from_json(json.loads(serialized))

print("running task graph")
output = asyncio.run(task_graph_2.run(function_registry))
assert nested_task_ran
nested_task_ran = False

print(output)
serialized_2 = json.dumps(task_graph_2.to_json())
print(serialized_2)
task_graph_3: TaskGraph = TaskGraph.from_json(json.loads(serialized_2))
output_2 = asyncio.run(task_graph_3.run(function_registry))

assert not nested_task_ran
assert output == output_2
