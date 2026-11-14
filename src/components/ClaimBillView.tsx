/**
 * Samira Traders DMS — Supplier Claim Bill View (রিকোয়ারমেন্ট D6 — পার্ট ২)
 * ─────────────────────────────────────────────────────────────────────
 * সাপ্লায়ার লেজারের পার্ট ২: ক্লেইম বিল
 *   • Billed   = সেটেলমেন্ট ইঞ্জিন পোস্ট করা ক্লেইম
 *                (FREE_CLAIM / PROMO_CLAIM / DAMAGE_CLAIM / PRICE_SUPPORT)
 *   • Received = কোম্পানি পরিশোধ করেছে (CLAIM_RECEIVED)
 *   • Balance  = Billed − Received  → এখনও সাপ্লায়ারের কাছে আমাদের পাওনা
 * শর্ট (অদাবীকৃত ক্লেইম) P&L-এ লস হিসেবে যাবে — রিপোর্ট ইঞ্জিন §D6।
 */
import React, { useMemo, useState } from "react";
import { FileText, Building2, Printer, Search, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { normalizeLedgerType } from "../lib/ledgerEngine";

const CLAIM_TYPES = ["FREE_CLAIM", "PROMO_CLAIM", "DAMAGE_CLAIM", "PRICE_SUPPORT"] as const;

const CLAIM_TYPE_LABEL: Record<string, string> = {
  FREE_CLAIM: "ফ্রি প্রোডাক্ট ক্লেইম",
  PROMO_CLAIM: "ডিসকাউন্ট / স্ক্র্যাচ কার্ড / ট্রেড অফার",
  DAMAGE_CLAIM: "ড্যামেজ রিটার্ন ক্লেইম",
  PRICE_SUPPORT: "প্রাইস সাপোর্ট / অন্যান্য",
};

const showTk = (val: number) => "৳" + Math.abs(Math.round(val * 100) / 100).toLocaleString("en-IN");

interface ClaimBillViewProps {
  transactions: any[];
  suppliers: any[];
  role?: string;
}

export default function ClaimBillView({ transactions = [], suppliers = [] }: ClaimBillViewProps) {
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // সব মাসের তালিকা (tx.date থেকে YYYY-MM)
  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t && CLAIM_TYPES.includes(normalizeLedgerType(t.type) as any)) {
        const d = String(t.date || "");
        if (d.length >= 7) set.add(d.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // সাপ্লায়ার-ভিত্তিক ক্লেইম বিল (পার্ট ২)
  const claimBills = useMemo(() => {
    const rows = suppliers
      .map(s => {
        const supTxs = transactions.filter(
          t => t.partyType === "SUPPLIER" && t.partyId === s.id
        );
        const billedByType: Record<string, number> = {};
        let billed = 0;
        supTxs.forEach(t => {
          const type = normalizeLedgerType(t.type);
          if (!CLAIM_TYPES.includes(type as any)) return;
          if (monthFilter !== "all" && String(t.date || "").slice(0, 7) !== monthFilter) return;
          billed += Number(t.amount) || 0;
          billedByType[type] = (billedByType[type] || 0) + (Number(t.amount) || 0);
        });
        let received = 0;
        supTxs.forEach(t => {
          if (normalizeLedgerType(t.type) !== "CLAIM_RECEIVED") return;
          if (monthFilter !== "all" && String(t.date || "").slice(0, 7) !== monthFilter) return;
          received += Number(t.amount) || 0;
        });
        return {
          supplierId: s.id,
          name: s.company || s.name || s.id,
          billed: Math.round(billed * 100) / 100,
          received: Math.round(received * 100) / 100,
          balance: Math.round((billed - received) * 100) / 100,
          billedByType,
        };
      })
      .filter(r => r.billed !== 0 || r.received !== 0);

    const term = search.trim().toLowerCase();
    const filtered = term ? rows.filter(r => r.name.toLowerCase().includes(term)) : rows;
    const totalBilled = filtered.reduce((s, r) => s + r.billed, 0);
    const totalReceived = filtered.reduce((s, r) => s + r.received, 0);
    return {
      rows: filtered.sort((a, b) => b.balance - a.balance),
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
      totalBalance: Math.round((totalBilled - totalReceived) * 100) / 100,
    };
  }, [transactions, suppliers, monthFilter, search]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* হেডার */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            সাপ্লায়ার ক্লেইম বিল (পার্ট ২)
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            বিলড = সেটেলমেন্টে উঠা ক্লেইম • রিসিভড = কোম্পানি পরিশোধ • ব্যালেন্স = এখনও পাওনা
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="সাপ্লায়ার খুঁজুন..."
              className="pl-8 pr-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white w-44"
            />
          </div>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="py-2 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white"
          >
            <option value="all">সব মাস</option>
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="py-2 px-3 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> প্রিন্ট
          </button>
        </div>
      </div>

      {/* সামারি কার্ড */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase">মোট বিলড (ক্লেইম)</p>
          <p className="text-xl font-black text-slate-800 mt-1">{showTk(claimBills.totalBilled)}</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> মোট রিসিভড (পরিশোধ)
          </p>
          <p className="text-xl font-black text-emerald-600 mt-1">{showTk(claimBills.totalReceived)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> দাবি-বাকি (ব্যালেন্স)
          </p>
          <p className="text-xl font-black text-amber-700 mt-1">{showTk(claimBills.totalBalance)}</p>
        </div>
      </div>

      {/* বিল টেবিল */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
              <tr>
                <th className="p-3 text-left">সাপ্লায়ার</th>
                {CLAIM_TYPES.map(ct => (
                  <th key={ct} className="p-3 text-right">{CLAIM_TYPE_LABEL[ct].split(" /")[0].split(" (")[0]}</th>
                ))}
                <th className="p-3 text-right">মোট বিলড</th>
                <th className="p-3 text-right">রিসিভড</th>
                <th className="p-3 text-right">ব্যালেন্স</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claimBills.rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                    কোনো ক্লেইম এন্ট্রি পাওয়া যায়নি — সেটেলমেন্ট শিট সাবমিট হলে এখানে স্বয়ংক্রিয়ভাবে আসবে
                  </td>
                </tr>
              )}
              {claimBills.rows.map(r => (
                <tr key={r.supplierId} className="hover:bg-slate-50">
                  <td className="p-3 font-black text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> {r.name}
                  </td>
                  {CLAIM_TYPES.map(ct => (
                    <td key={ct} className="p-3 text-right text-slate-600 font-bold">
                      {r.billedByType[ct] ? showTk(r.billedByType[ct]) : "—"}
                    </td>
                  ))}
                  <td className="p-3 text-right font-black text-slate-800">{showTk(r.billed)}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">{showTk(r.received)}</td>
                  <td className={`p-3 text-right font-black ${r.balance > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                    {showTk(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            {claimBills.rows.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200 font-black text-slate-800">
                <tr>
                  <td className="p-3">সর্বমোট</td>
                  <td colSpan={4}></td>
                  <td className="p-3 text-right">{showTk(claimBills.totalBilled)}</td>
                  <td className="p-3 text-right text-emerald-600">{showTk(claimBills.totalReceived)}</td>
                  <td className="p-3 text-right text-amber-700">{showTk(claimBills.totalBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        D6 নিয়ম: ক্লেইম বিলের শর্ট (অদাবীকৃত অংশ) মালিকের P&L-এ লস হিসেবে দেখানো হবে। স্পেশাল ডিসকাউন্ট এই বিলে আসবে না (D7)।
      </p>
    </div>
  );
}
