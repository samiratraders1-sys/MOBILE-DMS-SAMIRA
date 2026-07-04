import React, { useState } from 'react';
import { User, Plus, Trash2, Edit, Key, Eye, EyeOff, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import GranularPermissionEditor from './GranularPermissionEditor';
import { createFirebaseUser } from '../lib/firebase';

interface UsersProps {
  users: any[];
  staff: any[];
  roles: any[];
  add: (user: any) => Promise<string | undefined>;
  update: (id: string, user: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateRole: (id: string, role: any) => Promise<void>;
}

export default function UsersView({ users, staff, roles, add, update, remove, updateRole }: UsersProps) {
  const [role, setRole] = useState(roles.length > 0 ? roles[0].name : "dsr");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [authMethod, setAuthMethod] = useState<"username_password" | "google">("username_password");
  
  // Credentials fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<{id: string, permissions: string[]} | null>(null);
  
  // Track password visibilities in table
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Helper to suggest unique username based on staff name
  const suggestUsername = (staffMember: any) => {
    if (!staffMember) return "";
    // Clean and simple role-based suffix
    const rolePrefix = staffMember.role ? staffMember.role.toLowerCase() : 'user';
    const randDigits = Math.floor(100 + Math.random() * 900);
    return `${rolePrefix}_${randDigits}`;
  };

  // Helper to suggest secure random password
  const suggestPassword = () => {
    const rand = Math.floor(100 + Math.random() * 900);
    return `ST@${rand}`;
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    const staffMember = staff.find(s => s.id === staffId);
    if (staffMember) {
      if (!editingId) {
        setUsername(suggestUsername(staffMember));
        setPassword(suggestPassword());
        const matchedRole = roles.find(r => r.name.toLowerCase() === staffMember.role?.toLowerCase());
        if (matchedRole) {
          setRole(matchedRole.name);
        }
      }
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      toast.error("অনুগ্রহ করে স্টাফ নির্বাচন করুন");
      return;
    }
    const staffMember = staff.find(s => s.id === selectedStaffId);
    if (!staffMember) return;

    let finalEmail = "";
    let finalUsername = "";
    let finalPassword = "";

    if (authMethod === "google") {
      if (!email) {
        toast.error("অনুগ্রহ করে গুগল ইমেইল দিন");
        return;
      }
      finalEmail = email.trim().toLowerCase();
    } else {
      if (!username) {
        toast.error("অনুগ্রহ করে ইউজারনেম দিন");
        return;
      }
      if (!password || password.length < 6) {
        toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে");
        return;
      }
      finalUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_\-\.]/g, '');
      finalEmail = `${finalUsername}@samirabms.com`;
      finalPassword = password;
    }

    setIsCreating(true);
    try {
      let uid = "";
      
      if (editingId) {
        // Edit flow
        const existingUser = users.find(u => u.id === editingId);
        const userData = { 
          name: staffMember.name, 
          role, 
          email: finalEmail, 
          username: finalUsername || null,
          password: finalPassword || null,
          authMethod,
          staffId: selectedStaffId,
          uid: existingUser?.uid || null,
          updatedAt: new Date().toISOString() 
        };
        await update(editingId, userData);
        setEditingId(null);
      } else {
        // Creation Flow - Check for Username & Password to register in Firebase Auth first
        if (authMethod === "username_password") {
          toast.loading("ফায়ারবেস অথেনটিকেশনে ইউজার তৈরি হচ্ছে...", { id: "firebase-auth-loading" });
          try {
            uid = await createFirebaseUser(finalEmail, finalPassword);
            toast.dismiss("firebase-auth-loading");
          } catch (err: any) {
            toast.dismiss("firebase-auth-loading");
            if (err.code === "auth/email-already-in-use" || err.message?.includes("already-in-use")) {
              toast.error("এই ইউজারনেমটি ইতিমধ্যেই ব্যবহার করা হয়েছে। অন্য একটি নির্বাচন করুন।");
            } else if (err.code === "auth/weak-password" || err.message?.includes("weak-password")) {
              toast.error("পাসওয়ার্ড দুর্বল। অনুগ্রহ করে অন্য পাসওয়ার্ড দিন।");
            } else {
              toast.error("ফায়ারবেস অ্যাকাউন্ট তৈরিতে সমস্যা: " + err.message);
            }
            setIsCreating(false);
            return;
          }
        }

        const userData = { 
          name: staffMember.name, 
          role, 
          email: finalEmail, 
          username: finalUsername || null,
          password: finalPassword || null,
          authMethod,
          uid: uid || null,
          staffId: selectedStaffId, 
          createdAt: new Date().toISOString() 
        };

        await add(userData);
      }
      
      // Reset inputs
      setSelectedStaffId("");
      setEmail("");
      setUsername("");
      setPassword("");
      setRole(roles.length > 0 ? roles[0].name : "dsr");
    } catch (err: any) {
      toast.error("ইউজার তৈরি বা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setSelectedStaffId(user.staffId || "");
    const method = user.authMethod || (user.email?.endsWith("@samirabms.com") ? "username_password" : "google");
    setAuthMethod(method);
    if (method === "google") {
      setEmail(user.email || "");
      setUsername("");
      setPassword("");
    } else {
      setUsername(user.username || user.email?.split("@")[0] || "");
      setPassword(user.password || "");
      setEmail("");
    }
    setRole(user.role || "dsr");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" /> ইউজার এবং পারমিশন ম্যানেজমেন্ট
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            নতুন স্টাফ অ্যাকাউন্ট তৈরি করুন, তাদের ইউজারনেম ও পাসওয়ার্ড দিয়ে দিন এবং তাদের রোল নির্ধারণ করুন।
          </p>
        </div>
      </div>
      
      {/* User Creation Form */}
      <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400 animate-spin-slow" /> 
          {editingId ? "ইউজার তথ্য পরিবর্তন করুন (Edit User)" : "নতুন ইউজার অ্যাকাউন্ট তৈরি করুন (Create User)"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Mapped Staff */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">১. স্টাফ নির্বাচন (Select Staff)</label>
            <select 
              value={selectedStaffId} 
              onChange={e => handleStaffSelect(e.target.value)} 
              className="border p-3 rounded-xl w-full text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
              required
              disabled={isCreating}
            >
              <option value="">স্টাফ নির্বাচন করুন</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role ? s.role.toUpperCase() : "N/A"})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 font-semibold italic">ইউজার অ্যাকাউন্টটি এই স্টাফ মেম্বারের সাথে যুক্ত থাকবে।</p>
          </div>

          {/* Column 2: Sign-in Method Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">২. সাইন-ইন মাধ্যম (Sign-in Method)</label>
            <div className="flex bg-slate-100 p-1 rounded-xl border">
              <button
                type="button"
                onClick={() => setAuthMethod("username_password")}
                disabled={isCreating}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === "username_password" 
                    ? "bg-white text-indigo-700 shadow-sm" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Key className="w-3.5 h-3.5" /> ইউজারনেম
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("google")}
                disabled={isCreating}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === "google" 
                    ? "bg-white text-indigo-700 shadow-sm" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <img src="https://www.google.com/favicon.ico" className="w-3.5 h-3.5" alt="Google" /> গুগল ইমেইল
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-semibold italic">স্টাফ কিভাবে সিস্টেমে লগইন করবেন তা নির্বাচন করুন।</p>
          </div>

          {/* Column 3: Role Assignment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">৩. ভূমিকা/রোল (System Role)</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              className="border p-3 rounded-xl w-full text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              disabled={isCreating}
            >
              <option value="sr">sr (Sales Rep)</option>
              <option value="dsr">dsr (Delivery Sales Rep)</option>
              <option value="manager">manager (Manager)</option>
              <option value="admin">admin (Admin)</option>
              {roles.filter(r => r.name !== 'sr' && r.name !== 'dsr' && r.name !== 'manager' && r.name !== 'admin').map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 font-semibold italic">সিস্টেমের কোন কোন ট্যাব ব্যবহারের অনুমতি থাকবে।</p>
          </div>
        </div>

        {/* Credentials Inputs Row */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          {authMethod === "username_password" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-extrabold text-slate-700">ইউজারনেম (Username)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const staffMember = staff.find(s => s.id === selectedStaffId);
                      if (staffMember) {
                        setUsername(suggestUsername(staffMember));
                      } else {
                        toast.error("অনুগ্রহ করে প্রথমে স্টাফ নির্বাচন করুন");
                      }
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> নতুন জেনারেট করুন
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_\-\.]/g, ''))}
                    placeholder="উদা: abul_kalam"
                    className="border p-3 rounded-xl w-full text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none pr-32 font-mono"
                    required
                    disabled={isCreating}
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold font-mono">
                    @samirabms.com
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">লগইন করার সময় স্টাফ এই ইউজারনেমটি টাইপ করবেন।</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-extrabold text-slate-700">পাসওয়ার্ড (Password)</label>
                  <button
                    type="button"
                    onClick={() => setPassword(suggestPassword())}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> র্যান্ডম পাসওয়ার্ড দিন
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                    className="border p-3 rounded-xl w-full text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none pr-12 font-mono"
                    required
                    disabled={isCreating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">অ্যাডমিন কর্তৃক নির্ধারিত পাসওয়ার্ড (স্টাফ পরিবর্তন করতে পারবেন না)।</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-xl">
              <label className="block text-xs font-extrabold text-slate-700">গুগল ইমেইল ঠিকানা (Google Gmail Address)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="উদা: abul.kalam@gmail.com"
                className="border p-3 rounded-xl w-full text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                required
                disabled={isCreating}
              />
              <p className="text-[11px] text-slate-500 font-medium">স্টাফ তাদের নিজস্ব গুগল অ্যাকাউন্ট দিয়ে লগইন করতে পারবেন।</p>
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex gap-3 justify-end pt-2">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setSelectedStaffId("");
                setEmail("");
                setUsername("");
                setPassword("");
              }}
              disabled={isCreating}
              className="px-5 py-3 border rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              বাতিল (Cancel)
            </button>
          )}
          <button
            type="submit"
            disabled={isCreating}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> ইউজার তৈরি হচ্ছে...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> 
                {editingId ? "ইউজার তথ্য সংরক্ষণ করুন" : "নতুন ইউজার অ্যাকাউন্ট তৈরি করুন"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* User List Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900">অ্যাডমিন কর্তৃক তৈরি ইউজার তালিকা (User List)</h3>
          <p className="text-xs text-slate-500 mt-1">সিস্টেমে অ্যাক্টিভ সকল ইউজার এবং তাদের লগইন পাসওয়ার্ড বা সাইন-ইন মাধ্যম নিচে দেওয়া হলো।</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
              <tr>
                <th className="px-6 py-4">স্টাফ মেম্বার (Staff Name)</th>
                <th className="px-6 py-4">লগইন আইডি/ইউজারনেম (Login ID)</th>
                <th className="px-6 py-4">পাসওয়ার্ড (Password)</th>
                <th className="px-6 py-4">লগইন মাধ্যম</th>
                <th className="px-6 py-4">সিস্টেম রোল (Role)</th>
                <th className="px-6 py-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    কোন ইউজার অ্যাকাউন্ট তৈরি করা হয়নি। উপরে ফর্ম থেকে প্রথম ইউজার তৈরি করুন।
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isUsernameAuth = u.authMethod === "username_password" || u.email?.endsWith("@samirabms.com");
                  const userUsername = u.username || (isUsernameAuth ? u.email?.split("@")[0] : "");
                  const isPassVisible = !!visiblePasswords[u.id];

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {u.name ? u.name.substring(0, 2) : "U"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold italic">স্টাফ: {staff.find(s => s.id === u.staffId)?.name || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {isUsernameAuth ? (
                          <div>
                            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md">{userUsername}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">ইমেইল: {u.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{u.email}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {isUsernameAuth ? (
                          u.password ? (
                            <div className="flex items-center gap-1.5">
                              <span>{isPassVisible ? u.password : "••••••"}</span>
                              <button
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                                title={isPassVisible ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-amber-500 text-[10px] font-bold">পাসওয়ার্ড সংরক্ষিত নেই</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">— (গুগল সাইন-ইন)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isUsernameAuth ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs font-bold">
                            <Key className="w-3 h-3" /> আইডি/পাসওয়ার্ড
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold">
                            <img src="https://www.google.com/favicon.ico" className="w-3 h-3" alt="Google" /> গুগল লগইন
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          u.role === 'admin' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          u.role === 'manager' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          u.role === 'sr' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {(u.role || "").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-1 justify-center items-center">
                          <button 
                            onClick={() => startEdit(u)} 
                            className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="ইউজার তথ্য এডিট করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => remove(u.id)} 
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="ইউজারটি ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-Based Permissions Management (Existing section maintained) */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden p-6 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">রোল ভিত্তিক পারমিশন ম্যানেজমেন্ট</h3>
          <p className="text-xs text-slate-500 mt-1">সিস্টেমের রোলগুলোর গ্র্যানুলার (ডিভাইস/ট্যাব লেভেল) ব্যবহারের পারমিশন এডিট করুন।</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {roles.map(r => (
            <div key={r.id} className="border p-5 rounded-2xl space-y-3 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-slate-800 capitalize">{r.name}</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">রোল আইডি: {r.id}</span>
                </div>
                <button 
                  onClick={() => setEditingRolePermissions(editingRolePermissions?.id === r.id ? null : {id: r.id, permissions: r.granularPermissions || []})}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer"
                >
                  {editingRolePermissions?.id === r.id ? "পারমিশন বন্ধ করুন" : "পারমিশন এডিট করুন"}
                </button>
              </div>
              {editingRolePermissions?.id === r.id && (
                <div className="pt-4 border-t space-y-4">
                  <GranularPermissionEditor 
                    selectedPermissions={editingRolePermissions.permissions}
                    onChange={(pubs) => setEditingRolePermissions({...editingRolePermissions, permissions: pubs})}
                  />
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={async () => {
                        await updateRole(r.id, {...r, granularPermissions: editingRolePermissions.permissions});
                        setEditingRolePermissions(null);
                        toast.success(`${r.name} রোলের পারমিশন সেভ করা হয়েছে`);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 px-6 rounded-xl font-bold text-xs shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                    >
                      পারমিশন সেভ করুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
