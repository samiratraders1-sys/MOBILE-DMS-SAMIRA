import { StockMovement, MovementType } from './stockMovement';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

// Engine to calculate stock based on movements
export const calculateStock = (movements: StockMovement[], productId: string): number => {
  return movements
    .filter(m => m.productId === productId)
    .reduce((total, m) => {
      // Assuming movements already have quantity as + or - based on type
      return total + m.quantity;
    }, 0);
};

// Record a movement
export const recordStockMovement = async (productId: string, type: MovementType, quantity: number, referenceId: string) => {
    try {
      await addDoc(collection(db, "stockMovements"), {
        productId,
        type,
        quantity,
        referenceId,
        date: new Date().toISOString(),
        timestamp: Date.now()
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
