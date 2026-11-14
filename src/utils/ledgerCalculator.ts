import { doc, setDoc, query, collection, where, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface TransactionDoc {
  id: string; // unique ID, e.g., sale.id or payment.id
  partyId: string; // customerId, supplierId, staffId
  partyType: "customer" | "supplier" | "staff";
  type: "sale" | "payment_in" | "payment_out" | "return" | "purchase" | "opening";
  amount: number;
  supplierId: string; // ID of supplier or "all"
  date: string;
  description: string;
  refId: string; // original doc ID
  method?: string; // payment method
  accountId?: string; // bank/cash account
  createdAt?: string;
  createdBy?: string;
}

/**
 * Pre-indexed transaction lookup structure to avoid O(N * M) full-array scans.
 */
export interface TransactionIndex {
  byPartyId: Map<string, TransactionDoc[]>;
  bySupplierId: Map<string, TransactionDoc[]>;
  allSorted: TransactionDoc[];
  rawArray: TransactionDoc[];
}

// Global WeakMap to memoize transaction indexes across react renders without memory leaks
const transactionIndexCache = new WeakMap<object, TransactionIndex>();

/**
 * Builds an index of transactions bucketed by partyId and supplierId in a single O(N) pass.
 * Each bucket is chronologically sorted once to guarantee O(1) retrieval for any party.
 */
export function buildTransactionIndex(transactions: TransactionDoc[]): TransactionIndex {
  const byPartyId = new Map<string, TransactionDoc[]>();
  const bySupplierId = new Map<string, TransactionDoc[]>();

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      byPartyId,
      bySupplierId,
      allSorted: [],
      rawArray: transactions || []
    };
  }

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (!t) continue;

    // FIX: fall back to entityId when partyId is missing (legacy entries)
    const pid = t.partyId || (t as any).entityId;
    if (pid) {
      let partyList = byPartyId.get(pid);
      if (!partyList) {
        partyList = [];
        byPartyId.set(pid, partyList);
      }
      partyList.push(t);
    }

    // Index by supplierId
    if (t.supplierId) {
      let suppList = bySupplierId.get(t.supplierId);
      if (!suppList) {
        suppList = [];
        bySupplierId.set(t.supplierId, suppList);
      }
      suppList.push(t);
    }
  }

  // Pre-sort each party bucket once chronologically (oldest first)
  byPartyId.forEach((list) => {
    list.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  });

  return {
    byPartyId,
    bySupplierId,
    allSorted: transactions,
    rawArray: transactions
  };
}

/**
 * Retrieves an existing index from the WeakMap cache or constructs a new one.
 */
export function getOrBuildTransactionIndex(
  transactionsOrIndex: TransactionDoc[] | TransactionIndex
): TransactionIndex {
  if (!transactionsOrIndex) {
    return buildTransactionIndex([]);
  }

  // Already an index object
  if (
    typeof transactionsOrIndex === "object" &&
    "byPartyId" in transactionsOrIndex &&
    (transactionsOrIndex as any).byPartyId instanceof Map
  ) {
    return transactionsOrIndex as TransactionIndex;
  }

  const arr = transactionsOrIndex as TransactionDoc[];
  if (typeof arr === "object" && arr !== null) {
    const cached = transactionIndexCache.get(arr);
    if (cached) {
      return cached;
    }
    const built = buildTransactionIndex(arr);
    transactionIndexCache.set(arr, built);
    return built;
  }

  return buildTransactionIndex(arr);
}

/**
 * Dynamic Ledger Calculation Engine using Indexed Lookups.
 * Reduces complexity from O(N * M) to O(1) party retrieval and O(K) party-specific computation.
 */
