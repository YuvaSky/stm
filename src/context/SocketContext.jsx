import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Dynamically connect to the host IP (e.g. 192.168.x.x:5000 or localhost:5000)
    const host = window.location.hostname || 'localhost';
    const socketUrl = `http://${host}:5000`;

    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
