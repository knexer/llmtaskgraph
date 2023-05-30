import React, { useState } from "react";

export default function TaskDetail({ graph, task_id, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [newOutputData, setNewOutputData] = useState(null);

  if (task_id === null) {
    return (
      <div className="task-detail">
        <div>Task Detail</div>
        No task selected
      </div>
    );
  }

  const task = graph.getTask(task_id);

  const handleEdit = () => {
    setNewOutputData(JSON.stringify(task.output_data));
    setEditing(true);
  };

  const handleSave = () => {
    onEdit(task.task_id, JSON.parse(newOutputData));
    setEditing(false);
  };

  const handleDelete = () => {
    onEdit(task.task_id, null);
    setEditing(false);
  };

  const type = task.type;
  return (
    <div className="task-detail">
      <div>Task Detail</div>
      <div>{type}</div>
      <div>State: {graph.getTaskState(task.task_id)}</div>
      {task.error !== null ? <div>Error: {task.error}</div> : null}
      <div>{task.task_id}</div>
      {type === "LLMTask" ? <LLMTaskDetail task={task} /> : null}
      {type === "PythonTask" ? <PythonTaskDetail task={task} /> : null}
      {type === "TaskGraphTask" ? <TaskGraphTaskDetail task={task} /> : null}
      <div>
        {editing ? (
          <>
            <textarea
              value={newOutputData}
              onChange={(e) => setNewOutputData(e.target.value)}
            />
            <button onClick={handleSave}>Save</button>
            <button onClick={handleDelete}>Delete Output</button>
          </>
        ) : (
          <>
            <div>{JSON.stringify(task.output_data)}</div>
            <button onClick={handleEdit}>Edit Output</button>
          </>
        )}
      </div>
    </div>
  );
}

export function LLMTaskDetail({ task }) {
  return (
    <>
      <div>{task.prompt_formatter_id}</div>
      <div>{JSON.stringify(task.formatted_prompt)}</div>
      <div>{JSON.stringify(task.params)}</div>
      <div>{JSON.stringify(task.response)}</div>
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

export function TaskGraphTaskDetail({ task }) {
  return (
    <>
      <div>{task.input_formatter_id}</div>
      <div>{JSON.stringify(task.subgraph.graph_input)}</div>
    </>
  );
}
