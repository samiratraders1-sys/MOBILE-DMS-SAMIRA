import React, { useState, useEffect, useRef } from "react";
import { Trash2, AlertTriangle, MessageSquare, Plus, Download, Database, RefreshCw, Upload, Image, Sparkles, Tag, Edit2, Users, Palette } from "lucide-react";
import CustomerGroupsView from "./CustomerGroupsView";
import { performAppStorageCleanup, APP_VERSION } from "../lib/cleanup";
import { THEME_PALETTES, applyThemePalette } from "../lib/theme";

import { db } from "../lib/firebase";
import { collection, getDocs, writeBatch, doc, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { useCompany } from "../context/CompanyContext";
import { useConfirm } from "../context/ConfirmContext";

type ResetOption = {
  id: string;
  label: string;
  collections: string[];
};

const RESET_OPTIONS: ResetOption[] = [
  { id: "sales", label: "সেলস ও এন্ট্রি (অর্ডার, সেলস ও রুট সামারি)", collections: ["orders", "summaries", "sales"] },
  { id: "subdb_sales", label: "সাব-ডিবি সেলস ও শিপমেন্ট", collections: ["subDbShipments"] },
  { id: "payments", label: "পেমেন্ট ও রিসিভ", collections: ["payments"] },
  { id: "expenses", label: "খরচ ও ব্যয় (Expenses)", collections: ["expenses"] },
  { id: "accounts", label: "একাউন্ট ও ব্যাংক ব্যালেন্স", collections: ["accounts"] },
  { id: "damage", label: "ড্যামেজ এন্ট্রি", collections: ["damageInventory"] },
  { id: "products", label: "প্রোডাক্ট ও ইনভেন্টরি", collections: ["products"] },
  { id: "customers", label: "কাস্টমার", collections: ["customers"] },
  { id: "suppliers", label: "সাপ্লায়ার", collections: ["suppliers"] },
  { id: "staff", label: "স্টাফ তথ্য", collections: ["staff"] },
  { id: "routes", label: "রোড সমূহ", collections: ["routes"] },
];

interface SettingsViewProps {
  role?: string;
  categories: any[];
  incomeCategories: any[];
  addIncomeCategory: (data: any) => Promise<void>;
  removeIncomeCategory: (id: string) => Promise<void>;
  customerGroups?: any;
}

export default function SettingsView({ 
  role = "view-only",
  categories: propsCategories,
  incomeCategories = [],
  addIncomeCategory,
  removeIncomeCategory,
  customerGroups = { data: [], add: async () => {}, update: async () => {}, remove: async () => {} }
}: SettingsViewProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [categories, setCategories] = useState<any[]>(propsCategories);
  const [newCat, setNewCat] = useState("");
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  // --- COMPANY SETTINGS STATE & LOGIC ---
  const { companyId, company } = useCompany();
  const { confirmDelete } = useConfirm();

  const [companyLogo, setCompanyLogo] = useState("");
  const [invoiceLogo, setInvoiceLogo] = useState("");
  const [invoiceHeader, setInvoiceHeader] = useState("");
  const [invoiceFooter, setInvoiceFooter] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [taxPercent, setTaxPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [bcPrefix, setBcPrefix] = useState("");
  const [bcDigitLimit, setBcDigitLimit] = useState(12);
  const [bcPrintWidth, setBcPrintWidth] = useState("40mm");
  const [printPaperSize, setPrintPaperSize] = useState<"A4" | "thermal">("thermal");
  const [printAuto, setPrintAuto] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedThemePalette, setSelectedThemePalette] = useState(() => localStorage.getItem("brand-palette") || "default");

  useEffect(() => {
    if (company) {
      setCompanyLogo(company.logo || "");
      setInvoiceLogo(company.invoiceLogo || "");
      setInvoiceHeader(company.reportHeader || company.name || "");
      setInvoiceFooter(company.invoiceFooter || "");
      setCurrency(company.currency || "BDT");
      setDateFormat(company.dateFormat || "DD/MM/YYYY");
      setTaxPercent(company.taxPercent || 0);
      setVatPercent(company.vatPercent || 0);
      if (company.barcodeSettings) {
        setBcPrefix(company.barcodeSettings.prefix || "");
        setBcDigitLimit(company.barcodeSettings.digitLimit || 12);
        setBcPrintWidth(company.barcodeSettings.printWidth || "40mm");
      }
      if (company.printSettings) {
        setPrintPaperSize(company.printSettings.paperSize || "thermal");
        setPrintAuto(company.printSettings.autoPrint || false);
        setPrintCopies(company.printSettings.copies || 1);
      }
    }
  }, [company]);

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error("কোনো কোম্পানি সিলেক্ট করা নেই!");
      return;
    }
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, "companies", companyId), {
        logo: companyLogo,
        invoiceLogo,
        reportHeader: invoiceHeader,
        invoiceFooter,
        currency,
        dateFormat,
        taxPercent,
        vatPercent,
        barcodeSettings: {
          prefix: bcPrefix,
          digitLimit: bcDigitLimit,
          printWidth: bcPrintWidth
        },
        printSettings: {
          paperSize: printPaperSize,
          autoPrint: printAuto,
          copies: printCopies
        }
      });
      toast.success("কোম্পানি সেটিংস সফলভাবে সংরক্ষিত হয়েছে!");
    } catch (err: any) {
      toast.error("সেটিংস সংরক্ষণে ব্যর্থতা: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // --- CUSTOMER GROUPS CONFIG LOGIC ---
  const GROUP_COLOR_PRESETS = [
    { name: "Emerald Green", bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" },
    { name: "Indigo Blue", bg: "bg-indigo-600", text: "text-white", border: "border-indigo-700" },
    { name: "Rose Pink", bg: "bg-rose-600", text: "text-white", border: "border-rose-700" },
    { name: "Amber Orange", bg: "bg-amber-500", text: "text-black", border: "border-amber-600" },
    { name: "Purple Violet", bg: "bg-purple-600", text: "text-white", border: "border-purple-700" },
    { name: "Deep Pink", bg: "bg-pink-600", text: "text-white", border: "border-pink-700" },
    { name: "Teal Green", bg: "bg-teal-600", text: "text-white", border: "border-teal-700" },
    { name: "Cyan Light Blue", bg: "bg-cyan-600", text: "text-white", border: "border-cyan-700" },
    { name: "Deep Orange", bg: "bg-orange-600", text: "text-white", border: "border-orange-700" },
    { name: "Crimson Red", bg: "bg-red-600", text: "text-white", border: "border-red-700" },
    { name: "Sky Blue", bg: "bg-sky-600", text: "text-white", border: "border-sky-700" },
    { name: "Lime Yellow", bg: "bg-lime-500", text: "text-black", border: "border-lime-600" },
  ];

  const [groupName, setGroupName] = useState("");
  const [selectedPresetColor, setSelectedPresetColor] = useState(0);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  const handleSaveCustomerGroup = async () => {
    if (!groupName.trim()) {
      toast.error("দয়া করে গ্রুপের নাম লিখুন!");
      return;
    }
    const colorPreset = GROUP_COLOR_PRESETS[selectedPresetColor];
    if (editingGroup) {
      await customerGroups.update(editingGroup.id, {
        name: groupName.trim(),
        bg: colorPreset.bg,
        text: colorPreset.text,
        border: colorPreset.border
      });
      setEditingGroup(null);
      toast.success("গ্রুপ সফলভাবে আপডেট করা হয়েছে!");
    } else {
      const exists = (customerGroups.data || []).some(
        (g: any) => g.name.toLowerCase().trim() === groupName.toLowerCase().trim()
      );
      if (exists) {
        toast.error("এই নামের গ্রুপ ইতিমধ্যে বিদ্যমান!");
        return;
      }
      await customerGroups.add({
        name: groupName.trim(),
        bg: colorPreset.bg,
        text: colorPreset.text,
        border: colorPreset.border,
        createdAt: new Date().toISOString()
      });
      toast.success("নতুন কাস্টমার গ্রুপ যুক্ত করা হয়েছে!");
    }
    setGroupName("");
  };

  const handleEditGroupClick = (g: any) => {
    setEditingGroup(g);
    setGroupName(g.name);
    const presetIdx = GROUP_COLOR_PRESETS.findIndex(p => p.bg === g.bg);
    if (presetIdx !== -1) {
      setSelectedPresetColor(presetIdx);
    }
  };

  const handleCancelGroupEdit = () => {
    setEditingGroup(null);
    setGroupName("");
    setSelectedPresetColor(0);
  };

  const handleInitDefaultGroups = async () => {
    const DEFAULT_GROUPS = [
      { name: "Retailer", bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" },
      { name: "Wholesaler", bg: "bg-violet-600", text: "text-white", border: "border-violet-700" },
      { name: "VIP", bg: "bg-rose-600", text: "text-white", border: "border-rose-700" },
      { name: "Dealer", bg: "bg-amber-500", text: "text-black", border: "border-amber-600" },
      { name: "General", bg: "bg-slate-500", text: "text-white", border: "border-slate-600" },
    ];
    for (const group of DEFAULT_GROUPS) {
      if (!(customerGroups.data || []).some((g: any) => g.name.toLowerCase().trim() === group.name.toLowerCase().trim())) {
        await customerGroups.add({
          name: group.name,
          bg: group.bg,
          text: group.text,
          border: group.border,
          createdAt: new Date().toISOString()
        });
      }
    }
    toast.success("ডিফল্ট কাস্টমার গ্রুপ সমূহ লোড করা হয়েছে!");
  };

  // --- CUSTOM LOGO UPLOADER LOGIC ---
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CASH SAFETY THRESHOLD SETTINGS ---
  const [cashSafetyThreshold, setCashSafetyThreshold] = useState<number>(() => {
    return Number(localStorage.getItem("cash_safety_threshold") || "10000");
  });
  const [cashSafetyAlertEnabled, setCashSafetyAlertEnabled] = useState<boolean>(() => {
    return localStorage.getItem("cash_safety_alert_enabled") !== "false";
  });

  const handleSaveCashSafety = () => {
    localStorage.setItem("cash_safety_threshold", String(cashSafetyThreshold));
    localStorage.setItem("cash_safety_alert_enabled", String(cashSafetyAlertEnabled));
    toast.success("দৈনিক ক্যাশ বুক সেফটি থ্রেশহোল্ড সেটিংস সফলভাবে আপডেট করা হয়েছে!");
  };

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem("app_custom_logo");
      if (savedLogo) {
        setLogoBase64(savedLogo);
      }
    } catch (e) {
      console.error("Error reading logo from localStorage:", e);
    }
  }, []);

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("দুঃখিত! লোগোর সাইজ অবশ্যই ১.৫ মেগাবাইটের (1.5MB) কম হতে হবে।");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        try {
          localStorage.setItem("app_custom_logo", result);
          setLogoBase64(result);
          window.dispatchEvent(new Event("logo-changed"));
          toast.success("সফলভাবে আপনার ব্র্যান্ড লোগো অ্যাপে যুক্ত করা হয়েছে!");
        } catch (err) {
          console.error("Failed to save logo:", err);
          toast.error("লোগোটি সেভ করতে সমস্যা হয়েছে। দয়া করে ছোট সাইজের ছবি ব্যবহার করুন।");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    try {
      localStorage.removeItem("app_custom_logo");
      setLogoBase64(null);
      window.dispatchEvent(new Event("logo-changed"));
      toast.success("সফলভাবে ডিফল্ট আইকন রিসেট করা হয়েছে!");
    } catch (e) {
      console.error(e);
      toast.error("রিসেট করতে ব্যর্থ হয়েছে।");
    }
  };

  // --- MANUAL FORCE SYNC LOGIC ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");

  const handleManualForceSync = async () => {
    setIsSyncing(true);
    setSyncStatus("ইন্টারনেট সংযোগ পরীক্ষণ সম্পন্ন হচ্ছে...");
    try {
      const isOnlineLink = typeof navigator !== "undefined" ? navigator.onLine : true;
      if (!isOnlineLink) {
        toast.error("আপনার মোবাইলটি অফলাইন মোডে আছে। সিঙ্ক সম্পন্ন করতে একটি সচল ইন্টারনেট সংযোগ প্রয়োজন!");
        setIsSyncing(false);
        setSyncStatus("");
        return;
      }

      const syncCollections = [
        "products", 
        "customers", 
        "suppliers", 
        "routes", 
        "staff", 
        "orders", 
        "summaries", 
        "subDbShipments", 
        "payments"
      ];

      for (let i = 0; i < syncCollections.length; i++) {
        const col = syncCollections[i];
        setSyncStatus(`ফোর্স রিলোড করা হচ্ছে: ${col} (${i + 1}/${syncCollections.length})`);
        
        // Query Firestore bypassing local caches if possible
        const colRef = collection(db, col);
        await getDocs(colRef);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      setSyncStatus("সমস্ত ক্লাউড ডাটা সফলভাবে ডাউনলোড ও সিঙ্ক হয়েছে!");
      toast.success("অভিনন্দন! ফায়ারবেস ক্লাউডের সমস্ত ডাটা সফলভাবে সিঙ্ক সম্পন্ন হয়েছে এবং লোকাল ক্যাশে আপডেট করা হয়েছে।");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      toast.error("ম্যানuvial ডাটা সিঙ্ক প্রক্রিয়ায় সমস্যা দেখা দিয়েছে: " + err.message);
    } finally {
      setIsSyncing(false);
      setSyncStatus("");
    }
  };

  const handleExportBackup = async (onlyCore: boolean = false) => {
    if (role !== "admin") {
      toast.error("শুধুমাত্র এডমিন ব্যাকআপ ডাউনলোড করতে পারবেন!");
      return;
    }
    setIsExporting(true);
    setExportStatus("ব্যাকআপ প্রস্তুত হচ্ছে...");
    try {
      const backupData: Record<string, any[]> = {};
      const criticalCollections = onlyCore 
        ? ["products", "sales", "customers", "suppliers"]
        : [
            "products",
            "routes",
            "staff",
            "summaries",
            "customers",
            "suppliers",
            "orders",
            "sales",
            "users",
            "roles",
            "transfers",
            "payments",
            "categories",
            "damageInventory",
            "purchases",
            "accounts",
            "incomeCategories",
            "subDbs",
            "subDbShipments",
            "subDbSettings",
            "stockAdjustments",
            "boms",
            "productions",
            "attendance",
            "payroll",
            "fixedAssets",
            "loans",
            "returns"
          ];

      for (const colName of criticalCollections) {
        setExportStatus(`ডাউনলোড হচ্ছে: ${colName}...`);
        const colRef = collection(db, colName);
        const querySnapshot = await getDocs(colRef);
        backupData[colName] = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
      }

      setExportStatus("ব্যাকআপ ফাইল প্রস্তুত করা হচ্ছে...");
      const fullBackup = {
        appName: "Samira Traders DMS",
        exportedAt: new Date().toISOString(),
        backupType: onlyCore ? "Core Collections (Products, Sales, Customers, Suppliers)" : "Full Database",
        collections: backupData
      };

      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", downloadUrl);
      
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = onlyCore 
        ? `samira_traders_core_backup_${dateStr}.json`
        : `samira_traders_full_backup_${dateStr}.json`;
      downloadAnchor.setAttribute("download", fileName);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(downloadUrl);

      try {
        localStorage.setItem("last_manual_backup_date", new Date().toISOString());
      } catch (err) {
        console.error("Local storage set failed: ", err);
      }

      setExportStatus("সফলভাবে ডাউনলোড সম্পন্ন হয়েছে!");
      toast.success(`${onlyCore ? "কোর কালেকশন" : "ফুল ডেটাবেস"} ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!`);
      setTimeout(() => setExportStatus(""), 5000);
    } catch (error) {
      console.error("Backup export failed: ", error);
      toast.error("ব্যাকআপ নিতে সমস্যা হয়েছে: " + (error as Error).message);
      setExportStatus("ব্যর্থ হয়েছে");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setCategories(propsCategories);
  }, [propsCategories]);

  const handleAddCategory = async () => {
      if(!newCat) return;
      await addDoc(collection(db, "categories"), { name: newCat });
      setNewCat("");
  };

  const handleRemoveCategory = async (id: string) => {
      await deleteDoc(doc(db, "categories", id));
      setCategories(categories.filter(c => c.id !== id));
  };

  const handleAddIncomeCategory = async () => {
      if (!newIncomeCat.trim()) return;
      await addIncomeCategory({ name: newIncomeCat.trim(), createdAt: new Date().toISOString() });
      setNewIncomeCat("");
  };

  const handleInitDefaultIncomeCats = async () => {
      const defaults = [
        "ডিলার কমিশন",
        "খালি কার্টুন বিক্রয়",
        "খালি ক্যারেট/বস্তা বিক্রয়",
        "কোম্পানি ইনসেন্টিভ",
        "ড্যামেজ সমন্বয় রিফান্ড",
        "অতিরিক্ত ক্যাশ সমন্বয়",
        "ব্যাংক মুনাফা / লভ্যাংশ",
        "অন্যান্য সাধারণ আয়"
      ];
      for (const cat of defaults) {
        if (!incomeCategories.some((c: any) => c.name === cat)) {
          await addIncomeCategory({ name: cat, createdAt: new Date().toISOString() });
        }
      }
  };

  const handleReset = () => {
    const selectedCollections = RESET_OPTIONS
      .filter(option => selectedOptions[option.id])
      .flatMap(option => option.collections);

    if (selectedCollections.length === 0) {
      toast.error(" can অন্তত একটি অপশন সিলেক্ট করুন!");
      return;
    }

    setShowResetConfirm(true);
  };

  const executeReset = async () => {
    const selectedCollections = RESET_OPTIONS
      .filter(option => selectedOptions[option.id])
      .flatMap(option => option.collections);

    setShowResetConfirm(false);
    setIsResetting(true);
    setStatus("রিসেট প্রক্রিয়া শুরু হচ্ছে...");

    try {
      for (const colName of selectedCollections) {
        setStatus(`রিসেট করা হচ্ছে: ${colName}...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          const colRef = collection(db, colName);
          const querySnapshot = await getDocs(colRef);
          
          if (querySnapshot.size === 0) {
            continue;
          }

          const docs = querySnapshot.docs;
          for (let i = 0; i < docs.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + 500);
            chunk.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        } catch (colError) {
          console.error(`Error resetting ${colName}:`, colError);
        }
      }

      if (selectedCollections.includes("subDbShipments")) {
        setStatus("সাব-ডিবি পয়েন্টের ডেসক্রিপশন ব্যালেন্স রিসেট করা হচ্ছে...");
        try {
          const subDbCol = collection(db, "subDbs");
          const subDbSnap = await getDocs(subDbCol);
          if (subDbSnap.size > 0) {
            const batch = writeBatch(db);
            subDbSnap.docs.forEach((docSnap) => {
              batch.update(docSnap.ref, { balance: 0 });
            });
            await batch.commit();
          }
        } catch (subDbErr) {
          console.error("Error resetting subDb outstanding balances:", subDbErr);
        }
      }

      setStatus("রিসেট প্রক্রিয়া সম্পন্ন!");
      toast.success("সিলেক্ট করা ডাটা সফলভাবে রিসেট সম্পন্ন হয়েছে!");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error: any) {
      console.error("Error resetting data:", error);
      toast.error("রিসেট করতে समस्या হয়েছে: " + error.message);
    } finally {
      setIsResetting(false);
      setStatus("");
    }
  };

  const toggleOption = (id: string) => {
    setSelectedOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">সেটিংস</h2>
        <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
          কোম্পানি আইডি: {companyId || "N/A"}
        </span>
      </div>

      {/* COMPANY SETTINGS CARD */}
      <form onSubmit={handleSaveCompanySettings} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
        <div className="border-b pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">🏢 কোম্পানি এবং ইনভয়েস সেটিংস</h3>
            <p className="text-xs text-gray-500 mt-1">কোম্পানির লোগো, ইনভয়েস হেডার/ফুটার, ট্যাক্স, প্রিন্ট ও বারকোড সেটিংস কনফিগার করুন</p>
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="bg-indigo-600 hover:bg-indigo-700 transition-all text-white px-5 py-2 rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
          >
            {savingSettings ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ করুন"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: General Info & Branding */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-1">ব্র্যান্ডিং ও ইনভয়েস টেক্সট</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">কোম্পানি লোগো (URL)</label>
                <input
                  type="text"
                  value={companyLogo}
                  onChange={e => setCompanyLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full p-2 text-sm border rounded-xl focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ইনভয়েস লোগো (URL)</label>
                <input
                  type="text"
                  value={invoiceLogo}
                  onChange={e => setInvoiceLogo(e.target.value)}
                  placeholder="https://example.com/inv-logo.png"
                  className="w-full p-2 text-sm border rounded-xl focus:outline-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ইনভয়েস/রিপোর্ট হেডার টেক্সট</label>
              <input
                type="text"
                value={invoiceHeader}
                onChange={e => setInvoiceHeader(e.target.value)}
                placeholder="সমীরা ট্রেডার্স লিমিটেড"
                className="w-full p-2 text-sm border rounded-xl focus:outline-indigo-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ইনভয়েস ফুটার বার্তা</label>
              <textarea
                value={invoiceFooter}
                onChange={e => setInvoiceFooter(e.target.value)}
                placeholder="আমাদের সাথে ব্যবসা করার জন্য আপনাকে ধন্যবাদ!"
                className="w-full p-2 text-sm border rounded-xl focus:outline-indigo-500 h-16"
              />
            </div>
          </div>

          {/* Section 2: Currency, Formats & Taxes */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-1">লোকালাইজেশন ও ট্যাক্স</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">কারেন্সি (Currency)</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full p-2 text-sm border rounded-xl bg-white focus:outline-indigo-500"
                >
                  <option value="BDT">BDT (৳)</option>
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">তারিখের ফরম্যাট</label>
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-full p-2 text-sm border rounded-xl bg-white focus:outline-indigo-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ট্যাক্স (Tax %)</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxPercent}
                  onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 text-sm border rounded-xl focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ভ্যাট (VAT %)</label>
                <input
                  type="number"
                  step="0.01"
                  value={vatPercent}
                  onChange={e => setVatPercent(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 text-sm border rounded-xl focus:outline-indigo-500"
                />
              </div>
            </div>

            {/* Sub-grid for Print and Barcode Settings */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2 border p-3 rounded-xl bg-slate-50/50">
                <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">বারকোড সেটিংস</span>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={bcPrefix}
                    onChange={e => setBcPrefix(e.target.value)}
                    placeholder="Prefix (e.g. SMR)"
                    className="w-full p-1 text-xs border rounded-lg bg-white"
                  />
                  <input
                    type="number"
                    value={bcDigitLimit}
                    onChange={e => setBcDigitLimit(parseInt(e.target.value) || 12)}
                    placeholder="Digit Limit"
                    className="w-full p-1 text-xs border rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2 border p-3 rounded-xl bg-slate-50/50">
                <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">প্রিন্ট সেটিংস</span>
                <div className="space-y-1.5">
                  <select
                    value={printPaperSize}
                    onChange={e => setPrintPaperSize(e.target.value as any)}
                    className="w-full p-1 text-xs border rounded-lg bg-white"
                  >
                    <option value="thermal">Thermal (80mm)</option>
                    <option value="A4">Standard A4</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printAuto}
                      onChange={e => setPrintAuto(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    অটো প্রিন্ট
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
      
      {/* GRID 1: TRANSACTION CATEGORIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold mb-2 text-gray-900 flex items-center gap-2">📂 লেনদেনের ক্যাটাগরি</h3>
            <p className="text-xs text-gray-500 mb-3">সব সাধারণ কাস্টম খরচ বা পেমেন্ট খাতের ক্যাটাগরি সমূহ পরিচালনা করুন</p>
            <div className="flex gap-2 mb-4">
              <input 
                value={newCat} 
                onChange={e => setNewCat(e.target.value)} 
                className="p-2 border border-gray-200 rounded-xl flex-1 text-sm focus:outline-emerald-500" 
                placeholder="নতুন ক্যাটাগরি নাম" 
              />
              <button 
                onClick={handleAddCategory} 
                className="bg-black hover:bg-gray-900 transition-all text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4"/> যোগ করুন
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-dashed border-gray-100 rounded-xl">
            {categories.map(c => (
              <div key={c.id} className="bg-gray-100 p-2 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-all">
                {c.name}
                <button onClick={() => handleRemoveCategory(c.id)} className="cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                </button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-xs text-gray-400 p-2 text-center w-full">কোনো ক্যাটাগরি নেই</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">💵 আদার্স ইনকাম ক্যাটাগরি</h3>
                <p className="text-xs text-gray-500 mt-0.5">আদার্স ইনকাম জমা করার পূর্বে কাস্টম আয়ের উৎস বা পারপাস প্রিসেট করুন</p>
              </div>
              {incomeCategories.length === 0 && (
                <button 
                  onClick={handleInitDefaultIncomeCats}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                >
                  ⚡ রিসোর্স লোড
                </button>
              )}
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                value={newIncomeCat} 
                onChange={e => setNewIncomeCat(e.target.value)} 
                className="p-2 border border-gray-200 rounded-xl flex-1 text-sm focus:outline-emerald-500" 
                placeholder="উদা: খালি বস্তা/ক্যারেট বিক্রয়" 
              />
              <button 
                onClick={handleAddIncomeCategory} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4"/> যোগ করুন
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-dashed border-gray-100 rounded-xl">
            {incomeCategories.map(c => (
              <div key={c.id} className="bg-emerald-50 p-2 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all border border-emerald-100">
                {c.name}
                <button onClick={() => removeIncomeCategory(c.id)} className="cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                </button>
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <div className="text-center py-6 block w-full">
                <p className="text-xs text-gray-400">কোনো আয়ের কাস্টম ক্যাটাগরি তৈরি করা নেই</p>
                <button onClick={handleInitDefaultIncomeCats} className="text-emerald-600 text-[10px] font-bold underline mt-1.5 cursor-pointer block mx-auto hover:text-emerald-800">
                  আমাদের ব্যবসায়িক ডিফল্ট উৎসগুলো লোড করতে চান?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRID 1.5: CUSTOMER GROUPS CONFIG */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">👥 কাস্টমার গ্রুপ ও কালার কনফিগারেশন</h3>
            <p className="text-xs text-gray-400 mt-1">প্রিসেট কাস্টমার গ্রুপ এবং তাদের জন্য চকচকে, উজ্জ্বল কালার কাস্টমাইজ করুন</p>
          </div>
          {(customerGroups.data || []).length === 0 && (
            <button 
              onClick={handleInitDefaultGroups}
              className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-850 border border-violet-150 font-black text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-98"
            >
              ⚡ ডিফল্ট প্রিসেট সমূহ লোড করুন
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* COLUMN 1: FORM TO ADD/EDIT */}
          <div className="p-5 border border-gray-150 rounded-2xl bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1 px-2 border border-violet-250 bg-violet-100/60 rounded-lg text-violet-800 font-extrabold text-[10px]">
                  {editingGroup ? "এডিট মোড" : "নতুন গ্রুপ তৈরি"}
                </span>
                <span className="text-xs text-gray-400 font-bold">
                  {editingGroup ? "গ্রুপের কালার বা নাম পরিবর্তন করুন" : "একটি সলিড এবং সুন্দর ব্রাইট কালার সিলেক্ট করুন"}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 tracking-wide mb-1.5 uppercase">গ্রুপের নাম / টাইটেল *</label>
                  <input 
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="উদা: Retailer, Wholesaler, VIP, VIP Dhamrai"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-950 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 tracking-wide mb-2 uppercase">গ্রুপের ব্যাকগ্রাউন্ড কালার সিলেক্ট করুন *</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {GROUP_COLOR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPresetColor(idx)}
                        className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer ${
                          selectedPresetColor === idx 
                            ? "border-indigo-650 bg-white shadow-xs scale-102 ring-2 ring-indigo-500/20" 
                            : "border-gray-200 bg-gray-50 hover:bg-white"
                        }`}
                        title={preset.name}
                      >
                        <span className={`w-5 h-5 rounded-full ${preset.bg} border ${preset.border} block shrink-0`} />
                        <span className="text-[8px] font-black tracking-tighter text-gray-550 block select-none uppercase truncate w-full text-center">
                          {preset.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* LIVE PREVIEW BADGE */}
                {groupName && (
                  <div className="p-3 bg-white border border-dashed border-gray-250 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">লাইভ প্রিভিউ ব্যাজ:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider transition-all ${GROUP_COLOR_PRESETS[selectedPresetColor].bg} ${GROUP_COLOR_PRESETS[selectedPresetColor].text} ${GROUP_COLOR_PRESETS[selectedPresetColor].border}`}>
                      {groupName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 pt-4">
              <button
                type="button"
                onClick={handleSaveCustomerGroup}
                className="flex-1 bg-black hover:bg-gray-800 text-white p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {editingGroup ? "গ্রুপ আপডেট করুন" : <><Plus className="w-4 h-4" /> গ্রুপ যোগ করুন</>}
              </button>
              {editingGroup && (
                <button
                  type="button"
                  onClick={handleCancelGroupEdit}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-750 p-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  বাতিল
                </button>
              )}
            </div>
          </div>

          {/* COLUMN 2: LIST OF GROUPS */}
          <div className="p-5 border border-gray-150 rounded-2xl flex flex-col justify-between bg-slate-50/50">
            <div>
              <h4 className="font-bold text-xs text-[#1e1b4b] mb-3 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-violet-650" /> সক্রিয় গ্রুপ তালিকা ({(customerGroups.data || []).length})
              </h4>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 border border-dashed border-gray-100 rounded-xl p-2 bg-gray-55/30">
                {(customerGroups.data || []).map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-250 transition-all hover:shadow-2xs">
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider ${g.bg} ${g.text || "text-white"} ${g.border}`}>
                        {g.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditGroupClick(g)}
                        className="p-1.5 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:text-black transition-all cursor-pointer"
                        title="গ্রুপ এডিট করুন"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.log("Delete button clicked for group:", g.id);
                          confirmDelete({
                            recordName: g.name,
                            onConfirm: async () => {
                              console.log("Confirmed deletion for:", g.id);
                              await customerGroups.remove(g.id);
                            }
                          });
                        }}
                        className="p-1.5 hover:bg-red-50 border border-gray-200 hover:border-red-150 rounded-lg text-gray-500 hover:text-red-650 transition-all cursor-pointer"
                        title="ডিলিট করুন"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {(customerGroups.data || []).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-400">কোনো কাস্টম কাস্টমার গ্রুপ তৈরি করা নেই</p>
                    <button 
                      onClick={handleInitDefaultGroups} 
                      className="text-violet-650 text-[10px] font-bold underline mt-2 block mx-auto hover:text-violet-850 cursor-pointer"
                    >
                      ডিফল্ট গ্রুপ প্রিসেটগুলো লোড করতে চান?
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-semibold mt-3">
              * নতুন বা এডিটেড গ্রুপগুলি সেভ হওয়ার পর কাস্টমার এন্ট্রি / এডিট ফর্মে এবং রিপোর্টগুলোতে কালার ম্যাপিং সহ যোগ হয়ে যাবে।
            </p>
          </div>
        </div>
      </div>

      {/* GRID 2: BRAND LOGO & SYSTEM SYNC */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* BRAND LOGO CARD */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-950 flex items-center gap-2 mb-2">
              <Image className="w-5 h-5 text-emerald-600" /> অ্যাপস ব্র্যান্ড লোগো সেটিংস
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              আপনার নিজস্ব ব্যাবসায়িক লোগো এখানে আপলোড করুন। আপলোড করার সাথে সাথে এটি আপনার অ্যাপ্লিকেশনের প্রবেশদ্বার (Log-in) এবং সাইডবার মেনুতে চমৎকারভাবে সেট হয়ে যাবে।
            </p>

            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
              <div className="w-16 h-16 bg-white border border-slate-150 rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-xs shrink-0">
                {logoBase64 ? (
                  <img src={logoBase64} alt="Custom Logo Preview" className="w-full h-full object-contain rounded" />
                ) : (
                  <div className="text-gray-300 font-bold text-xs text-center leading-tight">কোনো লোগো নেই</div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-[#1e1b4b]">লোগো স্ট্যাটাস:</h4>
                <p className="text-[10px] text-gray-550 mt-0.5 font-medium leading-normal">
                  {logoBase64 ? "কাস্টম আপলোডেড ব্র্যান্ড লোগো সক্রিয় আছে।" : "ডিফল্ট 'প্যাকেজ' আইকন সক্রিয়।"}
                </p>
                {logoBase64 && (
                  <button
                    onClick={handleResetLogo}
                    className="text-[10px] text-red-650 hover:text-red-700 font-bold underline cursor-pointer mt-1 hover:no-underline block"
                  >
                    লোগোটি রিমুভ করুন
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoChange} 
              accept="image/*" 
              className="hidden" 
            />
            <button
              onClick={handleLogoUploadClick}
              className="w-full bg-[#111827] hover:bg-[#1f2937] text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Upload className="w-4 h-4" />
              <span>নতুন লোগো আপলোড করুন</span>
            </button>
          </div>
        </div>

        {/* SYSTEM SYNC CARD */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-950 flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-indigo-600" /> ক্লাউড ডাটা সিঙ্ক্রোনাইজেশন
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-semibold">
              আপনার যদি মনে হয় ক্লাউডের কোনো ডাটা যেমন পেমেন্ট, স্টক অথবা রোড ডাটা লোকালে সঠিকভাবে আপডেট হয়নি, সম্পূর্ণ ডাটা ফোর্স সিঙ্ক করে রিলোড করুন।
            </p>

            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4 text-xs font-bold text-indigo-800 leading-relaxed">
              {isSyncing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent" />
                    <span>সিঙ্ক প্রোসেসিং চলছে...</span>
                  </div>
                  <p className="text-[10px] text-indigo-500 font-mono font-medium">{syncStatus}</p>
                </div>
              ) : (
                <p>সবশেষ সিঙ্ক অবস্থা: লোকাল ক্যাশে ফাস্ট মোড রেডি। যদি কোনো তথ্য মিসিং হয় নিচের বাটনে ক্লিক করুন। এতে কোনো তথ্য ডিলিট হবে না।</p>
              )}
            </div>
          </div>

          <div>
            <button
              onClick={handleManualForceSync}
              disabled={isSyncing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>ফোর্স ডাটা সিঙ্ক করুন</span>
            </button>
            <p className="text-center text-[9px] text-indigo-400 font-bold mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> অফলাইন-মোড এবং অনলাইনের মাঝে নিখুঁত সমন্বয় নিশ্চিত করে।
            </p>
          </div>
        </div>

        {/* FORCE CACHE REFRESH CARD */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-950 flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-red-650" /> ফোর্স ক্যাশ রিফ্রেশ (Cache Refresh)
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-semibold">
              ভার্সন পরিবর্তন বা ক্যাশিং সমস্যার কারণে যদি ভুল বা পুরোনো ডেটা বারবার প্রদর্শিত হয়, তবে এই বাটনে চাপ দিন। এটি আপনার লোকাল ব্রাউজার স্টোরেজ, ইনডেক্সড-ডিবি (IndexedDB), সার্ভিস ওয়ার্কার এবং ক্যাশ সম্পূর্ণরূপে মুছে ফেলবে।
            </p>

            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-4 text-xs font-bold text-red-800 leading-relaxed">
              <p>অ্যাপের বর্তমান সংস্করণ (Version): <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-750 font-black">{APP_VERSION}</span></p>
              <p className="text-[10px] text-red-600 font-medium mt-1 leading-normal">
                সতর্কতা: এটি চালুর সাথে সাথে পেজটি স্বয়ংক্রিয়ভাবে রিলোড নেবে এবং সমস্ত লোকাল ক্যাশ নতুন করে ফ্রেসলি সিঙ্ক হবে।
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                confirmDelete({
                  recordName: "লোকাল ক্যাশ ও স্টোরেজ",
                  onConfirm: async () => {
                    // Temporarily remove versioning keys from localStorage so the cleanup is forced to run
                    localStorage.removeItem("app_version");
                    localStorage.removeItem("app_build_timestamp");
                    await performAppStorageCleanup();
                  }
                });
              }}
              className="w-full bg-red-650 hover:bg-red-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <RefreshCw className="w-4 h-4" />
              <span>এখনি ক্যাশ রিফ্রেশ করুন (Force Refresh)</span>
            </button>
            <p className="text-center text-[9px] text-red-400 font-bold mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> কোনো জটিল ডাটা কনফ্লিক্ট বা পুরোনো ক্যাশের সমস্যা দ্রুত সমাধান করতে সাহায্য করে।
            </p>
          </div>
        </div>
      </div>

      {/* GRID 3: PALETTE, CASH SAFETY & BACKUP DOWNLOAD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BRAND COLOR PALETTE CARD */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-950 flex items-center gap-2 mb-2">
              <Palette className="w-5 h-5 text-indigo-600" /> ব্র্যান্ড কালার প্যালেট (Brand Colors)
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-semibold">
              আপনার সমেরা ট্রেডার্স (DMS) অ্যাপ্লিকেশনের জন্য একটি আকর্ষণীয় থিম কালার প্যালেট নির্বাচন করুন। এটি সমস্ত বাটন, হেডার ও অ্যাকসেন্ট কালার পরিবর্তন করবে।
            </p>

            <div className="space-y-2.5">
              {THEME_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => {
                    setSelectedThemePalette(palette.id);
                    applyThemePalette(palette.id);
                    toast.success(`থিম সফলভাবে '${palette.name}' এ সেট করা হয়েছে!`);
                  }}
                  className={`w-full flex items-center justify-between p-3 border rounded-xl transition cursor-pointer select-none text-left ${
                    selectedThemePalette === palette.id
                      ? "border-indigo-600 bg-indigo-50/50 font-bold"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4.5 h-4.5 rounded-full border border-gray-350 shadow-inner inline-block"
                      style={{ backgroundColor: palette.colors[600] }}
                    />
                    <span className="text-xs">{palette.name}</span>
                  </div>
                  {selectedThemePalette === palette.id && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-[10px] text-gray-400 mt-4 text-center font-medium">
            * এটি আপনার লোকাল ব্রাউজারে সংরক্ষিত থাকবে
          </div>
        </div>

        {/* CASH SAFETY CARD */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-950 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> দৈনিক ক্যাশ সেফটি লিমিট (Cash Safety)
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-semibold">
              দৈনিক ক্যাশ বুক খতিয়ানে তরল অর্থের একটি নিরাপদ সীমা (Safety Limit) সেট করুন। যদি কোনো নির্দিষ্ট দিনে সমাপনী ক্যাশ এই অ্যামউন্টের নিচে নেমে যায়, সিস্টেমে সতর্কবার্তা দেখাবে।
            </p>

            <div className="space-y-3 font-sans pb-4">
              <div>
                <label className="block text-[10px] font-black text-gray-700 uppercase tracking-wide mb-1.5">নিরাপত্তা সীমা পরিমাণ (টাকা):</label>
                <input 
                  type="number" 
                  value={cashSafetyThreshold} 
                  onChange={e => setCashSafetyThreshold(Math.max(0, Number(e.target.value)))} 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-950 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  placeholder="যেমন: ১০,০০০"
                />
              </div>
              <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <input 
                  type="checkbox" 
                  id="cash-safety-alert"
                  checked={cashSafetyAlertEnabled} 
                  onChange={e => setCashSafetyAlertEnabled(e.target.checked)} 
                  className="w-4.5 h-4.5 cursor-pointer accent-indigo-600"
                />
                <label htmlFor="cash-safety-alert" className="text-[11px] font-extrabold text-gray-700 cursor-pointer select-none">
                  নিরাপত্তা সতর্কবার্তা ও এলার্ট সক্রিয় করুন
                </label>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSaveCashSafety}
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            সেটিংস সংরক্ষণ করুন
          </button>
        </div>

        {/* BACKUP EXPORT CARD */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-950 flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-indigo-600" /> ডাটাবেস ব্যাকআপ ডাউনলোড (Admin Backup)
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed font-semibold">
              আপনার সমেরা ট্রেডার্স ফায়ারবেস ক্লাউড ডেটাবেস থেকে নিরাপদ JSON ব্যাকআপ ফাইল ডাউনলোড করুন। (শুধুমাত্র এডমিনদের জন্য অনুমোদিত ফিচার)
            </p>
          </div>

          <div className="space-y-3">
            {exportStatus && (
              <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 animate-pulse flex items-center justify-center">
                {exportStatus}
              </div>
            )}
            
            <button
              id="backup-now-button"
              onClick={() => handleExportBackup(true)}
              disabled={isExporting || role !== "admin"}
              className="w-full bg-[#111827] hover:bg-[#1f2937] disabled:bg-[#4b5563] text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-98"
              title="পণ্য, বিক্রয়, কাস্টমার ও সাপ্লায়ার কালেকশন ব্যাকআপ নিন"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "প্রসেসিং হচ্ছে..." : "ডাউনলোড ডাটাবেস ব্যাকআপ (Core JSON)"}</span>
            </button>

            <button
              id="backup-full-button"
              onClick={() => handleExportBackup(false)}
              disabled={isExporting || role !== "admin"}
              className="w-full bg-slate-100 hover:bg-slate-200 border border-gray-300 disabled:bg-gray-100 text-gray-800 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold transition-all cursor-pointer active:scale-98"
              title="সম্পূর্ণ ডেটাবেস ব্যাকআপ ফাইল ডাউনলোড করুন"
            >
              <Database className="w-4 h-4" />
              <span>সম্পূর্ণ সিস্টেম ব্যাকআপ (Full JSON)</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* FULL WIDTH CARD: SELECTIVE DATA RESET */}
      <div className="bg-white p-6 rounded-2xl border border-red-200/60 shadow-xs">
        <h3 className="font-bold text-red-650 flex items-center gap-2 mb-3">
          <AlertTriangle /> ডেটাবেস রিসেট (সিলেক্টিভ এন্ট্রি ডিলিট)
        </h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed font-semibold">
          সাবধান! এখানে সিলেক্ট করা ক্যাটাগরির সমস্ত ডেটা ফায়ারবেস ক্লাউড ডেটাবেস থেকে চিরতরে মুছে ফেলা হবে। শুধু নতুন বছরের হিসাবপত্র শুরুর ক্ষেত্রে বা টেস্ট করার জন্য ব্যবহার করুন।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {RESET_OPTIONS.map(option => (
            <label key={option.id} className="flex items-center gap-2.5 p-3.5 border rounded-xl hover:bg-red-50/20 cursor-pointer border-gray-200 transition bg-gray-50/20 active:scale-99 select-none">
              <input 
                type="checkbox"
                checked={!!selectedOptions[option.id]}
                onChange={() => toggleOption(option.id)}
                className="w-4 h-4 cursor-pointer accent-red-600"
              />
              <span className="text-xs font-extrabold text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>

        <button 
          onClick={handleReset}
          disabled={isResetting}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-black text-xs w-full justify-center md:w-auto disabled:opacity-50 transition shadow-sm cursor-pointer"
        >
          {isResetting ? "রিসেট হচ্ছে..." : <><Trash2 className="w-4 h-4" /> সিলেক্ট করা ডাটা রিসেট করুন</>}
        </button>
        {status && <p className="mt-4 text-xs font-bold text-indigo-600 animate-pulse">{status}</p>}
      </div>

      {/* FULL WIDTH CARD: SUPPORT & CHAT */}
      <div className="bg-white p-6 rounded-2xl border border-gray-250 shadow-xs">
        <h3 className="font-bold flex items-center gap-2 mb-3 text-gray-950">
          <MessageSquare className="text-indigo-600" /> চ্যাট হিস্টোরি এবং সাপোর্ট
        </h3>
        <p className="text-xs text-gray-550 leading-relaxed font-semibold">
          আপনার এই চ্যাট হিস্টোরিটি সরাসরি আমাদের অ্যাপ্লিকেশনের ভেতরে সংরক্ষণ করা সম্ভব নয়। তবে আপনি AI Studio-র ড্যাশবোর্ড থেকে আপনার অ্যাপের সাথে থাকা সমস্ত চ্যাট ও অ্যাকティブ সেশন দেখতে পাবেন। এছাড়াও আপনি চাইলে গুরুত্বপূর্ণ তথ্যগুলো নোটপ্যাডে কপি করে রাখতে পারেন।
        </p>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-red-100 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">আপনি কি নিশ্চিতভাবে ডাটা মুছে ফেলতে চান?</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-semibold mb-6">
              আপনার সিলেক্ট করা ডাটা ক্যাটাগরি ফায়ারবেস ক্লাউড ডেটাবেস থেকে চিরতরে মুছে ফেলা হবে! এই কাজ আর কোনোভাবেই ফিরিয়ে আনা (Undo) সম্ভব নয়।
              <br />
              <span className="text-red-650 block mt-2">রিসেট করতে নিচে "হ্যাঁ, নিশ্চিত রিসেট করুন" বাটনে ক্লিক করুন।</span>
            </p>
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setShowResetConfirm(false)} 
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border rounded-xl font-bold text-xs text-gray-700 transition"
              >
                বাতিল করুন
              </button>
              <button 
                type="button" 
                onClick={executeReset} 
                className="px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
              >
                হ্যাঁ, নিশ্চিত রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
