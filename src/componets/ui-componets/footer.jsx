import React from 'react';
import { Box, Typography, Grid, Link } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';

export default function Footer() {
    let webside = 'https://www.hrmdpayrollsoftware.com/';
    // let address = '409 Sunrise Business Center, Nikol to S.P.Ring road Nikol, Ahmedabad, Gujarat - 382350.';
    let phone = '+91 9228745295';
    let email = 'supports.hrmdwebinfo@gmail.com';
    // let companyName = 'Company';

    return (
        <Box sx={{ 
            bgcolor: 'background.paper', 
            py: 1.5, 
            px: { xs: 2, sm: 4 }, 
            borderTop: 1, 
            borderColor: 'divider',
            mt: 'auto' 
        }}>
            <Grid container spacing={2} justifyContent="center" alignItems="center">
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LanguageIcon fontSize="small" color="action" />
                            <Link href={webside} target="_blank" rel="noopener noreferrer" variant="body2" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                {webside.replace('https://', '').replace(/\/$/, '')}
                            </Link>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Link href={`tel:${phone.replace(/\s+/g, '')}`} variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                {phone}
                            </Link>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Link href={`mailto:${email}`} variant="body2" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                {email}
                            </Link>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
