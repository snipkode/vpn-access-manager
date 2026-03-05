const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { execSync, spawn } = require('child_process');

const store = new Store();
let mainWindow = null;
let tray = null;
let wireguardProcess = null;
let isConnected = false;
let currentConfig = null;

// WireGuard executable paths (adjust based on OS)
const WG_PATHS = {
  win32: 'C:\\Program Files\\WireGuard\\wireguard.exe',
  darwin: '/usr/local/bin/wg',
  linux: '/usr/bin/wg'
};

function getWgPath() {
  return WG_PATHS[process.platform] || 'wg';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 650,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    show: false,
    frame: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Don't show until ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle close
  mainWindow.on('close', (e) => {
    if (isConnected) {
      e.preventDefault();
      disconnectVPN();
      setTimeout(() => {
        mainWindow.hide();
      }, 1000);
    }
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  
  updateTrayMenu();
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isConnected ? 'Connected 🔵' : 'Disconnected ⚪',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open VPN Client',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: isConnected ? 'Disconnect' : 'Connect',
      click: () => {
        if (isConnected) {
          disconnectVPN();
        } else {
          connectVPN();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (isConnected) {
          disconnectVPN();
        }
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip(isConnected ? 'VPN Access Client - Connected' : 'VPN Access Client - Disconnected');
  tray.setContextMenu(contextMenu);
  
  // Click to toggle window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function connectVPN() {
  const configPath = store.get('configPath');
  
  if (!configPath || !fs.existsSync(configPath)) {
    dialog.showErrorBox('Configuration Error', 'No VPN configuration found. Please import a config file.');
    return;
  }

  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: Use wireguard.exe
      execSync(`"${getWgPath()}" /installtunnelservice "${configPath}"`, { 
        windowsHide: true 
      });
    } else if (platform === 'darwin') {
      // macOS: Use wireguard-go or wg-quick
      const interfaceName = 'utun9';
      wireguardProcess = spawn('wg-quick', ['up', configPath.replace('.conf', '')], {
        detached: false
      });
    } else {
      // Linux: Use wg-quick
      const configName = path.basename(configPath, '.conf');
      execSync(`sudo wg-quick up ${configName}`);
    }
    
    isConnected = true;
    currentConfig = configPath;
    store.set('connected', true);
    store.set('connectedAt', new Date().toISOString());
    
    mainWindow.webContents.send('connection-status', { connected: true });
    updateTrayMenu();
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'VPN Connected',
      message: 'Successfully connected to VPN!',
      icon: 'info'
    });
  } catch (error) {
    dialog.showErrorBox('Connection Error', `Failed to connect: ${error.message}`);
    isConnected = false;
    updateTrayMenu();
  }
}

function disconnectVPN() {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      if (currentConfig) {
        const configName = path.basename(currentConfig, '.conf');
        execSync(`"${getWgPath()}" /removetunnelservice ${configName}`, { 
          windowsHide: true 
        });
      }
    } else if (platform === 'darwin') {
      if (currentConfig) {
        const configName = path.basename(currentConfig, '.conf');
        execSync(`wg-quick down ${configName}`);
      }
    } else {
      // Linux
      if (currentConfig) {
        const configName = path.basename(currentConfig, '.conf');
        execSync(`sudo wg-quick down ${configName}`);
      }
    }
    
    isConnected = false;
    currentConfig = null;
    store.set('connected', false);
    store.set('connectedAt', null);
    
    mainWindow.webContents.send('connection-status', { connected: false });
    updateTrayMenu();
  } catch (error) {
    console.error('Disconnect error:', error.message);
    isConnected = false;
    updateTrayMenu();
  }
}

function getConnectionStatus() {
  try {
    const output = execSync(`${getWgPath()} show`, { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

// IPC Handlers
ipcMain.handle('import-config', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select VPN Configuration',
    filters: [{ name: 'WireGuard Config', extensions: ['conf'] }],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const configPath = result.filePaths[0];
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    store.set('configPath', configPath);
    store.set('configName', path.basename(configPath));
    
    return { 
      success: true, 
      path: configPath,
      name: path.basename(configPath),
      content: configContent
    };
  }
  
  return { success: false };
});

ipcMain.handle('get-stored-config', () => {
  return {
    configPath: store.get('configPath'),
    configName: store.get('configName'),
    connected: store.get('connected', false),
    connectedAt: store.get('connectedAt')
  };
});

ipcMain.handle('toggle-connection', () => {
  if (isConnected) {
    disconnectVPN();
  } else {
    connectVPN();
  }
  return { connected: isConnected };
});

ipcMain.handle('get-connection-status', () => {
  return { 
    connected: isConnected,
    connectedAt: store.get('connectedAt')
  };
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Restore previous connection if auto-connect enabled
  if (store.get('autoConnect', false) && store.get('connected', false)) {
    setTimeout(connectVPN, 2000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (isConnected) {
    disconnectVPN();
  }
});

// Set app name
app.name = 'VPN Access Client';
