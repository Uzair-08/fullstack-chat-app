// ===================================================================================
// FILE: client/src/components/CreateChannelForm.js
// ===================================================================================
import React, { useState } from 'react';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
function CreateChannelForm({ onChannelCreated }) {
  const [channelName, setChannelName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/channels`,
        { name: channelName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // We don't need to call onChannelCreated here because the newChannel event will handle it
      setChannelName('');
    } catch (error) {
      alert('Failed to create channel.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-channel-form">
      <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="New channel name" />
      <button type="submit">+</button>
    </form>
  );
}

export default CreateChannelForm;