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

