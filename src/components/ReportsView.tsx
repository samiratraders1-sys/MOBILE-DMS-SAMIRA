import React from "react";
import ReportsPage from "../pages/Reports";

interface ReportsViewProps {
  summaries?: any[];
  products?: any[];
  suppliers?: any[];
  addPayment?: (payment: any) => any;
  staff?: any[];
  sales?: any[];
  purchases?: any[];
  payments?: any[];
  customers?: any[];
  customerGroups?: any[];
  accounts?: any[];
  transfers?: any[];
  subDbShipments?: any[];
  removePayment?: (id: string) => Promise<void>;
  role?: string;
  user?: any;
  initialTab?: string;
  routes?: any[];
  expenses?: any[];
  damageInventory?: any[];
  transactions?: any[];
}

export default function ReportsView({
  sales = [],
  customers = [],
  transactions = [],
  damageInventory = [],
  expenses = [],
  products = [],
  initialTab = "sales"
}: ReportsViewProps) {
  let mappedTab: "sales" | "customer" | "damage" | "expense" = "sales";
  if (initialTab === "customer" || initialTab === "customer-ledger") mappedTab = "customer";
  else if (initialTab === "damage") mappedTab = "damage";
  else if (initialTab === "expense") mappedTab = "expense";

  return (
    <ReportsPage
      sales={sales}
      customers={customers}
      transactions={transactions}
      damageInventory={damageInventory}
      expenses={expenses}
      products={products}
      initialTab={mappedTab}
    />
  );
}
