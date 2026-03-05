import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { auth } from '../src/config/firebase';
import { branding, API_URL } from '../src/config/config';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';

export default function ConfigScreen() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [config, setConfig] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [deviceName, setDeviceName] = useState('Mobile Device');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getConfig = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      setToken(idToken);

      const res = await fetch(`${API_URL}/vpn/devices`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.devices && data.devices.length > 0) {
          // Load first device config
          setConfig(data.devices[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const generateConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const idToken = await user.getIdToken();

      const res = await fetch(`${API_URL}/vpn/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ deviceName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to generate config');
      }

      setConfig(data);
      setQrCode(data.qr);
      Alert.alert('Success', 'VPN configuration generated!');
    } catch (error) {
      setError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadConfig = async () => {
    if (!config || !config.config) {
      Alert.alert('Error', 'No configuration to download');
      return;
    }

    try {
      const fileName = `${deviceName.replace(/\s+/g, '-').toLowerCase()}.conf`;
      const filePath = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(filePath, config.config, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(filePath);
    } catch (error) {
      Alert.alert('Error', 'Failed to download config: ' + error.message);
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

      // Basic validation for WireGuard config
      if (content.includes('[Interface]') && content.includes('PrivateKey')) {
        setConfig({ config: content });
        Alert.alert('Success', 'Configuration imported!');
      } else {
        Alert.alert('Error', 'Invalid WireGuard configuration file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import config: ' + error.message);
    }
  };

  const copyToClipboard = async () => {
    if (!config || !config.config) return;

    try {
      const *Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(config.config);
      Alert.alert('Success', 'Configuration copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Generate Config Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Generate Configuration</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="My Mobile Device"
            placeholderTextColor={branding.textColorSecondary}
          />
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateConfig}
          disabled={loading}
        >
          <Text style={styles.generateButtonText}>
            {loading ? 'Generating...' : '⚡ Generate Config'}
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Import Config Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Import Configuration</Text>
        <Text style={styles.description}>
          Import a .conf file from your device
        </Text>
        
        <TouchableOpacity style={styles.importButton} onPress={importConfig}>
          <Text style={styles.importButtonText}>📁 Import .conf File</Text>
        </TouchableOpacity>
      </View>

      {/* Config Display Section */}
      {config && config.config && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configuration</Text>

          {/* QR Code */}
          {qrCode && (
            <View style={styles.qrContainer}>
              <QRCode
                value={config.config}
                size={180}
                color="#000000"
                backgroundColor="#ffffff"
              />
              <Text style={styles.qrLabel}>Scan for desktop setup</Text>
            </View>
          )}

          {/* Config Preview */}
          <View style={styles.configPreview}>
            <Text style={styles.configText} numberOfLines={10}>
              {config.config}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={downloadConfig}>
              <Text style={styles.actionBtnText}>📥 Download</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={copyToClipboard}>
              <Text style={styles.actionBtnText}>📋 Copy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How to Use</Text>
        
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>1</Text>
          <Text style={styles.instructionText}>
            Generate or import your VPN configuration
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>2</Text>
          <Text style={styles.instructionText}>
            Download the .conf file or scan QR code
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>3</Text>
          <Text style={styles.instructionText}>
            Import to WireGuard app on your device
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>4</Text>
          <Text style={styles.instructionText}>
            Connect and browse securely
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
  },
  card: {
    backgroundColor: branding.secondaryColor,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: branding.textColorSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: branding.backgroundColor,
    borderWidth: 1,
    borderColor: branding.bgTertiary,
    borderRadius: 8,
    padding: 12,
    color: branding.textColor,
    fontSize: 16,
  },
  generateButton: {
    backgroundColor: branding.primaryColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  description: {
    color: branding.textColorSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  importButton: {
    backgroundColor: branding.backgroundColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: branding.primaryColor,
  },
  importButtonText: {
    color: branding.primaryColor,
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrLabel: {
    color: branding.textColorSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  configPreview: {
    backgroundColor: branding.backgroundColor,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxHeight: 200,
  },
  configText: {
    color: '#10b981',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: branding.textColor,
    fontSize: 14,
    fontWeight: '600',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    backgroundColor: branding.primaryColor,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    color: branding.textColorSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
