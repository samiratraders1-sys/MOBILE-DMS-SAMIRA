/**
 * Samira Traders DMS — Settlement Engine (FIXED v2)
 * ─────────────────────────────────────────────────
 * হিসাবের সূত্র (মালিকের রিকোয়ারমেন্ট অনুযায়ী):
 *   প্রদেয় = (এসাইন − ফ্রেশ রিটার্ন) বিক্রয় দরে
 *          − ড্যামেজ (বিক্রয় দরে) − ফ্রি প্রোডাক্ট (বিক্রয় দরে)
 *          − প্রোডাক্ট ওয়াইজ ডিসকাউন্ট − খরচ − কাস্টমার বাকি − স্পেশাল ডিসকাউন্ট
 *   SHORT   = প্রদেয় − জমাকৃত ক্যাশ   (>0 হলে DSR-এর বাকি)
 *   ADVANCE = বেশি জমা দিলে            (DSR-এর কাছে কোম্পানির পাওনা)
 *
 * লেজার পোস্টিং (§12 — প্রতিটি অ্যাডজাস্টমেন্ট নিজস্ব লেজারে):
 *   ফ্রি প্রোডাক্ট    → FREE_CLAIM   (SUPPLIER, supplierId-ভিত্তিক)
 *   ডিসকাউন্ট/অফার   → PROMO_CLAIM  (SUPPLIER)
 *   ড্যামেজ          → DAMAGE_CLAIM (SUPPLIER)
 *   স্পেশাল ডিসকাউন্ট → EXPENSE (সরাসরি ডিস্ট্রিবিউটরের বহন — ক্লেইম বিলে যাবে না)
 *   শর্ট             → SHORT  (STAFF/DSR)   |   বেশি জমা → ADVANCE (STAFF/DSR)
 *   জমাকৃত ক্যাশ     → COLLECTION (CASH_ACCOUNT/ম্যানেজার, approved:false — অনুমোদনের পর গোনা হবে)
 *
 * FIX: সব এন্ট্রির নির্দিষ্ট ID (SETTLE_{summaryId}_...) + setDoc —
 * একই সেটেলমেন্ট ভুলে দুবার চালালেও ডাবল এন্ট্রি হবে না (idempotent)।
 */
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { recordStockMovement } from './inventoryEngine';
import { roundCurrency } from './math';
import type { LedgerTransaction, PartyType, LedgerType } from './ledgerEngine';

export interface AssignedItem {
  productId: string; productName: string;
  qty: number;
  unitPrice: number; // বিক্রয় দর
  unitCost: number;  // ক্রয় দর
  supplierId?: string;
}
export interface ReturnItem { productId: string; productName?: string; qty: number; unitPrice: number; unitCost: number; }
export interface DamageItem extends ReturnItem { supplierId?: string; supplierName?: string; reason?: string; }
export interface FreeItem {
  productId: string; productName?: string;
  qty: number;
  unitPrice: number;             // বিক্রয় দর — DSR-এর হিসাব থেকে এই দরেই কাটবে (FIX #1)
  claimRate?: number;            // কোম্পানির কাছে ক্লেইমের দর (না দিলে বিক্রয় দর)
  supplierId?: string; supplierName?: string;
}
export interface ProductDiscount { productId: string; productName?: string; discountAmount: number; supplierId?: string; supplierName?: string; }
export interface ExpenseItem { category: string; amount: number; notes?: string; }
export interface CustomerDue { customerId: string; customerName: string; supplierId?: string; supplierName?: string; amount: number; invoiceNo?: string; }

export interface DSRSettlementInput {
  summaryId: string;            // সেটেলমেন্ট শিটের ইউনিক আইডি — সব এন্ট্রির ID এটি থেকে তৈরি হবে
  dsrId: string; dsrName: string;
  routeId: string; routeName?: string;
  date: string;                 // YYYY-MM-DD
  assignedItems: AssignedItem[];
  freshReturns: ReturnItem[];
  damageReturns: DamageItem[];
  freeItems: FreeItem[];
  productDiscounts: ProductDiscount[];
  expenses: ExpenseItem[];
  customerDues: CustomerDue[];
  specialDiscount?: number;     // স্পেশাল ডিসকাউন্ট — ক্লেইম বিলে যাবে না, সরাসরি খরচ
  collectedCash: number;
  managerId: string; managerName?: string;
}

