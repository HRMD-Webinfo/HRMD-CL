import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './page.css';
import { API_BASE } from '../../config';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForceLogoutPrompt, setShowForceLogoutPrompt] = useState(false);
  
  const navigate = useNavigate();

  const performLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // Save token and user info
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Redirect to clients page
        navigate('/clients');
      } else if (response.status === 409) {
        setShowForceLogoutPrompt(true);
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await performLogin();
  };

  const handleForceLogout = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/force-logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // Force logout successful, log in again
        await performLogin();
      } else {
        let errorMsg = 'Force logout failed. Please try again.';
        try {
            const result = await response.json();
            if (result.message) errorMsg = result.message;
        } catch(e) {}
        setError(errorMsg);
        setShowForceLogoutPrompt(false);
      }
    } catch (err) {
      setError('Network error during force logout.');
      setShowForceLogoutPrompt(false);
    } finally {
      // Note: we don't setLoading(false) here if performLogin is called and still executing, 
      // but performLogin has its own finally block that will set it to false.
      if (!response?.ok) {
          setLoading(false);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to your account</p>
        
        {error && <div className="error-message">{error}</div>}
        
        {showForceLogoutPrompt ? (
          <div style={{ textAlign: 'center', background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <p style={{ color: '#334155', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500 }}>
              You are already logged in on another device. Would you like to log out of the other device and log in here?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                    setShowForceLogoutPrompt(false);
                    setError(null);
                }} 
                className="login-btn" 
                style={{ background: '#e2e8f0', color: '#475569', marginTop: 0, boxShadow: 'none' }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleForceLogout} 
                className="login-btn" 
                style={{ marginTop: 0, background: '#ef4444' }}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Yes, Log me in'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username or Mobile</label>
              <input 
                type="text" 
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
