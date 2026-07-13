import { doc, setDoc } from "firebase/firestore";
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
 * Dynamic Ledger Calculation Engine
 * Centrally computes the exact dues and supplier-wise breakdown to prevent calculation drift.
 */
export function calculateLedger(
  partyId: string,
  partyType: "customer" | "supplier" | "staff",
  transactions: TransactionDoc[],
  suppliers: any[],
  products: any[],
  initialOpeningBalance: number = 0
) {
  // Filter transactions for this party
  const partyTx = transactions.filter(t => t.partyId === partyId);

  // Sort chronologically (oldest first)
  const sortedTx = [...partyTx].sort((a, b) => {
    return String(a.date || "").localeCompare(String(b.date || ""));
  });

  // Calculate overall balance
  let runningBal = initialOpeningBalance;
  const logs = sortedTx.map(t => {
    let effect = 0;
    if (partyType === "customer") {
      if (t.type === "sale" || t.type === "payment_out" || (t.type === "opening" && t.amount > 0)) {
        effect = t.amount;
      } else if (t.type === "payment_in" || t.type === "return" || (t.type === "opening" && t.amount < 0)) {
        effect = -t.amount;
      }
    } else if (partyType === "supplier") {
      if (t.type === "purchase" || t.type === "payment_in" || (t.type === "opening" && t.amount > 0)) {
        effect = t.amount;
      } else if (t.type === "payment_out" || t.type === "return" || (t.type === "opening" && t.amount < 0)) {
        effect = -t.amount;
      }
    } else if (partyType === "staff") {
      if (t.type === "sale" || t.type === "payment_in") {
        effect = t.amount;
      } else if (t.type === "payment_out" || t.type === "purchase") {
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

  // Supplier-wise breakdown for Customers
  const supplierBreakdown: Record<string, { sales: number; payments: number; returns: number; due: number }> = {};
  
  // Initialize breakdown for all active suppliers
  suppliers.forEach(s => {
    supplierBreakdown[s.id] = { sales: 0, payments: 0, returns: 0, due: 0 };
  });
  // Add a generic fallback supplier if needed
  supplierBreakdown["all"] = { sales: 0, payments: 0, returns: 0, due: 0 };

  // Track customer initial opening balance
  if (partyType === "customer" && initialOpeningBalance > 0) {
    supplierBreakdown["all"].due += initialOpeningBalance;
  }

  // Aggregate customer transactions per supplier
  if (partyType === "customer") {
    sortedTx.forEach(t => {
      const sId = t.supplierId || "all";
      if (!supplierBreakdown[sId]) {
        supplierBreakdown[sId] = { sales: 0, payments: 0, returns: 0, due: 0 };
      }

      if (t.type === "sale") {
        supplierBreakdown[sId].sales += t.amount;
        supplierBreakdown[sId].due += t.amount;
      } else if (t.type === "payment_in") {
        supplierBreakdown[sId].payments += t.amount;
        supplierBreakdown[sId].due -= t.amount;
      } else if (t.type === "return") {
        supplierBreakdown[sId].returns += t.amount;
        supplierBreakdown[sId].due -= t.amount;
      } else if (t.type === "payment_out") {
        supplierBreakdown[sId].payments -= t.amount; // negative payment_in is payment_out
        supplierBreakdown[sId].due += t.amount;
      } else if (t.type === "opening") {
        supplierBreakdown[sId].due += t.amount;
      }
    });
  }

  // Format supplier breakdown list
  const breakdownList = Object.entries(supplierBreakdown)
    .map(([id, data]) => {
      const supp = suppliers.find(s => s.id === id);
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
    logs: [...logs].reverse() // newest first for ledger logs
  };
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
 * Self-healing automatic generator to populate transactions from existing collections
 * Runs in the background to ensure backward compatibility and prevent data loss.
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

  // 1. Process Sales (Customer purchases)
  sales.forEach(sale => {
    if (!sale || !sale.id || !sale.customerId) return;
    // Determine supplier proportions in this sale
    const supplierTotals: Record<string, number> = {};
    (sale.items || []).forEach((item: any) => {
      const p = products.find(prod => prod.id === (item.productId || item.id));
      const sId = p?.supplierId || "all";
      const val = Number(item.total || (Number(item.qty || item.quantity || 0) * Number(item.price || 0)) || 0);
      supplierTotals[sId] = (supplierTotals[sId] || 0) + val;
    });

    const saleTotal = Number(sale.total || sale.totalAmount || 0);
    const calculatedTotal = Object.values(supplierTotals).reduce((a, b) => a + b, 0);

    // If we have items and we can split
    if (calculatedTotal > 0 && Object.keys(supplierTotals).length > 0) {
      Object.entries(supplierTotals).forEach(([sId, val]) => {
        // Proportional split of sale.total
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
      // Fallback: entire sale to "all" supplier
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
  payments.forEach(pay => {
    if (!pay || !pay.id || !pay.entityId) return;
    const isCust = customers.some(c => c.id === pay.entityId);
    const isSupp = suppliers.some(s => s.id === pay.entityId);
    
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
  returns.forEach(ret => {
    if (!ret || !ret.id || !ret.customerId) return;
    const p = products.find(prod => prod.id === ret.productId);
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
  purchases.forEach(pur => {
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

  // Keep only valid transactions (ID and Party ID must exist)
  const validTxList = newTxList.filter(t => t && t.id && t.partyId);

  // Filter out transactions that are already in firestore transactions
  const existingIds = new Set(existingTx.map(t => t.id));
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
    } else {
      // Save batch to Firestore
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
 * Background worker to check transaction drift
 * Specifically flags any transaction drift (calculated balance != saved balance)
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

  // 1. Check Customers
  (customers || []).forEach(c => {
    const { totalDue } = calculateLedger(c.id, "customer", transactions, suppliers, products, 0);
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
    const { totalDue } = calculateLedger(s.id, "supplier", transactions, suppliers, products, 0);
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
    const { totalDue } = calculateLedger(st.id, "staff", transactions, suppliers, products, 0);
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

