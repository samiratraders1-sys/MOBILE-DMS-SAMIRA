export type LedgerType = 'SALES' | 'COLLECTION' | 'EXPENSE' | 'DISCOUNT' | 'RETURN' | 'DAMAGE' | 'SALARY' | 'DUE' | 'PAYMENT' | 'PURCHASE' | 'TRANSFER' | 'DEBIT' | 'CREDIT' | 'SHORT';

export interface LedgerTransaction {
  id: string;
  partyId: string;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'STAFF' | 'CASH_ACCOUNT' | 'SUB_DB';
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

// Calculate running balance for a party based on chronological transactions
export const calculateRunningBalance = (
  transactions: LedgerTransaction[], 
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'STAFF' | 'CASH_ACCOUNT' | 'SUB_DB',
  partyId?: string,
  supplierIdFilter?: string
) => {
  let filtered = partyId ? transactions.filter(t => t.partyId === partyId) : [...transactions];
  if (supplierIdFilter) {
    filtered = filtered.filter(t => !t.supplierId || t.supplierId === supplierIdFilter);
  }

  // Sort chronologically
  const chronological = filtered.sort((a, b) => a.timestamp - b.timestamp);

  let balance = 0;
  return chronological.map(t => {
    let effect = 0;
    
    if (partyType === 'CUSTOMER' || partyType === 'SUB_DB') {
      if (['SALES', 'DUE', 'DEBIT', 'SHORT'].includes(t.type)) effect = t.amount;
      else if (['COLLECTION', 'RETURN', 'DISCOUNT', 'CREDIT', 'PAYMENT'].includes(t.type)) effect = -t.amount;
    } else if (partyType === 'SUPPLIER') {
      if (['PURCHASE', 'CREDIT'].includes(t.type)) effect = t.amount;
      else if (['PAYMENT', 'RETURN', 'DISCOUNT', 'DEBIT'].includes(t.type)) effect = -t.amount;
    } else if (partyType === 'STAFF') {
      if (['SHORT', 'DUE', 'DEBIT'].includes(t.type)) effect = t.amount;
      else if (['COLLECTION', 'SALARY', 'TRANSFER', 'CREDIT', 'PAYMENT'].includes(t.type)) effect = -t.amount;
    } else if (partyType === 'CASH_ACCOUNT') {
      if (['COLLECTION', 'PAYMENT', 'CREDIT'].includes(t.type)) effect = t.amount;
      else if (['TRANSFER', 'EXPENSE', 'DEBIT'].includes(t.type)) effect = -t.amount;
    }
    
    balance += effect;
    return { ...t, runningBalance: balance };
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
  supplierMap['general'] = { supplierId: 'general', supplierName: 'General / Unassigned', amount: 0 };

  customerTxs.forEach(t => {
    const supKey = t.supplierId && supplierMap[t.supplierId] ? t.supplierId : 'general';
    let effect = 0;
    if (['SALES', 'DUE', 'DEBIT', 'SHORT'].includes(t.type)) effect = t.amount;
    else if (['COLLECTION', 'RETURN', 'DISCOUNT', 'CREDIT', 'PAYMENT'].includes(t.type)) effect = -t.amount;

    supplierMap[supKey].amount += effect;
  });

  const breakdown = Object.values(supplierMap).filter(item => item.amount !== 0);
  const totalDue = Object.values(supplierMap).reduce((sum, item) => sum + item.amount, 0);

  return { breakdown, totalDue };
};

/**
 * Calculates exact user personal Cash Account balance
 * Every user's collected payments add to their cash account (+), and transfers/expenses deduct (-)
 */
export const getUserCashAccountBalance = (transactions: LedgerTransaction[], userId: string) => {
  const userTxs = transactions.filter(t => t.partyId === userId || t.createdBy === userId);
  let cashBalance = 0;

  userTxs.forEach(t => {
    if (t.partyType === 'CASH_ACCOUNT') {
      if (['COLLECTION', 'PAYMENT', 'CREDIT'].includes(t.type)) cashBalance += t.amount;
      else if (['TRANSFER', 'EXPENSE', 'DEBIT'].includes(t.type)) cashBalance -= t.amount;
    }
  });

  return cashBalance;
};

