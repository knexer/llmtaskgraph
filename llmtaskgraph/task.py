from __future__ import annotations
from abc import ABC, abstractmethod
from asyncio import Future
import asyncio
import inspect
from typing import Any, Optional
from uuid import uuid4
import openai
import json

from typing import TYPE_CHECKING, Callable, Union

if TYPE_CHECKING:
    from .task_graph import GraphContext
    from .task_graph import TaskGraph


class Task(ABC):
    def __init__(self, *deps: Union[Task, str], **kwdeps: Union[Task, str]):
        self.task_id = str(uuid4())
        self.deps: tuple[Union[Task, str], ...] = deps
        self.kwdeps = kwdeps
        self.created_by: Optional[Union[Task, str]] = None
        self.output_data: Optional[Any] = None
        self.output: Optional[Future] = None

    @property
    def dependencies(self) -> tuple[Union[Task, str], ...]:
        declared_deps = self.deps + tuple(self.kwdeps.values())
        if self.created_by:
            return declared_deps + (self.created_by,)
        else:
            return declared_deps

    def hydrate_deps(self, tasks: list[Task], created_by: Optional[Task]):
        tasks_by_id = {task.task_id: task for task in tasks}
        self.deps = tuple(tasks_by_id[dep_id] for dep_id in self.deps)
        self.kwdeps = {
            kwdep_name: tasks_by_id[kwdep_id]
            for kwdep_name, kwdep_id in self.kwdeps.items()
        }
        if self.created_by:
            self.created_by = tasks_by_id[self.created_by]
        else:
            self.created_by = created_by

    async def run(
        self, graph: TaskGraph, function_registry: dict[str, Callable]
    ) -> None:
        self.output = asyncio.get_running_loop().create_future()
        # Memoize output.
        if self.output_data is not None:
            self.output.set_result(self.output_data)
            return

        # Collect dependncy output. We know tasks are actual Tasks with output futures at this point.
        dep_results: list[Any] = [await dep.output for dep in self.deps] #type: ignore
        kwdep_results = {
            kwdep_name: await kwdep.output for kwdep_name, kwdep in self.kwdeps.items() #type: ignore
        }

        # Execute task.
        context: GraphContext = graph.make_context_for(self)
        try:
            self.output_data = await self.execute(
                context, function_registry, *dep_results, **kwdep_results
            )
        except Exception as e:
            self.output.set_exception(e)
            raise
        self.output.set_result(self.output_data)

    @abstractmethod
    async def execute(
        self,
        context: GraphContext,
        function_registry: dict[str, Callable],
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        pass

    @abstractmethod
    def to_json(self) -> dict[str, Any]:
        def get_id(dep: Union[Task, str]) -> str:
            if isinstance(dep, Task):
                return dep.task_id
            else:
                return dep

        return {
            "type": self.__class__.__name__,
            "task_id": self.task_id,
            "deps": [get_id(dep) for dep in self.deps],
            "kwdeps": {k: get_id(v) for k, v in self.kwdeps.items()},
            "created_by": get_id(self.created_by) if self.created_by else None,
            # TODO may need to do something fancier at some point to handle custom types in output_data
            "output_data": self.output_data,
        }

    @classmethod
    @abstractmethod
    def from_json(cls, json: dict[str, Any]) -> Task:
        # TODO handle this in an extensible way
        task_types = {
            "LLMTask": LLMTask,
            "PythonTask": PythonTask,
            "TaskGraphTask": TaskGraphTask,
        }

        task_type = json.pop("type")
        return task_types[task_type].from_json(json)

    def init_from_json(self, json: dict[str, Any]) -> None:
        self.task_id = json["task_id"]
        self.deps = json["deps"]
        self.kwdeps = json["kwdeps"]
        self.created_by = json["created_by"]
        # TODO may need to do something fancier at some point to handle custom types in output_data
        self.output_data = json["output_data"]


class LLMTask(Task):
    def __init__(
        self,
        prompt_formatter_id: str,
        params: Any,
        output_parser_id: str,
        *deps: Union[Task, str],
        **kwdeps: Union[Task, str]
    ):
        super().__init__(*deps, **kwdeps)
        self.prompt_formatter_id = prompt_formatter_id
        self.params = params
        self.output_parser_id = output_parser_id

    async def execute(
        self,
        context: GraphContext,
        function_registry: dict[str, Callable],
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        formatted_prompt = function_registry[self.prompt_formatter_id](
            context, *dep_results, **kwdep_results
        )
        response = await self.api_call(formatted_prompt)
        # Todo: retry api call and parsing if output is None
        return function_registry[self.output_parser_id](context, response)

    async def api_call(self, messages):
        # make sure messages is a list of objects with role and content keys
        if not isinstance(messages, list):
            if isinstance(messages, str):
                messages = {"role": "user", "content": messages}
            messages = [messages]

        # Todo: handle api calls elsewhere for request batching and retries
        response: Any = await openai.ChatCompletion.acreate(
            messages=messages,
            **self.params,
        )
        # Todo: handle n > 1
        return response.choices[0].message.content

    def to_json(self):
        json = super().to_json()
        json.update(
            {
                "prompt_formatter_id": self.prompt_formatter_id,
                "params": self.params,
                "output_parser_id": self.output_parser_id,
            }
        )
        return json

    @classmethod
    def from_json(cls, json: dict[str, Any]) -> LLMTask:
        task = cls(
            json.pop("prompt_formatter_id"),
            json.pop("params"),
            json.pop("output_parser_id"),
        )
        task.init_from_json(json)
        return task


class PythonTask(Task):
    def __init__(
        self, callback_id: str, *deps: Union[Task, str], **kwdeps: Union[Task, str]
    ):
        super().__init__(*deps, **kwdeps)
        self.callback_id = callback_id

    async def execute(
        self,
        context: GraphContext,
        function_registry: dict[str, Callable],
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        callback = function_registry[self.callback_id]
        if inspect.iscoroutinefunction(callback):
            return await callback(context, *dep_results, **kwdep_results)
        else:
            return callback(context, *dep_results, **kwdep_results)

    def to_json(self):
        json = super().to_json()
        json.update(
            {
                "callback_id": self.callback_id,
            }
        )
        return json

    @classmethod
    def from_json(cls, json: dict[str, Any]) -> PythonTask:
        task = cls(
            json.pop("callback_id"),
        )
        task.init_from_json(json)
        return task


class TaskGraphTask(Task):
    def __init__(
        self,
        subgraph: "TaskGraph",
        input_formatter_id: str,
        *deps: Union[Task, str],
        **kwdeps: Union[Task, str]
    ):
        super().__init__(*deps, **kwdeps)
        self.subgraph = subgraph
        self.input_formatter_id = input_formatter_id

    async def execute(
        self,
        context: GraphContext,
        function_registry: dict[str, Callable],
        *dep_results: tuple[Any],
        **kwdep_results: dict[str, Any],
    ):
        return await self.subgraph.run(
            function_registry,
            function_registry[self.input_formatter_id](
                context, *dep_results, **kwdep_results
            ),
        )

    def to_json(self):
        json = super().to_json()
        json.update(
            {
                "subgraph": self.subgraph.to_json(),
                "input_formatter_id": self.input_formatter_id,
            }
        )
        return json

    @classmethod
    def from_json(cls, json: dict[str, Any]) -> TaskGraphTask:
        from llmtaskgraph.task_graph import TaskGraph  # Import here to avoid circular dependency
        task = cls(
            TaskGraph.from_json(json.pop("subgraph")),
            json.pop("input_formatter_id"),
        )
        task.init_from_json(json)
        return task
