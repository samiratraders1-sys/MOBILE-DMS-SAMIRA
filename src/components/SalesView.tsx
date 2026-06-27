import React, { useState } from "react";
import { Calendar, Trash2, Pencil, Plus, X } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import ReportWrapper from "./ReportWrapper";
import toast from "react-hot-toast";
import MultiSelect from "./MultiSelect";
import { recordStockMovement } from "../lib/inventoryEngine";

interface SalesProps {
  sales: any[];
  products: any[];
  customers: any[];
  suppliers: any[];
  routes: any[];
  staff: any[];
  user: any;
  add: (item: any) => Promise<any>;
  remove: (id: string) => Promise<void>;
  update?: (id: string, item: any) => Promise<void>;
  updateProduct?: (id: string, item: any) => Promise<void>;
  updateCustomer?: (id: string, item: any) => Promise<void>;
}

export default function SalesView({ 
  sales, 
  products, 
  customers, 
  suppliers, 
  routes, 
  staff, 
  user, 
  add, 
  remove, 
  update, 
  updateProduct, 
  updateCustomer 
}: SalesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterRouteIds, setFilterRouteIds] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterSrId, setFilterSrId] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Edit States
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editRouteId, setEditRouteId] = useState("");
  const [editSrId, setEditSrId] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editItems, setEditItems] = useState<any[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Custom inline confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Dynamic values list: unique product categories
  const categoriesList = React.useMemo(() => {
    return [...new Set(products.map(p => p.category || "General"))];
  }, [products]);

  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const customerName = customer ? customer.name.toLowerCase() : "নগদ কাস্টমার";
      const matchesSearch = searchTerm === "" || customerName.includes(searchTerm.toLowerCase());
      
      const matchesRoute = filterRouteIds.length === 0 || filterRouteIds.includes(s.routeId);
      
      const matchesCategory = filterCategories.length === 0 || s.items?.some((item: any) => {
        const prod = products.find(p => p.id === item.productId || p.id === item.id);
        const cat = prod?.category || "General";
        return filterCategories.includes(cat);
      });

      const matchesSr = filterSrId === "" || s.srId === filterSrId;
      const matchesSupplier = filterSupplierId === "" || s.items?.some((item: any) => {
          const prod = products.find(p => p.id === item.productId);
          return prod?.supplierId === filterSupplierId;
      });
      const saleDate = new Date(s.date);
      const matchesStartDate = filterStartDate === "" || saleDate >= new Date(filterStartDate);
      const matchesEndDate = filterEndDate === "" || saleDate <= new Date(filterEndDate + "T23:59:59");
      return matchesSearch && matchesRoute && matchesCategory && matchesSr && matchesSupplier && matchesStartDate && matchesEndDate;
    });
  }, [sales, searchTerm, filterRouteIds, filterCategories, filterSrId, filterSupplierId, filterStartDate, filterEndDate, customers, products]);

  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  const downloadCSV = () => {
    const headers = ["তারিখ", "রোড", "এস আর", "কাস্টমার", "মোট"];
    const rows = filteredSales.map(s => [
      new Date(s.date).toLocaleDateString('bn-BD'),
      routes.find(r => r.id === s.routeId)?.name || 'N/A',
      staff.find(st => st.id === s.srId)?.name || 'N/A',
      customers.find(c => c.id === s.customerId)?.name || "নগদ কাস্টমার",
      s.total
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareWhatsApp = () => {
    const text = `বিক্রয় রিপোর্ট:\nমোট বিক্রয়: ${formatCurrency(totalSales)}\nমোট অর্ডার: ${filteredSales.length}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Delete Action
  const handleDeleteSale = (sale: any) => {
    setConfirmModal({
      show: true,
      title: "বিক্রয় রেকর্ড ডিলিট করুন",
      message: "আপনি কি নিশ্চিতভাবে এই বিক্রয় রেকর্ডটি ডিলিট করতে চান? এটি ডিলিট করলে আইটেমসমূহের স্টক বৃদ্ধি করা হবে এবং কাস্টমারের বাকী ব্যালেন্স পূর্বাবস্থায় ফিরিয়ে নিয়ে যাওয়া হবে। এই অ্যাকশনটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          if (sale.approved || sale.status === "paid") {
            // Revert product stock
            for (const item of sale.items || []) {
                const prodId = item.productId || item.id;
                if (prodId) {
                  const qty = Number(item.qty || item.quantity) || 0;
                  await recordStockMovement(prodId, 'RETURN', qty, sale.id);
                }
            }

            // Revert Customer Balance
            if (updateCustomer && sale.customerId) {
              const cust = customers.find(c => c.id === sale.customerId);
              if (cust) {
                await updateCustomer(cust.id, {
                  balance: (cust.balance || 0) - (Number(sale.total) || 0)
                });
              }
            }
          }

          await remove(sale.id);
          toast.success("বিক্রয় রেকর্ড সফলভাবে ডিলিট করা হয়েছে!");
        } catch (err: any) {
          console.error(err);
          toast.error("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
        }
      }
    });
  };

  // Edit Initiator
  const handleStartEditSale = (sale: any) => {
    setEditingSale(sale);
    setEditDate(sale.date ? sale.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditRouteId(sale.routeId || "");
    setEditSrId(sale.srId || "");
    setEditCustomerId(sale.customerId || "");
    setEditItems(
      (sale.items || []).map((item: any) => ({
        productId: item.productId || item.id,
        id: item.productId || item.id,
        name: item.name || products.find(p => p.id === (item.productId || item.id))?.name || "অজানা পণ্য",
        qty: Number(item.qty || item.quantity || 0),
        price: Number(item.price || 0)
      }))
    );
  };

  // Add Item inside edit state
  const handleAddProductToSale = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const exists = editItems.find(item => item.productId === productId);
    if (exists) {
      toast.error("পণ্যটি ইতিমধ্যেই যুক্ত রয়েছে!");
      return;
    }

    setEditItems([
      ...editItems,
      {
        productId: prod.id,
        id: prod.id,
        name: prod.name,
        qty: 1,
        price: prod.price || prod.cost || 0
      }
    ]);
    setSelectedAddProductId("");
  };

  const handleUpdateEditItem = (index: number, field: "qty" | "price", value: number) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

  const handleRemoveProductFromSale = (index: number) => {
    setEditItems(editItems.filter((_, idx) => idx !== index));
  };

  // Save Edit Function
  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !update) return;

    if (editItems.length === 0) {
      toast.error("বিক্রয় ইনভয়েসে অন্তত একটি আইটেম থাকতে হবে!");
      return;
    }

    setIsSaving(true);
    try {
      const newTotal = editItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);

      // Revert actions to apply new calculations if approved
      if (editingSale.approved || editingSale.status === "paid") {
        // Revert old stocks
        for (const item of editingSale.items || []) {
            const prodId = item.productId || item.id;
            if (prodId) {
                const qty = Number(item.qty || item.quantity) || 0;
                await recordStockMovement(prodId, 'RETURN', qty, editingSale.id);
            }
        }

        // Revert old customer balances
        if (updateCustomer && editingSale.customerId) {
          const oldCust = customers.find(c => c.id === editingSale.customerId);
          if (oldCust) {
            await updateCustomer(oldCust.id, {
              balance: (oldCust.balance || 0) - (Number(editingSale.total) || 0)
            });
          }
        }

        // Apply new stock deductions
        for (const item of editItems) {
            const prodId = item.id || item.productId;
            if (prodId) {
              const qty = Number(item.qty) || 0;
              await recordStockMovement(prodId, 'SALES', -qty, editingSale.id);
            }
        }

        // Apply new customer balances
        if (updateCustomer && editCustomerId) {
          const newCust = customers.find(c => c.id === editCustomerId);
          if (newCust) {
            await updateCustomer(newCust.id, {
              balance: (newCust.balance || 0) + newTotal
            });
          }
        }
      }

      // Save updated document
      await update(editingSale.id, {
        ...editingSale,
        date: editDate + "T00:00:00.000Z",
        routeId: editRouteId,
        srId: editSrId,
        customerId: editCustomerId,
        items: editItems,
        total: newTotal
      });

      toast.success("বিক্রয় রেকর্ড সফলভাবে আপডেট করা হয়েছে!");
      setEditingSale(null);
    } catch (err: any) {
      console.error(err);
      toast.error("আপডেট করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ReportWrapper title="বিক্রয় হিস্ট্রি" onDownload={downloadCSV} onShare={shareWhatsApp}>
      <div className="bg-white p-4 border rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <input 
            placeholder="কাস্টমার নাম খুঁজুন..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" 
          />
          
          <MultiSelect
            options={routes.map(r => ({ value: r.id, label: r.name }))}
            selectedValues={filterRouteIds}
            onChange={setFilterRouteIds}
            placeholder="সকল রোড"
          />

          <MultiSelect
            options={categoriesList.map(cat => ({ value: cat, label: cat }))}
            selectedValues={filterCategories}
            onChange={setFilterCategories}
            placeholder="সকল ক্যাটাগরি"
          />

          <select 
            value={filterSrId} 
            onChange={(e) => setFilterSrId(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
          >
            <option value="">সকল এস আর</option>
            {staff.filter(st => st.role === 'SR').map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
          <select 
            value={filterSupplierId} 
            onChange={(e) => setFilterSupplierId(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
          >
            <option value="">সকল সাপ্লায়ার</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={(e) => setFilterStartDate(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none" 
          />
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={(e) => setFilterEndDate(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none" 
          />
          <button 
            type="button"
            onClick={() => {
              setSearchTerm("");
              setFilterRouteIds([]);
              setFilterCategories([]);
              setFilterSrId("");
              setFilterSupplierId("");
              setFilterStartDate("");
              setFilterEndDate("");
            }} 
            className="p-2 border rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-650 cursor-pointer transition"
          >
            ফিল্টার রিসেট
          </button>
      </div>

      <div className="bg-white border border-[#E9ECEF] rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#F8F9FA]">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">তারিখ</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">রোড</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">এস আর</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">কাস্টমার</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">অর্ডার আইটেম</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">মোট</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Created By</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-center">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map(s => (
              <React.Fragment key={s.id}>
                <tr className="hover:bg-gray-50">
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{new Date(s.date).toLocaleDateString('bn-BD')}</td>
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{routes.find(r => r.id === s.routeId)?.name || 'N/A'}</td>
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{staff.find(st => st.id === s.srId)?.name || 'N/A'}</td>
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{customers.find(c => c.id === s.customerId)?.name || "নগদ কাস্টমার"}</td>
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 text-sm text-gray-600 cursor-pointer">
                        {s.items?.length || 0} আইটেম
                    </td>
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 font-bold cursor-pointer">{formatCurrency(s.total)}</td>
                    <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{s.createdBy || 'Unknown'}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleStartEditSale(s)}
                          className="p-1 px-1.5 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                          title="সম্পাদনা করুন (Edit)"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(s)}
                          className="p-1 px-1.5 text-gray-400 hover:text-red-650 hover:bg-rose-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                          title="ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                </tr>
                {expandedRowId === s.id && (
                    <tr>
                        <td colSpan={8} className="bg-gray-50 p-4">
                            <h4 className="font-bold mb-2">অর্ডার ডিটেইলস:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {s.items?.map((item: any, idx: number) => {
                                    const prod = products.find(p => p.id === item.productId);
                                    return (
                                        <div key={idx} className="bg-white p-2 rounded text-sm border shadow-sm">
                                        <span className="font-bold">{prod?.name || item.name || 'Unknown'}</span>
                                        <br />
                                        {item.qty} x {formatCurrency(item.price || 0)} = {formatCurrency(item.qty * (item.price || 0))}
                                        </div>
                                    );
                                })}
                            </div>
                        </td>
                    </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sale Edit Modal Overlay */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl border border-gray-100 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-black text-gray-900">বিক্রয় ইনভয়েস সম্পাদনা (Edit Sale)</h3>
              <button onClick={() => setEditingSale(null)} className="p-1 text-gray-400 hover:text-gray-650 rounded-xl hover:bg-gray-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={e => setEditDate(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 font-medium whitespace-nowrap text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ডেলিভারি রোড</label>
                  <select 
                    value={editRouteId} 
                    onChange={e => setEditRouteId(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">এস আর (SR)</label>
                  <select 
                    value={editSrId} 
                    onChange={e => setEditSrId(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {staff.filter(st => st.role === 'SR').map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">কাস্টমার</label>
                  <select 
                    value={editCustomerId} 
                    onChange={e => setEditCustomerId(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold"
                  >
                    <option value="">নগদ কাস্টমার/নির্বাচন করুন</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Items in Sale */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm text-gray-800">পণ্য সামগ্রী ও কোয়ান্টিটি</h4>
                  
                  {/* Select product to insert */}
                  <select
                    value={selectedAddProductId}
                    onChange={e => {
                      setSelectedAddProductId(e.target.value);
                      if (e.target.value) handleAddProductToSale(e.target.value);
                    }}
                    className="border border-gray-205 rounded-xl p-1 bg-white text-xs font-bold"
                  >
                    <option value="">+ নতুন পণ্য যোগ করুন</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (স্টক: {p.stock || 0})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs">
                      <span className="flex-1 font-bold text-gray-800">{item.name}</span>
                      <div className="flex gap-1 items-center">
                        <label className="text-[10px] text-gray-450 uppercase">পিস:</label>
                        <input 
                          type="number" 
                          value={item.qty} 
                          onChange={e => handleUpdateEditItem(index, "qty", Number(e.target.value))} 
                          className="w-16 border rounded bg-white p-1 text-center font-mono font-bold"
                          min={1}
                        />
                      </div>
                      <div className="flex gap-1 items-center">
                        <label className="text-[10px] text-gray-450 uppercase">রেট:</label>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={e => handleUpdateEditItem(index, "price", Number(e.target.value))} 
                          className="w-20 border rounded bg-white p-1 text-right font-mono font-bold text-emerald-700"
                          min={0}
                        />
                      </div>
                      <span className="w-16 text-right font-bold text-gray-900 font-mono">
                        {formatCurrency(Number(item.qty || 0) * Number(item.price || 0))}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveProductFromSale(index)} 
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recalculated total info */}
              <div className="flex justify-between items-center font-black text-base border-t pt-4 text-gray-950">
                <span>নতুন মোট বিক্রয় মূল্য:</span>
                <span className="text-indigo-650 font-mono">
                  {formatCurrency(editItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0))}
                </span>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" disabled={isSaving} onClick={() => setEditingSale(null)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-gray-50 transition-colors">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-1 btn-primary py-3 font-black text-xs cursor-pointer flex items-center justify-center">
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : "ইনভয়েস সেভ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM INLINE CONFIRMATION MODAL TO BYPASS IFRAME RESTRICTIONS */}
      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 transition-all backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-150 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-gray-950 flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-indigo-600 rounded-xs" /> {confirmModal.title}
            </h3>
            <p className="text-xs font-semibold text-gray-650 leading-relaxed whitespace-pre-line">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border border-gray-200 rounded-xl text-xs transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer"
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

function Search({ className, ...props }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className} {...props}
    >
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}
