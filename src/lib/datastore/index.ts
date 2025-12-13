import { getAirtableStore } from './airtable';
import { getPostgresStore } from './postgres';
import type { DataStore } from './types';

let store: DataStore | null = null;

export const getDataStore = (): DataStore => {
  if (store) return store;

  const mode = (process.env.DATA_STORE ?? 'airtable').toLowerCase();
  if (mode === 'postgres' || mode === 'neon') {
    try {
      store = getPostgresStore();
    } catch (error) {
      console.error('[Datastore] Failed to init Postgres store', error);
      throw error;
    }
  } else {
    store = getAirtableStore();
  }

  return store;
};

export * from './types';
