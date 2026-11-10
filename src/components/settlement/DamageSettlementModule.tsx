import React, { useState, useMemo } from "react";
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Trash2, 
  Package, 
  X, 
  Tag, 
  DollarSign, 
  Layers,
  Sparkles,
  Info
} from "lucide-react";

export interface DamageItem {
  productId: string;
  productName: string;
  quantity: number; // total pieces
  cartons?: number;
  pieces?: number;
  price: number;
  reason?: string;
  supplierId?: string;
  sku?: string;
}

interface DamageSettlementModuleProps {
  products: any[];
  damageItems: DamageItem[];
  onChangeDamageItems: (items: DamageItem[]) => void;
  loadedProductIds?: string[]; // IDs of products loaded in the current route summary
}

export const DAMAGE_REASONS = [
  { id: "broken", label: "ভাঙা / ফেটে গেছে (Broken / Crushed)", color: "bg-red-50 text-red-700 border-red-200" },
  { id: "expired", label: "মেয়াদোত্তীর্ণ (Expired / Out of Date)", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "leakage", label: "লিকেজ / গলিত (Leakage / Melted)", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "seal_damaged", label: "সিল নষ্ট / ছেঁড়া প্যাকেজিং (Seal Damaged)", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "defect", label: "কারখানা ত্রুটি (Factory Defect)", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "other", label: "অন্যান্য (Other)", color: "bg-gray-50 text-gray-700 border-gray-200" },
];

