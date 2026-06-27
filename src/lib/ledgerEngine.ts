export type LedgerType = 'SALES' | 'COLLECTION' | 'EXPENSE' | 'DISCOUNT' | 'RETURN' | 'DAMAGE' | 'SALARY' | 'DUE' | 'PAYMENT' | 'PURCHASE' | 'TRANSFER' | 'DEBIT' | 'CREDIT';

export interface LedgerTransaction {
  id: string;
  partyId: string;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'STAFF';
  type: LedgerType;
  amount: number;
  description: string;
  ref: string;
  date: string;
  timestamp: number;
  runningBalance?: number;
}

// Calculate running balance for a party based on chronological transactions
export const calculateRunningBalance = (transactions: LedgerTransaction[], partyType: 'CUSTOMER' | 'SUPPLIER' | 'STAFF') => {
  // Sort chronologically
  const chronological = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  let balance = 0;
  return chronological.map(t => {
    let effect = 0;
    
    if (partyType === 'CUSTOMER') {
      if (['SALES', 'DUE', 'DEBIT'].includes(t.type)) effect = t.amount;
      else if (['COLLECTION', 'RETURN', 'DISCOUNT', 'CREDIT'].includes(t.type)) effect = -t.amount;
    } else if (partyType === 'SUPPLIER') {
      if (['PURCHASE', 'CREDIT'].includes(t.type)) effect = t.amount;
      else if (['PAYMENT', 'RETURN', 'DISCOUNT', 'DEBIT'].includes(t.type)) effect = -t.amount;
    } else if (partyType === 'STAFF') {
      if (['SALES', 'COLLECTION', 'CREDIT'].includes(t.type)) effect = t.amount;
      else if (['EXPENSE', 'SALARY', 'TRANSFER', 'DEBIT'].includes(t.type)) effect = -t.amount;
    }
    
    balance += effect;
    return { ...t, runningBalance: balance };
  });
};
