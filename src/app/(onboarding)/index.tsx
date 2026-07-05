import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../components/Theme';
import { createUser, enqueueSync, getUsers, initializeDatabase } from '../../lib/database';
import { createLocalId } from '../../lib/specRules';
import { User } from '../../lib/types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const handleContinue = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      Alert.alert('Missing details', 'Please enter your full name and email.');
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    await initializeDatabase();
    const users = await getUsers();
    const duplicate = users.some((user) => user.email.toLowerCase() === trimmedEmail);
    if (duplicate) {
      Alert.alert('Email already in use', 'That email is already set up on this device.');
      return;
    }

    const now = new Date().toISOString();
    const user: User = {
      id: createLocalId('user'),
      fullName: trimmedName,
      email: trimmedEmail,
      createdAt: now,
      updatedAt: now,
    };

    await createUser(user);
    await enqueueSync({
      id: `sync-${Date.now()}`,
      entityType: 'user',
      entityId: user.id,
      operation: 'create',
      payload: JSON.stringify(user),
      attempts: 0,
      createdAt: now,
    });

    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Dairy farm companion</Text>
          <Text style={styles.title}>Track animals, records, and pregnancies in one calm place.</Text>
          <Text style={styles.subtitle}>Set up your farm identity once and keep working offline when you are in the field.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} placeholder="Amina" value={fullName} onChangeText={setFullName} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="name@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Pressable style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  hero: { marginBottom: spacing.xl },
  eyebrow: { color: colors.accent, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary, lineHeight: 38 },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
