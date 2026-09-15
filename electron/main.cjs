const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

function checkBrowsers() {
  const browsers = [];

  // Common paths on Windows
  const paths = {
    'Google Chrome': [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    ],
    'Microsoft Edge': [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ],
    'Mozilla Firefox': [
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe"
    ]
  };

  for (const [name, checkPaths] of Object.entries(paths)) {
    for (const p of checkPaths) {
      if (fs.existsSync(p)) {
        browsers.push({ name: `${name} (Detected)`, path: p, id: name.split(' ')[1].toLowerCase() });
        break; // found this browser, skip other paths for it
      }
    }
  }

  return browsers;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800, // Prevent window from getting too small
    minHeight: 600,
    autoHideMenuBar: true, // Hides the File, Edit, View menu bar
    icon: path.join(__dirname, app.isPackaged ? '../dist/logo/half-logo.png' : '../public/logo/half-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Maximize the window immediately so it fills the user's screen
  mainWindow.maximize();

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(() => {
  // Global download handler for all default session windows (fixes duplicate download bugs)
  const { session, shell } = require('electron');
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const originalName = item.getFilename();
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const uniqueName = `${base}_${uniqueSuffix}${ext}`;
    
    // Close annoying blank popup windows that open when a PDF triggers a force-download in a new tab
    const win = BrowserWindow.fromWebContents(webContents);
    if (win && win !== mainWindow) {
      const url = webContents.getURL();
      if (!url || url === '' || url === 'about:blank' || url === item.getURL()) {
        win.close();
      }
    }

    const downloadPath = path.join(require('os').homedir(), 'Downloads', uniqueName);
    item.setSavePath(downloadPath);
    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log('Downloaded to:', downloadPath);
        
        const extLower = ext.toLowerCase();
        // Open safe files in the PC's default browser/app (e.g., Adobe, Excel, Chrome)
        const safeExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.zip', '.rar', '.doc', '.docx', '.rtf', '.gif', '.webp', '.bmp'];
        if (safeExtensions.includes(extLower)) {
          shell.openPath(downloadPath);
        } else {
          console.log(`Skipped auto-opening ${ext} file for security reasons.`);
        }
      }
    });
  });

  // Auto Updater Events
  const sendUpdateStatus = (status, progress = null, error = null) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status, progress, error });
    }
  };

  autoUpdater.on('update-available', () => {
    sendUpdateStatus('available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateStatus('downloading', progressObj.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus('ready');
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus('error', null, err == null ? "unknown" : (err.stack || err).toString());
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // Check for updates automatically
  autoUpdater.checkForUpdatesAndNotify();

  ipcMain.handle('get-browsers', () => {
    return checkBrowsers();
  });

  ipcMain.handle('launch-portal', async (event, data) => {
    const { link, username, password, engine, mode, delayMs } = data;
    try {
      if (engine === 'electron-browser') {
        const win = new BrowserWindow({
          width: 1200,
          height: 800,
          autoHideMenuBar: true,
          webPreferences: {
            plugins: false, // Disabled PDF viewer so all PDFs force download to PC
            nodeIntegration: false, // Security: Ensure external sites can't access Node
            contextIsolation: true, // Security: Isolate context
            sandbox: true // Security: Sandbox the external site
          }
        });

        // Handle target="_blank" popups gracefully so they don't look like generic electron windows
        win.webContents.setWindowOpenHandler((details) => {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              autoHideMenuBar: true,
              webPreferences: {
                plugins: false,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
              }
            }
          };
        });
        
        win.maximize();

        win.webContents.on('did-finish-load', async () => {
          const autoFillScript = `
                    (function() {
                        const userSelectors = 'input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[name*="uid" i], input[name*="uname" i], input[id*="user" i], input[id*="login" i], input[id*="email" i], input[id*="uid" i], input[id*="uname" i], input[placeholder*="user" i], input[placeholder*="email" i], input[placeholder*="login" i]';
                        const passSelectors = 'input[type="password"], input[name*="pass" i], input[name*="pwd" i], input[id*="pass" i], input[id*="pwd" i], input[placeholder*="pass" i]';
                        
                        const delay = ms => new Promise(res => setTimeout(res, ms));
                        
                        async function attemptFill() {
                            // Give SPAs some time to render
                            await delay(${delayMs || 3000}); 
                            
                            for (let i = 0; i < 5; i++) {
                                let filledSomething = false;
                                let currentUsername = ${JSON.stringify(username || '')};
                                
                                // Handle Branch Dropdown
                                if (currentUsername && currentUsername.includes('/')) {
                                    const branchDropdown = document.querySelector('select[name="LoginForm[branch]"]');
                                    if (branchDropdown) {
                                        const parts = currentUsername.split('/');
                                        const branchValue = parts[0] + '/';
                                        currentUsername = parts.slice(1).join('/');
                                        
                                        const optionToSelect = Array.from(branchDropdown.options).find(opt => opt.value === branchValue || opt.text.includes(branchValue));
                                        if (optionToSelect) {
                                            branchDropdown.value = optionToSelect.value;
                                            branchDropdown.dispatchEvent(new Event('change', { bubbles: true }));
                                        }
                                    }
                                }

                                // Fill Username
                                if (currentUsername) {
                                    const userFields = document.querySelectorAll(userSelectors);
                                    for (const field of userFields) {
                                        if (field.offsetParent !== null) { // is visible
                                            field.value = currentUsername;
                                            field.dispatchEvent(new Event('input', { bubbles: true }));
                                            field.dispatchEvent(new Event('change', { bubbles: true }));
                                            filledSomething = true;
                                            break;
                                        }
                                    }
                                }
                                
                                // Fill Password
                                if (${JSON.stringify(password || '')}) {
                                    const passFields = document.querySelectorAll(passSelectors);
                                    for (const field of passFields) {
                                        if (field.offsetParent !== null) { // is visible
                                            field.value = ${JSON.stringify(password || '')};
                                            field.dispatchEvent(new Event('input', { bubbles: true }));
                                            field.dispatchEvent(new Event('change', { bubbles: true }));
                                            filledSomething = true;
                                            break;
                                        }
                                    }
                                }
                                
                                if (filledSomething) break;
                                await delay(1000); // Wait and try again if fields weren't found
                            }
                        }
                        
                        attemptFill();
                    })();
                `;
          try {
            await win.webContents.executeJavaScript(autoFillScript);
          } catch (e) {
            console.error("Auto-fill script error:", e);
          }
        });

        try {
            await win.loadURL(link.startsWith('http') ? link : `https://${link}`);
            return { success: true };
        } catch (err) {
            console.error("Standard Window failed to load URL:", err.message);
            return { success: false, error: `Could not load page: ${err.message}. Please check if the link is correct or if you have internet access.` };
        }
        }

        const playwright = require('playwright-core');
        const browsersList = checkBrowsers();
        if (browsersList.length === 0) {
            return { success: false, error: 'No compatible browser found on your system (Chrome, Edge, or Firefox required).' };
        }
        const selectedBrowser = browsersList.find(b => b.id === engine) || browsersList[0];
        
        let browserType = playwright.chromium;
        const launchOptions = { headless: false, args: ['--start-maximized'] };
        
        if (selectedBrowser.id === 'firefox') {
            browserType = playwright.firefox;
        } else {
            // Chromium/Edge specific anti-detection arguments
            launchOptions.args.push('--disable-blink-features=AutomationControlled');
            launchOptions.ignoreDefaultArgs = ['--enable-automation'];
        }
        
        launchOptions.executablePath = selectedBrowser.path;

        let context, page;

        if (mode === 'incognito') {
            const os = require('os');
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-incognito-'));
            
            if (selectedBrowser.id === 'firefox') {
                launchOptions.args.push('--private-window');
            } else if (selectedBrowser.id === 'edge') {
                launchOptions.args.push('--inprivate');
            } else {
                launchOptions.args.push('--incognito');
            }
            
            context = await browserType.launchPersistentContext(tempDir, { ...launchOptions, viewport: null, acceptDownloads: true });
            page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
            
            context.on('close', () => {
                try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
            });
        } else {
            const browser = await browserType.launch(launchOptions);
            context = await browser.newContext({ viewport: null, acceptDownloads: true });
            page = await context.newPage();
        }

        // Hide webdriver flag to help bypass government portal bot detection
        await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

        // Handle downloads so Playwright doesn't swallow them
        const handleDownload = async (download) => {
            try {
                const originalName = download.suggestedFilename();
                const ext = path.extname(originalName);
                const base = path.basename(originalName, ext);
                const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                const uniqueName = `${base}_${uniqueSuffix}${ext}`;
                
                const downloadPath = path.join(require('os').homedir(), 'Downloads', uniqueName);
                await download.saveAs(downloadPath);
                console.log('Downloaded to:', downloadPath);
                
                const extLower = ext.toLowerCase();
                const safeExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.zip', '.rar', '.doc', '.docx', '.rtf', '.gif', '.webp', '.bmp'];
                if (safeExtensions.includes(extLower)) {
                    require('electron').shell.openPath(downloadPath);
                } else {
                    console.log(`Skipped auto-opening ${ext} file for security reasons.`);
                }
            } catch (err) {
                console.error('Download failed:', err);
            }
        };

        // Attach download handler to current and future pages
        context.on('page', p => p.on('download', handleDownload));
        if (page) page.on('download', handleDownload);

        try {
            await page.goto(link.startsWith('http') ? link : `https://${link}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (gotoErr) {
        console.log('Goto threw an error (often fine for slow/redirecting portals):', gotoErr.message);
        // If it's a fatal network error or abortion, the page won't load the form. We should abort automation.
        if (gotoErr.message.includes('ERR_') || gotoErr.message.includes('detached')) {
          return { success: false, error: `Navigation failed: ${gotoErr.message}` };
        }
      }

      const delay = parseInt(delayMs) || 3000;
      await new Promise(r => setTimeout(r, delay));

      // The user or a script might have closed the browser/page during the delay or navigation
      if (page.isClosed()) {
        return { success: false, error: 'Target page was closed before automation could complete' };
      }

      if (username) {
        let finalUsername = username;

        // Handle LWF portal branch dropdown (e.g. "HO/1232112")
        try {
          const branchDropdown = page.locator('select[name="LoginForm[branch]"]');
          if (username.includes('/') && await branchDropdown.count() > 0) {
            const parts = username.split('/');
            const branchValue = parts[0] + '/'; // e.g., "HO/"
            finalUsername = parts.slice(1).join('/'); // The rest of the ID
            await branchDropdown.selectOption(branchValue);
          }
        } catch (e) {
          console.log("Branch selection skipped:", e.message);
        }

        const userSelectors = [
          'input[type="email"]',
          'input[name*="user" i]',
          'input[name*="login" i]',
          'input[name*="email" i]',
          'input[name*="uid" i]',
          'input[name*="uname" i]',
          'input[id*="user" i]',
          'input[id*="login" i]',
          'input[id*="email" i]',
          'input[id*="uid" i]',
          'input[id*="uname" i]',
          'input[placeholder*="user" i]',
          'input[placeholder*="email" i]',
          'input[placeholder*="login" i]'
        ].join(', ');

        // Try to find the first visible matching input
        const userFields = page.locator(userSelectors);
        const count = await userFields.count();
        for (let i = 0; i < count; i++) {
          if (await userFields.nth(i).isVisible()) {
            await userFields.nth(i).fill(finalUsername);
            break;
          }
        }
      }

      if (password) {
        const passSelectors = [
          'input[type="password"]',
          'input[name*="pass" i]',
          'input[name*="pwd" i]',
          'input[id*="pass" i]',
          'input[id*="pwd" i]',
          'input[placeholder*="pass" i]'
        ].join(', ');

        const passFields = page.locator(passSelectors);
        const count = await passFields.count();
        for (let i = 0; i < count; i++) {
          if (await passFields.nth(i).isVisible()) {
            await passFields.nth(i).fill(password);
            break;
          }
        }
      }



      return { success: true };
    } catch (e) {
      console.error("Playwright automation error:", e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('launch-browser-window', async (event, data) => {
    const { link } = data;
    try {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
          plugins: false,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });
      
      win.webContents.setWindowOpenHandler((details) => {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            webPreferences: {
              plugins: false,
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true
            }
          }
        };
      });
      
      win.maximize();
      await win.loadURL(link.startsWith('http') ? link : `https://${link}`);
      return { success: true };
    } catch (e) {
      console.error("BrowserWindow launch error:", e);
      return { success: false, error: e.message };
    }
  });

  createWindow();
});