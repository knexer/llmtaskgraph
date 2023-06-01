import { useEffect, useRef, useState } from "react";

const useWebSocket = (serverUrl) => {
  const [message, setMessage] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket(serverUrl);

    wsRef.current.onopen = () => {
      console.log("Connected to server");
    };

    wsRef.current.onmessage = (event) => {
      console.log("Message received");
      setMessage(event.data);
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("Connection closed");
    };

    // Clean up the connection when the component unmounts
    return () => {
      wsRef.current.close();
    };
  }, [serverUrl]);

  const sendMessage = (message) => {
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.log("WebSocket is not connected");
    }
  };

  return { message, sendMessage };
};

export default useWebSocket;
