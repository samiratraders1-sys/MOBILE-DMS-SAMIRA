import React, { useState, useMemo } from "react";
import { Search, Plus, Trash2, AlertTriangle, CheckCircle, RefreshCw, FileText, Truck, ArrowRight, CornerDownLeft, Minus } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import { recordStockMovement } from "../lib/inventoryEngine";

interface DamageViewProps {
  products: any[];
  suppliers: any[];
  damageInventory: {
    data: any[];
    add: (item: any) => Promise<any>;
    update: (id: string, item: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  user?: any;
  role?: string;
}

export default function DamageView({ products, suppliers, damageInventory, user, role }: DamageViewProps) {
  const [activeTab, setActiveTab] = useState<"inventory" | "history">("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  // Return to Supplier Modal States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSupplier, setReturnSupplier] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductsToReturn, setSelectedProductsToReturn] = useState<any[]>([]); // Array of { product, quantityToReturn }
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Calculate damage inventory count aggregated by product ID
  const damageStockMap = useMemo(() => {
    const map: Record<string, { quantity: number; details: any[] }> = {};
    
    (damageInventory.data || []).forEach(log => {
      const pId = log.productId;
      if (!pId) return;
      if (!map[pId]) {
        map[pId] = { quantity: 0, details: [] };
      }
      map[pId].quantity += Number(log.quantity || 0);
      map[pId].details.push(log);
    });

    return map;
  }, [damageInventory.data]);

  // Aggregate damage stock of active products
  const damageLedger = useMemo(() => {
    return products.map(p => {
      const dmg = damageStockMap[p.id] || { quantity: 0, details: [] };
      const supplier = suppliers.find(s => s.id === p.supplierId);
      return {
        ...p,
        damageQty: dmg.quantity,
        supplierName: supplier?.name || "N/A",
        details: dmg.details
      };
    }).filter(p => p.damageQty > 0);
  }, [products, suppliers, damageStockMap]);

  // Filter damage ledger based on search and supplier selections
  const filteredDamageLedger = useMemo(() => {
    return damageLedger.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSupplier = !selectedSupplierId || p.supplierId === selectedSupplierId;
      return matchesSearch && matchesSupplier;
    });
  }, [damageLedger, searchQuery, selectedSupplierId]);

  // Damage transaction history (returns & additions)
  const sortedTransactions = useMemo(() => {
    const txList: any[] = [];
    (damageInventory.data || []).forEach(log => {
      const prod = products.find(p => p.id === log.productId);
      const supplier = suppliers.find(s => s.id === log.supplierId || s.id === prod?.supplierId);
      txList.push({
        ...log,
        productName: prod?.name || "অজানা পণ্য",
        sku: prod?.sku || "",
        supplierName: supplier?.name || "N/A",
        unit: prod?.unit || "Pcs"
      });
    });
    return txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [damageInventory.data, products, suppliers]);

  // Handle supplier selection in Return Form
  const handleReturnSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supId = e.target.value;
    setReturnSupplier(supId);
    setSelectedProductsToReturn([]);
    setProductSearch("");
  };

  // Find products belonging to the selected supplier with damage stock > 0
  const returnableProducts = useMemo(() => {
    if (!returnSupplier) return [];
    return damageLedger.filter(p => p.supplierId === returnSupplier && p.damageQty > 0 && 
      !selectedProductsToReturn.some(item => item.product.id === p.id)
    );
  }, [returnSupplier, damageLedger, selectedProductsToReturn]);

  const filteredReturnableProducts = useMemo(() => {
    return returnableProducts.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    );
  }, [returnableProducts, productSearch]);

  const addProductToReturnList = (prod: any) => {
    setSelectedProductsToReturn(prev => [
      ...prev,
      {
        product: prod,
        quantity: prod.damageQty // default to maximum returnable damage stock
      }
    ]);
    setProductSearch("");
  };

  const removeProductFromReturnList = (prodId: string) => {
    setSelectedProductsToReturn(prev => prev.filter(item => item.product.id !== prodId));
  };

  const handleReturnQtyChange = (prodId: string, value: string, maxQty: number) => {
    const qty = Number(value);
    if (isNaN(qty) || qty <= 0) return;
    const finalQty = Math.min(qty, maxQty);
    setSelectedProductsToReturn(prev => 
      prev.map(item => item.product.id === prodId ? { ...item, quantity: finalQty } : item)
    );
  };

