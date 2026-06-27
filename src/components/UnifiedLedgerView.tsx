import React, { useState, useMemo } from "react";
import { Plus, Search, User, CreditCard, FileText, CheckCircle } from "lucide-react";

interface LedgerProps {
  customers: any[];
  suppliers: any[];
  staff: any[];
  payments: any[];
  purchases: any[];
  summaries: any[];
}

export default function UnifiedLedgerView({ customers, suppliers, staff, payments, purchases, summaries }: LedgerProps) {
  const [activeTab, setActiveTab] = useState<"customer" | "supplier" | "staff">("customer");
  const [activeEntityId, setActiveEntityId] = useState("");
  const [editMode, setEditMode] = useState<'statement' | 'history' | 'payment'>('statement');
  const [paymentAmount, setPaymentAmount] = useState("");

  const entities = useMemo(() => {
    switch (activeTab) {
      case "customer": return customers;
      case "supplier": return suppliers;
      case "staff": return staff;
      default: return [];
    }
  }, [activeTab, customers, suppliers, staff]);

  const activeEntity = entities.find(e => e.id === activeEntityId);
  
  const entityPayments = useMemo(() => {
    return payments.filter(p => p.entityId === activeEntityId);
  }, [payments, activeEntityId]);

  const balance = useMemo(() => {
    if (!activeEntity) return 0;
    return Number(activeEntity.balance || 0);
  }, [activeEntity]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">লেজার, পেমেন্ট ও স্টেটমেন্ট</h2>
      
      <div className="flex gap-2 p-1 bg-white border rounded-xl w-fit">
        {(["customer", "supplier", "staff"] as const).map(t => (
          <button 
            key={t}
            onClick={() => { setActiveTab(t); setActiveEntityId(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === t ? 'bg-black text-white' : 'text-gray-600'}`}
          >
            {t === 'customer' ? 'কাস্টমার' : t === 'supplier' ? 'সাপ্লায়ার' : 'ডিএসআর/স্টাফ'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 bg-white p-4 rounded-xl border h-[60vh] overflow-y-auto">
            {entities.map(e => (
                <button 
                    key={e.id}
                    onClick={() => { setActiveEntityId(e.id); setEditMode('statement'); }}
                    className={`w-full text-left p-3 rounded-lg mb-1 ${activeEntityId === e.id ? 'bg-indigo-50 font-bold' : 'hover:bg-gray-50'}`}
                >
                    {e.name}
                </button>
            ))}
        </div>

        <div className="col-span-3 bg-white p-6 rounded-2xl border min-h-[60vh]">
            {activeEntity ? (
                <>
                    <h3 className="text-xl font-bold mb-4">{activeEntity.name}</h3>
                    <div className="flex gap-4 mb-6 border-b pb-2">
                        {(['statement', 'history', 'payment'] as const).map(m => (
                            <button key={m} onClick={() => setEditMode(m)} className={`px-4 py-2 font-bold text-sm ${editMode === m ? 'border-b-2 border-black' : ''}`}>
                                {m === 'statement' ? 'স্টেটমেন্ট' : m === 'history' ? 'হিস্ট্রি' : 'পেমেন্ট'}
                            </button>
                        ))}
                    </div>
                    
                    {editMode === 'statement' && (
                        <div className="p-6 bg-gray-50 rounded-2xl border text-center">
                            <p className="text-sm font-bold text-gray-500 uppercase">বর্তমান ব্যালেন্স</p>
                            <p className={`text-4xl font-extrabold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{balance.toFixed(2)} ৳</p>
                        </div>
                    )}
                    
                    {editMode === 'history' && (
                         <table className="w-full text-sm">
                             <thead className="text-gray-500 font-bold uppercase text-xs">
                                 <tr>
                                     <th className="p-3 text-left">তারিখ</th>
                                     <th className="p-3 text-right">পরিমাণ</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y">
                                 {entityPayments.map(p => (
                                     <tr key={p.id}>
                                         <td className="p-3">{p.date}</td>
                                         <td className="p-3 text-right font-bold">{Number(p.amount).toFixed(2)} ৳</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    )}
                    
                    {editMode === 'payment' && (
                        <div className="flex gap-4 items-center">
                            <input 
                                type="number" 
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                placeholder="পেমেন্টের পরিমাণ..."
                                className="flex-1 p-3 border rounded-xl"
                            />
                            <button className="px-6 py-3 bg-black text-white rounded-xl font-bold flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> পেমেন্ট জমা দিন
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400">একটি এনটিটি নির্বাচন করুন</div>
            )}
        </div>
      </div>
    </div>
  );
}
