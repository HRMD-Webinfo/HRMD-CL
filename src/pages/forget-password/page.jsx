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
  Grid,
  Snackbar
} from '@mui/material';

export default function ForgetPasswordPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    login: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (formData.newPassword !== formData.confirmPassword) {
      return setFieldErrors({
        newPassword: 'Passwords do not match',
        confirmPassword: 'Passwords do not match'
      });
    }

    setLoading(true);

    try {
      // Determine what to send based on input (if it's an email or just login identifier)
      // The backend accepts `login`, `email`, `username`, `mobileNumber`, `phoneNumber`.
      // We will just pass it as `login` since the backend should handle this identifier,
      // but if the validation error expects `email` or `mobileNumber` or `login`, 
      // we just map the response errors accordingly.
      const payload = {
        source: 'desktop',
        login: formData.login,
        newPassword: formData.newPassword
      };

      const response = await fetch(`${API_BASE}/api/auth/forgetpassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        if (result.errors) {
          // If the API returns validation errors mapped to 'email' or 'mobileNumber' 
          // instead of 'login', we map them to the 'login' field so the UI shows it correctly.
          const formattedErrors = { ...result.errors };
          if (formattedErrors.email) formattedErrors.login = formattedErrors.email;
          if (formattedErrors.mobileNumber) formattedErrors.login = formattedErrors.mobileNumber;
          if (formattedErrors.username) formattedErrors.login = formattedErrors.username;
          if (formattedErrors.identifier) formattedErrors.login = formattedErrors.identifier;
          
          setFieldErrors(formattedErrors);
        }
        setError(result.message || 'Failed to reset password. Please check the fields below.');
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="./logo/full-logo.png" alt="HRMD Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '24px' }} />
        <Paper elevation={3} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Enter your email, username, or mobile number and a new password.
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              size="small"
              fullWidth
              label="Email, Username, or Mobile"
              name="login"
              autoFocus
              value={formData.login}
              onChange={handleChange}
              error={!!fieldErrors.login}
              helperText={fieldErrors.login}
            />
            <TextField
              margin="normal"
              required
              size="small"
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              error={!!fieldErrors.newPassword}
              helperText={fieldErrors.newPassword}
            />
            <TextField
              margin="normal"
              required
              size="small"
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={loading || success}
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </Button>
            <Grid container justifyContent="center">
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2">
                  Back to Sign In
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={success}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message="Password reset successful! Redirecting..."
      />
    </Container>
  );
}
