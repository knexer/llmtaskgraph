from __future__ import annotations
from abc import ABC, abstractmethod
from asyncio import Future
import inspect
import traceback
from typing import Any, Optional
from uuid import uuid4

from typing import TYPE_CHECKING

from llmtaskgraph.function_registry import FunctionId, FunctionRegistry
from llmtaskgraph.types import JSON, JSONValue

if TYPE_CHECKING:
    from .task_graph import GraphContext
    from .task_graph import TaskGraph


class Task(ABC):
    def __init__(self, *deps: Task, **kwdeps: Task):
        self.task_id: str = str(uuid4())
        self.deps: tuple[Task, ...] = deps
        self.kwdeps: dict[str, Task] = kwdeps
        self.created_by: Optional[Task] = None
        self.output_data: Optional[JSONValue] = None
        self.output: Optional[Future[Any]] = None

    @property
    def dependencies(self) -> tuple[Task, ...]:
        declared_deps = self.deps + tuple(self.kwdeps.values())
        if self.created_by:
            return declared_deps + (self.created_by,)
        else:
            return declared_deps

    async def run(
        self, graph: TaskGraph, function_registry: FunctionRegistry
    ) -> JSONValue:
        # Memoize output.
        if self.output_data is not None:
            return self.output_data

        # Collect dependency output. We know tasks are actual Tasks with output futures at this point.
        try:
            dep_results: list[Any] = [await dep.output for dep in self.deps]  # type: ignore
            kwdep_results: dict[str, Any] = {
                kwdep_name: await kwdep.output for kwdep_name, kwdep in self.kwdeps.items()  # type: ignore
            }
        except Exception:
            # If any dependency failed, silently abort. The exception will be handled by the TaskGraph.
            return None

        # Execute task.
        context: GraphContext = graph.make_context_for(self)
        self.output_data = await self.execute(
            context, function_registry, *dep_results, **kwdep_results
        )
        return self.output_data

    @abstractmethod
    async def execute(
        self,
        context: GraphContext,
        function_registry: FunctionRegistry,
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        pass

    @abstractmethod
    def to_json(self) -> JSON:
        def get_id(dep: Task) -> str:
            return dep.task_id

        def get_exception_str(future: Optional[Future[Any]]) -> Optional[str]:
            if future is None or not future.done():
                return None
            e = future.exception()
            if e is None:
                return None
            return "".join(traceback.TracebackException.from_exception(e).format())

        return {
            "type": self.__class__.__name__,
            "task_id": self.task_id,
            "deps": [get_id(dep) for dep in self.deps],
            "kwdeps": {k: get_id(v) for k, v in self.kwdeps.items()},
            "created_by": get_id(self.created_by) if self.created_by else None,
            # TODO may need to do something fancier at some point to handle custom types in output_data
            "output_data": self.output_data,
            "error": get_exception_str(self.output),
        }

    @classmethod
    @abstractmethod
    def from_json(cls, json: JSON, tasks: dict[str, Task]) -> Task:
        pass

    def init_from_json(self, json: JSON, tasks: dict[str, Task]) -> None:
        task_id = json["task_id"]
        assert isinstance(task_id, str)
        self.task_id = task_id
        self.deps = tuple(tasks[dep_id] for dep_id in json["deps"])  # type: ignore
        self.kwdeps = {
            kwdep_name: tasks[kwdep_id]
            for kwdep_name, kwdep_id in json["kwdeps"].items()  # type: ignore
        }
        if json["created_by"]:
            created_by = json["created_by"]
            assert isinstance(created_by, str)
            self.created_by = tasks[created_by]
        else:
            self.created_by = None
        # TODO may need to do something fancier at some point to handle custom types in output_data
        self.output_data = json["output_data"]


class LLMTask(Task):
    def __init__(
        self,
        prompt_formatter_id: FunctionId[..., Any],
        api_handler_id: FunctionId[..., Any],
        params: Any,
        output_parser_id: FunctionId[..., Any],
        *deps: Task,
        **kwdeps: Task,
    ):
        super().__init__(*deps, **kwdeps)
        self.prompt_formatter_id = prompt_formatter_id
        self.api_handler_id = api_handler_id
        self.params = params
        self.output_parser_id = output_parser_id
        self.formatted_prompt = None
        self.response = None

    async def execute(
        self,
        context: GraphContext,
        function_registry: FunctionRegistry,
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        if self.formatted_prompt is None:
            self.formatted_prompt = function_registry[self.prompt_formatter_id](
                context, *dep_results, **kwdep_results
            )
        if self.response is None:
            self.response = await function_registry[self.api_handler_id](
                self.formatted_prompt, self.params
            )
        return function_registry[self.output_parser_id](context, self.response)

    def to_json(self) -> JSON:
        json = super().to_json()
        json.update(
            {
                "prompt_formatter_id": self.prompt_formatter_id.to_json(),
                "api_handler_id": self.api_handler_id.to_json(),
                "params": self.params,
                "output_parser_id": self.output_parser_id.to_json(),
                "formatted_prompt": self.formatted_prompt,
                "response": self.response,
            }
        )
        return json

    @classmethod
    def from_json(cls, json: JSON, tasks: dict[str, Task]) -> LLMTask:
        task = cls(
            FunctionId.from_json(json.pop("prompt_formatter_id")),
            FunctionId.from_json(json.pop("api_handler_id")),
            json.pop("params"),
            FunctionId.from_json(json.pop("output_parser_id")),
        )
        task.init_from_json(json, tasks)
        task.formatted_prompt = json.pop("formatted_prompt")
        task.response = json.pop("response")
        return task


class PythonTask(Task):
    def __init__(self, callback_id: FunctionId[..., Any], *deps: Task, **kwdeps: Task):
        super().__init__(*deps, **kwdeps)
        self.callback_id = callback_id

    async def execute(
        self,
        context: GraphContext,
        function_registry: FunctionRegistry,
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        callback = function_registry[self.callback_id]
        if inspect.iscoroutinefunction(callback):
            return await callback(context, *dep_results, **kwdep_results)
        else:
            return callback(context, *dep_results, **kwdep_results)

    def to_json(self) -> JSON:
        json = super().to_json()
        json.update(
            {
                "callback_id": self.callback_id.to_json(),
            }
        )
        return json

    @classmethod
    def from_json(cls, json: JSON, tasks: dict[str, Task]) -> PythonTask:
        task = cls(
            FunctionId.from_json(json.pop("callback_id")),
        )
        task.init_from_json(json, tasks)
        return task


class TaskGraphTask(Task):
    def __init__(
        self,
        subgraph: "TaskGraph",
        input_formatter_id: FunctionId[..., JSONValue],
        *deps: Task,
        **kwdeps: Task,
    ):
        super().__init__(*deps, **kwdeps)
        self.subgraph = subgraph
        self.input_formatter_id = input_formatter_id
        self.graph_input = None

    async def execute(
        self,
        context: GraphContext,
        function_registry: FunctionRegistry,
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        if self.graph_input is None:
            self.graph_input = function_registry[self.input_formatter_id](
                context, *dep_results, **kwdep_results
            )

        self.subgraph.graph_input = self.graph_input
        return await self.subgraph.run(function_registry)

    def to_json(self) -> JSON:
        json = super().to_json()
        json.update(
            {
                "subgraph": self.subgraph.to_json(),
                "input_formatter_id": self.input_formatter_id.to_json(),
                "graph_input": self.graph_input,
            }
        )
        return json

    @classmethod
    def from_json(cls, json: JSON, tasks: dict[str, Task]) -> TaskGraphTask:
        from llmtaskgraph.task_graph import (
            TaskGraph,
        )  # Import here to avoid circular dependency

        subgraph = json.pop("subgraph")
        assert isinstance(subgraph, dict)
        task = cls(
            TaskGraph.from_json(subgraph),
            FunctionId.from_json(json.pop("input_formatter_id")),
        )
        task.init_from_json(json, tasks)
        task.graph_input = json.pop("graph_input")
        return task


def task_from_json(json: JSON, tasks: dict[str, Task]) -> Task:
    # TODO handle this in an extensible way
    task_types = {
        "LLMTask": LLMTask,
        "PythonTask": PythonTask,
        "TaskGraphTask": TaskGraphTask,
    }

    task_type = json.pop("type")
    assert isinstance(task_type, str)
    return task_types[task_type].from_json(json, tasks)
