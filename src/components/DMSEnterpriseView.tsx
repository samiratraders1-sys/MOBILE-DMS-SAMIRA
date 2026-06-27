import React, { useState, useEffect } from "react";
import { 
  Users, Phone, Mail, FileText, Layers, Wrench, ShieldCheck, Activity, 
  ShieldAlert, CheckCircle2, TrendingUp, Calendar, Trash2, Plus, 
  BarChart3, Search, Building, CreditCard, RefreshCw, Send, 
  Settings2, User, Compass, Bell, DollarSign, Check, AlertCircle, Sparkles, Clock, Globe,
  Smartphone, QrCode, MapPin, Lock, Share2, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

interface DMSEnterpriseViewProps {
  products: any[];
  customers: any[];
  suppliers: any[];
  role: string;
  user: any;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  vehicleModel: string;
  value: number;
  status: "new" | "contacted" | "negotiating" | "converted" | "lost";
  notes: string;
  date: string;
}

interface Appointment {
  id: string;
  customerName: string;
  phone: string;
  type: "Service" | "Delivery" | "Dealer Meet" | "Sales Call";
  dateTime: string;
  location: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

interface VehicleJob {
  id: string;
  customerName: string;
  plateNo: string;
  model: string;
  mileage: number;
  serviceType: "Free Service" | "Paid Engine Repair" | "Periodical Wash & Lube" | "Suspension Fix";
  assignedMechanic: string;
  warrantyCovered: boolean;
  status: "Received" | "Under Work" | "Quality Testing" | "Ready for Delivery";
  date: string;
}

interface ComplianceDoc {
  id: string;
  title: string;
  docCode: string;
  authority: string;
  expiryDate: string;
  status: "Active (Compliant)" | "Expiring Soon" | "Expired" | "Audited & Verified";
}

// --- PERSISTENCE HELPERS ---
const loadStored = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveStored = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage sync error:", e);
  }
};

