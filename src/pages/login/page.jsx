import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { API_BASE } from '../../config';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Paper,
  Link,
  Grid
} from '@mui/material';
import Footer from '../../componets/ui-componets/footer';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForceLogoutPrompt, setShowForceLogoutPrompt] = useState(false);
  
  const navigate = useNavigate();

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: null }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }));
  };

  const performLogin = async () => {
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'desktop', username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // Safely extract token and user
        const token = result.data?.token || result.token || '';
        const user = result.data?.user || result.user || {};
        
        // Save token and user info
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirect to clients dashboard
        navigate('/clients');
      } else if (response.status === 409) {
        setShowForceLogoutPrompt(true);
      } else {
        if (result.errors) {
          const formattedErrors = { ...result.errors };
          if (formattedErrors.mobileNumber) formattedErrors.username = formattedErrors.mobileNumber;
          if (formattedErrors.phone_number) formattedErrors.username = formattedErrors.phone_number;
          if (formattedErrors.email) formattedErrors.username = formattedErrors.email;
          setFieldErrors(formattedErrors);
        }
        
        let errMsg = result.message || 'Login failed. Please check the fields below.';
        if (typeof errMsg === 'object') {
            errMsg = errMsg.message || errMsg.error || JSON.stringify(errMsg);
        }
        setError(String(errMsg));
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
    setFieldErrors({});
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/force-logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'desktop', username, password }),
      });

      if (response.ok) {
        // Force logout successful, log in again
        await performLogin();
      } else {
        let errorMsg = 'Force logout failed. Please try again.';
        try {
            const result = await response.json();
            if (result.message) {
                errorMsg = typeof result.message === 'object' ? JSON.stringify(result.message) : String(result.message);
            }
        } catch(e) {}
        setError(errorMsg);
        setShowForceLogoutPrompt(false);
      }
    } catch (err) {
      setError('Network error during force logout.');
      setShowForceLogoutPrompt(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container component="main" maxWidth="xs" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* <img src="./logo/full-logo.png" alt="HRMD Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '24px' }} /> */}
          <Paper elevation={3} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Sign in to your account
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            {showForceLogoutPrompt ? (
              <Box sx={{ textAlign: 'center', background: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#334155', mb: 2, fontWeight: 500 }}>
                  You are already logged in on another device. Would you like to log out of the other device and log in here?
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button 
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                          setShowForceLogoutPrompt(false);
                          setError(null);
                      }} 
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={handleForceLogout} 
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Yes, Log me in'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                <TextField
                  margin="normal"
                  size="small"
                  required  
                  fullWidth
                  label="Username, Email, or Mobile"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={handleUsernameChange}
                  error={!!fieldErrors.username}
                  helperText={fieldErrors.username}
                />
                <TextField
                  margin="normal"
                              size="small"
  
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2, py: 1.2 }}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <Grid container>
                  <Grid item xs>
                    <Link component={RouterLink} to="/forget-password" variant="body2">
                      Forgot password?
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link component={RouterLink} to="/signup" variant="body2">
                      {"Don't have an account? Sign Up"}
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>
      <Footer />
    </Box>
  );
}
