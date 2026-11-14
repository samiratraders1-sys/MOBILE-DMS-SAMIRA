import { calculateStock } from './inventoryEngine';
import { calculateRunningBalance } from './ledgerEngine';

// Engine to aggregate reports
export const getInventoryReport = (productId: string, movements: any[]) => {
    return calculateStock(movements, productId);
};

export const getLedgerReport = (partyId: string, transactions: any[], partyType: 'CUSTOMER' | 'SUPPLIER' | 'STAFF' = 'CUSTOMER') => {
    const running = calculateRunningBalance(transactions, partyType, partyId);
    return running.length > 0 ? running[running.length - 1].runningBalance : 0;
};


// ── Sub-DB বিল ইঞ্জিন (রিকোয়ারমেন্ট §8) ──
// প্রতি সাব-ডিবি পয়েন্টের বিল = (কার্টন সংখ্যা × মার্জিন) + (ইনভয়েস সংখ্যা × ক্যারিং বিল)
// উদাহরণ: SD-1 → ১০০ কার্টন × ৳৫০ + ৪ ইনভয়েস × ৳২৫০০ = ৳১৫,০০০
export interface SubDbBillResult {
  subDbId: string;
  name: string;
  cartons: number;
  marginPerCarton: number;
  cartonMarginTotal: number;
  invoices: number;
  carryingBill: number;
  carryingTotal: number;
  totalBill: number;
}

export const calculateSubDbBill = (
  subDb: { id: string; name?: string; company?: string; marginPerCarton?: number; carryingBill?: number },
  sales: any[]
): SubDbBillResult => {
  const marginPerCarton = Number(subDb.marginPerCarton) || 0;
  const carryingBill = Number(subDb.carryingBill) || 0;
  let cartons = 0;
  let invoices = 0;

  (sales || []).forEach(s => {
    if (!s) return;
    const owner = s.subDbId || s.subDbPointId || s.partyId;
    if (owner !== subDb.id) return;
    invoices += 1;
    const items = Array.isArray(s.items) ? s.items : [];
    if (items.length > 0) {
      items.forEach((it: any) => {
        cartons += Number(it.qtyCartons || it.cartons || 0) || 0;
      });
    } else {
      cartons += Number(s.cartons || s.qtyCartons || 0) || 0;
    }
  });

  const cartonMarginTotal = Math.round(cartons * marginPerCarton * 100) / 100;
  const carryingTotal = Math.round(invoices * carryingBill * 100) / 100;
  return {
    subDbId: subDb.id,
    name: subDb.name || subDb.company || subDb.id,
    cartons,
    marginPerCarton,
    cartonMarginTotal,
    invoices,
    carryingBill,
    carryingTotal,
    totalBill: Math.round((cartonMarginTotal + carryingTotal) * 100) / 100,
  };
};

export const calculateAllSubDbBills = (subDbs: any[], sales: any[]): SubDbBillResult[] => {
  return (subDbs || []).map(sd => calculateSubDbBill(sd, sales));
};
