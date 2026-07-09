import { db, auth } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

const COLLECTIONS_TO_SNAPSHOT = [
    "products", "routes", "staff", "summaries", "customers", 
    "suppliers", "orders", "customerGroups", "sales", "users",
    "roles", "transfers", "payments", "categories", "damageInventory",
    "purchases", "accounts", "incomeCategories", "subDbs", 
    "subDbShipments", "subDbSettings", "stockAdjustments", "boms", 
    "productions", "attendance", "payroll", "fixedAssets", "loans",
    "returns"
];

export const snapshotAll = async () => {
    try {
        const isDemoMode = localStorage.getItem("demo_user_session") !== null;
        if (isDemoMode) {
            console.log("Snapshot skipped: Demo mode active.");
            return;
        }

        if (!auth.currentUser) {
            console.log("Snapshot skipped: No authenticated user.");
            return;
        }

        // Force-refresh or fetch the latest ID token to guarantee valid, non-expired credentials.
        try {
            await auth.currentUser.getIdToken(true);
        } catch (authErr) {
            console.warn("Snapshot skipped: Unable to refresh ID token for current user", authErr);
            return;
        }

        console.log("Snapshot: Running...");
        if (!db) {
            console.error("Firestore DB is not initialized yet");
            return;
        }
        
        // Log the Firestore object to check its type in browser console
        console.log("Firestore DB instance:", db);

        for (const name of COLLECTIONS_TO_SNAPSHOT) {
            try {
                // Ensure name is a string and valid collection name
                if (typeof name !== 'string') continue;
                
                const snap = await getDocs(collection(db, name));
                const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
                localStorage.setItem(`snapshot_${name}`, JSON.stringify(data));
            } catch (err) {
                console.error(`Error snapshotting ${name}:`, err);
            }
        }
        localStorage.setItem("snapshot_last_time", new Date().toISOString());
        console.log("Snapshot successful");
    } catch (e) {
        console.error("Snapshot failed unexpectedly:", e);
    }
};
