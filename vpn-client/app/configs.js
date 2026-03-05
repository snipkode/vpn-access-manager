import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { branding } from '../src/config/config';
import WireGuardService from '../src/services/wireguard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function ConfigsScreen({ navigation }) {
  const [tunnels, setTunnels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTunnels();
    
    // Refresh tunnels when coming back to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      loadTunnels();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadTunnels = async () => {
    try {
      const tunnelList = await WireGuardService.getTunnels();
      setTunnels(tunnelList || []);
    } catch (error) {
      console.error('Load tunnels error:', error);
    } finally {
      setLoading(false);
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

      if (!content.includes('[Interface]') || !content.includes('PrivateKey')) {
        Alert.alert('Error', 'Invalid WireGuard configuration file');
        return;
      }

      const name = file.name.replace('.conf', '');
      const importResult = await WireGuardService.importTunnel(content, name);
      
      if (importResult.success) {
        Alert.alert('Success', 'Configuration imported!');
        loadTunnels();
      } else {
        Alert.alert('Error', importResult.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import: ' + error.message);
    }
  };

  const deleteTunnel = (tunnelId, tunnelName) => {
    Alert.alert(
      'Delete Configuration',
      `Are you sure you want to delete "${tunnelName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await WireGuardService.deleteTunnel(tunnelId);
            if (result.success) {
              loadTunnels();
              Alert.alert('Success', 'Configuration deleted');
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const renderTunnel = ({ item }) => (
    <View style={styles.tunnelCard}>
      <View style={styles.tunnelHeader}>
        <View style={styles.tunnelIcon}>
          <Text style={styles.tunnelIconText}>📄</Text>
        </View>
        <View style={styles.tunnelInfo}>
          <Text style={styles.tunnelName}>{item.name}</Text>
          <Text style={styles.tunnelId}>ID: {item.id}</Text>
        </View>
      </View>
      
      <View style={styles.tunnelActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteTunnel(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading configurations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Import Button */}
        <View style={styles.importContainer}>
          <TouchableOpacity style={styles.importButton} onPress={importConfig}>
            <Text style={styles.importButtonText}>📁 Import New Configuration</Text>
          </TouchableOpacity>
        </View>

        {/* Tunnels List */}
        {tunnels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Configurations</Text>
            <Text style={styles.emptyText}>
              Import a WireGuard .conf file to get started
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {tunnels.map((tunnel) => (
              <View key={tunnel.id} style={styles.tunnelCard}>
                <View style={styles.tunnelHeader}>
                  <View style={styles.tunnelIcon}>
                    <Text style={styles.tunnelIconText}>📄</Text>
                  </View>
                  <View style={styles.tunnelInfo}>
                    <Text style={styles.tunnelName}>{tunnel.name}</Text>
                    <Text style={styles.tunnelId}>ID: {tunnel.id}</Text>
                  </View>
                </View>
                
                <View style={styles.tunnelActions}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteTunnel(tunnel.id, tunnel.name)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Info Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {tunnels.length} configuration{tunnels.length !== 1 ? 's' : ''} stored
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: branding.backgroundColor,
  },
  loadingText: {
    color: branding.textColorSecondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  importContainer: {
    marginBottom: 16,
  },
  importButton: {
    backgroundColor: branding.primaryColor,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: branding.textColor,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: branding.textColorSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  tunnelCard: {
    backgroundColor: branding.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  tunnelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tunnelIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: branding.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tunnelIconText: {
    fontSize: 24,
  },
  tunnelInfo: {
    flex: 1,
  },
  tunnelName: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
  tunnelId: {
    color: branding.textColorSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  tunnelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    backgroundColor: branding.backgroundColor,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: branding.errorColor,
  },
  deleteButtonText: {
    color: branding.errorColor,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: branding.cardBackground,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: branding.textColorSecondary,
    fontSize: 13,
  },
});
