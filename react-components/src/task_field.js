import React, { useEffect, useRef } from "react";

import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.css";

export default function TaskField({ task, fieldName, onEdit }) {
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
  };

  const handleDelete = () => {
    onEdit(task.task_id, fieldName, null);
  };

  const handleCancel = () => {
    jsoneditor.current.set(task[fieldName]);
  };

  return (
    <div>
      <div className="jsoneditor-react-container" ref={containerRef} />
      <button onClick={handleSave}>Save</button>
      <button onClick={handleDelete}>Clear</button>
      <button onClick={handleCancel}>Cancel</button>
    </div>
  );
}

import "jsoneditor/dist/jsoneditor.css";

const JSONEditorReact = (props) => {
  const containerRef = useRef(null);
  const jsoneditor = useRef(null);

  useEffect(() => {
    const options = { ...props };
    delete options.json;

    jsoneditor.current = new JSONEditor(containerRef.current, options);

    if ("json" in props) {
      jsoneditor.current.set(props.json);
    }

    return () => {
      if (jsoneditor.current) {
        jsoneditor.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if ("json" in props) {
      jsoneditor.current.update(props.json);
    }

    if ("mode" in props) {
      jsoneditor.current.setMode(props.mode);
    }
  }, [props]);

  return <div className="jsoneditor-react-container" ref={containerRef} />;
};
