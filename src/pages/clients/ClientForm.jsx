import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, IconButton, TextField, Typography, Paper, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { API_BASE } from '../../config';

export default function ClientForm({ mode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const isView = mode === 'view';
  const isCreate = mode === 'create';
  
  const [formData, setFormData] = useState({
    client_name: '',
    content_no: '',
    content_name: '',
    email_id: '',
  });

  const [credentials, setCredentials] = useState([]);

  const [quickPortals, setQuickPortals] = useState([]);

  useEffect(() => {
    const fetchQuickPortals = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/quick-portals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          setQuickPortals(result.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch quick portals", err);
      }
    };
    fetchQuickPortals();
  }, []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isCreate);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({ credentials: {} });

  useEffect(() => {
    if (!isCreate && id) {
      fetchClientData();
    }
  }, [id, isCreate]);

  const fetchClientData = async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/clients/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        let client = result;
        if (result.data) client = result.data;
        if (client.client) client = client.client;

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
    if (isView) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCredentialChange = (index, field, value) => {
    if (isView) return;
    let cleanValue = value;
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
    if (isView) return;
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
    setCredentials([...credentials, { portal_name: '', username: '', password: '' }]);
  };

  const removeCredential = (index) => {
    if (isView) return;
    setCredentials(credentials.filter((_, i) => i !== index));
    setFormErrors(prev => {
      const newCredErrors = { ...prev.credentials };
      delete newCredErrors[index];
      return { ...prev, credentials: newCredErrors };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    
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
      const hasContent = c.portal_name?.trim() || c.username?.trim() || c.password?.trim();
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

    const validCreds = credentials.filter(c => 
      c.portal_name && c.portal_name.trim() !== '' &&
      (c.username && c.username.trim() !== '')
    );

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        credentials: validCreds
      };

      const url = isCreate ? `${API_BASE}/api/clients` : `${API_BASE}/api/clients/${id}`;
      const method = isCreate ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
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
        setError(result.message || `Failed to ${isCreate ? 'create' : 'update'} client`);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
      return <Box sx={{ padding: '40px', textAlign: 'center', color: 'text.secondary' }}>Loading client details...</Box>;
  }

  const getAvailablePortals = (currentIndex) => {
    const selectedOtherPortals = credentials
      .filter((_, idx) => idx !== currentIndex)
      .map(c => (c.portal_name || '').toUpperCase().trim())
      .filter(Boolean);

    const available = quickPortals.filter(qp => {
      const pName = (qp.portal_name || '').toUpperCase().trim();
      const currentVal = (credentials[currentIndex]?.portal_name || '').toUpperCase().trim();
      return pName === currentVal || !selectedOtherPortals.includes(pName);
    });

    const currentVal = credentials[currentIndex]?.portal_name;
    if (currentVal && !available.some(qp => (qp.portal_name || '').toUpperCase() === currentVal.toUpperCase())) {
      available.unshift({ portal_name: currentVal });
    }

    return available;
  };

  const title = isCreate ? 'New Client' : isView ? 'View Client' : 'Edit Client';

  return (
    <Paper sx={{ maxWidth: '800px', margin: '0 auto', overflow: 'hidden', borderRadius: 3, boxShadow: 3 }}>
      <Box sx={{ padding: '16px 24px', bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ margin: 0, fontWeight: 500, fontSize: '1.1rem' }}>{title}</Typography>
        <IconButton onClick={() => navigate('/clients')} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <form onSubmit={handleSubmit} noValidate style={{ padding: '24px' }}>
        {error && <Box sx={{ color: '#ef4444', mb: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fca5a5' }}>{error}</Box>}
        
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>Client Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Client Name *" name="client_name" value={formData.client_name} onChange={handleInputChange} fullWidth size="small" InputProps={{ readOnly: isView }} variant={isView ? "filled" : "outlined"} error={!!formErrors.client_name} helperText={formErrors.client_name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact Name" name="content_name" value={formData.content_name} onChange={handleInputChange} fullWidth size="small" InputProps={{ readOnly: isView }} variant={isView ? "filled" : "outlined"} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact No." name="content_no" value={formData.content_no} onChange={handleInputChange} fullWidth size="small" InputProps={{ readOnly: isView }} variant={isView ? "filled" : "outlined"} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email ID" type="email" name="email_id" value={formData.email_id} onChange={handleInputChange} fullWidth size="small" InputProps={{ readOnly: isView }} variant={isView ? "filled" : "outlined"} error={!!formErrors.email_id} helperText={formErrors.email_id} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, mb: 3, borderTop: 1, borderColor: 'divider', pt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>Portal Credentials</Typography>
            {!isView && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addCredential} size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>
                Add Credential
              </Button>
            )}
          </Box>
          
          {credentials.length === 0 && (
             <Typography sx={{ color: 'text.disabled', fontStyle: 'italic', mb: 2 }}>No portal credentials added.{!isView && ' Click "Add Credential" to add one.'}</Typography>
          )}

          {credentials.map((cred, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, bgcolor: 'background.default', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <FormControl fullWidth size="small" error={!!formErrors.credentials?.[index]?.portal_name}>
                <InputLabel>Portal Name</InputLabel>
                <Select
                  label="Portal Name"
                  value={cred.portal_name || ''}
                  onChange={(e) => handleCredentialChange(index, 'portal_name', e.target.value)}
                  inputProps={{ readOnly: isView }}
                  sx={{ bgcolor: isView ? 'background.default' : 'transparent', textAlign: 'left' }}
                >
                  {getAvailablePortals(index).map((qp, i) => (
                    <MenuItem key={i} value={qp.portal_name}>{qp.portal_name}</MenuItem>
                  ))}
                </Select>
                {!!formErrors.credentials?.[index]?.portal_name && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1, textAlign: 'left' }}>
                    {formErrors.credentials?.[index]?.portal_name}
                  </Typography>
                )}
              </FormControl>
              <TextField label="Username" value={cred.username} onChange={(e) => handleCredentialChange(index, 'username', e.target.value)} fullWidth size="small" InputProps={{ readOnly: isView }} variant={isView ? "filled" : "outlined"} error={!!formErrors.credentials?.[index]?.username} helperText={formErrors.credentials?.[index]?.username} />
              <TextField label="Password" value={cred.password} onChange={(e) => handleCredentialChange(index, 'password', e.target.value)} fullWidth size="small" InputProps={{ readOnly: isView }} variant={isView ? "filled" : "outlined"} />
              
              {!isView && (
                <IconButton onClick={() => removeCredential(index)} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>

        {!isView && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', bgcolor: '#f8fafc', margin: '0 -24px -24px -24px', padding: '16px 24px' }}>
            <Button type="submit" variant="contained" disabled={loading} sx={{ textTransform: 'none', borderRadius: 1, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, px: 4 }}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={() => navigate('/clients')} variant="text" sx={{ textTransform: 'none', color: 'text.primary', fontWeight: 500, px: 3 }}>
              Cancel
            </Button>
          </Box>
        )}
      </form>
    </Paper>
  );
}
