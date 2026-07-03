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
        company: formData.get("company") as string,
        mobile: formData.get("phone") as string,
        address: formData.get("address") as string,
        paymentTerms: formData.get("paymentTerms") as string,
        claimPolicy: formData.get("claimPolicy") as string,
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
          <form onSubmit={handleAddOrUpdate} className="bg-white p-6 rounded-2xl space-y-4 border shadow-sm max-w-xl">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
                  {editingSupplier ? "বিক্রেতা তথ্য পরিবর্তন করুন" : "নতুন বিক্রেতা যোগ করুন"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">সাপ্লায়ারের নাম *</label>
                      <input name="name" defaultValue={editingSupplier?.name} placeholder="সাপ্লায়ারের নাম" className="w-full p-2.5 border rounded-xl text-sm" required />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">কোম্পানির নাম</label>
                      <input name="company" defaultValue={editingSupplier?.company} placeholder="কোম্পানি বা ব্র্যান্ডের নাম" className="w-full p-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">মোবাইল নম্বর *</label>
                      <input name="phone" defaultValue={editingSupplier?.mobile || editingSupplier?.contactDetails?.phone || ""} placeholder="মোবাইল নম্বর" className="w-full p-2.5 border rounded-xl text-sm" required />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ইমেইল</label>
                      <input name="email" type="email" defaultValue={editingSupplier?.contactDetails?.email || ""} placeholder="ইমেইল" className="w-full p-2.5 border rounded-xl text-sm" />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ঠিকানা</label>
                      <input name="address" defaultValue={editingSupplier?.address || editingSupplier?.contactDetails?.address || ""} placeholder="ঠিকানা" className="w-full p-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">পেমেন্ট শর্তাবলী (Payment Terms)</label>
                      <input name="paymentTerms" defaultValue={editingSupplier?.paymentTerms} placeholder="যেমন: ১৫ দিন ক্রেডিট, ক্যাশ ইত্যাদি" className="w-full p-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">দাবি পলিসি (Claim Policy)</label>
                      <input name="claimPolicy" defaultValue={editingSupplier?.claimPolicy} placeholder="যেমন: ড্যামেজ পণ্য রিটার্নযোগ্য" className="w-full p-2.5 border rounded-xl text-sm" />
                  </div>
              </div>
              <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm transition">সেভ করুন</button>
                  <button type="button" onClick={() => { setShowAdd(false); setEditingSupplier(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm transition">বাতিল</button>
              </div>
          </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
                  <div>
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <h3 className="font-bold text-lg text-gray-950">{supplier.name}</h3>
                              {supplier.company && (
                                  <span className="inline-block mt-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold">
                                      🏢 {supplier.company}
                                  </span>
                              )}
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => setEditingSupplier(supplier)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"><Edit2 size={16}/></button>
                              <button onClick={() => removeSupplier(supplier.id)} className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"><Trash2 size={16}/></button>
                          </div>
                      </div>
                      
                      <div className="space-y-1.5 my-3 text-sm text-gray-600">
                          <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> <b>মোবাইল:</b> {supplier.mobile || supplier.contactDetails?.phone || ""}</p>
                          {(supplier.address || supplier.contactDetails?.address) && (
                              <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> <b>ঠিকানা:</b> {supplier.address || supplier.contactDetails?.address || ""}</p>
                          )}
                          {supplier.paymentTerms && (
                              <p className="text-xs bg-gray-50 p-2 rounded-xl border border-gray-100">
                                  <b>💳 পেমেন্ট শর্তাবলী:</b> {supplier.paymentTerms}
                              </p>
                          )}
                          {supplier.claimPolicy && (
                              <p className="text-xs bg-gray-50 p-2 rounded-xl border border-gray-100">
                                  <b>📋 দাবি পলিসি (Claim):</b> {supplier.claimPolicy}
                              </p>
                          )}
                      </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                      <button onClick={() => setSelectedSupplier(supplier)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] text-sm font-bold py-2.5 rounded-xl transition">বিস্তারিত</button>
                      <button onClick={() => { setSelectedSupplierForPayment(supplier); setShowPaymentModal(true); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition">Quick Pay</button>
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

