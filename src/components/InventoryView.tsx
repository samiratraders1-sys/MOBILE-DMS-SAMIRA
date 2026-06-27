import React, { useState, useMemo } from "react";
import { Plus, Search, Filter, Edit2, Trash2, History, Wand2, Mic, MicOff, RefreshCw, Sliders, ClipboardList } from "lucide-react";
import CSVUploader from "./CSVUploader";
import DataPreviewModal from "./DataPreviewModal";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import MultiSelect from "./MultiSelect";
import { calculateStock, recordStockMovement } from "../lib/inventoryEngine";
import { StockMovement, MovementType } from "../lib/stockMovement";

interface InventoryProps {
  products: any[];
  add: (item: any) => Promise<any>;
  update: (id: string, item: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
  suppliers: any[];
  summaries: any[];
  purchases: any[];
  role?: string;
  stockAdjustments?: {
    data: any[];
    add: (item: any) => Promise<any>;
    update: (id: string, item: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  user?: any;
}

export default function InventoryView({ products, add, update, remove, suppliers, summaries, purchases, role, stockAdjustments, user }: InventoryProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any | null>(null);
  const [forecasts, setForecasts] = useState<Record<string, number>>({});
  const [loadingForecast, setLoadingForecast] = useState<Record<string, boolean>>({});

  // Inline Editing States
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  
  // Stock Adjustment States
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("গোনা ভুল হয়েছিল (Count Correction)");
  const [adjustCustomReason, setAdjustCustomReason] = useState<string>("");
  const [isSavingAdjustment, setIsSavingAdjustment] = useState<boolean>(false);
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const [inlineStock, setInlineStock] = useState<number>(0);
  const [inlinePrice, setInlinePrice] = useState<number>(0);
  const [inlineCost, setInlineCost] = useState<number>(0);
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);

  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"bn-BD" | "en-US">("bn-BD");

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("আপনার ব্রাউজারে ভয়েস সার্চ সাপোর্ট করে না। অনুগ্রহ করে গুগল ক্রোম ব্রাউজার ব্যবহার করুন।");
      return;
    }

    if (isListening) {
      if ((window as any)._recognitionInstance) {
        try {
          (window as any)._recognitionInstance.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = voiceLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success(voiceLang === "bn-BD" ? "বাংলায় বলুন, আমি শুনছি..." : "Listening in English...", { id: "voice-search-toast" });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "no-speech") {
        toast.error("কোন শব্দ শোনা যায়নি। দয়া করে আবার চেষ্টা করুন।", { id: "voice-search-toast" });
      } else if (event.error === "not-allowed") {
        toast.error("মাইক্রোফোন ব্যবহারের পারমিশন প্রয়োজন।", { id: "voice-search-toast" });
      } else {
        toast.error(`ভয়েস রিকগনিশন ত্রুটি: ${event.error}`, { id: "voice-search-toast" });
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      if (speechToText) {
        let cleanText = speechToText;
        // Strip a trailing full stop/daari which can sometimes be returned
        if (cleanText.endsWith("।") || cleanText.endsWith(".")) {
          cleanText = cleanText.slice(0, -1);
        }
        setSearch(cleanText);
        toast.success(`সার্চ করা হচ্ছে: "${cleanText}"`, { id: "voice-search-toast", duration: 3000 });
      }
    };

    (window as any)._recognitionInstance = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Start speech recognition failed:", e);
      setIsListening(false);
    }
  };


  const handleInlineSave = async (id: string) => {
    setIsSavingInline(true);
    try {
      const prevStock = calculateStock(movements, id);
      const nextStock = Number(inlineStock);

      // We still update the product's other details, but stop updating stock directly
      await update(id, {
        price: Number(inlinePrice),
        cost: Number(inlineCost)
      });

      if (prevStock !== nextStock) {
        await recordStockMovement(id, 'ADJUSTMENT', nextStock - prevStock, id);
      }

      setInlineEditId(null);
    } catch (error) {
      console.error("Inline save error: ", error);
      toast.error("ইনলাইন এডিট সফল হয়নি");
    } finally {
      setIsSavingInline(false);
    }
  };

  const getForecast = async (product: any) => {
    setLoadingForecast(prev => ({ ...prev, [product.id]: true }));
    try {
      const response = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product, 
          summaries: summaries.filter(s => s.items.some((i: any) => i.productId === product.id))
        }),
      });
      const data = await response.json();
      setForecasts(prev => ({ ...prev, [product.id]: data.suggestedQuantity }));
      toast.success(`সাজেস্টেড অর্ডার: ${data.suggestedQuantity}`);
    } catch (error) {
      toast.error("ফোরকাস্ট করতে ব্যর্থ হয়েছে");
    } finally {
      setLoadingForecast(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const categories = useMemo(() => [...new Set(products.map(p => p.category || "General"))], [products]);

  const filtered = products.filter(p => 
    (p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))) &&
    (selectedCategories.length === 0 || 
        (selectedCategories.includes('LOW_STOCK') && calculateStock(movements, p.id) <= (p.minStockLevel || 5)) ||
        selectedCategories.includes(p.category || "General")
    ) &&
    (selectedSuppliers.length === 0 || selectedSuppliers.includes(p.supplierId))
  );

  const movements = useMemo(() => {
      const pMovements: StockMovement[] = purchases.map(p => ({
          id: p.id,
          productId: p.productId,
          type: 'PURCHASE',
          quantity: Number(p.quantity) || 0,
          referenceId: p.id,
          date: p.date,
          timestamp: Date.parse(p.date) || 0
      }));
      const aMovements: StockMovement[] = (stockAdjustments?.data || []).map(a => ({
          id: a.id,
          productId: a.productId,
          type: 'ADJUSTMENT',
          quantity: Number(a.quantityChanged) || 0,
          referenceId: a.id,
          date: a.date,
          timestamp: Date.parse(a.date) || 0
      }));
      return [...pMovements, ...aMovements];
  }, [purchases, stockAdjustments]);

  // Calculate total values
  const totalValue = filtered.reduce((acc, p) => {
    const stock = calculateStock(movements, p.id);
    return acc + (Math.max(0, stock) * (Number(p.price) || 0));
  }, 0);
  
  const totalCostValue = filtered.reduce((acc, p) => {
    const stock = calculateStock(movements, p.id);
    return acc + (Math.max(0, stock) * (Number(p.cost) || 0));
  }, 0);

  const downloadCSV = () => {
    const headers = ["Name", "SKU", "Category", "Stock", "Sale Price", "Purchase Cost", "Carton Size", "Unit", "Supplier Name"];
    const rows = filtered.map(p => {
      const supplierName = suppliers.find(s => s.id === p.supplierId)?.name || "";
      return [
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.sku || "").replace(/"/g, '""')}"`,
        `"${(p.category || "General").replace(/"/g, '""')}"`,
        p.stock || 0,
        p.price || 0,
        p.cost || 0,
        p.cartoonSize || 1,
        `"${(p.unit || "Pcs").replace(/"/g, '""')}"`,
        `"${supplierName.replace(/"/g, '""')}"`
      ];
    });
    // Create CSV content
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    // Prefix UTF-8 Byte Order Mark (BOM) so Excel renders Bengali characters correctly
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'samira_traders_inventory.csv';
    a.click();
    toast.success("ইনভেন্টরি টেমপ্লেট CSV ডাউনলোড হয়েছে!");
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const product = {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      price: Number(formData.get("price")),
      cost: Number(formData.get("cost")),
      stock: Number(formData.get("stock")),
      cartoonSize: Number(formData.get("cartoonSize") || 1),
      supplierId: formData.get("supplierId") as string,
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      expiryDate: formData.get("expiryDate") as string,
      minStockLevel: Number(formData.get("minStockLevel") || 5)
    };
    
    if (editingId) {
      const origProduct = products.find(p => p.id === editingId);
      const prevStock = origProduct ? Number(origProduct.stock) || 0 : 0;
      const nextStock = Number(product.stock);

      await update(editingId, product);

      if (prevStock !== nextStock) {
        await recordStockMovement(origProduct.id, 'ADJUSTMENT', nextStock - prevStock, editingId);
      }
      setEditingId(null);
    } else {
      const newId = await add({
          name: product.name,
          sku: product.sku,
          price: product.price,
          cost: product.cost,
          cartoonSize: product.cartoonSize,
          supplierId: product.supplierId,
          unit: product.unit,
          category: product.category,
          expiryDate: product.expiryDate,
          minStockLevel: product.minStockLevel
      });
      if (newId && product.stock > 0) {
        await recordStockMovement(newId, 'OPENING', product.stock, newId);
      }
    }
    setShowAdd(false);
  };

  const handleBulkSave = async () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(l => l);
    let count = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header line if present
      const isHeader = i === 0 && (
        line.toLowerCase().includes("name") || 
        line.includes("নাম") || 
        line.toLowerCase().includes("sku") || 
        line.toLowerCase().includes("sale price")
      );
      if (isHeader) {
        continue;
      }
      
      // Robust CSV / Tab splitter that handles enclosing quotes and commas inside them
      const parts: string[] = [];
      if (line.includes("\t")) {
        // Tab-separated from direct copy-paste Excel sheet
        const rawParts = line.split("\t");
        rawParts.forEach(p => {
          let clean = p.trim();
          if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.slice(1, -1).replace(/""/g, '"');
          }
          parts.push(clean);
        });
      } else {
        // Standard Comma-separated CSV parsing
        let current = "";
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        
        // Clean up quotes for each parsed part
        for (let j = 0; j < parts.length; j++) {
          let clean = parts[j];
          if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.slice(1, -1).replace(/""/g, '"');
          }
          parts[j] = clean;
        }
      }

      if (parts[0]) {
        const name = parts[0];
        const sku = parts[1] || "";
        const category = parts[2] || "General";
        const stock = Number(parts[3] || 0);
        const price = Number(parts[4] || 0);
        const cost = Number(parts[5] || 0);
        const cartoonSize = Number(parts[6] || 1);
        const unit = parts[7] || "Pcs";
        const tempSupplier = parts[8] || "";

        // Find supplier by name in collections
        let foundSupplierId = "";
        if (tempSupplier) {
          const matched = suppliers.find(
            s => (s.name || "").trim().toLowerCase() === tempSupplier.toLowerCase()
          );
          if (matched) {
            foundSupplierId = matched.id;
          }
        }

        await add({
          name,
          sku,
          category,
          stock,
          price,
          cost,
          cartoonSize,
          unit,
          supplierId: foundSupplierId,
          minStockLevel: 5
        });
        count++;
      }
    }
    setBulkText("");
    setShowBulk(false);
    toast.success(`${count} টি পণ্য সফলভাবে বাল্ক এন্ট্রি করা হয়েছে`);
  };

  const handleUndoImport = async () => {
      if (lastImportedIds.length === 0) return;
      
      for (const id of lastImportedIds) {
          await remove(id);
      }
      setLastImportedIds([]);
      toast.success("ইম্পোর্টটি আনডু করা হয়েছে");
  };

  const handleImportInventory = (data: any[]) => {
      setPreviewData(data);
  };

  const confirmImportInventory = async () => {
      let count = 0;
      const newIds: string[] = [];
      for (const itemData of previewData) {
         if (!itemData.Name && !itemData.name) continue;
         
         const name = (itemData.Name || itemData.name).trim();
         const sku = (itemData.SKU || itemData.sku || "").trim();
         const category = (itemData.Category || itemData.category || "General").trim();
         const stock = Number(itemData.Stock || itemData.stock || 0);
         const price = Number(itemData.Price || itemData.price || 0);
         const cost = Number(itemData.Cost || itemData.cost || 0);
         const cartoonSize = Number(itemData.CartonSize || itemData.cartoonSize || 1);
         const unit = (itemData.Unit || itemData.unit || "Pcs").trim();
         const tempSupplier = (itemData.SupplierName || itemData.supplierName || "").trim();
         
         let foundSupplierId = "";
         if (tempSupplier) {
             const matched = suppliers.find(
                 s => (s.name || "").trim().toLowerCase() === tempSupplier.toLowerCase()
             );
             if (matched) {
                 foundSupplierId = matched.id;
             }
         }
         
         // Check if exists
         const existing = products.find(p => (sku && p.sku === sku) || p.name.trim().toLowerCase() === name.toLowerCase());

         const productData = {
           name,
           sku,
           category,
           stock,
           price,
           cost,
           cartoonSize,
           unit,
           supplierId: foundSupplierId,
           minStockLevel: 5
         };

         if (existing) {
             await update(existing.id, { ...existing, ...productData });
         } else {
             const newId = await add(productData);
             if (newId) newIds.push(newId);
         }
         count++;
      }
      setPreviewData([]);
      setShowBulk(false);
      setLastImportedIds(newIds);
      toast.success(`${count} টি পণ্য সফলভাবে ইম্পোর্ট করা হয়েছে`, {
          duration: 5000,
      });
      // Added undo logic separately if needed or just removed it for simplicity if 'action' is causing issues
  };

  return (
    <div className="space-y-6">
      {previewData.length > 0 && <DataPreviewModal data={previewData} onCancel={() => setPreviewData([])} onConfirm={confirmImportInventory} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">ইনভেন্টরি ম্যানেজমেন্ট</h2>
          <p className="text-[#6C757D]">পণ্য এবং মজুদের হিসাব রাখুন</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-600">মোট বিক্রয় মূল্য</span>
            <span className="text-lg font-black text-blue-700">{formatCurrency(totalValue)}</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-orange-600">মোট কেনা মূল্য</span>
            <span className="text-lg font-black text-orange-700">{formatCurrency(totalCostValue)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-200 transition-all"
          >
            প্রিন্ট
          </button>
          <button 
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-sm border border-green-100 hover:bg-green-100 transition-all font-bold"
          >
            ডাউনলোড CSV
          </button>
          <button 
            onClick={() => setShowAuditLog(true)}
            className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-extrabold text-sm border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1.5"
            title="সকল স্টক সমন্বয়ের অডিট হিস্ট্রি দেখুন"
          >
            <ClipboardList className="w-4 h-4" /> স্টক অডিট লগ
          </button>
          {role !== "sr" && (
            <>
              <button 
                onClick={() => setShowBulk(true)}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all font-bold"
              >
                বাল্ক এন্ট্রি (Bulk)
              </button>
              <button 
                onClick={() => { setShowAdd(true); setEditingId(null); }}
                className="btn-primary flex items-center justify-center gap-2 font-bold"
              >
                <Plus className="w-5 h-5" /> নতুন পণ্য
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD] w-5 h-5" />
          <input 
            type="text" 
            placeholder="পণ্যের নাম বা SKU দিয়ে খুঁজুন..." 
            className="w-full pl-10 pr-28 py-3 bg-white border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#000] focus:ring-offset-2 transition-all text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            {/* Language Selector */}
            <button
              onClick={() => {
                const clickLang = voiceLang === "bn-BD" ? "en-US" : "bn-BD";
                setVoiceLang(clickLang);
                toast.success(clickLang === "bn-BD" ? "ভয়েস ভাষা: বাংলা (bn-BD)" : "Voice Lang: English (en-US)", { duration: 1500 });
              }}
              title="ভয়েসের ভাষা পরিবর্তন করুন (বাংলা/English)"
              className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-gray-100 text-gray-600 transition border border-gray-200 select-none"
            >
              {voiceLang === "bn-BD" ? "বাংলা" : "ENG"}
            </button>
            {/* Mic Button */}
            <button
              onClick={handleVoiceSearch}
              title={isListening ? "ভয়েস সার্চ বন্ধ করুন" : "ভয়েস সার্চ করুন"}
              className={`p-1.5 rounded-md transition-all duration-300 relative flex items-center justify-center ${
                isListening 
                  ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-200" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black border border-gray-250"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 text-white" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        <MultiSelect
          options={categories.map(cat => ({ value: cat, label: cat }))}
          selectedValues={selectedCategories}
          onChange={setSelectedCategories}
          placeholder="সকল ক্যাটাগরি"
          className="w-full sm:w-52 shrink-0"
        />

        <MultiSelect
          options={suppliers.map(s => ({ value: s.id, label: s.name }))}
          selectedValues={selectedSuppliers}
          onChange={setSelectedSuppliers}
          placeholder="সকল সাপ্লায়ার"
          className="w-full sm:w-52 shrink-0"
        />
        <button 
            onClick={() => {
                if (selectedCategories.length === 1 && selectedCategories[0] === 'LOW_STOCK') {
                    setSelectedCategories([]);
                } else {
                    setSelectedCategories(['LOW_STOCK']);
                }
            }}
            className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all ${
                selectedCategories.includes('LOW_STOCK') 
                ? 'bg-red-500 text-white border-red-500' 
                : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
            }`}
        >
            লো স্টক (Low Stock)
        </button>
      </div>

      <div className="bg-white border border-[#E9ECEF] rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#F8F9FA] border-bottom border-[#E9ECEF]">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">পণ্যের নাম</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">ক্যাটাগরি</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">মেয়াদউত্তীর্ণ তারিখ</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">মজুদ (Stock)</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">বিক্রয় মূল্য</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">কেনার দাম (Cost)</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9ECEF]">
            {filtered.map(p => {
              const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
              const isNearingExpiry = p.expiryDate && !isExpired && (new Date(p.expiryDate).getTime() - Date.now()) < (30 * 24 * 60 * 60 * 1000);

              return (
              <tr key={p.id} className={isExpired ? "bg-red-50 hover:bg-red-100" : isNearingExpiry ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-[#FDFDFD]"}>
                <td className="px-6 py-4">
                  <div className="font-medium text-[#1A1A1A]">{p.name}</div>
                  <div className="text-xs text-[#ADB5BD] font-mono">{p.sku || "No SKU"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-[#E9ECEF] rounded text-xs font-medium uppercase">{p.category || "General"}</span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isExpired ? 'text-red-700 font-bold' : isNearingExpiry ? 'text-orange-700 font-bold' : 'text-gray-600'}`}>
                  {p.expiryDate || "N/A"}
                  {(isExpired || isNearingExpiry) && <span className="ml-2 text-xs">({isExpired ? "মেয়াদ শেষ" : "মেয়াদ শেষ হবে"})</span>}
                </td>
                <td className="px-6 py-4">
                  {p.id === inlineEditId && role !== "sr" ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        step="any"
                        value={inlineStock} 
                        onChange={(e) => setInlineStock(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-950 font-mono focus:outline-none focus:ring-1 focus:ring-black bg-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineSave(p.id);
                          if (e.key === 'Escape') setInlineEditId(null);
                        }}
                      />
                      <span className="text-xs text-gray-400">{p.unit || "pcs"}</span>
                    </div>
                  ) : (
                    <div 
                      onDoubleClick={() => {
                        if (role === "sr") return;
                        setInlineEditId(p.id);
                        setInlineStock(calculateStock(movements, p.id));
                        setInlinePrice(p.price);
                        setInlineCost(p.cost || 0);
                      }}
                      className={`${calculateStock(movements, p.id) <= (p.minStockLevel || 5) ? "text-red-500 font-bold" : ""} ${role === "sr" ? "" : "cursor-pointer border-b border-dashed border-gray-300 hover:border-black"} select-none inline-block`}
                      title={role === "sr" ? "" : "ডাবল ক্লিক করে ইনলাইন এডিট করুন"}
                    >
                      {calculateStock(movements, p.id)} {p.unit || "pcs"}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono font-medium">
                  {p.id === inlineEditId && role !== "sr" ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">৳</span>
                      <input 
                        type="number" 
                        step="any"
                        value={inlinePrice} 
                        onChange={(e) => setInlinePrice(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-950 font-mono focus:outline-none focus:ring-1 focus:ring-black bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineSave(p.id);
                          if (e.key === 'Escape') setInlineEditId(null);
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => {
                        if (role === "sr") return;
                        setInlineEditId(p.id);
                        setInlineStock(p.stock);
                        setInlinePrice(p.price);
                        setInlineCost(p.cost || 0);
                      }}
                      className={`${role === "sr" ? "" : "cursor-pointer border-b border-dashed border-gray-300 hover:border-black"} select-none inline-block`}
                      title={role === "sr" ? "" : "ডাবল ক্লিক করে ইনলাইন এডিট করুন"}
                    >
                      {new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT" }).format(p.price)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono font-medium">
                  {p.id === inlineEditId && role !== "sr" ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">৳</span>
                      <input 
                        type="number" 
                        step="any"
                        value={inlineCost} 
                        onChange={(e) => setInlineCost(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-950 font-mono focus:outline-none focus:ring-1 focus:ring-black bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineSave(p.id);
                          if (e.key === 'Escape') setInlineEditId(null);
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => {
                        if (role === "sr") return;
                        setInlineEditId(p.id);
                        setInlineStock(p.stock);
                        setInlinePrice(p.price);
                        setInlineCost(p.cost || 0);
                      }}
                      className={`${role === "sr" ? "" : "cursor-pointer border-b border-dashed border-gray-300 hover:border-black"} select-none inline-block`}
                      title={role === "sr" ? "" : "ডাবল ক্লিক করে ইনলাইন এডিট করুন"}
                    >
                      {new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT" }).format(p.cost || 0)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {p.id === inlineEditId ? (
                    <div className="flex flex-wrap gap-1">
                      <button 
                        onClick={() => handleInlineSave(p.id)}
                        disabled={isSavingInline}
                        className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                        title="সংরক্ষণ করুন"
                      >
                        {isSavingInline ? "লোডিং..." : "সেভ"}
                      </button>
                      <button 
                        onClick={() => setInlineEditId(null)}
                        disabled={isSavingInline}
                        className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition"
                        title="বাতিল করুন"
                      >
                        বাতিল
                      </button>
                      <button
                        onClick={() => {
                          setInlineEditId(null);
                          setEditingId(p.id);
                          setShowAdd(true);
                        }}
                        disabled={isSavingInline}
                        className="text-white hover:bg-blue-700 bg-blue-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                        title="সম্পূর্ণ বিবরণ এডিট করুন"
                      >
                        বিস্তারিত
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedProductForHistory(p)}
                        className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg"
                        title="স্টক মুভমেন্ট হিস্ট্রি"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      {role !== "sr" && (
                        <>
                          <button 
                            onClick={() => {
                              setAdjustProduct(p);
                              setAdjustNewStock(p.stock.toString());
                              setAdjustReason("গোনা ভুল হয়েছিল (Count Correction)");
                              setAdjustCustomReason("");
                            }}
                            className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="স্টক সমন্বয় (Direct Stock Adjustment)"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => getForecast(p)}
                            disabled={loadingForecast[p.id]}
                            className={`p-2 rounded-lg ${loadingForecast[p.id] ? 'text-gray-400' : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'}`}
                            title={forecasts[p.id] ? `সাজেশন: ${forecasts[p.id]}` : "ফোরকাস্ট দেখুন"}
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setInlineEditId(p.id);
                              setInlineStock(p.stock);
                              setInlinePrice(p.price);
                              setInlineCost(p.cost || 0);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                            title="ইনলাইন এডিট করুন"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { if(confirm("ডিলিট করতে চান?")) remove(p.id); }}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="ডিলিট"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 text-center text-[#ADB5BD]"> কোনো পণ্য পাওয়া যায়নি </div>
        )}
      </div>

      {showBulk && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-2">পণ্য বাল্ক এন্ট্রি</h3>
            <div className="text-xs text-gray-500 mb-4 space-y-1">
              <p>আপনার CSV ফাইলটি আপলোড করুন।</p>
              <button onClick={downloadCSV} className="text-indigo-600 font-bold underline cursor-pointer">স্যাম্পল CSV ফরম্যাট ডাউনলোড করুন</button>
            </div>
            <CSVUploader onImport={handleImportInventory} title="পণ্যসমূহ" />
            <div className="flex gap-4 mt-4">
              <button onClick={() => setShowBulk(false)} className="flex-1 border py-3 rounded-xl font-medium">বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">{editingId ? "পণ্য এডিট করুন" : "নতুন পণ্য যোগ করুন"}</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">পণ্যের নাম</label>
                  <input name="name" defaultValue={products.find(x => x.id === editingId)?.name} required className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input name="sku" defaultValue={products.find(x => x.id === editingId)?.sku} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">সাপ্লায়ার / কোম্পানি</label>
                  <select name="supplierId" defaultValue={products.find(x => x.id === editingId)?.supplierId} className="w-full border rounded-lg p-2 bg-white">
                    <option value="">সিলেক্ট করুন</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ক্যাটাগরি</label>
                  <input name="category" defaultValue={products.find(x => x.id === editingId)?.category} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">পণ্য কেনা দাম</label>
                  <input type="number" step="any" name="cost" defaultValue={products.find(x => x.id === editingId)?.cost} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">কার্টুন সাইজ (এক কার্টুনে পিস)</label>
                  <input type="number" step="any" name="cartoonSize" defaultValue={products.find(x => x.id === editingId)?.cartoonSize || 1} required className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">বিক্রয় মূল্য</label>
                  <input type="number" step="any" name="price" defaultValue={products.find(x => x.id === editingId)?.price} required className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">বর্তমান স্টক</label>
                  <input type="number" step="any" name="stock" defaultValue={products.find(x => x.id === editingId)?.stock} required className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">মেয়াদউত্তীর্ণ তারিখ</label>
                  <input type="date" name="expiryDate" defaultValue={products.find(x => x.id === editingId)?.expiryDate} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">একক (Unit)</label>
                  <input name="unit" placeholder="Kg, Pcs, Box" defaultValue={products.find(x => x.id === editingId)?.unit} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ন্যূনতম স্টক লেভেল (অ্যালার্টের জন্য)</label>
                  <input type="number" step="any" name="minStockLevel" defaultValue={products.find(x => x.id === editingId)?.minStockLevel || 5} required className="w-full border rounded-lg p-2" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border py-3 rounded-xl font-medium">বাতিল</button>
                <button type="submit" className="flex-1 btn-primary py-3">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProductForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <h3 className="text-xl font-bold mb-1">স্টক মুভমেন্ট হিস্ট্রি</h3>
            <p className="text-gray-500 text-sm mb-4">{selectedProductForHistory.name}</p>
            <div className="overflow-y-auto flex-1 mb-4 border border-gray-100 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F8F9FA] sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="p-3 font-semibold text-xs uppercase text-gray-500">তারিখ ও সময়</th>
                      <th className="p-3 font-semibold text-xs uppercase text-gray-500">লেনদেন / মুভমেন্ট ধরন</th>
                      <th className="p-3 font-semibold text-xs uppercase text-gray-500 text-right">পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const purchaseHistory = purchases
                        .filter(p => p.productId === selectedProductForHistory.id)
                        .map(p => ({
                          date: p.date,
                          type: "ক্রয় (Purchase)",
                          qty: Number(p.quantity) || 0,
                          badge: "bg-blue-50 text-blue-700",
                          meta: `সাপ্লায়ার: ${suppliers.find(s => s.id === p.supplierId)?.name || "N/A"}`
                        }));

                      const salesHistory = summaries
                        .flatMap(s => s.items
                          .filter((i: any) => i.productId === selectedProductForHistory.id)
                          .map((i: any) => ({
                            date: s.date,
                            type: "বিক্রয় (Sale / Settlement)",
                            qty: -(Number(i.totalPieces) || 0),
                            badge: "bg-green-50 text-green-700",
                            meta: `রুট: ${s.routeId || "N/A"}`
                          }))
                        );

                      const adjustmentHistory = (stockAdjustments?.data || [])
                        .filter(a => a.productId === selectedProductForHistory.id)
                        .map(a => ({
                          date: a.date,
                          type: `সমন্বয়: ${a.reason}`,
                          qty: Number(a.quantityChanged) || 0,
                          badge: "bg-amber-50 text-amber-700",
                          meta: `ইউজার: ${a.user}`
                        }));

                      const allHistory = [...purchaseHistory, ...salesHistory, ...adjustmentHistory]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (allHistory.length === 0) {
                        return (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-gray-400">কোনো মুভমেন্ট বা ট্রানজেকশন রেকর্ড পাওয়া যায়নি</td>
                          </tr>
                        );
                      }

                      return allHistory.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 text-xs font-mono text-gray-600">
                            {new Date(m.date).toLocaleString('bn-BD', { hour12: true })}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${m.badge}`}>
                              {m.type}
                            </span>
                            <div className="text-[11px] text-gray-400 font-sans">{m.meta}</div>
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${m.qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {m.qty > 0 ? `+${m.qty}` : m.qty} {selectedProductForHistory.unit || "pcs"}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
            </div>
            <button onClick={() => setSelectedProductForHistory(null)} className="w-full border py-3 rounded-xl font-bold hover:bg-gray-50 transition">বন্ধ করুন</button>
          </div>
        </div>
      )}

      {/* Direct Stock Adjustment Modal */}
      {adjustProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">স্টক সমন্বয় (Stock Adjustment)</h3>
              <button 
                onClick={() => setAdjustProduct(null)} 
                className="p-1 rounded-full hover:bg-gray-200 transition text-gray-500"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-4">
              পণ্য: <span className="font-bold text-gray-800">{adjustProduct.name}</span> <span className="text-gray-400">({adjustProduct.sku || "No SKU"})</span>
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (isSavingAdjustment) return;
              setIsSavingAdjustment(true);
              try {
                const finalReason = adjustReason === "অন্যান্য (Other)" 
                  ? (adjustCustomReason.trim() || "অন্যান্য স্টক সমন্বয়") 
                  : adjustReason;
                
                const previousStock = Number(adjustProduct.stock) || 0;
                const newStock = Number(adjustNewStock);
                
                if (isNaN(newStock) || newStock < 0) {
                  toast.error("সমন্বয়কৃত স্টক সংখ্যাটি সঠিক নয়!");
                  setIsSavingAdjustment(false);
                  return;
                }

                await update(adjustProduct.id, {
                  stock: newStock
                });

                await recordStockMovement(adjustProduct.id, 'ADJUSTMENT', newStock - previousStock, adjustProduct.id);
                toast.success("স্টক সমন্বয় সফলভাবে সম্পন্ন হয়েছে!");
                setAdjustProduct(null);
              } catch (err) {
                console.error("Adjustment failure:", err);
                toast.error("সমন্বয় রেকর্ড করা সম্ভব হয়নি।");
              } finally {
                setIsSavingAdjustment(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">বর্তমান স্টক</label>
                <div className="bg-gray-50 border border-gray-150 p-3 rounded-lg text-lg font-mono font-bold text-gray-700">
                  {adjustProduct.stock} {adjustProduct.unit || "pcs"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">নতুন স্টক সংখ্যা (New Stock * )</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any"
                    value={adjustNewStock}
                    onChange={(e) => setAdjustNewStock(e.target.value)}
                    required
                    placeholder="নতুন সমাপনী স্টক পরিমাণ লিখুন"
                    className="w-full border rounded-lg p-3 font-mono text-gray-900 bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                    {adjustProduct.unit || "pcs"}
                  </span>
                </div>
                <div className="mt-1.5 text-xs">
                  {(() => {
                    const prev = Number(adjustProduct.stock) || 0;
                    const next = Number(adjustNewStock);
                    if (isNaN(next)) return null;
                    const diff = next - prev;
                    if (diff > 0) {
                      return <span className="text-green-600 font-medium">+ {diff} পিস মজুদে অতিরিক্ত যোগ হবে</span>;
                    } else if (diff < 0) {
                      return <span className="text-red-500 font-medium">{diff} পিস মজুদ থেকে কমানো হবে (হ্রাস পাবে)</span>;
                    } else {
                      return <span className="text-gray-400">স্টক সংখ্যার কোনো পরিবর্তন হবে না</span>;
                    }
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">সমন্বয়ের মূল কারণ (Reason *)</label>
                <select 
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full border rounded-lg p-2.5 bg-white text-sm"
                >
                  <option value="গোনা ভুল হয়েছিল (Count Correction)">গোনা ভুল হয়েছিল (Count Correction)</option>
                  <option value="পণ্যের সমীকরণ ক্ষতি / নষ্ট (Damage / Breakage)">পণ্যের সমীকরণ ক্ষতি / নষ্ট (Damage / Breakage)</option>
                  <option value="মেয়াদোত্তীর্ণ পণ্য সমন্বয় (Expiry correction)">মেয়াদোত্তীর্ণ পণ্য সমন্বয় (Expiry correction)</option>
                  <option value="গিফট / বোনাস স্টক প্রাপ্তি (Bonus Received)">গিফট / বোনাস স্টক প্রাপ্তি (Bonus Received)</option>
                  <option value="অন্যান্য (Other)">অন্যান্য (Other...)</option>
                </select>
              </div>

              {adjustReason === "অন্যান্য (Other)" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">অন্য কারণটি লিখুন</label>
                  <input 
                    type="text"
                    value={adjustCustomReason}
                    onChange={(e) => setAdjustCustomReason(e.target.value)}
                    required
                    placeholder="হ্রাস/বৃদ্ধির কারণটি সংক্ষেপে লিখুন"
                    className="w-full border rounded-lg p-2.5 text-sm bg-white text-gray-900"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setAdjustProduct(null)} 
                  disabled={isSavingAdjustment}
                  className="flex-1 border py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingAdjustment || Number(adjustProduct.stock) === Number(adjustNewStock)}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 font-semibold"
                >
                  {isSavingAdjustment ? "লোডিং..." : "সমন্বয় সেভ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Stock Audit Log (List of all Adjustments) */}
      {showAuditLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-4xl w-full rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold">স্টক অডিট ও সমন্বয় লগ (Inventory Audit Logs)</h3>
              <button 
                onClick={() => setShowAuditLog(false)} 
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-4">সকল পণ্যের ম্যানুয়াল স্টক সংশোধনীর সম্পূর্ণ অডিট রেকর্ড</p>

            <div className="overflow-y-auto flex-1 mb-4 border border-gray-150 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8F9FA] sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-semibold text-xs uppercase text-gray-500">তারিখ ও সময়</th>
                    <th className="p-3 font-semibold text-xs uppercase text-gray-500">পণ্যের বিবরণ</th>
                    <th className="p-3 font-semibold text-xs uppercase text-gray-500 text-center">আগের স্টক</th>
                    <th className="p-3 font-semibold text-xs uppercase text-gray-500 text-center">নতুন স্টক</th>
                    <th className="p-3 font-semibold text-xs uppercase text-gray-500 text-center">সমন্বয়ের আকার</th>
                    <th className="p-3 font-semibold text-xs uppercase text-gray-500">কারণ ও ব্যবহারকারী</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {(() => {
                    const sortedAdjustments = [...(stockAdjustments?.data || [])]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (sortedAdjustments.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-gray-400 font-medium">কোনো ম্যানুয়াল স্টক সমন্বয় রেকর্ড অডিট লগে খুঁজে পাওয়া যায়নি।</td>
                        </tr>
                      );
                    }

                    return sortedAdjustments.map((item) => {
                      const qty = Number(item.quantityChanged) || 0;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="p-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                            {new Date(item.date).toLocaleString('bn-BD', { hour12: true })}
                          </td>
                          <td className="p-3 max-w-[200px] truncate">
                            <div className="font-semibold text-gray-900">{item.productName || "অজানা পণ্য"}</div>
                            <div className="text-[10px] text-gray-400 font-mono">ID: {item.productId}</div>
                          </td>
                          <td className="p-3 text-center font-mono font-medium text-gray-600">
                            {item.previousStock}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-gray-900">
                            {item.newStock}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              qty > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            }`}>
                              {qty > 0 ? `+${qty}` : qty}
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            <span className="block text-gray-900 font-medium">{item.reason || "N/A"}</span>
                            <span className="block text-[10px] text-indigo-500 font-medium mt-0.5">by {item.user || "Unknown"}</span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => setShowAuditLog(false)} 
              className="w-full border py-3 rounded-xl font-bold bg-gray-50 hover:bg-gray-100 transition text-[#333]"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
