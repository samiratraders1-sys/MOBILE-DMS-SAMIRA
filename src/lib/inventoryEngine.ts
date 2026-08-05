import { StockMovement, MovementType } from './stockMovement';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

// Engine to calculate fresh stock based on movements
export const calculateStock = (movements: StockMovement[], productId: string): number => {
  return movements
    .filter(m => m.productId === productId && !m.isDamage)
    .reduce((total, m) => total + m.quantity, 0);
};

// Engine to calculate damage stock based on movements
export const calculateDamageStock = (movements: StockMovement[], productId: string): number => {
  return movements
    .filter(m => m.productId === productId && m.isDamage)
    .reduce((total, m) => total + m.quantity, 0);
};

// Calculate Inventory Closing Metrics: Opening + Purchases - Total Stock Out = Closing Stock
export const calculateInventoryClosingReport = (
  movements: StockMovement[],
  productId: string,
  openingStock: number = 0
) => {
  const pMovements = movements.filter(m => m.productId === productId);
  
  const purchases = pMovements
    .filter(m => m.type === 'PURCHASE' || m.type === 'FRESH_RETURN')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const stockOut = pMovements
    .filter(m => m.type === 'SALES' || m.type === 'DSR_ASSIGNMENT' || m.type === 'SUB_DB_TRANSFER')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const closingStock = openingStock + purchases - stockOut;

  return { openingStock, purchases, stockOut, closingStock };
};

/**
 * Converts total pieces into "X Ctn Y Pcs" string representation
 */
export const formatCartonPcs = (totalPcs: number, packSize: number = 1): string => {
  if (!packSize || packSize <= 1) return `${totalPcs} Pcs`;
  const cartons = Math.floor(totalPcs / packSize);
  const pcs = totalPcs % packSize;
  if (cartons === 0) return `${pcs} Pcs`;
  if (pcs === 0) return `${cartons} Ctn`;
  return `${cartons} Ctn ${pcs} Pcs`;
};

// Record a stock movement
export const recordStockMovement = async (
  productId: string, 
  type: MovementType, 
  quantity: number, 
  referenceId: string,
  isDamage: boolean = false,
  unitCost: number = 0,
  unitPrice: number = 0
) => {
    try {
      const companyId = localStorage.getItem("companyId") || undefined;
      await addDoc(collection(db, "stockMovements"), {
        productId,
        type,
        quantity,
        referenceId,
        isDamage,
        unitCost,
        unitPrice,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        companyId
      });
    } catch (e) {
      console.error("Failed to record stock movement:", e);
      throw e;
    }
};

// Get movement history for a product
export const getProductMovementHistory = (movements: StockMovement[], productId: string) => {
    return movements
        .filter(m => m.productId === productId)
        .sort((a, b) => b.timestamp - a.timestamp);
};

