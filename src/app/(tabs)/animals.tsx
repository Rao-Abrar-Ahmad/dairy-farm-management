import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../components/Theme';
import { getAnimalImages, getAnimals, initializeDatabase } from '../../lib/database';
import { ActiveView, Animal, AnimalImage } from '../../lib/types';

const viewOptions: { key: ActiveView; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'sold', label: 'Sold' },
  { key: 'trash', label: 'Trash' },
];

export default function AnimalsScreen() {
  const router = useRouter();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalImages, setAnimalImages] = useState<Record<string, AnimalImage[]>>({});
  const [view, setView] = useState<ActiveView>('active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const data = await getAnimals();
      setAnimals(data);
      const imageMap: Record<string, AnimalImage[]> = {};
      for (const animal of data) {
        imageMap[animal.id] = await getAnimalImages(animal.id);
      }
      setAnimalImages(imageMap);
    };
    load();
  }, []);

  const filteredAnimals = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return animals.filter((animal) => {
      const matchesView =
        view === 'active' ? animal.status === 'active' && !animal.isDeleted :
        view === 'sold' ? animal.status === 'sold' && !animal.isDeleted :
        Boolean(animal.isDeleted);

      const haystack = [animal.name, animal.tagNumber, animal.species].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !lowered || haystack.includes(lowered);
      return matchesView && matchesSearch;
    });
  }, [animals, search, view]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Animals</Text>
            <Text style={styles.subtitle}>Track livestock and add records quickly.</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => router.push('/(tabs)/new-animal')}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, tag, or species"
        />

        <View style={styles.filterRow}>
          {viewOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.filterChip, view === option.key && styles.filterChipActive]}
              onPress={() => setView(option.key)}
            >
              <Text style={[styles.filterChipText, view === option.key && styles.filterChipTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {filteredAnimals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No animals in this view yet.</Text>
              <Text style={styles.emptyText}>Add an animal or switch filters to explore your herd.</Text>
            </View>
          ) : (
            filteredAnimals.map((animal) => {
              const featuredImage = animalImages[animal.id]?.[0]?.localUri;
              return (
                <Pressable key={animal.id} style={styles.card} onPress={() => router.push({ pathname: '/(tabs)/animal-detail', params: { id: animal.id } })}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.imageWrap}>
                      {featuredImage ? (
                        <Image source={{ uri: featuredImage }} style={styles.animalImage} />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Text style={styles.placeholderText}>{animal.species === 'cow' ? '🐄' : '🐐'}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{animal.name ?? 'Unnamed animal'}</Text>
                      <Text style={styles.cardMeta}>{animal.species} • {animal.tagNumber ?? 'No tag'}</Text>
                      <Text style={styles.cardNotes}>{animal.notes ?? 'No notes yet'}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{animal.status}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.secondaryButton} onPress={() => router.push({ pathname: '/(tabs)/new-record', params: { animalId: animal.id } })}>
                    <Text style={styles.secondaryButtonText}>Add entry</Text>
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  headerTextWrap: { flex: 1, marginRight: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  addButton: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  addButtonText: { color: colors.surface, fontWeight: '700' },
  searchInput: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.textPrimary, fontWeight: '700' },
  filterChipTextActive: { color: colors.surface },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  imageWrap: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.background },
  animalImage: { width: 64, height: 64 },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 28 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardMeta: { color: colors.textSecondary, marginTop: 4 },
  cardNotes: { color: colors.textPrimary, marginTop: 8 },
  statusBadge: { backgroundColor: colors.highlight, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { color: colors.surface, fontWeight: '700', textTransform: 'capitalize' },
  secondaryButton: { marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  secondaryButtonText: { color: colors.surface, fontWeight: '700' },
  emptyState: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.primary, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, marginTop: 4 },
});
