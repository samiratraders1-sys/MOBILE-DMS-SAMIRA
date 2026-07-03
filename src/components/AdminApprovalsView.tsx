import React, { useState } from "react";
import { 
  ShieldCheck, CheckCircle, XCircle, ShoppingBag, 
  CheckSquare, Landmark, Award, Calendar, RefreshCcw, DollarSign, Loader2 
} from "lucide-react";
import { formatCurrency, getGroupColors } from "../lib/utils";
import toast from "react-hot-toast";
import { useConfirm } from "../context/ConfirmContext";

interface AdminApprovalsProps {
  sales: any[];
  summaries: any[];
  payments: any[];
  customers: any[];
  staff: any[];
  routes: any[];
  products: any[];
  suppliers: any[];
  onApproveSale: (id: string) => Promise<void>;
  onRejectSale: (id: string) => Promise<void>;
  onApproveSettlement: (id: string) => Promise<void>;
  onRejectSettlement: (id: string) => Promise<void>;
  onApprovePayment: (id: string) => Promise<void>;
  onRejectPayment: (id: string) => Promise<void>;
  onApproveTransfer?: (id: string) => Promise<void>;
  onRejectTransfer?: (id: string) => Promise<void>;
  subDbs?: any[];
  onApproveSubDb?: (id: string) => Promise<void>;
  onRejectSubDb?: (id: string) => Promise<void>;
}

