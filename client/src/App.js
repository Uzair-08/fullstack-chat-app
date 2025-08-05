// client/src/App.js

import React, { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';

function App() {
  // 1. Create a state variable to track if the user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 2. Use useEffect to check for a token when the app first loads
  useEffect(() => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // If a token exists, we consider the user authenticated
    if (token) {
      setIsAuthenticated(true);
    }
  }, []); // The empty array [] means this effect runs only once on mount

  // This function will be called from the Login component on success
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // This function will be called from the ChatPage component
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // 3. Implement Conditional Rendering
  return (
    <div className="App">
      {/* If isAuthenticated is true, show ChatPage. Otherwise, show AuthPage. */}
      {isAuthenticated ? (
        <ChatPage onLogout={handleLogout} />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;