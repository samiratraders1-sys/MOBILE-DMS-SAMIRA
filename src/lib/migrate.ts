import { collection, getDocs, updateDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from './firebase';

export async function migrateOldData() {
  const collections = [
    'products', 'customers', 'suppliers', 'sales', 'purchases', 
    'summaries', 'payments', 'transfers', 'staff', 'routes',
    'orders', 'damageInventory', 'accounts', 'subDbs', 'subDbShipments',
    'boms', 'productions', 'attendance', 'payroll', 'fixedAssets', 'loans', 'returns'
  ];

  const batch = writeBatch(db);
  let batchCount = 0;

  for (const collName of collections) {
    const q = query(collection(db, collName), where('companyId', '==', null)); // This won't work as expected if field is missing
    // Actually, I need to fetch all and check if companyId is missing.
    const querySnapshot = await getDocs(collection(db, collName));
    
    for (const docSnap of querySnapshot.docs) {
      if (!docSnap.data().companyId) {
        batch.update(doc(db, collName, docSnap.id), { companyId: 'default_company' });
        batchCount++;
      }
      
      if (batchCount > 450) { // Firestore limit is 500
        await batch.commit();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }
}
