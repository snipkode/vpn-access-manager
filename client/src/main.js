const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { execSync, spawn } = require('child_process');

const store = new Store();
let mainWindow = null;
let tray = null;
let wireguardProcess = null;

// Connection state
const state = {
  isConnected: false,
  currentConfig: null,
  connectedAt: null
};

// Platform-specific WireGuard paths
const WG_PATHS = {
  win32: 'C:\\Program Files\\WireGuard\\wireguard.exe',
  darwin: '/usr/local/bin/wg',
  linux: '/usr/bin/wg'
};

const getWgPath = () => WG_PATHS[process.platform] || 'wg';

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
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (state.isConnected) {
      e.preventDefault();
      disconnectVPN();
      setTimeout(() => mainWindow.hide(), 1000);
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  const status = state.isConnected ? 'Connected 🔵' : 'Disconnected ⚪';
  tray.setToolTip(`VPN Access Client - ${status}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: status, enabled: false },
    { type: 'separator' },
    {
      label: 'Open VPN Client',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: state.isConnected ? 'Disconnect' : 'Connect',
      click: () => toggleConnection()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (state.isConnected) disconnectVPN();
        app.quit();
      }
    }
  ]));
}

function manageConnection(action) {
  const configPath = store.get('configPath');
  const configName = path.basename(configPath || '', '.conf');

  if (!configPath || !fs.existsSync(configPath)) {
    throw new Error('No VPN configuration found');
  }

  const platform = process.platform;

  if (action === 'connect') {
    if (platform === 'win32') {
      execSync(`"${getWgPath()}" /installtunnelservice "${configPath}"`, { windowsHide: true });
    } else if (platform === 'darwin') {
      wireguardProcess = spawn('wg-quick', ['up', configName]);
    } else {
      execSync(`sudo wg-quick up ${configName}`);
    }

    state.isConnected = true;
    state.currentConfig = configPath;
    state.connectedAt = new Date().toISOString();
  } else {
    if (platform === 'win32' && configName) {
      execSync(`"${getWgPath()}" /removetunnelservice ${configName}`, { windowsHide: true });
    } else if (platform === 'darwin' && configName) {
      execSync(`wg-quick down ${configName}`);
    } else if (configName) {
      execSync(`sudo wg-quick down ${configName}`);
    }

    state.isConnected = false;
    state.currentConfig = null;
    state.connectedAt = null;
  }

  store.set('connected', state.isConnected);
  store.set('connectedAt', state.connectedAt);
}

function connectVPN() {
  try {
    manageConnection('connect');
    notifyConnection('success');
  } catch (error) {
    dialog.showErrorBox('Connection Error', `Failed to connect: ${error.message}`);
    state.isConnected = false;
  } finally {
    updateTrayMenu();
    mainWindow.webContents.send('connection-status', { connected: state.isConnected });
  }
}

function disconnectVPN() {
  try {
    manageConnection('disconnect');
  } catch (error) {
    console.error('Disconnect error:', error.message);
  } finally {
    updateTrayMenu();
    mainWindow.webContents.send('connection-status', { connected: state.isConnected });
  }
}

function toggleConnection() {
  state.isConnected ? disconnectVPN() : connectVPN();
  return { connected: state.isConnected };
}

function notifyConnection(type, message = '') {
  if (type === 'success') {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'VPN Connected',
      message: 'Successfully connected to VPN!',
      icon: 'info'
    });
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
    const configName = path.basename(configPath);
    const configContent = fs.readFileSync(configPath, 'utf8');

    store.set('configPath', configPath);
    store.set('configName', configName);

    return { success: true, path: configPath, name: configName, content: configContent };
  }

  return { success: false };
});

ipcMain.handle('remove-config', () => {
  if (state.isConnected) {
    return { success: false, error: 'Please disconnect first' };
  }
  store.delete('configPath');
  store.delete('configName');
  return { success: true };
});

ipcMain.handle('get-stored-config', () => ({
  configPath: store.get('configPath'),
  configName: store.get('configName'),
  connected: state.isConnected,
  connectedAt: state.connectedAt
}));

ipcMain.handle('toggle-connection', toggleConnection);

ipcMain.handle('get-connection-status', () => ({
  connected: state.isConnected,
  connectedAt: state.connectedAt
}));

ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('open-external', (url) => shell.openExternal(url));

// Auto-connect setting
ipcMain.handle('set-auto-connect', (value) => {
  store.set('autoConnect', value);
  return { success: true };
});

ipcMain.handle('get-auto-connect', () => store.get('autoConnect', false));

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  if (store.get('autoConnect', false) && store.get('configPath')) {
    setTimeout(connectVPN, 2000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (state.isConnected) disconnectVPN();
});

app.name = 'VPN Access Client';
