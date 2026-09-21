const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require('child_process');
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Route all console output to electron-log (writes to file + console)
// Log file location: %USERPROFILE%\AppData\Roaming\HRMD App\logs\main.log
Object.assign(console, log.functions);

// Global error handler to catch uncaught exceptions and prevent sudden silent crashes
process.on('uncaughtException', (error) => {
  console.error('Unhandled Error:', error);
  dialog.showErrorBox('An unexpected error occurred', error.message || 'Unknown Error');
});

// Catch unhandled Promise rejections (e.g. async IPC handler errors, Playwright failures)
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

// LOW-END PC OPTIMIZATIONS for the main Electron app
app.commandLine.appendSwitch('enable-low-end-device-mode'); // Optimizes V8 and Blink for low memory (saves RAM)
app.commandLine.appendSwitch('disable-site-isolation-trials'); // Huge RAM saver (disables out-of-process iframes)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512'); // Cap V8 JavaScript engine RAM to 512MB
app.commandLine.appendSwitch('disable-dev-shm-usage'); // Prevents shared memory exhaustion crashes
app.commandLine.appendSwitch('disable-background-timer-throttling'); // Prevents background downloads/scripts from freezing

// Shared MIME type map allocated once in RAM to avoid garbage collection overhead
const MIME_TYPE_MAP = {
  'application/pdf': '.pdf',
  'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/html': '.html',
  'text/plain': '.txt',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/xml': '.xml',
  'text/xml': '.xml'
};