export default function DamageSettlementModule({
  products = [],
  damageItems = [],
  onChangeDamageItems,
  loadedProductIds = []
}: DamageSettlementModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "loaded">("loaded");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  
  // Inputs for adding a damage entry
  const [cartonsInput, setCartonsInput] = useState<string>("");
  const [piecesInput, setPiecesInput] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("ভাঙা / ফেটে গেছে (Broken / Crushed)");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filtered products list for search
  const filteredProducts = useMemo(() => {
    let list = products;
    if (filterMode === "loaded" && loadedProductIds.length > 0) {
      list = products.filter(p => loadedProductIds.includes(p.id));
      // If loaded products list is empty, fallback to all
      if (list.length === 0) list = products;
    }

    if (!searchQuery.trim()) return list.slice(0, 30);

    const q = searchQuery.toLowerCase().trim();
    return list.filter(p => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.SKU || p.sku || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return name.includes(q) || sku.includes(q) || cat.includes(q);
    }).slice(0, 30);
  }, [products, filterMode, loadedProductIds, searchQuery]);

  // Selected product carton conversion helpers
  const cartoonSize = selectedProduct?.cartoonSize || selectedProduct?.piecesInCarton || 1;
  const numCartons = parseInt(cartonsInput) || 0;
  const numPieces = parseInt(piecesInput) || 0;
  const totalCalculatedPieces = (numCartons * cartoonSize) + numPieces;
  const effectivePrice = customPrice !== "" ? parseFloat(customPrice) || 0 : (selectedProduct?.price || 0);
  const totalItemLoss = totalCalculatedPieces * effectivePrice;

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setCustomPrice(String(product.price || 0));
    setCartonsInput("");
    setPiecesInput("");
    setIsDropdownOpen(false);
    setSearchQuery(product.name || "");
  };

  const handleClearSelectedProduct = () => {
    setSelectedProduct(null);
    setSearchQuery("");
    setCartonsInput("");
    setPiecesInput("");
    setCustomPrice("");
    setIsDropdownOpen(false);
  };

  const handleAddDamageItem = () => {
    if (!selectedProduct) return;
    if (totalCalculatedPieces <= 0) {
      alert("অনুগ্রহ করে অন্তত ১ পিস বা কার্টুন পরিমাণ লিখুন");
      return;
    }

    const newItem: DamageItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: totalCalculatedPieces,
      cartons: numCartons,
      pieces: numPieces,
      price: effectivePrice,
      reason: selectedReason,
      supplierId: selectedProduct.supplierId || "unknown",
      sku: selectedProduct.SKU || selectedProduct.sku || ""
    };

    // Check if product with same reason already exists in list, if so add up
    const existingIndex = damageItems.findIndex(
      d => d.productId === newItem.productId && d.reason === newItem.reason
    );

    if (existingIndex >= 0) {
      const updated = [...damageItems];
      const existing = updated[existingIndex];
      const combinedQty = existing.quantity + newItem.quantity;
      updated[existingIndex] = {
        ...existing,
        quantity: combinedQty,
        cartons: Math.floor(combinedQty / cartoonSize),
        pieces: combinedQty % cartoonSize,
        price: effectivePrice
      };
      onChangeDamageItems(updated);
    } else {
      onChangeDamageItems([newItem, ...damageItems]);
    }

    // Reset input fields
    handleClearSelectedProduct();
  };

  const handleRemoveDamageItem = (index: number) => {
    const updated = damageItems.filter((_, i) => i !== index);
    onChangeDamageItems(updated);
  };

  // Summary statistics for this module
  const totalDamageQty = useMemo(() => {
    return damageItems.reduce((acc, d) => acc + (Number(d.quantity) || 0), 0);
  }, [damageItems]);

  const totalDamageValue = useMemo(() => {
    return damageItems.reduce((acc, d) => acc + ((Number(d.quantity) || 0) * (Number(d.price) || 0)), 0);
  }, [damageItems]);

  return (
    <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden flex flex-col">
      {/* Module Header with Badge */}
      <div className="bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full">
                পৃথক ড্যামেজ মডিউল
              </span>
              <span className="text-xs font-semibold text-red-100 hidden sm:inline">
                Damage Returns
              </span>
            </div>
            <h3 className="text-base font-black tracking-tight mt-0.5">
              ২. নষ্ট ও ড্যামেজ পণ্য ফেরত এন্ট্রি
            </h3>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl border border-white/10 shrink-0 self-start sm:self-auto">
          <div className="text-right">
            <span className="block text-[10px] text-red-100 font-semibold">মোট ড্যামেজ ক্ষতি</span>
            <span className="text-base font-black tracking-tight text-white">৳{totalDamageValue.toLocaleString()}</span>
          </div>
          <div className="w-px h-7 bg-white/20 mx-1"></div>
          <div className="text-left">
            <span className="block text-[10px] text-red-100 font-semibold">পরিমাণ</span>
            <span className="text-xs font-bold text-white">{totalDamageQty} পিস</span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Interactive Searchable Product Picker Card */}
        <div className="bg-gray-50/70 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-red-600" />
              পণ্য খুঁজুন বা সিলেক্ট করুন (Search & Select Product)
            </label>
            
            {/* Filter Toggle: Loaded vs All */}
            {loadedProductIds.length > 0 && (
              <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode("loaded")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterMode === "loaded"
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  রুটে লোড করা পণ্য ({loadedProductIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterMode === "all"
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  সমস্ত ইনভেন্টরি
                </button>
              </div>
            )}
          </div>

          {/* Search Input with Autocomplete Dropdown */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="পণ্যের নাম, কোড বা SKU লিখে সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedProduct && e.target.value !== selectedProduct.name) {
                    setSelectedProduct(null);
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSelectedProduct}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results Dropdown */}
            {isDropdownOpen && filteredProducts.length > 0 && !selectedProduct && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const isLoaded = loadedProductIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-red-50/60 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate flex items-center gap-2">
                          <span>{p.name}</span>
                          {isLoaded && (
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                              লোডশিটে আছে
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>SKU: {p.SKU || p.sku || "N/A"}</span>
                          <span>•</span>
                          <span>কার্টুন সাইজ: {p.cartoonSize || p.piecesInCarton || 1} পিস</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-gray-950 block">৳{p.price || 0}</span>
                        <span className="text-[10px] text-gray-400">দর / পিস</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Product Specs Card */}
          {selectedProduct && (
            <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                    নির্বাচিত পণ্য:
                  </span>
                  <h4 className="text-sm font-black text-gray-900">{selectedProduct.name}</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    কার্টুন প্রতি: <strong>{cartoonSize}</strong> পিস | বর্তমান মূল্য: <strong>৳{selectedProduct.price || 0}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedProduct}
                  className="text-xs font-bold text-red-600 hover:text-red-800 bg-white border border-red-200 px-2.5 py-1 rounded-lg"
                >
                  পরিবর্তন
                </button>
              </div>

              {/* Quantity, Packaging & Price Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* Cartons Input */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    কার্টুন (Carton)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={cartonsInput}
                    onChange={(e) => setCartonsInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Loose Pieces Input */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    পিস (Pieces)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={piecesInput}
                    onChange={(e) => setPiecesInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Total Calculated Pieces Preview */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    মোট পিস (Total)
                  </label>
                  <div className="px-3 py-2 bg-white border border-dashed border-red-300 rounded-xl text-xs font-black text-center text-red-700">
                    {totalCalculatedPieces} পিস
                  </div>
                </div>

                {/* Rate / Unit Price */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    দর / পিস (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  নষ্ট বা ক্ষতির কারণ (Damage Reason)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {DAMAGE_REASONS.map((r) => {
                    const isSelected = selectedReason === r.label;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedReason(r.label)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left border transition-all truncate ${
                          isSelected
                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                            : `${r.color} hover:opacity-90`
                        }`}
                        title={r.label}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Loss calculation & Add Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-red-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-semibold">হিসাবকৃত ক্ষতি:</span>
                  <span className="text-sm font-black text-red-700">
                    ৳{totalItemLoss.toLocaleString()} ({totalCalculatedPieces} পিস @ ৳{effectivePrice})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddDamageItem}
                  disabled={totalCalculatedPieces <= 0}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ড্যামেজ তালিকায় যোগ করুন
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List of Added Damage Items */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-red-600" />
              দাখিলকৃত ড্যামেজ পণ্যের তালিকা ({damageItems.length})
            </span>
            {damageItems.length > 0 && (
              <span className="text-xs font-bold text-red-600">
                মোট ক্ষতি: ৳{totalDamageValue.toLocaleString()}
              </span>
            )}
          </div>

          {damageItems.length === 0 ? (
            <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-1">
              <Info className="w-5 h-5 text-gray-400 mx-auto" />
              <p className="text-xs font-bold text-gray-600">কোনো ড্যামেজ বা নষ্ট পণ্য যুক্ত করা হয়নি</p>
              <p className="text-[11px] text-gray-400">
                যদি গাড়িতে কোনো ভাঙা বা ডেট-ওভার পণ্য ফেরত আসে, উপরের সার্চ বক্স থেকে যোগ করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {damageItems.map((item, idx) => {
                const lossVal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-white border border-red-100/90 rounded-2xl hover:border-red-200 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-black text-gray-900 truncate">
                          {item.productName}
                        </h5>
                        {item.reason && (
                          <span className="text-[10px] font-black bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md">
                            {item.reason}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>
                          পরিমাণ: <strong className="text-gray-800">{item.quantity} পিস</strong>
                          {item.cartons ? ` (${item.cartons} কার্টুন ${item.pieces || 0} পিস)` : ""}
                        </span>
                        <span>•</span>
                        <span>দর: ৳{item.price}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="text-right">
                        <span className="text-xs font-black text-red-600 block">
                          ৳{lossVal.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase">ক্ষতি সমন্বয়</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDamageItem(idx)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
