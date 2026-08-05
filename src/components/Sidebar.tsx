import React, { useRef, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  LogOut, 
  X, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  Truck as TruckIcon, 
  BarChart3, 
  DollarSign, 
  Settings, 
  ShieldCheck, 
  ListFilter, 
  TrendingUp, 
  BookOpen,
  ClipboardList,
  Navigation, 
  ShieldCheck as ApprovalsIcon,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  Sun,
  Moon,
  Layers,
  Building2,
  Wallet,
  Camera
} from "lucide-react";
import { cn } from "../lib/utils";
import { RolePermissions } from "../lib/permissions";
import { useLanguage } from "../context/LanguageContext";

interface SidebarProps {
  active: string;
  setActive: (view: string) => void;
  user: any;
  role: string;
  roles: any[];
  onLogout: () => void;
  onClose?: () => void;
  pendingApprovalsCount?: number;
}

export default function Sidebar({ active, setActive, user, role, roles, onLogout, onClose, pendingApprovalsCount = 0 }: SidebarProps) {
  const { language, t, formatNumber } = useLanguage();
  const navRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScrollTop, setStartScrollTop] = useState(0);
  const [customLogoStr, setCustomLogoStr] = useState<string | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("app_theme");
      if (saved === "dark" || saved === "light") return saved;
      return "light";
    } catch {
      return "light";
    }
  });

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    try {
      localStorage.setItem("app_theme", theme);
    } catch (e) {}

    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("app-theme-changed", { detail: { theme } }));
  }, [theme]);

  useEffect(() => {
    const updateLogo = () => {
      try {
        const savedLogo = localStorage.getItem("app_custom_logo");
        setCustomLogoStr(savedLogo);
      } catch (err) {
        console.error("Failed to load custom logo:", err);
      }
    };

    updateLogo();
    window.addEventListener("logo-changed", updateLogo);
    return () => window.removeEventListener("logo-changed", updateLogo);
  }, []);

  const menuGroups = [
      {
        title: "প্রধান ড্যাশবোর্ড",
        items: [
          { id: "dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
          { id: "menu", label: "মেনু", icon: Layers },
        ]
      },
    {
      title: "ডিস্ট্রিবিউশন ও সেলস (SR)",
      items: [
        { id: "orders", label: "অর্ডার এন্ট্রি (SR)", icon: ShoppingCart },
        { id: "sr-order-list", label: "SR অর্ডার লিস্ট", icon: ListFilter },
        { id: "order-mgmt", label: "অর্ডার ম্যানেজমেন্ট", icon: ClipboardList },
      ]
    },
    ...(user?.email === 'samiratraders1@gmail.com' || user?.email === 'samiratraders.barguna@gmail.com' ? [{
        title: "সিস্টেম ম্যানেজমেন্ট (Super Admin)",
        items: [
          { id: "companies", label: "কোম্পানি সমূহ", icon: Building2 },
        ]
    }] : []),
    {
      title: "데일리 রুট অপারেশনস",
      items: [
        { id: "loadsheet", label: "সকাল: লোডশিট", icon: FileText },
        { id: "settle", label: "বিকাল: হিসাব নিকেশ", icon: CheckCircle2 },
        { id: "admin-approvals", label: "ম্যানেজার পেন্ডিং হিসাব", icon: ApprovalsIcon },
        { id: "dsr-portal", label: "데일리 ডোর ডেলিভারি (DSR)", icon: TruckIcon },
      ]
    },
    {
      title: "হিসাব ও টাকা-পয়সা",
      items: [
        { id: "ledger", label: "লেজার ও স্টেটমেন্ট", icon: BarChart3 },
        { id: "audit-compliance", label: "অডিট ও কমপ্লায়েন্স (Audit)", icon: ShieldCheck },
        { id: "customer-collection", label: "কাস্টমার বাকি কালেকশন", icon: Wallet },
        { id: "finance", label: "ফিন্যান্স ও পেমেন্ট", icon: DollarSign },
        { id: "subdb", label: "সাব-ডিবি ডিস্ট্রিবিউশন", icon: TruckIcon },
        { id: "expense-ledger", label: "ব্যয় খতিয়ান (Expenses)", icon: DollarSign },
        { id: "supplier-claims", label: "সাপ্লায়ার ক্লেম (Claims)", icon: ClipboardList },
      ]
    },
    {
      title: "ইনভেন্টরি ও ক্রয়",
      items: [
        { id: "inventory", label: "ইনভেন্টরি", icon: Package },
        { id: "purchase", label: "ক্রয় এন্ট্রি", icon: ShoppingCart },
        { id: "pos", label: "নতুন বিক্রয় (POS)", icon: ShoppingCart },
        { id: "sales", label: "সেলস হিস্ট্রি", icon: FileText },
        { id: "damage-mgmt", label: "ড্যামেজ ও কোম্পানি রিটার্ন", icon: AlertTriangle },
        { id: "scan-ocr", label: "ডকুমেন্ট স্ক্যান (OCR)", icon: Camera },
      ]
    },
    {
      title: "ডিরেক্টরি ও রুট প্ল্যান",
      items: [
        { id: "routes", label: "রোড সমূহ", icon: TruckIcon },
        { id: "staff", label: "স্টাফ তথ্য", icon: UserCheck },
        { id: "customer-mgmt", label: "কাস্টমার", icon: Users },
        { id: "supplier-mgmt", label: "সাপ্লায়ার", icon: Truck },
      ]
    },
    {
      title: "সistem ও রোল সেটিংস",
      items: [
        { id: "users", label: "ইউজার", icon: Users },
        { id: "roles", label: "রোল পারমিশন", icon: ShieldCheck },
        { id: "settings", label: "সেটিংস", icon: Settings },
        { id: "reports", label: "বিজনেস রিপোর্ট", icon: BarChart3 },
        { id: "activity-log", label: "অ্যাক্টিভিটি লগ (Logs)", icon: FileText },
      ]
    }
  ];

  const filterMenuItem = (item: any) => {
    if (role === 'admin') return true;
    if (item.id === "scan-ocr") return true; // Universally available to logged-in roles

    // Check default precompiled fallback permissions first
    const fallbackRules = (RolePermissions as any)[role];
    if (fallbackRules && fallbackRules.allowedViews?.includes(item.id)) {
      return true;
    }

    // Check custom permissions in DB
    const roleData = roles.find(r => r.name === role);
    if (roleData && roleData.allowedViews) {
      return roleData.allowedViews.includes(item.id);
    }
    return false;
  };

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(filterMenuItem)
  })).filter(group => group.items.length > 0);

  // Drag to Scroll Logic
  const handleScrollDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.pageY);
    if (navRef.current) {
      setStartScrollTop(navRef.current.scrollTop);
    }
  };

  useEffect(() => {
    const handleScrollDragMove = (e: MouseEvent) => {
      if (!isDragging || !navRef.current) return;
      const moveY = e.pageY - startY;
      navRef.current.scrollTop = startScrollTop + moveY * 2.5;
    };

    const handleScrollDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleScrollDragMove);
      document.addEventListener("mouseup", handleScrollDragEnd);
    }
    return () => {
      document.removeEventListener("mousemove", handleScrollDragMove);
      document.removeEventListener("mouseup", handleScrollDragEnd);
    };
  }, [isDragging, startY, startScrollTop]);

  return (
    <div className="w-68 h-screen bg-slate-950 border-r border-slate-800 flex flex-col p-5 text-slate-300 select-none shadow-2xl relative z-20">
      
      {/* Draggable Scroll Handle */}
      <div 
        onMouseDown={handleScrollDragStart}
        title="টেনে ধরে স্ক্রল করুন"
        className={cn(
          "absolute right-1 top-1/4 bottom-1/4 w-3 rounded-full cursor-ns-resize transition-all duration-150 flex items-center justify-center z-30 group hover:bg-emerald-500/10",
          isDragging ? "bg-emerald-500/20 scale-110" : "bg-transparent"
        )}
      >
        <div className="w-1.5 h-16 bg-slate-800 rounded-full group-hover:bg-emerald-400 flex items-center justify-center shadow-lg border border-slate-700/50">
          <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-white shrink-0" />
        </div>
      </div>

      {/* Brand Header */}
      <div className="flex items-center justify-between gap-3 px-2 mb-8 border-b border-slate-800/60 pb-5 shrink-0">
        <div className="flex items-center gap-3">
          {customLogoStr ? (
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center p-0.5 shadow-lg border border-slate-700 overflow-hidden transform hover:scale-105 transition-all">
              <img src={customLogoStr} alt="Brand Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-500/20 transform hover:rotate-6 transition-all duration-300">
              <Package className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
          )}
          <div>
            <h1 className="font-extrabold text-md tracking-tight text-white leading-none">{t("Samira Traders")}</h1>
            <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase mt-1.5">{t("DMS Pro Systems")}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu Container */}
      <nav 
        ref={navRef}
        className="flex-1 overflow-y-auto space-y-6 pr-1 -mr-2 scrollbar-none pb-8"
      >
        {filteredGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            <p className="px-3.5 text-[9.5px] font-black tracking-wider text-slate-500 uppercase">
              {t(group.title)}
            </p>
            <div className="space-y-1">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActive(item.id);
                    if (onClose) onClose();
                  }}
                  className={cn(
                    "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 w-full text-left relative",
                    active === item.id 
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black shadow-lg shadow-emerald-600/25 scale-[1.02] border-l-4 border-teal-300" 
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-l-4 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn(
                      "w-4 h-4 transition-transform duration-200 group-hover:scale-110 flex-shrink-0",
                      active === item.id 
                        ? "text-white" 
                        : "text-slate-400 group-hover:text-slate-100"
                    )} />
                    <span>{t(item.label)}</span>
                    {item.id === "admin-approvals" && pendingApprovalsCount > 0 && (
                      <span className={cn(
                        "ml-1.5 px-2 py-0.5 text-[10px] font-extrabold rounded-full flex items-center justify-center min-w-[20px] h-5 shadow-sm tracking-widest",
                        active === item.id ? "bg-white text-emerald-700 animate-none" : "bg-red-500 text-white animate-pulse"
                      )}>
                        {formatNumber(pendingApprovalsCount)}
                      </span>
                    )}
                  </div>
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 transition-all duration-200 flex-shrink-0",
                    active === item.id 
                      ? "text-white/90 opacity-100 scale-100 translate-x-0" 
                      : "text-slate-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100"
                  )} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile and Logout */}
      <div className="pt-4 border-t border-slate-800/80 mt-auto bg-slate-950/40 shrink-0 space-y-3">
        {/* User-Controlled Theme Toggle Button */}
        <div className="px-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all active:scale-95 duration-100 cursor-pointer"
            title={theme === "dark" ? t("লাইট মোডে ফিরুন") : t("নাইট শিফট ডার্ক মোড অন করুন")}
          >
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/10" />
                  <span>{t("ডার্ক মোড (Night Mode)")}</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-yellow-500 shrink-0 fill-yellow-500/10" />
                  <span>{t("লাইট মোড (Light Mode)")}</span>
                </>
              )}
            </div>
            <span className="text-[9px] font-black uppercase text-slate-400">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-950/20 rounded-2xl border border-slate-850">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black text-xs uppercase shadow-md flex items-center justify-center shrink-0">
            {user?.displayName?.slice(0, 2) || user?.email?.slice(0, 2) || "U"}
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="text-sm font-bold truncate text-white leading-snug">{user?.displayName || t("ব্যবহারকারী")}</p>
            <p className="text-[10px] text-slate-500 truncate font-mono tracking-tighter leading-normal">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all duration-150 text-xs font-bold whitespace-nowrap overflow-hidden"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>{t("লগআউট")}</span>
        </button>
      </div>
    </div>
  );
}