export interface SettlementTotals {
  grossAssignedVal: number;   // মোট এসাইন (বিক্রয় দরে)
  freshReturnVal: number;     // ফ্রেশ রিটার্ন (বিক্রয় দরে)
  netStockOutVal: number;     // নিট বিক্রয় ভিত্তি = এসাইন − ফ্রেশ রিটার্ন
  damageVal: number;          // ড্যামেজ (বিক্রয় দরে)
  freeDeductionVal: number;   // ফ্রি (বিক্রয় দরে — DSR থেকে কাটা হবে)
  freeClaimVal: number;       // ফ্রি (ক্লেইম দরে — কোম্পানির কাছে বিল হবে)
  damageClaimVal: number;     // ড্যামেজ ক্লেইম (কোম্পানির কাছে)
  totalDiscountsVal: number;  // প্রোডাক্ট ওয়াইজ ডিসকাউন্ট
  totalExpensesVal: number;   // খরচ
  specialDiscountVal: number; // স্পেশাল ডিসকাউন্ট (ক্লেইম বিলে যাবে না)
  totalCustomerDuesVal: number;
  totalDeductions: number;
  netCashPayable: number;     // DSR প্রদেয়
  shortAmount: number;        // + হলে DSR-এর বাকি, − হলে অ্যাডভান্স
  shortDue: number;           // DSR শর্ট (>= 0)
  advanceAmount: number;      // DSR অ্যাডভান্স (>= 0)
}

/** বিশুদ্ধ গণনা — কোনো DB কল নেই, তাই সহজে টেস্ট করা যায় */
export const computeSettlementTotals = (input: DSRSettlementInput): SettlementTotals => {
  const grossAssignedVal = roundCurrency((input.assignedItems || []).reduce((s, i) => s + i.qty * i.unitPrice, 0));
  const freshReturnVal = roundCurrency((input.freshReturns || []).reduce((s, i) => s + i.qty * i.unitPrice, 0));
  const netStockOutVal = roundCurrency(grossAssignedVal - freshReturnVal);

  // FIX #1: ফ্রি প্রোডাক্ট DSR-এর হিসাব থেকে বিক্রয় দরে (unitPrice) কাটা হবে —
  // কারণ সেটেলমেন্ট শিটে সেল ভ্যালু বিক্রয় দরেই গোনা হয়েছে; ফ্রি সেই বিক্রীত পণ্য থেকেই দেওয়া হয়েছে।
  const freeDeductionVal = roundCurrency((input.freeItems || []).reduce((s, i) => s + i.qty * (i.unitPrice ?? 0), 0));
  // কোম্পানির কাছে ক্লেইম হবে ক্লেইম দরে (নির্দিষ্ট না থাকলে বিক্রয় দর)।
  const freeClaimVal = roundCurrency((input.freeItems || []).reduce((s, i) => s + i.qty * (i.claimRate ?? i.unitPrice ?? 0), 0));

  const damageVal = roundCurrency((input.damageReturns || []).reduce((s, i) => s + i.qty * i.unitPrice, 0));
  const damageClaimVal = roundCurrency((input.damageReturns || []).reduce((s, i) => s + i.qty * (i.claimRate ?? i.unitPrice), 0));

  const totalDiscountsVal = roundCurrency((input.productDiscounts || []).reduce((s, d) => s + d.discountAmount, 0));
  const totalExpensesVal = roundCurrency((input.expenses || []).reduce((s, e) => s + e.amount, 0));
  const specialDiscountVal = roundCurrency(input.specialDiscount || 0);
  const totalCustomerDuesVal = roundCurrency((input.customerDues || []).reduce((s, c) => s + c.amount, 0));

  const totalDeductions = roundCurrency(
    damageVal + freeDeductionVal + totalDiscountsVal + totalExpensesVal + specialDiscountVal + totalCustomerDuesVal
  );
  const netCashPayable = roundCurrency(netStockOutVal - totalDeductions);
  const shortAmount = roundCurrency(netCashPayable - (input.collectedCash || 0));
  const shortDue = Math.max(0, shortAmount);
  const advanceAmount = Math.max(0, -shortAmount); // FIX #3: বেশি জমা = DSR অ্যাডভান্স

  return {
    grossAssignedVal, freshReturnVal, netStockOutVal,
    damageVal, freeDeductionVal, freeClaimVal, damageClaimVal,
    totalDiscountsVal, totalExpensesVal, specialDiscountVal, totalCustomerDuesVal,
    totalDeductions, netCashPayable, shortAmount, shortDue, advanceAmount,
  };
};

