import localforage from 'localforage';
import { Transaction } from '../types/transaction';

const STORE_KEY = 'finance-analyzer-data';

export interface StoredData {
  transactions: Transaction[];
  createdAt: number;
}

localforage.config({
  name: 'finance-statement-analyzer',
  storeName: 'data'
});

export async function saveTransactions(transactions: Transaction[]) {
  const data: StoredData = {
    transactions,
    createdAt: Date.now()
  };
  await localforage.setItem(STORE_KEY, data);
}

export async function loadTransactions(): Promise<StoredData | null> {
  return await localforage.getItem<StoredData>(STORE_KEY);
}

export async function clearTransactions() {
  await localforage.removeItem(STORE_KEY);
}
