/**
 * seed.js — Initial Firestore data seed using the NEW hierarchical structure.
 *
 * New structure:
 *   /admins/{adminId}
 *     /products/{productId}
 *       /stages/{stageId}
 *     /roles/{roleId}
 *
 * OLD flat collections (admins, users, roles, stages, products at root) are no
 * longer seeded here and should be deleted from the Firebase console.
 */
import { db } from './config';
import {
  collection, doc, setDoc, getDocs, limit, query, serverTimestamp, writeBatch
} from 'firebase/firestore';

export const seedDatabase = async () => {
  try {
    // Check if admins collection has any documents — skip if already seeded
    const adminsSnapshot = await getDocs(query(collection(db, 'admins'), limit(1)));
    if (!adminsSnapshot.empty) {
      console.log('Database already initialized (admins collection exists). Skipping seed.');
      return;
    }

    console.log('Initializing Firestore with new hierarchical structure…');

    const batch = writeBatch(db);

    // ── 1. Create a sample Admin ─────────────────────────────────────────
    const adminId = 'admin_sample_001';
    const adminRef = doc(db, 'admins', adminId);
    batch.set(adminRef, {
      name: 'Sample Admin',
      email: 'admin@example.com',
      phone: '+91 98765 43210',
      role: 'admin',
      isActive: true,
      createdAt: serverTimestamp()
    });

    // ── 2. Create a sample Role under the admin ──────────────────────────
    const roleId = 'role_' + Date.now();
    const roleRef = doc(db, 'admins', adminId, 'roles', roleId);
    batch.set(roleRef, {
      roleName: 'Sales Manager',
      permissions: {
        product: { view: true, create: true, edit: true, delete: false },
        admin:   { view: true, create: false, edit: false, delete: false }
      },
      createdAt: serverTimestamp()
    });

    // ── 3. Create a sample Product under the admin ───────────────────────
    const productId = '1001';
    const productRef = doc(db, 'admins', adminId, 'products', productId);
    batch.set(productRef, {
      productName: 'Smart AC 1.5 Ton',
      category: 'AC',
      brand: 'VoltFlow',
      modelNumber: 'VF-1500',
      price: 54999,
      stock: 12,
      description: 'Energy-saving smart air conditioner with Wi-Fi control.',
      images: [
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80'
      ],
      status: 'In Stock',
      createdAt: serverTimestamp()
    });

    // ── 4. Create default Stages under that product ──────────────────────
    const defaultStages = [
      { stageName: 'Pre-Installation Survey',      stageOrder: 1 },
      { stageName: 'Technical Setup & Installation', stageOrder: 2 },
      { stageName: 'Quality Check & Testing',      stageOrder: 3 },
      { stageName: 'Handover & Customer Briefing', stageOrder: 4 },
    ];

    defaultStages.forEach(stage => {
      const stageId = 'stage_' + Date.now() + '_' + stage.stageOrder + '_' + Math.random().toString(36).substr(2, 5);
      const stageRef = doc(db, 'admins', adminId, 'products', productId, 'stages', stageId);
      batch.set(stageRef, {
        stageName: stage.stageName,
        stageOrder: stage.stageOrder,
        status: 'Active',
        questions: [],
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
    console.log('✅ Firestore initialized successfully with new structure!');
    console.log(`   /admins/${adminId}`);
    console.log(`   /admins/${adminId}/roles/${roleId}`);
    console.log(`   /admins/${adminId}/products/${productId}`);
    console.log(`   /admins/${adminId}/products/${productId}/stages  (${defaultStages.length} stages)`);

  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
