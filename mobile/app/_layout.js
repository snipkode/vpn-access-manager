import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { branding } from './src/config/config';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: branding.backgroundColor,
          },
          headerTintColor: branding.textColor,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: branding.backgroundColor,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: branding.appName,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
          }}
        />
        <Stack.Screen
          name="config"
          options={{
            title: 'VPN Config',
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            title: 'Admin Panel',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
