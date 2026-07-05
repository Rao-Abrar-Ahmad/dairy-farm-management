import { enqueueSync } from './database';
import { appwriteDatabases, appwriteStorage } from './appwrite';

export async function syncPendingChanges() {
  try {
    const now = new Date().toISOString();
    await enqueueSync({
      id: `sync-${Date.now()}`,
      entityType: 'record',
      entityId: 'bootstrap',
      operation: 'create',
      payload: JSON.stringify({ startedAt: now }),
      attempts: 0,
      createdAt: now,
    });

    await appwriteDatabases.listDocuments('dairy', 'sync_queue');
  } catch (error) {
    console.warn('Sync scaffold error', error);
  }
}
