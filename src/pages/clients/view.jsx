import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Grid } from '@mui/material';

export default function ViewClientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({
    client_name: '',
    content_no: '',
    content_name: '',
    email_id: '',
  });

  const [credentials, setCredentials] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

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

  if (fetching) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading client details...</div>;
  }

  return (
    <Paper sx={{ maxWidth: '800px', margin: '0 auto', overflow: 'hidden', borderRadius: 3, boxShadow: 3 }}>
      <Box sx={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>View Client</Typography>
        <Button onClick={() => navigate('/clients')} color="inherit" sx={{ textTransform: 'none', color: '#64748b' }}>
          ✕ Close
        </Button>
      </Box>

      <Box sx={{ padding: '24px' }}>
        {error && <Box sx={{ color: '#ef4444', mb: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fca5a5' }}>{error}</Box>}
        
        <Typography variant="h6" sx={{ color: '#475569', mb: 2 }}>Client Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Client Name" value={formData.client_name} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact Name" value={formData.content_name} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact No." value={formData.content_no} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email ID" value={formData.email_id} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, mb: 3, borderTop: '1px solid #e2e8f0', pt: 3 }}>
          <Typography variant="h6" sx={{ color: '#475569', mb: 2 }}>Portal Credentials</Typography>
          
          {credentials.length === 0 ? (
             <Typography sx={{ color: '#94a3b8', fontStyle: 'italic' }}>No credentials found for this client.</Typography>
          ) : (
            credentials.map((cred, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <TextField label="Portal Name" value={cred.portal_name} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
                <TextField label="Portal Link" value={cred.portal_link} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
                <TextField label="Username" value={cred.username} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
                <TextField label="Password" value={cred.password} fullWidth size="small" InputProps={{ readOnly: true }} variant="filled" />
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Paper>
  );
}
