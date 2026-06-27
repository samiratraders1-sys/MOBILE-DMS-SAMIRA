import { calculateStock } from './inventoryEngine';
import { calculateBalance } from './financialEngine';

// Engine to aggregate reports
export const getInventoryReport = (productId: string, movements: any[]) => {
    return calculateStock(movements, productId);
};

export const getLedgerReport = (partyId: string, transactions: any[]) => {
    return calculateBalance(transactions, partyId);
};
