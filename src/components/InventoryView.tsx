import React, { useState, useMemo } from "react";
import { Plus, Search, Filter, Edit2, Trash2, History, Wand2, Mic, MicOff, RefreshCw, Sliders, ClipboardList } from "lucide-react";
import CSVUploader from "./CSVUploader";
import DataPreviewModal from "./DataPreviewModal";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import MultiSelect from "./MultiSelect";
import { calculateStock, recordStockMovement } from "../lib/inventoryEngine";
import { StockMovement, MovementType } from "../lib/stockMovement";
import { useConfirm } from "../context/ConfirmContext";

interface InventoryProps {
  products: any[];
  add: (item: any) => Promise<any>;
  update: (id: string, item: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
  suppliers: any[];
  summaries: any[];
  purchases: any[];
  sales?: any[];
  damageInventory?: any[];
  role?: string;
  stockAdjustments?: {
    data: any[];
    add: (item: any) => Promise<any>;
    update: (id: string, item: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  user?: any;
}

export default function InventoryView({ products, add, update, remove, suppliers, summaries, purchases, sales = [], damageInventory = [], role, stockAdjustments, user }: InventoryProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any | null>(null);
  const [forecasts, setForecasts] = useState<Record<string, number>>({});
  const [loadingForecast, setLoadingForecast] = useState<Record<string, boolean>>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [stockTypeFilter, setStockTypeFilter] = useState<"ALL" | "FRESH" | "DAMAGE">("ALL");

  const damageStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    const dmgData = Array.isArray(damageInventory) ? damageInventory : (damageInventory as any)?.data || [];
    dmgData.forEach((log: any) => {
      const pId = log.productId;
      if (!pId) return;
      map[pId] = (map[pId] || 0) + Number(log.quantity || 0);
    });
    return map;
  }, [damageInventory]);

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
  const [importReport, setImportReport] = useState<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    details: string[];
  } | null>(null);

  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"bn-BD" | "en-US">("bn-BD");

