import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../components/Theme';
import { getAnimalImages, getAnimals, getRecords, getUsers, initializeDatabase } from '../../lib/database';
import { Animal, AnimalImage, RecordItem, User } from '../../lib/types';

export default function AnimalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [images, setImages] = useState<AnimalImage[]>([]);

  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const [animals, animalRecords, allUsers] = await Promise.all([getAnimals(), getRecords(params.id), getUsers()]);
      const selected = animals.find((entry) => entry.id === params.id) ?? null;
      setAnimal(selected);
      setRecords(animalRecords);
      setUsers(allUsers);
      if (selected) {
        setImages(await getAnimalImages(selected.id));
      }
    };
    load();
  }, [params.id]);

  const userLookup = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user.fullName])), [users]);

  if (!animal) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => router.push({ pathname: '/(tabs)/new-record', params: { animalId: animal.id } })}>
            <Text style={styles.primaryButtonText}>Add entry</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>{animal.name ?? 'Unnamed animal'}</Text>
          <Text style={styles.meta}>{animal.species} • {animal.tagNumber ?? 'No tag'} • {animal.status}</Text>
          <Text style={styles.notes}>{animal.notes ?? 'No notes yet.'}</Text>
        </View>

        {images.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.imageRow}>
              {images.map((image) => (
                <Image key={image.id} source={{ uri: image.localUri }} style={styles.imageTile} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {records.map((record) => (
            <View key={record.id} style={styles.timelineItem}>
              <Text style={styles.recordType}>{record.recordType}</Text>
              <Text style={styles.recordDate}>{record.date}</Text>
              <Text style={styles.recordNotes}>{record.notes ?? 'No notes.'}</Text>
              <Text style={styles.recordMeta}>Logged by {userLookup[record.addedBy] ?? 'farm user'}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  backButton: { alignSelf: 'flex-start' },
  backButtonText: { color: colors.primary, fontWeight: '700' },
  primaryButton: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  primaryButtonText: { color: colors.surface, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary },
  meta: { color: colors.textSecondary, marginTop: 6 },
  notes: { color: colors.textPrimary, marginTop: 10, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  imageTile: { width: 96, height: 96, borderRadius: 12 },
  timelineItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  recordType: { color: colors.accent, fontWeight: '700', textTransform: 'capitalize' },
  recordDate: { color: colors.textSecondary, marginTop: 4 },
  recordNotes: { color: colors.textPrimary, marginTop: 4 },
  recordMeta: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
});
