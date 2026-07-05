import { Animal, RecordItem } from './types';

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}

export function createLocalId(prefix: string) {
  return `${prefix}-${createUuid()}`;
}

export function isTagNumberTaken(tagNumber: string, animals: Animal[]) {
  const normalized = tagNumber.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return animals.some((animal) => {
    const sameTag = animal.tagNumber?.trim().toLowerCase() === normalized;
    return sameTag && animal.isDeleted === 0 && animal.status === 'active';
  });
}

export function getProfit(animal: Animal) {
  if (animal.purchasePrice == null || animal.soldPrice == null) {
    return null;
  }
  return animal.soldPrice - animal.purchasePrice;
}

export function getPregnancyPrediction(animal: Animal, records: RecordItem[]) {
  const confirmedPregnancy = records.find((record) => record.recordType === 'pregnancy_check' && record.pregnancyResult === 'confirmed');
  if (!confirmedPregnancy?.linkedAiRecordId) {
    return null;
  }

  const linkedAi = records.find((record) => record.id === confirmedPregnancy.linkedAiRecordId);
  if (!linkedAi?.date) {
    return null;
  }

  const baseDate = new Date(linkedAi.date);
  const gestationDays = animal.species === 'cow' ? 283 : 150;
  baseDate.setDate(baseDate.getDate() + gestationDays);
  return baseDate;
}

export function describeSyncState(pendingCount: number, hasErrors: boolean) {
  if (hasErrors) {
    return 'Needs attention';
  }
  if (pendingCount > 0) {
    return 'Sync pending';
  }
  return 'All synced';
}
