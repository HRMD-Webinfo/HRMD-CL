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

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    user_id: '',
    company_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    address: ''
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'desktop',
          user_id: formData.user_id,
          company_name: formData.company_name,
          email: formData.email,
          password: formData.password,
          phone_number: formData.phone_number,
          address: formData.address
        }),
      });

      const result = await response.json();

      if (response.status === 201 || response.ok) {
        navigate('/login');
      } else {
        if (result.errors) {
          setFieldErrors(result.errors);
        }
        setError(result.message || 'Signup failed. Please check the fields below.');
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="./logo/full-logo.png" alt="HRMD Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '24px' }} />
        <Paper elevation={3} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Create your account
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSignup} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="user_id"
                  required
                  size="small"
                  fullWidth
                  label="Username"
                  value={formData.user_id}
                  onChange={handleChange}
                  error={!!fieldErrors.user_id}
                  helperText={fieldErrors.user_id}
                  autoFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="company_name"
                  required
                  size="small"
                  fullWidth
                  label="Company Name"
                  value={formData.company_name}
                  onChange={handleChange}
                  error={!!fieldErrors.company_name}
                  helperText={fieldErrors.company_name}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="email"
                  required
                  size="small"
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="phone_number"
                  required
                  size="small"
                  fullWidth
                  label="Phone Number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  error={!!fieldErrors.phone_number}
                  helperText={fieldErrors.phone_number}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="address"
                  required
                  size="small"
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={handleChange}
                  error={!!fieldErrors.address}
                  helperText={fieldErrors.address}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="password"
                  required
                  size="small"
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="confirmPassword"
                  required
                  size="small"
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!fieldErrors.confirmPassword}
                  helperText={fieldErrors.confirmPassword}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
