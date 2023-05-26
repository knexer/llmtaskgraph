import React, { useState } from 'react';

export default function TaskDetail({ graph, task_id, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [newOutputData, setNewOutputData] = useState(null);

  if (task_id === null) {
    return (<div className="task-detail">
      <div>Task Detail</div>
      No task selected
    </div>);
  }

  const allTasks = (graph) => graph.tasks.flatMap((task) => [task].concat(task.type === "TaskGraphTask" ? allTasks(task.subgraph) : []));

  const task = allTasks(graph).find((task) => task.task_id === task_id);

  const handleEdit = () => {
    setNewOutputData(JSON.stringify(task.output_data));
    setEditing(true);
  };

  const handleSave = () => {
    console.log(newOutputData);
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
      <div>State: {task.output_data === null ? "Incomplete" : "Complete"}</div>
      <div>{task.task_id}</div>
      {type === "LLMTask" ? (
        <LLMTaskDetail task={task} />
      ) : null}
      {type === "PythonTask" ? (
        <PythonTaskDetail task={task} />
      ) : null}
      <div>
        {editing ? (
          <>
            <textarea value={newOutputData} onChange={(e) => setNewOutputData(e.target.value)}/>
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
      <div>{JSON.stringify(task.params)}</div>
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
