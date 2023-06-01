# llmtaskgraph

llmtaskgraph is a Python library for writing easily debuggable programs that use LLMs iteratively. Applications are modeled as a dependency graph of tasks, which can be executed to produce execution traces.

## TaskGraphs

TaskGraphs are an acyclic graph of Tasks of various types, explicitly modeling the dependencies and information flow within your application.
TaskGraphs can be executed (with automatic parallelization), serialized to JSON, and deserialized from JSON.
To achieve this, the code for each Task is stored in a function registry separate from the graph itself.

Tasks can add new tasks to the TaskGraph during execution, so the structure of the computation graph need not be known in advance. This also allows indefinitely-running TaskGraphs.

## Tasks
llmtaskgraph provides three types of tasks:
- LLMTask: A task that invokes an LLM. Also includes prompt formatting and output parsing.
- PythonTask: A wrapper around a Python function, providing a way to perform non-LLM computation within the task graph.
- TaskGraphTask: This task type encapsulates a sub-task-graph, organizing and hiding the details of those tasks. It is essentially a function in the task graph.

Task outputs are memoized for the edit and replay features, so tasks must be side-effect-free.

## Usage

```python
task_graph = TaskGraph()
function_registry = {}

# A PythonTask that does a thing
function_registry["python_func"] = ...
python_task = task_graph.add_task(PythonTask("python_func"))

# An LLMTask that depends on the output of python_task
function_registry["prompt_formatter"] = ...
function_registry["output_parser"] = ...
task_graph.add_task(LLMTask("prompt_formatter", "output_parser", python_task)

# Run the graph
task_graph.graph_input = { "foo": "bar" }
graph_output = task_graph.run(function_registry)
execution_trace = json.dumps(task_graph.to_json())
```

and then, later or elsewhere or after modifying the trace:

```python
task_graph_2 = TaskGraph.from_json(json.loads(modified_execution_trace))
graph_output_2 = task_graph.run(function_registry)
```

