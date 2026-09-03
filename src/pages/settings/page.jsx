import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    browserMode: 'normal',
    browserEngine: 'chromium',
    delayMs: '3000'
  });
  const [saved, setSaved] = useState(false);
  const [availableBrowsers, setAvailableBrowsers] = useState([]);

  useEffect(() => {
    // Load from localStorage on mount
    const savedSettings = localStorage.getItem('automation_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    // Check installed browsers securely via Electron IPC
    if (window.electronAPI && window.electronAPI.getInstalledBrowsers) {
        window.electronAPI.getInstalledBrowsers().then(browsers => {
            setAvailableBrowsers(browsers);
        }).catch(err => console.error("Failed to get browsers", err));
    } else {
        // Fallback for normal browser dev mode
        setAvailableBrowsers([
            { id: 'chromium', name: 'Chromium (Default)' },
            { id: 'firefox', name: 'Firefox' }
        ]);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('automation_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', 
    background: '#f8fafc', color: '#334155', outline: 'none', marginBottom: '15px'
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Automation Settings</h1>
      </div>

      <form onSubmit={handleSave} style={{ padding: '24px' }}>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>Browser Mode</label>
          <select name="browserMode" value={settings.browserMode} onChange={handleChange} style={inputStyle}>
            <option value="normal">Normal</option>
            <option value="incognito">Incognito / Private</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>Browser Engine</label>
          <select name="browserEngine" value={settings.browserEngine} onChange={handleChange} style={inputStyle}>
            {availableBrowsers.length === 0 ? (
               <option value="chromium">Chromium</option>
            ) : (
               availableBrowsers.map(b => (
                   <option key={b.id} value={b.id}>{b.name}</option>
               ))
            )}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>Delay / Timeout (Milliseconds)</label>
          <input 
            type="number" 
            name="delayMs" 
            value={settings.delayMs} 
            onChange={handleChange} 
            placeholder="e.g., 3000" 
            style={inputStyle} 
            required 
            min="0"
          />
          <p style={{ margin: '-10px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Time in ms to wait between automated actions (1000ms = 1s).</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div>
            {saved && <span style={{ color: '#10b981', fontWeight: 500 }}>✓ Settings Saved!</span>}
          </div>
          <button type="submit" style={{ background: '#334155', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
