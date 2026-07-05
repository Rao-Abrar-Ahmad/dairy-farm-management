import { createUser, createAnimal, createAnimalImage, createRecord, enqueueSync } from './database';
import { Animal, AnimalImage, RecordItem, User } from './types';

export const seedDemoData = async () => {
  const now = new Date().toISOString();
  const user: User = {
    id: 'user-device',
    fullName: 'Amina',
    email: 'farm@example.com',
    createdAt: now,
    updatedAt: now,
  };

  await createUser(user);

  const animal: Animal = {
    id: 'animal-1',
    species: 'cow',
    tagNumber: 'C-101',
    name: 'Mochi',
    notes: 'Calm milker',
    purchasePrice: 1200,
    purchaseDate: '2024-01-10',
    status: 'active',
    isDeleted: 0,
    addedBy: user.id,
    updatedBy: user.id,
    createdAt: now,
    updatedAt: now,
  };

  await createAnimal(animal);

  const image: AnimalImage = {
    id: 'image-1',
    animalId: animal.id,
    position: 0,
    localUri: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
    syncStatus: 'synced',
    createdAt: now,
  };
  await createAnimalImage(image);

  const aiRecord: RecordItem = {
    id: 'record-ai-1',
    animalId: animal.id,
    recordType: 'ai',
    date: '2026-06-01',
    notes: 'First AI attempt',
    addedBy: user.id,
    updatedBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
  await createRecord(aiRecord);

  const pregnancyRecord: RecordItem = {
    id: 'record-preg-1',
    animalId: animal.id,
    recordType: 'pregnancy_check',
    date: '2026-06-24',
    notes: 'Confirmed pregnant',
    linkedAiRecordId: aiRecord.id,
    pregnancyResult: 'confirmed',
    addedBy: user.id,
    updatedBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
  await createRecord(pregnancyRecord);

  await enqueueSync({
    id: 'sync-1',
    entityType: 'record',
    entityId: pregnancyRecord.id,
    operation: 'create',
    payload: JSON.stringify(pregnancyRecord),
    attempts: 0,
    createdAt: now,
  });
};
