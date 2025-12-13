import { getAirtableStore } from './airtable';
import { getPostgresStore } from './postgres';
import type { DataStore } from './types';

let store: DataStore | null = null;

export const getDataStore = (): DataStore => {
  if (store) return store;

  const mode = (process.env.DATA_STORE ?? 'airtable').toLowerCase();
  if (mode === 'postgres' || mode === 'neon') {
    store = getPostgresStore();
  } else {
    store = getAirtableStore();
  }

  return store;
};

export * from './types';