  const submitSupplierReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductsToReturn.length === 0) {
      toast.error("অনুগ্রহ করে অন্তত একটি পণ্য সিলেক্ট করুন");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const returnDate = new Date().toISOString().split("T")[0];
      const batchId = "RET-" + Date.now().toString().slice(-6);

      for (const item of selectedProductsToReturn) {
        await damageInventory.add({
          productId: item.product.id,
          supplierId: returnSupplier,
          quantity: -Number(item.quantity), // Subtracting from damage balance
          price: item.product.cost || item.product.price || 0,
          date: returnDate,
          notes: `কোম্পানি রিটার্ন (ID: ${batchId}) - ${user?.email || "ম্যানেজার"}`,
          type: "supplier-return",
          batchId: batchId
        });
      }

      toast.success("কোম্পানি ড্যামেজ রিটার্ন সফলভাবে সম্পন্ন হয়েছে!");
      setShowReturnModal(false);
      setReturnSupplier("");
      setSelectedProductsToReturn([]);
    } catch (err) {
      console.error(err);
      toast.error("রিটার্ন এন্ট্রি সংরক্ষণ করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans" id="damage-management-view">
      {/* Title Header Section */}
      <div className="bg-white p-6 rounded-3xl border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">ড্যামেজ ও রিটার্ন ম্যানেজমেন্ট (Damage & Supplier Returns)</h2>
            <p className="text-xs text-slate-500 font-bold mt-1">সব ড্যামেজ আইটেম কোম্পানিকে ফেরত দেওয়া ও খতিয়ান ট্র্যাকিং</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowReturnModal(true)}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-md shadow-red-100 select-none active:scale-95 transition-all cursor-pointer"
        >
          <Truck className="w-4 h-4" />
          <span>নতুন কোম্পানি রিটার্ন এন্ট্রি</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "inventory" ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
          }`}
        >
          ড্যামেজ স্টক ইনভেন্টরি ({filteredDamageLedger.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "history" ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
          }`}
        >
          ইতিহাস ও লেজার হিস্ট্রি
        </button>
      </div>

      {activeTab === "inventory" ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filtering Controls */}
          <div className="bg-white p-4 rounded-3xl border flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="পণ্যের নাম বা SKU লিখুন..."
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-xs bg-slate-50/50 font-bold text-slate-800"
              />
            </div>
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-xs bg-white font-bold text-slate-800 outline-none sm:w-64"
            >
              <option value="">সকল কোম্পানি / সাপ্লায়ার</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* List Table with overflow scroll for mobile */}
          <div className="bg-white border rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-55 bg-slate-50 border-b text-slate-500 uppercase font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4">পণ্যের নাম</th>
                    <th className="px-6 py-4">SKU ও ক্যাটাগরি</th>
                    <th className="px-6 py-4">কোম্পানি</th>
                    <th className="px-6 py-4 text-center">বর্তমান ড্যামেজ পরিমাণ</th>
                    <th className="px-6 py-4 text-right">মূল্য (কেনা দাম)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                  {filteredDamageLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        কোনো ড্যামেজ স্টক পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDamageLedger.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="text-slate-900 font-black text-sm">{p.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{p.sku || "N/A"}</span>
                          <span className="ml-2 text-slate-400">{p.category || "General"}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-800">
                          {p.supplierName}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-extrabold font-mono border border-red-100">
                            {p.damageQty} {p.unit || "Pcs"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-900 font-black">
                          {formatCurrency((p.cost || p.price || 0) * p.damageQty)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* History & Ledger entries view */
        <div className="bg-white border rounded-3xl overflow-hidden shadow-xs animate-in fade-in duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-black tracking-wider uppercase">
                <tr>
                  <th className="px-6 py-4">তারিখ</th>
                  <th className="px-6 py-4">পণ্যের নাম</th>
                  <th className="px-6 py-4">লেনদেন প্রকার</th>
                  <th className="px-6 py-4 text-center">পরিমাণ</th>
                  <th className="px-6 py-4">মন্তব্য / বিবরণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      কোনো লেনদেন পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((tx, idx) => {
                    const isRet = Number(tx.quantity) < 0;
                    return (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900 font-black text-xs">{tx.productName}</div>
                          {tx.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {tx.sku}</span>}
                        </td>
                        <td className="px-6 py-4">
                          {isRet ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md text-[10px] font-black">
                              <Truck className="w-3 h-3" /> কোম্পানি রিটার্ন
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-650 border border-red-100 px-2 py-0.5 rounded-md text-[10px] font-black">
                              <AlertTriangle className="w-3 h-3" /> ড্যামেজ সংযোজন
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          <span className={isRet ? "text-amber-600 font-black text-sm" : "text-red-500 font-black text-sm"}>
                            {tx.quantity} {tx.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-medium max-w-[200px] truncate">
                          {tx.notes || (isRet ? "কোম্পানি ড্যামেজ রিটার্ন" : "রুট সেটেলমেন্টে প্রাপ্ত ড্যামেজ")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* supplier Return Entry Popup Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowReturnModal(false);
                setReturnSupplier("");
                setSelectedProductsToReturn([]);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="বন্ধ করুন"
            >
              &times;
            </button>

            <h3 className="text-lg font-black text-slate-900 border-b pb-3 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-red-600" />
              <span>কোম্পানি ড্যামেজ রিটার্ন এন্ট্রি (Supplier Return Form)</span>
            </h3>

            <form onSubmit={submitSupplierReturn} className="space-y-4">
              {/* Select Supplier */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">কোম্পানি / সাপ্লায়ার নির্বাচন করুন</label>
                <select
                  required
                  value={returnSupplier}
                  onChange={handleReturnSupplierChange}
                  className="w-full border rounded-xl p-3 text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">নির্বাচন করুন...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {returnSupplier && (
                <>
                  {/* Select Products via Search Auto-complete */}
                  <div className="border p-4 rounded-2xl bg-slate-50/50 space-y-3">
                    <label className="block text-xs font-black text-slate-600">পণ্য সার্চ করুন ও যোগ করুন</label>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="ড্যামেজকৃত পণ্যের নাম/SKU লিখে খুজুন..."
                      className="w-full border rounded-xl p-3 text-xs bg-white font-bold outline-none"
                    />

                    {/* search dropdown lists */}
                    {productSearch && (
                      <div className="border bg-white rounded-xl max-h-40 overflow-y-auto divide-y shadow-md">
                        {filteredReturnableProducts.length === 0 ? (
                          <p className="p-3 text-xs text-slate-400 text-center font-bold">এই কোম্পানির ড্যামেজ ব্যালেন্স আছে এমন কোনো পণ্য পাওয়া যায়নি</p>
                        ) : (
                          filteredReturnableProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addProductToReturnList(p)}
                              className="w-full text-left p-3 text-xs font-bold hover:bg-slate-50 flex justify-between items-center"
                            >
                              <div>
                                <span className="block font-black text-slate-900">{p.name}</span>
                                <span className="text-[10px] text-slate-400">SKU: {p.sku || "N/A"}</span>
                              </div>
                              <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[11px] font-black">
                                ড্যামেজ স্টক: {p.damageQty} {p.unit}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected products grid for quantity entry */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-850">ফেরতযোগ্য পণ্যের তালিকা:</h4>
                    {selectedProductsToReturn.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6 border-2 border-dashed rounded-2xl">উপরে পণ্য সার্চ করে ফেরত দেবার পণ্যের তালিকায় যোগ করুন।</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {selectedProductsToReturn.map(item => (
                          <div key={item.product.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-red-50/30 border border-red-100 rounded-2xl gap-3">
                            <div className="flex-1">
                              <span className="font-black text-slate-900 text-xs block">{item.product.name}</span>
                              <span className="text-[10px] text-red-600 font-bold">চলতি ড্যামেজ ব্যালেন্স: {item.product.damageQty} {item.product.unit || "Pcs"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-bold">ফেরত পরিমাণ:</span>
                              <input
                                type="number"
                                required
                                min="1"
                                max={item.product.damageQty}
                                value={item.quantity}
                                onChange={e => handleReturnQtyChange(item.product.id, e.target.value, item.product.damageQty)}
                                className="w-20 border rounded-lg p-1.5 text-center text-xs font-bold bg-white font-mono text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => removeProductFromReturnList(item.product.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnSupplier("");
                    setSelectedProductsToReturn([]);
                  }}
                  className="flex-1 border py-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-705"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn || selectedProductsToReturn.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
                >
                  {isSubmittingReturn ? "সংরক্ষণ হচ্ছে..." : "রিটার্ন সাবমিট দিন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
