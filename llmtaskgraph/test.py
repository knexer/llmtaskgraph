import asyncio
import json
import re
import os
from dotenv import load_dotenv

import openai

from llmtaskgraph.function_registry import FunctionRegistry, openai_chat

from .task import LLMTask, PythonTask
from .task_graph import TaskGraph, GraphContext

load_dotenv()
openai.api_key = os.environ["OPENAI_API_KEY"]

# A TaskGraph is an executable collection of tasks with modeled information flow
task_graph = TaskGraph()
# A function registry holds the actual code used by tasks, to facilitate serialization
function_registry = FunctionRegistry()


# LLMTasks can be used to call the OpenAI API
def add_llm_tasks():
    def format_prompt(context: GraphContext) -> str:
        return f"Give a numbered list of five {context.graph_input()}."

    # Parse the response
    def parse_response(response: str) -> list[str]:
        # Parse out the list of things from the response (a numbered list)
        pattern = re.compile(r"\d[\.\:\)]\s*(.*?)(?=\n\d|$)", re.MULTILINE)
        matches = pattern.findall(response)

        return matches

    format_prompt_id = function_registry.register(format_prompt)
    parse_response_id = function_registry.register_no_context(parse_response)

    llm_tasks = [
        LLMTask(
            format_prompt_id,
            openai_chat,
            {"model": "gpt-3.5-turbo", "n": 1, "temperature": 1},
            parse_response_id,
        )
        for _ in range(3)
    ]

    for task in llm_tasks:
        task_graph.add_task(task)

    return llm_tasks


nested_task_ran = False


# PythonTasks can be used to run arbitrary Python code in the task graph
def add_python_tasks(llm_tasks: list[LLMTask]):
    def join_things(*things_lists: list[str]) -> list[str]:
        all_things: list[str] = []
        for things_list in things_lists:
            all_things = all_things + things_list
        return all_things

    join_things_id = function_registry.register_no_context(join_things)
    join_task = PythonTask(join_things_id, *llm_tasks)
    task_graph.add_output_task(join_task)

    def nested_task() -> str:
        global nested_task_ran
        nested_task_ran = True
        return "nested task ran"

    nested_task_id = function_registry.register_no_context(nested_task)

    # Tasks can be added during execution
    def add_nested_task(context: GraphContext):
        context.add_task(PythonTask(nested_task_id))
        return "nested task created"

    add_nested_task_id = function_registry.register(add_nested_task)
    task_graph.add_task(PythonTask(add_nested_task_id))


task_graph.graph_input = "famous mathematicians"
llm_tasks = add_llm_tasks()
add_python_tasks(llm_tasks)

# Task graphs can be serialized and deserialized
serialized = json.dumps(task_graph.to_json())
task_graph = TaskGraph.from_json(json.loads(serialized))

output = asyncio.run(task_graph.run(function_registry))
print(output)
assert isinstance(output, list)
assert nested_task_ran
# The output of the task graph is the output of its output_task
assert len(output) == 15
assert output.count("Isaac Newton") > 0

# Task graphs keep their execution state when serialized and deserialized
nested_task_ran = False
serialized_2 = json.dumps(task_graph.to_json())
assert serialized != serialized_2
task_graph = TaskGraph.from_json(json.loads(serialized_2))
output_2 = asyncio.run(task_graph.run(function_registry))

# So already executed tasks don't run again
assert not nested_task_ran
# And the output is the same
assert output == output_2
