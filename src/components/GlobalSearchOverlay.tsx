import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Package, Users, ShoppingCart } from "lucide-react";
import { createSearchIndex } from "../lib/searchIndex";

interface GlobalSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  customers: any[];
  orders: any[];
  setActiveView: (view: string) => void;
}

export default function GlobalSearchOverlay({ isOpen, onClose, products, customers, orders, setActiveView }: GlobalSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchIndex = useRef(createSearchIndex());

  useEffect(() => {
    // Rebuild index whenever data changes
    searchIndex.current = createSearchIndex();
    
    products.forEach(p => searchIndex.current.add({ id: `p-${p.id}`, title: p.name, subtitle: p.sku || "", type: 'product' }));
    customers.forEach(c => searchIndex.current.add({ id: `c-${c.id}`, title: c.name, subtitle: c.phone || "", type: 'customer' }));
    orders.forEach(o => searchIndex.current.add({ id: `o-${o.id}`, title: `Order #${o.id.slice(-6)}`, subtitle: "", type: 'order' }));
  }, [products, customers, orders]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const results = useMemo(() => {
    if (!query) return [];
    
    const searchResults = searchIndex.current.search(query, {
        limit: 10,
        suggest: true 
    });
    
    const flatResults = searchResults.flatMap(r => r.result);
    
    // Map back to original objects to get more details if needed, but here we just need title, type, id and icon
    return flatResults.map((id: any) => {
        const item = String(id);
        if (item.startsWith('p-')) {
            const pid = item.slice(2);
            return { type: 'product', icon: Package, title: products.find(p => p.id === pid)?.name || 'Unknown', id: pid };
        }
        if (item.startsWith('c-')) {
            const cid = item.slice(2);
            return { type: 'customer', icon: Users, title: customers.find(c => c.id === cid)?.name || 'Unknown', id: cid };
        }
        if (item.startsWith('o-')) {
            const oid = item.slice(2);
            return { type: 'order', icon: ShoppingCart, title: `Order #${oid.slice(-6)}`, id: oid };
        }
        return { type: 'unknown', icon: Search, title: 'Unknown', id: '0' };
    });
  }, [query, products, customers, orders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-20">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="পণ্য, কাস্টমার বা অর্ডার খুঁজুন..."
            className="flex-1 text-sm font-medium focus:outline-none"
            onKeyDown={(e) => {
                if(e.key === 'Escape') onClose();
                else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && results[selectedIndex]) {
                    e.preventDefault();
                    const res = results[selectedIndex];
                    if (res.type === 'product') setActiveView('inventory');
                    if (res.type === 'customer') setActiveView('customers');
                    if (res.type === 'order') setActiveView('sr-order-list');
                    onClose();
                }
            }}
          />
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {results.length === 0 && query && <p className="p-4 text-sm text-gray-500">কোনো ফলাফল পাওয়া যায়নি</p>}
          {results.map((res, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 p-3 border-b last:border-0 ${i === selectedIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
              onClick={() => {
                // Navigate to view based on type
                if (res.type === 'product') setActiveView('inventory');
                if (res.type === 'customer') setActiveView('customers');
                if (res.type === 'order') setActiveView('sr-order-list');
                onClose();
              }}
            >
              <res.icon className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold">{res.title}</span>
              <span className="ml-auto text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">{res.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