export default function AdminApprovalsView({
  sales,
  summaries,
  payments,
  customers,
  staff,
  routes,
  products,
  suppliers,
  onApproveSale,
  onRejectSale,
  onApproveSettlement,
  onRejectSettlement,
  onApprovePayment,
  onRejectPayment,
  onApproveTransfer,
  onRejectTransfer,
  subDbs = [],
  onApproveSubDb,
  onRejectSubDb
}: AdminApprovalsProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "settlement" | "payments" | "subdb">("sales");
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { confirmDelete } = useConfirm();

  // Reset selection when tab changes
  React.useEffect(() => {
    setSelectedItems([]);
  }, [activeTab]);

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

// Filtering pending items
  const pendingSales = sales.filter(s => s.status === "pending_approval" || s.approved === false);
  const pendingSettlements = summaries.filter(s => s.status === "pending_approval" || s.approved === false);
  const pendingPayments = payments.filter(p => p.status === "pending_approval" || p.approved === false);
  const pendingSubDbs = subDbs.filter(s => s.status === "pending_approval" || s.approved === false);

  const getPendingItems = () => {
    if (activeTab === "sales") return pendingSales;
    if (activeTab === "settlement") return pendingSettlements;
    if (activeTab === "payments") return pendingPayments;
    if (activeTab === "subdb") return pendingSubDbs;
    return [];
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedItems.length === 0) return;
    
    const executeAction = async () => {
      setProcessingIds(prev => [...prev, ...selectedItems]);
      
      const results = await Promise.allSettled(
        selectedItems.map(async id => {
          if (activeTab === 'sales') return action === 'approve' ? onApproveSale(id) : onRejectSale(id);
          if (activeTab === 'settlement') return action === 'approve' ? onApproveSettlement(id) : onRejectSettlement(id);
          if (activeTab === 'payments') return action === 'approve' ? onApprovePayment(id) : onRejectPayment(id);
          if (activeTab === 'subdb' && onApproveSubDb && onRejectSubDb) return action === 'approve' ? onApproveSubDb(id) : onRejectSubDb(id);
        })
      );
      
      results.forEach((res, index) => {
          if(res.status === 'rejected') toast.error(`আইডি ${selectedItems[index]} জন্য ব্যর্থ: ${res.reason}`);
      });

      setProcessingIds(prev => prev.filter(id => !selectedItems.includes(id)));
      setSelectedItems([]);
      toast.success("বাল্ক অ্যাকশন সম্পন্ন হয়েছে");
    };

    // For rejection, require confirmation
    if (action === 'reject') {
      confirmDelete({
        recordName: `নির্বাচিত ${selectedItems.length}টি রেকর্ড`,
        onConfirm: executeAction
      });
    } else {
      await executeAction();
    }
  };

  const totalPendingCount = pendingSales.length + pendingSettlements.length + pendingPayments.length + pendingSubDbs.length;

  const handleApproveSubDb = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      if (onApproveSubDb) {
        await onApproveSubDb(id);
        toast.success("সাব-ডিবি পয়েন্টটি সফলভাবে অনুমোদিত হয়েছে এবং সক্রিয় করা হয়েছে");
      }
    } catch (e: any) {
      toast.error("অনুমোদন ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleRejectSubDb = async (id: string) => {
    if (processingIds.includes(id)) return;
    
    const subDb = subDbs.find(s => s.id === id);
    const subDbName = subDb ? (subDb.name || subDb.pointName) : id;

    confirmDelete({
      recordName: subDbName,
      onConfirm: async () => {
        setProcessingIds(prev => [...prev, id]);
        try {
          if (onRejectSubDb) {
            await onRejectSubDb(id);
            toast.success("সাব-ডিবি পয়েন্ট রেকর্ডটি নাকচ/মুছে ফেলা হয়েছে");
          }
        } catch (e: any) {
          toast.error("নাকচ করতে সমস্যা হয়েছে: " + e.message);
          throw e;
        } finally {
          setProcessingIds(prev => prev.filter(item => item !== id));
        }
      }
    });
  };

  const handleApproveSale = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      await onApproveSale(id);
      toast.success("সেলস এন্ট্রি সফলভাবে অনুমোদিত হয়েছে এবং স্টক আপডেট করা হয়েছে");
    } catch (e: any) {
      toast.error("অনুমোদন ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleRejectSale = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      await onRejectSale(id);
      toast.success("সেলস এন্ট্রি বাতিল করা হয়েছে");
    } catch (e: any) {
      toast.error("বাতিল করতে সমস্যা হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleApproveSettlement = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      await onApproveSettlement(id);
      toast.success("সেটেলমেন্ট সফলভাবে অনুমোদিত হয়েছে। স্টক এবং কাস্টমার বাকি আপডেট করা হয়েছে");
    } catch (e: any) {
      toast.error("অনুমোদন ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleRejectSettlement = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      await onRejectSettlement(id);
      toast.success("সেটেলমেন্ট এন্ট্রি বাতিল করা হয়েছে");
    } catch (e: any) {
      toast.error("বাতিল করতে সমস্যা হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleApprovePayment = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      await onApprovePayment(id);
      toast.success("পেমেন্ট ও বিল এন্ট্রি সফলভাবে অনুমোদিত হয়েছে");
    } catch (e: any) {
      toast.error("অনুমোদন ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleRejectPayment = async (id: string) => {
    if (processingIds.includes(id)) return;
    setProcessingIds(prev => [...prev, id]);
    try {
      await onRejectPayment(id);
      toast.success("পেমেন্ট রেকর্ড বাতিল করা হয়েছে");
    } catch (e: any) {
      toast.error("বাতিল করতে সমস্যা হয়েছে: " + e.message);
    } finally {
      setProcessingIds(prev => prev.filter(item => item !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Badge */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-black mb-2 flex items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              ম্যানেজার হিসাব অনুমোদন এবং ভেরিফিকেশন প্যানেল
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              ম্যানেজারের মাধ্যমে দিনশেষে সম্পন্ন সকল ট্রানজেকশন (হিসাব নিকাশ, নতুন বিক্রয় ও ক্যাশ ট্রান্সফার) যাচাই এবং চূড়ান্ত অনুমোদন করুন। আপনার অনুমোদনের পরেই এগুলো স্টক ও ফাইনাল লেজারে যোগ হবে।
            </p>
          </div>
          <div className="flex gap-2">
            <span className="p-3.5 bg-slate-800 text-indigo-400 rounded-2xl border border-slate-700 font-bold text-xs uppercase flex items-center gap-1.5 leading-none shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              পেন্ডিং এন্ট্রি: {totalPendingCount} টি
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b gap-4">
        <button
          onClick={() => setActiveTab("sales")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "sales" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          বিক্রয় ও পস ({pendingSales.length})
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "settlement" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          ডিএসআর সেটেলমেন্ট ({pendingSettlements.length})
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "payments" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Landmark className="w-4 h-4" />
          ফিন্যান্স ও ক্যাশ ট্রান্সফার ({pendingPayments.length})
        </button>
        <button
          onClick={() => setActiveTab("subdb")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "subdb" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Award className="w-4 h-4 text-indigo-500" />
          সাব-ডিবি পয়েন্ট ({pendingSubDbs.length})
        </button>
      </div>

      {/* Content Panels */}
      <div className="bg-white rounded-3xl p-6 border shadow-xs">
        
        {/* Tab 1: Sales Approvals */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 mb-2">পেন্ডিং সেলস (POS) যাচাইকরণ</h3>
              {pendingSales.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={selectedItems.length === pendingSales.length && pendingSales.length > 0} onChange={() => setSelectedItems(selectedItems.length === pendingSales.length ? [] : pendingSales.map(s => s.id))} /> সব সিলেক্ট করুন
                  </label>
                  {selectedItems.length > 0 && (
                    <>
                      <button onClick={() => handleBulkAction('reject')} className="text-xs font-black text-red-600">নাকচ ({selectedItems.length})</button>
                      <button onClick={() => handleBulkAction('approve')} className="text-xs font-black text-green-600">অনুমোদন ({selectedItems.length})</button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {pendingSales.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-semibold border-2 border-dashed rounded-2xl">
                কোনো পেন্ডিং সেলস ট্রানজেকশন নেই
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingSales.map(sale => {
                  const cust = customers.find(c => c.id === sale.customerId);
                  const rt = routes.find(r => r.id === sale.routeId);
                  const sD = staff.find(s => s.id === sale.dsrId);

                  return (
                    <div key={sale.id} className={`bg-gray-50/50 p-5 rounded-2xl border ${selectedItems.includes(sale.id) ? 'border-indigo-500' : 'border-gray-200'} transition-all flex flex-col justify-between`}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <input type="checkbox" checked={selectedItems.includes(sale.id)} onChange={() => toggleItemSelection(sale.id)} className="w-4 h-4" />
                          <div>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded leading-none">
                              {new Date(sale.date).toLocaleDateString("bn-BD")}
                            </span>
                            <h4 className="font-bold text-sm text-gray-900 mt-1 flex items-center gap-1.5 flex-wrap">
                              কাস্টমার: {cust?.name || "নগদ বিক্রয় (Cash Memo)"}
                              {cust?.groupId && (() => {
                                const colors = getGroupColors(cust.groupId);
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider transition-all ${colors.bg} ${colors.text} ${colors.border}`}>
                                    {cust.groupId}
                                  </span>
                                );
                              })()}
                            </h4>
                            <p className="text-[10px] text-gray-500">দোকান: {cust?.shopName || "N/A"} | রোড: {rt?.name || "N/A"}</p>
                          </div>
                          <span className="text-lg font-black text-indigo-700">{formatCurrency(sale.total)}</span>
                        </div>

                        {/* Items list */}
                        <div className="border-t border-b py-2.5 my-3 grid grid-cols-1 gap-1.5">
                          {sale.items?.map((item: any, idx: number) => {
                            const pObj = products.find(p => p.id === item.productId || p.id === item.id);
                            return (
                              <div key={idx} className="flex justify-between text-xs text-gray-650">
                                <span>{pObj?.name || item.name || "পণ্য"}</span>
                                <span className="font-bold">{item.qty || item.quantity} পিস x {formatCurrency(item.price)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-gray-400 italic mb-4">অপারেটর ইমেইল: {sale.createdBy || "ম্যানেজার"}</p>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          disabled={processingIds.includes(sale.id)}
                          onClick={() => handleRejectSale(sale.id)}
                          className="flex-1 py-2 px-3 border border-red-200 hover:bg-red-50 text-red-650 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <XCircle className="w-4 h-4" /> নাকচ
                        </button>
                        <button 
                          disabled={processingIds.includes(sale.id)}
                          onClick={() => handleApproveSale(sale.id)}
                          className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                        >
                          {processingIds.includes(sale.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> অপেক্ষা করুন...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" /> অনুমোদন করুন
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Settlement Approvals */}
        {activeTab === "settlement" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 mb-2">পেন্ডিং বিকেলে DSR সেটেলমেন্ট বিবরণী</h3>
              {pendingSettlements.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={selectedItems.length === pendingSettlements.length && pendingSettlements.length > 0} onChange={() => setSelectedItems(selectedItems.length === pendingSettlements.length ? [] : pendingSettlements.map(s => s.id))} /> সব সিলেক্ট করুন
                  </label>
                  {selectedItems.length > 0 && (
                    <>
                      <button onClick={() => handleBulkAction('reject')} className="text-xs font-black text-red-600">নাকচ ({selectedItems.length})</button>
                      <button onClick={() => handleBulkAction('approve')} className="text-xs font-black text-green-600">অনুমোদন ({selectedItems.length})</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {pendingSettlements.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-semibold border-2 border-dashed rounded-2xl">
                কোনো পেন্ডিং সেটেলমেন্ট বিবরণী নেই
              </div>
            ) : (
              <div className="space-y-6">
                {pendingSettlements.map(summ => {
                  const dsr = staff.find(st => st.id === summ.dsrId);
                  const rt = routes.find(r => r.id === summ.routeId);

                  return (
                    <div key={summ.id} className={`bg-slate-50/50 rounded-2xl border p-5 md:p-6 ${selectedItems.includes(summ.id) ? 'border-indigo-500' : 'border-slate-200'} transition-all`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mb-4">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={selectedItems.includes(summ.id)} onChange={() => toggleItemSelection(summ.id)} className="w-4 h-4" />
                          <div>
                            <p className="text-xs font-bold text-indigo-500 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded w-fit">
                              সেটেলমেন্ট তারিখ: {summ.settlementDate || summ.date || "আজ"}
                            </p>
                            <h4 className="text-base font-black text-gray-900 mt-1.5">
                              ডিএসআর: {dsr?.name || "N/A"}
                            </h4>
                            <h5 className="text-xs text-gray-500">রোড (রুট): {rt?.name || "N/A"}</h5>
                          </div>
                        </div>
                        <div className="flex flex-row items-end gap-6 text-right">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">প্রদেয় (DSR Payable)</span>
                            <span className="text-lg font-extrabold text-gray-900">{formatCurrency(summ.dsrPayable || summ.salesValue)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">ব্যালেন্স</span>
                            <span className={`text-lg font-black ${summ.dsrBalance < 0 ? "text-red-500" : "text-green-600"}`}>
                              {formatCurrency(summ.dsrBalance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 text-gray-700">
                        <div className="bg-white p-3 rounded-xl border">
                          <span className="text-gray-400 block text-[10px] font-bold">মোট বিক্রি</span>
                          <span className="font-extrabold">{formatCurrency(summ.salesValue)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border">
                          <span className="text-purple-500 block text-[10px] font-bold">ফ্রি আইটেম</span>
                          <span className="font-extrabold">{formatCurrency(summ.totalFreeValue)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border">
                          <span className="text-pink-500 block text-[10px] font-bold">ডিসকাউন্ট</span>
                          <span className="font-extrabold">{formatCurrency(summ.totalDiscountValue || 0)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border">
                          <span className="text-red-500 block text-[10px] font-bold">ড্যামেজ ভ্যালু</span>
                          <span className="font-extrabold">{formatCurrency(summ.totalDamageValue || 0)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border">
                          <span className="text-yellow-600 block text-[10px] font-bold">রাস্তার খরচ</span>
                          <span className="font-extrabold">{formatCurrency(summ.totalExpenses || 0)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border">
                          <span className="text-orange-600 block text-[10px] font-bold">কাস্টমার বাকি</span>
                          <span className="font-extrabold">{formatCurrency(summ.totalCredits || 0)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border col-span-2">
                          <span className="text-indigo-600 block text-[10px] font-bold">আদায়কৃত পেমেন্ট (Payments)</span>
                          <span className="font-extrabold">
                            {(summ.payments || []).map((p: any) => `${p.method}: ${p.amount}`).join(", ") || "কোন পেমেন্ট নেই"}
                          </span>
                        </div>
                      </div>

                      {/* Display Return Lists */}
                      <div className="bg-white p-4 rounded-xl border mb-6 text-xs text-gray-650 max-h-48 overflow-y-auto">
                        <h5 className="font-bold text-gray-800 mb-2 border-b pb-1.5 flex items-center gap-1">
                          <Award className="w-4 h-4 text-gray-500" /> রিটার্ন ও ড্যামেজ সমীকরণ
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 divide-y divide-gray-100">
                          {summ.items?.map((item: any, idx: number) => {
                            if (!item.returns && !item.damage) return null;
                            return (
                              <div key={idx} className="flex justify-between items-center py-1.5">
                                <span className="font-medium text-gray-700">{item.name}</span>
                                <div className="flex gap-4 font-bold text-left">
                                  {item.returns > 0 && <span className="text-teal-600">რიটার্ন: {item.returns}</span>}
                                  {item.damage > 0 && <span className="text-orange-600">ড্যামেজ: {item.damage}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3.5">
                        <button 
                          disabled={processingIds.includes(summ.id)}
                          onClick={() => handleRejectSettlement(summ.id)}
                          className="py-2.5 px-6 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <XCircle className="w-4.5 h-4.5" /> হিসাব রিজেক্ট করুন
                        </button>
                        <button 
                          disabled={processingIds.includes(summ.id)}
                          onClick={() => handleApproveSettlement(summ.id)}
                          className="py-2.5 px-6 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                        >
                          {processingIds.includes(summ.id) ? (
                            <>
                              <Loader2 className="w-4.5 h-4.5 animate-spin" /> অনুমোদন হচ্ছে...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4.5 h-4.5" /> হিসাব সেটেলমেন্ট অনুমোদন
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Payments to Admin, Expenses & Collections */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 mb-2">পেন্ডিং সাপ্লায়ার পেমেন্ট, খরচ ও এডমিন ক্যাশ ট্রান্সফার তালিকা</h3>
              {pendingPayments.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={selectedItems.length === pendingPayments.length && pendingPayments.length > 0} onChange={() => setSelectedItems(selectedItems.length === pendingPayments.length ? [] : pendingPayments.map(p => p.id))} /> সব সিলেক্ট করুন
                  </label>
                  {selectedItems.length > 0 && (
                    <>
                      <button onClick={() => handleBulkAction('reject')} className="text-xs font-black text-red-600">নাকচ ({selectedItems.length})</button>
                      <button onClick={() => handleBulkAction('approve')} className="text-xs font-black text-green-600">অনুমোদন ({selectedItems.length})</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {pendingPayments.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-semibold border-2 border-dashed rounded-2xl">
                কোনো পেন্ডিং পেমেন্ট বা ক্যাশ ট্রান্সফার নেই
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingPayments.map(p => {
                  const staffObj = staff.find(st => st.id === p.entityId);
                  const supplierObj = suppliers.find(su => su.id === p.entityId);

                  const isCashTransferToAdmin = p.category === "Cash Transfer" || p.type === "transfer";

                  return (
                    <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${
                      selectedItems.includes(p.id) ? 'border-indigo-500' : 'border-slate-100'
                    } ${
                      isCashTransferToAdmin 
                        ? "bg-indigo-50/20" 
                        : "bg-amber-50/20"
                    }`}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <input type="checkbox" checked={selectedItems.includes(p.id)} onChange={() => toggleItemSelection(p.id)} className="w-4 h-4" />
                          <div>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded leading-none">
                              {p.date}
                            </span>
                            <h4 className="font-bold text-sm text-gray-900 mt-1.5 flex items-center gap-1.5">
                              {isCashTransferToAdmin ? (
                                <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded">
                                  এডমিন ট্রান্সফার (Cash Transfer)
                                </span>
                              ) : (
                                <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded ${
                                  p.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {p.type === 'in' ? 'জমা (Inflow)' : 'খরচ (Outflow)'}
                                </span>
                              )}
                            </h4>
                            <p className="text-xs font-bold text-gray-800 mt-2 truncate">বিবরণ: {p.description}</p>
                            <p className="text-[10px] text-gray-500 mt-1">খাত/ক্যাটাগরি: {p.category}</p>
                          </div>
                          <span className="text-lg font-black text-indigo-700">{formatCurrency(p.amount)}</span>
                        </div>

                        <div className="my-3 text-xs flex gap-4 text-gray-500 border-t pt-2.5">
                          <span>পদ্ধতি: <strong>{p.method}</strong></span>
                          {(staffObj || supplierObj) && (
                            <span>সংশ্লিষ্ট পক্ষ: <strong>{staffObj?.name || supplierObj?.name}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          disabled={processingIds.includes(p.id)}
                          onClick={() => handleRejectPayment(p.id)}
                          className="flex-1 py-1.5 px-3 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <XCircle className="w-4 h-4" /> নাকচ
                        </button>
                        <button 
                          disabled={processingIds.includes(p.id)}
                          onClick={() => handleApprovePayment(p.id)}
                          className="flex-1 py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                        >
                          {processingIds.includes(p.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> অপেক্ষা করুন...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" /> অনুমোদন করুন
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Sub-DB Approvals */}
        {activeTab === "subdb" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 mb-2">পেন্ডিং সাব-ডিবি বিতরণকারী পয়েন্ট যাচাই ও অনুমোদন</h3>
              {pendingSubDbs.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={selectedItems.length === pendingSubDbs.length && pendingSubDbs.length > 0} onChange={() => setSelectedItems(selectedItems.length === pendingSubDbs.length ? [] : pendingSubDbs.map(s => s.id))} /> সব সিলেক্ট করুন
                  </label>
                  {selectedItems.length > 0 && (
                    <>
                      <button onClick={() => handleBulkAction('reject')} className="text-xs font-black text-red-600">নাকচ ({selectedItems.length})</button>
                      <button onClick={() => handleBulkAction('approve')} className="text-xs font-black text-green-600">অনুমোদন ({selectedItems.length})</button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {pendingSubDbs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-semibold border-2 border-dashed rounded-2xl">
                কোনো পেন্ডিং সাব-ডিবি পয়েন্ট অনুমোদনের জন্য অপেক্ষমান নেই
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingSubDbs.map(subDb => {
                  return (
                    <div key={subDb.id} className={`bg-amber-50/20 border  p-5 rounded-2xl flex flex-col justify-between ${selectedItems.includes(subDb.id) ? 'border-indigo-500' : 'border-amber-150'}`}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <input type="checkbox" checked={selectedItems.includes(subDb.id)} onChange={() => toggleItemSelection(subDb.id)} className="w-4 h-4" />
                          <div>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded leading-none">
                              {(() => {
                                const v = subDb.createdAt;
                                if (!v) return "নতুন";
                                const d = (v && typeof v === "object" && typeof v.toDate === "function") 
                                  ? v.toDate() 
                                  : (v && typeof v === "object" && typeof v.seconds === "number") 
                                    ? new Date(v.seconds * 1000) 
                                    : new Date(v);
                                return isNaN(d.getTime()) ? "নতুন" : d.toLocaleDateString("bn-BD");
                              })()}
                            </span>
                            <h4 className="font-black text-base text-gray-950 mt-1.5">
                              {subDb.name}
                            </h4>
                            <p className="text-xs text-gray-750 mt-1">মোবাইল: <strong>{subDb.phone || "তথ্য নেই"}</strong></p>
                            <p className="text-xs text-gray-750 mt-0.5">ঠিকানা: <strong>{subDb.address || "তথ্য নেই"}</strong></p>
                          </div>
                          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-250 shrink-0">
                            অনুমোদন পেন্ডিং
                          </span>
                        </div>
                        
                        <div className="my-3 text-xs flex gap-4 text-gray-500 border-t pt-2.5">
                          <span>প্রস্তাবকারী: <strong>{subDb.createdBy || "ম্যানেজার"}</strong></span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button 
                          disabled={processingIds.includes(subDb.id)}
                          onClick={() => handleRejectSubDb(subDb.id)}
                          className="flex-1 py-2 px-3 border border-red-250 hover:bg-red-50 text-red-650 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-all duration-200"
                        >
                          <XCircle className="w-4 h-4" /> নাকচ করুন
                        </button>
                        <button 
                          disabled={processingIds.includes(subDb.id)}
                          onClick={() => handleApproveSubDb(subDb.id)}
                          className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-all duration-200"
                        >
                          {processingIds.includes(subDb.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> অনুমোদন হচ্ছে...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" /> অনুমোদন করুন
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
