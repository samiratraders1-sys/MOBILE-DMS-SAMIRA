import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Package, Users, FileText, Keyboard } from "lucide-react";

interface GlobalSearchHeaderProps {
  products: any[];
  customers: any[];
  sales: any[];
  setActiveView: (view: string) => void;
  language: "bn" | "en";
}

export default function GlobalSearchHeader({
  products = [],
  customers = [],
  sales = [],
  setActiveView,
  language
}: GlobalSearchHeaderProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for Ctrl+K global shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search filter logic
  const results = useMemo(() => {
    if (!query.trim()) return { products: [], customers: [], invoices: [], totalCount: 0 };

    const terms = query.toLowerCase().trim().split(/\s+/);
    const matchText = (text: string) => {
      if (!text) return false;
      const textLower = text.toLowerCase();
      return terms.every(term => textLower.includes(term));
    };

    // 1. Filter Products
    const matchedProducts = products
      .filter(p => matchText(p.name) || matchText(p.sku) || matchText(p.category) || matchText(p.brand))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        type: "product" as const,
        title: p.name,
        subtitle: `${p.brand || "N/A"} • ${p.category || "General"} • ৳${p.price || 0}`,
        targetView: "inventory"
      }));

    // 2. Filter Customers
    const matchedCustomers = customers
      .filter(c => matchText(c.name) || matchText(c.phone) || matchText(c.shopName) || matchText(c.groupId))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        type: "customer" as const,
        title: c.name,
        subtitle: `${c.shopName || "দোকান নেই"} • ${c.phone || "ফোন নেই"} • ${c.groupId || "গ্রুপ নেই"}`,
        targetView: "customer-mgmt"
      }));

    // 3. Filter Invoices (Sales)
    const matchedInvoices = sales
      .filter(s => {
        const custName = s.customerName || customers.find(c => c.id === s.customerId)?.name || "নগদ কাস্টমার";
        const itemsText = (s.items || []).map((i: any) => products.find(p => p.id === i.productId)?.name || "").join(" ");
        return matchText(s.id) || matchText(custName) || matchText(itemsText) || matchText(s.date);
      })
      .slice(0, 5)
      .map(s => {
        const custName = s.customerName || customers.find(c => c.id === s.customerId)?.name || "নগদ কাস্টমার";
        const formattedDate = s.date ? new Date(s.date).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US") : "N/A";
        return {
          id: s.id,
          type: "invoice" as const,
          title: `${language === "bn" ? "ইনভয়েস" : "Invoice"} #${s.id.slice(-6).toUpperCase()}`,
          subtitle: `${custName} • ${formattedDate} • ৳${s.total || s.netTotal || 0}`,
          targetView: "sales"
        };
      });

    const flatList = [...matchedProducts, ...matchedCustomers, ...matchedInvoices];

    return {
      products: matchedProducts,
      customers: matchedCustomers,
      invoices: matchedInvoices,
      flatList,
      totalCount: flatList.length
    };
  }, [query, products, customers, sales, language]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (item: any) => {
    if (!item) return;
    setActiveView(item.targetView);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const currentFlatList = results.flatList || [];

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-md select-none">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            language === "bn"
              ? "পণ্য, কাস্টমার বা ইনভয়েস খুঁজুন... (Ctrl+K)"
              : "Search Products, Customers, Invoices... (Ctrl+K)"
          }
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white hover:bg-slate-50 focus:bg-white transition-all text-slate-800"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              inputRef.current?.blur();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex(prev => Math.min(prev + 1, currentFlatList.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (currentFlatList[selectedIndex]) {
                handleSelect(currentFlatList[selectedIndex]);
              }
            }
          }}
        />
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200/80 shadow-xl max-h-[400px] overflow-y-auto z-[150] divide-y divide-slate-100 animate-in fade-in duration-150">
          {currentFlatList.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs font-medium">
              {language === "bn" ? "কোন ফলাফল পাওয়া যায়নি" : "No results found"}
            </div>
          ) : (
            <>
              {/* Products Section */}
              {results.products.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600/90 flex items-center gap-1.5">
                    <Package className="w-3 h-3" />
                    <span>{language === "bn" ? "পণ্যসমূহ" : "Products"}</span>
                  </div>
                  {results.products.map((item) => {
                    const idx = currentFlatList.findIndex(f => f.id === item.id && f.type === item.type);
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex flex-col transition-all cursor-pointer select-none ${
                          isSelected ? "bg-indigo-50/80 border-l-4 border-indigo-600 pl-3.5" : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">{item.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Customers Section */}
              {results.customers.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600/90 flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    <span>{language === "bn" ? "কাস্টমার" : "Customers"}</span>
                  </div>
                  {results.customers.map((item) => {
                    const idx = currentFlatList.findIndex(f => f.id === item.id && f.type === item.type);
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex flex-col transition-all cursor-pointer select-none ${
                          isSelected ? "bg-emerald-50/80 border-l-4 border-emerald-600 pl-3.5" : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">{item.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Invoices Section */}
              {results.invoices.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600/90 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    <span>{language === "bn" ? "ইনভয়েস / বিক্রয়" : "Invoices / Sales"}</span>
                  </div>
                  {results.invoices.map((item) => {
                    const idx = currentFlatList.findIndex(f => f.id === item.id && f.type === item.type);
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex flex-col transition-all cursor-pointer select-none ${
                          isSelected ? "bg-amber-50/80 border-l-4 border-amber-500 pl-3.5" : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">{item.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
