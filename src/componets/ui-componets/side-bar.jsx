import React, { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import ClientsPage from "../../pages/clients/page";
import ClientForm from "../../pages/clients/ClientForm";
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import { Button, Typography, Box, AppBar, Toolbar } from '@mui/material';
import { API_BASE } from '../../config';

function SideBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    useEffect(() => {
        const sendHeartbeat = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            try {
                const response = await fetch(`${API_BASE}/api/auth/heartbeat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
            } catch (error) {
                console.error("Heartbeat failed", error);
            }
        };

        sendHeartbeat();
        const intervalId = setInterval(sendHeartbeat, 30000);

        return () => clearInterval(intervalId);
    }, [navigate]);

    const handleLogout = async (e) => {
        if (e) e.preventDefault();
        const token = localStorage.getItem('token');
        
        if (token) {
            try {
                await fetch(`${API_BASE}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
            } catch (error) {
                console.error("Logout API failed", error);
            }
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', bgcolor: 'background.default', color: 'text.primary', fontFamily: "'Outfit', sans-serif" }}>
            {/* Top Bar Navigation */}
            <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', color: 'text.primary' }}>
                <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 }, minHeight: 50 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: 'primary.main', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }} onClick={() => navigate('/clients')}>
                            {/* <Box sx={{ bgcolor: 'primary.main', color: '#fff', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 'bold' }}>H</Box> */}
                            HRMD App
                        </Typography>

                        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button 
                                component={Link}    
                                to="/clients" 
                                startIcon={<PeopleIcon />}
                                sx={{ 
                                    textTransform: 'none', 
                                    fontWeight: 600, 
                                    borderRadius: 1.5,
                                    px: 2,
                                    py: 0.8,
                                    bgcolor: location.pathname.startsWith('/clients') ? 'primary.main' : 'transparent',
                                    color: location.pathname.startsWith('/clients') ? '#fff' : 'text.secondary',
                                    '&:hover': {
                                        bgcolor: location.pathname.startsWith('/clients') ? 'primary.dark' : 'action.hover',
                                    }
                                }}
                            >
                                Clients
                            </Button>
                        </Box> */}
                    </Box>

                    <Button 
                        onClick={handleLogout} 
                        startIcon={<LogoutIcon />} 
                        sx={{ 
                            textTransform: 'none', 
                            color: 'error.main', 
                            fontWeight: 500,
                            borderRadius: 1.5,
                            px: 2,
                            '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' }
                        }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Main Content Area */}
            <Box component="main" sx={{ flex: 1, p: { xs: 1, sm: 2 }, overflowY: 'auto' }}>
                <Routes>
                    <Route path="/" element={<Navigate to="/clients" replace />} />
                    <Route path="/dashboard" element={<Navigate to="/clients" replace />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/clients/new" element={<ClientForm mode="create" />} />
                    <Route path="/clients/edit/:id" element={<ClientForm mode="edit" />} />
                    <Route path="/clients/view/:id" element={<ClientForm mode="view" />} />
                    <Route path="*" element={<Navigate to="/clients" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default SideBar;