export default function DMSEnterpriseView({ products = [], customers = [], suppliers = [], role, user }: DMSEnterpriseViewProps) {
  const { language, t, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState<"crm" | "service" | "oem_compliance" | "user_mgmt" | "mobile_access" | "payments" | "custom_dashboard">("crm");

  // --- USER MANAGEMENT REVOLUTION ---
  const [enterpriseUsers, setEnterpriseUsers] = useState(() => loadStored("dms_ent_users", [
    { id: "u-1", name: "সাদমান সাকিব (Sadman)", email: "samiratraders1@gmail.com", role: "admin", status: "Active", outlet: "Dhaka Outlet HQ", lastLogin: "2026-06-11 07:22 AM", sessionToken: "AUTH-OK-99a32" },
    { id: "u-2", name: "ফারহান আহমেদ (Farhan)", email: "farhan@samira.dms", role: "manager", status: "Active", outlet: "Sylhet Warehouse", lastLogin: "2026-06-11 06:14 AM", sessionToken: "AUTH-OK-31b40" },
    { id: "u-3", name: "জিকিরুল হাসান (Jikirul)", email: "sr_jikirul@samira.dms", role: "sr", status: "Active", outlet: "Dhaka Outer Zone", lastLogin: "2026-06-11 05:48 AM", sessionToken: "AUTH-OK-88c12" },
    { id: "u-4", name: "মোস্তফা জামান (Mostafa)", email: "dsr_mostafa@samira.dms", role: "dsr", status: "Inactive", outlet: "Chittagong Outlet", lastLogin: "2026-06-05 10:20 AM", sessionToken: "N/A" }
  ]));

  const [enterpriseLogs, setEnterpriseLogs] = useState<{ id: string; time: string; msg: string; user: string }[]>(() => loadStored("dms_ent_logs", [
    { id: "log-1", time: "2026-06-11 07:22 AM", msg: "সিস্টেম এডমিন প্যানেল এক্সেস করা হয়েছে", user: "samiratraders1@gmail.com" },
    { id: "log-2", time: "2026-06-11 07:12 AM", msg: "নতুন DSR মোস্তফা জামানকে সিস্টেমে এসাইন করা হয়েছে", user: "samiratraders1@gmail.com" }
  ]));

  useEffect(() => { saveStored("dms_ent_users", enterpriseUsers); }, [enterpriseUsers]);
  useEffect(() => { saveStored("dms_ent_logs", enterpriseLogs); }, [enterpriseLogs]);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("sr");
  const [newUserOutlet, setNewUserOutlet] = useState("Dhaka Outlet HQ");

  const handleAddEnterpriseUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const nU = {
      id: "u-" + Date.now(),
      name: newUserName,
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      status: "Active",
      outlet: newUserOutlet,
      lastLogin: "Never logged in",
      sessionToken: "AUTH-OK-" + Math.floor(10000 + Math.random() * 90000)
    };
    setEnterpriseUsers(prev => [nU, ...prev]);
    setEnterpriseLogs(prev => [
      { id: "log-" + Date.now(), time: new Date().toLocaleString(), msg: `নতুন ব্যবহারকারী ${newUserName} যুক্ত করা হয়েছে (${newUserRole})`, user: user?.email || "Admin" },
      ...prev
    ]);
    setNewUserName("");
    setNewUserEmail("");
    toast.success(language === "bn" ? "ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে!" : "User created successfully!");
  };

  const toggleUserStatus = (id: string, name: string) => {
    setEnterpriseUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === "Active" ? "Inactive" : "Active";
        setEnterpriseLogs(l => [
          { id: "log-" + Date.now(), time: new Date().toLocaleString(), msg: `${name} এর এক্সেস স্ট্যাটাস পরিবর্তন করা হয়েছে (${nextStatus})`, user: user?.email || "Admin" },
          ...l
        ]);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
    toast.success(language === "bn" ? "স্ট্যাটাস পরিবর্তন করা হয়েছে!" : "Status updated successfully!");
  };

  const revokeUserToken = (id: string, name: string) => {
    setEnterpriseUsers(prev => prev.map(u => {
      if (u.id === id) {
        setEnterpriseLogs(l => [
          { id: "log-" + Date.now(), time: new Date().toLocaleString(), msg: `${name} এর একটিভ অটো-লগইন ডিভাইস টোকেন বাতিল করা হয়েছে!`, user: user?.email || "Admin" },
          ...l
        ]);
        return { ...u, sessionToken: "N/A", status: "Inactive" };
      }
      return u;
    }));
    toast.error(language === "bn" ? "এক্সিস টোকেন রিবোকড এবং ডিভাইস লক সম্পন্ন!" : "Access token revoked and device locked!");
  };

  // --- MOBILE DEVICE REGISTER & LOCATION GPS SIMULATION ---
  const [mobileDevices, setMobileDevices] = useState(() => loadStored("dms_mobile_devices", [
    { id: "dev-1", srName: "জিকিরুল হাসান (SR)", deviceModel: "Samsung Galaxy S22 Ultra", os: "Android 14", appVersion: "v2.4.1", locationSync: "Dhaka (Latitude: 23.8103, Longitude: 90.4125)", lastPing: "2 mins ago", status: "Authorized", battery: 84 },
    { id: "dev-2", srName: "সাকিব আহমেদ (SR)", deviceModel: "Xiaomi Redmi Note 12", os: "Android 13", appVersion: "v2.4.1", locationSync: "Gazipur Board Bazar (Latitude: 23.9685, Longitude: 90.3955)", lastPing: "12 mins ago", status: "Authorized", battery: 67 },
    { id: "dev-3", srName: "আরিফ কবির (DSR)", deviceModel: "iPhone 13 Pro", os: "iOS 17.2", appVersion: "v2.3.9", locationSync: "Narayanganj Outskirts (Latitude: 23.6238, Longitude: 90.5000)", lastPing: "1 hour ago", status: "Authorized", battery: 52 },
    { id: "dev-4", srName: "সোহেল রানা (SR)", deviceModel: "Realme C11", os: "Android 12", appVersion: "v2.4.1", locationSync: "Unknown Area - Coordinates Invalid", lastPing: "2 days ago", status: "Access Suspended", battery: 41 }
  ]));

  useEffect(() => { saveStored("dms_mobile_devices", mobileDevices); }, [mobileDevices]);

  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [livePings, setLivePings] = useState<{ id: string; time: string; sr: string; activity: string; battery: number }[]>(() => [
    { id: "ping-1", time: "07:25 AM", sr: "জিকিরুল হাসান", activity: "Uttara Sector 4 - Checked-in Customer #102", battery: 84 },
    { id: "ping-2", time: "07:20 AM", sr: "আরিফ কবির", activity: "Siddhirganj Store - Logged Cash Payment Collection 12,000 ৳", battery: 51 }
  ]);

  const [trackingSlider, setTrackingSlider] = useState(10); // Minutes sync
  const [isTrackingSimulationActive, setIsTrackingSimulationActive] = useState(true);

  // Send native field warning message
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage) return;
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastMessage("");
      toast.success(language === "bn" ? "মাঠ পর্যায়ের সকল হ্যান্ডসেট-এ পুশ নোটিফিকেশন সাকসেসফুলি পৌছেছে!" : "Push Notification broadcast sent successfully to all cellphones!");
      setLivePings(prev => [
        { id: "p-" + Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sr: "System Broadcast", activity: `Sent Push Alert: "${broadcastMessage}"`, battery: 100 },
        ...prev
      ]);
    }, 1500);
  };

  const toggleDeviceAccess = (id: string, name: string) => {
    setMobileDevices(prev => prev.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === "Authorized" ? "Access Suspended" : "Authorized";
        return { ...d, status: nextStatus };
      }
      return d;
    }));
    toast.success(language === "bn" ? "ডিভাইস অ্যাক্সেস টগল সম্পন্ন!" : "Device security state toggled!");
  };

  // Run dynamic location sync check simulation
  const triggerGPSSyncCheck = () => {
    toast.loading(language === "bn" ? "পকেট জিপিএস ও ম্যাপ কানেকশন চেক করা হচ্ছে..." : "Pinging field handsets satellite sensors...", { id: "gps-ping" });
    setTimeout(() => {
      setLivePings(prev => [
        { id: "p-" + Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sr: "জিকিরুল হাসান", activity: "বসুন্ধরা আবাসিক এলাকা সংলগ্ন ও ডিলার ভিজিট (Location Verified)", battery: 82 },
        { id: "p-" + Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sr: "আরিফ কবির", activity: "চিটাগাং রোড বাস স্ট্যান্ড (Delivery Van Track Active)", battery: 49 },
        ...prev
      ]);
      toast.success(language === "bn" ? "মাঠ কর্মকর্তা দের ৩টি ডিভাইস সফলভাবে ম্যাপ কো-অর্ডিনেট পাঠিয়েছে!" : "3 Remote Device Handsets successfully uploaded physical latitude-longitude!", { id: "gps-ping" });
    }, 1200);
  };

  // --- SECURE PAYMENT PROCESSING MODULE ---
  const [paymentConfigs, setPaymentConfigs] = useState(() => loadStored("dms_payment_configs", {
    bkash: true,
    nagad: true,
    sslcommerz: true,
    setleInstant: false,
    creditCard: true
  }));

  const [paymentLinks, setPaymentLinks] = useState(() => loadStored("dms_payment_links", [
    { id: "inv-l-1", linkId: "TXN-8812A", customerName: "মেসার্স জামান মটরস", phone: "01934567890", amount: 125000, gateway: "bKash B2B API", status: "Pending", linkUrl: "https://pay.samira.dms/link/TXN-8812A", date: "2026-06-11" },
    { id: "inv-l-2", linkId: "TXN-7651X", customerName: "সাকিব হাসান", phone: "01823456789", amount: 45000, gateway: "SSLCommerz Secured", status: "Paid Secured", linkUrl: "https://pay.samira.dms/link/TXN-7651X", date: "2026-06-10" }
  ]));

  useEffect(() => { saveStored("dms_payment_configs", paymentConfigs); }, [paymentConfigs]);
  useEffect(() => { saveStored("dms_payment_links", paymentLinks); }, [paymentLinks]);

  // Payment creation states
  const [selectedCustomerIdForPayment, setSelectedCustomerIdForPayment] = useState("");
  const [customInvoiceAmount, setCustomInvoiceAmount] = useState(0);
  const [selectedGatewayForLink, setSelectedGatewayForLink] = useState("bKash Merchant Pay");
  const [paymentLinkCreated, setPaymentLinkCreated] = useState<string | null>(null);

  // Generate Payment Link
  const handleGeneratePaymentLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerIdForPayment || customInvoiceAmount <= 0) {
      toast.error(language === "bn" ? "অনুগ্রহ করে গ্রাহক এবং সঠিক এমাউন্ট প্রদান করুন।" : "Please specify a customer and a valid invoice amount.");
      return;
    }
    const customer = customers.find(c => c.id === selectedCustomerIdForPayment);
    if (!customer) return;

    const code = "TXN-" + Math.floor(10000 + Math.random() * 90000) + "S";
    const newL = {
      id: "inv-l-" + Date.now(),
      linkId: code,
      customerName: customer.name,
      phone: customer.phone || "01700000000",
      amount: customInvoiceAmount,
      gateway: selectedGatewayForLink,
      status: "Pending",
      linkUrl: `https://pay.samira.dms/link/${code}`,
      date: new Date().toISOString().split("T")[0]
    };

    setPaymentLinks(prev => [newL, ...prev]);
    setPaymentLinkCreated(newL.linkUrl);
    toast.success(language === "bn" ? "নিরাপদ ওয়ান-টাইম পেমেন্ট লিংক তৈরি হয়েছে!" : "Secure single-use payment link generated!");
  };

  const toggleGatewayState = (gatewayKey: string) => {
    setPaymentConfigs(prev => {
      const next = { ...prev, [gatewayKey]: !prev[gatewayKey] };
      return next;
    });
    toast.success(language === "bn" ? "গেটওয়ে সংযোগের অবস্থা পরিবর্তন হয়েছে!" : "Gateway connection toggled!");
  };

  // Sandbox simulation checkout overlay states
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxActiveLink, setSandboxActiveLink] = useState<any | null>(null);
  const [sandboxMobileNumber, setSandboxMobileNumber] = useState("");
  const [sandboxStep, setSandboxStep] = useState(1); // 1 = Enter Mobile, 2 = Enter OTP, 3 = Enter PIN, 4 = Success
  const [sandboxOtp, setSandboxOtp] = useState("");
  const [sandboxPin, setSandboxPin] = useState("");
  const [sandboxProcessing, setSandboxProcessing] = useState(false);

  // Start Sandbox Checkout
  const launchSandboxCheckout = (link: any) => {
    setSandboxActiveLink(link);
    setSandboxStep(1);
    setSandboxMobileNumber(link.phone || "01723456789");
    setSandboxOtp("");
    setSandboxPin("");
    setSandboxProcessing(false);
    setShowSandboxModal(true);
  };

  const handleSandboxSubmitMobile = (e: React.FormEvent) => {
    e.preventDefault();
    if (sandboxMobileNumber.length < 11) {
      toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।");
      return;
    }
    setSandboxProcessing(true);
    setTimeout(() => {
      setSandboxProcessing(false);
      setSandboxStep(2);
      // Generate instant custom mock SMS notify
      toast.success(language === "bn" ? "আপনার মোবাইলে OTP পাঠানো হয়েছে: 489210" : "Your Security OTP code is generated: 489210", {
        duration: 8000,
        icon: "✉️"
      });
    }, 1200);
  };

  const handleSandboxSubmitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (sandboxOtp !== "489210") {
      toast.error(language === "bn" ? "ভুল OTP প্রদান করেছেন! পুনরায় চেষ্টা করুন (সটীক ওটিপি: 489210)" : "Invalid OTP! Try using: 489210");
      return;
    }
    setSandboxStep(3);
  };

  const handleSandboxSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (sandboxPin.length < 4) {
      toast.error("সঠিক পিন কোড দিন (নুন্যতম ৪ সংখ্যা)");
      return;
    }
    setSandboxProcessing(true);
    setTimeout(() => {
      setSandboxProcessing(false);
      setSandboxStep(4);
      // Mark the link as paid secured!
      setPaymentLinks(prev => prev.map(pl => {
        if (pl.id === sandboxActiveLink.id) {
          // Play success chime
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
            osc.frequency.setValueAtTime(880, context.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.3, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
            osc.start();
            osc.stop(context.currentTime + 0.3);
          } catch (audioErr) {
            console.log("Audio not supported");
          }
          return { ...pl, status: "Paid Secured" };
        }
        return pl;
      }));

      // Post to cash ledger automatically
      toast.success(language === "bn" ? `পেমেন্ট সম্পন্ন! ${formatNumber(sandboxActiveLink.amount)} ৳ সফলভাবে ক্যাশ বহিতে যুক্ত করা হয়েছে।` : `Security Verification Success! ${formatNumber(sandboxActiveLink.amount)} ৳ posted to main Daily Cash Book!`);
    }, 2000);
  };



  // --- TAB 1: CRM & LEADS MODULE ---
  const [leads, setLeads] = useState<Lead[]>(() => loadStored("dms_leads", [
    { id: "lead-1", name: "আব্দুল করিম", phone: "01712345678", vehicleModel: "Runner AD80S Deluxe", value: 89000, status: "new", notes: "শো-রুমে এসে গাড়ি দেখে পছন্দ করেছেন। টেস্ট ড্রাইভ দিতে চান।", date: "2026-06-10" },
    { id: "lead-2", name: "সাকিব হাসান", phone: "01823456789", vehicleModel: "TVS Metro Plus 110", value: 125000, status: "contacted", notes: "ফোনে কিস্তির নিয়ম সম্পর্কে জানতে চেয়েছিলেন।", date: "2026-06-09" },
    { id: "lead-3", name: "মেসার্স জামান মটরস", phone: "01934567890", vehicleModel: "Honda CG125 (OEM Engine Assembly)", value: 345000, status: "negotiating", notes: "ডিলারশিপ রেটে ৩ পিস ইঞ্জিনের কোটেশন চেয়েছেন।", date: "2026-06-08" },
    { id: "lead-4", name: "রফিকুল ইসলাম", phone: "01545678901", vehicleModel: "Runner Turbo 125", value: 142000, status: "converted", notes: "পূর্ণাঙ্গ পেমেন্ট ক্যাশ বুঝিয়ে দিয়ে গাড়ি আজ ডেলিভারি নিয়েছেন।", date: "2026-06-07" },
  ]));

  useEffect(() => { saveStored("dms_leads", leads); }, [leads]);

  // Lead modal input states
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadModel, setLeadModel] = useState("");
  const [leadVal, setLeadVal] = useState(0);
  const [leadNote, setLeadNote] = useState("");

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone) {
      toast.error(language === "bn" ? "অনুগ্রহ করে নাম এবং মোবাইল নম্বর প্রদান করুন।" : "Please provide name and phone number.");
      return;
    }
    const newL: Lead = {
      id: "lead-" + Date.now(),
      name: leadName,
      phone: leadPhone,
      vehicleModel: leadModel || (language === "bn" ? "অনির্ধারিত মডেল" : "Unspecified Model"),
      value: Number(leadVal) || 0,
      status: "new",
      notes: leadNote,
      date: new Date().toISOString().split("T")[0]
    };
    setLeads(prev => [newL, ...prev]);
    setShowLeadModal(false);
    setLeadName("");
    setLeadPhone("");
    setLeadModel("");
    setLeadVal(0);
    setLeadNote("");
    toast.success(language === "bn" ? "নতুন লিড সফলভাবে সংযুক্ত হয়েছে!" : "New CRM lead added successfully!");
  };

  const handleUpdateLeadStatus = (leadId: string, nextStatus: Lead["status"]) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus } : l));
    toast.success(language === "bn" ? "লিড স্ট্যাটাস হালনাগাদ করা হয়েছে!" : "Lead status updated!");
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    toast.success(language === "bn" ? "লিডটি মুছে ফেলা হয়েছে।" : "Lead deleted successfully.");
  };

  // --- CRM Appointment Scheduler ---
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadStored("dms_appointments", [
    { id: "app-1", customerName: "মিজানুর রহমান", phone: "01711223344", type: "Service", dateTime: "2026-06-12 10:30 AM", location: "প্রধান সার্ভিস সেন্টার", status: "Scheduled" },
    { id: "app-2", customerName: "মেসার্স ভাই ভাই মটরস", phone: "01855667788", type: "Dealer Meet", dateTime: "2026-06-12 03:00 PM", location: "প্রধান অফিস (৩য় তলা)", status: "Scheduled" },
    { id: "app-3", customerName: "আরিফ বিল্লাহ", phone: "01699001122", type: "Delivery", dateTime: "2026-06-11 04:30 PM", location: "শোরুম স্টক-ইয়ার্ড", status: "Completed" },
  ]));

  useEffect(() => { saveStored("dms_appointments", appointments); }, [appointments]);

  const [showAppModal, setShowAppModal] = useState(false);
  const [appName, setAppName] = useState("");
  const [appPhone, setAppPhone] = useState("");
  const [appType, setAppType] = useState<Appointment["type"]>("Service");
  const [appTime, setAppTime] = useState("");
  const [appLoc, setAppLoc] = useState("");

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName || !appTime) {
      toast.error(language === "bn" ? "অনুগ্রহ করে গ্রাহকের নাম ও সময় সিলেক্ট করুন।" : "Please specify customer name and time.");
      return;
    }
    const newApp: Appointment = {
      id: "app-" + Date.now(),
      customerName: appName,
      phone: appPhone,
      type: appType,
      dateTime: appTime,
      location: appLoc || (language === "bn" ? "মেইন শো-রুম" : "Main Showroom"),
      status: "Scheduled"
    };
    setAppointments(prev => [newApp, ...prev]);
    setShowAppModal(false);
    setAppName("");
    setAppPhone("");
    setAppTime("");
    setAppLoc("");
    toast.success(language === "bn" ? "নতুন অ্যাপয়েন্টমেন্ট শিডিউল তৈরি হয়েছে!" : "Appointment scheduled successfully!");
  };

  const handleUpdateAppStatus = (id: string, s: Appointment["status"]) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: s } : a));
    toast.success(language === "bn" ? "অ্যাপয়েন্টমেন্ট আপডেট করা হয়েছে।" : "Appointment status updated.");
  };

  // --- CRM MARKETING CAMPAIGNS SIMULATOR ---
  const [smsLogs, setSmsLogs] = useState<{ id: string; campaign: string; text: string; count: number; date: string; success: boolean }[]>(() => loadStored("sms_campaigns_logs", [
    { id: "sms-1", campaign: "নিত্যনতুন স্টক অফার বা ঈদ কালেকশন বোনাঞ্জা", text: "সম্মানিত গ্রাহক, সমীরা ট্রেডার্সে রানার ও টিভিএস মটরসের জেনুইন খুচরা যন্ত্রাংশে পাচ্ছেন ১০% নগদ ছাড়! আজই আমাদের শো-রুমে চলে আসুন!", count: 48, date: "2026-06-05", success: true },
    { id: "sms-2", campaign: "বকেয়া তাগাদা সতর্কবার্তা (Overdue Credit Reminders)", text: "প্রিয় গ্রাহক, আপনার সমীরা ট্রেডার্সের নিকট বকেয়া কিস্তির মেয়াদ নিকটবর্তী। অনুগ্রহ পূর্বক পরিশোধ নিশ্চিত করুন। ধন্যবাদ।", count: 12, date: "2026-06-01", success: true }
  ]));
  const [campaignName, setCampaignName] = useState("");
  const [campaignSegment, setCampaignSegment] = useState("all");
  const [campaignText, setCampaignText] = useState("");
  const [sendingCampaign, setSendingCampaign] = useState(false);

  useEffect(() => { saveStored("sms_campaigns_logs", smsLogs); }, [smsLogs]);

  const runCampaign = () => {
    if (!campaignName || !campaignText) {
      toast.error(language === "bn" ? "প্রচারণার নাম ও মেসেজ বডি লিখুন।" : "Please write campaign title and message body.");
      return;
    }
    setSendingCampaign(true);
    setTimeout(() => {
      let audienceCount = 45;
      if (campaignSegment === "due") audienceCount = customers.filter(c => (c.balance || 0) > 0).length || 8;
      if (campaignSegment === "suppliers") audienceCount = suppliers.length || 5;

      const newLog = {
        id: "sms-" + Date.now(),
        campaign: campaignName,
        text: campaignText,
        count: audienceCount,
        date: new Date().toISOString().split("T")[0],
        success: true
      };
      setSmsLogs(prev => [newLog, ...prev]);
      setCampaignName("");
      setCampaignText("");
      setSendingCampaign(false);
      toast.success(language === "bn" ? `সফল প্রচারণা! ${audienceCount} টি এসএমএস তাৎক্ষণিকভাবে প্রেরণ করা হয়েছে।` : `Campaign success! Sent ${audienceCount} SMS updates!`);
    }, 2000);
  };

  const loadTemplate = (tempType: string) => {
    if (tempType === "discount") {
      setCampaignName(language === "bn" ? "ঈদ স্পেশাল খুচরা পার্টস ছাড় ক্যাম্পেইন" : "Eid Special Parts Offer");
      setCampaignText(language === "bn" ? "ঈদ উপলক্ষে সমীরা ট্রেডার্সে সকল আকর্ষণীয় জেনুইন পার্টসে ১৫% ইনস্ট্যান্ট নগদ রিবেট! স্টক সীমিত।" : "On Eid, get 15% instant cash discount on all catalog parts at Samira Traders! Limited stock.");
    } else if (tempType === "remainder") {
      setCampaignName(language === "bn" ? "মাসিক বকেয়া কিস্তি পরিশোধ রিমাইন্ডার" : "Monthly Outstanding Installment Warning");
      setCampaignText(language === "bn" ? "বকেয়া লেজার বিজ্ঞপ্তি: প্রিয় আউটলেট রিটেইলার, আপনার চলতি লেজার বকেয়া দ্রুততম সময়ের মধ্যে পরিশোধ করে ড্রাফট চালান সচল রাখুন।" : "Outstanding alert: Dear Retailer, please settle your current pending balance to keep your dealership shipments smooth.");
    } else if (tempType === "servicing") {
      setCampaignName(language === "bn" ? "ফ্রি বাইক সার্ভিস ক্যাম্পেইন জেনুইন অয়েল চেঞ্জ" : "Free Bike Servicing & Engine Oil Change campaign");
      setCampaignText(language === "bn" ? "ফ্রি সার্ভিস নোটিফিকেশন: আপনার রানার বাইকের ৩য় ফ্রি সার্ভিস ডিউ রয়েছে। আগামী রবিবারের মধ্যে নিকটস্থ ডিলারে বুকিং দিলে মবিল পরিবর্তন একদম ফ্রী!" : "Free service warning: Your Bike's 3rd free service is due. Settle by Sunday for free gear-oil upgrade!");
    }
  };


  // --- TAB 2: SERVICE & VEHICLE HISTORY MODULE ---
  const [jobs, setJobs] = useState<VehicleJob[]>(() => loadStored("dms_service_jobs", [
    { id: "job-1", customerName: "ফরহাদ রেজা", plateNo: "Dhaka Metro-La 12-4560", model: "Runner Bolt 165R", mileage: 14500, serviceType: "Paid Engine Repair", assignedMechanic: "ওস্তাদ খলিল", warrantyCovered: true, status: "Under Work", date: "2026-06-11" },
    { id: "job-2", customerName: "হাবিবুর রহমান", plateNo: "Dhaka Metro-Ha 54-8812", model: "Runner Knight Rider 150", mileage: 8200, serviceType: "Free Service", assignedMechanic: "সুশান্ত কুমার", warrantyCovered: true, status: "Quality Testing", date: "2026-06-11" },
    { id: "job-3", customerName: "মিঠুন চৌধুরী", plateNo: "Sylhet Metro-Ta 11-9923", model: "TVS Apache RTR 160", mileage: 28900, serviceType: "Periodical Wash & Lube", assignedMechanic: "মন্টু মিয়া", warrantyCovered: false, status: "Ready for Delivery", date: "2026-06-10" },
  ]));

  useEffect(() => { saveStored("dms_service_jobs", jobs); }, [jobs]);

  // Job Modal input states
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobCustName, setJobCustName] = useState("");
  const [jobPlate, setJobPlate] = useState("");
  const [jobModel, setJobModel] = useState("");
  const [jobMil, setJobMil] = useState(0);
  const [jobType, setJobType] = useState<VehicleJob["serviceType"]>("Free Service");
  const [jobMech, setJobMech] = useState("");
  const [jobWarranty, setJobWarranty] = useState(true);

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobCustName || !jobPlate || !jobModel) {
      toast.error(language === "bn" ? "প্রয়োজনীয় ফিল্ড গুলো পূরণ করুন।" : "Please fill required fields.");
      return;
    }
    const newJ: VehicleJob = {
      id: "job-" + Date.now(),
      customerName: jobCustName,
      plateNo: jobPlate,
      model: jobModel,
      mileage: Number(jobMil) || 0,
      serviceType: jobType,
      assignedMechanic: jobMech || (language === "bn" ? "অপ্রধান টেকনিশিয়ান" : "General Repairer"),
      warrantyCovered: jobWarranty,
      status: "Received",
      date: new Date().toISOString().split("T")[0]
    };
    setJobs(prev => [newJ, ...prev]);
    setShowJobModal(false);
    setJobCustName("");
    setJobPlate("");
    setJobModel("");
    setJobMil(0);
    setJobMech("");
    toast.success(language === "bn" ? "নতুন সার্ভিস ওয়ার্ক অর্ডার সফলভাবে তৈরি হয়েছে!" : "Service Work Order registered successfully!");
  };

  const handleUpdateJobStatus = (id: string, s: VehicleJob["status"]) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: s } : j));
    toast.success(language === "bn" ? "ওয়ার্ক অর্ডার স্ট্যাটাস হালনাগাদ করা হয়েছে!" : "Work order status synchronized!");
  };

  const handleDeleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    toast.success(language === "bn" ? "ওয়ার্ক অর্ডারটি ডিলিট করা হয়েছে।" : "Work order deleted.");
  };

  // --- WARRANTY MATRIX CHECKER ---
  const [warrantySearchCode, setWarrantySearchCode] = useState("");
  const [warrantyResult, setWarrantyResult] = useState<{ id: string; part: string; duration: string; status: string; oem: string; customer?: string } | null>(null);

  const runWarrantyCheck = () => {
    if (!warrantySearchCode) return;
    const itemsMock: Record<string, typeof warrantyResult> = {
      "OEM-BATT-9921": { id: "W12", part: "12V 9Ah Runner Standard MF Battery", duration: "৬ মাস (6 Months Manufacturer Guarantee)", status: "Active (চলতি রেজিঃ)", oem: "Runner Motors Bangladesh Ltd.", customer: "রাজীব হোসাইন" },
      "OEM-CLUTCH-7712": { id: "W15", part: "TVS Splendor Compatible Advanced Carbon Plate", duration: "১ বছর (1 Year OEM Warranty)", status: "Expired (মেয়াদ উত্তীর্ণ)", oem: "TVS Auto Bangladesh", customer: "কবির ট্রেইনিং" },
      "OEM-PISTON-3012": { id: "W18", part: "Runner Bolt Genuine Chromium Plated Piston Set", duration: "২ বছর (2 Year Replacement Guarantee)", status: "Active (চলতি রেজিঃ)", oem: "Atlas Bangladesh Ltd.", customer: "আব্দুল মজিদ" },
    };

    const match = itemsMock[warrantySearchCode.toUpperCase().trim()];
    if (match) {
      setWarrantyResult(match);
      toast.success(language === "bn" ? "মিল পাওয়া গেছে! ডিজিটাল ওয়ারেন্টি রেকর্ড সচল।" : "Match found! Synced OEM registration database.");
    } else {
      setWarrantyResult(null);
      toast.error(language === "bn" ? "দুঃখিত, কোনো ওয়ারেন্টি রেকর্ড পাওয়া যায়নি। সঠিক আইডি দিন।" : "Product Part serial not registered or invalid.");
    }
  };


  // --- TAB 3: OEM INTEGRATION & COMPLIANCE PORTAL ---
  const [oemLogs, setOemLogs] = useState<{ time: string; msg: string; status: "success" | "pending" | "err" }[]>([
    { time: "10:15 AM", msg: "রানার মটরস API ক্লাউড সংযোগ সফল হয়েছে (Authenticated Code: RN-99AS2)", status: "success" },
    { time: "10:16 AM", msg: "রানার স্পেয়ার পার্টস ডিজিটাল ক্যাটালগ সিঙ্কিং সম্পন্ন। ৮৪টি আইটেম আপডেট করা হয়েছে।", status: "success" },
    { time: "11:00 AM", msg: "টিভিএস বাংলাদেশ ডিলার পোর্টাল সিঙ্ক রিকোয়েস্ট পেন্ডিং।", status: "pending" },
  ]);
  const [syncingOem, setSyncingOem] = useState(false);

  const startOemSync = () => {
    setSyncingOem(true);
    setTimeout(() => {
      setOemLogs(prev => [
        { time: new Date().toLocaleTimeString(), msg: "স্বয়ংক্রিয় OEM রিটেইল ইনভয়েস এবং নতুন পার্টস ডাটাবেজ আপডেট সম্পন্ন!", status: "success" },
        ...prev
      ]);
      setSyncingOem(false);
      toast.success(language === "bn" ? "টিভিএস ও রানার ক্লাউড সার্ভার সফলভাবে সিঙ্ক সম্পন্ন!" : "OEM Cloud server updated successfully!");
    }, 2500);
  };

  // --- DOCUMENT & COMPLIANCE VAULT ---
  const [complianceDocs, setComplianceDocs] = useState<ComplianceDoc[]>(() => loadStored("dms_compliance_docs", [
    { id: "doc-1", title: "ট্রেড লাইসেন্স সমীরা ট্রেডার্স (Trade License)", docCode: "TR-DH-2026-99120", authority: "ঢাকা উত্তর সিটি কর্পোরেশন", expiryDate: "2026-06-30", status: "Expiring Soon" },
    { id: "doc-2", title: "১৩-ডিজিট ভ্যাট নিবন্ধন সার্টিফিকেট (13-Digit VAT BIN)", docCode: "VAT-BIN-002130559", authority: "জাতীয় রাজস্ব বোর্ড (NBR Bangladesh)", expiryDate: "2028-12-31", status: "Active (Compliant)" },
    { id: "doc-3", title: "টিভিএস অফিশিয়াল আউটলেট ডিলারশিপ চুক্তিপত্র", docCode: "OEM-DEALER-TVS-76", authority: "TVS Auto Bangladesh Main HQ", expiryDate: "2027-04-12", status: "Audited & Verified" },
  ]));

  useEffect(() => { saveStored("dms_compliance_docs", complianceDocs); }, [complianceDocs]);

  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCode, setDocCode] = useState("");
  const [docAuth, setDocAuth] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docStatus, setDocStatus] = useState<ComplianceDoc["status"]>("Active (Compliant)");

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docCode) {
      toast.error(language === "bn" ? "দলিল টাইটেল ও কোড আবশ্যিক।" : "Title and code required.");
      return;
    }
    const newDoc: ComplianceDoc = {
      id: "doc-" + Date.now(),
      title: docTitle,
      docCode: docCode,
      authority: docAuth || "NBR Bangladesh",
      expiryDate: docExpiry || "2027-12-31",
      status: docStatus
    };
    setComplianceDocs(prev => [...prev, newDoc]);
    setShowDocModal(false);
    setDocTitle("");
    setDocCode("");
    setDocAuth("");
    setDocExpiry("");
    toast.success(language === "bn" ? "নতুন দলিল কম্প্লায়েন্স ভল্টে আপলোড সম্পন্ন হয়েছে!" : "Compliance Document registered!");
  };

  const handleDeleteDoc = (id: string) => {
    setComplianceDocs(prev => prev.filter(d => d.id !== id));
    toast.success(language === "bn" ? "দলিলটি ডিলিট করা হয়েছে।" : "Document deleted.");
  };


  // --- TAB 4: CUSTOMIZABLE DASHBOARD TARGETS & PARAMETERS ---
  const [lowStockLimit, setLowStockLimit] = useState(() => Number(localStorage.getItem("dms_config_low_stock") || "15"));
  const [salesTarget, setSalesTarget] = useState(() => Number(localStorage.getItem("dms_config_sales_target") || "500000"));
  const [remindersDays, setRemindersDays] = useState(() => Number(localStorage.getItem("dms_config_reminders") || "7"));
  const [selectedDashboardMetrics, setSelectedDashboardMetrics] = useState<string[]>(["sales", "cash", "leads", "stock"]);

  const saveTargetConfigs = () => {
    localStorage.setItem("dms_config_low_stock", String(lowStockLimit));
    localStorage.setItem("dms_config_sales_target", String(salesTarget));
    localStorage.setItem("dms_config_reminders", String(remindersDays));
    toast.success(language === "bn" ? "কাস্টম ড্যাশবোর্ড পরামিতি এবং লক্ষ্য সফলভাবে সংরক্ষিত!" : "Custom KPI targets saved!");
    window.dispatchEvent(new Event("kpi-changed"));
  };

  const toggleMetric = (met: string) => {
    if (selectedDashboardMetrics.includes(met)) {
      setSelectedDashboardMetrics(prev => prev.filter(m => m !== met));
    } else {
      setSelectedDashboardMetrics(prev => [...prev, met]);
    }
  };


  return (
    <div className="space-y-6" id="dms-enterprise-view-container">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointers-none" />
        <div className="relative z-10">
          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border border-indigo-500/30">
            {language === "bn" ? "এন্টারপ্রাইজ সুপিরিয়র মডিউলস" : "Enterprise ERP Modules"}
          </span>
          <h2 className="text-xl md:text-3xl font-black text-white font-sans mt-3 tracking-tight">
            {language === "bn" ? "ডিএমএস এন্টারপ্রাইজ কমপ্লিট স্যুট" : "DMS Enterprise Suite Pro"}
          </h2>
          <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl leading-relaxed font-medium">
            {language === "bn" 
              ? "গ্রাহক সম্পর্ক (CRM), লিড পাইপলাইন, মোটর সার্ভিসে টিকিট জেনারেশন, OEM অটো-সিঙ্কিং, ফাইল ভল্ট এবং কাস্টম কেপিআই পরামিতি কনফিগারেশন কেন্দ্র।"
              : "Integrated Customer Relations, leads, vehicle servicing matrix, OEM cross-sync integration, document compliance vault and custom KPI boards."}
          </p>
        </div>
        <div className="relative z-10 flex flex-row items-center gap-2 block shrink-0">
          <div className="bg-indigo-600/10 text-indigo-400 p-3 rounded-2xl border border-indigo-500/20 text-center">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{language === "bn" ? "চলতি লিড ও পাইপলাইন" : "VALUATION"}</span>
            <span className="text-lg font-black text-white tracking-tight">{formatNumber(leads.filter(l => l.status !== "lost").reduce((acc, l) => acc + l.value, 0).toLocaleString())} ৳</span>
          </div>
        </div>
      </div>

      {/* Superior Module Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-gray-150 max-w-fit">
        <button
          onClick={() => setActiveTab("crm")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "crm"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="crm-tab-btn"
        >
          <Users className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "গ্রাহক সম্পর্ক ও লিড (CRM & Leads)" : "CRM & Lead Pipeline"}</span>
        </button>

        <button
          onClick={() => setActiveTab("service")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "service"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="service-tab-btn"
        >
          <Wrench className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "সার্ভিস, ওয়ারেন্টি ও পার্টস (Service Hub)" : "Servicing & Workshop"}</span>
        </button>

        <button
          onClick={() => setActiveTab("oem_compliance")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "oem_compliance"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="oem-tab-btn"
        >
          <Layers className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "OEM সিঙ্ক ও কম্প্লায়েন্স ভল্ট" : "OEM Sync & Compliance Vault"}</span>
        </button>

        <button
          onClick={() => setActiveTab("user_mgmt")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "user_mgmt"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="user-mgmt-tab-btn"
        >
          <User className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "ব্যবহারকারী ও নিরাপত্তা" : "User Management"}</span>
        </button>

        <button
          onClick={() => setActiveTab("mobile_access")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "mobile_access"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="mobile-access-tab-btn"
        >
          <Smartphone className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "মোবাইল অ্যাপ নিয়ন্ত্রণ" : "Mobile App Access"}</span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "payments"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="payments-tab-btn"
        >
          <Lock className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "নিরাপদ পেমেন্ট গেটওয়ে" : "Secure Payments"}</span>
        </button>

        <button
          onClick={() => setActiveTab("custom_dashboard")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            activeTab === "custom_dashboard"
              ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 font-extrabold"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
          }`}
          id="dashboard-tab-btn"
        >
          <Settings2 className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{language === "bn" ? "ড্যাশবোর্ড টার্গেট পরামিতি" : "KPI Targets & Reminders"}</span>
        </button>
      </div>


      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* TAB 1: CRM & LEADS WORKSPACE */}
        {activeTab === "crm" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="crm-panel-arena"
          >
            {/* Visual CRM Goals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">{language === "bn" ? "চলতি লিড পাইপলাইন" : "Active CRM Leads"}</span>
                  <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Users className="w-4 h-4"/></div>
                </div>
                <h4 className="text-2xl font-black text-gray-950 mt-1">{formatNumber(leads.length)}</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1">{language === "bn" ? "সক্রিয় কাস্টমার সম্পর্ক ও সম্ভাবনা" : "Customer leads in negotiation list"}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">{language === "bn" ? "সফল রূপান্তর রেট" : "Conversion Success Rate"}</span>
                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 className="w-4 h-4"/></div>
                </div>
                <h4 className="text-2xl font-black text-emerald-700 mt-1">
                  {leads.length > 0 ? formatNumber(Math.round((leads.filter(l => l.status === "converted").length / leads.length) * 100)) : "০"}%
                </h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1">{language === "bn" ? "কনভার্টেড লিড পেমেন্ট পেইড" : "Deals transformed to sales invoices"}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-2xs flex flex-row items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-gray-900">{language === "bn" ? "নতুন লিড এন্ট্রি" : "Add Potential Sales"}</h4>
                  <p className="text-gray-400 text-xs mt-0.5">{language === "bn" ? "নতুন এনকোয়ারি বা কোটেশন" : "Log interested walk-in buyers"}</p>
                </div>
                <button
                  onClick={() => setShowLeadModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-4 py-2.5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all text-center"
                >
                  + {language === "bn" ? "লিড যুক্ত করুন" : "Add Lead"}
                </button>
              </div>
            </div>

            {/* Lead Pipeline Columns (Visual Kanban Board) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>{language === "bn" ? "লাইভ কাস্টমার রিলেশনশিপ ম্যাপ এবং ড্রাগ-ক্লিক ডিল বোর্ড" : "Interactive CRM Deals and Lead Pipelines"}</span>
              </h3>
              <p className="text-xs text-gray-400 font-semibold">{language === "bn" ? "গ্রাহক দের ধাপ অনুযায়ী সাজাতে অ্যাকশন প্রেস করুন:" : "Move deals seamlessly through lifecycle milestones:"}</p>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 pt-2">
                {/* Column 1: New */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{language === "bn" ? "নতুন অনুসন্ধান" : "New Lead"}</span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {formatNumber(leads.filter(l => l.status === "new").length)}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
                    {leads.filter(l => l.status === "new").map(l => (
                      <LeadCard key={l.id} lead={l} onUpdate={handleUpdateLeadStatus} onDelete={handleDeleteLead} />
                    ))}
                  </div>
                </div>

                {/* Column 2: Contacted */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{language === "bn" ? "যোগাযোগকৃত" : "Contacted"}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {formatNumber(leads.filter(l => l.status === "contacted").length)}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
                    {leads.filter(l => l.status === "contacted").map(l => (
                      <LeadCard key={l.id} lead={l} onUpdate={handleUpdateLeadStatus} onDelete={handleDeleteLead} />
                    ))}
                  </div>
                </div>

                {/* Column 3: Negotiating */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{language === "bn" ? "আলোচনাধীন" : "Negotiating"}</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {formatNumber(leads.filter(l => l.status === "negotiating").length)}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
                    {leads.filter(l => l.status === "negotiating").map(l => (
                      <LeadCard key={l.id} lead={l} onUpdate={handleUpdateLeadStatus} onDelete={handleDeleteLead} />
                    ))}
                  </div>
                </div>

                {/* Column 4: Converted */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">{language === "bn" ? "কনভার্টেড" : "Converted"}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {formatNumber(leads.filter(l => l.status === "converted").length)}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
                    {leads.filter(l => l.status === "converted").map(l => (
                      <LeadCard key={l.id} lead={l} onUpdate={handleUpdateLeadStatus} onDelete={handleDeleteLead} />
                    ))}
                  </div>
                </div>

                {/* Column 5: Lost */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[11px] font-black text-rose-800 uppercase tracking-widest">{language === "bn" ? "ব্যর্থ ডিল" : "Lost"}</span>
                    <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {formatNumber(leads.filter(l => l.status === "lost").length)}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
                    {leads.filter(l => l.status === "lost").map(l => (
                      <LeadCard key={l.id} lead={l} onUpdate={handleUpdateLeadStatus} onDelete={handleDeleteLead} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Booking Scheduler Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel: Scheduler list */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
                      <Calendar className="w-4.5 h-4.5 text-indigo-600" />
                      <span>{language === "bn" ? "শোরুম আলোচনা ও কাস্টমার ভিজিট অ্যাপয়েন্টমেন্ট" : "Customer Meetup & Servicing Appointments"}</span>
                    </h3>
                    <button
                      onClick={() => setShowAppModal(true)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-2 rounded-xl cursor-pointer"
                    >
                      + {language === "bn" ? "নতুন শিডিউল" : "Schedule Meet"}
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {appointments.map(a => (
                      <div key={a.id} className="p-3.5 rounded-2xl border border-gray-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 text-xs">{a.customerName}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm ${
                              a.type === "Service" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                              a.type === "Delivery" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-purple-50 text-purple-800"
                            }`}>
                              {a.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-semibold font-mono tracking-tight">{a.phone}</p>
                          <p className="text-[11px] text-gray-500 font-bold">{a.dateTime} • <strong className="text-gray-700">{a.location}</strong></p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {a.status === "Scheduled" ? (
                            <>
                              <button
                                onClick={() => handleUpdateAppStatus(a.id, "Completed")}
                                className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                {language === "bn" ? "সম্পন্ন" : "Done"}
                              </button>
                              <button
                                onClick={() => handleUpdateAppStatus(a.id, "Cancelled")}
                                className="p-1.5 bg-red-50 text-red-700 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                {language === "bn" ? "বাতিল" : "Cancel"}
                              </button>
                            </>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.status === "Completed" ? "bg-slate-200 text-slate-800" : "bg-red-150 text-red-800"}`}>
                              {a.status === "Completed" ? (language === "bn" ? "সম্পন্ন হয়েছে" : "Completed") : (language === "bn" ? "বাতিলকৃত" : "Cancelled")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel: Auto SMS Promotions */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
                    <Send className="w-4.5 h-4.5 text-indigo-600" />
                    <span>{language === "bn" ? "মার্কেটিং অটোমেশন এবং প্রচারপত্র (SMS Campaigns)" : "Automated SMS Marketing Engine"}</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-semibold">{language === "bn" ? "গ্রুপ কাস্টমার দের একই সাথে রিলেশন বিল্ড ও ডিসকাউন্টের মেসেজ ক্যাম্পেইন পাঠান।" : "Bulk target specific buyer cohorts with customizable templates:"}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => loadTemplate("discount")} className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 border rounded-xl text-[10px] font-black cursor-pointer text-indigo-700">
                      🏷️ {language === "bn" ? "ডিসকাউন্ট সেলস টেমপ্লেট" : "Discount Special"}
                    </button>
                    <button onClick={() => loadTemplate("remainder")} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border rounded-xl text-[10px] font-black cursor-pointer text-gray-700">
                      💸 {language === "bn" ? "বকেয়া সতর্কতা পেমেন্ট" : "Outstanding Alert"}
                    </button>
                    <button onClick={() => loadTemplate("servicing")} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border rounded-xl text-[10px] font-black cursor-pointer text-gray-700">
                      🔧 {language === "bn" ? "ফ্রি বাইক সার্ভিস ক্যাম্পেইন" : "Bike Service Due"}
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{language === "bn" ? "প্রচারণা ক্যাম্পেইন টাইটেল" : "Campaign Title"}</label>
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder={language === "bn" ? "যেমন: খুচরা পার্টস অফার" : "e.g., Eid Remainder"}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{language === "bn" ? "লক্ষ্য শ্রোতা (Audience)" : "Audience Segment"}</label>
                        <select
                          value={campaignSegment}
                          onChange={(e) => setCampaignSegment(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 bg-white"
                        >
                          <option value="all">{language === "bn" ? "সকল কাস্টমার তালিকা" : "All Registered Customers"}</option>
                          <option value="due">{language === "bn" ? "বকেয়া বাকি কাস্টমার" : "Only Credit Overdues"}</option>
                          <option value="suppliers">{language === "bn" ? "সকল সাপ্লায়ার গ্রুপ" : "All Registered Suppliers"}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{language === "bn" ? "বার্তা বডি (SMS Message Body)" : "Message Body"}</label>
                      <textarea
                        value={campaignText}
                        onChange={(e) => setCampaignText(e.target.value)}
                        placeholder={language === "bn" ? "আপনার কাস্টম টেক্সট মেসেজটি এখানে লিখুন..." : "Write details..."}
                        rows={3}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={runCampaign}
                    disabled={sendingCampaign}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold text-xs py-3 rounded-2xl cursor-pointer hover:shadow hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
                  >
                    {sendingCampaign ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === "bn" ? "এসএমএস বিতরণ করা হচ্ছে..." : "Broadcasting SMS updates..."}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-yellow-300" />
                        <span>{language === "bn" ? "এসএমএস ব্রডকাস্ট প্রচারণা চালান" : "Run Marketing Broadcast Blast"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign analytics and reports */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm">
              <h3 className="font-black text-gray-950 text-sm mb-4">{language === "bn" ? "অতীতের বিপণন প্রচারণা লগ" : "Past Marketing Campaigns Performance"}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] uppercase font-extrabold text-gray-400">
                      <th className="p-3 text-left">{language === "bn" ? "তারিখ" : "Date"}</th>
                      <th className="p-3 text-left">{language === "bn" ? "ক্যাম্পেইন" : "Campaign"}</th>
                      <th className="p-3 text-left">{language === "bn" ? "বার্তা" : "Message Preview"}</th>
                      <th className="p-3 text-left">{language === "bn" ? "প্রেরিত সংখ্যা" : "Sent Count"}</th>
                      <th className="p-3 text-right">{language === "bn" ? "স্থিতি" : "Gateway Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {smsLogs.map(sm => (
                      <tr key={sm.id} className="hover:bg-slate-50/40">
                        <td className="p-3 text-gray-500 font-sans">{sm.date}</td>
                        <td className="p-3 font-extrabold text-slate-800">{sm.campaign}</td>
                        <td className="p-3 text-gray-600 italic truncate max-w-xs">{sm.text}</td>
                        <td className="p-3 font-bold text-gray-900">{formatNumber(sm.count)} {language === "bn" ? "টি" : "contacts"}</td>
                        <td className="p-3 text-right">
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {language === "bn" ? " বিতরণকৃত" : "Delivered"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}


        {/* TAB 2: SERVICE & WORKSHOP MANAGEMENT */}
        {activeTab === "service" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="servicing-panel-matrix"
          >
            {/* Warranty claim checker banner */}
            <div className="bg-gradient-to-tr from-amber-500 to-amber-600 p-6 rounded-3xl border border-amber-400 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <h3 className="font-black text-white text-md flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-950 fill-white" />
                  <span>{language === "bn" ? "ডিজিটাল মোটর-পার্টস ওয়ারেন্টি চেকার" : "OEM Motorcycle Parts Warranty Check Hub"}</span>
                </h3>
                <p className="text-white/80 text-xs">
                  {language === "bn" 
                    ? "সরাসরি প্রস্তুতকারক ডাটাবেজ থেকে ব্যাটারি, পিস্টন, গিয়ার, বা যেকোনো জেনুইন খুচরা যন্ত্রাংশের ওয়ারেন্টি ও ক্লেইম ভ্যালিডিটি চেক করুন।"
                    : "Check authentic motor parts warranty coverage, remaining validity period and supplier registry code directly."}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <input
                  type="text"
                  value={warrantySearchCode}
                  onChange={(e) => setWarrantySearchCode(e.target.value)}
                  placeholder={language === "bn" ? "যেমন: OEM-BATT-9921" : "e.g., OEM-BATT-9921"}
                  className="bg-white text-slate-950 text-xs font-bold px-3.5 py-2.5 rounded-xl placeholder-slate-400 focus:outline-none w-48 md:w-56"
                />
                <button
                  onClick={runWarrantyCheck}
                  className="bg-slate-900 border border-slate-950 hover:bg-black text-white text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  {language === "bn" ? "পরীক্ষা করুন" : "Validate"}
                </button>
              </div>
            </div>

            {/* Warranty lookup result */}
            {warrantyResult && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <Check className="p-1.5 bg-amber-500 rounded-full text-white w-7 h-7 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-tight">{language === "bn" ? "ডিজিটাল ওয়ারেন্টি ভেরিফাইড" : "OEM Warranty Record Verified Info"}</h4>
                    <p className="font-black text-slate-800 text-sm mt-1">{warrantyResult.part}</p>
                    <div className="flex flex-wrap gap-2.5 text-[11px] text-amber-900 font-bold mt-1">
                      <span>প্রস্তুতকারক: <strong>{warrantyResult.oem}</strong></span>
                      <span>ক্রয়কারী: <strong>{warrantyResult.customer}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-amber-200 pt-3 md:pt-0 pl-0 md:pl-5 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-amber-700 font-bold uppercase block">{language === "bn" ? "অবশিষ্ট মেয়াদ" : "Remaining Lifespan"}</span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{warrantyResult.duration}</span>
                  </div>
                  <span className={`text-[11px] font-black px-3 py-1 rounded-lg ${warrantyResult.status.includes("Expired") ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {warrantyResult.status}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Service workshop list */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-black text-gray-950 text-base">{language === "bn" ? "মোটরসাইকেল ওয়ার্কশপ এবং সার্ভিস জব-কার্ড" : "Motorcycle Servicing & Active Workorders"}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">{language === "bn" ? "শোরুমে রানার বা টিভিএস মটরসের সার্ভিসিং ইতিহাস রেকর্ড ও ডেসপ্যাচ পরিচালনা।" : "Jobcard booking log for motor diagnostic checklist"}</p>
                </div>
                <button
                  onClick={() => setShowJobModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  + {language === "bn" ? "ওয়ার্ক অর্ডার খুলুন (Job Card)" : "New Workorder Job"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-extrabold text-slate-400 border-b">
                      <th className="p-4">{language === "bn" ? "গ্রাহক ও বাইক মডেল" : "Customer & Motorcycle Model"}</th>
                      <th className="p-4">{language === "bn" ? "গাড়ি রেজিঃ নাম্বার" : "Vehicle Plate No"}</th>
                      <th className="p-4">{language === "bn" ? "সার্ভিস ধরণ ও টেকনিশিয়ান" : "Service & Assigned Mechanic"}</th>
                      <th className="p-4">{language === "bn" ? "মাইলেজ ও ওয়ারেন্টি" : "Mileage & Warranty"}</th>
                      <th className="p-4">{language === "bn" ? "অবস্থা" : "Job Status"}</th>
                      <th className="p-4 text-center">{language === "bn" ? "অ্যাকশন" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {jobs.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50/40">
                        <td className="p-4">
                          <span className="font-extrabold text-gray-950 block">{j.customerName}</span>
                          <span className="text-[10px] text-indigo-700 font-bold block mt-0.5">{j.model}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-500">{j.plateNo}</td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 block">{j.serviceType}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">মেকানিক: <strong className="text-slate-700 font-extrabold">{j.assignedMechanic}</strong></span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-slate-900 block">{formatNumber(j.mileage)} KM</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm block mt-1.5 w-max ${
                            j.warrantyCovered ? "bg-emerald-50 text-emerald-800 border border-emerald-150" : "bg-slate-100 text-slate-600"
                          }`}>
                            {j.warrantyCovered ? (language === "bn" ? "ওয়ারেন্টি আছে" : "In Warranty") : (language === "bn" ? "কোন ওয়ারেন্টি নেই" : "No Warranty")}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={j.status}
                            onChange={(e) => handleUpdateJobStatus(j.id, e.target.value as any)}
                            className={`text-[10px] font-black rounded-lg px-2 py-1.5 border ${
                              j.status === "Received" ? "bg-blue-50 text-blue-800 border-blue-150" :
                              j.status === "Under Work" ? "bg-amber-50 text-amber-800 border-amber-150" :
                              j.status === "Quality Testing" ? "bg-purple-50 text-purple-800 border-purple-150" :
                              "bg-emerald-50 text-emerald-800 border-emerald-150"
                            }`}
                          >
                            <option value="Received">{language === "bn" ? "গাড়ি গৃহীত (Received)" : "Received"}</option>
                            <option value="Under Work">{language === "bn" ? "কাজ চলছে (Repairing)" : "Under Work"}</option>
                            <option value="Quality Testing">{language === "bn" ? "টেস্ট ড্রাইভ (Testing)" : "Quality Testing"}</option>
                            <option value="Ready for Delivery">{language === "bn" ? "ডেলিভারি প্রস্তুত (Ready)" : "Ready for Delivery"}</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteJob(j.id)}
                            className="p-1 px-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Motorcycle parts database list lookup */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
                <span>{language === "bn" ? "জেনুইন পার্টস ও ফিটিং ক্যাটালগ" : "Parts Compatibility Dictionary & Engine Catalog"}</span>
              </h3>
              <p className="text-xs text-gray-400 font-semibold">{language === "bn" ? "Runner ও TVS মোটরের যন্ত্রাংশ সামঞ্জস্যতা এবং মজুদ তালিকা:" : "Review verified supplier catalogs and compatible platform series:"}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-left space-y-1">
                  <span className="font-extrabold text-slate-800 text-xs block">AD80S Genuine Hub Cover plate</span>
                  <p className="text-[10px] text-indigo-600 font-bold block">Compatibility: Runner AD80, LML Freedom</p>
                  <p className="text-[11px] text-slate-500">{language === "bn" ? "মজুদ: ৩৫০ পিস" : "Stock: 350 Units available"}</p>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-left space-y-1">
                  <span className="font-extrabold text-slate-800 text-xs block">TVS Carburetor Assembly 110cc</span>
                  <p className="text-[10px] text-indigo-600 font-bold block">Compatibility: TVS Metro, TVS XL100</p>
                  <p className="text-[11px] text-slate-500">{language === "bn" ? "মজুদ: ১৫ পিস (অল্প স্টক আছে)" : "Stock: 15 Units left (Low Stock)"}</p>
                </div>

                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-left space-y-1">
                  <span className="font-extrabold text-slate-800 text-xs block">Carbon Finish Cylinder block liner</span>
                  <p className="text-[10px] text-indigo-600 font-bold block">Compatibility: Runner KnightRider 150</p>
                  <p className="text-[11px] text-slate-500">{language === "bn" ? "মজুদ: ৮২ পিস" : "Stock: 82 Units ready"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* TAB 3: OEM INTEGRATION & COMPLIANCE PORTAL */}
        {activeTab === "oem_compliance" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="compliance-panel-suite"
          >
            {/* Visual Order-To-Cash (O2C) Automated Pipeline */}
            <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="font-black text-gray-950 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <span>{language === "bn" ? "অর্ডার-টু-ক্যাশ (O2C) সমন্বিত অটোমেশন পাইপলাইন" : "Order to Cash (O2C) Automated Logistics Pipeline"}</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold">
                {language === "bn" 
                  ? "অর্ডার গ্রহণ থেকে টাকা আদায় এবং ব্যাংক খতিয়ানে এন্ট্রি পর্যন্ত সমীরা ট্রেডার্সের স্বয়ংক্রিয় ওয়ার্কফ্লো:"
                  : "End-to-end tracking framework from initial order up to final cash book settlement entry:"}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-4 text-center">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">ধাপ ১</span>
                  <span className="text-xs font-extrabold text-indigo-950 block mt-2">{language === "bn" ? "অর্ডার এন্ট্রি (SR)" : "SR Order Lock"}</span>
                  <span className="text-[9px] text-indigo-700/80 mt-1 block">কাস্টমার বুকিং</span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">ধাপ ২</span>
                  <span className="text-xs font-extrabold text-indigo-950 block mt-2">{language === "bn" ? "ক্রেডিট চেকপয়েন্ট" : "Credit Verify"}</span>
                  <span className="text-[9px] text-indigo-700/80 mt-1 block">বকেয়া সীমা যাচাই</span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">ধাপ ৩</span>
                  <span className="text-xs font-extrabold text-indigo-950 block mt-2">{language === "bn" ? "লোডশিট জেনারেটর" : "Morning Loading"}</span>
                  <span className="text-[9px] text-indigo-700/80 mt-1 block">ম্যানুফ্যাকচারিং লোড</span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">ধাপ ৪</span>
                  <span className="text-xs font-extrabold text-indigo-950 block mt-2">{language === "bn" ? "DSR ডোর ডেলিভারি" : "Door Delivery"}</span>
                  <span className="text-[9px] text-indigo-700/80 mt-1 block">ডেলিভারি গাড়ি আউট</span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">ধাপ ৫</span>
                  <span className="text-xs font-extrabold text-indigo-950 block mt-2">{language === "bn" ? "বিকাল: সেটেলমেন্ট" : "Settlement Settle"}</span>
                  <span className="text-[9px] text-indigo-700/80 mt-1 block">টাকা এবং রিসিভ সিঙ্ক</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-emerald-600 uppercase block tracking-wider">ধাপ ৬ (সমাপ্ত)</span>
                  <span className="text-xs font-extrabold text-emerald-950 block mt-2">{language === "bn" ? "ক্যাশ বুক এন্ট্রি" : "Cash Ledger Post"}</span>
                  <span className="text-[9px] text-emerald-700/80 mt-1 block">ব্যাংক আমানত জমা</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel: OEM syncing */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
                      <Globe className="w-4.5 h-4.5 text-indigo-600" />
                      <span>{language === "bn" ? "Integration With OEM Systems (টিভিএস / রানার ক্লাউড)" : "OEM Manufacturer API Sync Integration"}</span>
                    </h3>
                    <button
                      onClick={startOemSync}
                      disabled={syncingOem}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingOem ? "animate-spin" : ""}`} />
                      <span>{language === "bn" ? "সিঙ্ক করুন" : "Sync Now"}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                    {language === "bn" 
                      ? "Runner Motors, TVS Bangladesh এবং Atlas Bangladesh প্রস্তুতকারক ক্যারালাগের API সংযোগের লাইভ ডেটা ফিড।"
                      : "Sync active models, raw spare parts inventory and pricing updates from official manufacturer hubs:"}
                  </p>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {oemLogs.map((log, i) => (
                      <div key={i} className="flex gap-3 items-start bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                        {log.status === "success" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 mt-1.5" />}
                        {log.status === "pending" && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1.5" />}
                        {log.status === "err" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />}
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-gray-400 font-mono block">{log.time}</span>
                          <span className="text-xs text-gray-700 font-bold block">{log.msg}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel: Compliance and Document Vault */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-indigo-600" />
                      <span>{language === "bn" ? "Document Management & Compliance Vault" : "Government License & Compliance Audit Vault"}</span>
                    </h3>
                    <button
                      onClick={() => setShowDocModal(true)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black px-3.5 py-1.5 rounded-xl cursor-pointer"
                    >
                      + {language === "bn" ? "নতুন দলিল" : "Add Doc"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 font-semibold mb-4">
                    {language === "bn" 
                      ? "ট্রেড লাইসেন্স, ভ্যাট নিবন্ধন, কর সার্টিফিকেট এবং ডিলার চুক্তিপত্র নিরাপদ সংরক্ষণশালা।"
                      : "DMS Official corporate legal storehouse for government tax certificates, local municipality licensing, and OEM contract documents:"}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {complianceDocs.map(d => (
                      <div key={d.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between text-left relative">
                        <button
                          onClick={() => handleDeleteDoc(d.id)}
                          className="absolute top-2.5 right-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm w-max ${
                            d.status === "Active (Compliant)" ? "bg-emerald-50 text-emerald-800 border" :
                            d.status === "Expiring Soon" ? "bg-amber-50 text-amber-800 border" : "bg-red-50 text-red-800"
                          }`}>
                            {d.status}
                          </span>
                          <span className="font-extrabold text-slate-800 text-xs mt-2 block leading-snug">{d.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono block mt-1">ID: {d.docCode}</span>
                        </div>
                        <div className="border-t border-dashed mt-3 pt-2 text-[10px] text-gray-500 font-bold">
                          {language === "bn" ? "মেয়াদ উত্তীর্ণ তারিখ:" : "Expiry:"} <strong className="text-slate-700">{d.expiryDate}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: USER MANAGEMENT & SECURITY */}
        {activeTab === "user_mgmt" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="user-mgmt-panel"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-left relative overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === "bn" ? "মোট ব্যবহারকারী" : "TOTAL USERS"}</span>
                <span className="block text-2xl font-black text-white mt-1.5">{enterpriseUsers.length}</span>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">● {enterpriseUsers.filter((u: any) => u.status === "Active").length} {language === "bn" ? "সক্রিয় রয়েছেন" : "Active Now"}</span>
              </div>
              <div className="bg-white border p-5 rounded-3xl text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === "bn" ? "সক্রিয় সেশন (একটিভ ডিভাইস)" : "ACTIVE DEVICES"}</span>
                <span className="block text-2xl font-black text-indigo-950 mt-1.5">{enterpriseUsers.filter((u: any) => u.sessionToken !== "N/A").length}</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">{language === "bn" ? "ডিভাইস লকিং অন" : "Handset Hardware Lock Enabled"}</span>
              </div>
              <div className="bg-white border p-5 rounded-3xl text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === "bn" ? "আউটলেট এক্সেস পয়েন্ট" : "ACTIVE OUTLETS"}</span>
                <span className="block text-2xl font-black text-indigo-950 mt-1.5">3</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">{language === "bn" ? "ঢাকা, সিলেট ও চট্টগ্রাম" : "Dhaka, Sylhet, Chittagong"}</span>
              </div>
              <div className="bg-white border p-5 rounded-3xl text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === "bn" ? "নিরাপত্তা অডিট স্কোর" : "SECURITY AUDIT"}</span>
                <span className="block text-2xl font-black text-emerald-600 mt-1.5">A+ SECURE</span>
                <span className="text-[10px] text-emerald-500 font-bold block mt-1">2FA & OAuth Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add User Form */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left h-fit">
                <h3 className="font-black text-gray-950 text-sm border-b pb-3 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>{language === "bn" ? "নতুন এন্টারপ্রাইজ ব্যবহারকারী তৈরি" : "Register Enterprise User"}</span>
                </h3>

                <form onSubmit={handleAddEnterpriseUser} className="space-y-4 text-xs">
                  <div>
                    <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "ব্যবহারকারীর সম্পূর্ণ নাম" : "Full Name"} *</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder={language === "bn" ? "উদা: আরিফুল ইসলাম" : "e.g., Ariful Islam"}
                      className="w-full border border-slate-200 p-3 rounded-xl font-bold focus:border-indigo-500 focus:outline-none bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "গুগল ওয়ার্কস্পেস ইমেইল (Google Email)" : "Workspace Email"} *</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@gmail.com / domain.dms"
                      className="w-full border border-slate-200 p-3 rounded-xl font-mono font-semibold focus:border-indigo-500 focus:outline-none bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "ভূমিকা (Role)" : "Access Role"}</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-white focus:outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="sr">Sales Rep (SR)</option>
                        <option value="dsr">DSR (Delivery sales)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "আউটলেট লোকেশন" : "Mapped Outlet"}</label>
                      <select
                        value={newUserOutlet}
                        onChange={(e) => setNewUserOutlet(e.target.value)}
                        className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-white focus:outline-none"
                      >
                        <option value="Dhaka Outlet HQ">Dhaka Outlet HQ</option>
                        <option value="Sylhet Warehouse">Sylhet Warehouse</option>
                        <option value="Chittagong Outlet">Chittagong Outlet</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl transition-all cursor-pointer shadow-sm text-center"
                  >
                    + {language === "bn" ? "ব্যবহারকারী তৈরি করুন" : "Provision User Profile"}
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left lg:col-span-2">
                <h3 className="font-black text-gray-950 text-sm border-b pb-3 mb-4 flex items-center justify-between">
                  <span>{language === "bn" ? "নিবন্ধিত ব্যবহারকারী এবং ডিভাইস লক অবস্থা" : "Authorized Team Members & Authentication Logs"}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">Offline Sync Security Active</span>
                </h3>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {enterpriseUsers.map((u: any) => (
                    <div key={u.id} className="p-4 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-700 shrink-0 mt-0.5 font-bold text-xs uppercase">
                          {u.name.substring(0,2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">{u.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                              u.role === "admin" ? "bg-red-50 text-red-700 border border-red-100" :
                              u.role === "manager" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                              u.role === "sr" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border"
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{u.email}</span>
                          <span className="text-[10px] text-gray-500 font-bold block mt-1">{language === "bn" ? "আউটলেট:" : "Outlet:"} <strong className="text-slate-800">{u.outlet}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1 font-sans text-right shrink-0">
                        <span className="text-[10px] text-gray-400 font-medium block">{language === "bn" ? "সর্বশেষ লগইন:" : "Last Login:"} <strong className="text-slate-700">{u.lastLogin}</strong></span>
                        <div className="text-[10px] text-indigo-600 font-mono font-semibold block mt-0.5">
                          Token: <span className="text-slate-600 font-bold bg-slate-100 px-1 py-0.5 rounded">{u.sessionToken}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.name)}
                          className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl cursor-pointer ${
                            u.status === "Active" ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {u.status === "Active" ? (language === "bn" ? "একটিভ" : "Active") : (language === "bn" ? "লকড" : "Locked")}
                        </button>

                        {u.sessionToken !== "N/A" && (
                          <button
                            onClick={() => revokeUserToken(u.id, u.name)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-extrabold px-3 py-1.5 rounded-xl cursor-pointer"
                            title="Revoke Device Access"
                          >
                            {language === "bn" ? "ডিভাইস বাতিল" : "Revoke Token"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Security Audit Trail Log */}
            <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl text-left">
              <h3 className="font-extrabold text-white text-sm border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🔐 {language === "bn" ? "লাইভ এন্টারপ্রাইজ সিকিউরিটি অডিট ও অপারেশনাল লগ" : "Live Enterprise Security Audit & OAuth Logs"}</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase font-black tracking-widest animate-pulse">SYSTEM SECURED</span>
              </h3>

              <div className="space-y-2 font-mono text-[11px] text-slate-300 max-h-[150px] overflow-y-auto pr-1">
                {enterpriseLogs.map((log: any, index: number) => (
                  <div key={`${log.id}-${index}`} className="flex flex-col md:flex-row md:items-center justify-between gap-1 border-b border-slate-800/40 pb-2">
                    <div className="flex items-start md:items-center gap-2">
                      <span className="text-indigo-400 shrink-0 font-medium font-sans">[{log.time}]</span>
                      <span className="text-yellow-400/90 font-bold uppercase shrink-0 bg-yellow-400/10 px-1 py-0.5 rounded text-[9px]">[OPERLOG]</span>
                      <span className="text-slate-100 font-medium">{log.msg}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{language === "bn" ? "কর্তৃপক্ষ:" : "Supervisior:"} {log.user}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: MOBILE APP ACCESS & COORDINATES SYNC */}
        {activeTab === "mobile_access" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="mobile-access-panel"
          >
            {/* Quick Banner & Download App section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* App Download Center Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-6 rounded-3xl border border-indigo-950 shadow-xl text-left text-white flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="p-2 w-fit bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">OFFICIAL DMS APP</span>
                    <h3 className="text-lg font-black mt-1">Samira Traders DMS</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {language === "bn" 
                        ? "মাঠ পর্যায়ের সেলস প্রতিনিধিদের (SR) অর্ডার ও লোকেশন ট্র্যাক করার জন্য আন্ড্রয়েড ও আইওএস এপ্লিকেশন ডাউনলোড।" 
                        : "Download the authentic lightweight application for SR/DSR real-time invoice posting and physical outlet mapping."}
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 mt-5">
                  {/* Simulated QR block */}
                  <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center relative group">
                    <div className="w-full h-full bg-slate-900 rounded-xs flex flex-wrap p-0.5 opacity-90">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`w-1/4 h-1/4 ${i % 3 === 0 || i % 5 === 0 ? "bg-white" : "bg-slate-950"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-indigo-300 font-extrabold block">v2.4.1 (Stable Release)</span>
                    <p className="text-[11px] font-bold text-white mt-1">Scan QR Code on device</p>
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={() => toast.success("Downloading Android APK (24MB)...")} className="bg-white hover:bg-slate-100 text-slate-950 text-[9px] font-black py-1 px-2.5 rounded cursor-pointer">Android .APK</button>
                      <button onClick={() => toast.success("Redirecting to Apple TestFlight...")} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black py-1 px-2.5 rounded cursor-pointer">iOS Apple</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Push Warning Alert Broadcaster to Active Handsets */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-950 text-sm border-b pb-3 mb-4 flex items-center gap-1.5">
                    <Bell className="w-4.5 h-4.5 text-indigo-600" />
                    <span>{language === "bn" ? "মাঠ পর্যায়ের কর্মকর্তা দের পুশ এলার্ট ও রিমাইন্ডার ব্রডকাস্ট" : "Direct Push Warning Alert Broadcast to Active Handsets"}</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-semibold mb-4">
                    {language === "bn" 
                      ? "সকল একটিভ সেলস রিপ্রেজেন্টেティブস (SR) দের মোবাইলের নোটিফিকেশন স্ক্রিনে সরাসরি জরুরি বার্তা প্রেরণ করুন।"
                      : "Send customized real-time push messages immediately visible on remote locking lockscreens of active SR handheld terminals."}
                  </p>

                  <form onSubmit={handleSendBroadcast} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">{language === "bn" ? "জরুরি বার্তার বিবরণ (Push Notice)" : "Critical Notification Message"}</label>
                      <textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder={language === "bn" ? "উদা: আজ ব্যাংক আওয়ার শেষ হওয়ার আগেই বকেয়া আদায়ের খতিয়ান চালান এন্ট্রি করুন!" : "e.g., Deliver all Runner Bolt parts shipments by 4:00 PM!"}
                        rows={2}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-indigo-500 font-sans bg-white"
                        required
                      />
                    </div>

                    <div className="flex gap-2.5 justify-end">
                      <button
                        type="submit"
                        disabled={isBroadcasting}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1.5"
                      >
                        {isBroadcasting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === "bn" ? "ডিভাইস সমূহে ব্রডকাস্ট করুন" : "Broadacst Push Notice"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Handset Devices Table & Map tracking logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Device logs table */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left lg:col-span-2">
                <h3 className="font-extrabold text-slate-900 text-sm border-b pb-3 mb-4 flex items-center gap-1.5">
                  <Smartphone className="w-4.5 h-4.5 text-indigo-600" />
                  <span>{language === "bn" ? "নিবন্ধিত পোর্টেবল হ্যান্ডসেট এবং হার্ডওয়্যার স্ট্যাটাস" : "Registered Field Devices & Hardware Status Monitor"}</span>
                </h3>

                <div className="overflow-x-auto pr-1">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] uppercase font-extrabold text-slate-400 border-b">
                        <th className="p-3">Employee SR</th>
                        <th className="p-3">Mobile Handset OS</th>
                        <th className="p-3 text-center">Power</th>
                        <th className="p-3">Coordinates Last Sync</th>
                        <th className="p-3 text-right">App State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {mobileDevices.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50/40">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800 block text-[11px]">{d.srName}</span>
                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">Token: mdv-{d.id}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-700 block text-[11px]">{d.deviceModel}</span>
                            <span className="text-[10px] text-indigo-600 font-semibold block mt-1">{d.os} • {d.appVersion}</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                d.battery > 50 ? "bg-emerald-50 text-emerald-800" :
                                d.battery > 20 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
                              }`}>
                                {d.battery}%
                              </span>
                              <span className="text-[9px] text-slate-400">{d.lastPing}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-[10px] font-bold max-w-xs truncate" title={d.locationSync}>
                            {d.locationSync}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => toggleDeviceAccess(d.id, d.srName)}
                              className={`text-[9px] font-black rounded-lg px-2 py-1.5 border cursor-pointer ${
                                d.status === "Authorized" ? "bg-emerald-50 text-emerald-800 border-emerald-150 hover:bg-emerald-100" : "bg-red-50 text-red-800 border-red-150 hover:bg-red-100"
                              }`}
                            >
                              {d.status}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Route Tracker & Simulated coordinate checks */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm border-b pb-3 mb-4 flex items-center gap-1.5">
                    <MapPin className="w-4.5 h-4.5 text-indigo-600" />
                    <span>{language === "bn" ? "জিপিএস লোকেশন ট্র্যাকিং অ্যান্ড সিঙ্ক" : "Real-time Sales Rep GPS Tracking Portal"}</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {language === "bn" 
                      ? "জিপিএস ডাটা সিঙ্ক হচ্ছে ১৫ মিনিট পর পর। ট্র্যাকিং ম্যাপ সিমুলেশন সচল রয়েছে।" 
                      : "Satellite coordinate feed polling actively. Sync telemetry checklist configuration:"}
                  </p>

                  {/* Slider config */}
                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-black">
                      <span className="text-slate-600">{language === "bn" ? "জিপিএস সিঙ্ক ফ্রিকোয়েন্সি" : "GPS Sync Interval"}</span>
                      <span className="bg-slate-100 px-2 py-1 rounded text-indigo-600 text-[10px]">{trackingSlider} mins</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={trackingSlider}
                      onChange={(e) => setTrackingSlider(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-1 bg-slate-100 rounded cursor-pointer"
                    />
                  </div>

                  {/* Tracker visual simulations logs */}
                  <div className="mt-5 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">{language === "bn" ? "লাইভ লোকেশন ফিড লগ" : "Live Cell-tower Location Pings"}</span>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                      {livePings.map((lp: any, idx: number) => (
                        <div key={lp.id || idx} className="p-2 border border-slate-100 bg-slate-50/50 rounded-xl flex items-start gap-2 text-left">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 animate-pulse shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-500 font-semibold font-mono">[{lp.time}] {lp.sr}</span>
                            <p className="text-[10px] text-slate-800 font-bold leading-relaxed">{lp.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={triggerGPSSyncCheck}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black border border-indigo-100 rounded-2xl cursor-pointer text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === "bn" ? "তাত্ক্ষণিক জিপিএস ট্র্যাকিং পরীক্ষা" : "Run Satellite GPS Sync check"}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: SECURE PAYMENTS */}
        {activeTab === "payments" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="secure-payments-panel"
          >
            {/* Gateway switches row */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left">
              <h3 className="font-extrabold text-slate-900 text-sm border-b pb-3 mb-4 flex items-center gap-1.5">
                <Lock className="w-4.5 h-4.5 text-indigo-600" />
                <span>{language === "bn" ? "ডিজিটাল মার্চেন্ট পেমেন্ট গেটওয়ে কনফিগারেশন" : "B2B Payment Gateway Integrations in Bangladesh"}</span>
              </h3>
              <p className="text-xs text-gray-400 font-semibold mb-5">
                {language === "bn" 
                  ? "গ্রাহক এবং ডিলার রিটেইল আউটলেট বকেয়া আদায়ের জন্য আপনার পেমেন্ট এপিআই সক্রিয়/নিষ্ক্রিয় করুন।"
                  : "Toggle secure digital channels to streamline outstanding collection loops with instant settlement ledger sync:"}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div 
                  onClick={() => toggleGatewayState("bkash")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    paymentConfigs.bkash ? "bg-pink-50/50 border-pink-200" : "bg-slate-50 text-slate-400 border-slate-150"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-pink-600 font-sans tracking-wide">bKash Pay</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-850">{paymentConfigs.bkash ? "API ACTIVE" : "DISABLED"}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${paymentConfigs.bkash ? "bg-pink-600 animate-pulse" : "bg-slate-400"}`} />
                  </div>
                </div>

                <div 
                  onClick={() => toggleGatewayState("nagad")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    paymentConfigs.nagad ? "bg-orange-50/50 border-orange-200" : "bg-slate-50 text-slate-400 border-slate-150"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-orange-600 font-sans tracking-wide">Nagad B2B</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-850">{paymentConfigs.nagad ? "API ACTIVE" : "DISABLED"}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${paymentConfigs.nagad ? "bg-orange-600 animate-pulse" : "bg-slate-400"}`} />
                  </div>
                </div>

                <div 
                  onClick={() => toggleGatewayState("sslcommerz")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    paymentConfigs.sslcommerz ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-150"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-blue-600 font-sans tracking-wide">SSLCommerz</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-850">{paymentConfigs.sslcommerz ? "API ACTIVE" : "DISABLED"}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${paymentConfigs.sslcommerz ? "bg-blue-600 animate-pulse" : "bg-slate-400"}`} />
                  </div>
                </div>

                <div 
                  onClick={() => toggleGatewayState("setleInstant")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    paymentConfigs.setleInstant ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 text-slate-400 border-slate-150"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-indigo-600 font-sans tracking-wide">Settle Instant</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-850">{paymentConfigs.setleInstant ? "CONNECTED" : "DISABLED"}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${paymentConfigs.setleInstant ? "bg-indigo-600 animate-pulse" : "bg-slate-400"}`} />
                  </div>
                </div>

                <div 
                  onClick={() => toggleGatewayState("creditCard")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    paymentConfigs.creditCard ? "bg-slate-50 border-gray-200" : "bg-slate-50 text-slate-400 border-slate-150"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-slate-600 font-sans tracking-wide">Visa / Card</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-850">{paymentConfigs.creditCard ? "API ACTIVE" : "DISABLED"}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${paymentConfigs.creditCard ? "bg-slate-650 animate-pulse" : "bg-slate-400"}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
              {/* Payment Link creator form */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left h-fit">
                <h3 className="font-extrabold text-slate-900 text-sm border-b pb-3 mb-4 flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-indigo-600" />
                  <span>{language === "bn" ? "নিরাপদ ওয়ান-টাইম পেমেন্ট লিংক তৈরি" : "Invoice payment-link builder"}</span>
                </h3>

                <form onSubmit={handleGeneratePaymentLink} className="space-y-4 text-xs">
                  <div>
                    <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "গ্রাহক নির্বাচন করুন" : "Select Debtor Customer"} *</label>
                    <select
                      value={selectedCustomerIdForPayment}
                      onChange={(e) => setSelectedCustomerIdForPayment(e.target.value)}
                      className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-white focus:outline-none"
                      required
                    >
                      <option value="">{language === "bn" ? "গ্রাহক তালিকা..." : "Select Customer..."}</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatNumber(Math.abs(c.balance || 0))} ৳)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "বকেয়া আদায় এমাউন্ট (৳)" : "Invoice Amount (BDT)"} *</label>
                    <input
                      type="number"
                      value={customInvoiceAmount || ""}
                      onChange={(e) => setCustomInvoiceAmount(Number(e.target.value))}
                      placeholder="e.g., 50000"
                      className="w-full border border-slate-200 p-3 rounded-xl font-mono font-bold focus:border-indigo-500 focus:outline-none bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "পেমেন্ট গেটওয়ে চ্যানেল" : "Securing Merchant Partner"}</label>
                    <select
                      value={selectedGatewayForLink}
                      onChange={(e) => setSelectedGatewayForLink(e.target.value)}
                      className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-white focus:outline-none"
                    >
                      <option value="bKash Merchant Pay">bKash Merchant Pay B2B</option>
                      <option value="Nagad Personal Pay">Nagad Account Check-In</option>
                      <option value="SSLCommerz Visa/Mastercard">SSLCommerz Card Network</option>
                      <option value="Settle Bank Transfer">Settle Instant ACH Bank</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl transition-all cursor-pointer shadow-sm text-center font-sans text-xs"
                  >
                    + {language === "bn" ? "ডিজিটাল পেমেন্ট কোড জেনারেট" : "Issue Secured Short-Link"}
                  </button>
                </form>

                {paymentLinkCreated && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4.5 bg-indigo-50/60 border border-indigo-150 rounded-2xl font-sans"
                  >
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">SECURED SHORT-LINK BUILT</span>
                    <div className="flex gap-1 items-center mt-2">
                      <input
                        type="text"
                        value={paymentLinkCreated}
                        readOnly
                        className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-[10px] font-mono tracking-tight font-bold text-indigo-950 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentLinkCreated || "");
                          toast.success(language === "bn" ? "লিংক কপি করা হয়েছে!" : "Secure URL copied to clipboard!");
                        }}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer text-xs"
                        title="Copy Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-1.5 mt-3">
                      <button
                        onClick={() => {
                          toast.success(language === "bn" ? "মেসেজ বিল পাঠানো হয়েছে!" : "SMS Invoice broadcast dispatched down to debtor cellphone!");
                          setPaymentLinkCreated(null);
                        }}
                        className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-[10px] text-slate-800 font-extrabold border rounded-xl"
                      >
                        ✉️ SMS Notice
                      </button>
                      <button
                        onClick={() => {
                          toast.success(language === "bn" ? "হোয়াটসঅ্যাপ নোটিশ সাকসেস!" : "WhatsApp notification broadcast complete!");
                          setPaymentLinkCreated(null);
                        }}
                        className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-[10px] text-slate-800 font-extrabold border rounded-xl"
                      >
                        💬 WhatsApp Link
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Outstanding invoices and payment link database */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs text-left lg:col-span-2">
                <h3 className="font-extrabold text-slate-900 text-sm border-b pb-3 mb-4 flex items-center justify-between">
                  <span>{language === "bn" ? "প্রেরিত পেমেন্ট লিংক এবং আদায় অবস্থা" : "Active Invoice Quick Links & Secured Ledger Logs"}</span>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2.5 py-1 rounded font-black border border-emerald-100">PCI-DSS Compliant</span>
                </h3>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {paymentLinks.map((link: any) => (
                    <div key={link.id} className="p-4 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-all">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 text-[11px] block">{link.customerName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-md font-bold">{link.linkId}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono tracking-tight">{link.phone} • Date: {link.date}</p>
                        <p className="text-[10px] text-indigo-700 font-semibold">{language === "bn" ? "রিসিভার মার্চেন্ট:" : "Secured Channel:"} <strong className="text-slate-850">{link.gateway}</strong></p>
                      </div>

                      <div className="flex md:flex-col items-start md:items-end gap-1 font-sans shrink-0">
                        <span className="text-xs font-black text-slate-950 font-mono block">{formatNumber(link.amount)} ৳</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] px-2 py-0.5 rounded-sm font-black uppercase tracking-tight ${
                            link.status === "Pending" ? "bg-amber-50 text-amber-850 border border-amber-100" : "bg-emerald-50 text-emerald-850 border border-emerald-150"
                          }`}>
                            {link.status === "Pending" ? (language === "bn" ? "বকেয়া পেন্ডিং" : "Pending") : (language === "bn" ? "অনুমোদিত ও সিঙ্কড" : "Paid Secure")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 border-t md:border-t-0 pt-2.5 md:pt-0 shrink-0">
                        {link.status === "Pending" ? (
                          <button
                            onClick={() => launchSandboxCheckout(link)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1"
                          >
                            <span>⚡ Pay Simulator</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[9px] font-mono tracking-tighter">SHA-256 Verified</span>
                        )}
                        <button
                          onClick={() => {
                            setPaymentLinks((prev: any) => prev.filter((l: any) => l.id !== link.id));
                            toast.success("পেমেন্ট রেকর্ড মুছে ফেলা হয়েছে।");
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg cursor-pointer transition-colors"
                          title="Delete Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: CUSTOM DASHBOARD SETTINGS */}
        {activeTab === "custom_dashboard" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            key="config-panel"
          >
            <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-sm space-y-6 max-w-3xl mx-auto">
              <div className="border-b pb-4">
                <h3 className="font-black text-gray-950 text-base flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  <span>{language === "bn" ? "কাস্টম ড্যাশবোর্ড কেপিআই লক্ষ্য ও থ্রেশহোল্ড সেটিং" : "Customizable Dashboard Targets & Notification Thresholds Settings"}</span>
                </h3>
                <p className="text-gray-450 text-xs mt-1">
                  {language === "bn" 
                    ? "আপনার শো-রুমের দৈনন্দিন ক্রিয়াকলাপের জন্য কাস্টম মেট্রিক সীমা এবং রিয়েল-টাইম সতর্কতা সীমা নির্ধারণ করুন।"
                    : "Tune your target sales volumes, safety warning benchmarks and dashboard card configurations instantly."}
                </p>
              </div>

              <div className="space-y-6">
                {/* LOW STOCK WARNING THRESHOLD */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-slate-700">{language === "bn" ? "নূন্যতম ইনভেন্টরি স্টক সতর্কবার্তা সীমা" : "Low Stock Alert Minimum Threshold Limit"}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{formatNumber(lowStockLimit)} {language === "bn" ? "পিস" : "Units"}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(Number(e.target.value))}
                    className="w-full text-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 font-bold">
                    {language === "bn" 
                      ? "যেকোনো খুচরা স্পেয়ার পার্টসের মজুদ এই সীমার নিচে নামলে লাল নোটিফিকেশন এলার্ট দেখাবে।"
                      : "Trigger automatic catalog highlight alerts when motor-parts stock dips below this limit."}
                  </p>
                </div>

                {/* MONTHLY REVENUE TARGETS */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-slate-700">{language === "bn" ? "মাসিক বিক্রয় লক্ষ্যমাত্রা (BDT Quota Target)" : "Monthly Gross Sales Revenue Target Quota"}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{formatNumber(salesTarget.toLocaleString())} ৳</span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="2000000"
                    step="100000"
                    value={salesTarget}
                    onChange={(e) => setSalesTarget(Number(e.target.value))}
                    className="w-full text-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 font-bold">
                    {language === "bn" 
                      ? "প্রধান ইন্টারেক্টিভ চার্টে লক্ষ্য পূরণ শতাংশ এবং দৈনিক সেলস প্রগ্রেস ট্র্যাক করতে সাহায্য করবে।"
                      : "Define dealership benchmarks for progression visualization in primary charts and dashboards."}
                  </p>
                </div>

                {/* REMINDER ALERTS DAYS GRACE */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-slate-700">{language === "bn" ? "বকেয়া তাগাদা রিমাইন্ডার পাঠানোর গ্রেস ডে পিরিয়ড" : "Outstanding Follow-Up Grace Period Days"}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{formatNumber(remindersDays)} {language === "bn" ? "দিন" : "Days"}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    step="1"
                    value={remindersDays}
                    onChange={(e) => setRemindersDays(Number(e.target.value))}
                    className="w-full text-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 font-bold">
                    {language === "bn" 
                      ? "খুচরা ক্রেতা দের ক্রয়ের পর কত দিনের মধ্যে প্রথম স্বয়ংক্রিয় রিমাইন্ডার পাঠানো হবে।"
                      : "Outstanding payment calendar alerts threshold for credit limit review checklists."}
                  </p>
                </div>

                {/* VISIBLE DASHBOARD CARDS */}
                <div className="space-y-3 text-left border-t pt-5">
                  <span className="text-xs font-black text-slate-700 block mb-2">{language === "bn" ? "ড্যাশবোর্ডে দৃশ্যমান উইজেটস" : "Toggle Visible Dashboard Live Metric Cards"}</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleMetric("sales")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        selectedDashboardMetrics.includes("sales") ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      📈 {language === "bn" ? "বিক্রয় মেট্রিক" : "Sales Revenue Card"}
                    </button>
                    <button
                      onClick={() => toggleMetric("cash")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        selectedDashboardMetrics.includes("cash") ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      💰 {language === "bn" ? "সংগৃহীত টাকা ক্যাশ" : "Collections Cash Card"}
                    </button>
                    <button
                      onClick={() => toggleMetric("leads")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        selectedDashboardMetrics.includes("leads") ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      🎯 {language === "bn" ? "সিআরএম লিড মেট্রিক" : "CRM Lead Pipeline Card"}
                    </button>
                    <button
                      onClick={() => toggleMetric("stock")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        selectedDashboardMetrics.includes("stock") ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      📦 {language === "bn" ? "ইনভেন্টরি পণ্য মজুদ" : "Inventory Stock Tracker Card"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 text-right">
                <button
                  onClick={saveTargetConfigs}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl cursor-pointer shadow-md active:scale-95 transition-all text-center"
                >
                  {language === "bn" ? "পরামিতি সমূদ্র সংরক্ষণ করুন" : "Save customizable thresholds"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* LEAD CREATION MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-6 max-w-md w-full border text-left space-y-4">
            <h3 className="font-extrabold text-gray-900 text-base">{language === "bn" ? "নতুন সম্ভাব্য কাস্টমার লিড যুক্ত করুন" : "Add Potential Sales CRM Lead"}</h3>
            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "গ্রাহকের নাম" : "Customer Name"} *</label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder={language === "bn" ? "যেমন: আব্দুর রহমান" : "e.g., Abdur Rahman"}
                  className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "মোবাইল নম্বর" : "Phone Number"} *</label>
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder={language === "bn" ? "যেমন: 01712xxxxxx" : "e.g., 01712xxxxxx"}
                  className="w-full border border-slate-250 rounded-xl p-3 font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "আকাঙ্ক্ষিত মোটরসাইকেল মডেল" : "Interested Bike Model"}</label>
                  <input
                    type="text"
                    value={leadModel}
                    onChange={(e) => setLeadModel(e.target.value)}
                    placeholder="e.g., Runner AD80S"
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "সম্ভাব্য ডিল ভ্যালু (৳)" : "Estimated Value"}</label>
                  <input
                    type="number"
                    value={leadVal}
                    onChange={(e) => setLeadVal(Number(e.target.value))}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "সার্ভিস বা কাস্টমার ডিসকাশন নোট" : "Customer Notes"}</label>
                <textarea
                  value={leadNote}
                  onChange={(e) => setLeadNote(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                />
              </div>

              <div className="flex gap-2.5 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold cursor-pointer text-xs"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer text-xs"
                >
                  {language === "bn" ? "সংরক্ষণ করুন" : "Add Deal"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}


      {/* APPOINTMENT CREATION MODAL */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-6 max-w-md w-full border text-left space-y-4">
            <h3 className="font-extrabold text-gray-900 text-base">{language === "bn" ? "নতুন আলোচনা বা বাইক ডেলিভারি অ্যাপয়েন্টমেন্ট শিডিউল" : "Schedule New Meetup/Delivery"}</h3>
            <form onSubmit={handleAddApp} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "আউটলেট বা কাস্টমারের নাম" : "Customer Outlet Name"} *</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "যোগাযোগ নম্বর" : "Contact Phone"}</label>
                  <input
                    type="tel"
                    value={appPhone}
                    onChange={(e) => setAppPhone(e.target.value)}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "মিটিং বা ডেলিভারি ক্যাটাগরি" : "Meeting Type"}</label>
                  <select
                    value={appType}
                    onChange={(e) => setAppType(e.target.value as any)}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold bg-white"
                  >
                    <option value="Service">{language === "bn" ? "সার্ভিসিং অ্যাপয়েন্টমেন্ট" : "Service Booking"}</option>
                    <option value="Delivery">{language === "bn" ? "নতুন মোটরসাইকেল চালান ডেলিভারি" : "Bike Delivery"}</option>
                    <option value="Dealer Meet">{language === "bn" ? "ডিলার রিটেইলার পরামর্শ আলোচনা" : "Dealer Meetup"}</option>
                    <option value="Sales Call">{language === "bn" ? "সম্ভাব্য কাস্টমার কল" : "Sales Discussion"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "তারিখ ও সঠিক সময়" : "DateTime Scheduler"} *</label>
                  <input
                    type="text"
                    value={appTime}
                    onChange={(e) => setAppTime(e.target.value)}
                    placeholder="e.g., 2026-06-12 11:30 AM"
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "মিটিং এর নির্ধারিত স্থান" : "Target Venue"}</label>
                  <input
                    type="text"
                    value={appLoc}
                    onChange={(e) => setAppLoc(e.target.value)}
                    placeholder={language === "bn" ? "শোরুম অথবা হেড অফিস" : "Main Showroom"}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold cursor-pointer text-xs"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer text-xs"
                >
                  {language === "bn" ? "অ্যাপয়েন্টমেন্ট সংরক্ষন করুন" : "Register Appointment"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}


      {/* SERVICE WORKORDER CREATION MODAL */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-6 max-w-md w-full border text-left space-y-4">
            <h3 className="font-extrabold text-gray-900 text-base">{language === "bn" ? "নতুন বাইক ডায়াগনস্টিক ওয়ার্ক ও সার্ভিস অর্ডার" : "Open New Motorcycle Jobcard"}</h3>
            <form onSubmit={handleAddJob} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "কাস্টমারের নাম" : "Customer Owner Name"} *</label>
                  <input
                    type="text"
                    value={jobCustName}
                    onChange={(e) => setJobCustName(e.target.value)}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "গাড়ি রেজিঃ নাম্বার" : "License Registration plate"} *</label>
                  <input
                    type="text"
                    value={jobPlate}
                    onChange={(e) => setJobPlate(e.target.value)}
                    placeholder="e.g., DM-La-12-3211"
                    className="w-full border border-slate-250 rounded-xl p-3 font-mono font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "মোটরসাইকেলের মডেল" : "Motorcycle Brand Model"} *</label>
                  <input
                    type="text"
                    value={jobModel}
                    onChange={(e) => setJobModel(e.target.value)}
                    placeholder="e.g., Runner Bolt 165R"
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "বর্তমান রিডিং মাইলেজ (KM)" : "Current Mileage"}</label>
                  <input
                    type="number"
                    value={jobMil}
                    onChange={(e) => setJobMil(Number(e.target.value))}
                    className="w-full border border-slate-250 rounded-xl p-3 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "সার্ভিসিং ক্যাটাগরি" : "Service Category type"}</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as any)}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold bg-white"
                  >
                    <option value="Free Service">{language === "bn" ? "১ম/২য়/৩য় ফ্রি সার্ভিসিং" : "Free Service"}</option>
                    <option value="Paid Engine Repair">{language === "bn" ? "পেইড ইঞ্জিন অভারহোলিং প্লাস পার্টস" : "Paid Engine Repair"}</option>
                    <option value="Periodical Wash & Lube">{language === "bn" ? "জেনারেল ওয়াশ ও অয়েল চেঞ্জ" : "Wash & Lube Lubricating"}</option>
                    <option value="Suspension Fix">{language === "bn" ? "বডি চেসিস ও সাসপেনশন ফিক্স" : "Chassis Suspension Fix"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "নিয়োজিত টেকনিশিয়ান" : "Assigned Mechanic Mechanic"}</label>
                  <input
                    type="text"
                    value={jobMech}
                    onChange={(e) => setJobMech(e.target.value)}
                    placeholder="e.g., ওস্তাদ কালু মিয়া"
                    className="w-full border border-slate-250 rounded-xl p-3 font-sans font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1.5 text-left">
                <input
                  type="checkbox"
                  id="job-warranty"
                  checked={jobWarranty}
                  onChange={(e) => setJobWarranty(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <label htmlFor="job-warranty" className="font-extrabold text-[11px] text-slate-700">
                  {language === "bn" ? "এই মোটরসাইকেলের পার্টস ও বডি কি ওয়ারেন্টির অধীনে?" : "Is spare-parts Diagnostic covered by OEM Warranty?"}
                </label>
              </div>

              <div className="flex gap-2.5 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold cursor-pointer text-xs"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer text-xs"
                >
                  {language === "bn" ? "জব-কার্ড খোলেন" : "Issue Jobcard Workorder"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}


      {/* COMPLIANCE DOCUMENT VAULT MODAL */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-6 max-w-md w-full border text-left space-y-4">
            <h3 className="font-extrabold text-gray-900 text-base">{language === "bn" ? "কম্প্লায়েন্স ভল্টে নতুন সরকারি দলিল বা লাইসেন্স আপলোড" : "Add Compliance Document to Vault"}</h3>
            <form onSubmit={handleAddDoc} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "দলিল বা লাইসেন্স টাইটেল" : "Document License Title"} *</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g., Trade License 2026-27"
                  className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "দলিল রেজিঃ কোড/নম্বর" : "Document Reference Code"} *</label>
                  <input
                    type="text"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    placeholder="e.g., NBR-B-99120"
                    className="w-full border border-slate-250 rounded-xl p-3 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "প্রদানকারী কর্তৃপক্ষ" : "Issuing Authority Agency"}</label>
                  <input
                    type="text"
                    value={docAuth}
                    onChange={(e) => setDocAuth(e.target.value)}
                    placeholder="e.g., Dhaka North City Corporation"
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "মেয়াদ উত্তীর্ণ তারিখ (Expiry)" : "Expiry Date Scheduler"}</label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-500 font-extrabold block mb-1">{language === "bn" ? "চলতি কম্প্লায়েন্স অবস্থা" : "Audited Status Status"}</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value as any)}
                    className="w-full border border-slate-250 rounded-xl p-3 font-bold bg-white"
                  >
                    <option value="Active (Compliant)">{language === "bn" ? "সক্রিয় রয়েছে (Compliant)" : "Active (Compliant)"}</option>
                    <option value="Expiring Soon">{language === "bn" ? "অচিরেই মেয়াদ শেষ হবে" : "Expiring Soon"}</option>
                    <option value="Audited & Verified">{language === "bn" ? "অডিটেড এবং অনুমোদিত" : "Audited & Verified"}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold cursor-pointer text-xs"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer text-xs"
                >
                  {language === "bn" ? "ভল্টে আপলোড করুন" : "Upload Document to Vault"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SECURE CHECKOUT SANDBOX SIMULATOR MODAL */}
      {showSandboxModal && sandboxActiveLink && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-slate-100 text-left font-sans"
          >
            {/* Real bKash style pink/orange header based on gateway selection */}
            <div className={`p-5 text-white flex justify-between items-center ${
              sandboxActiveLink.gateway.toLowerCase().includes("bkash") ? "bg-gradient-to-r from-pink-600 to-pink-700" :
              sandboxActiveLink.gateway.toLowerCase().includes("nagad") ? "bg-gradient-to-r from-orange-550 to-red-650" :
              "bg-gradient-to-r from-slate-900 to-indigo-950"
            }`}>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  {sandboxActiveLink.gateway.toUpperCase()} SECURE GATEWAY
                </span>
              </div>
              <button
                onClick={() => setShowSandboxModal(false)}
                className="text-white/80 hover:text-white font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Order valuation snapshot */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450 block">DMS MERCHANT BILL</span>
                <span className="text-sm font-black text-slate-900 block">{sandboxActiveLink.customerName}</span>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 mt-2">
                  <span className="text-[10px] text-gray-500 font-extrabold">TRANSACTION ID:</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-700">{sandboxActiveLink.linkId}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-gray-500 font-extrabold">SECURED VALUE:</span>
                  <span className="text-xs font-black text-rose-600">{formatNumber(sandboxActiveLink.amount)} ৳</span>
                </div>
              </div>

              {/* Step 1: Mobile handset wallet login */}
              {sandboxStep === 1 && (
                <form onSubmit={handleSandboxSubmitMobile} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="text-slate-500 font-extrabold block mb-1">
                      {sandboxActiveLink.gateway.toLowerCase().includes("bkash") ? "বিকাশ একাউন্ট নম্বর (bKash Wallet Number)" :
                       sandboxActiveLink.gateway.toLowerCase().includes("nagad") ? "নগদ মোবাইল নম্বর (Nagad Wallet Number)" :
                       "মোবাইল নম্বর (Customer Handset Wallet Mobile)"}
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={sandboxMobileNumber}
                      onChange={(e) => setSandboxMobileNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g., 01712345678"
                      className="w-full text-center border-2 border-slate-200 rounded-xl p-3.5 text-base font-mono font-black focus:border-indigo-600 focus:outline-none bg-white text-slate-900 tracking-widest"
                      required
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 leading-normal text-center">
                    By clicking continue, you agree to secure tokenization terms. This is a fully functional simulation interface verified by PCI-DSS.
                  </p>

                  <button
                    type="submit"
                    disabled={sandboxProcessing}
                    className="w-full py-4 text-xs font-black tracking-wider uppercase text-white bg-slate-900 hover:bg-black rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1"
                  >
                    {sandboxProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>CONTINUE →</span>
                  </button>
                </form>
              )}

              {/* Step 2: Custom OTP Verification */}
              {sandboxStep === 2 && (
                <form onSubmit={handleSandboxSubmitOtp} className="space-y-4 text-xs">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold block w-max mx-auto">OTP Verification Code sent to {sandboxMobileNumber}</span>
                    <p className="text-[10px] text-slate-400">
                      We sent you a verification OTP code via browser push notification! Check the top right of your screen.
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={sandboxOtp}
                      onChange={(e) => setSandboxOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="ENTER OTP: 489210"
                      className="w-full text-center border-2 border-slate-200 rounded-xl p-3.5 text-lg font-mono font-black focus:border-indigo-600 focus:outline-none bg-white text-slate-900 tracking-widest"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 text-xs font-black tracking-wider uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl cursor-pointer font-sans"
                  >
                    VERIFY CODE
                  </button>
                </form>
              )}

              {/* Step 3: Wallet secure PIN confirmation */}
              {sandboxStep === 3 && (
                <form onSubmit={handleSandboxSubmitPin} className="space-y-4 text-xs">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] bg-pink-50 text-pink-700 px-2 py-0.5 rounded font-black uppercase block w-max mx-auto">
                      API PIN CONNECTION SECURED
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Enter your secret 4 or 5-digit wallet PIN code to authorize payment settlement instantly.
                    </p>
                  </div>

                  <div>
                    <input
                      type="password"
                      maxLength={5}
                      value={sandboxPin}
                      onChange={(e) => setSandboxPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="PIN CODE (e.g., ****)"
                      className="w-full text-center border-2 border-slate-200 rounded-xl p-3.5 text-xl font-mono font-black focus:border-indigo-600 focus:outline-none bg-white text-slate-900 tracking-widest"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sandboxProcessing}
                    className="w-full py-4 text-xs font-black tracking-wider uppercase text-white bg-emerald-650 hover:bg-emerald-700 rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                  >
                    {sandboxProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>CONFIRM & PAY</span>
                  </button>
                </form>
              )}

              {/* Step 4: Checkout Success confirmation screen */}
              {sandboxStep === 4 && (
                <div className="text-center p-4 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-650 rounded-full flex items-center justify-center mx-auto scale-105 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-extrabold text-slate-900">Payment Secured!</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Funds successfully collected via <strong className="text-slate-800">{sandboxActiveLink.gateway} tokenized checkout</strong>. Daily cash ledgers updated.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-dashed font-mono text-[9px] text-left text-slate-500 space-y-1">
                    <span className="block">STATUS: SETTLED IN FULL</span>
                    <span className="block truncate">TXUUID: sha256_0x559e192f1b0a82b99fd1a</span>
                    <span className="block">COMPLIANT: ISO/IEC 27001 SECURED</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowSandboxModal(false);
                      // Trigger clean list updates
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl cursor-pointer font-sans"
                  >
                    RETURN TO DASHBOARD
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Inner helper LeadCard component
interface LeadCardProps {
  key?: React.Key;
  lead: any;
  onUpdate: (id: string, s: any) => void;
  onDelete: (id: string) => void;
}

function LeadCard({ lead, onUpdate, onDelete }: LeadCardProps) {
  const { language, formatNumber } = useLanguage();
  return (
    <div className="bg-white p-3.5 rounded-2xl shadow-2xs border border-gray-150 text-left hover:shadow transition-all relative group flex flex-col justify-between min-h-[140px]">
      <button
        onClick={() => onDelete(lead.id)}
        className="absolute top-2.5 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="space-y-1">
        <h4 className="font-extrabold text-gray-900 text-xs pr-4 leading-tight">{lead.name}</h4>
        <p className="text-[10px] text-indigo-700 font-bold font-sans">{lead.vehicleModel}</p>
        <p className="text-[10px] text-slate-500 font-mono tracking-tight">{lead.phone}</p>
        {lead.notes && (
          <p className="text-[10px] text-gray-400 font-semibold line-clamp-2 mt-1 leading-snug">{lead.notes}</p>
        )}
      </div>

      <div className="border-t border-slate-100 mt-2.5 pt-2 flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-slate-700">{formatNumber(lead.value)} ৳</span>
        <div className="flex gap-1">
          {lead.status === "new" && (
            <button
              onClick={() => onUpdate(lead.id, "contacted")}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
            >
              → {language === "bn" ? "যোগাযোগ" : "Contact"}
            </button>
          )}
          {lead.status === "contacted" && (
            <button
              onClick={() => onUpdate(lead.id, "negotiating")}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
            >
              → {language === "bn" ? "আলোচনা" : "Debate"}
            </button>
          )}
          {lead.status === "negotiating" && (
            <div className="flex gap-1">
              <button
                onClick={() => onUpdate(lead.id, "converted")}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✓ {language === "bn" ? "কনভার্ট" : "Win"}
              </button>
              <button
                onClick={() => onUpdate(lead.id, "lost")}
                className="bg-rose-50 hover:bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✗ {language === "bn" ? "ব্যর্থ" : "Lose"}
              </button>
            </div>
          )}
          {lead.status === "converted" && (
            <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
              ✓ {language === "bn" ? "বিক্রিয় হয়েছে" : "Converted"}
            </span>
          )}
          {lead.status === "lost" && (
            <button
              onClick={() => onUpdate(lead.id, "new")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
            >
              ↺ {language === "bn" ? "পুনরায় চেষ্টা" : "Retry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
