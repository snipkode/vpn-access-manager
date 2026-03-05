import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { branding } from '../src/config/config';
import WireGuardService from '../src/services/wireguard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function ConnectionScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [configName, setConfigName] = useState(null);
  const [configContent, setConfigContent] = useState(null);
  const [tunnelId, setTunnelId] = useState(null);
  const [connectionDuration, setConnectionDuration] = useState(0);
  const [dataTransfer, setDataTransfer] = useState({ tx: 0, rx: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check existing connection
    checkConnectionStatus();
    
    // Load saved config
    loadSavedConfig();
    
    // Update timer when connected
    let interval;
    if (isConnected) {
      interval = setInterval(async () => {
        const status = await WireGuardService.getStatus();
        setConnectionDuration(status.duration);
        setDataTransfer(status.dataTransfer);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const checkConnectionStatus = async () => {
    const status = await WireGuardService.getStatus();
    setIsConnected(status.isConnected);
    setConnectionState(status.connectionState);
  };

  const loadSavedConfig = async () => {
    try {
      const tunnels = await WireGuardService.getTunnels();
      if (tunnels && tunnels.length > 0) {
        const lastTunnel = tunnels[tunnels.length - 1];
        setConfigName(lastTunnel.name);
        setTunnelId(lastTunnel.id);
      }
    } catch (error) {
      console.error('Load config error:', error);
    }
  };

  const importConfig = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Validate WireGuard config
      if (!content.includes('[Interface]') || !content.includes('PrivateKey')) {
        Alert.alert('Error', 'Invalid WireGuard configuration file');
        return;
      }

      const name = file.name.replace('.conf', '');
      
      // Import tunnel
      const importResult = await WireGuardService.importTunnel(content, name);
      
      if (importResult.success) {
        setConfigName(name);
        setConfigContent(content);
        setTunnelId(importResult.tunnelId);
        Alert.alert('Success', 'Configuration imported successfully!');
      } else {
        Alert.alert('Error', importResult.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import config: ' + error.message);
    }
  };

  const toggleConnection = async () => {
    if (!tunnelId) {
      Alert.alert('Error', 'Please import a configuration first');
      return;
    }

    setLoading(true);

    if (isConnected) {
      // Disconnect
      const result = await WireGuardService.disconnect();
      if (result.success) {
        setIsConnected(false);
        setConnectionState('disconnected');
        setConnectionDuration(0);
        setDataTransfer({ tx: 0, rx: 0 });
      } else {
        Alert.alert('Error', result.error);
      }
    } else {
      // Connect
      const result = await WireGuardService.connect(tunnelId);
      if (result.success) {
        setIsConnected(true);
        setConnectionState('connected');
      } else {
        setConnectionState('error');
        Alert.alert('Error', result.error);
      }
    }

    setLoading(false);
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return branding.statusConnected;
      case 'connecting':
        return branding.statusConnecting;
      case 'error':
        return branding.statusError;
      default:
        return branding.statusDisconnected;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getButtonGradient = () => {
    if (connectionState === 'connecting') {
      return [branding.warningColor, branding.warningColor];
    }
    if (isConnected) {
      return [branding.errorColor, branding.errorColor];
    }
    return [branding.primaryColor, branding.primaryDark];
  };

  return (
    <ScrollView style={styles.container}>
      {/* Connection Status Card */}
      <View style={styles.statusCard}>
        <LinearGradient
          colors={isConnected 
            ? [branding.statusConnected, '#059669'] 
            : [branding.secondaryColor, branding.backgroundColor]
          }
          style={styles.statusGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statusContent}>
            <Text style={styles.statusIcon}>
              {connectionState === 'connected' ? '🟢' : 
               connectionState === 'connecting' ? '🟡' : 
               connectionState === 'error' ? '🔴' : '⚪'}
            </Text>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            {isConnected && (
              <Text style={styles.durationText}>
                {WireGuardService.formatDuration(connectionDuration)}
              </Text>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Connection Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.connectButton,
            { backgroundColor: getStatusColor() },
            connectionState === 'connecting' && styles.connectButtonDisabled
          ]}
          onPress={toggleConnection}
          disabled={connectionState === 'connecting' || !tunnelId}
        >
          {connectionState === 'connecting' ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <LinearGradient
              colors={getButtonGradient()}
              style={styles.connectButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.connectButtonText}>
                {isConnected ? '⏹️ Disconnect' : '🔌 Connect'}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {!tunnelId && (
          <Text style={styles.noConfigText}>
            Please import a configuration to connect
          </Text>
        )}
      </View>

      {/* Data Transfer Stats */}
      {isConnected && (
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>📊 Data Transfer</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Upload ↑</Text>
              <Text style={styles.statValue}>
                {WireGuardService.formatBytes(dataTransfer.tx)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Download ↓</Text>
              <Text style={styles.statValue}>
                {WireGuardService.formatBytes(dataTransfer.rx)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Configuration Card */}
      <View style={styles.configCard}>
        <Text style={styles.cardTitle}>📁 Configuration</Text>
        
        {configName ? (
          <View style={styles.configInfo}>
            <View style={styles.configIcon}>
              <Text>📄</Text>
            </View>
            <View style={styles.configDetails}>
              <Text style={styles.configName}>{configName}</Text>
              <Text style={styles.configStatus}>
                {isConnected ? '🟢 Active' : '⚪ Inactive'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noConfig}>No configuration loaded</Text>
        )}

        <TouchableOpacity style={styles.importButton} onPress={importConfig}>
          <Text style={styles.importButtonText}>
            {configName ? '📁 Change Config' : '📁 Import Config'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Connection Info */}
      {isConnected && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>ℹ️ Connection Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Protocol</Text>
            <Text style={styles.infoValue}>WireGuard</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>
              {WireGuardService.formatDuration(connectionDuration)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{branding.footerText}</Text>
        <Text style={styles.footerTagline}>{branding.appTagline}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
  },
  statusCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 32,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  durationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  connectButton: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 70,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noConfigText: {
    color: branding.textColorSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: branding.cardBackground,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    color: branding.textColor,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: branding.textColorSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  statValue: {
    color: branding.textColor,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  configCard: {
    backgroundColor: branding.cardBackground,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 16,
  },
  configInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: branding.backgroundColor,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  configIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  configDetails: {
    flex: 1,
  },
  configName: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
  configStatus: {
    color: branding.textColorSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  noConfig: {
    color: branding.textColorSecondary,
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  importButton: {
    backgroundColor: branding.primaryColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: branding.cardBackground,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: branding.backgroundColor,
  },
  infoLabel: {
    color: branding.textColorSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: branding.textColor,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: branding.textColorSecondary,
    fontSize: 12,
  },
  footerTagline: {
    color: branding.primaryColor,
    fontSize: 12,
    marginTop: 4,
  },
});
