/**
 * Samira Traders DMS - Atomic Sales Service (Firebase writeBatch)
 * Handles 5 atomic writes in a single Firestore transaction batch:
 * 1. sales (Invoice Record)
 * 2. transactions (Customer Ledger)
 * 3. damageInventory / damage_stock (If damage items are included)
 * 4. free_discount_ledger / transactions (Free items & Discounts)
 * 5. expenses (Associated delivery / transaction expenses)
 */

import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { calculateSaleTotals } from "../utils/calculations";

export interface CompleteSalePayload {
  customerId: string;
  customerName: string;
  routeId?: string;
  dsrId?: string;
  items: Array<{
    productId: string;
    name: string;
    cartons: number;
    pieces: number;
    cartoonSize?: number;
    freeQty?: number;
    discount?: number;
    rate: number;
    total?: number;
    qty?: number;
  }>;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string;
  notes?: string;
  damagedItems?: Array<{
    productId: string;
    name: string;
    quantity: number;
    rate: number;
    reason?: string;
  }>;
  expenseAmount?: number;
  expenseCategory?: string;
  createdBy?: string;
  date?: string;
}

export async function handleCompleteSale(salePayload: CompleteSalePayload, companyId?: string): Promise<{ saleId: string; success: boolean }> {
  const batch = writeBatch(db);
  const now = new Date();
  const dateStr = salePayload.date || now.toISOString().split("T")[0];

  // 1. Reference & Document for Sales Collection
  const salesRef = doc(collection(db, "sales"));
  const saleId = salesRef.id;

  const saleTotals = calculateSaleTotals(salePayload.items as any);

  const saleData = {
    id: saleId,
    companyId: companyId || localStorage.getItem("companyId") || "default",
    date: dateStr,
    createdAt: serverTimestamp(),
    customerId: salePayload.customerId || "cash",
    customerName: salePayload.customerName || "নগদ কাস্টমার",
    routeId: salePayload.routeId || "N/A",
    dsrId: salePayload.dsrId || "N/A",
    items: salePayload.items,
    total: salePayload.total || saleTotals.netTotal,
    paidAmount: salePayload.paidAmount || 0,
    dueAmount: salePayload.dueAmount || 0,
    status: salePayload.dueAmount > 0 ? "partial" : "paid",
    approved: true,
    createdBy: salePayload.createdBy || "Staff",
    notes: salePayload.notes || ""
  };
  batch.set(salesRef, saleData);

  // 2. Write to Customer Ledger (transactions)
  if (salePayload.customerId && salePayload.customerId !== "cash") {
    const custTxRef = doc(collection(db, "transactions"));
    batch.set(custTxRef, {
      id: custTxRef.id,
      companyId: saleData.companyId,
      date: dateStr,
      entityId: salePayload.customerId,
      entityName: salePayload.customerName,
      entityType: "customer",
      refId: saleId,
      type: "sale",
      description: `বিক্রয় চালান #${saleId.slice(0, 6)} - কাস্টমার: ${salePayload.customerName}`,
      amount: salePayload.total,
      paidAmount: salePayload.paidAmount,
      dueAmount: salePayload.dueAmount,
      createdBy: salePayload.createdBy || "Staff",
      createdAt: serverTimestamp()
    });
  }

  // 3. Write to Damage Stock (if damaged items returned/recorded in sale)
  if (salePayload.damagedItems && salePayload.damagedItems.length > 0) {
    salePayload.damagedItems.forEach(dmg => {
      const dmgRef = doc(collection(db, "damageInventory"));
      batch.set(dmgRef, {
        id: dmgRef.id,
        companyId: saleData.companyId,
        date: dateStr,
        refSaleId: saleId,
        productId: dmg.productId,
        productName: dmg.name,
        quantity: dmg.quantity,
        rate: dmg.rate,
        totalLoss: dmg.quantity * dmg.rate,
        reason: dmg.reason || "বিক্রয়কালীন ড্যামেজ ফেরত",
        createdBy: salePayload.createdBy || "Staff",
        createdAt: serverTimestamp()
      });
    });
  }

  // 4. Write to Free & Discount Ledger (transactions / free_discount_ledger)
  if (saleTotals.totalFreePieces > 0 || saleTotals.totalItemDiscounts > 0) {
    const freeDiscRef = doc(collection(db, "transactions"));
    batch.set(freeDiscRef, {
      id: freeDiscRef.id,
      companyId: saleData.companyId,
      date: dateStr,
      refId: saleId,
      type: "free_discount_ledger",
      description: `ফ্রি ও ডিসকাউন্ট লেজার (চালান #${saleId.slice(0, 6)}): ${saleTotals.totalFreePieces} পিস ফ্রি, ৳${saleTotals.totalItemDiscounts} ছাড়`,
      freePieces: saleTotals.totalFreePieces,
      discountAmount: saleTotals.totalItemDiscounts,
      entityId: salePayload.customerId || "cash",
      createdBy: salePayload.createdBy || "Staff",
      createdAt: serverTimestamp()
    });
  }

  // 5. Write to Expenses (if delivery fee or sale expenses incurred)
  if (salePayload.expenseAmount && salePayload.expenseAmount > 0) {
    const expRef = doc(collection(db, "expenses"));
    batch.set(expRef, {
      id: expRef.id,
      companyId: saleData.companyId,
      date: dateStr,
      refSaleId: saleId,
      category: salePayload.expenseCategory || "বিক্রয় পরিবহন ও আনুষঙ্গিক খরচ",
      amount: salePayload.expenseAmount,
      description: `বিক্রয় চালান #${saleId.slice(0, 6)} এর পরিবহন/আনুষঙ্গিক খরচ`,
      createdBy: salePayload.createdBy || "Staff",
      createdAt: serverTimestamp()
    });
  }

  // Commit all 5 writes atomically
  await batch.commit();

  return { saleId, success: true };
}