  // Bulk Operation States
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkOpType, setBulkOpType] = useState<"PRICE_INCREASE" | "CATEGORY_REASSIGN" | "MIN_STOCK_UPDATE" | "BULK_DELETE" | "">("");
  const [bulkPricePercent, setBulkPricePercent] = useState<string>("");
  const [bulkPriceTarget, setBulkPriceTarget] = useState<"PRICE" | "COST" | "BOTH">("PRICE");
  const [bulkNewCategory, setBulkNewCategory] = useState<string>("");
  const [bulkMinStockLevel, setBulkMinStockLevel] = useState<string>("");
  const [bulkMinStockCategory, setBulkMinStockCategory] = useState<string>("");
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  // QR Replenish Simulation States
  const [showQRReplenish, setShowQRReplenish] = useState(false);
  const [simulatedProductId, setSimulatedProductId] = useState<string>("");
  const [simulatedQty, setSimulatedQty] = useState<string>("");
  const [isSavingSimulated, setIsSavingSimulated] = useState(false);

  // Category Min Stock Bulk Update Modal States
  const [showMinStockModal, setShowMinStockModal] = useState(false);
  const [minStockBulkCategory, setMinStockBulkCategory] = useState("");
  const [minStockBulkLevel, setMinStockBulkLevel] = useState("");
  const [isSavingMinStockBulk, setIsSavingMinStockBulk] = useState(false);

  const { confirmDelete } = useConfirm();

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
      const origProduct = products.find(p => p.id === id);
      const prevStock = origProduct ? Number(origProduct.stock) || 0 : 0;
      const nextStock = Number(inlineStock);

      await update(id, {
        price: Number(inlinePrice),
        cost: Number(inlineCost),
        stock: nextStock
      });

      if (prevStock !== nextStock) {
        if (stockAdjustments && stockAdjustments.add) {
          await stockAdjustments.add({
            productId: id,
            productName: origProduct?.name || "N/A",
            sku: origProduct?.sku || "N/A",
            previousStock: prevStock,
            newStock: nextStock,
            quantityChanged: nextStock - prevStock,
            reason: "ইনলাইন এডিট সমন্বয় (Inline Edit Adjustment)",
            date: new Date().toISOString(),
            user: user?.email || "Unknown"
          });
        }
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

  const filtered = products.filter(p => {
    const matchesSearch = (p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())));
    
    const matchesCategory = (selectedCategories.length === 0 || 
        (selectedCategories.includes('LOW_STOCK') && (p.stock || 0) <= (p.minStockLevel || 5)) ||
        selectedCategories.includes(p.category || "General")
    );
    
    const matchesSupplier = (selectedSuppliers.length === 0 || selectedSuppliers.includes(p.supplierId || ""));

    const damageQty = damageStockMap[p.id] || 0;
    const matchesStockType = stockTypeFilter === "ALL" ||
      (stockTypeFilter === "FRESH" && (p.stock || 0) > 0) ||
      (stockTypeFilter === "DAMAGE" && damageQty > 0);

    return matchesSearch && matchesCategory && matchesSupplier && matchesStockType;
  });

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
    const stock = Number(p.stock) || 0;
    return acc + (Math.max(0, stock) * (Number(p.price) || 0));
  }, 0);
  
  const totalCostValue = filtered.reduce((acc, p) => {
    const stock = Number(p.stock) || 0;
    return acc + (Math.max(0, stock) * (Number(p.cost) || 0));
  }, 0);

  // Inventory Closing Engine Calculations
  const inventoryClosingStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's Sales Value
    let todaysSalesValue = 0;
    (sales || []).filter((s: any) => s.date === todayStr && s.approved).forEach((s: any) => {
      todaysSalesValue += Number(s.total || s.totalAmount || 0);
    });
    (summaries || []).filter((s: any) => (s.settlementDate === todayStr || s.date === todayStr) && s.status === "settled" && s.approved).forEach((s: any) => {
      todaysSalesValue += Number(s.salesValue || 0);
    });

    // Today's Damage Return Value
    let todaysDamageReturnValue = 0;
    (damageInventory || []).filter((d: any) => d.date === todayStr).forEach((d: any) => {
      todaysDamageReturnValue += Math.abs(Number(d.quantity || 0)) * (Number(d.price) || 0);
    });

    // Today's Inventory Value (Using current stock and sale prices)
    const todaysInventoryValue = products.reduce((acc, p) => {
      const stock = Number(p.stock) || 0;
      return acc + (Math.max(0, stock) * (Number(p.price) || 0));
    }, 0);

    // Closing Inventory Sales Value = (Today's Sales Value) + (Today's Damage Return Value)
    const closingInventoryValue = todaysSalesValue + todaysDamageReturnValue;

    // Yesterday's Inventory Value (Today's Value + Sales - Purchases)
    let todaysPurchasesValue = 0;
    (purchases || []).filter((p: any) => p.date === todayStr).forEach((p: any) => {
      todaysPurchasesValue += Number(p.total || p.totalAmount || 0);
    });
    const yesterdaysInventoryValue = todaysInventoryValue + todaysSalesValue - todaysPurchasesValue;

    return {
      yesterdaysInventoryValue,
      todaysSalesValue,
      todaysDamageReturnValue,
      todaysInventoryValue,
      closingInventoryValue
    };
  }, [products, sales, summaries, damageInventory, purchases]);

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
    if (isSubmittingForm) return;
    setIsSubmittingForm(true);
    const formData = new FormData(e.currentTarget);
    const product = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || "",
      sku: (formData.get("sku") as string || "").trim(),
      barcode: formData.get("barcode") as string || "",
      brand: formData.get("brand") as string || "",
      company: formData.get("company") as string || "",
      price: Number(formData.get("price")),
      cost: Number(formData.get("cost")),
      stock: Number(formData.get("stock")),
      cartoonSize: Number(formData.get("cartoonSize") || 1),
      cartonMarginSubDB: Number(formData.get("cartonMarginSubDB") || 0),
      supplierId: formData.get("supplierId") as string,
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      expiryDate: formData.get("expiryDate") as string,
      minStockLevel: Number(formData.get("minStockLevel") || 5),
      status: formData.get("status") as string || "Active"
    };

    if (product.sku && product.sku !== "") {
      const exists = products.find(p => p.sku && p.sku.toLowerCase() === product.sku.toLowerCase() && p.id !== editingId);
      if (exists) {
        toast.error(`এই SKU বা প্রোডাক্ট কোডটি (${product.sku}) ইতিমধ্যে "${exists.name}" পণ্যের জন্য ব্যবহৃত হচ্ছে!`);
        setIsSubmittingForm(false);
        return;
      }
    }
    
    try {
      if (editingId) {
        const origProduct = products.find(p => p.id === editingId);
        const prevStock = origProduct ? Number(origProduct.stock) || 0 : 0;
        const nextStock = Number(product.stock);

        await update(editingId, product);

        if (prevStock !== nextStock) {
          if (stockAdjustments && stockAdjustments.add) {
            await stockAdjustments.add({
              productId: editingId,
              productName: product.name || "N/A",
              sku: product.sku || "N/A",
              previousStock: prevStock,
              newStock: nextStock,
              quantityChanged: nextStock - prevStock,
              reason: "পণ্যের বিবরণী পরিবর্তন (Product Details Edited)",
              date: new Date().toISOString(),
              user: user?.email || "Unknown"
            });
          }
          await recordStockMovement(origProduct.id, 'ADJUSTMENT', nextStock - prevStock, editingId);
        }
        setEditingId(null);
        toast.success("পণ্য বিবরণী সফলভাবে আপডেট হয়েছে!");
      } else {
        const newId = await add({
            name: product.name,
            description: product.description,
            sku: product.sku,
            barcode: product.barcode,
            brand: product.brand,
            company: product.company,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            cartoonSize: product.cartoonSize,
            cartonMarginSubDB: product.cartonMarginSubDB,
            supplierId: product.supplierId,
            unit: product.unit,
            category: product.category,
            expiryDate: product.expiryDate,
            minStockLevel: product.minStockLevel,
            status: product.status
        });
        if (newId && product.stock > 0) {
          if (stockAdjustments && stockAdjustments.add) {
            await stockAdjustments.add({
              productId: newId,
              productName: product.name || "N/A",
              sku: product.sku || "N/A",
              previousStock: 0,
              newStock: product.stock,
              quantityChanged: product.stock,
              reason: "নতুন পণ্য প্রারম্ভিক মজুদ (New Product Opening Stock)",
              date: new Date().toISOString(),
              user: user?.email || "Unknown"
            });
          }
          await recordStockMovement(newId, 'OPENING', product.stock, newId);
        }
        toast.success("নতুন পণ্য সফলভাবে তৈরি হয়েছে!");
      }
      setShowAdd(false);
    } catch (err: any) {
      toast.error("পণ্য সংরক্ষণ ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleBulkSave = async () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(l => l);
    let total = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const details: string[] = [];
    
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
      
      total++;
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
        const name = parts[0].trim();
        const sku = (parts[1] || "").trim();
        const category = parts[2] || "General";
        const stock = Number(parts[3] || 0);
        const price = Number(parts[4] || 0);
        const cost = Number(parts[5] || 0);
        const cartoonSize = Number(parts[6] || 1);
        const unit = parts[7] || "Pcs";
        const tempSupplier = parts[8] || "";

        if (!name) {
          skipped++;
          details.push(`লাইন ${i+1}: পণ্যের নাম খালি ছিল, স্কিপ করা হয়েছে।`);
          continue;
        }

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

        // Check if SKU is empty but check name, or if SKU is set check SKU
        const existing = products.find(p => (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase()) || p.name.trim().toLowerCase() === name.toLowerCase());

        const productData = {
          name,
          sku,
          category,
          stock,
          price,
          cost,
          cartoonSize,
          unit,
          supplierId: foundSupplierId || existing?.supplierId || "",
          minStockLevel: 5
        };

        try {
          if (existing) {
            const prevStock = Number(existing.stock) || 0;
            await update(existing.id, { ...existing, ...productData });
            if (prevStock !== stock) {
              if (stockAdjustments && stockAdjustments.add) {
                await stockAdjustments.add({
                  productId: existing.id,
                  productName: name,
                  sku: sku,
                  previousStock: prevStock,
                  newStock: stock,
                  quantityChanged: stock - prevStock,
                  reason: "বাল্ক আপলোড স্টক আপডেট (Bulk Upload Stock Update)",
                  date: new Date().toISOString(),
                  user: user?.email || "Unknown"
                });
              }
              await recordStockMovement(existing.id, 'ADJUSTMENT', stock - prevStock, existing.id);
            }
            updated++;
            details.push(`[UPDATE] ${name} (SKU: ${sku || 'N/A'}) - স্টক: ${stock}`);
          } else {
            // Check if SKU is duplicated across existing list
            if (sku) {
              const duplicateSku = products.find(p => p.sku && p.sku.toLowerCase() === sku.toLowerCase());
              if (duplicateSku) {
                skipped++;
                details.push(`[DUPLICATE SKU] ${name} (SKU: ${sku}) ইতিমধ্যে "${duplicateSku.name}" পণ্যটির জন্য ব্যবহৃত হচ্ছে। স্কিপ করা হয়েছে।`);
                continue;
              }
            }
            
            const newId = await add(productData);
            if (newId) {
              if (stock > 0) {
                if (stockAdjustments && stockAdjustments.add) {
                  await stockAdjustments.add({
                    productId: newId,
                    productName: name,
                    sku: sku,
                    previousStock: 0,
                    newStock: stock,
                    quantityChanged: stock,
                    reason: "বাল্ক আপলোড নতুন পণ্য (Bulk Upload New Product)",
                    date: new Date().toISOString(),
                    user: user?.email || "Unknown"
                  });
                }
                await recordStockMovement(newId, 'OPENING', stock, newId);
              }
              created++;
              details.push(`[NEW] ${name} (SKU: ${sku || 'N/A'}) - নতুন পণ্য সফলভাবে যুক্ত হয়েছে।`);
            } else {
              skipped++;
              details.push(`[FAILED] ${name} সংরক্ষণ করা সম্ভব হয়নি।`);
            }
          }
        } catch (err: any) {
          skipped++;
          details.push(`[ERROR] ${name}: ${err.message}`);
        }
      } else {
        skipped++;
        details.push(`লাইন ${i+1}: সঠিক তথ্য পাওয়া যায়নি।`);
      }
    }
    setBulkText("");
    setImportReport({ total, created, updated, skipped, details });
    toast.success(`${created} টি নতুন পণ্য এবং ${updated} টি পণ্য আপডেট করা হয়েছে।`);
  };

  const handleUndoImport = async () => {
      if (lastImportedIds.length === 0) return;
      
      for (const id of lastImportedIds) {
          await remove(id);
      }
      setLastImportedIds([]);
      toast.success("ইম্পোর্টটি আনডু করা হয়েছে");
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("শুধুমাত্র .json ফাইল আপলোড করা যাবে!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setBulkJsonText(text);
        toast.success("JSON ফাইলটি সফলভাবে পড়া হয়েছে। নিচের বক্সে প্রিভিউ দেখতে পাচ্ছেন।");
      } catch (err) {
        toast.error("ফাইল পড়তে সমস্যা হয়েছে।");
      }
    };
    reader.readAsText(file);
  };

  const handleJsonBulkImport = async () => {
    try {
      const parsed = JSON.parse(bulkJsonText.trim());
      if (!Array.isArray(parsed)) {
        toast.error("JSON অবশ্যই একটি Array হতে হবে!");
        return;
      }

      let total = 0;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const details: string[] = [];

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        total++;

        // Extract keys flexibly (CamelCase, capital, or spacing)
        const name = (item.name || item.Name || "").trim();
        const sku = (item.sku || item.SKU || "").trim();
        const category = item.category || item.Category || "General";
        const stock = Number(item.stock !== undefined ? item.stock : (item.Stock !== undefined ? item.Stock : 0));
        const price = Number(item.price !== undefined ? item.price : (item.Price !== undefined ? item.Price : (item.salePrice !== undefined ? item.salePrice : (item["Sale Price"] !== undefined ? item["Sale Price"] : 0))));
        const cost = Number(item.cost !== undefined ? item.cost : (item.Cost !== undefined ? item.Cost : (item.purchaseCost !== undefined ? item.purchaseCost : (item["Purchase Cost"] !== undefined ? item["Purchase Cost"] : 0))));
        const cartoonSize = Number(item.cartoonSize !== undefined ? item.cartoonSize : (item.cartonSize !== undefined ? item.cartonSize : (item.CartoonSize !== undefined ? item.CartoonSize : (item.CartonSize !== undefined ? item.CartonSize : (item["Carton Size"] !== undefined ? item["Carton Size"] : 1)))));
        const unit = item.unit || item.Unit || "Pcs";
        const tempSupplier = item.supplierName || item.SupplierName || item["Supplier Name"] || "";

        if (!name) {
          skipped++;
          details.push(`আইটেম ${i + 1}: পণ্যের নাম (name) খালি ছিল, স্কিপ করা হয়েছে।`);
          continue;
        }

        // Find supplier by name in collections
        let foundSupplierId = "";
        if (tempSupplier) {
          const matched = suppliers.find(
            s => (s.name || "").trim().toLowerCase() === String(tempSupplier).trim().toLowerCase()
          );
          if (matched) {
            foundSupplierId = matched.id;
          }
        }

        // Check if SKU exists or name matches
        const existing = products.find(p => (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase()) || p.name.trim().toLowerCase() === name.toLowerCase());

        const productData = {
          name,
          sku,
          category,
          stock,
          price,
          cost,
          cartoonSize,
          unit,
          supplierId: foundSupplierId || existing?.supplierId || "",
          minStockLevel: 5
        };

        try {
          if (existing) {
            const prevStock = Number(existing.stock) || 0;
            await update(existing.id, { ...existing, ...productData });
            if (prevStock !== stock) {
              if (stockAdjustments && stockAdjustments.add) {
                await stockAdjustments.add({
                  productId: existing.id,
                  productName: name,
                  sku: sku,
                  previousStock: prevStock,
                  newStock: stock,
                  quantityChanged: stock - prevStock,
                  reason: "জেসন বাল্ক আপলোড স্টক আপডেট (JSON Bulk Stock Update)",
                  date: new Date().toISOString(),
                  user: user?.email || "Unknown"
                });
              }
              await recordStockMovement(existing.id, 'ADJUSTMENT', stock - prevStock, existing.id);
            }
            updated++;
            details.push(`[UPDATE] ${name} (SKU: ${sku || 'N/A'}) - স্টক: ${stock}`);
          } else {
            // Check if SKU is duplicated across existing list
            if (sku) {
              const duplicateSku = products.find(p => p.sku && p.sku.toLowerCase() === sku.toLowerCase());
              if (duplicateSku) {
                skipped++;
                details.push(`[DUPLICATE SKU] ${name} (SKU: ${sku}) ইতিমধ্যে "${duplicateSku.name}" পণ্যটির জন্য ব্যবহৃত হচ্ছে। স্কিপ করা হয়েছে।`);
                continue;
              }
            }
            
            const newId = await add(productData);
            if (newId) {
              if (stock > 0) {
                if (stockAdjustments && stockAdjustments.add) {
                  await stockAdjustments.add({
                    productId: newId,
                    productName: name,
                    sku: sku,
                    previousStock: 0,
                    newStock: stock,
                    quantityChanged: stock,
                    reason: "জেসন বাল্ক আপলোড নতুন পণ্য (JSON Bulk New Product)",
                    date: new Date().toISOString(),
                    user: user?.email || "Unknown"
                  });
                }
                await recordStockMovement(newId, 'OPENING', stock, newId);
              }
              created++;
              details.push(`[NEW] ${name} (SKU: ${sku || 'N/A'}) - নতুন পণ্য সফলভাবে যুক্ত হয়েছে।`);
            } else {
              skipped++;
              details.push(`[FAILED] ${name} সংরক্ষণ করা সম্ভব হয়নি।`);
            }
          }
        } catch (err: any) {
          skipped++;
          details.push(`[ERROR] ${name}: ${err.message}`);
        }
      }

      setBulkJsonText("");
      setImportReport({ total, created, updated, skipped, details });
      toast.success(`জেসন ইম্পোর্ট সম্পন্ন: ${created} টি নতুন পণ্য এবং ${updated} টি পণ্য আপডেট করা হয়েছে।`);
    } catch (error: any) {
      console.error("JSON Parse error:", error);
      toast.error("জেসন ফরম্যাট সঠিক নয়! অনুগ্রহ করে ভ্যালিড JSON পেস্ট করুন।");
    }
  };

  const handleApplyBulkOperations = async () => {
    if (!bulkOpType) {
      toast.error("অনুগ্রহ করে একটি বাল্ক অপারেশন সিলেক্ট করুন!");
      return;
    }

    if (selectedProductIds.length === 0 && bulkOpType !== "MIN_STOCK_UPDATE") {
      toast.error("কোনো পণ্য সিলেক্ট করা হয়নি!");
      return;
    }

    setIsApplyingBulk(true);
    let successCount = 0;
    let failCount = 0;

    try {
      if (bulkOpType === "PRICE_INCREASE") {
        const percent = parseFloat(bulkPricePercent);
        if (isNaN(percent)) {
          toast.error("অনুগ্রহ করে সঠিক শতকরা হার লিখুন!");
          setIsApplyingBulk(false);
          return;
        }

        for (const id of selectedProductIds) {
          const p = products.find(prod => prod.id === id);
          if (!p) continue;

          let updatedPrice = p.price;
          let updatedCost = p.cost || 0;

          if (bulkPriceTarget === "PRICE" || bulkPriceTarget === "BOTH") {
            updatedPrice = Number((p.price * (1 + percent / 100)).toFixed(2));
          }
          if (bulkPriceTarget === "COST" || bulkPriceTarget === "BOTH") {
            updatedCost = Number(((p.cost || 0) * (1 + percent / 100)).toFixed(2));
          }

          try {
            await update(id, {
              ...p,
              price: updatedPrice,
              cost: updatedCost
            });
            successCount++;
          } catch (e) {
            failCount++;
            console.error(`Failed to update product ${id}:`, e);
          }
        }

        toast.success(`সাফল্যের সাথে ${successCount} টি পণ্যের দাম ${percent}% পরিবর্তন করা হয়েছে!`);
        if (failCount > 0) {
          toast.error(`${failCount} টি পণ্যের দাম পরিবর্তন করা যায়নি।`);
        }
      } else if (bulkOpType === "CATEGORY_REASSIGN") {
        const finalCategory = bulkNewCategory.trim();
        if (!finalCategory) {
          toast.error("অনুগ্রহ করে সঠিক ক্যাটাগরি নাম দিন!");
          setIsApplyingBulk(false);
          return;
        }

        for (const id of selectedProductIds) {
          const p = products.find(prod => prod.id === id);
          if (!p) continue;

          try {
            await update(id, {
              ...p,
              category: finalCategory
            });
            successCount++;
          } catch (e) {
            failCount++;
            console.error(`Failed to update category for product ${id}:`, e);
          }
        }

        toast.success(`সাফল্যের সাথে ${successCount} টি পণ্যের ক্যাটাগরি "${finalCategory}" এ পরিবর্তন করা হয়েছে!`);
        if (failCount > 0) {
          toast.error(`${failCount} টি পণ্যের ক্যাটাগরি পরিবর্তন করা যায়নি।`);
        }
      } else if (bulkOpType === "MIN_STOCK_UPDATE") {
        const finalCategory = bulkMinStockCategory.trim();
        const minLevel = parseInt(bulkMinStockLevel);
        
        if (!finalCategory) {
          toast.error("অনুগ্রহ করে একটি ক্যাটাগরি সিলেক্ট করুন!");
          setIsApplyingBulk(false);
          return;
        }
        if (isNaN(minLevel) || minLevel < 0) {
          toast.error("অনুগ্রহ করে সঠিক সর্বনিম্ন স্টক সংখ্যা দিন!");
          setIsApplyingBulk(false);
          return;
        }

        // Get all products that belong to the selected category
        const targetProducts = products.filter(p => (p.category || "General") === finalCategory);
        if (targetProducts.length === 0) {
          toast.error(`"${finalCategory}" ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি!`);
          setIsApplyingBulk(false);
          return;
        }

        for (const p of targetProducts) {
          try {
            await update(p.id, {
              ...p,
              minStockLevel: minLevel
            });
            successCount++;
          } catch (e) {
            failCount++;
            console.error(`Failed to update minStockLevel for product ${p.id}:`, e);
          }
        }

        toast.success(`সাফল্যের সাথে "${finalCategory}" ক্যাটাগরির ${successCount} টি পণ্যের সর্বনিম্ন স্টক লেভেল ${minLevel} পিস এ সেট করা হয়েছে!`);
        if (failCount > 0) {
          toast.error(`${failCount} টি পণ্যের সর্বনিম্ন স্টক লেভেল পরিবর্তন করা যায়নি।`);
        }
      }

      // Reset selection and states
      setSelectedProductIds([]);
      setBulkOpType("");
      setBulkPricePercent("");
      setBulkNewCategory("");
      setBulkMinStockLevel("");
      setBulkMinStockCategory("");
    } catch (err: any) {
      console.error("Bulk action error:", err);
      toast.error("বাল্ক অপারেশন চালানোর সময় ত্রুটি ঘটেছে!");
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleSimulateQRReplenish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!simulatedProductId) {
      toast.error("অনুগ্রহ করে একটি পণ্য সিলেক্ট করুন!");
      return;
    }
    const qty = parseInt(simulatedQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("অনুগ্রহ করে সঠিক রিকুইজিশন সংখ্যা দিন!");
      return;
    }

    setIsSavingSimulated(true);
    try {
      const p = products.find(prod => prod.id === simulatedProductId);
      if (!p) {
        toast.error("পণ্যটি খুঁজে পাওয়া যায়নি!");
        setIsSavingSimulated(false);
        return;
      }

      const prevStock = p.stock || 0;
      const nextStock = prevStock + qty;

      await update(simulatedProductId, {
        ...p,
        stock: nextStock
      });

      if (stockAdjustments && stockAdjustments.add) {
        await stockAdjustments.add({
          productId: simulatedProductId,
          productName: p.name || "N/A",
          sku: p.sku || "N/A",
          previousStock: prevStock,
          newStock: nextStock,
          quantityChanged: qty,
          reason: "QR স্ক্যান স্টক রিকুইজিশন (QR Scan Stock Replenishment)",
          date: new Date().toISOString(),
          user: user?.email || "Unknown"
        });
      }
      await recordStockMovement(simulatedProductId, 'ADJUSTMENT', qty, simulatedProductId);

      toast.success(`কিউআর স্ক্যান সিমুলেশন সফল! ${p.name} পণ্যের স্টক ${qty} পিস বৃদ্ধি করা হয়েছে। নতুন স্টক: ${nextStock}`);
      setShowQRReplenish(false);
      setSimulatedProductId("");
      setSimulatedQty("");
    } catch (err) {
      console.error(err);
      toast.error("স্টক সমন্বয় করতে ব্যর্থ হয়েছে!");
    } finally {
      setIsSavingSimulated(false);
    }
  };

  const handleApplyMinStockCategoryBulk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalCategory = minStockBulkCategory.trim();
    const minLevel = parseInt(minStockBulkLevel);
    
    if (!finalCategory) {
      toast.error("অনুগ্রহ করে একটি ক্যাটাগরি সিলেক্ট করুন!");
      return;
    }
    if (isNaN(minLevel) || minLevel < 0) {
      toast.error("অনুগ্রহ করে সঠিক সর্বনিম্ন স্টক সংখ্যা দিন!");
      return;
    }

    setIsSavingMinStockBulk(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const targetProducts = products.filter(p => (p.category || "General") === finalCategory);
      if (targetProducts.length === 0) {
        toast.error(`"${finalCategory}" ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি!`);
        setIsSavingMinStockBulk(false);
        return;
      }

      for (const p of targetProducts) {
        try {
          await update(p.id, {
            ...p,
            minStockLevel: minLevel
          });
          successCount++;
        } catch (e) {
          failCount++;
          console.error(`Failed to update minStockLevel for product ${p.id}:`, e);
        }
      }

      toast.success(`সাফল্যের সাথে "${finalCategory}" ক্যাটাগরির ${successCount} টি পণ্যের সর্বনিম্ন স্টক লেভেল ${minLevel} পিস এ সেট করা হয়েছে!`);
      if (failCount > 0) {
        toast.error(`${failCount} টি পণ্যের সর্বনিম্ন স্টক লেভেল পরিবর্তন করা যায়নি।`);
      }
      setShowMinStockModal(false);
      setMinStockBulkCategory("");
      setMinStockBulkLevel("");
    } catch (err) {
      console.error(err);
      toast.error("মিন স্টক বাল্ক আপডেট করতে ব্যর্থ হয়েছে!");
    } finally {
      setIsSavingMinStockBulk(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProductIds.length === 0) {
      toast.error("কোনো পণ্য সিলেক্ট করা হয়নি!");
      return;
    }

    confirmDelete({
      title: "🗑️ বাল্ক ডিলিট নিশ্চিতকরণ",
      message: `আপনি কি নিশ্চিতভাবে সিলেক্ট করা ${selectedProductIds.length} টি পণ্য স্থায়ীভাবে ডিলিট করতে চান?`,
      recordName: `${selectedProductIds.length} টি পণ্য`,
      warning: "⚠️ এই কাজটি পরে ফিরিয়ে আনা যাবে না এবং এর ফলে ইনভেন্টরি ডেটা ও স্টক রেকর্ডস স্থায়ীভাবে মুছে যাবে।",
      onConfirm: async () => {
        let successCount = 0;
        let failCount = 0;
        for (const id of selectedProductIds) {
          try {
            await remove(id);
            successCount++;
          } catch (err) {
            failCount++;
            console.error(`Failed to delete product ${id}:`, err);
          }
        }
        if (successCount > 0) {
          toast.success(`সাফল্যের সাথে ${successCount} টি পণ্য ডিলিট করা হয়েছে!`);
        }
        if (failCount > 0) {
          toast.error(`${failCount} টি পণ্য ডিলিট করা যায়নি।`);
        }
        setSelectedProductIds([]);
      }
    });
  };

  const handleImportInventory = (data: any[]) => {
      setPreviewData(data);
  };

  const confirmImportInventory = async () => {
      let total = 0;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const details: string[] = [];
      const newIds: string[] = [];
      
      for (const itemData of previewData) {
         if (!itemData.Name && !itemData.name) {
             skipped++;
             details.push(`সারি ${total+1}: নাম খালি থাকায় স্কিপ করা হয়েছে।`);
             continue;
         }
         
         total++;
         const name = (itemData.Name || itemData.name).trim();
         const sku = (itemData.SKU || itemData.sku || "").trim();
         const category = (itemData.Category || itemData.category || "General").trim();
         const stock = Number(itemData.Stock || itemData.stock || 0);
         const price = Number(itemData["SALE PRICE"] || itemData["Sale Price"] || itemData["sale price"] || itemData["salePrice"] || itemData.Price || itemData.price || 0);
         const cost = Number(itemData["PURCHASE COST"] || itemData["Purchase Cost"] || itemData["purchase cost"] || itemData["PURCHASE PRICE"] || itemData["Purchase Price"] || itemData["purchase price"] || itemData["purchasePrice"] || itemData.Cost || itemData.cost || 0);
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
         const existing = products.find(p => (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase()) || p.name.trim().toLowerCase() === name.toLowerCase());

         const productData = {
           name,
           sku,
           category,
           stock,
           price,
           cost,
           cartoonSize,
           unit,
           supplierId: foundSupplierId || existing?.supplierId || "",
           minStockLevel: 5
         };

         try {
           if (existing) {
               const prevStock = Number(existing.stock) || 0;
               await update(existing.id, { ...existing, ...productData });
               if (prevStock !== stock) {
                   if (stockAdjustments && stockAdjustments.add) {
                       await stockAdjustments.add({
                           productId: existing.id,
                           productName: name,
                           sku: sku,
                           previousStock: prevStock,
                           newStock: stock,
                           quantityChanged: stock - prevStock,
                           reason: "ফাইল ইম্পোর্ট স্টক আপডেট (File Import Stock Update)",
                           date: new Date().toISOString(),
                           user: user?.email || "Unknown"
                       });
                   }
                   await recordStockMovement(existing.id, 'ADJUSTMENT', stock - prevStock, existing.id);
               }
               updated++;
               details.push(`[UPDATE] ${name} (SKU: ${sku || 'N/A'}) - স্টক: ${stock}`);
           } else {
               // Check if SKU is duplicated in products list
               if (sku) {
                 const duplicateSku = products.find(p => p.sku && p.sku.toLowerCase() === sku.toLowerCase());
                 if (duplicateSku) {
                     skipped++;
                     details.push(`[DUPLICATE SKU] ${name} (SKU: ${sku}) ইতিমধ্যে "${duplicateSku.name}" পণ্যটির জন্য ব্যবহৃত হচ্ছে। স্কিপ করা হয়েছে।`);
                     continue;
                 }
               }

               const newId = await add(productData);
               if (newId) {
                   newIds.push(newId);
                   if (productData.stock > 0) {
                      await recordStockMovement(newId, 'OPENING', productData.stock, newId);
                   }
                   created++;
                   details.push(`[NEW] ${name} (SKU: ${sku || 'N/A'}) - নতুন পণ্য যুক্ত করা হয়েছে।`);
               } else {
                   skipped++;
                   details.push(`[FAILED] ${name} ডেটাবেজে সংরক্ষণ করা যায়নি।`);
               }
           }
         } catch (err: any) {
             skipped++;
             details.push(`[ERROR] ${name}: ${err.message}`);
         }
      }
      
      setPreviewData([]);
      setLastImportedIds(newIds);
      setImportReport({ total, created, updated, skipped, details });
      toast.success(`${created} টি নতুন পণ্য এবং ${updated} টি পণ্য আপডেট করা হয়েছে।`);
  };

  const isAllSelected = filtered.length > 0 && filtered.every(p => selectedProductIds.includes(p.id));
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds(prev => prev.filter(id => !filtered.some(p => p.id === id)));
    } else {
      setSelectedProductIds(prev => {
        const union = new Set([...prev, ...filtered.map(p => p.id)]);
        return Array.from(union);
      });
    }
  };

  return (
    <div className="space-y-6">
      {previewData.length > 0 && <DataPreviewModal data={previewData} onCancel={() => setPreviewData([])} onConfirm={confirmImportInventory} />}

      {/* 📦 Inventory Closing Engine Summary Panel */}
      <div className="bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yesterday's Inventory</span>
          <span className="text-md font-extrabold text-slate-200 mt-1 font-mono">{formatCurrency(inventoryClosingStats.yesterdaysInventoryValue)}</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Today's Sales Value</span>
          <span className="text-md font-extrabold text-rose-300 mt-1 font-mono">-{formatCurrency(inventoryClosingStats.todaysSalesValue)}</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Today's Damage Return</span>
          <span className="text-md font-extrabold text-green-300 mt-1 font-mono">+{formatCurrency(inventoryClosingStats.todaysDamageReturnValue)}</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Today's Stock Value</span>
          <span className="text-md font-extrabold text-sky-300 mt-1 font-mono">{formatCurrency(inventoryClosingStats.todaysInventoryValue)}</span>
        </div>
        <div className="flex flex-col justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Closing Inventory Sales Value</span>
          <span className="text-lg font-black text-amber-300 mt-1 font-mono">{formatCurrency(inventoryClosingStats.closingInventoryValue)}</span>
          <span className="text-[9px] text-slate-400 font-bold mt-0.5">Today's Sales + Damage Return</span>
          <div className="mt-2 bg-amber-500/15 border border-amber-500/30 rounded-lg p-1.5 text-[8.5px] text-amber-300 font-bold leading-relaxed">
            ⚠️ ড্যামেজ রিটার্ন স্টকে থেকে যায় এবং এটি আপনার মুনাফায় (Profit) কোনো প্রভাব ফেলে না।
          </div>
        </div>
      </div>

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
                onClick={() => setShowMinStockModal(true)}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                title="ক্যাটাগরি অনুযায়ী মিনিমাম স্টক লেভেল বাল্ক আপডেট করুন"
              >
                📊 ক্যাটাগরি মিন স্টক আপডেট
              </button>
              <button 
                onClick={() => setShowQRReplenish(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="কিউআর কোড স্ক্যান করে স্টক বৃদ্ধির সিমুলেশন করুন"
              >
                📷 কিউআর সিমুলেশন (QR Simulation)
              </button>
              <button 
                onClick={() => setShowBulk(true)}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all font-bold"
              >
                বাল্ক এন্ট্রি (Bulk)
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={selectedProductIds.length === 0}
                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 border transition-all cursor-pointer ${
                  selectedProductIds.length > 0 
                    ? "bg-red-50 text-red-650 border-red-200 hover:bg-red-100 shadow-2xs" 
                    : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                }`}
                title={selectedProductIds.length > 0 ? "সিলেক্ট করা পণ্যগুলো ডিলিট করুন" : "ডিলিট করার জন্য টেবিল থেকে এক বা একাধিক পণ্য সিলেক্ট করুন"}
              >
                <Trash2 className="w-4 h-4" /> বাল্ক ডিলিট ({selectedProductIds.length})
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
        
        {/* 📁 Category-based Filter Dropdown for Quick Toggles */}
        <div className="relative w-full sm:w-52 shrink-0">
          <select
            value={selectedCategories.length === 1 ? selectedCategories[0] : ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCategories(val ? [val] : []);
            }}
            className="w-full pl-3 pr-8 py-3 bg-white border border-[#E9ECEF] rounded-xl font-bold text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%234b5563' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1.2em 1.2em",
              backgroundRepeat: "no-repeat"
            }}
          >
            <option value="">📁 সকল সেগমেন্ট / ক্যাটাগরি</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                📦 {cat}
              </option>
            ))}
          </select>
        </div>

        <MultiSelect
          options={suppliers.map(s => ({ value: s.id, label: s.name }))}
          selectedValues={selectedSuppliers}
          onChange={setSelectedSuppliers}
          placeholder="সকল সাপ্লায়ার"
          className="w-full sm:w-52 shrink-0"
        />
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1 shrink-0 border border-gray-200">
          <button
            onClick={() => setStockTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${stockTypeFilter === "ALL" ? "bg-slate-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            সকল স্টক
          </button>
          <button
            onClick={() => setStockTypeFilter("FRESH")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${stockTypeFilter === "FRESH" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            ফ্রেশ পণ্য
          </button>
          <button
            onClick={() => setStockTypeFilter("DAMAGE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${stockTypeFilter === "DAMAGE" ? "bg-rose-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            ড্যামেজ পণ্য
          </button>
        </div>

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

      {role !== "sr" && selectedProductIds.length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-150 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-mono text-xs font-black">
                {selectedProductIds.length}
              </span>
              <span className="text-xs font-black text-indigo-950">
                টি পণ্য সিলেক্ট করা হয়েছে। নিচের যেকোনো একটি বাল্ক অপারেশন সিলেক্ট করে পরিবর্তন করুন:
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedProductIds([]);
                setBulkOpType("");
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 transition cursor-pointer"
            >
              ❌ সিলেকশন বাতিল করুন (Cancel Selection)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Operation Type selection buttons */}
            <div className="md:col-span-4 space-y-2">
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">১. অপারেশন নির্বাচন করুন:</label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpType("PRICE_INCREASE")}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    bulkOpType === "PRICE_INCREASE"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-250 hover:bg-gray-50"
                  }`}
                >
                  📈 শতকরা মূল্য পরিবর্তন (Percentage Price Change)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkOpType("CATEGORY_REASSIGN")}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    bulkOpType === "CATEGORY_REASSIGN"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-250 hover:bg-gray-50"
                  }`}
                >
                  📁 ক্যাটাগরি পরিবর্তন (Category Reassignment)
                </button>
              </div>
            </div>

            {/* Operation Parameters */}
            <div className="md:col-span-8 bg-white p-4 rounded-xl border border-indigo-150 shadow-2xs">
              {!bulkOpType ? (
                <div className="py-6 text-center text-xs font-bold text-gray-400">
                  উপরে বামে যেকোনো একটি অপারেশন সিলেক্ট করুন কাজ শুরু করতে।
                </div>
              ) : bulkOpType === "PRICE_INCREASE" ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">📈 শতকরা মূল্য বৃদ্ধি / হ্রাস করুন</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                    সকল সিলেক্ট করা পণ্যের মূল্য একটি নির্দিষ্ট শতকরা হারে পরিবর্তন করুন। ৫% বাড়াতে চাইলে <code className="bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-mono font-bold">5</code> এবং ৫% কমাতে চাইলে <code className="bg-red-50 text-red-700 px-1 py-0.2 rounded font-mono font-bold">-5</code> লিখুন।
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">শতকরা হার লিখুন (%):</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="উদাঃ ১০ বা -৫"
                        value={bulkPricePercent}
                        onChange={(e) => setBulkPricePercent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">টার্গেট মূল্য নির্বাচন করুন:</label>
                      <select
                        value={bulkPriceTarget}
                        onChange={(e) => setBulkPriceTarget(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      >
                        <option value="PRICE">💰 শুধুমাত্র বিক্রয় মূল্য (Sale Price Only)</option>
                        <option value="COST">🛒 শুধুমাত্র কেনার দাম (Purchase Cost Only)</option>
                        <option value="BOTH">🔄 উভয় মূল্য (Sale Price & Cost)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleApplyBulkOperations}
                      disabled={isApplyingBulk || !bulkPricePercent}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isApplyingBulk ? "সমন্বয় করা হচ্ছে..." : "দাম আপডেট প্রয়োগ করুন (Apply Change)"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">📁 ক্যাটাগরি পুনঃনির্ধারণ (Category Reassignment)</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                    সকল সিলেক্ট করা পণ্যের বর্তমান ক্যাটাগরি এক ক্লিকে পরিবর্তন করুন। নিচে থেকে বিদ্যমান কোনো ক্যাটাগরি সিলেক্ট করুন অথবা নতুন নাম লিখুন।
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">বিদ্যমান ক্যাটাগরি সমূহ:</label>
                      <select
                        value={bulkNewCategory}
                        onChange={(e) => setBulkNewCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      >
                        <option value="">-- ক্যাটাগরি সিলেক্ট করুন --</option>
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">অথবা নতুন ক্যাটাগরির নাম লিখুন:</label>
                      <input
                        type="text"
                        placeholder="নতুন ক্যাটাগরি লিখুন"
                        value={bulkNewCategory}
                        onChange={(e) => setBulkNewCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleApplyBulkOperations}
                      disabled={isApplyingBulk || !bulkNewCategory.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isApplyingBulk ? "সমন্বয় করা হচ্ছে..." : "ক্যাটাগরি আপডেট প্রয়োগ করুন (Apply Change)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E9ECEF] rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#F8F9FA] border-bottom border-[#E9ECEF]">
            <tr>
              {role !== "sr" && (
                <th className="pl-6 pr-2 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">পণ্যের নাম</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">ক্যাটাগরি</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD]">মেয়াদউত্তীর্ণ তারিখ</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD] text-center">ফ্রেশ স্টক</th>
              <th className="px-6 py-4 font-semibold text-xs uppercase text-[#ADB5BD] text-center">ড্যামেজ স্টক</th>
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
                {role !== "sr" && (
                  <td className="pl-6 pr-2 py-4 text-center w-12">
                    <input 
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(prev => [...prev, p.id]);
                        } else {
                          setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    {p.name}
                    {p.status === "Inactive" && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 font-bold rounded">নিষ্ক্রিয় (Inactive)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600 font-sans">
                    <span className="bg-gray-100 px-1 py-0.5 rounded font-mono">SKU: {p.sku || "N/A"}</span>
                    {p.barcode && <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">📟 {p.barcode}</span>}
                    {p.brand && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">🏷️ {p.brand}</span>}
                    {p.company && <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">🏢 {p.company}</span>}
                    {p.cartoonSize && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">📦 কার্টুন সাইজ: {p.cartoonSize} {p.unit || "pcs"}</span>}
                    {p.cartonMarginSubDB !== undefined && p.cartonMarginSubDB > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">💰 SubDB Margin: ৳{p.cartonMarginSubDB}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-[#E9ECEF] rounded text-xs font-medium uppercase">{p.category || "General"}</span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isExpired ? 'text-red-700 font-bold' : isNearingExpiry ? 'text-orange-700 font-bold' : 'text-gray-600'}`}>
                  {p.expiryDate || "N/A"}
                  {(isExpired || isNearingExpiry) && <span className="ml-2 text-xs">({isExpired ? "মেয়াদ শেষ" : "মেয়াদ শেষ হবে"})</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  {p.id === inlineEditId && role !== "sr" ? (
                    <div className="flex items-center justify-center gap-1">
                      <input 
                        type="number" 
                        step="any"
                        value={inlineStock} 
                        onChange={(e) => setInlineStock(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-950 font-mono focus:outline-none focus:ring-1 focus:ring-black bg-white"
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
                        setInlineStock(p.stock !== undefined ? p.stock : 0);
                        setInlinePrice(p.price);
                        setInlineCost(p.cost || 0);
                      }}
                      className={`${(p.stock !== undefined ? p.stock : 0) <= (p.minStockLevel || 5) ? "text-red-500 font-bold" : "text-gray-900 font-extrabold"} ${role === "sr" ? "" : "cursor-pointer border-b border-dashed border-gray-300 hover:border-black"} select-none inline-block`}
                      title={role === "sr" ? "" : "ডাবল ক্লিক করে ইনলাইন এডিট করুন"}
                    >
                      {p.stock !== undefined ? p.stock : 0} {p.unit || "pcs"}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {(() => {
                    const dQty = damageStockMap[p.id] || 0;
                    return dQty > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-100 font-mono">
                        {dQty} {p.unit || "pcs"}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs font-semibold">-</span>
                    );
                  })()}
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
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg animate-pulse"
                            title="ইনলাইন এডিট করুন"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                           <button 
                            onClick={() => {
                              confirmDelete({
                                title: "পণ্য ডিলিট নিশ্চিতকরণ",
                                message: `আপনি কি নিশ্চিতভাবে "${p.name}" পণ্যটি ডিলিট করতে চান?`,
                                recordName: p.name,
                                onConfirm: async () => {
                                  try {
                                    await remove(p.id);
                                    toast.success("পণ্যটি সফলভাবে ডিলিট করা হয়েছে।");
                                  } catch (error: any) {
                                    toast.error("ডিলিট করতে সমস্যা হয়েছে: " + error.message);
                                    throw error;
                                  }
                                }
                              });
                            }}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title="পণ্য ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4 animate-pulse" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {showAdd && (() => {
        const editingProduct = products.find(x => x.id === editingId);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="border-b pb-3 mb-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? "✏️ পণ্য এডিট করুন" : "➕ নতুন পণ্য যোগ করুন"}
                </h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6 text-gray-950">
                {/* 1. বেসিক তথ্য */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">১. বেসিক তথ্য (Basic Details)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">পণ্যের নাম *</label>
                      <input name="name" defaultValue={editingProduct?.name} required placeholder="যেমন: Pran Mango Juice 250ml" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">পণ্যের বিবরণ (Description)</label>
                      <textarea name="description" defaultValue={editingProduct?.description} placeholder="পণ্যের বিবরণ লিখুন..." rows={2} className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">বারকোড (Barcode)</label>
                      <input name="barcode" defaultValue={editingProduct?.barcode} placeholder="বারকোড স্ক্যান বা লিখুন" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">SKU (Stock Keeping Unit)</label>
                      <input name="sku" defaultValue={editingProduct?.sku} placeholder="যেমন: PRN-MJ-250" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">অবস্থা (Status)</label>
                      <select name="status" defaultValue={editingProduct?.status || "Active"} className="w-full border rounded-xl p-2.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none transition">
                        <option value="Active">সক্রিয় (Active)</option>
                        <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. ক্যাটাগরি ও ব্র্যান্ড */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">২. ক্যাটাগরি ও ব্র্যান্ড (Category & Origin)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ক্যাটাগরি</label>
                      <input name="category" defaultValue={editingProduct?.category} placeholder="যেমন: Beverage, Cosmetics, Groceries" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ব্র্যান্ড (Brand)</label>
                      <input name="brand" defaultValue={editingProduct?.brand} placeholder="যেমন: Pran, ACI, Unilever" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">সাপ্লায়ার (Supplier)</label>
                      <select 
                        name="supplierId" 
                        defaultValue={editingProduct?.supplierId} 
                        onChange={(e) => {
                          // Try to automatically populate the company field if selected supplier has one
                          const selectedSupp = suppliers.find(s => s.id === e.target.value);
                          if (selectedSupp && selectedSupp.company) {
                            const companyInput = document.getElementById("prod_company_input") as HTMLInputElement;
                            if (companyInput) companyInput.value = selectedSupp.company;
                          }
                        }}
                        className="w-full border rounded-xl p-2.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      >
                        <option value="">সিলেক্ট করুন</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">কোম্পানি (Company Name)</label>
                      <input id="prod_company_input" name="company" defaultValue={editingProduct?.company} placeholder="যেমন: Pran-RFL Group" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                  </div>
                </div>

                {/* 3. মূল্য ও কার্টুন মার্জিন */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">৩. মূল্য ও মার্জিন (Pricing & Margins)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">কেনা দাম *</label>
                      <input type="number" step="any" name="cost" defaultValue={editingProduct?.cost} required placeholder="0.00" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">বিক্রয় মূল্য *</label>
                      <input type="number" step="any" name="price" defaultValue={editingProduct?.price} required placeholder="0.00" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">কার্টুন সাইজ *</label>
                      <input type="number" step="any" name="cartoonSize" defaultValue={editingProduct?.cartoonSize || 1} required placeholder="যেমন: ২৪ বা ১২ পিস" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">কার্টুন মার্জিন (SubDB) *</label>
                      <input type="number" step="any" name="cartonMarginSubDB" defaultValue={editingProduct?.cartonMarginSubDB || 0} placeholder="সাবডিবি মার্জিন" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                  </div>
                </div>

                {/* 4. স্টক ও পরিমাপ */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">৪. স্টক ও পরিমাপ (Stock & Alerts)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">বর্তমান স্টক *</label>
                      <input type="number" step="any" name="stock" defaultValue={editingProduct?.stock || 0} required placeholder="0" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">পরিমাপ একক (Unit)</label>
                      <input name="unit" defaultValue={editingProduct?.unit} placeholder="যেমন: Pcs, Box, Pack" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ন্যূনতম স্টক লেভেল *</label>
                      <input type="number" step="any" name="minStockLevel" defaultValue={editingProduct?.minStockLevel || 5} required placeholder="5" className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">মেয়াদউত্তীর্ণ তারিখ</label>
                      <input type="date" name="expiryDate" defaultValue={editingProduct?.expiryDate} className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                  </div>
                </div>

                {/* সাবমিট ও বাতিল বোতাম */}
                <div className="flex gap-4 pt-4 border-t">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border py-3 rounded-xl font-bold text-sm bg-gray-50 hover:bg-gray-100 transition">বাতিল</button>
                  <button type="submit" disabled={isSubmittingForm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition disabled:opacity-50">
                    {isSubmittingForm ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {showBulk && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="border-b pb-3 mb-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                📦 বাল্ক পণ্য এন্ট্রি ও ইম্পোর্ট (Bulk Product Import)
              </h3>
              <button 
                onClick={() => {
                  setShowBulk(false);
                  setImportReport(null);
                }} 
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              {/* Option 1: File Upload */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-800 mb-2">১. ফাইল আপলোড (.xlsx, .csv)</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Excel (.xlsx) বা CSV ফাইল আপলোড করুন। ফাইলের প্রথম রো বা কলামের নামগুলো হতে হবে:
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">Name</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">SKU</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">Category</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">Stock</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">Sale Price</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">Purchase Cost</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">CartonSize</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">Unit</code>, 
                  <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono text-[11px] ml-1">SupplierName</code>।
                </p>
                <CSVUploader 
                  title="পণ্য ইনভেন্টরি" 
                  onImport={handleImportInventory} 
                />
              </div>

              {/* Option 2: Copy Paste Text Area */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-800 mb-2">২. সরাসরি এক্সেল থেকে কপি-পেস্ট করুন</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  এক্সেল ফাইলের কলামগুলো (Name, SKU, Category, Stock, Sale Price, Purchase Cost, CartonSize, Unit, SupplierName) ক্রমানুসারে কপি করে নিচের বক্সে পেস্ট করুন। প্রতি লাইনে একটি করে পণ্য থাকবে।
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Pran Mango 250ml\tPRN-MJ250\tBeverage\t120\t25\t20\t24\tPcs\tPran Supplier\nACI Aerosol 475ml\tACI-AER475\tGroceries\t60\t280\t240\t12\tPcs\tACI Supplier`}
                  rows={6}
                  className="w-full border rounded-xl p-3 text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition font-mono"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleBulkSave}
                    disabled={!bulkText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    পেস্টকৃত তথ্য সংরক্ষণ করুন
                  </button>
                </div>
              </div>

              {/* Option 3: JSON Bulk Import / Upload */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-800 mb-2">৩. JSON ফাইল আপলোড বা সরাসরি পেস্ট করুন (JSON Bulk Import)</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  একটি তৈরি করা পণ্যের তালিকা JSON ফাইল (.json) আপলোড করুন অথবা নিচে JSON ফরম্যাটের ডেটা পেস্ট করুন। বিদ্যমান SKU বা নাম মিললে পণ্য আপডেট হবে এবং নতুন SKU বা নাম হলে নতুন পণ্য তৈরি হবে।
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">JSON ফাইল সিলেক্ট করুন:</label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-750 hover:file:bg-indigo-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">JSON ডেটা এডিট বক্সে প্রিভিউ / পেস্ট করুন:</label>
                  <textarea
                    value={bulkJsonText}
                    onChange={(e) => setBulkJsonText(e.target.value)}
                    placeholder={`[\n  {\n    "name": "Pran Mango 250ml",\n    "sku": "PRN-MJ250",\n    "category": "Beverage",\n    "stock": 120,\n    "price": 25,\n    "cost": 20,\n    "cartoonSize": 24,\n    "unit": "Pcs",\n    "supplierName": "Pran Supplier"\n  }\n]`}
                    rows={6}
                    className="w-full border rounded-xl p-3 text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition font-mono"
                  />
                </div>
                <div className="mt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkJsonText(JSON.stringify([
                        {
                          name: "উদাহরণ পণ্য (Example Product)",
                          sku: "EX-SKU101",
                          category: "Beverage",
                          stock: 100,
                          price: 50,
                          cost: 40,
                          cartoonSize: 12,
                          unit: "Pcs",
                          supplierName: suppliers[0]?.name || "N/A"
                        }
                      ], null, 2));
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition"
                  >
                    টেমপ্লেট লোড করুন
                  </button>
                  <button
                    onClick={handleJsonBulkImport}
                    disabled={!bulkJsonText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    JSON তথ্য ইম্পোর্ট করুন
                  </button>
                </div>
              </div>

              {/* Success & Error Report Display */}
              {importReport && (
                <div className="bg-white border rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-extrabold text-slate-900 border-b pb-2 flex items-center justify-between">
                    <span>📊 ইম্পোর্ট রিপোর্ট ও ফলাফল (Import Statement)</span>
                    <span className="text-xs text-slate-500 font-medium font-mono">
                      মোট পঠিত: {importReport.total}
                    </span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-emerald-700">নতুন যোগ করা হয়েছে</div>
                      <div className="text-lg font-black text-emerald-800 font-mono mt-1">{importReport.created}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-blue-700">আপডেট করা হয়েছে</div>
                      <div className="text-lg font-black text-blue-800 font-mono mt-1">{importReport.updated}</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-rose-700">বাতিল/ত্রুটিযুক্ত</div>
                      <div className="text-lg font-black text-rose-800 font-mono mt-1">{importReport.skipped}</div>
                    </div>
                  </div>

                  {importReport.details.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">বিস্তারিত বিবরণ (Detailed Logs):</span>
                      <div className="bg-slate-950 text-slate-200 text-[11px] font-mono rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                        {importReport.details.map((detail, idx) => (
                          <div key={idx} className="border-b border-slate-800 pb-1 last:border-0">{detail}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-6 flex justify-end">
              <button 
                onClick={() => {
                  setShowBulk(false);
                  setImportReport(null);
                }} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-6 py-2.5 rounded-xl transition"
              >
                বন্ধ করুন
              </button>
            </div>
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

                if (stockAdjustments && stockAdjustments.add) {
                  await stockAdjustments.add({
                    productId: adjustProduct.id,
                    productName: adjustProduct.name || "N/A",
                    sku: adjustProduct.sku || "N/A",
                    previousStock,
                    newStock,
                    quantityChanged: newStock - previousStock,
                    reason: finalReason,
                    date: new Date().toISOString(),
                    user: user?.email || "Unknown"
                  });
                }

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

      {/* 📷 QR Replenish Simulator Modal */}
      {showQRReplenish && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <span>📷 কিউআর কোড স্ক্যান সিমুলেশন</span>
              </h3>
              <button 
                onClick={() => setShowQRReplenish(false)} 
                className="p-1 rounded-full hover:bg-gray-200 transition text-gray-500"
              >
                &times;
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-850 font-medium">
              💡 পণ্য কিউআর কোড স্ক্যান করার প্রক্রিয়া সফলভাবে অনুকরণের জন্য পণ্য ও পুনরায় রিকুইজিশন সংখ্যা দিয়ে সাবমিট করুন।
            </div>

            <form onSubmit={handleSimulateQRReplenish} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">পণ্য সিলেক্ট করুন (Select Product):</label>
                <select
                  value={simulatedProductId}
                  onChange={(e) => setSimulatedProductId(e.target.value)}
                  required
                  className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value="">-- স্ক্যানকৃত পণ্য নির্বাচন করুন --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || "No SKU"}) [স্টক: {p.stock || 0} পিস]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">যোগাযোগ / স্টক রিকুইজিশন পরিমাণ (Add Stock Quantity):</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="যেমন: ৫০, ১০০ বা ২০০ পিস"
                  value={simulatedQty}
                  onChange={(e) => setSimulatedQty(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowQRReplenish(false)} 
                  disabled={isSavingSimulated}
                  className="flex-1 border py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  বাতিল করুন
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingSimulated || !simulatedProductId || !simulatedQty}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 font-semibold"
                >
                  {isSavingSimulated ? "লোডিং..." : "সিমুলেট রিকুইজিশন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📊 Category Min Stock Bulk Update Modal */}
      {showMinStockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <span>📊 ক্যাটাগরি মিনিমাম স্টক বাল্ক আপডেট</span>
              </h3>
              <button 
                onClick={() => setShowMinStockModal(false)} 
                className="p-1 rounded-full hover:bg-gray-200 transition text-gray-500"
              >
                &times;
              </button>
            </div>
            <div className="bg-[#EEEBFF] border border-indigo-150 rounded-xl p-3 mb-4 text-xs text-indigo-950 font-semibold">
              💡 একটি ক্যাটাগরি সিলেক্ট করুন এবং সেই ক্যাটাগরির অন্তর্ভুক্ত সকল পণ্যের জন্য নতুন 'Minimum Stock Level' সেট করুন।
            </div>

            <form onSubmit={handleApplyMinStockCategoryBulk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ক্যাটাগরি নির্বাচন করুন (Select Category):</label>
                <select
                  value={minStockBulkCategory}
                  onChange={(e) => setMinStockBulkCategory(e.target.value)}
                  required
                  className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value="">-- ক্যাটাগরি সিলেক্ট করুন --</option>
                  {categories.map(c => (
                    <option key={c} value={c}>📦 {c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">সর্বনিম্ন স্টক লেভেল (Minimum Stock Level):</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="যেমন: ৫, ১০ বা ১৫ পিস"
                  value={minStockBulkLevel}
                  onChange={(e) => setMinStockBulkLevel(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowMinStockModal(false)} 
                  disabled={isSavingMinStockBulk}
                  className="flex-1 border py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  বাতিল করুন
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingMinStockBulk || !minStockBulkCategory || !minStockBulkLevel}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 font-semibold"
                >
                  {isSavingMinStockBulk ? "লোডিং..." : "আপডেট প্রয়োগ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
