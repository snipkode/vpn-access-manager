import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { branding } from '../src/config/config';

export default function SettingsScreen() {
  const openWebsite = () => {
    Linking.openURL(branding.websiteUrl);
  };

  const openPrivacy = () => {
    Linking.openURL(branding.privacyUrl);
  };

  const contactSupport = () => {
    Linking.openURL(`mailto:${branding.supportEmail}`);
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Info Card */}
      <View style={styles.appInfoCard}>
        <Text style={styles.appIcon}>{branding.logoIcon}</Text>
        <Text style={styles.appName}>{branding.appName}</Text>
        <Text style={styles.appVersion}>{branding.appVersion}</Text>
        <Text style={styles.appTagline}>{branding.appTagline}</Text>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={openWebsite}>
          <Text style={styles.settingIcon}>🌐</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Website</Text>
            <Text style={styles.settingSubtitle}>Visit our website</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={openPrivacy}>
          <Text style={styles.settingIcon}>🔒</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Privacy Policy</Text>
            <Text style={styles.settingSubtitle}>Read our privacy policy</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={contactSupport}>
          <Text style={styles.settingIcon}>📧</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Support</Text>
            <Text style={styles.settingSubtitle}>{branding.supportEmail}</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Protocol</Text>
          <Text style={styles.infoValue}>WireGuard®</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{branding.appVersion}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>1.0.0 (2024)</Text>
        </View>
      </View>

      {/* Branding Customization Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customization</Text>
        
        <View style={styles.customizeCard}>
          <Text style={styles.customizeTitle}>🎨 Custom Branding</Text>
          <Text style={styles.customizeText}>
            This app supports full custom branding. Edit the config file to 
            change colors, logo, and app name.
          </Text>
          <View style={styles.colorPreview}>
            <View style={[styles.colorSwatch, { backgroundColor: branding.primaryColor }]} />
            <View style={[styles.colorSwatch, { backgroundColor: branding.secondaryColor }]} />
            <View style={[styles.colorSwatch, { backgroundColor: branding.accentColor }]} />
            <View style={[styles.colorSwatch, { backgroundColor: branding.backgroundColor }]} />
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{branding.footerText}</Text>
        <Text style={styles.footerCopyright}>© 2024 VPN Client Pro</Text>
        <Text style={styles.footerDisclaimer}>
          WireGuard® is a registered trademark of Jason A. Donenfeld.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
  },
  appInfoCard: {
    backgroundColor: branding.cardBackground,
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  appIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    color: branding.textColor,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    color: branding.textColorSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  appTagline: {
    color: branding.primaryColor,
    fontSize: 14,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    color: branding.textColorSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    backgroundColor: branding.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: branding.textColorSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  settingArrow: {
    color: branding.textColorSecondary,
    fontSize: 20,
  },
  infoItem: {
    backgroundColor: branding.cardBackground,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
  customizeCard: {
    backgroundColor: branding.cardBackground,
    padding: 16,
    borderRadius: 12,
  },
  customizeTitle: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  customizeText: {
    color: branding.textColorSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: branding.backgroundColor,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  footerText: {
    color: branding.textColorSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  footerCopyright: {
    color: branding.textColorSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  footerDisclaimer: {
    color: branding.textColorMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
