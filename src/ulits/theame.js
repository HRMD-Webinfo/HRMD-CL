import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#244493', // Blue
    },
    secondary: {
      main: '#EE7212', // Orange
    },
    tertiary: {
      main: '#6C757D', // Grey
      contrastText: '#fff',
    },
    info: {
      main: '#6C757D', 
    },
    background: {
      default: '#F8F9FA', // Neutral
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#6C757D',
    }
  },
  typography: {
    fontFamily: 'var(--font-hanken-grotesk), sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 16px',
        },
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
          }
        }
      }
    },
    // MuiInputBase: {
    //   styleOverrides: {
    //     root: {
    //       height: '32px',
    //       minHeight: '32px',
    //     }
    //   }
    // },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          padding: '4px 14px',
          height: '100%',
          boxSizing: 'border-box'
        },
        root: {
          '&.MuiInputBase-sizeSmall': {
            padding: '4px',
          }
        }
      }
    }
  }
});
