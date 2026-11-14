/**
 * Samira Traders DMS - Centralized Business & Accounting Calculations
 */

export function calculateCartonPieces(cartons: number = 0, pieces: number = 0, cartoonSize: number = 1): number {
  const size = Math.max(1, cartoonSize || 1);
  return (Number(cartons) || 0) * size + (Number(pieces) || 0);
}

export function calculateLineTotal(
  cartons: number = 0,
  pieces: number = 0,
  cartoonSize: number = 1,
  rate: number = 0,
  discount: number = 0
): number {
  const totalPieces = calculateCartonPieces(cartons, pieces, cartoonSize);
  const gross = totalPieces * (Number(rate) || 0);
  const disc = Number(discount) || 0;
  return Math.max(0, gross - disc);
}

export interface SaleItem {
  productId: string;
  name: string;
  cartons: number;
  pieces: number;
  cartoonSize: number;
  freeQty: number;
  discount: number;
  rate: number;
  total?: number;
  qty?: number;
}

export function calculateSaleTotals(items: SaleItem[] = [], extraDiscount: number = 0, taxRate: number = 0) {
  let grossTotal = 0;
  let totalPieces = 0;
  let totalFreePieces = 0;
  let totalItemDiscounts = 0;

  (items || []).forEach(item => {
    const size = Math.max(1, item.cartoonSize || 1);
    const linePcs = (Number(item.cartons) || 0) * size + (Number(item.pieces) || 0);
    const freePcs = Number(item.freeQty) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;

    totalPieces += linePcs;
    totalFreePieces += freePcs;
    totalItemDiscounts += disc;
    grossTotal += linePcs * rate;
  });

  const subTotalAfterItemDisc = Math.max(0, grossTotal - totalItemDiscounts);
  // FIX: netTotal = discount-পরবর্তী কিন্তু ট্যাক্স-পূর্ব মূল্য; finalTotal = ট্যাক্সসহ প্রদেয়
  // (আগে netTotal-এর জায়গায় finalTotal ফেরত দেওয়া হতো — ট্যাক্স ভেতরে ঢুকে যেত)
  const netTotal = Math.max(0, subTotalAfterItemDisc - (Number(extraDiscount) || 0));
  const taxAmount = (netTotal * (Number(taxRate) || 0)) / 100;
  const finalTotal = netTotal + taxAmount;

  return {
    grossTotal,
    totalPieces,
    totalFreePieces,
    totalItemDiscounts,
    extraDiscount: Number(extraDiscount) || 0,
    subTotalAfterItemDisc,
    netTotal,
    taxAmount,
    finalTotal
  };
}

export function calculateCustomerBalance(transactions: any[] = [], initialBalance: number = 0): number {
  let balance = Number(initialBalance) || 0;
  // FIX: ছোট/বড় হাতের দুই ফরম্যাটের টাইপই বোঝে (settlementEngine uppercase DUE/COLLECTION পোস্ট করে)
  const norm = (raw: any): string => {
    const u = String(raw || "").toUpperCase();
    if (["SALE", "DUE", "DEBIT", "SHORT"].includes(u)) return "due";
    if (["PAYMENT", "PAYMENT_IN", "PAYMENT_OUT", "CREDIT", "COLLECTION", "RETURN"].includes(u)) return "credit";
    return String(raw || "").toLowerCase();
  };
  (transactions || []).forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const t = norm(tx.type);
    if (t === "due") {
      balance += amt;
    } else if (t === "credit") {
      balance -= amt;
    }
  });
  return balance;
}

export function calculateDamageTotal(damageItems: any[] = []): number {
  return (damageItems || []).reduce((sum, item) => {
    const qty = Number(item.quantity || item.qty || item.pieces) || 0;
    const rate = Number(item.unitPrice || item.rate || item.costPrice) || 0;
    return sum + (qty * rate);
  }, 0);
}

export function calculateExpenseTotal(expenses: any[] = []): number {
  return (expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
}

export function calculateProfitLoss(
  sales: any[] = [],
  purchases: any[] = [],
  expenses: any[] = [],
  damage: any[] = []
) {
  const totalSalesRevenue = (sales || []).reduce((sum, s) => sum + (Number(s.total || s.netTotal) || 0), 0);
  const totalPurchasesCost = (purchases || []).reduce((sum, p) => sum + (Number(p.totalAmount || p.total) || 0), 0);
  const totalOperatingExpenses = calculateExpenseTotal(expenses);
  const totalDamageLoss = calculateDamageTotal(damage);

  // FIX: ক্ষতি হলে সেটা দেখাতে হবে — Math.max(0, ...) দিয়ে লস লুকিয়ে রাখা হিসাবের ভুল
  const grossProfit = totalSalesRevenue - totalPurchasesCost;
  const netProfit = grossProfit - totalOperatingExpenses - totalDamageLoss;

  return {
    totalSalesRevenue,
    totalPurchasesCost,
    totalOperatingExpenses,
    totalDamageLoss,
    grossProfit,
    netProfit
  };
}

export function formatDateToday(): string {
  return new Date().toISOString().split("T")[0];
}
