import { useEffect, useRef, useState } from "react";

const useWebSocket = (serverUrl) => {
  const [message, setMessage] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        setConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        setMessage(event.data);
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

  const sendMessage = (message) => {
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.log("WebSocket is not connected");
    }
  };

  return { connected, message, sendMessage };
};

export default useWebSocket;