export function calculateLedger(
  partyId: string,
  partyType: "customer" | "supplier" | "staff",
  transactionsOrIndex: TransactionDoc[] | TransactionIndex,
  suppliers: any[],
  products: any[],
  initialOpeningBalance: number = 0
) {
  // 1. Instant O(1) retrieval of party-specific transactions using index
  const index = getOrBuildTransactionIndex(transactionsOrIndex);
  const sortedTx = index.byPartyId.get(partyId) || [];

  // 2. Calculate overall balance and per-transaction logs
  let runningBal = initialOpeningBalance;
  // FIX: normalize both type formats (legacy lowercase + new uppercase from settlementEngine)
  const normType = (t: any): string => {
    const raw = String(t.type || "");
    const upper = raw.toUpperCase();
    if (["SALE", "DUE", "SHORT", "DEBIT"].includes(upper)) return "sale";
    if (["PAYMENT_IN", "COLLECTION"].includes(upper)) return "payment_in";
    if (["PAYMENT_OUT", "PAYMENT"].includes(upper)) return "payment_out";
    if (upper === "RETURN") return "return";
    if (upper === "PURCHASE") return "purchase";
    if (upper === "OPENING") return "opening";
    return raw.toLowerCase();
  };
  const pt = String(partyType).toLowerCase();

  const logs = sortedTx.map(t => {
    const tt = normType(t);
    let effect = 0;
    if (pt === "customer") {
      if (tt === "sale" || tt === "payment_out" || (tt === "opening" && t.amount > 0)) {
        effect = t.amount;
      } else if (tt === "payment_in" || tt === "return" || (tt === "opening" && t.amount < 0)) {
        effect = -t.amount;
      }
    } else if (pt === "supplier") {
      if (tt === "purchase" || tt === "payment_in" || (tt === "opening" && t.amount > 0)) {
        effect = t.amount;
      } else if (tt === "payment_out" || tt === "return" || (tt === "opening" && t.amount < 0)) {
        effect = -t.amount;
      }
    } else if (pt === "staff") {
      if (tt === "sale" || tt === "payment_in") {
        effect = t.amount;
      } else if (tt === "payment_out" || tt === "purchase") {
        effect = -t.amount;
      }
    }
    runningBal += effect;
    return {
      ...t,
      runningBalance: runningBal,
      effect
    };
  });

  // 3. Supplier-wise breakdown for Customers
  const supplierBreakdown: Record<string, { sales: number; payments: number; returns: number; due: number }> = {};
  
  if (Array.isArray(suppliers)) {
    suppliers.forEach(s => {
      supplierBreakdown[s.id] = { sales: 0, payments: 0, returns: 0, due: 0 };
    });
  }
  supplierBreakdown["all"] = { sales: 0, payments: 0, returns: 0, due: 0 };

  if (partyType === "customer" && initialOpeningBalance !== 0) {
    supplierBreakdown["all"].due += initialOpeningBalance;
  }

  // Fast aggregation over only this customer's pre-filtered transactions
  if (pt === "customer") {
    sortedTx.forEach(t => {
      const sId = t.supplierId || "all";
      if (!supplierBreakdown[sId]) {
        supplierBreakdown[sId] = { sales: 0, payments: 0, returns: 0, due: 0 };
      }

      const tt = normType(t);
      if (tt === "sale") {
        supplierBreakdown[sId].sales += t.amount;
        supplierBreakdown[sId].due += t.amount;
      } else if (tt === "payment_in") {
        supplierBreakdown[sId].payments += t.amount;
        supplierBreakdown[sId].due -= t.amount;
      } else if (tt === "return") {
        supplierBreakdown[sId].returns += t.amount;
        supplierBreakdown[sId].due -= t.amount;
      } else if (tt === "payment_out") {
        supplierBreakdown[sId].payments -= t.amount;
        supplierBreakdown[sId].due += t.amount;
      } else if (tt === "opening") {
        supplierBreakdown[sId].due += t.amount;
      }
    });
  }

  // Pre-index suppliers for O(1) name lookup
  const supplierMap = new Map((suppliers || []).map(s => [s.id, s]));

  const breakdownList = Object.entries(supplierBreakdown)
    .map(([id, data]) => {
      const supp = supplierMap.get(id);
      return {
        supplierId: id,
        supplierName: supp ? (supp.company || supp.name) : (id === "all" ? "সাধারণ / সমস্ত সাপ্লায়ার" : "অজানা সাপ্লায়ার"),
        ...data
      };
    })
    .filter(item => item.due !== 0 || item.sales !== 0 || item.payments !== 0 || item.returns !== 0);

  return {
    totalDue: runningBal,
    supplierBreakdown: breakdownList,
    logs: [...logs].reverse() // newest first for display
  };
}

/**
 * On-demand Firestore index-based query to retrieve transactions for a specific party
 * without downloading or evaluating the entire global transactions collection.
 */
export async function queryPartyTransactionsFromDb(
  partyId: string,
  limitCount: number = 200
): Promise<TransactionDoc[]> {
  if (!db || !partyId) return [];
  try {
    const q = query(
      collection(db, "transactions"),
      where("partyId", "==", partyId),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransactionDoc));
  } catch (error) {
    console.error(`[queryPartyTransactionsFromDb] Error querying transactions for ${partyId}:`, error);
    return [];
  }
}

/**
 * On-demand Firestore index-based query to retrieve transactions for a specific supplier.
 */
