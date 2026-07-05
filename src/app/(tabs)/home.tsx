import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAnimals, getRecords, getUsers, initializeDatabase, getSyncQueue } from '../../lib/database';
import { colors, spacing } from '../../components/Theme';
import { Animal, RecordItem, User } from '../../lib/types';
import { describeSyncState, getPregnancyPrediction } from '../../lib/specRules';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [syncMessage, setSyncMessage] = useState('All synced');

  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const [animalsData, recordData, usersData, queue] = await Promise.all([getAnimals(), getRecords(), getUsers(), getSyncQueue()]);
      setAnimals(animalsData.filter((a) => !a.isDeleted));
      setRecords(recordData);
      setUser(usersData[0] ?? null);
      setPendingCount(queue.length);
      setSyncMessage(describeSyncState(queue.length, false));
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]} edges={['top']}> 
      <View style={styles.shell}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}> 
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

          <View style={styles.cardWide}>
            <Text style={styles.cardLabel}>Upcoming deliveries</Text>
            {animals
              .map((animal) => ({ animal, prediction: getPregnancyPrediction(animal, records) }))
              .filter((item) => item.prediction)
              .sort((left, right) => left.prediction!.getTime() - right.prediction!.getTime())
              .slice(0, 3)
              .map(({ animal, prediction }) => (
                <View key={animal.id} style={styles.deliveryItem}>
                  <Text style={styles.deliveryName}>{animal.name ?? animal.tagNumber ?? 'Animal'}</Text>
                  <Text style={styles.deliveryDate}>{prediction?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </View>
              ))}
          </View>

          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.syncBadge}>{syncMessage}</Text>
          </View>
          {records.slice(0, 6).map((record) => (
            <View key={record.id} style={styles.listItem}>
              <Text style={styles.listType}>{record.recordType}</Text>
              <Text style={styles.listText}>{record.notes ?? 'Logged record'}</Text>
              <Text style={styles.listMeta}>{record.date}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.fabContainer}>
          {quickActionsOpen ? (
            <View style={styles.quickMenu}>
              <Pressable
                style={styles.quickActionButton}
                onPress={() => {
                  setQuickActionsOpen(false);
                  router.push('/(tabs)/new-animal');
                }}
              >
                <Text style={styles.quickActionText}>Add animal</Text>
              </Pressable>
              <Pressable
                style={styles.quickActionButton}
                onPress={() => {
                  setQuickActionsOpen(false);
                  router.push('/(tabs)/animals');
                }}
              >
                <Text style={styles.quickActionText}>Add record</Text>
              </Pressable>
              <Pressable
                style={styles.quickActionButton}
                onPress={() => {
                  setQuickActionsOpen(false);
                  router.push('/(tabs)/animals');
                }}
              >
                <Text style={styles.quickActionText}>View animals</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable style={styles.fab} onPress={() => setQuickActionsOpen((value) => !value)}>
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  headerCard: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  greeting: { color: colors.textSecondary, fontSize: 14 },
  name: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 4 },
  subtle: { color: colors.textSecondary, marginTop: 6 },
  row: { flexDirection: 'row', gap: spacing.md },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardWide: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  deliveryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  deliveryName: { color: colors.textPrimary, fontWeight: '700' },
  deliveryDate: { color: colors.highlight, fontWeight: '700' },
  cardLabel: { color: colors.textSecondary, fontSize: 12 },
  cardValue: { fontSize: 28, fontWeight: '800', color: colors.accent, marginTop: 8 },
  sectionTitleWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  syncBadge: { color: colors.highlight, fontWeight: '600' },
  listItem: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  listType: { color: colors.primary, fontWeight: '700', textTransform: 'capitalize' },
  listText: { color: colors.textPrimary, marginTop: 4 },
  listMeta: { color: colors.textSecondary, marginTop: 4 },
  fabContainer: { position: 'absolute', right: spacing.lg, bottom: spacing.lg + 8 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  fabText: { color: colors.surface, fontSize: 28, fontWeight: '700', lineHeight: 28 },
  quickMenu: { marginBottom: spacing.sm, gap: spacing.sm, alignItems: 'flex-end' },
  quickActionButton: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  quickActionText: { color: colors.primary, fontWeight: '700' },
});
