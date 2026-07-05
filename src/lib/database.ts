import * as SQLite from 'expo-sqlite';
import { Animal, AnimalImage, RecordItem, SyncQueueEntry, User } from './types';

const db = SQLite.openDatabaseSync('dairy-farm.db');

export const initializeDatabase = async () => {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      profileImageLocalUri TEXT,
      profileImageUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS animals (
      id TEXT PRIMARY KEY,
      species TEXT NOT NULL CHECK (species IN ('cow', 'goat')),
      tagNumber TEXT,
      name TEXT,
      notes TEXT,
      purchasePrice REAL,
      purchaseDate TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold')),
      soldPrice REAL,
      soldDate TEXT,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      deletedAt TEXT,
      addedBy TEXT NOT NULL REFERENCES users(id),
      updatedBy TEXT NOT NULL REFERENCES users(id),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS animal_images (
      id TEXT PRIMARY KEY,
      animalId TEXT NOT NULL REFERENCES animals(id),
      position INTEGER NOT NULL CHECK (position IN (0, 1, 2)),
      localUri TEXT NOT NULL,
      remoteUrl TEXT,
      syncStatus TEXT NOT NULL DEFAULT 'pending' CHECK (syncStatus IN ('pending', 'synced')),
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      animalId TEXT NOT NULL REFERENCES animals(id),
      recordType TEXT NOT NULL CHECK (recordType IN ('vaccination', 'deworming', 'ai', 'pregnancy_check')),
      date TEXT NOT NULL,
      notes TEXT,
      linkedAiRecordId TEXT REFERENCES records(id),
      pregnancyResult TEXT CHECK (pregnancyResult IN ('confirmed', 'not_confirmed')),
      addedBy TEXT NOT NULL REFERENCES users(id),
      updatedBy TEXT NOT NULL REFERENCES users(id),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL CHECK (entityType IN ('user', 'animal', 'animal_image', 'record')),
      entityId TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  const existingUser = await db.getFirstAsync<User>('SELECT * FROM users LIMIT 1');
  if (!existingUser) {
    const now = new Date().toISOString();
    const userId = 'user-device';
    await db.runAsync(
      'INSERT INTO users (id, fullName, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [userId, 'Farm Admin', 'farm@example.com', now, now],
    );
  }
};

export const getDb = () => db;

export const createUser = async (user: User) => {
  await db.runAsync(
    'INSERT INTO users (id, fullName, email, profileImageLocalUri, profileImageUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user.id, user.fullName, user.email, user.profileImageLocalUri ?? null, user.profileImageUrl ?? null, user.createdAt, user.updatedAt],
  );
};

export const getUsers = async (): Promise<User[]> => db.getAllAsync<User>('SELECT * FROM users ORDER BY createdAt DESC');

export const getAnimals = async (): Promise<Animal[]> => db.getAllAsync<Animal>('SELECT * FROM animals ORDER BY createdAt DESC');

export const createAnimal = async (animal: Animal) => {
  await db.runAsync(
    'INSERT INTO animals (id, species, tagNumber, name, notes, purchasePrice, purchaseDate, status, soldPrice, soldDate, isDeleted, deletedAt, addedBy, updatedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [animal.id, animal.species, animal.tagNumber ?? null, animal.name ?? null, animal.notes ?? null, animal.purchasePrice ?? null, animal.purchaseDate ?? null, animal.status, animal.soldPrice ?? null, animal.soldDate ?? null, animal.isDeleted, animal.deletedAt ?? null, animal.addedBy, animal.updatedBy, animal.createdAt, animal.updatedAt],
  );
};

export const createAnimalImage = async (image: AnimalImage) => {
  await db.runAsync(
    'INSERT INTO animal_images (id, animalId, position, localUri, remoteUrl, syncStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [image.id, image.animalId, image.position, image.localUri, image.remoteUrl ?? null, image.syncStatus, image.createdAt],
  );
};

export const createRecord = async (record: RecordItem) => {
  await db.runAsync(
    'INSERT INTO records (id, animalId, recordType, date, notes, linkedAiRecordId, pregnancyResult, addedBy, updatedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [record.id, record.animalId, record.recordType, record.date, record.notes ?? null, record.linkedAiRecordId ?? null, record.pregnancyResult ?? null, record.addedBy, record.updatedBy, record.createdAt, record.updatedAt],
  );
};

export const enqueueSync = async (entry: SyncQueueEntry) => {
  await db.runAsync(
    'INSERT INTO sync_queue (id, entityType, entityId, operation, payload, attempts, lastError, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [entry.id, entry.entityType, entry.entityId, entry.operation, entry.payload, entry.attempts, entry.lastError ?? null, entry.createdAt],
  );
};

export const getSyncQueue = async (): Promise<SyncQueueEntry[]> => db.getAllAsync<SyncQueueEntry>('SELECT * FROM sync_queue ORDER BY createdAt ASC');

export const removeSyncQueueEntry = async (id: string) => {
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
};

export const getAnimalImages = async (animalId: string): Promise<AnimalImage[]> => db.getAllAsync<AnimalImage>('SELECT * FROM animal_images WHERE animalId = ? ORDER BY position ASC, createdAt ASC', [animalId]);

export const getRecords = async (animalId?: string): Promise<RecordItem[]> => {
  if (animalId) {
    return db.getAllAsync<RecordItem>('SELECT * FROM records WHERE animalId = ? ORDER BY date DESC, createdAt DESC', [animalId]);
  }
  return db.getAllAsync<RecordItem>('SELECT * FROM records ORDER BY date DESC, createdAt DESC');
};
