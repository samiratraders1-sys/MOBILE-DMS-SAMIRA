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
  where,
  setDoc
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import toast from "react-hot-toast";
import { useCompany } from "../context/CompanyContext";

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === "object") {
    if (obj.constructor && obj.constructor.name !== "Object" && obj.constructor.name !== "Array") {
      return obj;
    }
    const clean: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = cleanUndefined(val);
      }
    });
    return clean;
  }
  return obj;
}

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

function getInitialMockData(collectionName: string): any[] {
  const todayStr = new Date().toISOString().split('T')[0];
  switch (collectionName) {
    case "products":
      return [
        { id: "p1", name: "Coca-Cola 250ml", SKU: "CC250", price: 25, cost: 18, stock: 1500, category: "Soft Drinks", companyId: "samira-traders", createdAt: { seconds: 1719541200 } },
        { id: "p2", name: "Sprite 250ml", SKU: "SP250", price: 25, cost: 18, stock: 1200, category: "Soft Drinks", companyId: "samira-traders", createdAt: { seconds: 1719541300 } },
        { id: "p3", name: "7Up 500ml", SKU: "7U500", price: 45, cost: 34, stock: 800, category: "Soft Drinks", companyId: "samira-traders", createdAt: { seconds: 1719541400 } },
        { id: "p4", name: "Pran Potato Crackers", SKU: "PPC10", price: 10, cost: 8, stock: 2000, category: "Snacks", companyId: "samira-traders", createdAt: { seconds: 1719541500 } },
        { id: "p5", name: "Choco Fun Biscuit", SKU: "CFB20", price: 20, cost: 15, stock: 650, category: "Biscuits", companyId: "samira-traders", createdAt: { seconds: 1719541600 } }
      ];
    case "customers":
      return [
        { id: "c1", name: "Al-Madina Store", contactPerson: "Haji Abdul", phone: "01711223344", address: "Mirpur, Dhaka", routeId: "r1", creditLimit: 50000, balance: 12500, companyId: "samira-traders", createdAt: { seconds: 1719541200 } },
        { id: "c2", name: "Mayer Doa Grocery", contactPerson: "Rasel Ahmed", phone: "01822334455", address: "Uttara, Dhaka", routeId: "r2", creditLimit: 30000, balance: 4500, companyId: "samira-traders", createdAt: { seconds: 1719541300 } },
        { id: "c3", name: "Bismillah Departmental", contactPerson: "Kalam Mia", phone: "01933445566", address: "Banani, Dhaka", routeId: "r1", creditLimit: 100000, balance: 0, companyId: "samira-traders", createdAt: { seconds: 1719541400 } }
      ];
    case "routes":
      return [
        { id: "r1", name: "Mirpur - Section 10 Route", code: "MIR10", active: true, companyId: "samira-traders", createdAt: { seconds: 1719541200 } },
        { id: "r2", name: "Uttara - Sector 4 Route", code: "UTT04", active: true, companyId: "samira-traders", createdAt: { seconds: 1719541300 } }
      ];
    case "users":
      return [
        { id: "u1", name: "Samira Admin", email: "samiratraders1@gmail.com", role: "admin", phone: "01700000000", companyId: "samira-traders" },
        { id: "u2", name: "Abul Kalam (SR)", email: "sr1@samirabms.com", role: "sr", phone: "01711222333", companyId: "samira-traders" },
        { id: "u3", name: "Manager Alam", email: "manager@samirabms.com", role: "manager", phone: "01722333444", companyId: "samira-traders" }
      ];
    case "roles":
      return [
        { 
          id: "admin", 
          name: "admin", 
          displayName: "Super Admin", 
          permissions: ["pos_create", "view_reports", "manage_users"], 
          allowedViews: ["dashboard", "menu", "inventory", "entities", "customers", "suppliers", "sales", "purchases", "order-mgmt", "settlement", "reports", "finance", "dsr-portal", "admin-approvals", "sub-db", "payment-history", "daily-cashbook", "damage", "advanced-ops", "dms-enterprise", "enterprise-suites", "delivery-route", "super-admin", "roles", "users", "ledger", "unified-ledger", "activity-log", "pos", "sr-order", "sr-order-list"] 
        },
        { 
          id: "manager", 
          name: "manager", 
          displayName: "Manager", 
          permissions: ["pos_create", "view_reports"], 
          allowedViews: ["dashboard", "menu", "inventory", "customers", "suppliers", "sales", "purchases", "order-mgmt", "settlement", "reports", "finance", "payment-history", "daily-cashbook", "damage", "delivery-route", "ledger", "unified-ledger", "activity-log", "pos", "sr-order", "sr-order-list"] 
        },
        { 
          id: "sr", 
          name: "sr", 
          displayName: "Sales Representative", 
          permissions: ["pos_create"], 
          allowedViews: ["menu", "sr-order", "sr-order-list", "customers"] 
        }
      ];
    case "summaries":
      return [
        { 
          id: "s1", 
          srId: "sr1@samirabms.com", 
          srName: "Abul Kalam (SR)", 
          routeId: "r1", 
          date: todayStr, 
          status: "settled", 
          salesValue: 18500, 
          expenses: [{ id: "e1", purpose: "Ferry bill", amount: 150 }], 
          items: [
            { productId: "p1", totalPieces: 100, returns: 5, price: 25 }, 
            { productId: "p4", totalPieces: 200, returns: 10, price: 10 }
          ],
          companyId: "samira-traders",
          createdAt: { seconds: 1719541200 }
        }
      ];
    case "orders":
      return [
        { id: "o1", customerId: "c1", customerName: "Al-Madina Store", srId: "sr1@samirabms.com", status: "pending", totalAmount: 4250, items: [{ productId: "p1", qty: 50, price: 25 }], companyId: "samira-traders", createdAt: { seconds: 1719541200 } }
      ];
    case "sales":
      return [
        { id: "sal1", date: todayStr, customerId: "c1", totalAmount: 1250, items: [{ productId: "p2", qty: 50, price: 25 }], companyId: "samira-traders", createdAt: { seconds: 1719541200 } }
      ];
    case "payments":
      return [
        { id: "pay1", date: todayStr, customerId: "c1", customerName: "Al-Madina Store", amount: 5000, type: "Cash", memo: "Daily recovery", companyId: "samira-traders", createdAt: { seconds: 1719541200 } }
      ];
    case "activity_logs":
      return [
        { id: "act1", userEmail: "samiratraders1@gmail.com", actionType: "login", details: "সিস্টেমে লগইন করা হয়েছে (ডেমো মোড)", createdAt: { seconds: 1719541200 } }
      ];
    case "companies":
      return [
        { id: "samira-traders", name: "Samira Traders", logo: "", address: "Dhaka, Bangladesh", phone: "+8801700000000", email: "samiratraders1@gmail.com", status: "active", createdAt: todayStr }
      ];
    case "licenses":
      return [
        { id: "lic-samira", companyId: "samira-traders", plan: "Enterprise", status: "active", type: "Lifetime", expiryDate: "2036-12-31" }
      ];
    case "subscriptions":
      return [
        { id: "sub-samira", companyId: "samira-traders", status: "active" }
      ];
    default:
      return [];
  }
}

