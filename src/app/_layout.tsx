import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../lib/store';
import { SplashIntro } from '../components/SplashIntro';
import { LockGate } from '../components/LockGate';

function RootStack() {
  const theme = useStore().theme;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <LockGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
            animation: 'slide_from_left',
          }}
        />
        <SplashIntro />
      </LockGate>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <RootStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
