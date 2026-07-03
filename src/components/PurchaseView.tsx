import React, { useState } from "react";
import { Plus, Search, Trash2, Pencil, X } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import { recordStockMovement } from "../lib/inventoryEngine";
import { useFormAutoSave } from "../hooks/useFormAutoSave";
import { useConfirm } from "../context/ConfirmContext";

interface PurchaseViewProps {
  products: any[];
  suppliers: any[];
  addPurchase: (purchase: any) => void;
  updateProduct: (id: string, product: any) => void;
  addPayment: (payment: any) => void;
  purchases?: any[];
  removePurchase?: (id: string) => Promise<void>;
  updatePurchase?: (id: string, purchase: any) => Promise<void>;
}

export default function PurchaseView({ 
  products, 
  suppliers, 
  addPurchase, 
  updateProduct, 
  addPayment,
  purchases = [],
  removePurchase,
  updatePurchase
}: PurchaseViewProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Auto-save form values to IndexedDB
  const formStateToSave = React.useMemo(() => ({
    selectedSupplier,
    items,
    invoiceId,
    date,
    paidAmount
  }), [selectedSupplier, items, invoiceId, date, paidAmount]);

  const { saveStatus, clearState } = useFormAutoSave(
    "purchase-form",
    formStateToSave,
    (saved) => {
      if (saved.selectedSupplier !== undefined) setSelectedSupplier(saved.selectedSupplier);
      if (saved.items !== undefined) setItems(saved.items);
      if (saved.invoiceId !== undefined) setInvoiceId(saved.invoiceId);
      if (saved.date !== undefined) setDate(saved.date);
      if (saved.paidAmount !== undefined) setPaidAmount(saved.paidAmount);
    }
  );

  // Edit States
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editInvoiceId, setEditInvoiceId] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editItems, setEditItems] = useState<any[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { confirmDelete } = useConfirm();

  const filteredProducts = products.filter(p => p.supplierId === selectedSupplier);

  const addProduct = (product: any) => {
    setItems([...items, { 
        ...product, 
        carton: 0, 
        pieces: 0, 
        piecesInCarton: product.piecesInCarton || product.cartoonSize || 1, 
        purchasePrice: product.cost || 0 
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const submit = async () => {
    if (!selectedSupplier) {
        toast.error("সাপ্লায়ার নির্বাচন করুন!");
        return;
    }
    const total = items.reduce((acc, item) => 
        acc + (((item.carton || 0) * (item.piecesInCarton || 1) + (item.pieces || 0)) * item.purchasePrice), 
    0);
    
    console.log("Submitting purchase:", { invoiceId, total, items });
    
    await addPurchase({
      date,
      invoiceId,
      items,
      total,
      supplierId: selectedSupplier
    });

    if (paidAmount > 0) {
        console.log("Adding payment:", { selectedSupplier, paidAmount });
        await addPayment({
            date,
            entityId: selectedSupplier,
            amount: paidAmount,
            type: 'out',
            note: `Purchase Invoice: ${invoiceId}`
        });
    }

    // Update inventory
    for (const item of items) {
        const totalPurchased = (item.carton || 0) * (item.piecesInCarton || 1) + (item.pieces || 0);
        console.log(`Updating product ${item.id}: adding ${totalPurchased} to inventory`);
        await recordStockMovement(item.id, 'PURCHASE', totalPurchased, invoiceId);
    }

    setItems([]);
    setInvoiceId("");
    setPaidAmount(0);
    await clearState();
    toast.success("পণ্য ক্রয় ও পেমেন্ট সফল হয়েছে!");
  };

  const getLineTotal = (item: any) => (((item.carton || 0) * (item.piecesInCarton || 1) + (item.pieces || 0)) * item.purchasePrice);
  const grandTotal = items.reduce((acc, item) => acc + getLineTotal(item), 0);

  // Delete Action for Purchase Invoice
  const handleDeletePurchase = (purchase: any) => {
    confirmDelete({
      recordName: `ক্রয় বিল #${purchase.invoiceId || purchase.id.slice(0,6)}`,
      onConfirm: async () => {
        try {
          // Revert product stocks (record a negative movement)
          for (const item of purchase.items || []) {
            const prodId = item.id || item.productId;
            if (prodId) {
              const qty = ((Number(item.carton) || 0) * (Number(item.piecesInCarton) || 1) + (Number(item.pieces) || 0));
              await recordStockMovement(prodId, 'RETURN', -qty, purchase.id);
            }
          }

          if (removePurchase) {
            await removePurchase(purchase.id);
            toast.success("ক্রয় বিল সফলভাবে ডিলিট করা হয়েছে!");
          }
        } catch (err: any) {
          console.error(err);
          toast.error("ক্রয় বিল ডিলিট করতে সমস্যা হয়েছে: " + err.message);
          throw err;
        }
      }
    });
  };

  // Start Edit Mode
  const handleStartEditPurchase = (purchase: any) => {
    setEditingPurchase(purchase);
    setEditDate(purchase.date || new Date().toISOString().slice(0, 10));
    setEditInvoiceId(purchase.invoiceId || "");
    setEditSupplierId(purchase.supplierId || "");
    setEditItems(
      (purchase.items || []).map((item: any) => ({
        ...item,
        productId: item.productId || item.id,
        id: item.productId || item.id,
        piecesInCarton: item.piecesInCarton || products.find(p => p.id === (item.productId || item.id))?.piecesInCarton || 1,
        purchasePrice: item.purchasePrice || item.cost || 0
      }))
    );
  };

  // Add item inside edit state
  const handleAddProductToEditPurchase = (productId: string) => {
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
        carton: 0,
        pieces: 1,
        piecesInCarton: prod.piecesInCarton || 1,
        purchasePrice: prod.cost || 0
      }
    ]);
    setSelectedAddProductId("");
  };

  // Update item inside edit state
  const handleUpdateEditItem = (index: number, field: string, value: any) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

  // Save Edit Function
  const handleSaveEditPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || !updatePurchase || isSaving) return;

    if (editItems.length === 0) {
      toast.error("ক্রয় বিলে অন্তত একটি আইটেম থাকতে হবে!");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Revert previous stock increase
      for (const oldItem of editingPurchase.items || []) {
        const prodId = oldItem.id || oldItem.productId;
        if (prodId) {
          const qty = ((Number(oldItem.carton) || 0) * (Number(oldItem.piecesInCarton) || 1) + (Number(oldItem.pieces) || 0));
          await recordStockMovement(prodId, 'RETURN', -qty, editingPurchase.id);
        }
      }

      // 2. Apply new stock increase
      for (const newItem of editItems) {
        const prodId = newItem.id || newItem.productId;
        if (prodId) {
          const qty = ((Number(newItem.carton) || 0) * (Number(newItem.piecesInCarton) || 1) + (Number(newItem.pieces) || 0));
          await recordStockMovement(prodId, 'PURCHASE', qty, editingPurchase.id);
        }
      }

      // 3. Recalculate bill total
      const newTotal = editItems.reduce(
        (sum, item) => sum + (((Number(item.carton) || 0) * (Number(item.piecesInCarton) || 1) + (Number(item.pieces) || 0)) * Number(item.purchasePrice || 0)),
        0
      );

      // 4. Save to firebase
      await updatePurchase(editingPurchase.id, {
        ...editingPurchase,
        date: editDate,
        invoiceId: editInvoiceId,
        supplierId: editSupplierId,
        items: editItems,
        total: newTotal
      });

      toast.success("ক্রয় বিল সফলভাবে আপডেট করা হয়েছে!");
      setEditingPurchase(null);
    } catch (err: any) {
      console.error(err);
      toast.error("আপডেট করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
        নতুন পণ্য ক্রয়
        {saveStatus === "saving" && (
          <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            অটো-সেভ হচ্ছে...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs font-normal text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            অটো-সেভ সক্রিয়
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs font-normal text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            অটো-সেভ ত্রুটি
          </span>
        )}
      </h2>
      
      <div className="bg-white p-6 rounded-2xl border flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">সাপ্লায়ার সিলেকশন</label>
          <select className="w-full border rounded-xl p-3 bg-white" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
            <option value="">সাপ্লায়ার নির্বাচন করুন</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">ইনভয়েস নম্বর</label>
          <input className="w-full border rounded-xl p-3" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">তারিখ</label>
          <input type="date" className="w-full border rounded-xl p-3" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {selectedSupplier && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border">
            <h3 className="font-bold mb-4">পণ্য তালিকা</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input 
                className="w-full pl-10 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-black outline-none bg-gray-50 focus:bg-white transition-all" 
                placeholder="পণ্য খুঁজুন..." 
                value={search}
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => addProduct(p)}
                  className="p-3 border rounded-xl flex justify-between items-center cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-all border-gray-100 bg-white shadow-xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                    <div className="text-[11px] font-semibold text-gray-500 mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>স্টক: <span className={p.stock <= 5 ? "text-rose-600 font-extrabold" : "text-gray-950 font-bold"}>{p.stock || 0} পিস</span></span>
                      <span>|</span>
                      <span>কার্টুন সাইজ: <span className="text-gray-950 font-bold">{p.piecesInCarton || p.cartoonSize || p.cartoonQty || p.piecesInCarton || 1} পিস</span></span>
                      <span>|</span>
                      <span>কেনা রেট: <span className="text-emerald-700 font-bold font-mono">{formatCurrency(p.cost || p.price || 0)}</span></span>
                    </div>
                  </div>
                  <div className="p-1 px-3 bg-black text-white text-xs font-black rounded-lg hover:bg-gray-800 flex items-center gap-1 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> যোগ করুন
                  </div>
                </div>
              ))}
              {filteredProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">কোন পণ্য পাওয়া যায়নি</p>
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border">
            <h3 className="font-bold mb-4">ক্রয় তালিকা (Cart)</h3>
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="flex-1 text-sm">{item.name}</span>
                  <div className="flex gap-1 w-32">
                    <input type="number" placeholder="Carton" className="w-1/2 border rounded-lg p-2 text-xs" value={item.carton || 0} onChange={e => updateItem(i, 'carton', Number(e.target.value))} />
                    <input type="number" placeholder="Piece" className="w-1/2 border rounded-lg p-2 text-xs" value={item.pieces || 0} onChange={e => updateItem(i, 'pieces', Number(e.target.value))} />
                  </div>
                  <input type="number" className="w-20 border rounded-lg p-2 text-xs" value={item.purchasePrice} onChange={e => updateItem(i, 'purchasePrice', Number(e.target.value))} />
                  <span className="w-24 text-sm font-bold text-right">{formatCurrency(getLineTotal(item))}</span>
                  <button className="p-2 text-red-500" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-6 pt-6 border-t font-bold text-lg flex flex-col gap-4">
                <div className="flex justify-between">
                    <span>মোট ভ্যালু:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm">পেইড অ্যামাউন্ট:</span>
                    <input type="number" className="border rounded-xl p-2 w-full" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} />
                </div>
              </div>
            )}
            {items.length > 0 && (
              <button className="w-full mt-4 bg-black text-white p-3 rounded-xl font-bold" onClick={submit}>পণ্য ক্রয় জমা করুন</button>
            )}
          </div>
        </div>
      )}

      {/* previous purchase history bills */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-950">📦 বিগত পারচেজ বিলসমূহ (Purchase Bills History)</h3>
            <p className="text-gray-400 text-xs mt-1">সাপ্লায়ার অনুযায়ী ক্রয়ের বিগত ইতিহাস ও কালেকশন তথ্য</p>
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-bold">
            📭 এখন পর্যন্ত কোনো ক্রয়ের বিল এন্ট্রি করা হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#F8F9FA] text-[10px] uppercase font-bold text-[#ADB5BD] border-b">
                <tr>
                  <th className="px-6 py-4">তারিখ</th>
                  <th className="px-6 py-4">ইনভয়েস নং</th>
                  <th className="px-6 py-4">সাপ্লায়ারের নাম</th>
                  <th className="px-6 py-4">ক্রয়কৃত আইটেম বিবরণ</th>
                  <th className="px-6 py-4 text-right">মোট টাকা</th>
                  <th className="px-6 py-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {purchases.map((p) => {
                  const sName = suppliers.find(s => s.id === p.supplierId)?.name || p.supplierId || "অজানা সাপ্লায়ার";
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold whitespace-nowrap">{p.date}</td>
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">{p.invoiceId || "N/A"}</td>
                      <td className="px-6 py-4 font-black text-indigo-950">{sName}</td>
                      <td className="px-6 py-4 text-xs max-w-xs truncate">
                        {p.items && p.items.map((i: any) => `${i.name} (${((i.carton || 0) * (i.piecesInCarton || 1) + (i.pieces || 0))} পিস)`).join(", ")}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-950 font-mono">{formatCurrency(p.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          {updatePurchase && (
                            <button 
                              onClick={() => handleStartEditPurchase(p)}
                              className="p-1 px-1.5 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="সম্পাদনা করুন (Edit)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {removePurchase && (
                            <button 
                              onClick={() => handleDeletePurchase(p)} 
                              className="p-1 px-1.5 text-gray-400 hover:text-red-650 hover:bg-rose-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Invoice Edit Overlay */}
      {editingPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl border border-gray-100 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-black text-gray-905">ক্রয় ইনভয়েস সম্পাদনা (Edit Purchase Bill)</h3>
              <button onClick={() => setEditingPurchase(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPurchase} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">তারিখ</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} required className="w-full border rounded-xl p-2.5 font-medium whitespace-nowrap text-xs bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ইনভয়েস নম্বর</label>
                  <input value={editInvoiceId} onChange={e => setEditInvoiceId(e.target.value)} required className="w-full border rounded-xl p-2.5 text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">সাপ্লায়ার</label>
                <select value={editSupplierId} onChange={e => setEditSupplierId(e.target.value)} required className="w-full border rounded-xl p-2.5 bg-white text-xs font-bold">
                  <option value="">সাপ্লায়ার নির্বাচন করুন</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Items Table in Cart */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-xs text-gray-750 uppercase">ক্রয়কৃত আইটেম তালিকা</h4>
                  
                  {/* Select product to insert in Edit Purchase */}
                  <select
                    value={selectedAddProductId}
                    onChange={e => {
                      setSelectedAddProductId(e.target.value);
                      if (e.target.value) handleAddProductToEditPurchase(e.target.value);
                    }}
                    className="border border-gray-250 rounded-xl p-1 bg-white text-[11px] font-bold"
                  >
                    <option value="">+ নতুন পণ্য যোগ করুন</option>
                    {products.filter(prod => prod.supplierId === (editSupplierId || selectedSupplier)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (কার্টুন সাইজ: {p.piecesInCarton || p.cartoonSize || 1} পিস)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs">
                      <span className="flex-1 font-bold text-gray-900">{item.name}</span>
                      <div className="flex gap-1.5 w-40 items-center justify-end">
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-400 uppercase">কার্টুন:</label>
                          <input 
                            type="number" 
                            placeholder="Carton" 
                            value={item.carton || 0} 
                            onChange={e => handleUpdateEditItem(index, "carton", Number(e.target.value))} 
                            className="w-11 border rounded bg-white p-1 text-center font-mono text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-400 uppercase">পিস:</label>
                          <input 
                            type="number" 
                            placeholder="Piece" 
                            value={item.pieces || 0} 
                            onChange={e => handleUpdateEditItem(index, "pieces", Number(e.target.value))} 
                            className="w-11 border rounded bg-white p-1 text-center font-mono text-xs font-bold"
                            min={0}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-gray-400 uppercase">ক্রয় দর:</label>
                        <input 
                          type="number" 
                          value={item.purchasePrice || 0} 
                          onChange={e => handleUpdateEditItem(index, "purchasePrice", Number(e.target.value))} 
                          className="w-20 border rounded bg-white p-1 text-right font-mono text-xs font-bold text-emerald-700"
                          min={0}
                        />
                      </div>

                      <span className="w-20 text-right font-bold text-gray-900 font-mono">
                        {formatCurrency(((Number(item.carton) || 0) * (Number(item.piecesInCarton) || 1) + (Number(item.pieces) || 0)) * Number(item.purchasePrice || 0))}
                      </span>

                      <button 
                        type="button" 
                        onClick={() => setEditItems(editItems.filter((_, idx) => idx !== index))} 
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center font-black text-base border-t pt-4 text-gray-950">
                <span>নতুন মোট বিল মূল্য:</span>
                <span className="text-zinc-950 font-mono">
                  {formatCurrency(editItems.reduce((sum, item) => sum + (((Number(item.carton) || 0) * (Number(item.piecesInCarton) || 1) + (Number(item.pieces) || 0)) * Number(item.purchasePrice || 0)), 0))}
                </span>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" disabled={isSaving} onClick={() => setEditingPurchase(null)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-gray-50 transition-colors">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-1 btn-primary py-3 font-black text-xs cursor-pointer flex items-center justify-center">
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : "বিলের তথ্য সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
