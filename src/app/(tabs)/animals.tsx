import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAnimals, initializeDatabase, createAnimal } from '../../lib/database';
import { Animal } from '../../lib/types';
import { colors, spacing } from '../../components/Theme';

export default function AnimalsScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);

  useEffect(() => {
    const load = async () => {
      await initializeDatabase();
      const data = await getAnimals();
      setAnimals(data.filter((animal) => !animal.isDeleted));
    };
    load();
  }, []);

  const addDemoAnimal = async () => {
    const animal: Animal = {
      id: `animal-${Date.now()}`,
      species: 'goat',
      tagNumber: `G-${Math.floor(Math.random() * 1000)}`,
      name: 'Biscuit',
      notes: 'Added from demo flow',
      status: 'active',
      isDeleted: 0,
      addedBy: 'user-device',
      updatedBy: 'user-device',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createAnimal(animal);
    setAnimals((current) => [animal, ...current]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Animals</Text>
        <Pressable style={styles.addButton} onPress={addDemoAnimal}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {animals.map((animal) => (
          <View key={animal.id} style={styles.card}>
            <Text style={styles.cardTitle}>{animal.name ?? 'Unnamed animal'}</Text>
            <Text style={styles.cardMeta}>{animal.species} • {animal.tagNumber ?? 'No tag'}</Text>
            <Text style={styles.cardNotes}>{animal.notes ?? 'No notes yet'}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary },
  addButton: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  addButtonText: { color: colors.surface, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardMeta: { color: colors.textSecondary, marginTop: 4 },
  cardNotes: { color: colors.textPrimary, marginTop: 8 },
});
