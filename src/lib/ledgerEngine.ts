/**
 * Samira Traders DMS — Ledger Engine (FIXED v2)
 * ─────────────────────────────────────────────────
 * ফিক্স:
 * 1. নতুন LedgerType: FREE_CLAIM, PROMO_CLAIM, DAMAGE_CLAIM, PRICE_SUPPORT,
 *    CLAIM_RECEIVED, ADVANCE (রিকোয়ারমেন্ট §12 — প্রতিটি অ্যাডজাস্টমেন্টের নিজস্ব লেজার)
 * 2. Supplier ফিল্টারে unassigned tx আর প্রতিটি supplier-এ গোনা হবে না (ডাবল কাউন্টিং বন্ধ)
 * 3. CASH_ACCOUNT: unapproved (অনুমোদন-বাকি) এন্ট্রি ব্যালেন্সে পড়বে না
 * 4. getUserCashAccountBalance: শুধু partyId ম্যাচ — createdBy দিয়ে ডাবল কাউন্টিং বন্ধ
 * 5. CASH_ACCOUNT-এ PAYMENT এখন ক্যাশ-আউট (−); CLAIM_RECEIVED ক্যাশ-ইন (+)
 * 6. STAFF 'EXPENSE' = শুধু তথ্যমূলক (খরচ আগেই netCashPayable → SHORT-এ কাটা হয়,
 *    ব্যালেন্সে আবার কাটলে ডাবল হতো)
 */

export type LedgerType =
  | 'SALES' | 'COLLECTION' | 'EXPENSE' | 'DISCOUNT' | 'RETURN' | 'DAMAGE'
  | 'SALARY' | 'DUE' | 'PAYMENT' | 'PURCHASE' | 'TRANSFER' | 'DEBIT' | 'CREDIT' | 'SHORT'
  // ── নতুন (ক্লেইম ও অ্যাডভান্স লেজার) ──
  | 'FREE_CLAIM'      // ফ্রি প্রোডাক্ট ক্লেইম (সাপ্লায়ারের কাছে আমাদের পাওনা)
  | 'PROMO_CLAIM'     // প্রোডাক্ট ওয়াইজ ডিসকাউন্ট / স্ক্র্যাচ কার্ড / ট্রেড অফার ক্লেইম
  | 'DAMAGE_CLAIM'    // ড্যামেজ রিটার্ন ক্লেইম
  | 'PRICE_SUPPORT'   // প্রাইস সাপোর্ট / অন্যান্য অ্যাডজাস্টমেন্ট ক্লেইম
  | 'CLAIM_RECEIVED'  // কোম্পানি ক্লেইমের টাকা/পণ্য পরিশোধ করেছে
  | 'ADVANCE'
  | 'ADVANCE_USED';        // DSR/স্টাফ বেশি টাকা জমা দিয়েছে (কোম্পানির কাছে তার পাওনা)

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'STAFF' | 'CASH_ACCOUNT' | 'SUB_DB';

export interface LedgerTransaction {
  id: string;
  partyId: string;
  partyType: PartyType;
  type: LedgerType;
  amount: number;
  description: string;
  ref: string;
  date: string;
  timestamp: number;
  supplierId?: string; // Critical for Supplier-wise Customer Due tracking
  supplierName?: string;
  createdBy?: string;
  createdByName?: string;
  approved?: boolean;
  approvedBy?: string;
  approvalDate?: string;
  companyId?: string;
  runningBalance?: number;
}