/** নির্দিষ্ট ID সহ লেজার এন্ট্রি — দুবার চালালেও একই ডকুমেন্ট ওভাররাইট হবে, ডাবল হবে না */
const postTx = async (
  id: string,
  tx: Omit<LedgerTransaction, 'id' | 'timestamp' | 'companyId'> & { approved?: boolean }
) => {
  const companyId = typeof localStorage !== 'undefined' ? (localStorage.getItem('companyId') || 'samira-traders') : 'samira-traders';
  await setDoc(doc(db, 'transactions', id), {
    ...tx,
    id,
    timestamp: Date.now(),
    companyId,
  });
};

/** supplierId অনুযায়ী আইটেম গ্রুপ করে ক্লেইম এন্ট্রি বানায় */
const groupBySupplier = <T extends { supplierId?: string }>(items: T[]): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};
  (items || []).forEach(item => {
    const key = item.supplierId || 'general';
    (groups[key] = groups[key] || []).push(item);
  });
  return groups;
};

export const processMasterDSRSettlement = async (input: DSRSettlementInput) => {
  const totals = computeSettlementTotals(input);
  const prefix = `SETTLE_${input.summaryId}`;
  const base = {
    ref: input.summaryId,
    date: input.date,
    createdBy: input.managerId,
    createdByName: input.managerName || '',
  };

  // 1) কাস্টমার বাকি — supplierId-সহ (সাপ্লায়ার-ভিত্তিক কাস্টমার বাকি ঠিক রাখতে)
  for (let i = 0; i < (input.customerDues || []).length; i++) {
    const c = input.customerDues[i];
    if (!c || c.amount <= 0) continue;
    await postTx(`${prefix}_CUST_${i}`, {
      ...base,
      partyId: c.customerId,
      partyType: 'CUSTOMER',
      type: 'DUE',
      amount: roundCurrency(c.amount),
      supplierId: c.supplierId || 'general',
      supplierName: c.supplierName || '',
      description: `কাস্টমার বাকি — ${c.customerName}${c.invoiceNo ? ` (চালান #${c.invoiceNo})` : ''} (DSR: ${input.dsrName})`,
    });
  }

  // 2) খরচ — STAFF লেজারে তথ্যমূলক এন্ট্রি (টাকা আগেই প্রদেয় থেকে কাটা; ব্যালেন্সে আবার কাটবে না)
  for (let i = 0; i < (input.expenses || []).length; i++) {
    const e = input.expenses[i];
    if (!e || e.amount <= 0) continue;
    await postTx(`${prefix}_EXP_${i}`, {
      ...base,
      partyId: input.dsrId,
      partyType: 'STAFF',
      type: 'EXPENSE',
      amount: roundCurrency(e.amount),
      description: `খরচ (${e.category})${e.notes ? ` — ${e.notes}` : ''} — DSR: ${input.dsrName}`,
    });
  }

  // 3) স্পেশাল ডিসকাউন্ট — সরাসরি ডিস্ট্রিবিউটরের বহন; ক্লেইম বিলে যাবে না (খরচ হিসেবে P&L-এ যাবে)
  if (totals.specialDiscountVal > 0) {
    await postTx(`${prefix}_SPDISC`, {
      ...base,
      partyId: input.dsrId,
      partyType: 'STAFF',
      type: 'EXPENSE',
      amount: totals.specialDiscountVal,
      description: `স্পেশাল ডিসকাউন্ট (সরাসরি ডিস্ট্রিবিউটরের বহন — ক্লেইম বিলে যাবে না) — DSR: ${input.dsrName}`,
    });
  }

  // 4) সাপ্লায়ার-ভিত্তিক ক্লেইম লেজার (FIX #2 — টাকা আর হারাবে না, ক্লেইম বিলের ডেটা এখান থেকেই আসবে)
  const claimPosts: Array<{ key: string; type: LedgerType; label: string; items: any[]; valFn: (items: any[]) => number }> = [
    { key: 'FREE', type: 'FREE_CLAIM', label: 'ফ্রি প্রোডাক্ট ক্লেইম', items: input.freeItems || [], valFn: items => items.reduce((s, i) => s + i.qty * (i.claimRate ?? i.unitPrice ?? 0), 0) },
    { key: 'PROMO', type: 'PROMO_CLAIM', label: 'ডিসকাউন্ট/ট্রেড অফার ক্লেইম', items: input.productDiscounts || [], valFn: items => items.reduce((s, d) => s + d.discountAmount, 0) },
    { key: 'DMG', type: 'DAMAGE_CLAIM', label: 'ড্যামেজ রিটার্ন ক্লেইম', items: input.damageReturns || [], valFn: items => items.reduce((s, d) => s + d.qty * (d.claimRate ?? d.unitPrice), 0) },
  ];
  for (const cp of claimPosts) {
    const groups = groupBySupplier(cp.items);
    for (const [supId, items] of Object.entries(groups)) {
      const val = roundCurrency(cp.valFn(items));
      if (val <= 0) continue;
      await postTx(`${prefix}_${cp.key}_${supId}`, {
        ...base,
        partyId: supId,
        partyType: 'SUPPLIER',
        type: cp.type,
        amount: val,
        supplierId: supId,
        supplierName: (items[0] as any)?.supplierName || '',
        description: `${cp.label} — DSR: ${input.dsrName} (${items.length} আইটেম, সেটেলমেন্ট ${input.date})`,
      });
    }
  }

  // 5) DSR শর্ট / অ্যাডভান্স — সম্পূর্ণ হিস্ট্রি সহ
  if (totals.shortDue > 0) {
    await postTx(`${prefix}_SHORT`, {
      ...base,
      partyId: input.dsrId,
      partyType: 'STAFF',
      type: 'SHORT',
      amount: totals.shortDue,
      description: `সেটেলমেন্ট শর্ট — প্রদেয় ৳${totals.netCashPayable}, জমা ৳${input.collectedCash}, বাকি ৳${totals.shortDue} — DSR: ${input.dsrName}`,
    });
  }
  if (totals.advanceAmount > 0) {
    await postTx(`${prefix}_ADVANCE`, {
      ...base,
      partyId: input.dsrId,
      partyType: 'STAFF',
      type: 'ADVANCE',
      amount: totals.advanceAmount,
      description: `DSR অ্যাডভান্স — প্রদেয় ৳${totals.netCashPayable}-এর চেয়ে ৳${totals.advanceAmount} বেশি জমা দিয়েছে — DSR: ${input.dsrName}`,
    });
  }

  // 6) জমাকৃত ক্যাশ — ম্যানেজারের ক্যাশ অ্যাকাউন্টে, অনুমোদন-বাকি (approved:false)
  if (input.collectedCash > 0) {
    await postTx(`${prefix}_CASH`, {
      ...base,
      partyId: input.managerId,
      partyType: 'CASH_ACCOUNT',
      type: 'COLLECTION',
      amount: roundCurrency(input.collectedCash),
      approved: false,
      description: `DSR সেটেলমেন্ট ক্যাশ জমা — DSR: ${input.dsrName} (রুট: ${input.routeName || input.routeId})`,
    });
  }

  // 7) ড্যামেজ স্টক মুভমেন্ট — ইনভেন্টরি ইঞ্জিনে ড্যামেজ স্টক আপডেট
  for (const d of input.damageReturns || []) {
    if (!d || d.qty <= 0) continue;
    await recordStockMovement(d.productId, 'DAMAGE_RETURN', d.qty, input.summaryId, true, d.unitCost ?? 0, d.unitPrice);
  }

  return { settlementId: input.summaryId, totals };
};
