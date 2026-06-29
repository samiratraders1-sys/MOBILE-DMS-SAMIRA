import React, { useState } from "react";
import { Package, Phone, MapPin, Search, Plus, Trash2, Edit2, X, ClipboardList, DollarSign, MessageSquare } from "lucide-react";
import { Supplier } from "../types";
import toast from "react-hot-toast";

interface SupplierManagementViewProps {
  suppliers: Supplier[];
  purchases: any[];
  payments: any[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<any>;
  updateSupplier: (id: string, supplier: Supplier) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  addPayment: (payment: any) => Promise<any>;
}

export default function SupplierManagementView({ suppliers, purchases, payments, addSupplier, updateSupplier, removeSupplier, addPayment }: SupplierManagementViewProps) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  const handleAddNote = async (note: string) => {
    if (!selectedSupplier) return;
    const updatedNotes = [...(selectedSupplier.notes || []), note];
    await updateSupplier(selectedSupplier.id, { ...selectedSupplier, notes: updatedNotes });
    setSelectedSupplier({ ...selectedSupplier, notes: updatedNotes });
    toast.success("নোট যোগ করা হয়েছে");
  };

  const supplierPurchases = purchases.filter(p => p.supplierId === selectedSupplier?.id);
  const supplierTransactions = payments.filter(p => p.supplierId === selectedSupplier?.id);

  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const supplierData = {
        name: formData.get("name") as string,
        contactDetails: {
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            address: formData.get("address") as string,
        },
        productCatalog: editingSupplier?.productCatalog || []
    };

    if (editingSupplier) {
        await updateSupplier(editingSupplier.id, { ...editingSupplier, ...supplierData });
        setEditingSupplier(null);
        toast.success("সাপ্লায়ার আপডেট হয়েছে");
    } else {
        await addSupplier(supplierData);
        setShowAdd(false);
        toast.success("নতুন সাপ্লায়ার যোগ করা হয়েছে");
    }
    form.reset();
  };

  const handleQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const paymentData = {
        amount: Number(formData.get("amount")),
        date: formData.get("date"),
        description: formData.get("description"),
        type: "out",
        category: "Supplier Payment",
        supplierId: selectedSupplierForPayment.id,
    };

    await addPayment(paymentData);
    toast.success("পেমেন্ট সফলভাবে যোগ করা হয়েছে");
    setShowPaymentModal(false);
    setSelectedSupplierForPayment(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">বিক্রেতা ব্যবস্থাপনা (Vendor Management)</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <Plus size={18}/> বিক্রেতা যোগ করুন
        </button>
      </div>

      <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
          <input type="text" placeholder="বিক্রেতা খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" />
      </div>

      { (showAdd || editingSupplier) && (
          <form onSubmit={handleAddOrUpdate} className="bg-gray-50 p-6 rounded-2xl space-y-4 border">
              <input name="name" defaultValue={editingSupplier?.name} placeholder="নাম" className="w-full p-2 border rounded-lg" required />
              <input name="phone" defaultValue={editingSupplier?.contactDetails.phone} placeholder="ফোন" className="w-full p-2 border rounded-lg" required />
              <input name="email" defaultValue={editingSupplier?.contactDetails.email} placeholder="ইমেইল" className="w-full p-2 border rounded-lg" />
              <input name="address" defaultValue={editingSupplier?.contactDetails.address} placeholder="ঠিকানা" className="w-full p-2 border rounded-lg" />
              <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">সেভ করুন</button>
                  <button type="button" onClick={() => { setShowAdd(false); setEditingSupplier(null); }} className="bg-gray-200 px-4 py-2 rounded-lg font-bold">বাতিল</button>
              </div>
          </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{supplier.name}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingSupplier(supplier)} className="text-blue-600"><Edit2 size={16}/></button>
                        <button onClick={() => removeSupplier(supplier.id)} className="text-rose-600"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {supplier.contactDetails.phone}</p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setSelectedSupplier(supplier)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-sm font-bold py-2 rounded-lg">বিস্তারিত</button>
                    <button onClick={() => { setSelectedSupplierForPayment(supplier); setShowPaymentModal(true); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg">Quick Pay</button>
                  </div>
              </div>
          ))}
      </div>

      {showPaymentModal && selectedSupplierForPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <form onSubmit={handleQuickPay} className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4">
                  <h2 className="text-xl font-bold">পেমেন্ট এন্ট্রি: {selectedSupplierForPayment.name}</h2>
                  <input name="amount" type="number" placeholder="পরিমাণ" className="w-full p-2 border rounded-lg" required />
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg" required />
                  <input name="description" placeholder="বিবরণ" className="w-full p-2 border rounded-lg" />
                  <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold">পেমেন্ট সেভ করুন</button>
                      <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg font-bold">বাতিল</button>
                  </div>
              </form>
          </div>
      )}

      {selectedSupplier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">{selectedSupplier.name}</h2>
                    <button onClick={() => setSelectedSupplier(null)}><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2"><ClipboardList size={18}/> পণ্য ক্যাটালগ ({selectedSupplier.productCatalog.length})</h3>
                    {selectedSupplier.productCatalog.map((product, idx) => (
                        <div key={idx} className="flex justify-between border-b py-2 text-sm">
                            <span>{product.productName}</span>
                            <span>{product.currentPrice} টাকা</span>
                        </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2"><Package size={18}/> ক্রয় ইতিহাস (Purchase History) ({supplierPurchases.length})</h3>
                    {supplierPurchases.map((p, idx) => (
                        <div key={idx} className="flex justify-between border-b py-2 text-sm">
                            <span>{new Date(p.date).toLocaleDateString()}</span>
                            <span>{p.totalAmount} টাকা</span>
                        </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2"><DollarSign size={18}/> লেনদেন (Transaction History) ({supplierTransactions.length})</h3>
                    {supplierTransactions.map((t, idx) => (
                        <div key={idx} className="flex justify-between border-b py-2 text-sm">
                            <span>{new Date(t.date).toLocaleDateString()}</span>
                            <span>{t.amount} টাকা</span>
                        </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> যোগাযোগ (Communications)</h3>
                    <div className="space-y-2">
                        {selectedSupplier.notes?.map((note, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded text-sm">{note}</div>
                        ))}
                        <div className="flex gap-2">
                            <input type="text" id="newNote" placeholder="নতুন নোট..." className="flex-1 p-2 border rounded-lg text-sm" />
                            <button onClick={() => {
                                const input = document.getElementById("newNote") as HTMLInputElement;
                                if (input.value) {
                                    handleAddNote(input.value);
                                    input.value = "";
                                }
                            }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">যোগ করুন</button>
                        </div>
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

