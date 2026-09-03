import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, IconButton, TextField, Typography, Paper, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function EditClientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({
    client_name: '',
    content_no: '',
    content_name: '',
    email_id: '',
  });

  const [credentials, setCredentials] = useState([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({ credentials: {} });

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Edit API Response:", result); // Helpful for debugging!

        // Handle common API response wrappers
        let client = result;
        if (result.data) client = result.data;
        if (client.client) client = client.client; // Handles { data: { client: {...} } }

        setFormData({
            client_name: client.client_name || '',
            content_no: client.content_no || '',
            content_name: client.content_name || '',
            email_id: client.email_id || '',
        });
        
        if (client.credentials && client.credentials.length > 0) {
            setCredentials(client.credentials);
        } else {
            setCredentials([]);
        }
      } else {
        setError('Failed to fetch client data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCredentialChange = (index, field, value) => {
    let cleanValue = field === 'portal_name' ? value.toUpperCase() : value;
    if (field === 'username' || field === 'password') {
      cleanValue = value.replace(/\s+/g, '');
    }
    const updated = [...credentials];
    updated[index][field] = cleanValue;
    setCredentials(updated);
    if (formErrors.credentials?.[index]?.[field]) {
      setFormErrors(prev => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          [index]: {
            ...prev.credentials?.[index],
            [field]: undefined
          }
        }
      }));
    }
  };

  const addCredential = () => {
    if (credentials.length > 0) {
      const lastIndex = credentials.length - 1;
      const last = credentials[lastIndex];
      const hasPortal = last.portal_name && last.portal_name.trim() !== '';
      const hasUser = last.username && last.username.trim() !== '';
      if (!hasPortal || !hasUser) {
        setFormErrors(prev => ({
          ...prev,
          credentials: {
            ...prev.credentials,
            [lastIndex]: {
              portal_name: !hasPortal ? "Portal name required before adding next" : undefined,
              username: !hasUser ? "Username required before adding next" : undefined,
            }
          }
        }));
        return;
      }
    }
    setCredentials([...credentials, { portal_name: '', portal_link: '', username: '', password: '' }]);
  };

  const removeCredential = (index) => {
    setCredentials(credentials.filter((_, i) => i !== index));
    setFormErrors(prev => {
      const newCredErrors = { ...prev.credentials };
      delete newCredErrors[index];
      return { ...prev, credentials: newCredErrors };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const newErrors = { credentials: {} };
    let hasError = false;

    // Validation
    if (!formData.client_name || formData.client_name.trim() === '') {
      newErrors.client_name = "Client name is required";
      hasError = true;
    } else if (formData.client_name.length > 255) {
      newErrors.client_name = "Client name must be 255 characters or less";
      hasError = true;
    }

    if (formData.email_id && formData.email_id.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_id.trim())) {
        newErrors.email_id = "Client email must be a valid email address";
        hasError = true;
      }
    }

    credentials.forEach((c, i) => {
      const hasContent = c.portal_name?.trim() || c.portal_link?.trim() || c.username?.trim() || c.password?.trim();
      if (hasContent) {
        if (!c.portal_name || c.portal_name.trim() === '') {
          if (!newErrors.credentials[i]) newErrors.credentials[i] = {};
          newErrors.credentials[i].portal_name = "Portal name is required";
          hasError = true;
        }
        if (!c.username || c.username.trim() === '') {
          if (!newErrors.credentials[i]) newErrors.credentials[i] = {};
          newErrors.credentials[i].username = "Username is required";
          hasError = true;
        }
      }
    });

    setFormErrors(newErrors);

    if (hasError) {
      setLoading(false);
      return;
    }

    // Filter out credentials without portal_name and username
    const validCreds = credentials.filter(c => 
      c.portal_name && c.portal_name.trim() !== '' &&
      (c.username && c.username.trim() !== '')
    );

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        id: id,
        credentials: validCreds
      };

      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate('/clients');
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update client');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading client details...</div>;
  }

  return (
    <Paper sx={{ maxWidth: '800px', margin: '0 auto', overflow: 'hidden', borderRadius: 3, boxShadow: 3 }}>
      <Box sx={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>Edit Client</Typography>
        <Button onClick={() => navigate('/clients')} color="inherit" sx={{ textTransform: 'none', color: '#64748b' }}>
          ✕ Cancel
        </Button>
      </Box>

      <form onSubmit={handleSubmit} noValidate style={{ padding: '24px' }}>
        {error && <Box sx={{ color: '#ef4444', mb: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fca5a5' }}>{error}</Box>}
        
        <Typography variant="h6" sx={{ color: '#475569', mb: 2 }}>Client Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Client Name *" name="client_name" value={formData.client_name} onChange={handleInputChange} fullWidth size="small" error={!!formErrors.client_name} helperText={formErrors.client_name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact Name" name="content_name" value={formData.content_name} onChange={handleInputChange} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact No." name="content_no" value={formData.content_no} onChange={handleInputChange} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email ID" type="email" name="email_id" value={formData.email_id} onChange={handleInputChange} fullWidth size="small" error={!!formErrors.email_id} helperText={formErrors.email_id} />
          </Grid> 
        </Grid>

        <Box sx={{ mt: 4, mb: 3, borderTop: '1px solid #e2e8f0', pt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#475569' }}>Portal Credentials</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addCredential} size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>
              Add Credential
            </Button>
          </Box>
          
          {credentials.length === 0 ? (
            <Typography sx={{ color: '#94a3b8', fontStyle: 'italic', mb: 2 }}>No portal credentials added. Click "Add Credential" to add one.</Typography>
          ) : (
            credentials.map((cred, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <TextField label="Portal Name (e.g. GST)" value={cred.portal_name} onChange={(e) => handleCredentialChange(index, 'portal_name', e.target.value)} fullWidth size="small" error={!!formErrors.credentials?.[index]?.portal_name} helperText={formErrors.credentials?.[index]?.portal_name} />
                <TextField label="Portal Link (URL)" value={cred.portal_link} onChange={(e) => handleCredentialChange(index, 'portal_link', e.target.value)} fullWidth size="small" />
                <TextField label="Username" value={cred.username} onChange={(e) => handleCredentialChange(index, 'username', e.target.value)} fullWidth size="small" error={!!formErrors.credentials?.[index]?.username} helperText={formErrors.credentials?.[index]?.username} />
                <TextField label="Password" value={cred.password} onChange={(e) => handleCredentialChange(index, 'password', e.target.value)} fullWidth size="small" />
                
                <IconButton onClick={() => removeCredential(index)} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button type="submit" variant="contained" disabled={loading} sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#334155', '&:hover': { bgcolor: '#0f172a' }, px: 2 }}>
            {loading ? 'Saving...' : 'Update Client'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
