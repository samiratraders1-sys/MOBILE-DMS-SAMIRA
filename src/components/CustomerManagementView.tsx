import React, { useState } from "react";
import { User, Phone, MapPin, Search, Plus, Trash2, Edit2 } from "lucide-react";
import { Customer } from "../types";
import toast from "react-hot-toast";

interface CustomerManagementViewProps {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<any>;
  updateCustomer: (id: string, customer: Customer) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
}

export default function CustomerManagementView({ customers, addCustomer, updateCustomer, removeCustomer }: CustomerManagementViewProps) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const customerData = {
        name: formData.get("name") as string,
        contactDetails: {
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            address: formData.get("address") as string,
        },
        orderHistory: editingCustomer?.orderHistory || [],
        deliveryPreferences: {
            preferredTime: formData.get("preferredTime") as string,
            deliveryInstructions: formData.get("deliveryInstructions") as string,
        }
    };

    if (editingCustomer) {
        await updateCustomer(editingCustomer.id, { ...editingCustomer, ...customerData });
        setEditingCustomer(null);
        toast.success("কাস্টমার আপডেট হয়েছে");
    } else {
        await addCustomer(customerData);
        setShowAdd(false);
        toast.success("নতুন কাস্টমার যোগ করা হয়েছে");
    }
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">কাস্টমার ম্যানেজমেন্ট</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <Plus size={18}/> কাস্টমার যোগ করুন
        </button>
      </div>

      <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
          <input type="text" placeholder="কাস্টমার খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" />
      </div>

      { (showAdd || editingCustomer) && (
          <form onSubmit={handleAddOrUpdate} className="bg-gray-50 p-6 rounded-2xl space-y-4 border">
              <input name="name" defaultValue={editingCustomer?.name} placeholder="নাম" className="w-full p-2 border rounded-lg" required />
              <input name="phone" defaultValue={editingCustomer?.contactDetails?.phone || editingCustomer?.phone || ""} placeholder="ফোন" className="w-full p-2 border rounded-lg" required />
              <input name="email" defaultValue={editingCustomer?.contactDetails?.email || ""} placeholder="ইমেইল" className="w-full p-2 border rounded-lg" />
              <input name="address" defaultValue={editingCustomer?.contactDetails?.address || editingCustomer?.address || ""} placeholder="ঠিকানা" className="w-full p-2 border rounded-lg" />
              <input name="preferredTime" defaultValue={editingCustomer?.deliveryPreferences?.preferredTime || ""} placeholder="পছন্দসই সময়" className="w-full p-2 border rounded-lg" />
              <input name="deliveryInstructions" defaultValue={editingCustomer?.deliveryPreferences?.deliveryInstructions || ""} placeholder="ডেলিভারি নির্দেশনাবলী" className="w-full p-2 border rounded-lg" />
              <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">সেভ করুন</button>
                  <button type="button" onClick={() => { setShowAdd(false); setEditingCustomer(null); }} className="bg-gray-200 px-4 py-2 rounded-lg font-bold">বাতিল</button>
              </div>
          </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
              <div key={customer.id} className="bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingCustomer(customer)} className="text-blue-600"><Edit2 size={16}/></button>
                        <button onClick={() => removeCustomer(customer.id)} className="text-rose-600"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {customer.contactDetails?.phone || customer.phone || "ফোন নম্বর নেই"}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin size={14}/> {customer.contactDetails?.address || customer.address || "ঠিকানা নেই"}</p>
              </div>
          ))}
      </div>
    </div>
  );
}
