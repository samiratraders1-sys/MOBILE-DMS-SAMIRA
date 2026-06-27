import { collection, getDocs, doc, writeBatch, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function migrateToSamiraTraders() {
  const collectionsToMigrate = [
    'products', 'routes', 'staff', 'summaries', 'customers', 'suppliers', 
    'orders', 'customerGroups', 'sales', 'users', 'roles', 'transfers', 
    'payments', 'categories', 'damageInventory', 'purchases', 'accounts', 
    'incomeCategories', 'subDbs', 'subDbShipments', 'subDbSettings', 
    'stockAdjustments', 'boms', 'productions', 'attendance', 'payroll', 
    'fixedAssets', 'loans', 'returns', 'activity_logs'
  ];

  console.log('Starting migration to "Samira Traders"...');
  
  const companyId = 'samira-traders';

  for (const collName of collectionsToMigrate) {
    try {
      const querySnapshot = await getDocs(collection(db, collName));
      let batch = writeBatch(db);
      let count = 0;

      for (const docSnap of querySnapshot.docs) {
        // Skip if already has companyId
        if (docSnap.data().companyId === companyId) continue;

        batch.update(docSnap.ref, { companyId: companyId });
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      console.log(`Migrated ${count} documents in collection: ${collName}`);
    } catch (error) {
      console.error(`Error migrating collection ${collName}:`, error);
    }
  }

  console.log('Ensure "Samira Traders" company document exists...');
  
  const companyDocRef = doc(db, 'companies', companyId);
  await setDoc(companyDocRef, {
    id: companyId,
    name: 'Samira Traders',
    logo: '',
    address: 'Dhaka, Bangladesh',
    phone: '+8801700000000',
    email: 'samiratraders1@gmail.com',
    status: 'active',
    createdAt: new Date().toISOString()
  }, { merge: true });

  console.log('Migration complete!');
}
