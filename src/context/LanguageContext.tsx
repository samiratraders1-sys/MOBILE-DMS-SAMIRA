import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  formatNumber: (n: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translationDictionary: Record<string, string> = {
  // Brand Header
  "SAMIRA BMS v1.0": "SAMIRA BMS v1.0",
  "Powered by Samira Traders": "Powered by Samira Traders",
  "Samira Traders": "Samira Traders",
  "DMS Pro Systems": "DMS Pro Systems",

  // Top Bar Actions
  "শর্টকাট (Shift+?)": "Shortcuts (Shift+?)",
  "মোবাইলে ইনস্টল": "Install on Mobile",
  "অনলাইন সিঙ্ক সক্রিয়": "Online Sync Enabled",
  "অফলাইন স্টোরেজ সক্রিয়": "Offline Storage Enabled",
  "সিঙ্ক পেন্ডিং:": "Sync Pending:",
  "টি": " items",
  "সিঙ্ক পেন্ডিং গাইড": "Sync Pending Guide",
  "ইন্টারনেট পুনরায় সংযোগ পাওয়া মাত্রই ডাটাবেজের সাথে এগুলো ক্লাউডে সিঙ্ক হয়ে যাবে।": "As soon as your internet reconnects, these will automatically sync with the cloud.",
  "আপনি এখন অফলাইন মোডে আছেন!": "You are currently offline!",
  "সমীরা ট্রেডার্স অ্যাপে অফলাইন ডেটা প্রটেকশন (IndexedDB Cache) সক্রিয় করা হয়েছে। আপনার নতুন অ্যাড করা কোনো কাস্টমার, অর্ডার বা ট্রানজেকশন মুছে যাবে না। আপনি নিশ্চিন্তে কাজ চালিয়ে যেতে পারেন; ইন্টারনেট পুনরায় সংযুক্ত হওয়া মাত্রই এগুলো স্বয়ংক্রিয়ভাবে ক্লাউডের সাথে সিঙ্ক হয়ে যাবে।": "Offline Data Protection (IndexedDB Cache) is enabled in Samira Traders. Any new customers, orders, or transactions will not be lost. You can continue working safely; they will auto-sync once the internet is restored.",

  // Menu Categories
  "প্রধান ড্যাশবোর্ড": "Main Dashboard",
  "ড্যাশবোর্ড": "Dashboard",
  "ডিস্ট্রিবিউশন ও সেলস (SR)": "Distribution & Sales (SR)",
  "অর্ডার এন্ট্রি (SR)": "Order Entry (SR)",
  "SR অর্ডার লিস্ট": "SR Order List",
  "ডেইলী রুট অপারেশনস": "Daily Route Operations",
  "데일리 রুট অপারেশনস": "Daily Route Operations",
  "সকাল: লোডশিট": "Morning: Loadsheet",
  "বিকাল: হিসাব নিকেশ": "Afternoon: Settlement",
  "ম্যানেজার পেন্ডিং হিসাব": "Manager Pending Settlement",
  "ডেইলী ডোর ডেলিভারি (DSR)": "Daily Door Delivery (DSR)",
  "데일리 ডোর ডেলিভারি (DSR)": "Daily Door Delivery (DSR)",
  "হিসাব ও টাকা-পয়সা": "Accounts & Finance",
  "লেজার ও স্টেটমেন্ট": "Ledger & Statements",
  "ফিন্যান্স ও পেমেন্ট": "Finance & Payments",
  "পেমেন্ট লেনদেন খতিয়ান": "Payment Transaction Ledger",
  "দৈনিক ক্যাশ বুক": "Daily Cash Book",
  "লাভ-ক্ষতি রিপোর্ট": "Profit-Loss Report",
  "সাব-ডিবি ডিস্ট্রিবিউশন": "Sub-DB Distribution",
  "ইনভেন্টরি ও ক্রয়": "Inventory & Purchases",
  "ইনভেন্টরি": "Inventory",
  "ক্রয় এন্ট্রি": "Purchase Entry",
  "নতুন বিক্রয় (POS)": "New Sales (POS)",
  "সেলস হিস্ট্রি": "Sales History",
  "ড্যামেজ ও কোম্পানি রিটার্ন": "Damage & Company Returns",
  "অ্যাডভান্সড অপারেশনস ও এইচআর": "Advanced Operations & HR",
  "উন্নত অপারেশন ও এইচআর": "Advanced Ops & HR",
  "ডিরেক্টরি ও রুট প্ল্যান": "Directories & Route Plans",
  "রোড সমূহ": "Routes List",
  "স্টাফ তথ্য": "Staff Info",
  "কাস্টমার": "Customers",
  "সাপ্লায়ার": "Suppliers",
  "সistem ও রোল সেটিংস": "System & Role Settings",
  "সিস্টেম ও রোল সেটিংস": "System & Role Settings",
  "ইউজার": "Users",
  "রোল পারমিশন": "Role Permissions",
  "সেটিংস": "Settings",
  "বিজনেস রিপোর্ট": "Business Reports",
  "প্রস্থান": "Logout",
  "লগআউট": "Logout",

  // Common UI Actions and labels
  "খুঁজুন": "Search",
  "ফিল্টার": "Filter",
  "যুক্ত করুন": "Add New",
  "যোগ করুন": "Add",
  "সংরক্ষণ": "Save",
  "বন্ধ": "Close",
  "বাতিল": "Cancel",
  "মুছুন": "Delete",
  "সব মুছুন": "Clear All",
  "প্রিন্ট": "Print",
  "হিসাব": "Accounts",
  "বকেয়া": "Outstanding",
  "বকেয়া পরিমাণ": "Outstanding Amount",
  "টাকা": "BDT",
  "তারিখ": "Date",
  "স্ট্যাটাস": "Status",
  "অ্যাকশন": "Action",
  "নম্বর": "Number",
  "নাম": "Name",
  "মোবাইল": "Mobile",
  "ঠিকানা": "Address",
  "পেন্ডিং": "Pending",
  "অনুমোদিত": "Approved",
  "অনুমতি নেই (Access Denied)": "Access Denied",
  "এই ফিচারটি ব্যবহার করার জন্য আপনার পর্যাপ্ত অনুমতি নেই।": "You do not have the required permissions to use this feature.",
  "অর্ডার সফলভাবে জমা হয়েছে": "Order placed successfully!",

  // Dashboard Stats Labels
  "আজকের বেচাকেনা": "Today's Sales",
  "আজকের কালেকশন": "Today's Collections",
  "চলতি মাসের খরচ": "Monthly Expenses",
  "ইনভেন্টরি প্রডাক্ট": "Inventory Products",
  "মোট ক্যাশ ইন": "Total Cash In",
  "মোট বকেয়া": "Total Outstanding",
  "মোট কাস্টমার": "Total Customers",
  "মোট রোড": "Total Routes",
  "মোট স্টক": "Total Stock",
  "আজকের অর্ডার": "Today's Orders",
  "নতুন অর্ডার": "New Order",
  "অর্ডার লিস্ট": "Orders List",
  "মোট আইটেম": "Total Items",
  "মোট কার্টুন": "Total Cartons",
  "মোট দাম": "Total Price",
  "অর্ডার কনফার্ম করুন": "Confirm Order",
  "কাস্টমার সিলেক্ট করুন": "Select Customer",
  "রোড সিলেক্ট করুন": "Select Route",
  "পণ্য খুঁজুন": "Search Product",
  "পণ্য সিলেক্ট করুন": "Select Product",

  // SFA Intelligent Assistant
  "SFA ইন্টেলিজেন্ট এসিস্ট্যান্ট (SalesDiary®)": "SFA Intelligent Assistant (SalesDiary®)",
  "🎯 স্কিম ও অফার": "🎯 Schemes & Offers",
  "⚡ সাজেস্টেড অর্ডার": "⚡ Suggested Order",
  "📍 জিও-লকিং ও ক্রেডিট": "📍 Geo-Locking & Credit",
  "ক্যাম্পেইন ডিসকাউন্ট (QPS)": "Campaign Discount (QPS)",
  "সক্রিয়": "Active",
  "মোট অর্ডার ১,০০০ ৳ এর বেশি হলে স্পেশাল নগদ ডিসকাউন্ট স্কিম": "Special cash discount scheme for orders above 1,000 BDT",
  "৩% নগদ ডিসকাউন্ট প্রয়োগ করুন": "Apply 3% Cash Discount",
  "ফ্রি জুস বা স্কিম আইটেম (VPS)": "Free Juice or Scheme Item (VPS)",
  "গিফট স্যাম্পল অ্যাড করুন (৳০)": "Add Gift Sample (BDT 0)",
  "কাস্টমারের বিগত ক্রয়ের প্যাটার্ন ও রানিং ট্রেন্ড অনুযায়ী নিম্নোক্ত পণ্যগুলোর সুপারিশ সাজেস্ট করেছে:": "Based on customer purchase history and running trends, the following products are recommended:",
  "চাহিদা সম্ভাব্যতা:": "Probability of Demand:",
  "ওয়ান-ক্লিক সাজেস্টেড অ্যাড": "One-Click Suggested Add",
  "রুট ও জিও-ফেন্সিং (Beat Locking)": "Route & Geo-Fencing (Beat Locking)",
  "সঠিক": "Correct / Valid",
  "SR বর্তমান অবস্থান আউটলেট থেকে": "SR current position from outlet is",
  "মিটার": "meters",
  "দূরত্বে। নোটিফিকেশন ভ্যালিড।": "away. Verification valid.",
  "ক্রেডিট সীমা ও বকেয়া স্ট্যাটাস": "Credit Limit & Outstanding Status",
  "চলতি বকেয়া:": "Current Due:",
  "সীমা অতিক্রম করেনি। বাকী বিক্রয় সাময়িকভাবে অনুমোদিত করা যাবে।": "Limit not exceeded. Credit sales temporarily allowed.",
  "কার্টুন সিলেক্ট করুন": "Select Carton",
  "স্টক শেষ (Stock Out)": "Stock Out",
  "পিস সংখ্যা:": "Piece Count",
  "সাব-টোটাল মূল্য:": "Sub-total Value:",
  "ক্যাম্পেইন ডিসকাউন্ট (৳):": "Campaign Discount (BDT):",
  "মোট অফার ছাড়:": "Total Scheme Discount:",
  "গ্র্যান্ড টোটাল:": "Grand Total:",
  "সবাইকে স্বাগতম": "Welcome Everyone",
  "ইউজার প্রোফাইল": "User Profile",
  
  // Dashboard charts & analytics
  "দৈনিক বিক্রয় ট্রেন্ড (Daily Trend)": "Daily Sales Trend (Daily Trend)",
  "সাপ্তাহিক বিক্রয় ট্রেন্ড (Weekly Trend)": "Weekly Sales Trend (Weekly Trend)",
  "ইনভেন্টরি স্টক লেভেল অ্যানালিটিক্স (Inventory Stock Levels)": "Inventory Stock Level Analytics",
  "শীর্ষ বিক্রিত পণ্য (Top-Performing Products)": "Top-Performing Products",
  "মোট বিক্রয় রেভিনিউ অনুযায়ী সেরা ৭টি পণ্য": "Top 7 products by total sales revenue",
  "মোট রেভিনিউ": "Total Revenue",
  "বিক্রয়": "Sales",
  "৭ দিন": "7 Days",
  "৩০ দিন": "30 Days",
  "সব পণ্য (শীর্ষ ১৫)": "All Items (Top 15)",
  "কম স্টক পণ্য (Low Stock)": "Low Stock Items",
  "স্টক শেষ (Out of Stock)": "Out of Stock",
  "এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি": "No products match this filter",
  "সব পণ্য দেখতে \"সব পণ্য\" বোতামে ক্লিক করুন।": "Click 'All Items' to reset custom filters.",
  "কোনো বিক্রয় ডাটা পাওয়া যায়নি": "No sales data found",
  "পণ্যভিত্তিক বর্তমান স্টক ও নিরাপদ সীমা তুলনা": "Comparing current item stocks with safety triggers",
};

// Simple English to Bengali mapping to support bidirectional lookups where needed
const englishToBengaliMap: Record<string, string> = {
  "Main Dashboard": "প্রধান ড্যাশবোর্ড",
  "Dashboard": "ড্যাশবোর্ড",
  "Distribution & Sales (SR)": "ডিস্ট্রিবিউশন ও সেলস (SR)",
  "Order Entry (SR)": "অর্ডার এন্ট্রি (SR)",
  "SR Order List": "SR অর্ডার লিস্ট",
  "Daily Route Operations": "ডেইলী রুট অপারেশনস",
  "Morning: Loadsheet": "সকাল: লোডশিট",
  "Afternoon: Settlement": "বিকাল: হিসাব নিকেশ",
  "Manager Pending Settlement": "ম্যানেজার পেন্ডিং হিসাব",
  "Daily Door Delivery (DSR)": "ডেইলী ডোর ডেলিভারি (DSR)",
  "Accounts & Finance": "হিসাব ও টাকা-পয়সা",
  "Ledger & Statements": "লেজার ও স্টেটমেন্ট",
  "Finance & Payments": "ফিন্যান্স ও পেমেন্ট",
  "Payment Transaction Ledger": "পেমেন্ট লেনদেন খতিয়ান",
  "Daily Cash Book": "দৈনিক ক্যাশ বুক",
  "Profit-Loss Report": "লাভ-ক্ষতি রিপোর্ট",
  "Sub-DB Distribution": "সাব-ডিবি ডিস্ট্রিবিউশন",
  "Inventory & Purchases": "ইনভেন্টরি ও ক্রয়",
  "Inventory": "ইনভেন্টরি",
  "Purchase Entry": "ক্রয় এন্ট্রি",
  "New Sales (POS)": "নতুন বিক্রয় (POS)",
  "Sales History": "সেলস হিস্ট্রি",
  "Damage & Company Returns": "ড্যামেজ ও কোম্পানি রিটার্ন",
  "Advanced Operations & HR": "অ্যাডভান্সড অপারেশনস ও এইচআর",
  "Advanced Ops & HR": "উন্নত অপারেশন ও এইচআর",
  "Directories & Route Plans": "ডিরেক্টরি ও রুট প্ল্যান",
  "Routes List": "রোড সমূহ",
  "Staff Info": "স্টাফ তথ্য",
  "Customers": "কাস্টমার",
  "Suppliers": "সাপ্লায়ার",
  "System & Role Settings": "সিস্টেম ও রোল সেটিংস",
  "Users": "ইউজার",
  "Role Permissions": "রোল পারমিশন",
  "Settings": "সেটিংস",
  "Business Reports": "বিজনেস রিপোর্ট",
  "Logout": "লগআউট",
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("app_language");
      if (saved === "en" || saved === "bn") return saved;
    } catch (e) {}
    return "bn"; // Default to BN as current app uses BN primarily
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("app_language", lang);
    } catch (e) {}
  };

  const t = (text: string): string => {
    if (!text) return "";
    const cleanText = text.trim();

    if (language === "bn") {
      // If language is Bengali, check if we passed an English string and want Bengali
      if (englishToBengaliMap[cleanText]) {
        return englishToBengaliMap[cleanText];
      }
      return text;
    }

    // Language is English - lookup in translation table
    if (translationDictionary[cleanText]) {
      return translationDictionary[cleanText];
    }

    // Try finding nested substrings or simple partial translates
    for (const key of Object.keys(translationDictionary)) {
      if (cleanText === key) {
        return translationDictionary[key];
      }
    }

    return text;
  };

  const formatNumber = (n: number | string): string => {
    if (language === "en") {
      return String(n);
    }
    const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(n).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
