import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import toast from "react-hot-toast";
import { useCompany } from "../context/CompanyContext";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useCollection<T>(collectionName: string) {
  const { companyId, isReadOnly } = useCompany();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setData([]);
        setLoading(false);
        return;
      }

      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (!companyId && !isSystemCollection) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      // If system collection, query globally (without companyId filtering)
      const q = isSystemCollection 
        ? query(collection(db, collectionName))
        : query(collection(db, collectionName), where("companyId", "==", companyId));
      
      const unsubscribeSnap = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const items: any[] = [];
        
        // Track the last successful cloud sync time
        const isFromCloud = !snapshot.metadata.fromCache;
        if (isFromCloud) {
          try {
            const nowIso = new Date().toISOString();
            localStorage.setItem("last_firestore_sync", nowIso);
            window.dispatchEvent(new CustomEvent("firestore-sync", { detail: { time: nowIso, collection: collectionName } }));
          } catch (e) {
            // Safe fallback for private mode where localStorage is disabled
          }
        }

        snapshot.forEach((snapDoc) => {
          const docData = snapDoc.data();
          const hasPendingWrites = snapDoc.metadata.hasPendingWrites;

          // Self-healing: if it is marked pending offline but cloud sync is successful,
          // automatically clear the offline indicator tag.
          if (docData.pending_changes === true && !hasPendingWrites && typeof navigator !== "undefined" && navigator.onLine) {
            const docRef = doc(db, collectionName, snapDoc.id);
            updateDoc(docRef, { pending_changes: false }).catch((err) => {
              console.warn("Cleared pending_changes on-sync:", err);
            });
          }

          items.push({ 
            id: snapDoc.id, 
            ...docData, 
            pending_changes: docData.pending_changes === true || hasPendingWrites
          });
        });
        // Sort manually to avoid Firestore Index requirement for now
        const sortedItems = items.sort((a: any, b: any) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setData(sortedItems);
        setLoading(false);
      }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        if (error.code === 'permission-denied') {
          toast.error(`${collectionName} ব্যবহারের অনুমতি নেই`);
          try {
            handleFirestoreError(error, OperationType.GET, collectionName);
          } catch (e) {
            // Logged to console and thrown; but prevent snapshot handler from crashing entire React execution
          }
        } else {
          toast.error(`${collectionName} লোড করতে সমস্যা: ${error.message}`);
        }
        setLoading(false);
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, [collectionName]);

  const add = async (item: any) => {
    try {
      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (isReadOnly && !isSystemCollection) {
        toast.error("আপনার কোম্পানির লাইসেন্স মেয়াদোত্তীর্ণ বা স্থগিত করা হয়েছে। সিস্টেমটি এখন রিড-অনলি মোডে আছে।");
        return undefined;
      }
      if (!auth.currentUser || (!companyId && !isSystemCollection)) throw new Error("Not logged in or no company selected");
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const docRef = await addDoc(collection(db, collectionName), {
        ...item,
        ...(isSystemCollection ? {} : { companyId }),
        pending_changes: isOffline,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      if (isOffline) {
        toast.success("অফলাইনে সেভ করা হয়েছে (সিঙ্ক পেন্ডিং)");
      } else {
        toast.success("সফলভাবে যোগ করা হয়েছে");
      }

      // Automatically log sensitive action in Activity Log (e.g. inventory additions)
      if (collectionName !== "activity_logs" && collectionName === "products") {
        try {
          await addDoc(collection(db, "activity_logs"), {
            userEmail: auth.currentUser?.email || "unknown",
            userId: auth.currentUser?.uid || "unknown",
            actionType: "modify_inventory",
            collectionName,
            recordId: docRef.id,
            details: `নতুন পণ্য যোগ করা হয়েছে: '${item.name || "N/A"}' (প্রারম্ভিক স্টক: ${item.stock || 0}, মূল্য: ${item.price || 0} ৳)`,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log inventory addition:", logErr);
        }
      }
      return docRef.id;
    } catch (error: any) {
      console.error("Add error:", error);
      toast.error("যোগ করতে সমস্যা: " + error.message);
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        handleFirestoreError(error, OperationType.CREATE, collectionName);
      }
      return undefined;
    }
  };

  const update = async (id: string, item: any) => {
    try {
      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (isReadOnly && !isSystemCollection) {
        toast.error("আপনার কোম্পানির লাইসেন্স মেয়াদোত্তীর্ণ বা স্থগিত করা হয়েছে। সিস্টেমটি এখন রিড-অনলি মোডে আছে।");
        return;
      }
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      
      // Keep track of old info before update
      let productItem: any = null;
      if (collectionName === "products") {
        productItem = data.find((x: any) => x.id === id);
      }

      await updateDoc(doc(db, collectionName, id), {
        ...item,
        pending_changes: isOffline,
      });
      if (isOffline) {
        toast.success("অফলাইনে আপডেট সেভ করা হয়েছে (সিঙ্ক পেন্ডিং)");
      } else {
        toast.success("সফলভাবে আপডেট করা হয়েছে");
      }

      // Automatically log sensitive action in Activity Log (e.g. inventory modifications)
      if (collectionName === "products" && productItem) {
        try {
          const oldStock = productItem.stock || 0;
          const newStock = item.stock !== undefined ? item.stock : oldStock;
          const oldPrice = productItem.price || 0;
          const newPrice = item.price !== undefined ? item.price : oldPrice;

          let detailText = `পণ্যের তথ্য পরিবর্তন করা হয়েছে: '${productItem.name || "N/A"}'`;
          if (item.stock !== undefined && oldStock !== newStock) {
            detailText = `স্টক পরিবর্তন করা হয়েছে: '${productItem.name || "N/A"}' (পূর্বের স্টক: ${oldStock} -> বর্তমান স্টক: ${newStock})`;
          } else if (item.price !== undefined && oldPrice !== newPrice) {
            detailText = `মূল্য পরিবর্তন করা হয়েছে: '${productItem.name || "N/A"}' (পূর্বের মূল্য: ${oldPrice} ৳ -> নতুন মূল্য: ${newPrice} ৳)`;
          }

          await addDoc(collection(db, "activity_logs"), {
            userEmail: auth.currentUser?.email || "unknown",
            userId: auth.currentUser?.uid || "unknown",
            actionType: "modify_inventory",
            collectionName,
            recordId: id,
            details: detailText,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log inventory modification:", logErr);
        }
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error("আপডেট করতে সমস্যা: " + error.message);
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
      }
    }
  };

  const remove = async (id: string) => {
    console.log(`Attempting to remove doc from ${collectionName} with id: ${id}`);
    try {
      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (isReadOnly && !isSystemCollection) {
        toast.error("আপনার কোম্পানির লাইসেন্স মেয়াদোত্তীর্ণ বা স্থগিত করা হয়েছে। সিস্টেমটি এখন রিড-অনলি মোডে আছে।");
        return;
      }
      // Find item in state before deleting
      const itemToDelete: any = data.find((x: any) => x.id === id);
      const itemName = itemToDelete?.name || itemToDelete?.customerName || itemToDelete?.description || itemToDelete?.title || id;
      console.log(`Found item to delete: ${itemName}`);

      await deleteDoc(doc(db, collectionName, id));
      toast.success("সফলভাবে ডিলিট করা হয়েছে");

      // Log record deletion to Activity Log
      if (collectionName !== "activity_logs") {
        try {
          // Map system names to clear labels
          const collectionLabels: Record<string, string> = {
            products: "পণ্য (Product)",
            customers: "কাস্টমার (Customer)",
            suppliers: "সাপ্লায়ার (Supplier)",
            staff: "স্টাফ (Staff)",
            routes: "রোড/রুট (Route)",
            sales: "বিক্রয় (Sale)",
            purchases: "ক্রয় (Purchase)",
            payments: "লেনদেন/পেমেন্ট (Payment)",
            transfers: "তহবিল স্থানান্তর (Transfer)",
            orders: "অর্ডার (Order)",
            subDbs: "সাব-ডিবি পয়েন্ট (SubDB)",
          };
          const label = collectionLabels[collectionName] || collectionName;

          await addDoc(collection(db, "activity_logs"), {
            userEmail: auth.currentUser?.email || "unknown",
            userId: auth.currentUser?.uid || "unknown",
            actionType: "delete_record",
            collectionName,
            recordId: id,
            details: `রেকর্ড স্থায়ীভাবে ডিলিট করা হয়েছে: ${label} এর অধীনে '${itemName}'`,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log record deletion:", logErr);
        }
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("ডিলিট করতে সমস্যা: " + error.message);
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
      }
    }
  };

  return { data, loading, add, update, remove };
}