// ── প্রতিটি partyType-এর জন্য ব্যালেন্স ইফেক্ট টেবিল (এক জায়গায় — সব ভিউ একই সূত্র ব্যবহার করবে) ──
const EFFECTS: Record<PartyType, { pos: LedgerType[]; neg: LedgerType[] }> = {
  // কাস্টমার/সাব-ডিবি: বিক্রয় ও বাকি = পাওনা বাড়ে; কালেকশন/ফেরত/ছাড় = কমে
  CUSTOMER: {
    pos: ['SALES', 'DUE', 'DEBIT', 'SHORT'],
    neg: ['COLLECTION', 'RETURN', 'DISCOUNT', 'CREDIT', 'PAYMENT'],
  },
  SUB_DB: {
    pos: ['SALES', 'DUE', 'DEBIT', 'SHORT'],
    neg: ['COLLECTION', 'RETURN', 'DISCOUNT', 'CREDIT', 'PAYMENT'],
  },
  // সাপ্লায়ার (দুই-পার্ট লেজারের একীভূত রূপ):
  //   + ক্রয় ও ক্রয়-সংক্রান্ত ক্রেডিট, কোম্পানি ক্লেইম পরিশোধ (CLAIM_RECEIVED)
  //   − আমাদের পেমেন্ট, ফেরত, ক্রয়-ছাড়, এবং সব ধরনের ক্লেইম (রিসিভেবল)
  SUPPLIER: {
    pos: ['PURCHASE', 'CREDIT', 'CLAIM_RECEIVED'],
    neg: ['PAYMENT', 'RETURN', 'DISCOUNT', 'DEBIT',
          'FREE_CLAIM', 'PROMO_CLAIM', 'DAMAGE_CLAIM', 'PRICE_SUPPORT'],
  },
  // স্টাফ/DSR: শর্ট/বাকি বাড়ে; কালেকশন/বেতন/ট্রান্সফার/অ্যাডভান্স কমায়
  // 'EXPENSE' এখানে ইচ্ছাকৃতভাবে নেই — খরচ আগেই প্রদেয় থেকে কাটা, আবার কাটলে ডাবল হতো
  STAFF: {
    pos: ['SHORT', 'DUE', 'DEBIT', 'ADVANCE_USED'],
    neg: ['COLLECTION', 'SALARY', 'TRANSFER', 'CREDIT', 'PAYMENT', 'ADVANCE'],
  },
  // ক্যাশ অ্যাকাউন্ট: টাকা ঢুকলে +, দিলে −
  CASH_ACCOUNT: {
    pos: ['COLLECTION', 'CLAIM_RECEIVED', 'CREDIT'],
    neg: ['PAYMENT', 'TRANSFER', 'EXPENSE', 'DEBIT'],
  },
};

/**
 * একটি লেজার এন্ট্রির ব্যালেন্স-ইফেক্ট (+/−/0)।
 * নিয়ম: approved === false (অনুমোদন-বাকি) এন্ট্রি কোনো লেজারেই পড়বে না —
 * অনুমোদনের পর সব লেজার একসাথে আপডেট হবে (ক্যাশ বই ও DSR লেজার সবসময় মিলবে)।
 */
// লেগেসি ডেটার ছোট হাতের টাইপগুলো ক্যানোনিক্যাল বড় হাতের টাইপে নেয়া
// (পুরনো sync লেখে 'sale'/'payment_in'/'payment_out', নতুন ইঞ্জিন লেখে বড় হাতের —
//  না মিলালে পুরনো এন্ট্রির ইফেক্ট ০ ধরা হতো = ব্যালেন্স গায়েব)
const TYPE_ALIASES: Record<string, LedgerType> = {
  SALE: 'SALES',
  PAYMENT_IN: 'COLLECTION',
  PAYMENT_OUT: 'PAYMENT',
  SHORTAGE: 'SHORT',
  FREE: 'FREE_CLAIM',
  PROMO: 'PROMO_CLAIM',
  DAMAGE: 'DAMAGE_CLAIM',
};

export const normalizeLedgerType = (raw: any): LedgerType => {
  const up = String(raw || '').toUpperCase();
  return TYPE_ALIASES[up] || (up as LedgerType);
};

export const getLedgerEffect = (
  t: Pick<LedgerTransaction, 'type' | 'amount' | 'approved'>,
  partyType: PartyType
): number => {
  if (t.approved === false) return 0;
  const rule = EFFECTS[partyType];
  if (!rule) return 0;
  const type = normalizeLedgerType(t.type);
  if (rule.pos.includes(type)) return t.amount;
  if (rule.neg.includes(type)) return -t.amount;
  return 0;
};

