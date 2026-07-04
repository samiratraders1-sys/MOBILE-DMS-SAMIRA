import React, { useState, useMemo } from "react";
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  User, 
  DollarSign, 
  Gift, 
  Percent, 
  AlertCircle,
  Calendar,
  Check,
  X
} from "lucide-react";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";

interface SupplierClaim {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  type: "Free Products" | "Discounts";
  amount: number;
  description: string;
  productsList?: { productId: string; productName: string; quantity: number; price: number }[];
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: any;
}

interface SupplierClaimsViewProps {
  claims: SupplierClaim[];
  addClaim: (claim: any) => Promise<void>;
  updateClaim: (id: string, data: any) => Promise<void>;
  removeClaim?: (id: string) => Promise<void>;
  suppliers: any[];
  products: any[];
  addTransaction: (tx: any) => Promise<void>;
  role?: string;
  userEmail?: string;
}

export default function SupplierClaimsView({
  claims = [],
  addClaim,
  updateClaim,
  removeClaim,
  suppliers = [],
  products = [],
  addTransaction,
  role = "admin",
  userEmail = ""
}: SupplierClaimsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "pending" | "approved" | "rejected">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [claimType, setClaimType] = useState<"Free Products" | "Discounts">("Discounts");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  
  // For free products sub-form
  const [claimProducts, setClaimProducts] = useState<{ productId: string; quantity: number; price: number }[]>([]);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [prodQty, setProdQty] = useState("");

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  // Add product to temporary claim list
  const handleAddProductToClaim = () => {
    if (!selectedProdId || !prodQty || Number(prodQty) <= 0) {
      toast.error("সঠিক প্রোডাক্ট এবং পরিমাণ নির্বাচন করুন!");
      return;
    }
    const prod = products.find(p => p.id === selectedProdId);
    if (!prod) return;

    const price = Number(prod.cost || prod.price || 0);
    const quantity = Number(prodQty);

    const existingIdx = claimProducts.findIndex(cp => cp.productId === selectedProdId);
    if (existingIdx > -1) {
      const updated = [...claimProducts];
      updated[existingIdx].quantity += quantity;
      setClaimProducts(updated);
    } else {
      setClaimProducts([...claimProducts, { productId: selectedProdId, quantity, price }]);
    }

    // Auto update total amount of claim based on product cost value
    const newTotal = [...claimProducts, { productId: selectedProdId, quantity, price }]
      .reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    setClaimAmount(String(newTotal));
    setSelectedProdId("");
    setProdQty("");
  };

  const handleRemoveProductFromClaim = (idx: number) => {
    const updated = claimProducts.filter((_, i) => i !== idx);
    setClaimProducts(updated);
    const newTotal = updated.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setClaimAmount(String(newTotal));
  };

  // Submit Claim
  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error("সাপ্লায়ার নির্বাচন করা আবশ্যক!");
      return;
    }
    if (!claimAmount || Number(claimAmount) <= 0) {
      toast.error("সঠিক ক্লেম ভ্যালু প্রদান করুন!");
      return;
    }

    try {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      const supplierName = supplier ? (supplier.company || supplier.name) : "Unknown Supplier";

      const claimData = {
        date: claimDate,
        supplierId: selectedSupplierId,
        supplierName,
        type: claimType,
        amount: Number(claimAmount),
        description: claimDescription,
        status: "pending",
        createdAt: new Date().toISOString(),
        productsList: claimType === "Free Products" ? claimProducts.map(cp => {
          const prod = products.find(p => p.id === cp.productId);
          return {
            productId: cp.productId,
            productName: prod?.name || "Unknown Product",
            quantity: cp.quantity,
            price: cp.price
          };
        }) : []
      };

      await addClaim(claimData);
      toast.success("সাপ্লায়ার ক্লেম আবেদন পেন্ডিং হিসেবে সংরক্ষণ করা হয়েছে!");
      setShowAddModal(false);
      
      // Reset form
      setSelectedSupplierId("");
      setClaimAmount("");
      setClaimDescription("");
      setClaimProducts([]);
    } catch (err: any) {
      toast.error("ভুল হয়েছে: " + err.message);
    }
  };

  // Approval flow: upon admin approval, automatically write to transactions collection
  const handleApproveClaim = async (claim: SupplierClaim) => {
    if (role !== "admin") {
      toast.error("শুধুমাত্র অ্যাডমিন ক্লেম অনুমোদন করতে পারবেন!");
      return;
    }

    try {
      // 1. Update status to approved
      await updateClaim(claim.id, {
        status: "approved",
        approvedBy: userEmail,
        approvedAt: new Date().toISOString()
      });

      // 2. Automatically adjust supplier's outstanding balance in transaction ledger
      // A return or payment_out reduces what we owe the supplier
      await addTransaction({
        partyId: claim.supplierId,
        partyType: "supplier",
        type: "payment_out", // payment_out reduces supplier balance
        amount: Number(claim.amount),
        supplierId: claim.supplierId,
        date: claim.date,
        description: `Approved Supplier Claim: ${claim.type === "Discounts" ? "ডিসকাউন্ট ক্লেম" : "ফ্রি প্রোডাক্ট ক্লেম"} (${claim.description})`,
        refId: claim.id,
        createdAt: new Date().toISOString(),
        createdBy: userEmail
      });

      toast.success("সাপ্লায়ার ক্লেম সফলভাবে অনুমোদিত হয়েছে এবং ট্রানজেকশন লেজারে সমন্বয় করা হয়েছে!");
    } catch (err: any) {
      toast.error("অনুমোদনে সমস্যা: " + err.message);
    }
  };

  // Reject Claim
  const handleRejectClaim = async (id: string) => {
    if (role !== "admin") {
      toast.error("শুধুমাত্র অ্যাডমিন ক্লেম বাতিল করতে পারবেন!");
      return;
    }
    if (window.confirm("আপনি কি নিশ্চিতভাবে এই ক্লেম রেকর্ডটি বাতিল করতে চান?")) {
      try {
        await updateClaim(id, {
          status: "rejected",
          approvedBy: userEmail,
          approvedAt: new Date().toISOString()
        });
        toast.success("ক্লেম রেকর্ডটি বাতিল করা হয়েছে!");
      } catch (err: any) {
        toast.error("বাতিল করতে সমস্যা: " + err.message);
      }
    }
  };

  // Delete Claim
  const handleDeleteClaim = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ক্লেমটি মুছে ফেলতে চান?")) return;
    if (removeClaim) {
      try {
        await removeClaim(id);
        toast.success("ক্লেমটি মুছে ফেলা হয়েছে!");
      } catch (err: any) {
        toast.error("মুছে ফেলতে সমস্যা: " + err.message);
      }
    }
  };

  // Filtered claims list
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (activeTab !== "ALL" && c.status !== activeTab) return false;
      const suppName = (c.supplierName || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return suppName.includes(query) || desc.includes(query);
    });
  }, [claims, activeTab, searchQuery]);

  // Statistics
  const claimStats = useMemo(() => {
    const pendingTotal = claims.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const approvedTotal = claims.filter(c => c.status === "approved").reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalCount = claims.length;
    return { pendingTotal, approvedTotal, totalCount };
  }, [claims]);

  return (
    <div id="supplier_claims_container" className="space-y-6">
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            সাপ্লায়ার ক্লেম ট্র্যাকিং (Supplier Claims & Claims)
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            সাপ্লায়ারের থেকে প্রাপ্য ফ্রি প্রোডাক্ট এবং ডিসকাউন্ট ক্লেম ট্র্যাকিং ও লেজার সমন্বয় ব্যালেন্স
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          নতুন ক্লেম আবেদন করুন
        </button>
      </div>

      {/* KPI Stats Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-widest block">সমন্বয়কৃত ক্লেম ভ্যালু</span>
            <span className="text-2xl font-black text-indigo-950 font-mono mt-0.5 block">{formatCurrency(claimStats.approvedTotal)}</span>
          </div>
        </div>
        <div className="bg-yellow-50/50 p-5 rounded-3xl border border-yellow-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-500 text-white rounded-2xl shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-yellow-600 font-extrabold uppercase tracking-widest block">পেন্ডিং ক্লেম ভ্যালু</span>
            <span className="text-2xl font-black text-yellow-950 font-mono mt-0.5 block">{formatCurrency(claimStats.pendingTotal)}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-100 text-gray-600 rounded-2xl shadow-sm">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">মোট ক্লেম আবেদন</span>
            <span className="text-2xl font-black text-gray-950 font-mono mt-0.5 block">{claimStats.totalCount} টি</span>
          </div>
        </div>
      </div>

      {/* Search and Tabs Layout */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100/70 p-1.5 rounded-2xl">
            {(["ALL", "pending", "approved", "rejected"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "ALL" ? "সব ক্লেম" : tab === "pending" ? "পেন্ডিং" : tab === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="সাপ্লায়ার বা বিবরণ দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 w-full md:w-64"
            />
          </div>
        </div>

        {/* Claims Table */}
        <div className="overflow-x-auto border-t border-gray-100 pt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10.5px] font-black uppercase text-gray-400 tracking-wider">
                <th className="px-6 py-4">তারিখ</th>
                <th className="px-6 py-4">সাপ্লায়ার</th>
                <th className="px-6 py-4">ধরন (Type)</th>
                <th className="px-6 py-4">মোট ক্লেম মূল্য</th>
                <th className="px-6 py-4">বিবরণ</th>
                <th className="px-6 py-4 text-center">স্থিতি (Status)</th>
                <th className="px-6 py-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    কোনো ক্লেম রেকর্ড খুঁজে পাওয়া যায়নি!
                  </td>
                </tr>
              ) : (
                filteredClaims.map(claim => (
                  <tr key={claim.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 font-bold font-mono text-gray-700 whitespace-nowrap">
                      {claim.date}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-800">
                      {claim.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {claim.type === "Free Products" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Gift className="w-3.5 h-3.5" />
                          ফ্রি প্রোডাক্টস
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                          <Percent className="w-3.5 h-3.5" />
                          ক্যাশ ডিসকাউন্ট
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-left font-black font-mono text-indigo-700 whitespace-nowrap">
                      {formatCurrency(claim.amount)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-semibold max-w-xs truncate">
                      {claim.description}
                      {claim.productsList && claim.productsList.length > 0 && (
                        <div className="mt-1 text-[10px] text-emerald-600 block bg-emerald-50/50 p-1.5 rounded-lg border border-dashed">
                          {claim.productsList.map((p, idx) => (
                            <span key={idx} className="block">{p.productName} ({p.quantity} pcs)</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {claim.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-black bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5" />
                          অনুমোদিত
                        </span>
                      ) : claim.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-black bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                          <XCircle className="w-3.5 h-3.5" />
                          প্রত্যাখ্যাত
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-black bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100">
                          <Clock className="w-3.5 h-3.5" />
                          পেন্ডিং
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {role === "admin" && claim.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApproveClaim(claim)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-xl shadow-sm transition-colors"
                              title="অনুমোদন করুন"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectClaim(claim.id)}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-xl shadow-sm transition-colors"
                              title="প্রত্যাখ্যান করুন"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {removeClaim && (
                          <button
                            onClick={() => handleDeleteClaim(claim.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Overlay Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-900 text-white p-5 flex justify-between items-center">
              <h3 className="font-black text-sm">নতুন ক্লেম আবেদন (Create Supplier Claim)</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white font-black text-xs"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            <form onSubmit={handleSaveClaim} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ক্লেমের তারিখ</label>
                  <input
                    type="date"
                    required
                    value={claimDate}
                    onChange={e => setClaimDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">সাপ্লায়ার (Supplier)</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="">নির্বাচন করুন...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company || s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ক্লেমের ধরন</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setClaimType("Discounts"); setClaimProducts([]); }}
                    className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      claimType === "Discounts"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    ডিসকাউন্ট ক্লেম (Discount)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setClaimType("Free Products"); setClaimAmount("0"); }}
                    className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      claimType === "Free Products"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    ফ্রি প্রোডাক্ট (Free Product)
                  </button>
                </div>
              </div>

              {/* Free Products Sub-Form */}
              {claimType === "Free Products" && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block">ফ্রি পণ্য যুক্ত করুন</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={selectedProdId}
                      onChange={e => setSelectedProdId(e.target.value)}
                      className="px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none col-span-1 sm:col-span-2"
                    >
                      <option value="">পণ্য নির্বাচন করুন...</option>
                      {products
                        .filter(p => !selectedSupplierId || p.supplierId === selectedSupplierId)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      }
                    </select>
                    <input
                      type="number"
                      placeholder="পরিমাণ (pcs)"
                      value={prodQty}
                      onChange={e => setProdQty(e.target.value)}
                      className="px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold font-mono focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProductToClaim}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    তালিকায় যুক্ত করুন
                  </button>

                  {/* Temporary claim products list */}
                  {claimProducts.length > 0 && (
                    <div className="space-y-1 bg-white p-3 rounded-xl border max-h-32 overflow-y-auto">
                      {claimProducts.map((cp, idx) => {
                        const prod = products.find(p => p.id === cp.productId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs p-1.5 hover:bg-gray-50 rounded-lg">
                            <span className="font-bold text-gray-700">{prod?.name || "Product"}</span>
                            <div className="flex items-center gap-3 font-black">
                              <span className="text-gray-900 font-mono">{cp.quantity} pcs</span>
                              <span className="text-gray-400">@ {formatCurrency(cp.price)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveProductFromClaim(idx)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  ক্লেম ভ্যালু / আর্থিক মূল্য (Taka)
                </label>
                <input
                  type="number"
                  required
                  disabled={claimType === "Free Products"}
                  value={claimAmount}
                  onChange={e => setClaimAmount(e.target.value)}
                  placeholder="যেমন: 5000"
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-black font-mono text-indigo-700 disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">মন্তব্য / বিবরণ</label>
                <textarea
                  required
                  value={claimDescription}
                  onChange={e => setClaimDescription(e.target.value)}
                  rows={3}
                  placeholder="ক্লেম করার কারণ বা রেফারেন্স প্রদান করুন..."
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors"
                >
                  ক্লেম সাবমিট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
