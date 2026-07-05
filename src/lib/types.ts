export type User = {
  id: string;
  fullName: string;
  email: string;
  profileImageLocalUri?: string | null;
  profileImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Animal = {
  id: string;
  species: 'cow' | 'goat';
  tagNumber?: string | null;
  name?: string | null;
  notes?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  status: 'active' | 'sold';
  soldPrice?: number | null;
  soldDate?: string | null;
  isDeleted: number;
  deletedAt?: string | null;
  addedBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AnimalImage = {
  id: string;
  animalId: string;
  position: number;
  localUri: string;
  remoteUrl?: string | null;
  syncStatus: 'pending' | 'synced';
  createdAt: string;
};

export type RecordItem = {
  id: string;
  animalId: string;
  recordType: 'vaccination' | 'deworming' | 'ai' | 'pregnancy_check';
  date: string;
  notes?: string | null;
  linkedAiRecordId?: string | null;
  pregnancyResult?: 'confirmed' | 'not_confirmed' | null;
  addedBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SyncQueueEntry = {
  id: string;
  entityType: 'user' | 'animal' | 'animal_image' | 'record';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
};

export type ActiveView = 'active' | 'sold' | 'trash';
