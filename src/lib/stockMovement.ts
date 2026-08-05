export type MovementType = 
  | 'PURCHASE' 
  | 'SALES' 
  | 'RETURN'
  | 'DAMAGE'
  | 'FRESH_RETURN' 
  | 'DAMAGE_RETURN' 
  | 'FREE' 
  | 'ADJUSTMENT' 
  | 'OPENING' 
  | 'DSR_ASSIGNMENT' 
  | 'SUB_DB_TRANSFER' 
  | 'SUPPLIER_CLAIM_RETURN';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number; // Positive for stock-in, Negative for stock-out
  referenceId: string;
  date: string;
  timestamp: number;
  companyId?: string;
  isDamage?: boolean;
  unitCost?: number;
  unitPrice?: number;
}


