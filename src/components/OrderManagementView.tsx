import React, { useState, useMemo } from "react";
import { Clock, Truck, Package, Search, Filter, CheckCircle, AlertCircle, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";

const STATUSES = [
  { id: "pending", label: "মুলতুবি", color: "bg-amber-100 text-amber-800" },
  { id: "processing", label: "প্রক্রিয়াকরণাধীন", color: "bg-blue-100 text-blue-800" },
  { id: "shipped", label: "পাঠানো হয়েছে", color: "bg-indigo-100 text-indigo-800" },
  { id: "delivered", label: "বিতরণ করা হয়েছে", color: "bg-emerald-100 text-emerald-800" },
];

export default function OrderManagementView({ orders, updateOrder, products, customers }: { orders: any[], updateOrder: (id: string, data: any) => Promise<void>, products: any[], customers: any[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesStatus = filter === "all" || o.status === filter;
      const customer = customers.find(c => c.id === o.customerId);
      const matchesSearch = o.date.includes(search) || 
                            customer?.name.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, filter, search, customers]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });
      toast.success("অর্ডারের অবস্থা সফলভাবে আপডেট করা হয়েছে");
    } catch (e: any) {
      toast.error("আপডেট করতে সমস্যা হয়েছে: " + e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-950">অর্ডার ম্যানেজমেন্ট</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="তারিখ বা গ্রাহক..."
              className="pl-9 pr-4 py-2 border rounded-xl text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="p-2 border rounded-xl text-sm font-bold"
          >
            <option value="all">সব অর্ডার</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-bold">তারিখ</th>
              <th className="p-4 font-bold">গ্রাহক (ফোন)</th>
              <th className="p-4 font-bold">মোট পণ্য</th>
              <th className="p-4 font-bold">মূল্য</th>
              <th className="p-4 font-bold">অবস্থা</th>
              <th className="p-4 font-bold text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map(o => {
              const customer = customers.find(c => c.id === o.customerId);
              const statusInfo = STATUSES.find(s => s.id === o.status);
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="p-4 font-semibold">{o.date}</td>
                  <td className="p-4 font-bold">
                      {customer?.name || "অজানা গ্রাহক"}<br/>
                      <span className="text-xs text-gray-500">{customer?.contactDetails?.phone}</span>
                  </td>
                  <td className="p-4 cursor-pointer hover:text-blue-600 underline" onClick={() => setSelectedOrder(o)}>{o.items?.length || 0}টি (বিস্তারিত)</td>
                  <td className="p-4 font-black">৳{o.totalAmount?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusInfo?.color}`}>
                      {statusInfo?.label || o.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <select 
                      value={o.status}
                      onChange={e => handleStatusUpdate(o.id, e.target.value)}
                      className="p-1 border rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">অর্ডারের বিস্তারিত</h2>
                    <button onClick={() => setSelectedOrder(null)}><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                      <p><strong>গ্রাহক:</strong> {customers.find(c => c.id === selectedOrder.customerId)?.name}</p>
                      <p><strong>তারিখ:</strong> {selectedOrder.date}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold border-b pb-2">পণ্যের তালিকা:</h3>
                    {selectedOrder.items?.map((item: any, idx: number) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                            <div key={idx} className="flex justify-between text-sm">
                                <span>{product?.name || "অজানা পণ্য"} (x{item.quantity})</span>
                                <span>৳{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        );
                    })}
                  </div>
                  
                  <div className="font-black text-right pt-2 border-t">মোট: ৳{selectedOrder.totalAmount?.toLocaleString()}</div>
              </div>
          </div>
      )}
    </div>
  );
}
