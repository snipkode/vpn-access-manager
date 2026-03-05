import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

const { WireGuard } = NativeModules;

class WireGuardService {
  constructor() {
    this.isConnected = false;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
    this.currentConfig = null;
    this.connectionStartTime = null;
    this.dataTransfer = { tx: 0, rx: 0 };
    
    // Setup event listeners
    if (WireGuard) {
      this.eventEmitter = new NativeEventEmitter(WireGuard);
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onConnectionStateChanged', (state) => {
      this.connectionState = state;
      this.isConnected = state === 'connected';
      if (this.isConnected) {
        this.connectionStartTime = Date.now();
      }
    });

    this.eventEmitter.addListener('onDataTransfer', (data) => {
      this.dataTransfer = data;
    });
  }

  async importTunnel(configString, name) {
    try {
      if (!WireGuard) {
        throw new Error('WireGuard module not available');
      }

      const tunnelId = await WireGuard.importTunnel(configString, name);
      return { success: true, tunnelId };
    } catch (error) {
      console.error('Import tunnel error:', error);
      return { success: false, error: error.message };
    }
  }

  async connect(tunnelId) {
    try {
      if (!WireGuard) {
        throw new Error('WireGuard module not available');
      }

      this.connectionState = 'connecting';
      await WireGuard.connect(tunnelId);
      return { success: true };
    } catch (error) {
      console.error('Connect error:', error);
      this.connectionState = 'error';
      return { success: false, error: error.message };
    }
  }

  async disconnect() {
    try {
      if (!WireGuard) {
        throw new Error('WireGuard module not available');
      }

      await WireGuard.disconnect();
      this.connectionState = 'disconnected';
      this.isConnected = false;
      this.connectionStartTime = null;
      return { success: true };
    } catch (error) {
      console.error('Disconnect error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTunnels() {
    try {
      if (!WireGuard) {
        return [];
      }

      const tunnels = await WireGuard.getTunnels();
      return tunnels;
    } catch (error) {
      console.error('Get tunnels error:', error);
      return [];
    }
  }

  async deleteTunnel(tunnelId) {
    try {
      if (!WireGuard) {
        throw new Error('WireGuard module not available');
      }

      await WireGuard.deleteTunnel(tunnelId);
      return { success: true };
    } catch (error) {
      console.error('Delete tunnel error:', error);
      return { success: false, error: error.message };
    }
  }

  async getStatus() {
    try {
      if (!WireGuard) {
        return {
          isConnected: false,
          connectionState: 'disconnected',
          dataTransfer: { tx: 0, rx: 0 },
          duration: 0,
        };
      }

      const status = await WireGuard.getStatus();
      return {
        isConnected: this.isConnected,
        connectionState: this.connectionState,
        dataTransfer: this.dataTransfer,
        duration: this.connectionStartTime 
          ? Math.floor((Date.now() - this.connectionStartTime) / 1000)
          : 0,
      };
    } catch (error) {
      console.error('Get status error:', error);
      return {
        isConnected: false,
        connectionState: 'error',
        dataTransfer: { tx: 0, rx: 0 },
        duration: 0,
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

export default new WireGuardService();
