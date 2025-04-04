import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import { useSocket } from '../lib/socketContext';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
}

export function Chat({ messages: initialMessages, onSendMessage }: ChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const { socket, sendChatMessage, roomId } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Use initial messages
  useEffect(() => {
    setMessages(initialMessages);
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [initialMessages]);

  // Auto-scroll when messages state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for chat messages from WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: Message) => {
      // Convert timestamp string to Date if needed
      const timestamp = message.timestamp instanceof Date 
        ? message.timestamp 
        : new Date(message.timestamp);
      
      // Check if this message already exists to prevent duplicates
      setMessages(prevMessages => {
        // Check if we already have this message ID
        if (prevMessages.some(m => m.id === message.id)) {
          return prevMessages; // Don't add duplicate
        }
        
        return [
          ...prevMessages,
          { ...message, timestamp }
        ];
      });
    };

    const handleUserJoined = (message: Message) => {
      const timestamp = message.timestamp instanceof Date 
        ? message.timestamp 
        : new Date(message.timestamp);
        
      // Check if this message already exists to prevent duplicates
      setMessages(prevMessages => {
        // Check if we already have this message ID
        if (prevMessages.some(m => m.id === message.id)) {
          return prevMessages; // Don't add duplicate
        }
        
        return [
          ...prevMessages,
          { 
            ...message, 
            timestamp,
            user: 'System',
          }
        ];
      });
    };

    const handleUserLeft = (message: Message) => {
      const timestamp = message.timestamp instanceof Date 
        ? message.timestamp 
        : new Date(message.timestamp);
        
      // Check if this message already exists to prevent duplicates
      setMessages(prevMessages => {
        // Check if we already have this message ID
        if (prevMessages.some(m => m.id === message.id)) {
          return prevMessages; // Don't add duplicate
        }
        
        return [
          ...prevMessages,
          { 
            ...message, 
            timestamp,
            user: 'System',
          }
        ];
      });
    };

    socket.on('chat_message', handleChatMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('chat_message');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, [socket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // Use the socket to send message if in a room
      if (roomId) {
        sendChatMessage(newMessage);
      } else {
        // Fallback to the prop callback if not in a room
        onSendMessage(newMessage);
      }
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <span className={`text-xs sm:text-sm font-medium ${message.user === 'System' ? 'text-blue-400' : 'text-gray-400'}`}>
                {message.user}
              </span>
              <span className="text-xs text-gray-500">
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <p className="text-white text-sm sm:text-base break-words">{message.text}</p>
          </div>
        ))}
        {/* Empty div at the end for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 sm:p-3 pt-2 pb-3 border-t border-gray-800">
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-800 rounded-full p-1 pl-2 sm:pl-3 pr-1">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none"
          />
          
          <button
            type="button"
            className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-400 transition"
          >
            <Smile size={16} className="sm:h-[18px] sm:w-[18px]" />
          </button>
          
          <button
            type="submit"
            className={`p-1.5 sm:p-2 rounded-full ${newMessage.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-700 text-gray-400'} transition`}
            disabled={!newMessage.trim()}
          >
            <Send size={16} className="sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </form>
    </div>
  );
}