const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

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

  // Always fallback to Chromium if they use bundled puppeteer
  browsers.push({ name: 'Bundled Chromium', path: 'bundled', id: 'chromium' });

  return browsers;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800, // Prevent window from getting too small
    minHeight: 600,
    autoHideMenuBar: true, // Hides the File, Edit, View menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Maximize the window immediately so it fills the user's screen
  win.maximize();

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-browsers', () => {
    return checkBrowsers();
  });

  ipcMain.handle('launch-portal', async (event, data) => {
    const { link, username, password, engine, mode, delayMs } = data;
    try {
        const playwright = require('playwright');
        const browsersList = checkBrowsers();
        const selectedBrowser = browsersList.find(b => b.id === engine) || browsersList.find(b => b.path !== 'bundled') || browsersList[0];
        
        let browserType = playwright.chromium;
        const launchOptions = { headless: false, args: [] };
        
        if (selectedBrowser.id === 'firefox') {
            browserType = playwright.firefox;
        }
        
        if (selectedBrowser.path !== 'bundled') {
            launchOptions.executablePath = selectedBrowser.path;
        }

        if (mode === 'incognito') {
            if (selectedBrowser.id === 'firefox') {
                launchOptions.args.push('--private-window');
            } else if (selectedBrowser.id === 'edge') {
                launchOptions.args.push('--inprivate');
            } else {
                launchOptions.args.push('--incognito');
            }
        }

        const browser = await browserType.launch(launchOptions);
        const context = await browser.newContext();
        const page = await context.newPage();
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
                    await userFields.nth(i).fill(username);
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

  createWindow();
});