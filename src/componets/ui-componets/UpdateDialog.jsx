import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box
} from '@mui/material';

export default function UpdateDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(''); // 'available', 'downloading', 'ready', 'error'
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onUpdateStatus) {
      window.electronAPI.onUpdateStatus((data) => {
        setStatus(data.status);
        if (data.status === 'available') {
          setOpen(true);
        } else if (data.status === 'downloading') {
          setOpen(true);
          setProgress(data.progress || 0);
        } else if (data.status === 'ready') {
          setOpen(true);
        } else if (data.status === 'error') {
          setOpen(true);
          setErrorMsg(data.error);
        }
      });
    }
  }, []);

  const handleInstall = () => {
    if (window.electronAPI && window.electronAPI.installUpdate) {
      window.electronAPI.installUpdate();
    }
  };

  const handleClose = () => {
    // Only allow closing if it's an error or ready (user clicks later)
    if (status === 'error' || status === 'ready') {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {status === 'available' && 'Update Available'}
        {status === 'downloading' && 'Downloading Update...'}
        {status === 'ready' && 'Update Ready'}
        {status === 'error' && 'Update Error'}
      </DialogTitle>
      <DialogContent>
        {status === 'available' && (
          <Typography>A new update is available. Preparing to download...</Typography>
        )}
        
        {status === 'downloading' && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 1 }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}

        {status === 'ready' && (
          <Typography>
            The update has been successfully downloaded. Restart the app to apply it now?
          </Typography>
        )}

        {status === 'error' && (
          <Typography color="error">
            {errorMsg || 'An unknown error occurred while updating.'}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {status === 'ready' && (
          <>
            <Button onClick={handleClose} color="inherit">Later</Button>
            <Button onClick={handleInstall} variant="contained" color="primary">
              Restart & Install
            </Button>
          </>
        )}
        {status === 'error' && (
          <Button onClick={handleClose} color="primary">Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
