import React from "react";
import AfternoonSettlementPage from "../pages/AfternoonSettlement";

interface SettlementProps {
  summaries?: any[];
  products?: any[];
  staff?: any[];
  routes?: any[];
  customers?: any[];
  updateSummary?: (id: string, item: any) => Promise<void>;
  updateCustomer?: (id: string, item: any) => Promise<void>;
  updateProduct?: (id: string, item: any) => Promise<void>;
  addDamage?: (item: any) => Promise<void>;
  addExpense?: (item: any) => Promise<void>;
  role?: string;
  onApproveSettlement?: (id: string, forceSync?: boolean) => Promise<void>;
}

export default function SettlementView({
  summaries = [],
  products = [],
  staff = [],
  routes = [],
  customers = [],
  updateSummary,
  onApproveSettlement
}: SettlementProps) {
  return (
    <AfternoonSettlementPage
      summaries={summaries}
      products={products}
      staff={staff}
      routes={routes}
      customers={customers}
      updateSummary={updateSummary}
      onApproveSettlement={onApproveSettlement}
    />
  );
}
