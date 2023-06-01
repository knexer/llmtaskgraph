import asyncio
from typing import Any, Optional, Callable

from .task import Task


class TaskGraph:
    def __init__(self):
        self.tasks: list[Task] = []
        self.graph_input: Any = None
        self.output_task: Optional[Task] = None

        # transient state during run
        self.started = False
        self.function_registry: Optional[dict[str, Callable]] = None

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

    async def run(self, function_registry: dict[str, Callable]) -> Any:
        self.started = True
        self.function_registry = function_registry
        # Start all initially available tasks.
        # N.B.: Tasks added during execution will be started by add_task.
        for task in self.tasks:
            task.output = asyncio.create_task(task.run(self, function_registry))

        # while any task is not started or not done, and no tasks have exceptions
        while any(not task.output.done() for task in self.tasks) and not any(
            task.output.done() and task.output.exception() is not None
            for task in self.tasks
        ):
            # wait for every started task to be done
            await asyncio.wait([task.output for task in self.tasks])

        # If any task has an exception, raise it.
        for task in self.tasks:
            if task.output.done() and task.output.exception() is not None:
                for task in self.tasks:
                    task.output.cancel()

                raise Exception("Subtask failed.") from task.output.exception()

        self.started = False
        self.function_registry = None

        if self.output_task is None:
            return None
        assert self.output_task.output is not None
        return await self.output_task.output

    def to_json(self):
        return {
            "tasks": [task.to_json() for task in self.tasks],
            "graph_input": self.graph_input,
            "output_task": self.output_task.task_id if self.output_task else None,
        }

    @classmethod
    def from_json(cls, json: dict[str, Any]):
        graph = TaskGraph()
        graph.tasks = []
        for task_json in json["tasks"]:
            task = Task.from_json(task_json)
            task.hydrate_deps(graph.tasks, None)
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

    def add_task(self, new_task: Task):
        new_task.hydrate_deps(self.graph.tasks, self.task)
        return self.graph.add_task(new_task)

    def add_output_task(self, new_task: Task):
        new_task.hydrate_deps(self.graph.tasks, self.task)
        return self.graph.add_output_task(new_task)
