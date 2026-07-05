import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { getUsers, initializeDatabase } from '../../lib/database';
import { User } from '../../lib/types';
import { colors, spacing } from '../../components/Theme';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const users = await getUsers();
      setUser(users[0] ?? null);
    };
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={user?.fullName ?? ''} placeholder="Full name" />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={user?.email ?? ''} editable={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md, color: colors.textPrimary },
});
