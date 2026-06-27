import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from "../lib/utils";

interface CustomerGroupReportsViewProps {
  customers: any[];
  customerGroups: any[];
  sales: any[];
}

export default function CustomerGroupReportsView({ customers, customerGroups, sales }: CustomerGroupReportsViewProps) {
  const data = React.useMemo(() => {
    const groupStats: Record<string, { name: string, totalSales: number, balance: number }> = {};
    customerGroups.forEach(g => {
      groupStats[g.id] = { name: g.name, totalSales: 0, balance: 0 };
    });

    customers.forEach(c => {
      const gId = c.groupId || "General";
      if (!groupStats[gId]) return;
      
      const customerSales = (sales || []).filter(s => s.customerId === c.id);
      const totalSales = customerSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      groupStats[gId].totalSales += totalSales;
      groupStats[gId].balance += Number(c.balance || 0);
    });

    return Object.values(groupStats);
  }, [customers, customerGroups, sales]);

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h3 className="text-lg font-bold mb-6">কাস্টমার গ্রুপ ভিত্তিক বিক্রয় ও অনাদায়ী ব্যালেন্স (Sales & Balance by Group)</h3>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="totalSales" name="মোট বিক্রয়" fill="#4F46E5" />
            <Bar dataKey="balance" name="অনাদায়ী ব্যালেন্স" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
