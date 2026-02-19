
import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import './Chat.css';

function Chat({ roomCode, senderName, messages = [] }) {
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        socket.emit("sendMessage", {
            room: roomCode,
            message: newMessage,
            sender: senderName
        });

        setNewMessage("");
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.sender === senderName ? 'my-message' : ''}`}>
                        <span className="chat-sender">{msg.sender}: </span>
                        <span className="chat-text">{msg.message}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
}

export default Chat;
