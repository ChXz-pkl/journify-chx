// db.js
// Mengelola database IndexedDB dengan Dexie.js

// 👇👇👇 TAMBAHKAN BARIS IMPOR INI 👇👇👇
import { Dexie } from './dexie.mjs';

// 1. Inisialisasi database
const db = new Dexie('JournifyDatabase');

// 2. Definisikan skema database
db.version(2).stores({
  pendingOperations: '++id, timestamp',
  moods: '++id, timestamp, value',
  activities: '++id, timestamp, text'
});


// 3. Ekspor database agar bisa digunakan di file lain
export default db;