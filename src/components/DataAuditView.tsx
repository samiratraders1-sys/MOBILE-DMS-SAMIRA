import React, { useMemo, useState } from "react";
import {
  ShieldCheck, AlertTriangle, Copy, RefreshCcw, CheckCircle2,
  Loader2, Trash2, Users, Truck, UserCog, Search
} from "lucide-react";
import { checkTransactionDrift, calculateLedger } from "../utils/ledgerCalculator";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import { useConfirm } from "../context/ConfirmContext";

interface DataAuditProps {
  customers: any[];
  suppliers: any[];
  staff: any[];
  transactions: any[];
  products: any[];
  updateCustomer: (id: string, data: any) => Promise<void>;
  updateSupplier: (id: string, data: any) => Promise<void>;
  updateStaff: (id: string, data: any) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
}

export default function DataAuditView({
  customers,
  suppliers,
  staff,
  transactions,
  products,
  updateCustomer,
  updateSupplier,
  updateStaff,
  removeTransaction
}: DataAuditProps) {
  const { confirmDelete } = useConfirm();
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"drift" | "duplicates">("drift");

  // ১. ড্রিফট রিপোর্ট: সেভ-ব্যালেন্স বনাম লেজার-হিসাব
  const driftReport = useMemo(() => {
    return checkTransactionDrift(customers, suppliers, staff, transactions, products);
  }, [customers, suppliers, staff, transactions, products]);

  // ২. ডুপ্লিকেট শনাক্তকরণ: একই পক্ষ + টাইপ + পরিমাণ + তারিখ + refId একাধিকবার
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    (transactions || []).forEach(t => {
      if (!t) return;
      const key = [
        t.partyId || t.entityId || "",
        String(t.type || "").toLowerCase(),
        Number(t.amount || 0),
        String(t.date || "").slice(0, 10),
        t.refId || ""
      ].join("|");
      const list = groups.get(key) || [];
      list.push(t);
      groups.set(key, list);
    });
    const dups: { key: string; txs: any[]; removable: any[] }[] = [];
    groups.forEach(list => {
      if (list.length > 1) {
        // পুরনোটা (createdAt/id অনুযায়ী) রাখা হবে, বাকিগুলো ডুপ্লিকেট
        const sorted = [...list].sort((a, b) =>
          String(a.createdAt || a.id || "").localeCompare(String(b.createdAt || b.id || ""))
        );
        dups.push({ key: sorted[0]?.refId || sorted[0]?.id || "", txs: sorted, removable: sorted.slice(1) });
      }
    });
    // বড় গ্রুপ আগে দেখাও
    return dups.sort((a, b) => b.removable.length - a.removable.length);
  }, [transactions]);

  // ৩. অজানা পক্ষ (যাদের মাস্টার রেকর্ড আর নেই)
  const unknownPartyCount = useMemo(() => {
    const ids = new Set([
      ...customers.map(c => c.id),
      ...suppliers.map(s => s.id),
      ...staff.map(s => s.id)
    ]);
    return (transactions || []).filter(t => t && !(ids.has(t.partyId) || ids.has(t.entityId))).length;
  }, [transactions, customers, suppliers, staff]);

  const dupTotalAmount = duplicateGroups.reduce(
    (acc, g) => acc + g.removable.reduce((a, t) => a + Number(t.amount || 0), 0),
    0
  );

  const getPartyName = (id: string) => {
    const c = customers.find(x => x.id === id);
    if (c) return { name: c.name, icon: Users, color: "text-blue-600", bg: "bg-blue-50" };
    const s = suppliers.find(x => x.id === id);
    if (s) return { name: s.company || s.name, icon: Truck, color: "text-purple-600", bg: "bg-purple-50" };
    const st = staff.find(x => x.id === id);
    if (st) return { name: st.name, icon: UserCog, color: "text-teal-600", bg: "bg-teal-50" };
    return { name: "অজানা পক্ষ", icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-50" };
  };

  const fixBalance = async (d: any) => {
    if (busyIds.includes(d.id)) return;
    setBusyIds(prev => [...prev, d.id]);
    try {
      const updater = d.type === "customer" ? updateCustomer : d.type === "supplier" ? updateSupplier : updateStaff;
      await updater(d.id, { balance: d.calculatedBalance });
      toast.success(`${d.name}-এর সেভ-ব্যালেন্স লেজার হিসাবের সাথে মেলানো হয়েছে (${formatCurrency(d.calculatedBalance)})`);
    } catch (e: any) {
      toast.error("মেলাতে সমস্যা: " + e.message);
    } finally {
      setBusyIds(prev => prev.filter(x => x !== d.id));
    }
  };

  const fixAllBalances = async () => {
    const targets = driftReport.drifts;
    if (targets.length === 0) return;
    toast.loading(`${targets.length} জনের ব্যালেন্স মেলানো হচ্ছে...`, { id: "fix-all" });
    let ok = 0, fail = 0;
    for (const d of targets) {
      try {
        const updater = d.type === "customer" ? updateCustomer : d.type === "supplier" ? updateSupplier : updateStaff;
        await updater(d.id, { balance: d.calculatedBalance });
        ok++;
      } catch {
        fail++;
      }
    }
    toast.dismiss("fix-all");
    toast.success(`${ok} জনের ব্যালেন্স ঠিক হয়েছে${fail > 0 ? `, ${fail} জন ব্যর্থ` : ""}`);
  };

  const deleteDuplicate = async (id: string) => {
    if (busyIds.includes(id)) return;
    setBusyIds(prev => [...prev, id]);
    try {
      await removeTransaction(id);
    } catch (e: any) {
      toast.error("ডিলিটে সমস্যা: " + e.message);
    } finally {
      setBusyIds(prev => prev.filter(x => x !== id));
    }
  };

  const cleanAllDuplicates = () => {
    const all = duplicateGroups.flatMap(g => g.removable).map(t => t.id);
    if (all.length === 0) return;
    confirmDelete({
      recordName: `${all.length}টি ডুপ্লিকেট লেজার এন্ট্রি (মোট ৳${dupTotalAmount.toLocaleString()})`,
      onConfirm: async () => {
        toast.loading("ডুপ্লিকেট পরিষ্কার হচ্ছে...", { id: "clean-dups" });
        let ok = 0, fail = 0;
        for (const id of all) {
          try {
            await removeTransaction(id);
            ok++;
          } catch {
            fail++;
          }
        }
        toast.dismiss("clean-dups");
        toast.success(`${ok}টি ডুপ্লিকেট মুছে ফেলা হয়েছে${fail > 0 ? `, ${fail}টি ব্যর্থ` : ""}`);
      }
    });
  };

  const allClean = !driftReport.hasDrift && duplicateGroups.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-950 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <h2 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-2.5">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          ডাটা অডিট ও পরিষ্কার (Data Audit)
        </h2>
        <p className="text-slate-300 text-xs md:text-sm max-w-3xl leading-relaxed">
          সেভ-করা ব্যালেন্স আর লেজারের আসল হিসাবের মিল-অমিল (ড্রিফট) এবং ডাবল এন্ট্রি (ডুপ্লিকেট) খুঁজে বের করে এক ক্লিকে ঠিক করুন। পুরনো ভুল ডাটা পরিষ্কার করলে সব রিপোর্ট ও লেজার নিখুঁত হবে।
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 ${allClean ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100"}`}>
          <div className={`p-3 rounded-xl ${allClean ? "bg-emerald-100" : "bg-gray-100"}`}>
            {allClean ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Search className="w-5 h-5 text-gray-500" />}
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">সামগ্রিক অবস্থা</p>
            <p className={`text-sm font-black ${allClean ? "text-emerald-700" : "text-gray-900"}`}>
              {allClean ? "সব পরিষ্কার ✓" : "সমস্যা পাওয়া গেছে"}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">ব্যালেন্স অমিল (ড্রিফট)</p>
            <p className="text-sm font-black text-gray-900">{driftReport.drifts.length} জন</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl">
            <Copy className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">ডুপ্লিকেট গ্রুপ</p>
            <p className="text-sm font-black text-gray-900">{duplicateGroups.length} টি</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-gray-100 p-3 rounded-xl">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">মোট লেজার এন্ট্রি</p>
            <p className="text-sm font-black text-gray-900">{(transactions || []).length} টি</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b gap-4">
        <button
          onClick={() => setActiveTab("drift")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === "drift" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-900"}`}
        >
          <AlertTriangle className="w-4 h-4" />
          ব্যালেন্স অমিল ({driftReport.drifts.length})
        </button>
        <button
          onClick={() => setActiveTab("duplicates")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === "duplicates" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-900"}`}
        >
          <Copy className="w-4 h-4" />
          ডুপ্লিকেট ({duplicateGroups.length})
        </button>
      </div>

      {allClean && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <p className="font-black text-emerald-800">চমৎকার! কোনো অমিল বা ডুপ্লিকেট নেই — ডাটা সম্পূর্ণ নিখুঁত।</p>
        </div>
      )}

      {/* Drift Tab */}
      {activeTab === "drift" && (
        <div className="space-y-4">
          {driftReport.drifts.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs font-bold text-amber-900">
                ⚠️ মোট অমিলের পরিমাণ: <span className="font-black">৳{driftReport.totalDriftAmount.toLocaleString()}</span> — নিচের প্রতিটি সারিতে লেজারের আসল হিসাব দেখানো হচ্ছে। "মেলান" চাপলে সেভ-ব্যালেন্স লেজার হিসাবে ঠিক হয়ে যাবে।
              </p>
              <button
                onClick={fixAllBalances}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shrink-0 transition-all cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" /> সব ব্যালেন্স একসাথে মেলান ({driftReport.drifts.length})
              </button>
            </div>
          )}

          {driftReport.drifts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 font-semibold border-2 border-dashed rounded-2xl">
              কোনো ব্যালেন্স অমিল নেই ✓
            </div>
          ) : (
            <div className="bg-white rounded-3xl border shadow-xs overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-400 font-bold uppercase text-left bg-gray-50/50">
                    <th className="p-3">পক্ষ</th>
                    <th className="p-3 text-right">সেভ-ব্যালেন্স</th>
                    <th className="p-3 text-right">লেজারের আসল হিসাব</th>
                    <th className="p-3 text-right">পার্থক্য</th>
                    <th className="p-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {driftReport.drifts.map(d => {
                    const p = getPartyName(d.id);
                    const Icon = p.icon;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50/40">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${p.bg}`}><Icon className={`w-4 h-4 ${p.color}`} /></span>
                            <div>
                              <p className="font-bold text-gray-800">{d.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">{d.type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-600">{formatCurrency(d.savedBalance)}</td>
                        <td className="p-3 text-right font-black text-gray-950">{formatCurrency(d.calculatedBalance)}</td>
                        <td className={`p-3 text-right font-black ${d.drift > 0 ? "text-red-600" : "text-orange-600"}`}>
                          {d.drift > 0 ? "+" : ""}{formatCurrency(d.drift)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => fixBalance(d)}
                            disabled={busyIds.includes(d.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 ml-auto disabled:opacity-50 transition-all cursor-pointer"
                          >
                            {busyIds.includes(d.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            মেলান
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Duplicates Tab */}
      {activeTab === "duplicates" && (
        <div className="space-y-4">
          {duplicateGroups.length > 0 && (
            <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs font-bold text-red-900">
                🗑️ {duplicateGroups.length}টি গ্রুপে ডাবল এন্ট্রি — মোট অতিরিক্ত <span className="font-black">৳{dupTotalAmount.toLocaleString()}</span> লেজারে ভুলভাবে ঢুকে আছে। প্রতিটি গ্রুপের পুরনো এন্ট্রি রাখা হয়, বাকিগুলো ডুপ্লিকেট।
              </p>
              <button
                onClick={cleanAllDuplicates}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shrink-0 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> সব ডুপ্লিকেট পরিষ্কার করুন
              </button>
            </div>
          )}

          {duplicateGroups.length === 0 ? (
            <div className="text-center py-16 text-gray-400 font-semibold border-2 border-dashed rounded-2xl">
              কোনো ডুপ্লিকেট এন্ট্রি নেই ✓
            </div>
          ) : (
            <div className="space-y-3">
              {duplicateGroups.map((g, gi) => {
                const p = getPartyName(g.txs[0]?.partyId || g.txs[0]?.entityId || "");
                const Icon = p.icon;
                return (
                  <div key={gi} className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${p.bg}`}><Icon className={`w-4 h-4 ${p.color}`} /></span>
                        <p className="font-black text-gray-900 text-sm">{p.name}</p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{String(g.txs[0]?.type || "").toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-bold text-red-600">
                        {g.txs.length}× {formatCurrency(g.txs[0]?.amount)} — {g.removable.length}টি অতিরিক্ত
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {g.txs.map((t, ti) => (
                        <div key={t.id} className={`flex items-center justify-between text-xs p-2 rounded-lg ${ti === 0 ? "bg-emerald-50 border border-emerald-100" : "bg-red-50/60 border border-red-100"}`}>
                          <span className="font-bold flex items-center gap-2">
                            {ti === 0 ? (
                              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> <span className="text-emerald-700">মূল এন্ট্রি (রাখা হবে)</span></>
                            ) : (
                              <><Copy className="w-3.5 h-3.5 text-red-500" /> <span className="text-red-700">ডুপ্লিকেট</span></>
                            )}
                          </span>
                          <span className="text-gray-500 font-mono">{String(t.date || "").slice(0, 10)} • ref: {String(t.refId || t.id).slice(-6)}</span>
                          {ti > 0 && (
                            <button
                              onClick={() => deleteDuplicate(t.id)}
                              disabled={busyIds.includes(t.id)}
                              className="px-2.5 py-1 border border-red-200 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[10px] flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              {busyIds.includes(t.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              মুছুন
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      {unknownPartyCount > 0 && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-xs text-gray-600">
          ℹ️ {unknownPartyCount}টি লেজার এন্ট্রি এমন পক্ষের, যার মাস্টার রেকর্ড (কাস্টমার/সাপ্লায়ার/স্টাফ) আর নেই — এগুলো রিপোর্টে গোনা হয় না। দরকার হলে বলবেন, পরিষ্কারের ব্যবস্থা যোগ করব।
        </div>
      )}
    </div>
  );
}
