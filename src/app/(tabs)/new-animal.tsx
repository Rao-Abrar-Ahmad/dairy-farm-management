import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../components/Theme';
import { createAnimal, createAnimalImage, getAnimals, getFirstUser, initializeDatabase } from '../../lib/database';
import { Animal } from '../../lib/types';
import { createLocalId, isTagNumberTaken } from '../../lib/specRules';

export default function NewAnimalScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [species, setSpecies] = useState<'cow' | 'goat'>('cow');
  const [notes, setNotes] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    const validateTag = async () => {
      if (!tagNumber.trim()) {
        setTagError(null);
        return;
      }
      await initializeDatabase();
      const animals = await getAnimals();
      setTagError(isTagNumberTaken(tagNumber, animals) ? 'Tag already used by an active animal.' : null);
    };
    validateTag();
  }, [tagNumber]);

  const saveAnimal = async () => {
    if (tagError) {
      Alert.alert('Invalid tag', tagError);
      return;
    }

    await initializeDatabase();
    const now = new Date().toISOString();
    const user = await getFirstUser();
    const animal: Animal = {
      id: createLocalId('animal'),
      species,
      tagNumber: tagNumber.trim() || null,
      name: name.trim() || null,
      notes: notes.trim() || null,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      purchaseDate: purchaseDate || null,
      status: 'active',
      isDeleted: 0,
      addedBy: user?.id ?? 'user-device',
      updatedBy: user?.id ?? 'user-device',
      createdAt: now,
      updatedAt: now,
    };
    await createAnimal(animal);

    if (imageUri) {
      await createAnimalImage({
        id: createLocalId('animal-image'),
        animalId: animal.id,
        position: 0,
        localUri: imageUri,
        syncStatus: 'pending',
        createdAt: now,
      });
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add Animal</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Mochi" />
          <Text style={styles.label}>Tag number</Text>
          <TextInput style={styles.input} value={tagNumber} onChangeText={setTagNumber} placeholder="C-101" />
          {tagError ? <Text style={styles.helperText}>{tagError}</Text> : null}
          <Text style={styles.label}>Purchase price</Text>
          <TextInput style={styles.input} value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0.00" keyboardType="numeric" />
          <Text style={styles.label}>Purchase date</Text>
          <TextInput style={styles.input} value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" />
          <Text style={styles.label}>Species</Text>
          <View style={styles.segmentRow}>
            {(['cow', 'goat'] as const).map((option) => (
              <Pressable key={option} style={[styles.segmentButton, species === option && styles.segmentButtonActive]} onPress={() => setSpecies(option)}>
                <Text style={[styles.segmentText, species === option && styles.segmentTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Photo</Text>
          <Pressable style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>{imageUri ? 'Change photo' : 'Choose photo'}</Text>
          </Pressable>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.imagePreview} /> : null}
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
          <Pressable style={styles.button} onPress={saveAnimal}>
            <Text style={styles.buttonText}>Save Animal</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' },
  helperText: { color: colors.danger, marginBottom: spacing.sm, fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md, color: colors.textPrimary },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  segmentButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.textPrimary, fontWeight: '700', textTransform: 'capitalize' },
  segmentTextActive: { color: colors.surface },
  imageButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: spacing.sm, alignItems: 'center', marginBottom: spacing.md },
  imageButtonText: { color: colors.primary, fontWeight: '700' },
  imagePreview: { width: '100%', height: 180, borderRadius: 16, marginBottom: spacing.md },
  button: { backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
