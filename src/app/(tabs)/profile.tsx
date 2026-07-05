import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUsers, initializeDatabase } from '../../lib/database';
import { User } from '../../lib/types';
import { colors, spacing } from '../../components/Theme';

export default function ProfileScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <Pressable style={styles.editButton} onPress={() => router.push('/(tabs)/profile-edit')}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} value={user?.fullName ?? ''} placeholder="Full name" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={user?.email ?? ''} editable={false} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary },
  editButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  editButtonText: { color: colors.surface, fontWeight: '700' },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md, color: colors.textPrimary },
});
