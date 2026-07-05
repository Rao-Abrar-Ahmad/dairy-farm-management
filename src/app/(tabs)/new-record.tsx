import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../components/Theme';
import { createRecord, getFirstUser, getRecords, initializeDatabase } from '../../lib/database';
import { RecordItem } from '../../lib/types';
import { createLocalId } from '../../lib/specRules';

export default function NewRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ animalId?: string }>();
  const [recordType, setRecordType] = useState<'vaccination' | 'deworming' | 'ai' | 'pregnancy_check'>('vaccination');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [linkedAiRecordId, setLinkedAiRecordId] = useState<string | null>(null);
  const [pregnancyResult, setPregnancyResult] = useState<'confirmed' | 'not_confirmed' | null>(null);
  const [aiRecords, setAiRecords] = useState<RecordItem[]>([]);
  const [aiHelpText, setAiHelpText] = useState<string | null>(null);

  useEffect(() => {
    const loadAiRecords = async () => {
      if (!params.animalId) {
        return;
      }
      await initializeDatabase();
      const records = await getRecords(params.animalId);
      const aiRecordsForAnimal = records.filter((record) => record.recordType === 'ai');
      setAiRecords(aiRecordsForAnimal);
      if (aiRecordsForAnimal.length > 0) {
        setLinkedAiRecordId(aiRecordsForAnimal[0].id);
        setAiHelpText(null);
      } else {
        setLinkedAiRecordId(null);
        setAiHelpText('No AI record found for this animal yet — add an AI record first.');
      }
    };
    loadAiRecords();
  }, [params.animalId]);

  const saveRecord = async () => {
    if (recordType === 'pregnancy_check') {
      if (!linkedAiRecordId || !pregnancyResult) {
        Alert.alert('Missing details', 'Please pick the linked AI record and pregnancy result.');
        return;
      }
    }

    await initializeDatabase();
    const now = new Date().toISOString();
    const user = await getFirstUser();
    const record: RecordItem = {
      id: createLocalId('record'),
      animalId: params.animalId ?? 'animal-1',
      recordType,
      date,
      notes: notes.trim() || null,
      linkedAiRecordId: recordType === 'pregnancy_check' ? linkedAiRecordId : null,
      pregnancyResult: recordType === 'pregnancy_check' ? pregnancyResult : null,
      addedBy: user?.id ?? 'user-device',
      updatedBy: user?.id ?? 'user-device',
      createdAt: now,
      updatedAt: now,
    };
    await createRecord(record);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add Record</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Record type</Text>
          <View style={styles.segmentRow}>
            {(['vaccination', 'deworming', 'ai', 'pregnancy_check'] as const).map((option) => (
              <Pressable key={option} style={[styles.segmentButton, recordType === option && styles.segmentButtonActive]} onPress={() => setRecordType(option)}>
                <Text style={[styles.segmentText, recordType === option && styles.segmentTextActive]}>{option.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Date</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          {recordType === 'pregnancy_check' ? (
            <>
              <Text style={styles.label}>Linked AI record</Text>
              {aiHelpText ? <Text style={styles.helperText}>{aiHelpText}</Text> : null}
              {aiRecords.length > 0 ? (
                <View style={styles.segmentRow}>
                  {aiRecords.map((option) => (
                    <Pressable key={option.id} style={[styles.segmentButton, linkedAiRecordId === option.id && styles.segmentButtonActive]} onPress={() => setLinkedAiRecordId(option.id)}>
                      <Text style={[styles.segmentText, linkedAiRecordId === option.id && styles.segmentTextActive]}>{option.date}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={styles.label}>Pregnancy result</Text>
              <View style={styles.segmentRow}>
                {(['confirmed', 'not_confirmed'] as const).map((option) => (
                  <Pressable key={option} style={[styles.segmentButton, pregnancyResult === option && styles.segmentButtonActive]} onPress={() => setPregnancyResult(option)}>
                    <Text style={[styles.segmentText, pregnancyResult === option && styles.segmentTextActive]}>{option.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
          <Pressable style={styles.button} onPress={saveRecord}>
            <Text style={styles.buttonText}>Save Record</Text>
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
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  segmentButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  segmentButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.textPrimary, fontWeight: '700', textTransform: 'capitalize' },
  segmentTextActive: { color: colors.surface },
  button: { backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