class CentralDownloadManager {
  constructor() {
    this.activeDownloads = 0;
    this.safeExtensions = new Set(['.pdf', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.zip', '.rar', '.doc', '.docx', '.rtf', '.gif', '.webp', '.bmp', '.html', '.htm', '.xml', '']);
    this.activeSaveDialogs = new Set(); // Track active dialogs by filename to prevent duplicates
    this.recentlySavedFiles = new Map(); // Track recently closed dialogs to prevent "one after one" sequential duplicates
  }

  mimeToExtension(mimeType) {
    if (!mimeType) return '.pdf'; // default fallback for unknown/missing
    return MIME_TYPE_MAP[mimeType.toLowerCase()] || '.pdf';
  }

  sanitizeFilename(name, mimeType) {
    if (!name || typeof name !== 'string') return `document-${Date.now()}${this.mimeToExtension(mimeType)}`;
    let sanitized = name.replace(/[<>:"/\\|?*]+/g, '').trim();
    
    // If the downloaded file has no extension (Windows says "Type: File"), 
    // append the correct extension based on its MIME type (or fallback to .pdf)
    if (!path.extname(sanitized)) {
      sanitized += this.mimeToExtension(mimeType);
    }
    
    return sanitized || `document-${Date.now()}${this.mimeToExtension(mimeType)}`;
  }

  // Show Save As dialog — user picks where to save (OS remembers last used location)
  // No parent window so it doesn't bring the main app to focus when downloading from a portal
  async promptSaveDialog(suggestedName, mimeType) {
    const sanitizedPath = this.sanitizeFilename(suggestedName, mimeType);
    const basename = path.basename(sanitizedPath);

    // Prevent double dialogs for the exact same file if one is already open
    if (this.activeSaveDialogs.has(basename)) {
      console.log('Skipping duplicate save dialog for:', basename);
      return null;
    }

    // Fix for "one after one" issue: If this exact file was just prompted within the last 3 seconds, ignore it.
    const lastPromptTime = this.recentlySavedFiles.get(basename) || 0;
    if (Date.now() - lastPromptTime < 3000) {
      console.log('Skipping sequential duplicate save dialog for:', basename);
      return null;
    }
    
    this.activeSaveDialogs.add(basename);
    this.recentlySavedFiles.set(basename, Date.now()); // Mark when it opened
    
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: sanitizedPath,
        title: 'Save Downloaded File'
      });
      
      // Mark when it closed. This ensures the 3-second cooldown starts AFTER the user finishes saving
      this.recentlySavedFiles.set(basename, Date.now());
      
      return result.canceled ? null : result.filePath;
    } finally {
      this.activeSaveDialogs.delete(basename);
    }
  }

  // Synchronous Save As dialog — user picks where to save
  // No parent window so it doesn't bring the main app to focus when downloading from a portal
  showSaveDialogSync(suggestedName, mimeType) {
    return dialog.showSaveDialogSync({
      defaultPath: this.sanitizeFilename(suggestedName, mimeType),
      title: 'Save Downloaded File'
    }) || null;
  }

  // Generate a unique path in the Downloads folder to skip the Save As dialog entirely
  getAutoSavePath(suggestedName) {
    let targetFolder = app.getPath('downloads');
    
    // Robustness check: If the user moved their Downloads folder manually or the server disconnected
    try {
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
    } catch (e) {
      console.warn("Primary downloads folder inaccessible, falling back to Documents...");
      try {
        targetFolder = app.getPath('documents');
        if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
      } catch (e2) {
        console.warn("Documents folder inaccessible, falling back to Desktop...");
        targetFolder = app.getPath('desktop');
      }
    }

    const safeName = this.sanitizeFilename(suggestedName);
    let finalPath = path.join(targetFolder, safeName);
    let counter = 1;
    
    // Ensure we don't overwrite existing files
    while(fs.existsSync(finalPath)) {
      const ext = path.extname(safeName);
      const base = path.basename(safeName, ext);
      finalPath = path.join(targetFolder, `${base} (${counter})${ext}`);
      counter++;
    }
    return finalPath;
  }

  // Single filesystem call instead of existsSync + statSync (saves disk I/O on low-spec PCs)
  verifySavedFile(filePath) {
    try {
      return fs.statSync(filePath).size > 0;
    } catch (e) {
      return false;
    }
  }

  openIfSafe(filePath) {
    if (!filePath) return;
    const extLower = path.extname(filePath).toLowerCase();

    if (extLower === '.pdf') {
      // Use cached browser list to avoid 6x fs.existsSync on every PDF download
      const browsers = getCachedBrowsers();
      if (browsers.length > 0) {
        try {
          // Force PDFs to open in a fast web browser instead of heavy desktop apps like Adobe Acrobat
          const browserProcess = spawn(browsers[0].path, [filePath], { detached: true, stdio: 'ignore' });
          browserProcess.unref();
          console.log(`Opened PDF in browser: ${browsers[0].name}`);
          return;
        } catch (err) {
          console.error('Failed to open PDF in browser, falling back to default viewer:', err);
        }
      }
    }

    if (this.safeExtensions.has(extLower)) {
      shell.openPath(filePath);
    } else {
      console.log(`Skipped auto-opening ${extLower} file for security reasons.`);
    }
  }
}

const downloadManager = new CentralDownloadManager();

// Cache browser detection to avoid repeated filesystem scans on low-spec PCs
let _cachedBrowsers = null;
function getCachedBrowsers() {
  if (_cachedBrowsers === null) _cachedBrowsers = checkBrowsers();
  return _cachedBrowsers;
}

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
    show: false,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Nullify mainWindow reference when closed so other code can safely check for it
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Global download handler for all default session windows (fixes duplicate download bugs)
  const { session, shell } = require('electron');
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const downloadUrl = (item.getURL() || '').toLowerCase();

    // Hide and mark blank/download popup windows for closure
    // (must run BEFORE any early-return so popups always get cleaned up)
    const win = BrowserWindow.fromWebContents(webContents);
    let shouldCloseWin = false;
    if (win && win !== mainWindow) {
      const url = (webContents.getURL() || '').toLowerCase();
      const isBlankOrEmpty = !url || url === '' || url === 'about:blank';
      const isDownloadUrl = url === downloadUrl;
      const isDataUrl = url.startsWith('data:');
      const isPdfUrl = url.endsWith('.pdf') || url.includes('.pdf?');
      if (isBlankOrEmpty || isDownloadUrl || isDataUrl || isPdfUrl) {
        win.isDownloadPopup = true; // Mark so ready-to-show doesn't flash it on screen
        win.hide(); // Hide instantly so the user doesn't see a white flash
        shouldCloseWin = true;
      }
    }