// Calculate running balance for a party based on chronological transactions
export const calculateRunningBalance = (
  transactions: LedgerTransaction[],
  partyType: PartyType,
  partyId?: string,
  supplierIdFilter?: string
) => {
  let filtered = partyId ? transactions.filter(t => t.partyId === partyId) : [...transactions];
  if (supplierIdFilter) {
    // FIX #7: নির্দিষ্ট supplier-এর হিসাবে শুধু তার নিজের এন্ট্রি।
    // supplierId-বিহীন এন্ট্রি 'general' বাকেটে যায় (getCustomerSupplierDueBreakdown দেখুন) —
    // আগে ওগুলো প্রতিটি supplier-এর হিসাবে গোনা হতো (ডাবল কাউন্টিং)।
    filtered = filtered.filter(t => t.supplierId === supplierIdFilter);
  }

  // Sort chronologically (FIX: মূল array আর mutate হবে না)
  const chronological = [...filtered].sort((a, b) => a.timestamp - b.timestamp);

  let balance = 0;
  return chronological.map(t => {
    const effect = getLedgerEffect(t, partyType);
    balance += effect;
    return { ...t, type: normalizeLedgerType(t.type), runningBalance: balance };
  });
};

/**
 * Calculates supplier-wise breakdown of due for a specific customer
 * E.g., Dano: 500, Tibbet: 700, SMC: 300 => Total: 1500
 */
export const getCustomerSupplierDueBreakdown = (
  transactions: LedgerTransaction[],
  customerId: string,
  suppliers: { id: string; name: string }[]
) => {
  const customerTxs = transactions.filter(t => t.partyId === customerId);
  const supplierMap: { [supplierId: string]: { supplierId: string; supplierName: string; amount: number } } = {};

  // Initialize for all known suppliers
  suppliers.forEach(s => {
    supplierMap[s.id] = { supplierId: s.id, supplierName: s.name, amount: 0 };
  });
  // General unassigned supplier key
  supplierMap['general'] = { supplierId: 'general', supplierName: 'সাধারণ / সাপ্লায়ার-নির্দিষ্ট নয়', amount: 0 };

  customerTxs.forEach(t => {
    const supKey = t.supplierId && supplierMap[t.supplierId] ? t.supplierId : 'general';
    supplierMap[supKey].amount += getLedgerEffect(t, 'CUSTOMER');
  });

  const breakdown = Object.values(supplierMap).filter(item => item.amount !== 0);
  const totalDue = Object.values(supplierMap).reduce((sum, item) => sum + item.amount, 0);

  return { breakdown, totalDue };
};

/**
 * Calculates exact user personal Cash Account balance.
 * FIX #8: শুধু partyId ম্যাচ — আগে (partyId OR createdBy) দিয়ে একই টাকা
 * ম্যানেজার ও DSR দুজনের ব্যালেন্সেই গোনা হতো।
 * FIX #9: unapproved এন্ট্রি getLedgerEffect-এই বাদ পড়ে।
 */
export const getUserCashAccountBalance = (transactions: LedgerTransaction[], userId: string) => {
  return transactions
    .filter(t => t.partyId === userId && t.partyType === 'CASH_ACCOUNT')
    .reduce((balance, t) => balance + getLedgerEffect(t, 'CASH_ACCOUNT'), 0);
};

/** যেকোনো পার্টির মোট ব্যালেন্স (এক লাইনে — সব ভিউ এটা ব্যবহার করবে) */
export const getPartyLedgerBalance = (
  transactions: LedgerTransaction[],
  partyId: string,
  partyType: PartyType
) => {
  return transactions
    .filter(t => t.partyId === partyId)
    .reduce((balance, t) => balance + getLedgerEffect(t, partyType), 0);
};

/** সাপ্লায়ার-ভিত্তিক মোট ক্লেইম রিসিভেবল (ক্লেইম বিল পেজের জন্য) */
export const getSupplierClaimReceivable = (
  transactions: LedgerTransaction[],
  supplierId?: string // না দিলে সব সাপ্লায়ার মিলিয়ে
) => {
  const claimTypes: LedgerType[] = ['FREE_CLAIM', 'PROMO_CLAIM', 'DAMAGE_CLAIM', 'PRICE_SUPPORT'];
  return transactions
    .filter(t =>
      t.partyType === 'SUPPLIER' &&
      claimTypes.includes(normalizeLedgerType(t.type)) &&
      (!supplierId || t.partyId === supplierId)
    )
    .reduce((sum, t) => sum + t.amount, 0)
    - transactions
      .filter(t =>
        t.partyType === 'SUPPLIER' &&
        normalizeLedgerType(t.type) === 'CLAIM_RECEIVED' &&
        (!supplierId || t.partyId === supplierId)
      )
      .reduce((sum, t) => sum + t.amount, 0);
};

