import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { GRANULAR_PERMISSIONS } from './GranularPermissionEditor';

interface RolesProps {
  roles: any[];
  add: (role: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export default function RolesView({ roles, add, remove }: RolesProps) {
  const [roleName, setRoleName] = useState("");
  const [allowedViews, setAllowedViews] = useState<string[]>([]);

  const views = [
    { id: "dashboard", label: "ড্যাশবোর্ড" },
    { id: "pos", label: "নতুন বিক্রয় (POS)" },
    { id: "subdb", label: "সাব-ডিবি ও চালানপত্র" },
    { id: "finance", label: "ডাইরেক্ট ইনকাম + খরচ (ফিন্যান্স)" },
    { id: "inventory", label: "ইনভেন্টরি" },
    { id: "purchase", label: "ক্রয় এন্ট্রি" },
    { id: "sales", label: "সেলস হিস্ট্রি" },
    { id: "ledger", label: "লেজার ও স্টেটমেন্ট" },
    { id: "users", label: "ইউজার এবং পারমিশন" },
    { id: "settings", label: "সেটিংস" },
    { id: "reports", label: "বিজনেস রিপোর্ট" },
    { id: "pnl", label: "লাভ-ক্ষতি (P&L)" },
    { id: "routes", label: "রোড সমূহ" },
    { id: "customers", label: "কাস্টমার" },
    { id: "suppliers", label: "সাপ্লায়ার" },
    { id: "staff", label: "স্টাফ" },
    { id: "loadsheet", label: "লোডশিট" },
    { id: "settle", label: "মার্কেট সেটেলমেন্ট" },
    { id: "orders", label: "অর্ডারস" },
    { id: "admin-approvals", label: "অ্যাডমিন অনুমোদন" },
    { id: "damage-mgmt", label: "ড্যামেজ ও কোম্পানি রিটার্ন" },
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;
    await add({ name: roleName, allowedViews, createdAt: new Date().toISOString() });
    setRoleName("");
    setAllowedViews([]);
  };

  const toggleView = (viewId: string) => {
    setAllowedViews(prev => 
      prev.includes(viewId) ? prev.filter(v => v !== viewId) : [...prev, viewId]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">রোল এবং পারমিশন কনফিগারেশন</h2>
      
      <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">রোল নাম</label>
          <input 
            value={roleName} 
            onChange={e => setRoleName(e.target.value)} 
            className="border p-2.5 rounded-xl w-full text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="যেমন: manager, sr, dsr, admin" 
            required 
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { label: "SR (এসআর)", value: "sr", views: ['orders', 'sr-order-list', 'inventory'] },
              { label: "DSR (ডিএসআর)", value: "dsr", views: ['dsr-portal'] },
              { label: "Manager (ম্যানেজার)", value: "manager", views: ['dashboard', 'inventory', 'purchase', 'sales', 'settle', 'finance', 'pos', 'customers', 'loadsheet'] },
              { label: "Admin (অ্যাডমিন)", value: "admin", views: ['dashboard', 'inventory', 'purchase', 'sales', 'settle', 'ledger', 'finance', 'users', 'roles', 'settings', 'reports', 'routes', 'route-optimization', 'staff', 'customers', 'suppliers', 'orders', 'sr-order-list', 'loadsheet', 'admin-approvals'] }
            ].map(r => (
              <button
                type="button"
                key={r.value}
                onClick={() => {
                  setRoleName(r.value);
                  setAllowedViews(r.views);
                }}
                className="px-3 py-1 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all border border-gray-300 flex items-center gap-1 cursor-pointer"
              >
                ⚡ {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">পারমিশন (ভিউ)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {views.map(v => (
              <label key={v.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={allowedViews.includes(v.id)} onChange={() => toggleView(v.id)} />
                {v.label}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white p-2 px-4 rounded flex items-center gap-1 font-bold">
          <Plus className="w-4 h-4" /> রোল যোগ করুন
        </button>
      </form>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 uppercase">
            <tr>
              <th className="px-6 py-4">রোল নাম</th>
              <th className="px-6 py-4">পারমিশন</th>
              <th className="px-6 py-4">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roles.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-bold">{r.name}</td>
                <td className="px-6 py-4 text-gray-600">{r.allowedViews?.join(', ')}</td>
                <td className="px-6 py-4">
                  <button onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden p-6 mt-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Permission Overview (পারমিশন ওভারভিউ)
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border text-left">পারমিশন</th>
                  {roles.map(r => <th key={r.id} className="p-3 border">{r.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {GRANULAR_PERMISSIONS.map(p => (
                  <tr key={p.id}>
                    <td className="p-3 border font-medium">{p.label}</td>
                    {roles.map(r => (
                      <td key={r.id} className="p-3 border text-center">
                        {r.granularPermissions?.includes(p.id) ? <span className="text-green-600 font-bold">✅</span> : <span className="text-gray-300">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
