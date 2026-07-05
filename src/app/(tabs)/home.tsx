import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAnimals, getRecords, getUsers, initializeDatabase, getSyncQueue } from '../../lib/database';
import { colors, spacing } from '../../components/Theme';
import { Animal, RecordItem, User } from '../../lib/types';

export default function HomeScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const [animalsData, recordData, usersData, queue] = await Promise.all([getAnimals(), getRecords(), getUsers(), getSyncQueue()]);
      setAnimals(animalsData.filter((a) => !a.isDeleted));
      setRecords(recordData);
      setUser(usersData[0] ?? null);
      setPendingCount(queue.length);
    };
    load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.name}>{user?.fullName ?? 'Farm Manager'}</Text>
        <Text style={styles.subtle}>{user?.email ?? 'Offline-ready dairy tracking'}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Active cows</Text>
          <Text style={styles.cardValue}>{animals.filter((a) => a.status === 'active' && a.species === 'cow').length}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Active goats</Text>
          <Text style={styles.cardValue}>{animals.filter((a) => a.status === 'active' && a.species === 'goat').length}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cardWide}>
          <Text style={styles.cardLabel}>Confirmed pregnancies</Text>
          <Text style={styles.cardValue}>{records.filter((r) => r.recordType === 'pregnancy_check' && r.pregnancyResult === 'confirmed').length}</Text>
        </View>
      </View>

      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Text style={styles.syncBadge}>{pendingCount > 0 ? `${pendingCount} pending` : 'Synced'}</Text>
      </View>
      {records.slice(0, 6).map((record) => (
        <View key={record.id} style={styles.listItem}>
          <Text style={styles.listType}>{record.recordType}</Text>
          <Text style={styles.listText}>{record.notes ?? 'Logged record'}</Text>
          <Text style={styles.listMeta}>{record.date}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  headerCard: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  greeting: { color: colors.textSecondary, fontSize: 14 },
  name: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 4 },
  subtle: { color: colors.textSecondary, marginTop: 6 },
  row: { flexDirection: 'row', gap: spacing.md },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardWide: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardLabel: { color: colors.textSecondary, fontSize: 12 },
  cardValue: { fontSize: 28, fontWeight: '800', color: colors.accent, marginTop: 8 },
  sectionTitleWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  syncBadge: { color: colors.highlight, fontWeight: '600' },
  listItem: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  listType: { color: colors.primary, fontWeight: '700', textTransform: 'capitalize' },
  listText: { color: colors.textPrimary, marginTop: 4 },
  listMeta: { color: colors.textSecondary, marginTop: 4 },
});
