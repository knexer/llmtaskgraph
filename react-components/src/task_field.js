import React, { useState } from "react";

export default function TaskField({ task, fieldName, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [newFieldData, setNewFieldData] = useState(null);

  const handleEdit = () => {
    setNewFieldData(JSON.stringify(task[fieldName]));
    setEditing(true);
  };

  const handleSave = () => {
    onEdit(task.task_id, fieldName, JSON.parse(newFieldData));
    setEditing(false);
  };

  const handleDelete = () => {
    onEdit(task.task_id, fieldName, null);
    setEditing(false);
  };

  return (
    <div>
      {editing ? (
        <>
          <textarea
            value={newFieldData}
            onChange={(e) => setNewFieldData(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
          <button onClick={handleDelete}>Clear</button>
        </>
      ) : (
        <>
          <div>{JSON.stringify(task[fieldName])}</div>
          <button onClick={handleEdit}>Edit</button>
        </>
      )}
    </div>
  );
}