export async function querySupplierTransactionsFromDb(
  supplierId: string,
  limitCount: number = 200
): Promise<TransactionDoc[]> {
  if (!db || !supplierId) return [];
  try {
    const q = query(
      collection(db, "transactions"),
      where("supplierId", "==", supplierId),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransactionDoc));
  } catch (error) {
    console.error(`[querySupplierTransactionsFromDb] Error querying transactions for supplier ${supplierId}:`, error);
    return [];
  }
}

function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  const clean: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  });
  return clean;
}

/**
 * Self-healing automatic generator to populate transactions from existing collections.
 * Uses Set and Map indexing to avoid nested quadratic loops on startup.
 */
export async function syncExistingToTransactions(
  sales: any[],
  payments: any[],
  returns: any[],
  purchases: any[],
  customers: any[],
  suppliers: any[],
  products: any[],
  existingTx: any[],
  isDemoMode: boolean
) {
  const newTxList: TransactionDoc[] = [];

  // Pre-index products for instant O(1) lookup
  const productMap = new Map((products || []).map(p => [p.id, p]));
  const customerIdSet = new Set((customers || []).map(c => c.id));
  const supplierIdSet = new Set((suppliers || []).map(s => s.id));

  // 1. Process Sales (Customer purchases)
  (sales || []).forEach(sale => {
    if (!sale || !sale.id || !sale.customerId) return;
    const supplierTotals: Record<string, number> = {};
    (sale.items || []).forEach((item: any) => {
      const p = productMap.get(item.productId || item.id);
      const sId = p?.supplierId || "all";
      const val = Number(item.total || (Number(item.qty || item.quantity || 0) * Number(item.price || 0)) || 0);
      supplierTotals[sId] = (supplierTotals[sId] || 0) + val;
    });

    const saleTotal = Number(sale.total || sale.totalAmount || 0);
    const calculatedTotal = Object.values(supplierTotals).reduce((a, b) => a + b, 0);

    if (calculatedTotal > 0 && Object.keys(supplierTotals).length > 0) {
      Object.entries(supplierTotals).forEach(([sId, val]) => {
        const share = val / calculatedTotal;
        const txAmount = saleTotal * share;
        const txId = `${sale.id}_${sId}`;

        newTxList.push({
          id: txId,
          partyId: sale.customerId,
          partyType: "customer",
          type: "sale",
          amount: txAmount,
          supplierId: sId,
          date: sale.date ? sale.date.split("T")[0] : new Date().toISOString().split("T")[0],
          description: `পণ্য বিক্রয় (POS/রুট বিল #${sale.id.slice(-4).toUpperCase()})`,
          refId: sale.id,
          createdAt: sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
        });
      });
    } else {
      newTxList.push({
        id: sale.id,
        partyId: sale.customerId,
        partyType: "customer",
        type: "sale",
        amount: saleTotal,
        supplierId: "all",
        date: sale.date ? sale.date.split("T")[0] : new Date().toISOString().split("T")[0],
        description: `পণ্য বিক্রয় (POS/রুট)`,
        refId: sale.id,
        createdAt: sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
      });
    }
  });

  // 2. Process Payments (Customer receipts / Supplier payments)
  (payments || []).forEach(pay => {
    if (!pay || !pay.id || !pay.entityId) return;
    const isCust = customerIdSet.has(pay.entityId);
    const isSupp = supplierIdSet.has(pay.entityId);
    
    let partyType: "customer" | "supplier" | "staff" = "customer";
    if (isSupp) partyType = "supplier";
    else if (isCust) partyType = "customer";
    else partyType = "staff";

    newTxList.push({
      id: pay.id,
      partyId: pay.entityId,
      partyType,
      type: pay.type === "in" ? "payment_in" : "payment_out",
      amount: Number(pay.amount || 0),
      supplierId: pay.supplierId || "all",
      date: pay.date || new Date().toISOString().split("T")[0],
      description: pay.description || (pay.type === "in" ? "টাকা গ্রহণ" : "টাকা পরিশোধ"),
      refId: pay.id,
      method: pay.method,
      accountId: pay.accountId,
      createdAt: pay.createdAt || new Date().toISOString()
    });
  });

  // 3. Process Returns
  (returns || []).forEach(ret => {
    if (!ret || !ret.id || !ret.customerId) return;
    const p = productMap.get(ret.productId);
    const sId = p?.supplierId || "all";

    newTxList.push({
      id: ret.id,
      partyId: ret.customerId,
      partyType: "customer",
      type: "return",
      amount: Number(ret.amount || 0),
      supplierId: sId,
      date: ret.date || new Date().toISOString().split("T")[0],
      description: `পণ্য ফেরত সমন্বয় (পণ্য: ${p?.name || "N/A"})`,
      refId: ret.id,
      createdAt: ret.createdAt || new Date().toISOString()
    });
  });

  // 4. Process Purchases (Supplier bills)
  (purchases || []).forEach(pur => {
    if (!pur || !pur.id || !pur.supplierId) return;
    newTxList.push({
      id: pur.id,
      partyId: pur.supplierId,
      partyType: "supplier",
      type: "purchase",
      amount: Number(pur.total || pur.totalAmount || 0),
      supplierId: pur.supplierId,
      date: pur.date || new Date().toISOString().split("T")[0],
      description: `পণ্য ক্রয় ইনভয়েস (ইনভয়েস #${pur.invoiceId || pur.id.slice(-4).toUpperCase()})`,
      refId: pur.id,
      createdAt: pur.createdAt || new Date().toISOString()
    });
  });

  const validTxList = newTxList.filter(t => t && t.id && t.partyId);
  const existingIds = new Set((existingTx || []).map(t => t.id));
  const missingTx = validTxList.filter(t => !existingIds.has(t.id));

  if (missingTx.length > 0) {
    console.log(`[Ledger Sync] Found ${missingTx.length} missing transactions to sync...`);
    if (isDemoMode) {
      const stored = localStorage.getItem("demo_coll_transactions");
      const current = stored ? JSON.parse(stored) : [];
      const cleanedMissing = missingTx.map(t => cleanUndefined(t));
      const updated = [...cleanedMissing, ...current];
      localStorage.setItem("demo_coll_transactions", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("local-db-change", { detail: { collectionName: "transactions" } }));
    } else if (db) {
      for (const tx of missingTx) {
        try {
          const cleanedTx = cleanUndefined({
            ...tx,
            companyId: "samira-traders",
            createdAt: new Date().toISOString()
          });
          await setDoc(doc(db, "transactions", tx.id), cleanedTx);
        } catch (e) {
          console.error("Error syncing transaction:", e);
        }
      }
    }
  }
}

