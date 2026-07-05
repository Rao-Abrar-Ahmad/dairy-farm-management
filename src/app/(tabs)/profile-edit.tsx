import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../components/Theme';
import { getFirstUser, initializeDatabase, updateUser } from '../../lib/database';

export default function ProfileEditScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const current = await getFirstUser();
      if (current) {
        setFullName(current.fullName);
        setEmail(current.email);
      }
    };
    load();
  }, []);

  const saveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    await initializeDatabase();
    const current = await getFirstUser();
    if (!current) return;
    const updatedUser = { ...current, fullName: trimmedName, email: current.email, updatedAt: new Date().toISOString() };
    await updateUser(updatedUser);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} editable={false} placeholder="name@example.com" keyboardType="email-address" />
          <Pressable style={styles.button} onPress={saveProfile}>
            <Text style={styles.buttonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
