/**
 * cleanup.js — One-time migration script
 *
 * Deletes ALL documents from the old flat root collections:
 *   /products, /customers, /employees, /inventory, /users, /roles, /stages,
 *   /admins (legacy), /admin_profiles, /metadata
 *
 * Run from browser console or as a one-off import in your app.
 * After running, only the new structure remains:
 *   /admins/{adminId}/products/{productId}/stages/{stageId}
 *   /admins/{adminId}/roles/{roleId}
 *   /users/{superadminUid}   ← SuperAdmin's own auth record (kept)
 */
import { db } from './config';
import {
  collection, getDocs, deleteDoc, doc, writeBatch, query, limit
} from 'firebase/firestore';

// Old root-level collections to wipe completely
const OLD_COLLECTIONS = [
  'products',
  'customers',
  'employees',
  'inventory',
  'roles',
  'stages',
  'admin_profiles',
  'metadata',
  'admins_legacy', // in case there's a legacy admins collection
];

/**
 * Delete all documents in a collection in batches of 500
 */
async function deleteCollection(collectionName) {
  const colRef = collection(db, collectionName);
  let deletedTotal = 0;

  while (true) {
    const snap = await getDocs(query(colRef, limit(500)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deletedTotal += snap.docs.length;
    console.log(`  [${collectionName}] deleted ${deletedTotal} docs so far...`);
  }

  console.log(`✅ [${collectionName}] — total ${deletedTotal} documents deleted.`);
  return deletedTotal;
}

/**
 * Delete all documents in /users EXCEPT the SuperAdmin's own record.
 * SuperAdmin UID is detected by role === 'superadmin' in the doc.
 * All other /users docs (old admin records) are removed.
 */
async function cleanupUsersCollection() {
  const snap = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  let deleted = 0;
  let kept = 0;

  snap.docs.forEach(d => {
    const data = d.data();
    if (data.role === 'superadmin') {
      kept++;
      console.log(`  [users] KEEPING SuperAdmin doc: ${d.id} (${data.email})`);
    } else {
      batch.delete(d.ref);
      deleted++;
      console.log(`  [users] DELETING old admin doc: ${d.id} (${data.email || 'no email'})`);
    }
  });

  if (deleted > 0) await batch.commit();
  console.log(`✅ [users] — ${deleted} old docs deleted, ${kept} SuperAdmin doc(s) kept.`);
}

export async function runCleanup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧹 FIRESTORE CLEANUP — Removing old flat collections');
  console.log('═══════════════════════════════════════════════════════');

  let totalDeleted = 0;

  for (const col of OLD_COLLECTIONS) {
    try {
      const count = await deleteCollection(col);
      totalDeleted += count;
    } catch (err) {
      // Collection may not exist — that's fine
      if (!err.message?.includes('NOT_FOUND')) {
        console.warn(`  ⚠️  [${col}] Error:`, err.message);
      }
    }
  }

  // Special handling for /users — keep SuperAdmin, delete old admins
  await cleanupUsersCollection();

  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Cleanup complete. ${totalDeleted} old documents removed.`);
  console.log('  New structure intact: /admins/{id}/products/stages & /roles');
  console.log('═══════════════════════════════════════════════════════');
}