export interface DriftReport {
  id: string;
  name: string;
  type: "customer" | "supplier" | "staff";
  calculatedBalance: number;
  savedBalance: number;
  drift: number;
}

/**
 * Background worker to check transaction drift.
 * Uses index-based retrieval to compute drifts in a single pass without freezing the UI.
 */
export function checkTransactionDrift(
  customers: any[],
  suppliers: any[],
  staff: any[],
  transactions: any[],
  products: any[]
): {
  drifts: DriftReport[];
  totalDriftAmount: number;
  hasDrift: boolean;
} {
  const drifts: DriftReport[] = [];
  let totalDriftAmount = 0;

  // Build index once for all checks
  const index = getOrBuildTransactionIndex(transactions);

  // 1. Check Customers
  (customers || []).forEach(c => {
    const { totalDue } = calculateLedger(c.id, "customer", index, suppliers, products, 0);
    const saved = Number(c.balance !== undefined ? c.balance : (c.due !== undefined ? c.due : 0));
    const diff = totalDue - saved;
    if (Math.abs(diff) > 0.05) {
      drifts.push({
        id: c.id,
        name: c.name || "Unknown Customer",
        type: "customer",
        calculatedBalance: totalDue,
        savedBalance: saved,
        drift: diff
      });
      totalDriftAmount += Math.abs(diff);
    }
  });

  // 2. Check Suppliers
  (suppliers || []).forEach(s => {
    const { totalDue } = calculateLedger(s.id, "supplier", index, suppliers, products, 0);
    const saved = Number(s.balance !== undefined ? s.balance : (s.due !== undefined ? s.due : 0));
    const diff = totalDue - saved;
    if (Math.abs(diff) > 0.05) {
      drifts.push({
        id: s.id,
        name: s.name || s.company || "Unknown Supplier",
        type: "supplier",
        calculatedBalance: totalDue,
        savedBalance: saved,
        drift: diff
      });
      totalDriftAmount += Math.abs(diff);
    }
  });

  // 3. Check Staff
  (staff || []).forEach(st => {
    const { totalDue } = calculateLedger(st.id, "staff", index, suppliers, products, 0);
    const saved = Number(st.balance !== undefined ? st.balance : (st.due !== undefined ? st.due : 0));
    const diff = totalDue - saved;
    if (Math.abs(diff) > 0.05) {
      drifts.push({
        id: st.id,
        name: st.name || "Unknown Staff",
        type: "staff",
        calculatedBalance: totalDue,
        savedBalance: saved,
        drift: diff
      });
      totalDriftAmount += Math.abs(diff);
    }
  });

  return {
    drifts,
    totalDriftAmount: Math.round(totalDriftAmount * 100) / 100,
    hasDrift: drifts.length > 0
  };
}