export function useCollection<T>(collectionName: string) {
  const { companyId: contextCompanyId, isReadOnly, loadingCompany } = useCompany();
  const companyId = contextCompanyId || localStorage.getItem("companyId");
  const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [authCounter, setAuthCounter] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthCounter(prev => prev + 1);
    };
    window.addEventListener("auth-state-change", handleAuthChange);
    return () => window.removeEventListener("auth-state-change", handleAuthChange);
  }, []);

  useEffect(() => {
    if (loadingCompany) {
        setLoading(true);
        return;
    }
    
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;

    if (!isDemoMode && !isSystemCollection && !companyId) {
      console.log("Collection fetch waiting for companyId:", {
        companyId,
        isSystemCollection,
        collectionName
      });
      // Do not block, just keep loading = true
      return;
    }

    if (isDemoMode) {
      setLoading(true);
      const getLocalData = (): T[] => {
        const stored = localStorage.getItem(`demo_coll_${collectionName}`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {
            console.error(e);
          }
        }
        const initial = getInitialMockData(collectionName);
        localStorage.setItem(`demo_coll_${collectionName}`, JSON.stringify(initial));
        return initial as any;
      };

      setData(getLocalData());
      setLoading(false);

      const handleLocalChange = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent?.detail && customEvent.detail.collectionName === collectionName) {
          setData(getLocalData());
        }
      };

      window.addEventListener("local-db-change", handleLocalChange);
      return () => {
        window.removeEventListener("local-db-change", handleLocalChange);
      };
    }

    let unsubscribeSnap: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeSnap) {
        unsubscribeSnap();
        unsubscribeSnap = null;
      }

      if (!user || !db) {
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
      
      unsubscribeSnap = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
    });

    return () => {
      if (unsubscribeSnap) {
        unsubscribeSnap();
      }
      unsubscribeAuth();
    };
  }, [collectionName, authCounter, companyId, loadingCompany]);


  const add = async (item: any) => {
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;
    if (isDemoMode) {
      try {
        const stored = localStorage.getItem(`demo_coll_${collectionName}`);
        const items = stored ? JSON.parse(stored) : [];
        const newId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newItem = cleanUndefined({
          id: newId,
          ...item,
          companyId: "samira-traders",
          createdBy: "demo-admin",
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        });
        items.unshift(newItem);
        localStorage.setItem(`demo_coll_${collectionName}`, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName } }));
        toast.success("সফলভাবে যোগ করা হয়েছে");
        return newId;
      } catch (e: any) {
        toast.error("যোগ করতে সমস্যা: " + e.message);
        return undefined;
      }
    }

    try {
      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (isReadOnly && !isSystemCollection) {
        toast.error("আপনার কোম্পানির লাইসেন্স মেয়াদোত্তীর্ণ বা স্থগিত করা হয়েছে। সিস্টেমটি এখন রিড-অনলি মোডে আছে।");
        return undefined;
      }
      if (!db) throw new Error("Firestore is not initialized");
      if (!auth.currentUser || (!companyId && !isSystemCollection)) throw new Error("Not logged in or no company selected");
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const cleanedItem = cleanUndefined(item);
      const docRef = await addDoc(collection(db, collectionName), {
        ...cleanedItem,
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
            companyId: companyId,
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
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;
    if (isDemoMode) {
      try {
        const stored = localStorage.getItem(`demo_coll_${collectionName}`);
        const items = stored ? JSON.parse(stored) : [];
        const index = items.findIndex((x: any) => x.id === id);
        if (index !== -1) {
          items[index] = cleanUndefined({
            ...items[index],
            ...item
          });
          localStorage.setItem(`demo_coll_${collectionName}`, JSON.stringify(items));
          window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName } }));
          toast.success("সফলভাবে আপডেট করা হয়েছে");
        }
        return;
      } catch (e: any) {
        toast.error("আপডেট করতে সমস্যা: " + e.message);
        return;
      }
    }

    try {
      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (isReadOnly && !isSystemCollection) {
        toast.error("আপনার কোম্পানির লাইসেন্স মেয়াদোত্তীর্ণ বা স্থগিত করা হয়েছে। সিস্টেমটি এখন রিড-অনলি মোডে আছে।");
        return;
      }
      if (!db) throw new Error("Firestore is not initialized");
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      
      // Keep track of old info before update
      let productItem: any = null;
      if (collectionName === "products") {
        productItem = data.find((x: any) => x.id === id);
      }

      const cleanedItem = cleanUndefined(item);
      await setDoc(doc(db, collectionName, id), {
        ...cleanedItem,
        pending_changes: isOffline,
      }, { merge: true });
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
            companyId: companyId,
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
    const isDemoMode = localStorage.getItem("demo_user_session") !== null;
    if (isDemoMode) {
      try {
        const stored = localStorage.getItem(`demo_coll_${collectionName}`);
        const items = stored ? JSON.parse(stored) : [];
        const filtered = items.filter((x: any) => x.id !== id);
        localStorage.setItem(`demo_coll_${collectionName}`, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName } }));
        toast.success("সফলভাবে ডিলিট করা হয়েছে");
        return;
      } catch (e: any) {
        toast.error("ডিলিট করতে সমস্যা: " + e.message);
        return;
      }
    }

    try {
      const isSystemCollection = ["companies", "licenses", "subscriptions"].includes(collectionName);
      if (isReadOnly && !isSystemCollection) {
        toast.error("আপনার কোম্পানির লাইসেন্স মেয়াদোত্তীর্ণ বা স্থগিত করা হয়েছে। সিস্টেমটি এখন রিড-অনলি মোডে আছে।");
        return;
      }
      if (!db) throw new Error("Firestore is not initialized");
      // Find item in state before deleting
      const itemToDelete: any = data.find((x: any) => x.id === id);
      const itemName = itemToDelete?.name || itemToDelete?.customerName || itemToDelete?.description || itemToDelete?.title || id;

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
            companyId: companyId,
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
