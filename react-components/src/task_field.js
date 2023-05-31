import React, { useEffect, useRef } from "react";

import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.css";

export default function TaskField({ task, fieldName, computedBy, onEdit }) {
  const [editing, setEditing] = React.useState(false);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleEndEditing = () => {
    setEditing(false);
  };

  const handleDelete = () => {
    onEdit(task.task_id, fieldName, null);
  };

  const elide = (str) => {
    if (str.length > 300) {
      return str.slice(0, 200) + "..." + str.slice(-100);
    } else {
      return str;
    }
  };

  return (
    <div className="task-field">
      <div>
        Field <b>{fieldName}</b> (computed by <b>{computedBy}</b>):
      </div>
      {editing ? (
        <TaskFieldEditor
          task={task}
          fieldName={fieldName}
          onEdit={onEdit}
          onEndEditing={handleEndEditing}
        />
      ) : (
        <>
          <div>{elide(JSON.stringify(task[fieldName]))}</div>
          <button onClick={handleEdit}>Edit</button>
          {task[fieldName] !== null ? (
            <button onClick={handleDelete}>Clear</button>
          ) : null}
        </>
      )}
    </div>
  );
}

function TaskFieldEditor({ task, fieldName, onEdit, onEndEditing }) {
  const containerRef = useRef(null);
  const jsoneditor = useRef(null);

  useEffect(() => {
    const options = {
      mode: "code",
      history: false,
      search: false,
      mainMenuBar: false,
      navigationBar: false,
      statusBar: false,
      enableSort: false,
      enableTransform: false,
    };

    jsoneditor.current = new JSONEditor(containerRef.current, options);

    jsoneditor.current.set(task[fieldName]);

    return () => {
      if (jsoneditor.current) {
        jsoneditor.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    jsoneditor.current.set(task[fieldName]);
  }, [task, fieldName]);

  const handleSave = () => {
    // TODO: validate json
    console.log("jsoneditor.current.get():", jsoneditor.current.get());
    const json = jsoneditor.current.get();
    onEdit(task.task_id, fieldName, json);
    onEndEditing();
  };

  const handleCancel = () => {
    onEndEditing();
  };

  return (
    <div>
      <div className="jsoneditor-react-container" ref={containerRef} />
      <button onClick={handleSave}>Save</button>
      <button onClick={handleCancel}>Cancel</button>
    </div>
  );
}
