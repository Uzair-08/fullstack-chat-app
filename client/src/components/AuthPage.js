// FILE: client/src/components/AuthPage.js
// ===================================================================================
import React from 'react';
import Login from './login.js';
import Register from './register.js';

function AuthPage({ onLoginSuccess }) {
  return (
    <div className="auth-container">
      <h1>ProChat</h1>
      <Register />
      <hr style={{margin: '30px 0', borderColor: '#333'}} />
      <Login onLoginSuccess={onLoginSuccess} />
    </div>
  );
}

export default AuthPage;
