export type MovementType = 'PURCHASE' | 'SALES' | 'RETURN' | 'DAMAGE' | 'FREE' | 'ADJUSTMENT' | 'OPENING';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number; // Positive for stock-in (Purchase/Return), Negative for stock-out (Sales/Damage)
  referenceId: string;
  date: string;
  timestamp: number;
}
