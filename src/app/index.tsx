import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../components/Theme';
import { getUsers, initializeDatabase } from '../lib/database';
import { syncPendingChanges } from '../lib/sync';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkIdentity = async () => {
      await initializeDatabase();
      await syncPendingChanges();
      const users = await getUsers();
      if (mounted) {
        setHasUser(users.length > 0);
        setTimeout(() => {
          if (mounted) {
            setReady(true);
          }
        }, 1200);
      }
    };

    checkIdentity();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>🐄</Text>
        </View>
        <Text style={styles.title}>Dairy Farm Management</Text>
        <Text style={styles.subtitle}>Offline-ready livestock tracking</Text>
      </View>
    );
  }

  return <Redirect href={hasUser ? '/(tabs)/home' : '/(onboarding)'} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  logoText: { fontSize: 42 },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitle: { marginTop: spacing.sm, color: colors.textSecondary, textAlign: 'center' },
});
