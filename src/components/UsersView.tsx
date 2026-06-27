import React, { useState } from 'react';
import { User, Plus, Trash2, Edit } from 'lucide-react';
import GranularPermissionEditor from './GranularPermissionEditor';

interface UsersProps {
  users: any[];
  staff: any[];
  roles: any[];
  add: (user: any) => Promise<void>;
  update: (id: string, user: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateRole: (id: string, role: any) => Promise<void>; // Added
}

export default function UsersView({ users, staff, roles, add, update, remove, updateRole }: UsersProps) {
  const [role, setRole] = useState(roles.length > 0 ? roles[0].name : "dsr");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<{id: string, permissions: string[]} | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !email) return;
    const staffMember = staff.find(s => s.id === selectedStaffId);
    if (!staffMember) return;

    const userData = { 
      name: staffMember.name, 
      role, 
      email: email.trim().toLowerCase(), 
      staffId: selectedStaffId, 
      createdAt: new Date().toISOString() 
    };

    if (editingId) {
        await update(editingId, userData);
        setEditingId(null);
    } else {
        await add(userData);
    }
    
    setSelectedStaffId("");
    setEmail("");
    setRole(roles.length > 0 ? roles[0].name : "dsr");
  };

  const startEdit = (user: any) => {
      setEditingId(user.id);
      setSelectedStaffId(user.staffId);
      setEmail(user.email);
      setRole(user.role);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">ইউজার এবং পারমিশন</h2>
      
      <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border flex flex-col md:flex-row items-end gap-4">
        <div className="w-full md:w-fit">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">স্টাফ (Staff Member)</label>
          <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="border p-2 rounded w-full md:w-64" required>
            <option value="">স্টাফ নির্বাচন করুন</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </select>
        </div>
        <div className="w-full md:flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">গুগল ইমেইল (Google Email)</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="উদা: user@gmail.com" 
            className="border p-2 rounded w-full"
            required 
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">রোল (Role)</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="border p-2 rounded w-full">
            <option value="sr">sr (Sales Rep)</option>
            <option value="dsr">dsr (Delivery Sales Rep)</option>
            <option value="manager">manager (Manager)</option>
            <option value="admin">admin (Admin)</option>
            {roles.filter(r => r.name !== 'sr' && r.name !== 'dsr' && r.name !== 'manager' && r.name !== 'admin').map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="bg-blue-600 text-white p-2.5 px-5 rounded-lg flex items-center gap-1.5 font-bold cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> {editingId ? "আপডেট করুন" : "যোগ করুন"}
        </button>
        {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setSelectedStaffId(""); setEmail(""); }} className="bg-gray-200 text-gray-700 p-2.5 px-5 rounded-lg font-bold cursor-pointer shrink-0">
              বাতিল
            </button>
        )}
      </form>

      <div className="bg-white rounded-2xl border overflow-hidden p-6 space-y-6">
        <h3 className="text-xl font-bold">রোল ভিত্তিক পারমিশন ম্যানেজমেন্ট</h3>
        {roles.map(r => (
            <div key={r.id} className="border p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{r.name}</span>
                    <button 
                        onClick={() => setEditingRolePermissions(editingRolePermissions?.id === r.id ? null : {id: r.id, permissions: r.granularPermissions || []})}
                        className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold"
                    >
                        {editingRolePermissions?.id === r.id ? "বন্ধ করুন" : "পারমিশন এডিট করুন"}
                    </button>
                </div>
                {editingRolePermissions?.id === r.id && (
                    <>
                        <GranularPermissionEditor 
                            selectedPermissions={editingRolePermissions.permissions}
                            onChange={(pubs) => setEditingRolePermissions({...editingRolePermissions, permissions: pubs})}
                        />
                        <button 
                            onClick={async () => {
                                await updateRole(r.id, {...r, granularPermissions: editingRolePermissions.permissions});
                                setEditingRolePermissions(null);
                            }}
                            className="bg-indigo-600 text-white p-2 px-4 rounded-lg font-bold text-sm"
                        >
                            সেভ করুন
                        </button>
                    </>
                )}
            </div>
        ))}
      </div>
    
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4 text-left">নাম</th>
              <th className="px-6 py-4 text-left">গুগল ইমেইল</th>
              <th className="px-6 py-4 text-left">রোল</th>
              <th className="px-6 py-4 text-left">ম্যাপড স্টাফ</th>
              <th className="px-6 py-4 text-center">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">কোন ইউজার নেই (No users found).</td>
                </tr>
            ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" /> <span className="font-semibold text-gray-950">{u.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        u.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-100' :
                        u.role === 'manager' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        u.role === 'sr' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{staff.find(s => s.id === u.staffId)?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-center flex gap-1 justify-center">
                      <button onClick={() => startEdit(u)} className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(u.id)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
