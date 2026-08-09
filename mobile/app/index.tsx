import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as SecureStore from '../src/lib/secure-storage';

import { SERVER_URL_KEY } from '@/src/lib/api';

export default function IndexScreen() {
  const [checking, setChecking] = useState(true);
  const [hasServer, setHasServer] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(SERVER_URL_KEY),
      SecureStore.getItemAsync('access_token'),
    ]).then(([serverUrl, token]) => {
      setHasServer(!!serverUrl);
      setHasToken(!!token);
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // No server configured - go to server config
  if (!hasServer) {
    return <Redirect href="/(auth)/server-config" />;
  }

  // Has server but no token - go to login
  if (!hasToken) {
    return <Redirect href="/(auth)/login" />;
  }

  // Has token - go to login (it will auto-redirect based on role)
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
