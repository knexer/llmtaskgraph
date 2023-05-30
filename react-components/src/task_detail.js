import React from "react";

import TaskField from "./task_field";

export default function TaskDetail({ graph, task_id, onEdit }) {
  if (task_id === null) {
    return (
      <div className="task-detail">
        <div>Task Detail</div>
        No task selected
      </div>
    );
  }

  const task = graph.getTask(task_id);

  const type = task.type;
  return (
    <div className="task-detail">
      <div>Task Detail</div>
      <div>{type}</div>
      <div>State: {graph.getTaskState(task.task_id)}</div>
      {task.error !== null ? <div>Error: {task.error}</div> : null}
      <div>{task.task_id}</div>
      {type === "LLMTask" ? (
        <LLMTaskDetail task={task} onEdit={onEdit} />
      ) : null}
      {type === "PythonTask" ? <PythonTaskDetail task={task} /> : null}
      {type === "TaskGraphTask" ? (
        <TaskGraphTaskDetail task={task} onEdit={onEdit} />
      ) : null}
      <TaskField task={task} fieldName="output_data" onEdit={onEdit} />
    </div>
  );
}

export function LLMTaskDetail({ task, onEdit }) {
  return (
    <>
      <div>{task.prompt_formatter_id}</div>
      <TaskField task={task} fieldName="formatted_prompt" onEdit={onEdit} />
      <div>{JSON.stringify(task.params)}</div>
      <TaskField task={task} fieldName="response" onEdit={onEdit} />
      <div>{task.output_parser_id}</div>
    </>
  );
}

export function PythonTaskDetail({ task }) {
  return (
    <>
      <div>{task.callback_id}</div>
    </>
  );
}

export function TaskGraphTaskDetail({ task, onEdit }) {
  return (
    <>
      <div>{task.input_formatter_id}</div>
      <TaskField task={task} fieldName="graph_input" onEdit={onEdit} />
    </>
  );
}
