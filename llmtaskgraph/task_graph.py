import asyncio
from typing import Optional

from llmtaskgraph.types import JSON, JSONValue

from .task import Task, task_from_json
from .function_registry import FunctionRegistry, make_base_registry


class TaskGraph:
    def __init__(self):
        self.tasks: list[Task] = []
        self.graph_input: JSONValue | None = None
        self.output_task: Optional[Task] = None

        # transient state during run
        self.started = False
        self.function_registry: Optional[FunctionRegistry] = None

    def add_task(self, task: Task) -> str:
        for dependency in task.dependencies:
            if dependency not in self.tasks:
                raise ValueError(f"Dependency {dependency} not found in task graph")

        self.tasks.append(task)
        if self.started:
            assert self.function_registry is not None
            task.output = asyncio.create_task(task.run(self, self.function_registry))

        return task.task_id

    def add_output_task(self, task: Task):
        self.add_task(task)
        self.output_task = task
        return task.task_id

    def make_context_for(self, task: Task):
        return GraphContext(self, task)

    async def run(self, function_registry: FunctionRegistry) -> JSONValue:
        assert not self.started
        self.started = True
        self.function_registry = make_base_registry().merge(function_registry)

        # Start all initially available tasks.
        # N.B.: Tasks added during execution will be started by add_task.
        for task in self.tasks:
            task.output = asyncio.create_task(task.run(self, self.function_registry))

        def cancel_all_tasks():
            for task in self.tasks:
                assert task.output is not None
                task.output.cancel()

        # while any task is not started or not done, and no tasks have exceptions
        while any(
            task.output and not task.output.done() for task in self.tasks
        ) and not any(
            task.output and task.output.done() and task.output.exception() is not None
            for task in self.tasks
        ):
            # wait for every started task to be done
            try:
                await asyncio.wait(
                    [task.output for task in self.tasks if task.output is not None]
                )
            except asyncio.CancelledError:
                cancel_all_tasks()
                raise

        # If any task has an exception, raise it.
        for task in self.tasks:
            assert task.output is not None
            if task.output.done() and task.output.exception() is not None:
                cancel_all_tasks()
                raise Exception("Subtask failed.") from task.output.exception()

        self.started = False
        self.function_registry = None

        if self.output_task is None:
            return None
        assert self.output_task.output is not None
        return await self.output_task.output

    def to_json(self) -> JSON:
        return {
            "tasks": [task.to_json() for task in self.tasks],
            "graph_input": self.graph_input,
            "output_task": self.output_task.task_id if self.output_task else None,
        }

    @classmethod
    def from_json(cls, json: JSON) -> "TaskGraph":
        graph = TaskGraph()
        graph.tasks = []
        json_tasks = json["tasks"]
        assert isinstance(json_tasks, list)
        for task_json in json_tasks:
            tasks_by_id = {task.task_id: task for task in graph.tasks}
            assert isinstance(task_json, dict)
            task = task_from_json(task_json, tasks_by_id)
            graph.tasks.append(task)
        graph.graph_input = json["graph_input"]
        graph.output_task = next(
            (task for task in graph.tasks if task.task_id == json["output_task"]), None
        )
        return graph


class GraphContext:
    def __init__(self, graph: TaskGraph, task: Task):
        self.graph = graph
        self.task = task

    def graph_input(self):
        return self.graph.graph_input

    def list_tasks(self):
        return self.graph.tasks

    def add_task(self, new_task: Task):
        return self.graph.add_task(new_task)

    def add_output_task(self, new_task: Task):
        return self.graph.add_output_task(new_task)