    // Helper: safely close/destroy popup window
    const closePopup = () => {
      if (shouldCloseWin && win && !win.isDestroyed()) {
        try { win.close(); } catch (_) { /* already destroyed */ }
      }
    };

    // Fix: Prevent double "Save As" dialogs for the same file within a short time (3 seconds)
    const mimeType = item.getMimeType();
    const originalName = item.getFilename();
    const sanitizedPath = downloadManager.sanitizeFilename(originalName, mimeType);
    const basename = path.basename(sanitizedPath);

    const lastPromptTime = downloadManager.recentlySavedFiles.get(basename) || 0;
    if (Date.now() - lastPromptTime < 3000) {
      console.log('Cancelled sequential duplicate download:', originalName);
      item.cancel();
      closePopup(); // Clean up popup even for duplicates
      return;
    }
    
    // Mark that we just prompted for this file to prevent rapid duplicates
    downloadManager.recentlySavedFiles.set(basename, Date.now());
    downloadManager.activeDownloads++;

    // Safety net for lingering popups
    if (shouldCloseWin && win && !win.isDestroyed()) {
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          console.log('Safety net: force-destroying lingering download popup window');
          win.destroy();
        }
      }, 30000);
    }

    // Instead of using our custom promptSaveDialog which causes TWO popups (because Electron 
    // also shows its own native one if we don't configure it), we just configure Electron's 
    // native async Save As dialog directly!
    item.setSaveDialogOptions({
      defaultPath: sanitizedPath,
      title: 'Save Downloaded File'
    });

    item.once('done', (event, state) => {
      downloadManager.activeDownloads = Math.max(0, downloadManager.activeDownloads - 1);

      // Close popup again in case it wasn't closed earlier
      closePopup();
      
      // Mark closed time to extend the cooldown
      downloadManager.recentlySavedFiles.set(basename, Date.now());

      if (state === 'completed') {
        const finalSavePath = item.getSavePath();
        if (finalSavePath && downloadManager.verifySavedFile(finalSavePath)) {
          console.log('Downloaded to:', finalSavePath);
          downloadManager.openIfSafe(finalSavePath);
        } else {
          console.error("Electron download completed but file is empty or missing:", finalSavePath);
        }
      } else if (state !== 'completed') {
        console.error(`Electron download failed or was cancelled. State: ${state}`);
      }
    });
  });

  // Auto Updater Events
  const sendUpdateStatus = (status, progress = null, error = null) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
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
    return getCachedBrowsers();
  });

  ipcMain.handle('launch-portal', async (event, data) => {
    const { link, username, password, engine, mode, delayMs } = data;
    try {
      if (engine === 'electron-browser') {
        const win = new BrowserWindow({
          width: 1200,
          height: 800,
          show: false,
          autoHideMenuBar: true,
          webPreferences: {
            plugins: false, // Disabled PDF viewer so all PDFs force download to PC
            nodeIntegration: false, // Security: Ensure external sites can't access Node
            contextIsolation: true, // Security: Isolate context
            sandbox: true // Security: Sandbox the external site
          }
        });

        win.maximize();

        // Spoof user agent to prevent government portals from blocking Electron and disabling forms
        win.webContents.userAgent = win.webContents.userAgent.replace(/Electron\/[0-9\.]+ /, '');

        // Handle target="_blank" popups gracefully so they don't look like generic electron windows
        win.webContents.setWindowOpenHandler((details) => {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              show: false, // Start hidden to prevent flashing/jumping screen on downloads
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

        win.webContents.on('did-create-window', (childWindow) => {
          childWindow.once('ready-to-show', () => {
            const currentUrl = (childWindow.webContents.getURL() || '').toLowerCase();
            const isBlank = !currentUrl || currentUrl === '' || currentUrl === 'about:blank';
            
            const attemptShow = () => {
              if (!childWindow.isDownloadPopup && !childWindow.isDestroyed()) {
                childWindow.show();
                childWindow.maximize();
              }
            };

            if (isBlank) {
              // It's a blank transitional window, wait for it to navigate to a real page before showing
              childWindow.webContents.once('did-navigate', attemptShow);
            } else {
              attemptShow();
            }
          });

          // Propagate the same popup handling to child windows so nested popups
          // (e.g., a portal link that opens another popup for PDF download) are also cleaned up
          childWindow.webContents.setWindowOpenHandler((details) => {
            return {
              action: 'allow',
              overrideBrowserWindowOptions: {
                show: false, // Start hidden
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
        });

        let hasAutoFilled = false;
        let pageLoadCount = 0;

        win.webContents.on('did-finish-load', async () => {
          pageLoadCount++;
          // SAFETY: Only attempt autofill on the very first page (login page).
          // Never inject any script on subsequent pages (dashboards, payment gateways, bank OTP pages etc.)
          if (hasAutoFilled || pageLoadCount > 1) return;

          const autoFillScript = `
                    (async function() {
                        const userSelectors = 'input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[name*="uid" i], input[name*="uname" i], input[id*="user" i], input[id*="login" i], input[id*="email" i], input[id*="uid" i], input[id*="uname" i], input[placeholder*="user" i], input[placeholder*="email" i], input[placeholder*="login" i]';
                        const passSelectors = 'input[type="password"], input[name*="pass" i], input[name*="pwd" i], input[id*="pass" i], input[id*="pwd" i], input[placeholder*="pass" i]';
                        const captchaSelectors = 'input[name*="captcha" i], input[id*="captcha" i], input[placeholder*="captcha" i], input[name*="security" i], input[id*="security" i]';
                                                                        
                        const delay = ms => new Promise(res => setTimeout(res, ms));
                                                                        
                        // Give SPAs some time to render
                        await delay(${delayMs || 3000}); 
                                                                        
                        let didFill = false;
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

                                // Helper to trigger React/Angular internal state updates
                                const setValue = (element, val) => {
                                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                                    if (nativeInputValueSetter) {
                                        nativeInputValueSetter.call(element, val);
                                    } else {
                                        element.value = val;
                                    }
                                    element.dispatchEvent(new Event('input', { bubbles: true }));
                                    element.dispatchEvent(new Event('change', { bubbles: true }));
                                };

                                // Fill Username
                                if (currentUsername) {
                                    const userFields = document.querySelectorAll(userSelectors);
                                    for (const field of userFields) {
                                        if (field.offsetParent !== null) { // is visible
                                            setValue(field, currentUsername);
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
                                            setValue(field, ${JSON.stringify(password || '')});
                                            filledSomething = true;
                                            break;
                                        }
                                    }
                                }
                                                                                                
                                // Focus Captcha
                                await delay(300); // Wait for React/Angular to finish re-rendering after username/password is set
                                const captchaFields = document.querySelectorAll(captchaSelectors);
                                for (const field of captchaFields) {
                                    if (field.offsetParent !== null) { // is visible
                                        field.focus();
                                        field.click();
                                        break;
                                    }
                                }
                                                                                                
                                if (filledSomething) {
                                    didFill = true;
                                    break;
                                }
                                await delay(1000); // Wait and try again if fields weren't found
                            }
                            return didFill;
                    })();
                `;
          try {
            const filled = await win.webContents.executeJavaScript(autoFillScript);
            if (filled) {
              hasAutoFilled = true; // Prevents auto-fill from running on subsequent pages (like dashboards)
            }
          } catch (e) {
            console.error("Auto-fill script error:", e);
          }
        });

        try {
          // Register ready-to-show BEFORE loadURL — otherwise the event fires
          // during loadURL and the handler is registered too late, leaving the window hidden
          win.once('ready-to-show', () => { win.show(); });
          await win.loadURL(link.startsWith('http') ? link : `https://${link}`);
          return { success: true };
        } catch (err) {
          console.error("Standard Window failed to load URL:", err.message);
          return { success: false, error: `Could not load page: ${err.message}. Please check if the link is correct or if you have internet access.` };
        }
      }

      const playwright = require('playwright-core');
      const browsersList = getCachedBrowsers();
      if (browsersList.length === 0) {
        return { success: false, error: 'No compatible browser found on your system (Chrome, Edge, or Firefox required).' };
      }
      const selectedBrowser = browsersList.find(b => b.id === engine) || browsersList[0];

      let browserType = playwright.chromium;
      const launchOptions = { headless: false, args: ['--start-maximized'] };

      if (selectedBrowser.id === 'firefox') {
        browserType = playwright.firefox;
      } else {
        // Chromium/Edge specific anti-detection and LOW-END PC OPTIMIZATION arguments
        launchOptions.args.push(
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage', // Prevent shared memory exhaustion on low RAM
          '--disable-extensions', // Saves RAM by not loading extensions
          '--disable-background-networking', // Stop background telemetry
          '--disable-features=TranslateUI', // Disable heavy built-in UI
          '--js-flags=--max-old-space-size=512' // Cap V8 JavaScript engine RAM to 512MB
        );
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

        let tempCleanupRetries = 0;
        const safeCloseTemp = () => {
          tempCleanupRetries++;
          if (downloadManager.activeDownloads > 0 && tempCleanupRetries < 60) setTimeout(safeCloseTemp, 1000);
          else { try { fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { } }
        };
        context.on('close', safeCloseTemp);
      } else {
        const browser = await browserType.launch(launchOptions);
        context = await browser.newContext({ viewport: null, acceptDownloads: true });
        page = await context.newPage();

        let browserCloseRetries = 0;
        const safeCloseBrowser = () => {
          browserCloseRetries++;
          if (downloadManager.activeDownloads > 0 && browserCloseRetries < 60) setTimeout(safeCloseBrowser, 1000);
          else { try { browser.close(); } catch (e) { } }
        };
        context.on('close', safeCloseBrowser);
        page.on('close', safeCloseBrowser);
      }

      // Hide webdriver flag to help bypass government portal bot detection
      await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

      // Handle downloads so Playwright doesn't swallow them
      const handleDownload = async (download) => {
        downloadManager.activeDownloads++;
        try {
          const originalName = download.suggestedFilename();
          const savePath = await downloadManager.promptSaveDialog(originalName);
          if (!savePath) {
            // User cancelled — stop the background download to save bandwidth & RAM
            await download.cancel();
            return;
          }
          await download.saveAs(savePath);
          if (downloadManager.verifySavedFile(savePath)) {
            console.log('Downloaded to:', savePath);
            downloadManager.openIfSafe(savePath);
          } else {
            console.error("Playwright download completed but file is empty or missing:", savePath);
          }
        } catch (err) {
          console.error('Download failed:', err);
          dialog.showErrorBox('Download Error', `Could not download file: ${err.message}\n\nPlease check your antivirus or network drive.`);
        } finally {
          downloadManager.activeDownloads = Math.max(0, downloadManager.activeDownloads - 1);
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

      // Focus Captcha
      try {
        await new Promise(r => setTimeout(r, 300)); // Wait for SPA re-render
        const captchaSelectors = [
          'input[name*="captcha" i]',
          'input[id*="captcha" i]',
          'input[placeholder*="captcha" i]',
          'input[name*="security" i]',
          'input[id*="security" i]'
        ].join(', ');

        const captchaFields = page.locator(captchaSelectors);
        const captchaCount = await captchaFields.count();
        for (let i = 0; i < captchaCount; i++) {
          if (await captchaFields.nth(i).isVisible()) {
            await captchaFields.nth(i).focus();
            await captchaFields.nth(i).click();
            break;
          }
        }
      } catch (e) {
        console.log("Captcha focus skipped:", e.message);
      }

      return { success: true };
    } catch (e) {
      console.error("Playwright automation error:", e);
      return { success: false, error: e.message };
    }
  });

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});