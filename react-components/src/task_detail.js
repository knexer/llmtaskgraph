import React from "react";

import TaskField from "./task_field";

import { TaskState } from "./serialized_graph";

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

  // TODO: use css classes
  const colored_state = () => {
    const task_state = graph.getTaskState(task.task_id);
    switch (task_state) {
      case TaskState.ERROR:
        return <b style={{ color: "red" }}>{task_state}</b>;
      case TaskState.COMPLETE:
        return <b style={{ color: "black" }}>{task_state}</b>;
      case TaskState.WAITING:
        return <b style={{ color: "orange" }}>{task_state}</b>;
      case TaskState.READY:
        return <b style={{ color: "green" }}>{task_state}</b>;
      default:
        return <b>{task_state}</b>;
    }
  };

  return (
    <div className="task-detail">
      <div>Task Detail ({type})</div>
      <div>State: {colored_state()}</div>
      {task.error !== null ? <div>Error: {task.error}</div> : null}
      <div>Task ID: {task.task_id}</div>
      {type === "LLMTask" ? (
        <LLMTaskDetail task={task} onEdit={onEdit} />
      ) : null}
      {type === "PythonTask" ? (
        <PythonTaskDetail task={task} onEdit={onEdit} />
      ) : null}
      {type === "TaskGraphTask" ? (
        <TaskGraphTaskDetail task={task} onEdit={onEdit} />
      ) : null}
    </div>
  );
}

export function LLMTaskDetail({ task, onEdit }) {
  return (
    <>
      <TaskField
        task={task}
        fieldName="formatted_prompt"
        computedBy={task.prompt_formatter_id}
        onEdit={onEdit}
      />
      <TaskField
        task={task}
        fieldName="response"
        computedBy={"LLM with params " + JSON.stringify(task.params)}
        onEdit={onEdit}
      />
      <TaskField
        task={task}
        fieldName="output_data"
        computedBy={task.output_parser_id}
        onEdit={onEdit}
      />
    </>
  );
}

export function PythonTaskDetail({ task, onEdit }) {
  return (
    <>
      <TaskField
        task={task}
        fieldName="output_data"
        computedBy={task.callback_id}
        onEdit={onEdit}
      />
    </>
  );
}

export function TaskGraphTaskDetail({ task, onEdit }) {
  return (
    <>
      <TaskField
        task={task}
        fieldName="graph_input"
        computedBy={task.input_formatter_id}
        onEdit={onEdit}
      />
      <TaskField
        task={task}
        fieldName="output_data"
        computedBy={"output task " + task.subgraph.output_task}
        onEdit={onEdit}
      />
    </>
  );
}
