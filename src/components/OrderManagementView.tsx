import React from "react";
import OrderManagementPage from "../pages/OrderManagement";

interface OrderManagementViewProps {
  orders?: any[];
  addOrder?: (data: any) => Promise<any>;
  updateOrder?: (id: string, data: any) => Promise<void>;
  deleteOrder?: (id: string) => Promise<void>;
  products?: any[];
  customers?: any[];
}

export default function OrderManagementView({
  orders,
  addOrder,
  updateOrder,
  deleteOrder,
  products,
  customers
}: OrderManagementViewProps) {
  return (
    <OrderManagementPage
      orders={orders}
      addOrder={addOrder}
      updateOrder={updateOrder}
      deleteOrder={deleteOrder}
      products={products}
      customers={customers}
    />
  );
}
