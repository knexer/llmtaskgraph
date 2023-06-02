import { useEffect, useRef, useState } from "react";

export const SessionState = {
  EDITING: "EDITING",
  RUNNING: "RUNNING",
};

export const BackendState = {
  CONNECTED: "connected",
  RUNNING: "running",
  WAITING: "waiting",
};

const useSession = (serverUrl) => {
  const [initialGraphData, setInitialGraphData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        setConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        const parsedMessage = JSON.parse(event.data);
        const backendState = parsedMessage.backend_state;
        switch (backendState) {
          case BackendState.CONNECTED:
            setSessionState(SessionState.EDITING);
            setInitialGraphData(parsedMessage.initial_graph);
            // Set current graph data to parsedMessage.graph only if current graph data is null.
            // This is to prevent the graph from being reset to initial graph data when the backend is restarted.
            setGraphData((currentGraphData) =>
              currentGraphData === null ? parsedMessage.graph : currentGraphData
            );
            break;
          case BackendState.RUNNING:
            setSessionState(SessionState.RUNNING);
            setGraphData(parsedMessage.graph);
            break;
          case BackendState.WAITING:
            setSessionState(SessionState.EDITING);
            setGraphData(parsedMessage.graph);
            break;
          default:
            throw new Error(`Invalid backend state: ${backendState}`);
        }
      };

      wsRef.current.onerror = (error) => {};

      wsRef.current.onclose = (event) => {
        setConnected(false);
        if (!event.wasClean) {
          setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Intentional close", { wasClean: true });
      }
    };
  }, [serverUrl]);

  const sendGraphData = (graphData) => {
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ command: "START", graph: graphData })
      );
    } else {
      console.log("WebSocket is not connected");
    }
  };

  const stop = () => {
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "STOP", graph: null }));
    } else {
      console.log("WebSocket is not connected");
    }
  };

  return {
    connected,
    sessionState,
    initialGraphData,
    graphData,
    sendGraphData,
    stop,
  };
};

export default useSession;
