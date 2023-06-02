import { useEffect, useRef, useState } from "react";

export const SessionState = {
  EDITING: "EDITING",
  RUNNING: "RUNNING",
};

const useSession = (serverUrl) => {
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
        setGraphData(parsedMessage.graph);
        const backendState = parsedMessage.backend_state;
        setSessionState(
          backendState === "RUNNING"
            ? SessionState.RUNNING
            : SessionState.EDITING
        );
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
      wsRef.current.send(JSON.stringify(graphData));
    } else {
      console.log("WebSocket is not connected");
    }
  };

  return { connected, sessionState, graphData, sendGraphData };
};

export default useSession;
