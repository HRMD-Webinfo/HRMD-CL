import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Menu, MenuItem, Select, TextField, FormControl, InputLabel, Tooltip, Dialog, DialogTitle, DialogContent, Typography, Breadcrumbs, InputAdornment, Pagination, Autocomplete } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { API_BASE } from '../../config';

const normalizeUrl = (url) => {
  if (!url) return '';
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
};

const QuickPortalsPopup = ({ open, onClose, settings, quickPortals, fetchQuickPortals }) => {
  const [quickLinks, setQuickLinks] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setQuickLinks(quickPortals ? quickPortals.map(qp => ({ id: qp.id, name: qp.portal_name, link: qp.portal_link })) : []);
      setErrors({});
    }
  }, [open, quickPortals]);

  const handleSave = async () => {
    const newErrors = {};
    let hasError = false;

    const namesSeen = new Map();
    const linksSeen = new Map();

    quickLinks.forEach((ql, i) => {
      const hasName = ql.name && ql.name.trim() !== '';
      const hasLink = ql.link && ql.link.trim() !== '';
      if (hasName || hasLink) {
        if (!hasName) {
          newErrors[`name_${i}`] = "Name required";
          hasError = true;
        } else {
          const normName = ql.name.trim().toUpperCase();
          if (namesSeen.has(normName)) {
            newErrors[`name_${i}`] = "Duplicate name";
            newErrors[`name_${namesSeen.get(normName)}`] = "Duplicate name";
            hasError = true;
          } else {
            namesSeen.set(normName, i);
          }
        }

        if (!hasLink) {
          newErrors[`link_${i}`] = "Link required";
          hasError = true;
        } else {
          const normLink = normalizeUrl(ql.link);
          if (linksSeen.has(normLink)) {
            newErrors[`link_${i}`] = "Duplicate link URL";
            newErrors[`link_${linksSeen.get(normLink)}`] = "Duplicate link URL";
            hasError = true;
          } else {
            linksSeen.set(normLink, i);
          }
        }
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    const validLinks = quickLinks.filter(ql => ql.name && ql.name.trim() !== '' && ql.link && ql.link.trim() !== '');

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/quick-portals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(validLinks)
      });
      if (fetchQuickPortals) fetchQuickPortals();
    } catch (err) {
      console.error("Failed to save quick portals", err);
    }
    onClose();
  };

  const handleChange = (index, field, value) => {
    const updated = [...quickLinks];
    updated[index][field] = field === 'name' ? value.toUpperCase() : value;
    setQuickLinks(updated);
    setErrors(prev => {
      const next = { ...prev };
      delete next[`${field}_${index}`];
      return next;
    });
  };

  const handleAdd = () => {
    if (quickLinks.length > 0) {
      const lastIndex = quickLinks.length - 1;
      const last = quickLinks[lastIndex];
      const nameTrim = last.name?.trim() || '';
      const linkTrim = last.link?.trim() || '';

      if (!nameTrim || !linkTrim) {
        const newErrors = {};
        if (!nameTrim) newErrors[`name_${lastIndex}`] = "Name required";
        if (!linkTrim) newErrors[`link_${lastIndex}`] = "Link required";
        setErrors(newErrors);
        return;
      }

      const normName = nameTrim.toUpperCase();
      const normLink = normalizeUrl(linkTrim);
      const duplicateNameIndex = quickLinks.findIndex((q, idx) => idx !== lastIndex && (q.name || '').trim().toUpperCase() === normName);
      const duplicateLinkIndex = quickLinks.findIndex((q, idx) => idx !== lastIndex && normalizeUrl(q.link) === normLink);

      if (duplicateNameIndex !== -1 || duplicateLinkIndex !== -1) {
        const newErrors = {};
        if (duplicateNameIndex !== -1) newErrors[`name_${lastIndex}`] = "Duplicate name";
        if (duplicateLinkIndex !== -1) newErrors[`link_${lastIndex}`] = "Duplicate link URL";
        setErrors(newErrors);
        return;
      }
    }
    setQuickLinks([...quickLinks, { name: '', link: '' }]);
  };

  const handleRemove = (index) => {
    const updated = quickLinks.filter((_, i) => i !== index);
    setQuickLinks(updated);
    setErrors({});
  };

  const handleLaunch = async (linkObj) => {
    if (!linkObj.link) return;
    let url = linkObj.link;
    if (!url.startsWith('http')) url = `https://${url}`;

    if (window.electronAPI && window.electronAPI.launchPortal) {
      try {
        await window.electronAPI.launchPortal({
          link: url,
          engine: settings.browserEngine,
          mode: settings.browserMode,
          delayMs: settings.delayMs
        });
      } catch (err) {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white', py: 1.5, px: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>Quick Portals</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {quickLinks.length === 0 ? (
          <Typography sx={{ color: 'text.disabled', fontStyle: 'italic', mb: 2 }}>No quick portals added yet. Click "Add New Link" below.</Typography>
        ) : (
          quickLinks.map((ql, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Name"
                size="small"
                value={ql.name}
                onChange={(e) => handleChange(i, 'name', e.target.value)}
                sx={{ width: '200px' }}
                placeholder="PF"
                error={!!errors[`name_${i}`]}
                helperText={errors[`name_${i}`]}
              />
              <TextField
                label="Link"
                size="small"
                value={ql.link}
                onChange={(e) => handleChange(i, 'link', e.target.value)}
                fullWidth
                placeholder="https://..."
                error={!!errors[`link_${i}`]}
                helperText={errors[`link_${i}`]}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => handleLaunch(ql)}
                disabled={!ql.link}
                sx={{ textTransform: 'none', minWidth: '70px', bgcolor: 'primary.main', mt: 0.5 }}
              >
                Open
              </Button>
              <IconButton onClick={() => handleRemove(i)} size="small" color="error" sx={{ mt: 0.5 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
        <Button startIcon={<AddIcon />} onClick={handleAdd} size="small" sx={{ textTransform: 'none', mt: 1 }}>
          Add New Link
        </Button>
      </DialogContent>
      <Box sx={{ p: 2, px: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
        <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none', bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1, px: 3 }}>Save</Button>
        <Button onClick={onClose} variant="text" sx={{ textTransform: 'none', color: 'text.primary', fontWeight: 500 }}>Cancel</Button>
      </Box>
    </Dialog>
  );
};

const ClientLinks = ({ clientId, client, settings, quickPortals }) => {
  const [creds, setCreds] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const getResolvedLink = (cred) => {
    if (cred.portal_link) return cred.portal_link;
    if (quickPortals && cred.portal_name) {
      const match = quickPortals.find(q => q.portal_name && q.portal_name.toLowerCase() === cred.portal_name.toLowerCase());
      if (match && match.portal_link) return match.portal_link;
    }
    return null;
  };

  const handleLaunch = async (cred) => {
    const linkToOpen = getResolvedLink(cred);
    if (!linkToOpen) return;

    if (window.electronAPI && window.electronAPI.launchPortal) {
      try {
        await window.electronAPI.launchPortal({
          link: linkToOpen,
          username: cred.username,
          password: cred.password,
          engine: settings.browserEngine,
          mode: settings.browserMode,
          delayMs: settings.delayMs
        });
      } catch (err) {
        console.error("Failed to launch portal", err);
      }
    } else {
      window.open(linkToOpen.startsWith('http') ? linkToOpen : `https://${linkToOpen}`, '_blank');
    }
  };

  useEffect(() => {
    const inlineCreds = client?.credentials || client?.client_portal_credentials || client?.portals;
    if (inlineCreds && Array.isArray(inlineCreds)) {
      const sortedCreds = [...inlineCreds].sort((a, b) => {
        const nameA = (a.portal_name || '').toLowerCase();
        const nameB = (b.portal_name || '').toLowerCase();
        const getPriority = (name) => {
          if (name.includes('pf')) return 4;
          if (name.includes('esic')) return 3;
          if (name.includes('lwf')) return 2;
          if (name.includes('shram') || name.includes('sarm')) return 1;
          return 0;
        };
        return getPriority(nameB) - getPriority(nameA);
      });
      setCreds(sortedCreds);
      return;
    }

    const fetchCreds = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/clients/${clientId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const result = await response.json();
          let cData = result;
          if (result.data) cData = result.data;
          if (cData.client) cData = cData.client;
          const fetchedCreds = cData.credentials || cData.client_portal_credentials || cData.portals || [];
          const sortedCreds = [...fetchedCreds].sort((a, b) => {
            const nameA = (a.portal_name || '').toLowerCase();
            const nameB = (b.portal_name || '').toLowerCase();
            const getPriority = (name) => {
              if (name.includes('pf')) return 4;
              if (name.includes('esic')) return 3;
              if (name.includes('lwf')) return 2;
              if (name.includes('shram') || name.includes('sarm')) return 1;
              return 0;
            };
            return getPriority(nameB) - getPriority(nameA);
          });
          setCreds(sortedCreds);
        }
      } catch (e) { }
    };
    fetchCreds();
  }, [clientId, client]);

  if (!creds) return <Box sx={{ minHeight: '28px', display: 'flex', alignItems: 'center' }}><span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>...</span></Box>;
  if (creds.length === 0) return <Box sx={{ minHeight: '28px', display: 'flex', alignItems: 'center' }}><span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>-</span></Box>;

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minHeight: '28px', flexWrap: 'nowrap' }}>
      {creds.slice(0, 4).map((cred, i) => {
        if (!getResolvedLink(cred)) return null;
        const name = (cred.portal_name || '').toLowerCase();
        let bg = '#f1f5f9';
        let color = '#334155';
        let hoverBg = '#e2e8f0';

        if (name.includes('pf')) {
          bg = '#eff6ff';
          color = '#1d4ed8';
          hoverBg = '#dbeafe';
        } else if (name.includes('esic')) {
          bg = '#fdf4ff';
          color = '#c026d3';
          hoverBg = '#fae8ff';
        } else if (name.includes('lwf')) {
          bg = '#f0fdf4';
          color = '#15803d';
          hoverBg = '#dcfce7';
        } else if (name.includes('sarm') || name.includes('shram')) {
          bg = '#f0fdfa';
          color = '#0f766e';
          hoverBg = '#ccfbf1';
        }

        return (
          <Button
            key={i}
            variant="text"
            size="small"
            startIcon={<LinkIcon sx={{ fontSize: '0.9rem !important' }} />}
            onClick={() => handleLaunch(cred)}
            sx={{
              height: "26px",
              textTransform: 'none',
              borderRadius: '13px',
              bgcolor: bg,
              color: color,
              fontSize: '0.75rem',
              fontWeight: 600,
              px: 1.5,
              py: 0,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: hoverBg },
              boxShadow: 'none'
            }}
          >
            {(cred.portal_name || 'Portal').toUpperCase()}
          </Button>
        );
      })}

      {creds.length > 4 && (
        <>
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ width: 26, height: 26 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
          >
            {creds.slice(4).map((cred, i) => getResolvedLink(cred) && (
              <MenuItem
                key={i}
                onClick={() => {
                  setAnchorEl(null);
                  handleLaunch(cred);
                }}
              >
                <LinkIcon sx={{ mr: 1, fontSize: '1.1rem', color: 'text.secondary' }} />
                {(cred.portal_name || 'Portal').toUpperCase()}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
};

const PortalUsername = ({ clientId, client, portalType }) => {
  const keyLower = portalType.toLowerCase();

  if (keyLower === 'pf') {
    if (client.pf_username) return client.pf_username;
    if (client.pfusername) return client.pfusername;
    if (client.pf_user) return client.pf_user;
  }
  if (keyLower === 'esic') {
    if (client.esic_username) return client.esic_username;
    if (client.esicusername) return client.esicusername;
    if (client.esic_user) return client.esic_user;
  }

  const inlineCreds = client.credentials || client.client_portal_credentials || client.portals;
  if (inlineCreds && Array.isArray(inlineCreds)) {
    const match = inlineCreds.find(c => (c.portal_name || '').toLowerCase().includes(keyLower));
    return match?.username || '-';
  }

  const [username, setUsername] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCreds = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/clients/${clientId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok && isMounted) {
          const result = await response.json();
          let cData = result;
          if (result.data) cData = result.data;
          if (cData.client) cData = cData.client;
          const creds = cData.credentials || cData.client_portal_credentials || cData.portals || [];
          const match = creds.find(c => (c.portal_name || '').toLowerCase().includes(keyLower));
          setUsername(match?.username || '-');
        }
      } catch (e) {
        if (isMounted) setUsername('-');
      }
    };
    fetchCreds();
    return () => { isMounted = false; };
  }, [clientId, keyLower]);

  if (username === null) return <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>...</span>;
  return username;
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API Query States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('1');
  const [portalNameFilter, setPortalNameFilter] = useState('');
  const [availablePortals, setAvailablePortals] = useState([]);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('DESC');
  const [totalRecords, setTotalRecords] = useState(0);
  const [quickPortalsOpen, setQuickPortalsOpen] = useState(false);
  const [quickPortals, setQuickPortals] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();

  // Settings State
  const [settings, setSettings] = useState({
    browserMode: 'normal',
    browserEngine: 'electron-browser',
    delayMs: '3000'
  });
  const [availableBrowsers, setAvailableBrowsers] = useState([]);

  const fetchQuickPortals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/quick-portals`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const result = await response.json();
        setQuickPortals(result.data || []);
      }
    } catch (err) {
      console.error("Failed to load quick portals", err);
    }
  };

  useEffect(() => {
    fetchQuickPortals();
    
    const fetchPortalsList = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/portals`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          if (json.data) setAvailablePortals(json.data);
        }
      } catch (err) {}
    };
    fetchPortalsList();

    // Load Settings
    const savedSettings = localStorage.getItem('automation_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) { }
    }

    // Load Browsers
    if (window.electronAPI && window.electronAPI.getInstalledBrowsers) {
      window.electronAPI.getInstalledBrowsers().then(setAvailableBrowsers).catch(() => { });
    } else {
      setAvailableBrowsers([
        { id: 'chromium', name: 'Chromium (Default)' },
        { id: 'firefox', name: 'Firefox' }
      ]);
    }
  }, []);

  const fetchClients = async (p = page, l = limit, s = search, ob = orderBy, o = order, active = isActiveFilter, portalFilt = portalNameFilter) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: p,
        limit: l,
        orderBy: ob,
        order: o
      };

      if (s && s.trim() !== '') {
        params.search = s.trim();
      }
      if (active !== 'all' && active !== '') {
        params.is_active = active;
      }
      if (portalFilt && portalFilt !== 'all' && portalFilt !== '') {
        params.portal_name = portalFilt;
      }

      const queryParams = new URLSearchParams(params).toString();

      const response = await fetch(`${API_BASE}/api/clients?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        let clientList = [];
        let total = 0;

        if (Array.isArray(data)) {
          clientList = data;
          total = data.length;
        } else if (data && Array.isArray(data.data)) {
          clientList = data.data;
          if (data.pagination) {
            total = data.pagination.totalRecords ?? data.pagination.totalCount ?? data.pagination.total ?? data.pagination.count ?? clientList.length;
          } else if (data.totalRecords ?? data.totalCount ?? data.total) {
            total = data.totalRecords ?? data.totalCount ?? data.total;
          } else {
            total = clientList.length;
          }
        }

        setClients(clientList);
        setTotalRecords(total);
      } else {
        setError('Failed to fetch clients');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(page, limit, search, orderBy, order, isActiveFilter, portalNameFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, limit, search, orderBy, order, isActiveFilter, portalNameFilter]);

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    const newSettings = { ...settings, [name]: value };
    setSettings(newSettings);
    localStorage.setItem('automation_settings', JSON.stringify(newSettings));
  };

  const handleSort = (field) => {
    if (orderBy === field) {
      setOrder(order === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setOrderBy(field);
      setOrder('ASC');
    }
    setPage(1);
  };

  const renderSortIcon = (field) => {
    if (orderBy === field) {
      return order === 'ASC' ? <ArrowUpwardIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : <ArrowDownwardIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
    return <ArrowUpwardIcon sx={{ fontSize: 16, color: 'text.disabled', opacity: 0.5 }} />;
  };

  return (
    <>
      <div style={{ padding: '16px 20px', background: theme.palette.background.paper, borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: theme.palette.primary.main }}>Clients</h1>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Quick Portals">
              <IconButton onClick={() => setQuickPortalsOpen(true)} sx={{ bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <LinkIcon color="primary" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/clients/new')}
              sx={{ textTransform: 'none', borderRadius: 1, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, boxShadow: 'none', fontWeight: 600, px: 3 }}
            >
              Add New
            </Button>
          </Box>
        </div>

        <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider', mb: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Box sx={{ fontWeight: 600, color: 'text.primary', mr: 1 }}>⚙️ Automation Settings:</Box>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Mode</InputLabel>
            <Select name="browserMode" value={settings.browserMode} onChange={handleSettingChange} label="Mode">
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="incognito">Incognito</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Browser</InputLabel>
            <Select name="browserEngine" value={settings.browserEngine} onChange={handleSettingChange} label="Browser">
              {availableBrowsers.length === 0 ? <MenuItem value="chromium">Chromium</MenuItem> : availableBrowsers.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
              <MenuItem value="electron-browser">Standard Window (Safe)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Delay (ms)"
            type="number"
            name="delayMs"
            value={settings.delayMs}
            onChange={handleSettingChange}
            size="small"
            sx={{ width: 100 }}
          />
        </Box>

        {error && <div style={{ color: theme.palette.error.main, marginBottom: '20px' }}>{error}</div>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.875rem' }}>
            <span>Show</span>
            <Autocomplete
              freeSolo
              size="small"
              disableClearable
              options={['10', '25', '50', '100']}
              value={String(limit)}
              onChange={(event, newValue) => {
                let val = parseInt(newValue, 10);
                if (!isNaN(val)) {
                  setLimit(val);
                  setPage(1);
                }
              }}
              inputValue={String(limit)}
              onInputChange={(event, newInputValue) => {
                setLimit(newInputValue);
                setPage(1);
              }}
              onBlur={() => {
                let val = parseInt(limit, 10);
                if (isNaN(val) || val < 10) val = 10;
                if (val > 1000) val = 1000;
                if (String(val) !== String(limit)) {
                  setLimit(val);
                  setPage(1);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  type="number"
                  inputProps={{ ...params.inputProps, min: 10, max: 1000 }}
                  sx={{ 
                    width: 90,
                    '& .MuiInputBase-root': { height: 32, minHeight: 32, padding: '0 8px' },
                    '& input[type=number]': {
                      '-moz-appearance': 'textfield'
                    },
                    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                      '-webkit-appearance': 'none',
                      margin: 0
                    }
                  }}
                />
              )}
            />
            <span>entries</span>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={isActiveFilter}
                label="Status"
                onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
                sx={{ height: 36, bgcolor: '#fff' }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="1">Active</MenuItem>
                <MenuItem value="0">Inactive</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search Client, PF or ESIC"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              InputProps={{
                startAdornment: <InputAdornment position="start" sx={{ ml: 1 }}><SearchIcon fontSize="small" /></InputAdornment>,
                sx: { height: 36, bgcolor: '#fff', fontSize: '0.85rem' }
              }}
              sx={{ width: 260 }}
            />
          </Box>
        </Box>

        <div style={{ overflowX: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', tableLayout: 'fixed' }}>
            <thead style={{ bgcolor: '#f8fafc' }}>
              <tr style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                <th onClick={() => handleSort('client_name')} style={{ cursor: 'pointer', padding: '10px 12px', width: '20%', color: theme.palette.text.primary, fontWeight: 600, borderRight: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Client Name {renderSortIcon('client_name')}</Box>
                </th>
                <th onClick={() => handleSort('pf_username')} style={{ cursor: 'pointer', padding: '10px 12px', width: '14%', color: theme.palette.text.primary, fontWeight: 600, borderRight: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>PF Username {renderSortIcon('pf_username')}</Box>
                </th>
                <th onClick={() => handleSort('esic_username')} style={{ cursor: 'pointer', padding: '10px 12px', width: '14%', color: theme.palette.text.primary, fontWeight: 600, borderRight: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>ESIC Username {renderSortIcon('esic_username')}</Box>
                </th>
                <th onClick={() => handleSort('content_no')} style={{ cursor: 'pointer', padding: '10px 12px', width: '14%', color: theme.palette.text.primary, fontWeight: 600, borderRight: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Contact No. {renderSortIcon('content_no')}</Box>
                </th>
                <th style={{ padding: '10px 12px', width: '30%', color: theme.palette.text.primary, fontWeight: 600, borderRight: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Links
                    <IconButton size="small" onClick={(e) => setFilterAnchorEl(e.currentTarget)} sx={{ ml: 1, padding: '2px' }}>
                      <FilterListIcon fontSize="small" sx={{ color: (portalNameFilter && portalNameFilter !== 'all') ? 'primary.main' : 'text.disabled' }} />
                    </IconButton>
                  </Box>
                  <Menu
                    anchorEl={filterAnchorEl}
                    open={Boolean(filterAnchorEl)}
                    onClose={() => setFilterAnchorEl(null)}
                  >
                    <MenuItem onClick={() => { setPortalNameFilter('all'); setPage(1); setFilterAnchorEl(null); }} selected={portalNameFilter === 'all' || portalNameFilter === ''}>All Portals</MenuItem>
                    {availablePortals.map((portal, idx) => (
                      <MenuItem key={idx} onClick={() => { setPortalNameFilter(portal); setPage(1); setFilterAnchorEl(null); }} selected={portalNameFilter === portal}>{portal}</MenuItem>
                    ))}
                  </Menu>
                </th>
                <th style={{ padding: '10px 12px', width: '8%', color: theme.palette.text.primary, fontWeight: 600, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ height: `${Math.min(Math.max(clients.length, 1), 10) * 42}px`, textAlign: 'center', color: theme.palette.text.secondary }}>Loading...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan="6" style={{ height: `42px`, textAlign: 'center', color: theme.palette.text.secondary }}>No clients found.</td></tr>
              ) : (
                clients.map((client, index) => (
                  <tr key={client.id || index} style={{ borderBottom: `1px solid ${theme.palette.divider}`, height: '42px' }}>
                    <td style={{ padding: '4px 8px', color: theme.palette.text.secondary, borderRight: `1px solid ${theme.palette.divider}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.client_name}</td>
                    <td style={{ padding: '4px 8px', color: theme.palette.text.secondary, borderRight: `1px solid ${theme.palette.divider}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <PortalUsername clientId={client.id} client={client} portalType="pf" />
                    </td>
                    <td style={{ padding: '4px 8px', color: theme.palette.text.secondary, borderRight: `1px solid ${theme.palette.divider}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <PortalUsername clientId={client.id} client={client} portalType="esic" />
                    </td>
                    <td style={{ padding: '4px 8px', color: theme.palette.text.secondary, borderRight: `1px solid ${theme.palette.divider}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.content_no}</td>
                    <td style={{ padding: '4px 8px', borderRight: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                      {/* Dynamically fetch and render links for this row */}
                      <ClientLinks clientId={client.id} client={client} settings={settings} quickPortals={quickPortals} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View">
                          <IconButton onClick={() => navigate(`/clients/view/${client.id}`)} size="small" sx={{ color: 'text.secondary' }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => navigate(`/clients/edit/${client.id}`)} size="small" sx={{ color: 'text.secondary' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
          {(() => {
            const effectiveTotal = Math.max(totalRecords, clients.length);
            const startEntry = clients.length === 0 ? 0 : (page - 1) * limit + 1;
            const endEntry = clients.length === 0 ? 0 : Math.min(page * limit, effectiveTotal);
            return (
              <>
                <Pagination
                  count={Math.ceil(effectiveTotal / limit) || 1}
                  page={page}
                  siblingCount={1}
                  boundaryCount={0}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                  shape="rounded"
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: '500',
                    },
                    '& .Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      }
                    }
                  }}
                />
                <Box>Showing {startEntry} to {endEntry} of {effectiveTotal} entries</Box>
              </>
            );
          })()}
        </Box>
      </div>

      <QuickPortalsPopup open={quickPortalsOpen} onClose={() => setQuickPortalsOpen(false)} settings={settings} quickPortals={quickPortals} fetchQuickPortals={fetchQuickPortals} />
      {/* // </div> */}
    </>

  );
}
