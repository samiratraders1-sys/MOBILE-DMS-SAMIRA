import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Trash2, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Printer, 
  Download, 
  Share2, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  Wand2, 
  Package, 
  PlusCircle, 
  MinusCircle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Truck,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";
import { jsPDF } from "jspdf";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";

interface SubDbViewProps {
  products: any[];
  subDbs: any[];
  addSubDb: (item: any) => Promise<void>;
  updateSubDb: (id: string, item: any) => Promise<void>;
  removeSubDb: (id: string) => Promise<void>;
  
  subDbShipments: any[];
  addSubDbShipment: (item: any) => Promise<void>;
  removeSubDbShipment: (id: string) => Promise<void>;
  
  payments: any[];
  addPayment: (item: any) => Promise<void>;
  removePayment: (id: string) => Promise<void>;
  
  accounts: any[];
  updateProduct: (id: string, item: any) => Promise<void>;
  user: any;
  role: string;
  subDbsLoading?: boolean;
  subDbSettings?: any[];
  updateSubDbSetting?: (id: string, item: any) => Promise<void>;
  addSubDbSetting?: (item: any) => Promise<void>;
}

export default function SubDbView({
  products = [],
  subDbs = [],
  addSubDb,
  updateSubDb,
  removeSubDb,
  subDbShipments = [],
  addSubDbShipment,
  removeSubDbShipment,
  payments = [],
  addPayment,
  removePayment,
  accounts = [],
  updateProduct,
  user,
  role,
  subDbsLoading = false,
  subDbSettings = [],
  updateSubDbSetting,
  addSubDbSetting
}: SubDbViewProps) {
  
  // Navigation Tabs: directory, shipment, payments, ledger, reports
  const [activeTab, setActiveTab] = useState<"directory" | "shipment" | "payments" | "ledger" | "reports">("directory");
  
  // Local state for listings
  const [search, setSearch] = useState("");
  const [showAddSubDb, setShowAddSubDb] = useState(false);
  const [editingSubDbId, setEditingSubDbId] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<"all" | "approved" | "pending">("all");
  const [selectedPendingSubDbs, setSelectedPendingSubDbs] = useState<{[id: string]: boolean}>({});

  // Form states for shipment
  const [selectedSubDbId, setSelectedSubDbId] = useState("");
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [shipmentItems, setShipmentItems] = useState<any[]>([]); // { productId, cartons }
  const [carriageRent, setCarriageRent] = useState<number>(2500); // Carriage flat fare requested

  // Form states for payments
  const [paySubDbId, setPaySubDbId] = useState("");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("Cash");
  const [payAccount, setPayAccount] = useState("cash");
  const [payRemarks, setPayRemarks] = useState("");

  // Ledger state
  const [activeLedgerSubDbId, setActiveLedgerSubDbId] = useState("");
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<any | null>(null);

  // Report state
  const [reportSubDbId, setReportSubDbId] = useState("");
  const [reportRangeStart, setReportRangeStart] = useState(new Date().toISOString().split("T")[0]);
  const [reportRangeEnd, setReportRangeEnd] = useState(new Date().toISOString().split("T")[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-05"
  const [reportType, setReportType] = useState<"daily" | "monthly">("daily");
  const [subDbProductSearch, setSubDbProductSearch] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const autoInitRef = useRef(false);

  // Load 2 Default Sub-DBs if empty and done loading
  useEffect(() => {
    if (!subDbsLoading && subDbs.length === 0 && !autoInitRef.current) {
      autoInitRef.current = true;
      const autoInit = async () => {
        try {
          await addSubDb({
            name: "সাব-ডিলার পয়েন্ট ০১ (পয়েন্ট ১)",
            phone: "+৮৮০১৭১১-২২৩৩৪৪",
            address: "মতিঝিল বাণিজ্যিক এলাকা, ঢাকা",
            balance: 0
          });
          await addSubDb({
            name: "সাব-ডিলার পয়েন্ট ০২ (পয়েন্ট ২)",
            phone: "+৮৮০১৭১১-৫৫৬৬৭৭",
            address: "কাওরান বাজার ডিলার পয়েন্ট, ঢাকা",
            balance: 0
          });
        } catch (e) {
          console.error("Auto-population failure:", e);
        }
      };
      autoInit();
    }
  }, [subDbs, subDbsLoading, addSubDb]);

  // Approved SubDbs list (previously created or explicitly approved)
  const approvedSubDbs = useMemo(() => {
    return subDbs.filter(s => s.status !== "pending_approval" && s.approved !== false);
  }, [subDbs]);

  // Load sub-db configuration settings
  const settingDoc = subDbSettings?.[0];
  const allowManagerCreate = settingDoc ? !!settingDoc.allowManagerCreate : false;

  const handleToggleManagerPermission = async () => {
    try {
      if (settingDoc) {
        if (updateSubDbSetting) {
          await updateSubDbSetting(settingDoc.id, {
            allowManagerCreate: !allowManagerCreate
          });
        }
      } else {
        if (addSubDbSetting) {
          await addSubDbSetting({
            allowManagerCreate: !allowManagerCreate
          });
        }
      }
      toast.success(`ম্যানেজার সাব-ডিবি ক্রিয়েশন অনুমতি সফলভাবে ${!allowManagerCreate ? "চালু" : "বন্ধ"} করা হয়েছে!`);
    } catch (err: any) {
      toast.error("অনুমতি পরিবর্তন ব্যর্থ হয়েছে: " + err.message);
    }
  };

  // Total Outstanding dues from SubDbs
  const totalSubDbOutstanding = useMemo(() => {
    return approvedSubDbs.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  }, [approvedSubDbs]);

  // Filter Sub-DB points
  const filteredSubDbs = useMemo(() => {
    return subDbs.filter(s => {
      const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || 
                          s.phone?.includes(search) || 
                          s.address?.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      const isPending = s.status === "pending_approval" || s.approved === false;
      if (approvalFilter === "approved") return !isPending;
      if (approvalFilter === "pending") return isPending;
      return true;
    });
  }, [subDbs, search, approvalFilter]);

  // Set default selection IDs based on approved sub-dealer points
  useEffect(() => {
    if (approvedSubDbs.length > 0) {
      const firstId = approvedSubDbs[0].id;
      if (!selectedSubDbId || !approvedSubDbs.some(s => s.id === selectedSubDbId)) setSelectedSubDbId(firstId);
      if (!paySubDbId || !approvedSubDbs.some(s => s.id === paySubDbId)) setPaySubDbId(firstId);
      if (!activeLedgerSubDbId || !approvedSubDbs.some(s => s.id === activeLedgerSubDbId)) setActiveLedgerSubDbId(firstId);
      if (!reportSubDbId || !approvedSubDbs.some(s => s.id === reportSubDbId)) setReportSubDbId(firstId);
    }
  }, [approvedSubDbs]);

  // Add Item to Shipment list
  const handleAddShipmentItem = (prodId: string) => {
    if (!prodId) return;
    const exists = shipmentItems.find(i => i.productId === prodId);
    if (exists) {
      toast.error("পণ্যটি ইতিমধ্যেই চালানে যোগ করা হয়েছে। কার্টুন বাড়ান!");
      return;
    }
    const item = products.find(p => p.id === prodId);
    if (!item) return;

    setShipmentItems([...shipmentItems, {
      productId: prodId,
      cartons: 1
    }]);
  };

  const handleUpdateItemCartons = (prodId: string, cartonsVal: number) => {
    setShipmentItems(shipmentItems.map(item => {
      if (item.productId === prodId) {
        return { ...item, cartons: Math.max(1, cartonsVal) };
      }
      return item;
    }));
  };

  const handleRemoveShipmentItem = (prodId: string) => {
    setShipmentItems(shipmentItems.filter(item => item.productId !== prodId));
  };

  // Calculations for current draft shipment
  const draftCalculation = useMemo(() => {
    let totalCartons = 0;
    let totalAmount = 0; // Purchase Cost multiplication as per instruction "তার প্রাইজ হবে পার্সেস প্রাইজ রেটে"
    const itemsDetails: any[] = [];

    shipmentItems.forEach(draftItem => {
      const p = products.find(prod => prod.id === draftItem.productId);
      if (p) {
        const cartons = Number(draftItem.cartons) || 0;
        const piecesPerCarton = Number(p.cartoonSize || 1);
        const totalPieces = cartons * piecesPerCarton;
        const purchaseCost = Number(p.cost || 0);
        const subtotal = totalPieces * purchaseCost;

        totalCartons += cartons;
        totalAmount += subtotal;

        itemsDetails.push({
          productId: p.id,
          name: p.name,
          sku: p.sku || "",
          quantityCartons: cartons,
          piecesPerCarton,
          totalPieces,
          cost: purchaseCost,
          totalAmount: subtotal
        });
      }
    });

    const profitFromCartons = totalCartons * 50; // Requested: "প্রফিট ক্যালকুলেশন থাকবে প্রতি কার্টুন এ ৫০ টাকা করে যত কার্টুন যায়"
    const totalInvoice = totalAmount; // Normal Sales Invoice (no rent added to Sub-DB ledger)
    const totalSubDbProfit = profitFromCartons + Number(carriageRent || 0); // Profit formula for targets calculation

    return {
      items: itemsDetails,
      totalCartons,
      totalAmount,
      profitFromCartons,
      totalInvoice,
      totalSubDbProfit
    };
  }, [shipmentItems, products, carriageRent]);

  // ACTION: GENERATE PROFESSIONAL PDF INVOICE
  const handleGeneratePDF = () => {
    if (!selectedSubDbId) {
      toast.error("দয়া করে সাব-ডিবি পয়েন্ট নির্বাচন করুন!");
      return;
    }
    if (shipmentItems.length === 0) {
      toast.error("দয়া করে অন্তত একটি প্রোডাক্ট চালানে যোগ করুন!");
      return;
    }

    const subDbData = subDbs.find(s => s.id === selectedSubDbId);
    if (!subDbData) {
      toast.error("সাব-ডিবি পয়েন্ট পাওয়া যায়নি!");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      // high-resolution A4 size at 150 DPI (approx 1240 x 1754)
      canvas.width = 1240;
      canvas.height = 1754;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("PDF তৈরি করতে সমস্যা হয়েছে (Canvas Context Error)");
        return;
      }

      // Fill Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1240, 1754);

      // Top colored accent bar
      ctx.fillStyle = "#4f46e5"; // Deep indigo
      ctx.fillRect(0, 0, 1240, 45);

      // --- Header Area ---
      // Company Main Brand Title
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 52px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("Samira Traders", 80, 125);

      // Subtag
      ctx.fillStyle = "#64748b";
      ctx.font = "normal 22px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("একটি বিশ্বস্ত ও নির্ভরযোগ্য কাস্টমার সার্ভিস প্রতিষ্ঠান", 80, 165);

      // Right-aligned Corporate Contact Info
      ctx.textAlign = "right";
      ctx.fillStyle = "#334155";
      ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("মোবাইল: +৮৮০১XXXXXXXXX", 1160, 105);
      ctx.font = "normal 20px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("ইমেইল: samiratraders1@gmail.com", 1160, 140);
      ctx.fillText("শাখাকেন্দ্র: প্রধান পরিবেশক ও চালানি কার্যালয়", 1160, 175);

      // Reset align to left for drawing content
      ctx.textAlign = "left";

      // Styled dividing line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, 210);
      ctx.lineTo(1160, 210);
      ctx.stroke();

      // Styled decorative title band
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      const xBand = 80, yBand = 235, wBand = 1080, hBand = 80;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(xBand, yBand, wBand, hBand, 12);
      } else {
        ctx.rect(xBand, yBand, wBand, hBand);
      }
      ctx.fill();
      ctx.stroke();

      // Title band text
      ctx.fillStyle = "#1e1b4b"; // Navy Dark
      ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("পণ্য চালান বিবরণী (SUB-DEALER DISPATCH VOUCHER)", 140, 283);

      ctx.fillStyle = "#ef4444"; // Red Status badge indicator on left
      ctx.fillRect(100, 255, 12, 40);

      // --- Metadata & Receiver Details ---
      // Left Part: Sub Db Info
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("চালান গ্রহীতা (Sub-Dealer Depot):", 80, 365);

      ctx.fillStyle = "#334155";
      ctx.font = "bold 23px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText(`নাম: ${subDbData.name || "N/A"}`, 80, 410);

      ctx.font = "normal 21px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText(`মোবাইল: ${subDbData.phone || "N/A"}`, 80, 450);
      ctx.fillText(`ঠিকানা: ${subDbData.address || "N/A"}`, 80, 490);
      ctx.fillText(`পয়েন্ট আইডি: ${subDbData.id || "N/A"}`, 80, 530);

      // Right Part: Invoice Stats
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("চালান রসিদ নম্বর ও তারিখ:", 700, 365);

      ctx.fillStyle = "#334155";
      ctx.font = "normal 21px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText(`চালান ট্র্যাকিং নম্বর: SD-INV-${Date.now().toString().slice(-6)}`, 700, 410);
      ctx.fillText(`চালানের তারিখ: ${shipmentDate || new Date().toISOString().split('T')[0]}`, 700, 450);
      ctx.fillText(`তৈরির সময়: ${new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })}`, 700, 490);
      
      // Stamp-like draft indicator
      ctx.fillStyle = "#ea580c";
      ctx.font = "bold 21px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("অবস্থা / Status: খসড়া রিসিট (Draft Only)", 700, 530);

      // --- Items Table Grid ---
      const tableTop = 580;
      const rowHeight = 65;
      const colStarts = [80, 160, 680, 810, 940, 1040];

      // Draw table header
      ctx.fillStyle = "#1e293b"; // Dark Slate
      ctx.fillRect(80, tableTop, 1080, 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("নং", colStarts[0] + 15, tableTop + 35);
      ctx.fillText("পণ্যের বিবরণ (Product Details)", colStarts[1] + 15, tableTop + 35);
      ctx.fillText("কার্টুন পরিমাণ", colStarts[2] + 12, tableTop + 35);
      ctx.fillText("টোটাল পিস", colStarts[3] + 15, tableTop + 35);
      ctx.fillText("কেনা রেট", colStarts[4] + 15, tableTop + 35);
      ctx.fillText("টোটাল মূল্য", colStarts[5] + 12, tableTop + 35);

      let currentY = tableTop + 55;

      // Table items loop
      draftCalculation.items.forEach((item: any, idx: number) => {
        // Row backgrounds alternation
        ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        ctx.fillRect(80, currentY, 1080, rowHeight);

        // Thin borders
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.strokeRect(80, currentY, 1080, rowHeight);

        // Texts
        ctx.fillStyle = "#334155";
        ctx.font = "normal 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
        
        ctx.fillText((idx + 1).toString(), colStarts[0] + 20, currentY + 40);
        ctx.font = "bold 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
        ctx.fillText(item.name || "N/A", colStarts[1] + 15, currentY + 40);
        
        ctx.font = "normal 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
        ctx.fillText(`${item.quantityCartons} Ctn`, colStarts[2] + 15, currentY + 40);
        ctx.fillText(`${item.totalPieces} Pcs`, colStarts[3] + 15, currentY + 40);
        ctx.fillText(`৳${item.cost}`, colStarts[4] + 15, currentY + 40);
        
        ctx.font = "bold 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(`৳${item.totalAmount}`, colStarts[5] + 15, currentY + 40);

        currentY += rowHeight;
      });

      // End Table boundary line
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(80, currentY);
      ctx.lineTo(1160, currentY);
      ctx.stroke();

      currentY += 35;

      // Draw pricing totals (Right Aligned Box)
      const summaryLeft = 700;
      const boxWidth = 460;
      const boxHeight = 240;

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(summaryLeft, currentY, boxWidth, boxHeight, 16);
      } else {
        ctx.rect(summaryLeft, currentY, boxWidth, boxHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Heading for calculations
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 21px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("হিসাব সারসংক্ষেপ:", summaryLeft + 25, currentY + 45);

      // Label & Amounts layout
      ctx.font = "normal 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillStyle = "#475569";
      ctx.fillText("মোট আইটেম কার্টুন:", summaryLeft + 25, currentY + 90);
      ctx.fillText(`${draftCalculation.totalCartons} Ctn`, summaryLeft + 310, currentY + 90);

      ctx.fillText("মোট প্রোডাক্ট মূল্য:", summaryLeft + 25, currentY + 130);
      ctx.fillText(`৳ ${draftCalculation.totalAmount}`, summaryLeft + 310, currentY + 130);

      ctx.font = "bold 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillStyle = "#4f46e5";
      ctx.fillText("গাড়ি ভাড়া সংযোজন:", summaryLeft + 25, currentY + 170);
      ctx.fillText(`৳ ${carriageRent}`, summaryLeft + 310, currentY + 170);

      // Dash separator
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(summaryLeft + 25, currentY + 190);
      ctx.lineTo(summaryLeft + 435, currentY + 190);
      ctx.stroke();

      // Bottom Grand Invoice Total
      ctx.fillStyle = "#b91c1c";
      ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("সর্বমোট চালান মূল্য:", summaryLeft + 25, currentY + 223);
      ctx.fillText(`৳ ${draftCalculation.totalInvoice}`, summaryLeft + 310, currentY + 223);

      // --- Instructions or Footer Text ---
      const signatureY = 1530;
      ctx.fillStyle = "#64748b";
      ctx.font = "italic 17px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("* এটি একটি খসড়া কপি (Draft Memo) যা সাব-ডিবি পয়েন্টের ডিলার চালানের জন্য সাময়িকভাবে তৈরি করা হয়েছে।", 80, signatureY - 110);
      ctx.fillText("চালানটি সংরক্ষণের করার পূর্বেই এই কপিটি চালান রশিদ হিসেবে ব্যবহার করা যেতে পারে।", 80, signatureY - 80);

      // Signature Dashed Guidelines
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);

      // Left Receiver
      ctx.beginPath();
      ctx.moveTo(80, signatureY);
      ctx.lineTo(340, signatureY);
      ctx.stroke();

      // Right Authorized Issuer
      ctx.beginPath();
      ctx.moveTo(900, signatureY);
      ctx.lineTo(1160, signatureY);
      ctx.stroke();

      // Clear dash format
      ctx.setLineDash([]);

      ctx.fillStyle = "#334155";
      ctx.font = "bold 19px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.fillText("গ্রহীতা / ক্রেতার স্বাক্ষর", 120, signatureY + 30);
      ctx.fillText("পরিবেশক কর্মকর্তার স্বাক্ষর", 920, signatureY + 30);

      // --- Bottom Banner ---
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(0, 1720, 1240, 34);

      ctx.fillStyle = "#ffffff";
      ctx.font = "normal 15px 'Segoe UI', Arial, sans-serif, 'Noto Sans Bengali'";
      ctx.textAlign = "center";
      ctx.fillText("Samira Traders © 2026 | Powered by AI Studio Applet Engine.", 620, 1742);

      // Create PDF and save file. Fast encoding, proper sizing: A4 210mm by 297mm
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`Samira_Traders_SubDB_${subDbData.name.replace(/\s+/g, "_")}_Invoice.pdf`);
      
      toast.success("চালান PDF সফলভাবে তৈরি ও ডাউনলোড হয়েছে!");
    } catch (e: any) {
      toast.error("চালান PDF তৈরি ব্যর্থ হয়েছে: " + e.message);
    }
  };

  // ACTION: SAVE PRODUCT SHIPMENT VOUCHER
  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubDbId) {
      toast.error("দয়া করে সাব-ডিবি পয়েন্ট নির্বাচন করুন!");
      return;
    }
    if (shipmentItems.length === 0) {
      toast.error("দয়া করে অন্তত একটি প্রোডাক্ট চালানে যোগ করুন!");
      return;
    }

    // Verify Stock Levels
    const lowStockItems: string[] = [];
    for (const item of draftCalculation.items) {
      const p = products.find(prod => prod.id === item.productId);
      if (!p || (p.stock || 0) < item.totalPieces) {
        lowStockItems.push(`${p?.name || "পণ্য"} (স্টক: ${p?.stock || 0} পিস, ডিমান্ড: ${item.totalPieces} পিস)`);
      }
    }

    const executeShipmentSave = async () => {
      const subDbData = subDbs.find(s => s.id === selectedSubDbId);
      if (!subDbData) return;

      try {
        const shipmentData = {
          date: shipmentDate,
          subDbId: selectedSubDbId,
          subDbName: subDbData.name,
          items: draftCalculation.items,
          totalCartons: draftCalculation.totalCartons,
          totalAmount: draftCalculation.totalAmount, // Products Cost
          rent: Number(carriageRent || 0), // Vehicle Rent 2500
          totalInvoice: draftCalculation.totalInvoice, // Due amount charged to sub-db
          profitFromCartons: draftCalculation.profitFromCartons, // (Total cartons * 50)
          totalSubDbProfit: draftCalculation.totalSubDbProfit // Carton profit + rent
        };

        // 1) Write shipment invoice
        await addSubDbShipment(shipmentData);

        // 2) Decrement from Inventory Stock
        for (const item of draftCalculation.items) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            await recordStockMovement(prod.id, 'SALES', -item.totalPieces, "SUBDB_SHIPMENT_" + Date.now());
          }
        }

        // 3) Increase Sub-DB Outstanding balance (Sales/Shipment adds to ledger)
        const currentBalance = Number(subDbData.balance || 0);
        await updateSubDb(selectedSubDbId, {
          balance: currentBalance + draftCalculation.totalInvoice
        });

        toast.success("চালানটি সফলভাবে সম্পন্ন হয়েছে এবং স্টক মাইনাস করা হয়েছে!");
        // Reset
        setShipmentItems([]);
        setCarriageRent(2500);
        setActiveTab("ledger");
        setActiveLedgerSubDbId(selectedSubDbId);
      } catch (err: any) {
        toast.error("চালান তৈরি করতে সমস্যা হয়েছে: " + err.message);
      }
    };

    if (lowStockItems.length > 0) {
      setConfirmModal({
        show: true,
        title: "কম স্টকের সতর্কতা!",
        message: `সতর্কতা: নিচের প্রোডাক্টগুলোর পর্যাপ্ত স্টক নেই। এটি মাইনাস স্টক লেভেলে চলে যাবে। চালিয়ে যাবেন?\n\n${lowStockItems.join("\n")}`,
        onConfirm: () => {
          setConfirmModal(null);
          executeShipmentSave();
        }
      });
    } else {
      executeShipmentSave();
    }
  };

  // ACTION: SAVE PAYMENT FROM SUB-DB
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySubDbId) {
      toast.error("দয়া করে সাব-ডিবি পয়েন্ট নির্বাচন করুন!");
      return;
    }
    if (payAmount <= 0) {
      toast.error("দয়া করে বৈধ পেমেন্ট পরিমাণ লিখুন!");
      return;
    }

    const subDbData = subDbs.find(s => s.id === paySubDbId);
    if (!subDbData) return;

    try {
      const paymentData = {
        date: payDate,
        type: "in",
        amount: payAmount,
        category: "Sub-DB Collection", // Unified categorized inflow for accounts/ledger tracking
        description: payRemarks || `${subDbData.name} হতে বকেয়া পেমেন্ট সংগ্রহ`,
        entityId: paySubDbId, // References Sub-DB point ID
        method: payMethod,
        accountId: payAccount,
        createdBy: user?.email || "Admin",
        approved: true,
        status: "approved"
      };

      // 1) Register payment in unified payments ledger
      await addPayment(paymentData);

      // 2) Subtract from Sub-DB outstanding ledger balance
      const currentBalance = Number(subDbData.balance || 0);
      await updateSubDb(paySubDbId, {
        balance: Math.max(0, currentBalance - payAmount)
      });

      toast.success(`${subDbData.name} হতে ${payAmount} ৳ পেমেন্ট রিসিভ রেকর্ড করা হয়েছে!`);
      // Reset
      setPayAmount(0);
      setPayRemarks("");
      setActiveTab("ledger");
      setActiveLedgerSubDbId(paySubDbId);
    } catch (err: any) {
      toast.error("পেমেন্ট সম্পন্ন হতে ত্রুটি ঘটেছে: " + err.message);
    }
  };

  // ACTION: MANUALLY ADD NEW/UPDATE SUB-DB POINT
  const handleSaveSubDbManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;

    if (!name || !phone || !address) {
      toast.error("সকল তথ্য পূরণ করুন!");
      return;
    }

    if (editingSubDbId) {
      const data = {
        name,
        phone,
        address,
        balance: Number(subDbs.find(s => s.id === editingSubDbId)?.balance || 0)
      };
      await updateSubDb(editingSubDbId, data);
      toast.success("সাব-ডিবি পয়েন্ট সফলভাবে আপডেট করা হয়েছে!");
      setEditingSubDbId(null);
    } else {
      if (role !== "admin" && !allowManagerCreate) {
        toast.error("দুঃখিত, আপনার সাব-ডিবি পয়েন্ট তৈরি করার অনুমতি নেই। অ্যাডমিনের অনুমতি প্রয়োজন।");
        return;
      }

      const data = {
        name,
        phone,
        address,
        balance: 0,
        approved: role === 'admin' ? true : false,
        status: role === 'admin' ? 'approved' : 'pending_approval',
        createdBy: role === 'admin' ? 'Admin' : (user?.email || 'Manager'),
        createdAt: new Date().toISOString()
      };

      await addSubDb(data);

      if (role === 'admin') {
        toast.success("নতুন সাব-ডিবি পয়েন্ট সফলভাবে তৈরি করা হয়েছে!");
      } else {
        toast.success(`'${name}' পয়েন্টটি এন্ট্রি হয়েছে এবং অনুমোদনের জন্য অ্যাডমিনকে জানানো হয়েছে!`);
      }
    }
    setShowAddSubDb(false);
  };

  // ACTION: PRINT SUB-DB SHIPMENT INVOICE (A4 Commercial Format)
  const printFriendlyInvoice = (invoice: any) => {
    if (!invoice) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>চালানপত্র - ${invoice.subDbName} - ${invoice.id?.slice(0, 8)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap');
            body { 
              font-family: 'Noto Sans Bengali', system-ui, -apple-system, sans-serif; 
              color: #1a1a1a; 
              margin: 40px auto; 
              max-width: 800px;
              padding: 20px;
              line-height: 1.4;
            }
            .header-info-table, .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .company-header {
              text-align: center;
              border-bottom: 3px double #000;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .company-header h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 5px 0;
              letter-spacing: 1px;
            }
            .company-header p {
              font-size: 13px;
              color: #555;
              margin: 2px 0;
            }
            .voucher-title-container {
              text-align: center;
              margin-bottom: 25px;
            }
            .voucher-title {
              display: inline-block;
              font-size: 16px;
              font-weight: 700;
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 6px 20px;
              border-radius: 6px;
              text-transform: uppercase;
            }
            .info-box-left {
              width: 50%;
              text-align: left;
              vertical-align: top;
            }
            .info-box-right {
              width: 50%;
              text-align: right;
              vertical-align: top;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
              font-size: 11px;
              text-transform: uppercase;
            }
            .info-value {
              font-size: 14px;
              font-weight: bold;
              color: #0f172a;
              margin-top: 3px;
            }
            .items-table th {
              background-color: #f8fafc;
              border-top: 2px solid #0f172a;
              border-bottom: 2px solid #0f172a;
              padding: 10px;
              font-size: 12px;
              font-weight: 700;
              text-align: left;
            }
            .items-table td {
              border-bottom: 1px solid #e2e8f0;
              padding: 12px 10px;
              font-size: 12px;
            }
            .items-table tr:last-child td {
              border-bottom: 2px solid #0f172a;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .totals-container {
              width: 100%;
              margin-top: 20px;
              font-size: 13px;
            }
            .totals-table {
              width: 320px;
              margin-left: auto;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 8px 10px;
            }
            .totals-table tr.grand-total {
              font-size: 15px;
              font-weight: bold;
              background-color: #f8fafc;
              border-top: 1.5px dashed #0f172a;
              border-bottom: 2px solid #0f172a;
            }
            .footer-sig {
              margin-top: 70px;
              width: 100%;
              border-collapse: collapse;
            }
            .footer-sig td {
              width: 33.33%;
              text-align: center;
              font-size: 12px;
              font-weight: bold;
              color: #475569;
              vertical-align: bottom;
              padding-top: 50px;
            }
            .sig-line {
              border-top: 1px solid #000;
              width: 80%;
              margin: 0 auto 5px auto;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="company-header">
            <h1>সমীরা ট্রেডার্স (Samira Traders)</h1>
            <p>প্রোপাইটার: মোঃ সমীর উদ্দিন | ডিলার: আবুল খায়ের টোব্যাকো কোং লিমিটেড</p>
            <p>করিমগঞ্জ ঘাট রোড, কিশোরগঞ্জ | মোবাইল: ০১৭২১৩৩৬৫৬৩, ০১৫১৫৫৩৩৪৫৪</p>
          </div>

          <div class="voucher-title-container">
            <span class="voucher-title">সাব-ডিবি বিক্রয় চালান ও চালানপত্র</span>
          </div>

          <table class="header-info-table">
            <tr>
              <td class="info-box-left">
                <div class="info-label">চালান গ্রহীতা (Sub-DB Point)</div>
                <div class="info-value">${invoice.subDbName}</div>
                <div class="info-label" style="margin-top:8px;">গন্তব্য ঠিকানা</div>
                <div class="info-value" style="font-size:12px; font-weight:normal;">কিশোরগঞ্জ করিমগঞ্জ ঘাট রোড</div>
              </td>
              <td class="info-box-right">
                <div class="info-label">চালানপত্র নম্বর</div>
                <div class="info-value" style="font-family: monospace; letter-spacing: 0.5px;">#${invoice.id ? invoice.id.toUpperCase().slice(0, 8) : 'NEW'}</div>
                <div class="info-label" style="margin-top:8px;">চালানের তারিখ</div>
                <div class="info-value">${invoice.date}</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 45%;">পণ্যের নাম ও বিবরণ (Product Description)</th>
                <th class="text-center" style="width: 10%;">পিস সাইজ</th>
                <th class="text-center" style="width: 15%;">মোট কার্টুন (Ctn)</th>
                <th class="text-right" style="width: 15%;">কার্টুন প্রতি দর</th>
                <th class="text-right" style="width: 15%;">মোট চালান মূল্য</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((it: any) => {
                const ctnRate = (it.piecesPerCarton || 1) * (it.cost || 0);
                return `
                  <tr>
                    <td>
                      <strong style="color:#000;">${it.name || 'Unknown Item'}</strong><br/>
                      <span style="font-size:10px; color:#555;">SKU: ${it.sku || 'N/A'}</span>
                    </td>
                    <td class="text-center" style="font-family: monospace;">${it.piecesPerCarton || 1} Pcs</td>
                    <td class="text-center" style="font-family: monospace; font-size:14px; font-weight:bold;">${it.quantityCartons || it.cartons || 1}</td>
                    <td class="text-right" style="font-family: monospace;">${ctnRate.toFixed(2)} ৳</td>
                    <td class="text-right" style="font-family: monospace; font-weight:bold;">${(it.totalAmount || 0).toFixed(2)} ৳</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td class="text-right" style="color: #475569;">মোট কার্টুন (Total Cartons):</td>
                <td class="text-right" style="font-weight: bold; font-family: monospace;">${invoice.totalCartons || 0} Ctn</td>
              </tr>
              <tr class="grand-total">
                <td class="text-right">নিট বকেয়া দাবি (সর্বমোট মূল্য):</td>
                <td class="text-right" style="font-family: monospace; font-size: 16px;">${(invoice.totalAmount || invoice.totalInvoice || 0).toFixed(2)} ৳</td>
              </tr>
            </table>
          </div>

          <table class="footer-sig">
            <tr>
              <td>
                <div class="sig-line"></div>
                গ্রহীতার স্বাক্ষর (Receiver Signature)
              </td>
              <td>
                <div class="sig-line"></div>
                ডেলিভারিম্যানের স্বাক্ষর
              </td>
              <td>
                <div class="sig-line"></div>
                স্বত্বাধিকারী স্বাক্ষর (Authorized Sign)
              </td>
            </tr>
          </table>

          <div class="text-center no-print" style="margin-top: 40px;">
            <button onclick="window.print()" style="padding: 10px 24px; background: #4f46e5; color: #fff; border: none; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">চালানটি প্রিন্ট করুন</button>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const iframeId = "print-subdb-invoice-iframe";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
  };

  // ACTION: DELETE SHIPMENT INVOICE (With Stock + Bal recovery)
  const handleDeleteShipment = async (sh: any) => {
    setConfirmModal({
      show: true,
      title: "চালান ডিলিট নিশ্চিতকরণ",
      message: `আপনি কি চালান ${sh.id.slice(0, 8)} ডিলিট করতে চান? ডিলিট করলে স্টক এবং সাব-ডিবি ব্যালেন্স পুনরুদ্ধার করা হবে।`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          // 1) Refill inventories
          for (const item of sh.items || []) {
            const p = products.find(prod => prod.id === item.productId);
            if (p) {
              await recordStockMovement(p.id, 'RETURN', Number(item.totalPieces || 0), "REVERSE_SUBDB_SHIPMENT_" + sh.id);
            }
          }

          // 2) Reduce Sub-DB balance
          const subDbData = subDbs.find(s => s.id === sh.subDbId);
          if (subDbData) {
            const currentBalance = Number(subDbData.balance || 0);
            await updateSubDb(sh.subDbId, {
              balance: Math.max(0, currentBalance - Number(sh.totalInvoice || 0))
            });
          }

          // 3) Delete document
          await removeSubDbShipment(sh.id);
          toast.success("চালানটি সফলভাবে ডিলিট ও রিভার্স করা হয়েছে!");
        } catch (err: any) {
          toast.error("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
        }
      }
    });
  };

  // Ledger calculation for active ledger ID
  const activeLedgerData = useMemo(() => {
    if (!activeLedgerSubDbId) return { list: [], openingBal: 0, totalSales: 0, totalPaid: 0, currentBal: 0 };
    
    const dbData = subDbs.find(s => s.id === activeLedgerSubDbId);
    if (!dbData) return { list: [], openingBal: 0, totalSales: 0, totalPaid: 0, currentBal: 0 };

    // Find all shipments
    const shipmentsList = subDbShipments
      .filter(s => s.subDbId === activeLedgerSubDbId)
      .map(s => ({
        id: s.id,
        date: s.date,
        type: "invoice",
        description: `পণ্য চালান (${s.totalCartons} কার্টুন)`,
        debit: Number(s.totalInvoice || 0),
        credit: 0,
        rawObj: s
      }));

    // Find all payments
    const paymentsList = payments
      .filter(p => p.entityId === activeLedgerSubDbId && p.category === "Sub-DB Collection" && p.status !== "rejected")
      .map(p => ({
        id: p.id,
        date: p.date,
        type: "payment",
        description: `পয়েন্ট পেমেন্ট রিসিভ (${p.method})`,
        debit: 0,
        credit: Number(p.amount || 0),
        rawObj: p
      }));

    // Merge & Sort chronologically (oldest first for running balance)
    const sortedList = [...shipmentsList, ...paymentsList].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff === 0) {
        // If same date, invoices first, then payments
        return a.type === "invoice" ? -1 : 1;
      }
      return dateDiff;
    });

    let cumulativeBalance = 0;
    const listWithRunningBal = sortedList.map(item => {
      cumulativeBalance += (item.debit - item.credit);
      return {
        ...item,
        balance: cumulativeBalance
      };
    });

    const totalSales = shipmentsList.reduce((sum, item) => sum + item.debit, 0);
    const totalPaid = paymentsList.reduce((sum, item) => sum + item.credit, 0);

    return {
      list: listWithRunningBal.reverse(), // Top display is newest
      totalSales,
      totalPaid,
      currentBal: cumulativeBalance,
      dbData
    };
  }, [activeLedgerSubDbId, subDbShipments, payments, subDbs]);


  // REPORT: DATA FILTERING
  const reportOutputData = useMemo(() => {
    if (!reportSubDbId) return [];

    const dbData = subDbs.find(s => s.id === reportSubDbId);
    if (!dbData) return [];

    // Filter shipments
    const shipmentsForDb = subDbShipments.filter(s => s.subDbId === reportSubDbId);

    if (reportType === "daily") {
      // Date-wise list
      return shipmentsForDb
        .filter(s => s.date >= reportRangeStart && s.date <= reportRangeEnd)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    } else {
      // Monthly bundle
      const monthlyShipments = shipmentsForDb.filter(s => s.date?.startsWith(reportMonth));
      
      // Group by date or display chronological listing
      return monthlyShipments.sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
    }
  }, [reportSubDbId, subDbShipments, reportType, reportRangeStart, reportRangeEnd, reportMonth, subDbs]);

  // Summaries of Report output
  const reportTotals = useMemo(() => {
    let cartons = 0;
    let productsCost = 0;
    let rentFees = 0;
    let totalInvoicesAmount = 0;
    let earnedProfits = 0;

    reportOutputData.forEach((s: any) => {
      cartons += Number(s.totalCartons || 0);
      productsCost += Number(s.totalAmount || 0);
      rentFees += Number(s.rent || 0);
      totalInvoicesAmount += Number(s.totalInvoice || 0);
      earnedProfits += Number(s.totalSubDbProfit || 0);
    });

    return {
      cartons,
      productsCost,
      rentFees,
      totalInvoicesAmount,
      earnedProfits,
      times: reportOutputData.length
    };
  }, [reportOutputData]);


  // REPORT ACTIONS: CSV Excel Export
  const handleExportCSV = () => {
    if (reportOutputData.length === 0) {
      toast.error("এক্সপোর্ট করার মতো কোনো ডেটা নেই!");
      return;
    }
    const activeSubDb = subDbs.find(s => s.id === reportSubDbId);
    const filename = `${activeSubDb?.name || "sub_db"}_Report_${reportType === "daily" ? reportRangeStart + "_to_" + reportRangeEnd : reportMonth}.csv`;

    let headers = ["Date", "Voucher ID", "Total Cartons", "Product Cost (BDT)", "Carriage Fare (BDT)", "Total Invoice (BDT)", "Profit Gained (BDT)", "Products Shipped"];
    let rows = reportOutputData.map((s: any) => {
      const itemsListStr = s.items?.map((it: any) => `${it.name} (${it.quantityCartons} Ctn)`).join(" | ");
      return [
        s.date,
        s.id?.slice(0, 8),
        s.totalCartons,
        s.totalAmount,
        s.rent,
        s.totalInvoice,
        s.totalSubDbProfit,
        `"${itemsListStr}"`
      ];
    });

    // Add totals row
    rows.push([
      "TOTAL SUM",
      `(${reportTotals.times} Shipment)`,
      reportTotals.cartons,
      reportTotals.productsCost,
      reportTotals.rentFees,
      reportTotals.totalInvoicesAmount,
      reportTotals.earnedProfits,
      ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("রিপোর্ট এক্সেল/CSV ফাইল হিসেবে সফলভাবে ডাউনলোড হয়েছে!");
  };

  // REPORT ACTIONS: WhatsApp Share SUMMARY text
  const handleWhatsAppShare = () => {
    const activeSubDb = subDbs.find(s => s.id === reportSubDbId);
    if (!activeSubDb) return;

    let periodStr = reportType === "daily" ? `${reportRangeStart} হতে ${reportRangeEnd}` : `${reportMonth} (মাসিক)`;

    let shareText = `*সমীরা ট্রেডার্স (Samira Traders)*\n`;
    shareText += `*সাব-ডিবি চালান বিবরণী রিপোর্ট*\n`;
    shareText += `--------------------------------------\n`;
    shareText += `👤 সাব-ডিবি পয়েন্ট: *${activeSubDb.name}*\n`;
    shareText += `📅 পিরিয়ড: *${periodStr}*\n`;
    shareText += `🚚 মোট চালান গিয়েছে: *${reportTotals.times} বার*\n`;
    shareText += `📦 মোট চালানকৃত কার্টুন: *${reportTotals.cartons} টি*\n`;
    shareText += `💰 চালানমূল্য (কেনা রেটে): *${reportTotals.productsCost} ৳*\n`;
    shareText += `🚛 মোট গাড়ি ভাড়া আদায়: *${reportTotals.rentFees} ৳*\n`;
    shareText += `💵 সর্বমোট চালানপত্র দাবি: *${reportTotals.totalInvoicesAmount} ৳*\n`;
    shareText += `📈 অর্জিত লাভ (৫০৳/কার্টুন + স্পেশাল রেন্ট): *${reportTotals.earnedProfits} ৳*\n`;
    shareText += `💳 পয়েন্টে বর্তমান মোট বকেয়া: *${activeSubDb.balance || 0} ৳*\n`;
    shareText += `--------------------------------------\n`;
    shareText += `ধন্যবাদান্তে, সমীরা ট্রেডার্স ম্যানেজমেন্ট।`;

    const encodedText = encodeURIComponent(shareText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  };

  const totalPendingApprovals = useMemo(() => {
    return subDbs.filter(s => s.status === "pending_approval" || s.approved === false).length;
  }, [subDbs]);

  return (
    <div id="subdb-view-wrapper" className="relative space-y-6 pb-12">
      
      {/* Floating Pending Approvals Badge */}
      {totalPendingApprovals > 0 && (
        <div 
          onClick={() => {
            setApprovalFilter("pending");
            setActiveTab("directory");
          }}
          className="absolute top-2 right-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black px-3.5 py-2 rounded-2xl shadow-md cursor-pointer animate-pulse z-40 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>{totalPendingApprovals} টি অনুমোদন পেন্ডিং</span>
        </div>
      )}
      
      {/* Title & Stats Headers */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600" /> সাব-ডিবি ডিস্ট্রিবিউশন (Sub-Dealer Points)
          </h2>
          <p className="text-sm font-semibold text-[#6C757D]">
            সাব-ডিলার পয়েন্টে কেনা দামে কার্টুন অনুযায়ী পণ্য চালান, ক্যাশ ডেবিট-ক্রেডিট লেজার, গাড়ি ভাড়া ও কার্টুন প্রতি আয়ের হিসাব
          </p>
        </div>
        
        {/* KPI Panel */}
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-emerald-50 px-5 py-3.5 rounded-2xl border border-emerald-100 flex flex-col justify-center min-w-[150px] shadow-xs">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">সাব-ডিবি মোট বকেয়া</span>
            <span className="text-xl font-mono font-black text-emerald-800 mt-1">{totalSubDbOutstanding} ৳</span>
          </div>
          <div className="bg-indigo-50 px-5 py-3.5 rounded-2xl border border-indigo-100 flex flex-col justify-center min-w-[150px] shadow-xs">
            <span className="text-[10px] font-black text-indigo-650 uppercase tracking-wider block">নিবন্ধিত পয়েন্ট</span>
            <span className="text-xl font-black text-indigo-800 mt-1">{subDbs.length} টি</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-1 bg-gray-150 p-1.5 rounded-2xl max-w-2xl border border-gray-200">
        <button
          id="btn-subdb-tab-directory"
          onClick={() => setActiveTab("directory")}
          className={`flex-1 min-w-[100px] py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === "directory" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          পয়েন্টস ডিরেক্টরি
        </button>
        <button
          id="btn-subdb-tab-shipment"
          onClick={() => setActiveTab("shipment")}
          className={`flex-1 min-w-[100px] py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === "shipment" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          নতুন চালান এন্ট্রি
        </button>
        <button
          id="btn-subdb-tab-payments"
          onClick={() => {
            setActiveTab("payments");
            if (subDbs.length > 0 && !paySubDbId) setPaySubDbId(subDbs[0].id);
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === "payments" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          পেমেন্ট সংগ্রহ
        </button>
        <button
          id="btn-subdb-tab-ledger"
          onClick={() => {
            setActiveTab("ledger");
            if (subDbs.length > 0 && !activeLedgerSubDbId) setActiveLedgerSubDbId(subDbs[0].id);
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === "ledger" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          পয়েন্ট লেজার খাতা
        </button>
        <button
          id="btn-subdb-tab-reports"
          onClick={() => {
            setActiveTab("reports");
            if (subDbs.length > 0 && !reportSubDbId) setReportSubDbId(subDbs[0].id);
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === "reports" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          রিপোর্ট ও ড্যাশবোর্ড
        </button>
      </div>

      {/* VIEW PANEL ROUTING */}

      {/* VIEW: Points Directory */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="সাব-ডিবি পয়েন্ট নাম, ফোন বা ঠিকানা দিয়ে খুঁজুন..." 
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter Dropdown next to search */}
              <div className="shrink-0">
                <select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value as any)}
                  className="w-full sm:w-48 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                >
                  <option value="all">অবস্থা: সমস্ত পয়েন্ট</option>
                  <option value="approved">অবস্থা: অনুমোদিত (Approved)</option>
                  <option value="pending">অবস্থা: পেন্ডিং (Pending)</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {role === "admin" && (
                <div className="flex items-center gap-3.5 bg-[#F8F9FA] px-4 py-2.5 border border-gray-200 rounded-2xl shrink-0">
                  <span className="text-xs font-semibold text-gray-600">ম্যানেজারদের সাব-ডিবি ক্রিয়েশন:</span>
                  <button
                    onClick={handleToggleManagerPermission}
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowManagerCreate ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        allowManagerCreate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-black text-slate-800">{allowManagerCreate ? "অনুমতি আছে" : "বন্ধ"}</span>
                </div>
              )}
              
              {(role === "admin" || (role !== "admin" && allowManagerCreate)) && (
                <button 
                  id="btn-add-subdb-manual"
                  onClick={() => { setShowAddSubDb(true); setEditingSubDbId(null); }}
                  className="px-5 py-3 btn-primary flex items-center gap-2 text-xs font-black cursor-pointer shadow-md shadow-emerald-600/10 shrink-0"
                >
                  <Plus className="w-4 h-4" /> সাব-ডিবি পয়েন্ট যোগ করুন
                </button>
              )}
            </div>
          </div>

          {/* Bulk Select and Approve Bar */}
          {role === "admin" && subDbs.some(s => s.status === "pending_approval" || s.approved === false) && (
            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in my-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="select-all-pending-checkbox"
                  className="w-4.5 h-4.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer border-amber-300 bg-white"
                  checked={
                    subDbs.filter(s => s.status === "pending_approval" || s.approved === false).length > 0 &&
                    subDbs.filter(s => s.status === "pending_approval" || s.approved === false).every(s => selectedPendingSubDbs[s.id])
                  }
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updated: {[id: string]: boolean} = {};
                    if (isChecked) {
                      subDbs.filter(s => s.status === "pending_approval" || s.approved === false).forEach(s => {
                        updated[s.id] = true;
                      });
                    }
                    setSelectedPendingSubDbs(updated);
                  }}
                />
                <label htmlFor="select-all-pending-checkbox" className="text-xs font-extrabold text-amber-955 cursor-pointer select-none">
                  সব পেন্ডিং সাব-ডিবি এক ক্লিকে সিলেক্ট করুন (Select All Pending Points)
                </label>
              </div>

              {Object.values(selectedPendingSubDbs).filter(Boolean).length > 0 && (
                <button
                  type="button"
                  id="btn-bulk-approve-subdbs"
                  onClick={async () => {
                    const pendingIds = Object.keys(selectedPendingSubDbs).filter(id => selectedPendingSubDbs[id]);
                    if (pendingIds.length === 0) return;
                    
                    setConfirmModal({
                      show: true,
                      title: "একত্রিত বা বাল্ক অনুমোদন নিশ্চিতকরণ",
                      message: `আপনি একই সাথে নির্বাচিত ${pendingIds.length} টি সাব-ডিলার পয়েন্ট অনুমোদন (approved: true) করতে চাচ্ছেন। চালিয়ে যাবেন?`,
                      onConfirm: async () => {
                        setConfirmModal(null);
                        try {
                          for (const dbId of pendingIds) {
                            await updateSubDb(dbId, {
                              approved: true,
                              status: "approved"
                            });
                          }
                          setSelectedPendingSubDbs({});
                          toast.success(`${pendingIds.length} টি সাব-ডিলার পয়েন্ট সফলভাবে অনুমোদন করা হয়েছে!`);
                        } catch (err: any) {
                          toast.error("বাল্ক অনুমোদনে ত্রুটি ঘটেছে: " + err.message);
                        }
                      }
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {Object.values(selectedPendingSubDbs).filter(Boolean).length} টি অনুমোদিত করুন (Bulk Approve)
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubDbs.map(item => {
              const isPending = item.status === "pending_approval" || item.approved === false;
              return (
                <div 
                  key={item.id} 
                  className={`group relative rounded-3xl p-6 transition-all flex flex-col justify-between ${
                    isPending 
                      ? "bg-gradient-to-br from-amber-50/60 via-white to-amber-50/10 border border-amber-300 shadow-md shadow-amber-100/45 border-l-4 border-l-amber-500" 
                      : "bg-white border border-gray-150 shadow-xs hover:shadow-md"
                  }`}
                >
                  {/* Card Select Checkbox for Pending Points */}
                  {role === "admin" && isPending && (
                    <div className="absolute top-5 left-5 z-20">
                      <input
                        type="checkbox"
                        className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer border-gray-300 bg-white"
                        checked={!!selectedPendingSubDbs[item.id]}
                        onChange={(e) => {
                          setSelectedPendingSubDbs({
                            ...selectedPendingSubDbs,
                            [item.id]: e.target.checked
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Delete / Edit manual overlay controls */}
                  {role === "admin" && (
                    <div className="absolute top-5 right-5 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingSubDbId(item.id);
                          setShowAddSubDb(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-all"
                        title="এডিট করুন"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45 shrink-0" />
                      </button>
                      <button 
                        onClick={() => {
                          if (item.balance > 0) {
                            toast.error("সতর্কতা: এই সাব-ডিবির বকেয়া ব্যালেন্স আছে। বকেয়া শূন্য ছাড়া ডিলিট করা সমর্থন করে না!");
                            return;
                          }
                          setConfirmModal({
                            show: true,
                            title: "সাব-ডিবি ডিলার পয়েন্ট ডিলিট নিশ্চিতকরণ",
                            message: `আপনি কি সাব-ডিবি ডিলার পয়েন্ট '${item.name}' ডিলিট করতে চান?\n\nসতর্কতা: এই অ্যাকশনটি স্থায়ী এবং এর ফলে সকল সম্পর্কিত ডিরেক্টরি রেকর্ড মুছে ফেলা হবে।`,
                            onConfirm: async () => {
                              setConfirmModal(null);
                              try {
                                await removeSubDb(item.id);
                                toast.success("সাব-ডিবি ডিলার পয়েন্টটি সফলভাবে ডিলিট করা হয়েছে!");
                              } catch (e: any) {
                                toast.error("ডিলিট করতে সমস্যা হয়েছে: " + e.message);
                              }
                            }
                          });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  )}

                  <div className={role === "admin" && isPending ? "pl-7" : ""}>
                    <div className="flex items-center gap-3.5 mb-5">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-black text-base shadow-xs">
                        {item.name?.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#212529] text-base leading-snug flex items-center gap-2">
                          {item.name}
                          {!isPending ? (
                            <span className="text-[9px] font-black tracking-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 leading-none shrink-0 flex items-center gap-0.5">
                              অনুমোদিত
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-lg bg-amber-500 text-white border border-amber-600 leading-none shrink-0 flex items-center gap-1 shadow-sm animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> পেন্ডিং (অনুমোদন প্রয়োজন)
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest mt-1">পয়েন্ট আইডি: {item.id ? item.id.slice(0, 8) : "N/A"}</p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-4 text-xs font-semibold text-gray-550 leading-relaxed">
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{item.phone || "ফোন নাম্বার নেই"}</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{item.address || "ঠিকানা নেই"}</span>
                      </div>
                  </div>
                </div>

                {/* Admin Approval Button for pending Sub-DB listings */}
                {role === "admin" && (item.status === "pending_approval" || item.approved === false) && (
                  <div className="border-t border-dashed border-gray-150 pt-4 mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">অনুমোদন প্রয়োজন</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await updateSubDb(item.id, {
                          approved: true,
                          status: "approved"
                        });
                        toast.success(`'${item.name}' পয়েন্টটি সফলভাবে অনুমোদন করা হয়েছে!`);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-[10px] transition-all cursor-pointer"
                    >
                      অনুমোদন করুন
                    </button>
                  </div>
                )}

                {/* Sub-DB outstanding ledger totals */}
                <div className="border-t border-gray-100 pt-4 mt-5 flex justify-between items-center bg-gray-50/50 -mx-6 -mb-6 p-5 rounded-b-3xl">
                  <span className="text-xs font-bold text-gray-500">বর্তমান বকেয়া দেনা:</span>
                  <span className={`text-base font-black font-mono ${item.balance > 0 ? "text-red-600 animate-pulse" : "text-emerald-700"}`}>
                    {Number(item.balance || 0)} ৳
                  </span>
                </div>
              </div>
            );
          })}
        </div>
          
          {filteredSubDbs.length === 0 && (
            <div className="py-20 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-3xl"> 
              কোনো সাব-ডিবি ডিলার পয়েন্ট পাওয়া যায়নি।
            </div>
          )}
        </div>
      )}


      {/* VIEW: Product Shipment Entry Form */}
      {activeTab === "shipment" && (
        <form onSubmit={handleSaveShipment} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Items addition & parameters */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-6">
            <h3 className="text-lg font-black text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-emerald-600 rounded-xs" /> পণ্যের চালানি রশিদ বিবরণ (Product Dispatch Form)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">১. সাব-ডিবি পয়েন্ট নির্বাচন করুন</label>
                <select 
                  id="select-shipment-subdb"
                  value={selectedSubDbId}
                  onChange={e => setSelectedSubDbId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm font-bold text-gray-950 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="">পয়েন্ট সিলেক্ট করুন</option>
                  {approvedSubDbs.map(s => <option key={s.id} value={s.id}>{s.name} (বকেয়া: {s.balance || 0} ৳)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">২. চালানের তারিখ নির্ধারণ করুন</label>
                <input 
                  type="date" 
                  value={shipmentDate} 
                  onChange={e => setShipmentDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm font-bold text-gray-950 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
            </div>

            {/* Product fast addition with search list (POS style) */}
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-4">
              <label className="block text-xs font-black text-gray-650 uppercase tracking-wider">৩. চালানে প্রোডাক্ট যোগ করুন</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  placeholder="পণ্য খুঁজুন বা সিলেক্ট করুন..."
                  value={subDbProductSearch}
                  onChange={(e) => setSubDbProductSearch(e.target.value)}
                  className="w-full pl-10 border rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-black outline-none bg-white transition-all shadow-xs border-gray-200"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1.5">
                {products
                  .filter(p => p.name.toLowerCase().includes(subDbProductSearch.toLowerCase()))
                  .map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleAddShipmentItem(p.id)}
                      className="p-3 border rounded-xl flex justify-between items-center cursor-pointer hover:bg-white active:bg-gray-100 transition-all border-gray-200/65 bg-white/50 shadow-xs"
                    >
                      <div>
                        <div className="font-extrabold text-gray-900 text-xs">{p.name}</div>
                        <div className="text-[10px] font-bold text-gray-500 mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                          <span>স্টক: <span className={(p.stock || 0) <= 5 ? "text-rose-600 font-extrabold font-mono" : "text-gray-955 font-bold font-mono"}>{p.stock || 0} পিস</span></span>
                          <span>|</span>
                          <span>কার্টুন সাইজ: <span className="text-gray-950 font-bold font-mono">{p.cartoonSize || 1} পিস</span></span>
                          <span>|</span>
                          <span>কেনা রেট: <span className="text-emerald-700 font-extrabold font-mono">{p.cost || p.price || 0} ৳</span></span>
                        </div>
                      </div>
                      <div className="p-1 px-2.5 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1 shrink-0">
                        <Plus className="w-3 h-3" /> চালানে যোগ
                      </div>
                    </div>
                  ))}
                {products.filter(p => p.name.toLowerCase().includes(subDbProductSearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-3 font-bold">কোন পণ্য পাওয়া যায়নি</p>
                )}
              </div>
            </div>

            {/* Active shipment items list */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">চালান তালিকাভুক্ত আইটেমসমূহ ({shipmentItems.length})</h4>
              
              <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden bg-white">
                {shipmentItems.map((sItem) => {
                  const p = products.find(prod => prod.id === sItem.productId);
                  if (!p) return null;

                  const totalPieces = sItem.cartons * (p.cartoonSize || 1);
                  const isInsufficient = (p.stock || 0) < totalPieces;

                  return (
                    <div 
                      key={sItem.productId} 
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        isInsufficient ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-extrabold text-sm text-[#212529] flex items-center gap-2">
                          {p.name}
                          {isInsufficient && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded border border-red-200">
                              স্টক কম!
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wide">
                          ১ কার্টুন রেট: {(p.cartoonSize || 1) * (p.cost || 0)} ৳ (কেনা রেট: {p.cost} ৳/Pcs | সাইজ: {p.cartoonSize} Pcs)
                        </div>
                      </div>

                      {/* Cartons count modification inputs */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                          <button 
                            type="button" 
                            onClick={() => handleUpdateItemCartons(sItem.productId, sItem.cartons - 1)}
                            className="p-1 hover:bg-white text-gray-600 rounded-lg"
                          >
                            <MinusCircle className="w-5 h-5 shrink-0" />
                          </button>
                          <input 
                            type="number" 
                            value={sItem.cartons} 
                            min="1"
                            onChange={e => handleUpdateItemCartons(sItem.productId, Number(e.target.value))}
                            className="w-14 text-center bg-transparent border-none p-0 text-sm font-black font-mono focus:outline-none"
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => handleUpdateItemCartons(sItem.productId, sItem.cartons + 1)}
                            className="p-1 hover:bg-white text-gray-600 rounded-lg"
                          >
                            <PlusCircle className="w-5 h-5 shrink-0" />
                          </button>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-2 border-l pl-2">কার্টুন</span>
                        </div>

                        {/* Calculations readout */}
                        <div className="w-24 text-right">
                          <div className="text-xs font-black text-gray-900 font-mono">
                            {totalPieces * (p.cost || 0)} ৳
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">
                            {totalPieces} Pcs
                          </div>
                        </div>

                        {/* Remove Action */}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveShipmentItem(sItem.productId)}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {shipmentItems.length === 0 && (
                  <div className="py-12 text-center text-xs text-gray-400 font-bold italic">
                    কোনো প্রোডাক্ট যোগ করা হয়নি। উপরের ড্রপডাউন থেকে প্রোডাক্ট সিলেক্ট করুন।
                  </div>
                )}
              </div>
            </div>

            {/* Flat Logistics vehicle rent input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="block text-xs font-black text-gray-550 uppercase tracking-wider mb-1.5">৪. গাড়ি ভাড়া বাবদ প্রাপ্তি (আলাদা আয়)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">৳</span>
                  <input 
                    type="number" 
                    value={carriageRent}
                    onChange={e => setCarriageRent(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 bg-white text-sm font-black font-mono focus:outline-none"
                    placeholder="2500"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-1.5">গাড়ি ভাড়া বাবদ ২৫০০ টাকা কোম্পানি প্রফিট একাউন্ট / আদার্স ইনকাম তালিকায় জমা হবে।</p>
              </div>
            </div>
          </div>


          {/* Shipment Invoice summary readout panels */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg h-fit space-y-6">
            <h3 className="text-base font-black border-b border-slate-800 pb-3 block">২. সাব-ডিবি চালান বিবরণী</h3>
            
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center text-slate-400">
                <span>মোট আইটেম কার্টুন সংখ্যা:</span>
                <span className="text-sm font-black text-white font-mono">{draftCalculation.totalCartons} Ctn</span>
              </div>
              
              <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-white text-base">
                <span className="font-extrabold text-slate-300">সর্বমোট চালান মূল্য:</span>
                <span className="text-xl font-extrabold text-[#38bdf8] font-mono">{draftCalculation.totalAmount} ৳</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <button 
                type="submit"
                id="btn-confirm-submit-shipment"
                disabled={shipmentItems.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs py-4 px-4 rounded-xl transition-all tracking-wider uppercase cursor-pointer"
              >
                পণ্য চালান এন্ট্রি নিশ্চিত করুন
              </button>
              
              <button 
                type="button"
                id="btn-generate-pdf-shipment"
                disabled={shipmentItems.length === 0}
                onClick={handleGeneratePDF}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs py-4 px-4 rounded-xl transition-all tracking-wider uppercase cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 shrink-0" /> চালান PDF ডাউনলোড করুন
              </button>
            </div>
          </div>
        </form>
      )}


      {/* VIEW: Point Payments Collection */}
      {activeTab === "payments" && (
        <div className="max-w-2xl mx-auto bg-white border border-gray-150 p-6 rounded-3xl shadow-xs space-y-6">
          <h3 className="text-lg font-black text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4.5 bg-indigo-650 rounded-xs" /> সাব-ডিবি পয়েন্ট হতে বকেয়া কালেকশন (Payment collection form)
          </h3>

          <form onSubmit={handleSavePayment} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">১. সাব-ডিবি ডিলার পয়েন্ট সিলেক্ট করুন</label>
              <select 
                id="select-payment-subdb"
                value={paySubDbId}
                onChange={e => setPaySubDbId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm font-bold text-gray-950 focus:outline-none"
                required
              >
                <option value="">পয়েন্ট সিলেক্ট করুন</option>
                {approvedSubDbs.map(s => <option key={s.id} value={s.id}>{s.name} (সব মিলিয়ে বকেয়া: {s.balance || 0} ৳)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">২. জমা বা উত্তোলনের পরিমাণ (টাকা)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">৳</span>
                  <input 
                    type="number" 
                    id="input-payment-amount"
                    value={payAmount || ""}
                    onChange={e => setPayAmount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 bg-white text-sm font-black font-mono focus:outline-none"
                    placeholder="৳ 5000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">৩. কালেকশনের তারিখ</label>
                <input 
                  type="date" 
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">৪. পেমেন্ট মেথড</label>
                <select 
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm font-bold focus:outline-none"
                  required
                >
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Rocket">Rocket (রকেট)</option>
                  <option value="Bank">Bank (ব্যাংক ট্রান্সফার)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">৫. ট্রানজিট ক্যাশ একাউন্ট</label>
                <select 
                  value={payAccount}
                  onChange={e => setPayAccount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm font-bold focus:outline-none"
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (ব্যালেন্স: {acc.balance || 0} ৳)</option>
                  ))}
                  {accounts.length === 0 && (
                    <>
                      <option value="cash">প্রধান ক্যাশ বাক্স</option>
                      <option value="bank">ব্যাংক একাউন্ট</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">৬. অতিরিক্ত বিবরণ বা মন্তব্য (ঐচ্ছিক)</label>
              <textarea 
                value={payRemarks}
                onChange={e => setPayRemarks(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm h-20"
                placeholder="উদা: চালান নং ১০৪-এর আংশিক বকেয়া পরিশোধ"
              />
            </div>

            <div className="pt-4 border-t">
              <button 
                type="submit"
                id="btn-confirm-payment-subdb"
                className="w-full btn-primary py-3.5 rounded-xl text-xs font-black uppercase transition-all tracking-wider cursor-pointer"
              >
                পেমেন্ট রিসিভ এন্ট্রি করুন
              </button>
            </div>
          </form>
        </div>
      )}


      {/* VIEW: Ledger Book View */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          
          {/* Selector header */}
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <FileText className="w-5 h-5 text-emerald-600" />
              <div className="w-full md:w-64">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">সাব-ডিবি লেজার হিসাব খাতা</label>
                <select 
                  id="select-ledger-subdb-picker"
                  value={activeLedgerSubDbId}
                  onChange={e => {
                    setActiveLedgerSubDbId(e.target.value);
                  }}
                  className="w-full border-none p-0 text-sm font-extrabold focus:outline-none focus:ring-0 bg-transparent text-gray-900 cursor-pointer"
                >
                  <option value="">সাব-ডিবি পয়েন্ট নির্বাচন করুন</option>
                  {approvedSubDbs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Quick Ledger Balances */}
            {activeLedgerSubDbId && (
              <div className="flex flex-wrap gap-4 text-xs font-semibold scale-95 md:scale-100">
                <div className="bg-gray-50 border px-4 py-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 block font-bold">মোট চালানমূল্য</span>
                  <span className="text-sm font-bold font-mono text-gray-700">{activeLedgerData.totalSales} ৳</span>
                </div>
                <div className="bg-gray-50 border px-4 py-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 block font-bold">মোট জমা পরিশোধ</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">{activeLedgerData.totalPaid} ৳</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 px-4 py-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-600 block font-black">নিট বকেয়া</span>
                  <span className="text-sm font-black font-mono text-emerald-700">{activeLedgerData.currentBal} ৳</span>
                </div>
              </div>
            )}
          </div>

          {/* Ledger book listings table */}
          {activeLedgerSubDbId ? (
            <div className="bg-white border rounded-3xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#F8F9FA] text-[10px] uppercase font-black text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">তারিখ</th>
                    <th className="px-6 py-4">রসিদ / টাইপ</th>
                    <th className="px-6 py-4">বিবরণ</th>
                    <th className="px-6 py-4 text-right">ডেবিট (টাকা যোগ)</th>
                    <th className="px-6 py-4 text-right">ক্রেডিট (টাকা জমা)</th>
                    <th className="px-6 py-4 text-right">জের বা ব্যালেন্স</th>
                    {role === "admin" && <th className="px-6 py-4 text-center">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {activeLedgerData.list.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-mono">{item.date}</td>
                      <td className="px-6 py-4">
                        {item.type === "invoice" ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-bold border border-amber-100 uppercase text-[9px] tracking-wide">চালানপত্র</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold border border-emerald-100 uppercase text-[9px] tracking-wide">পেমেন্ট রিসিভ</span>
                        )}
                        <span className="font-mono text-[10px] text-gray-400 ml-1.5 font-bold">#{item.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-bold">{item.description}</div>
                        {item.type === "invoice" && (
                          <div className="flex items-center gap-3 mt-1.5 font-semibold text-[10px]">
                            <button 
                              type="button" 
                              onClick={() => setSelectedShipmentDetail(item.rawObj)}
                              className="text-indigo-650 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" /> চালান বিবরণী
                            </button>
                            <span className="text-gray-300">|</span>
                            <button 
                              type="button" 
                              onClick={() => printFriendlyInvoice(item.rawObj)}
                              className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <Printer className="w-3.5 h-3.5 shrink-0" /> প্রিন্ট করুন
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-red-650">
                        {item.debit > 0 ? `+${item.debit} ৳` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                        {item.credit > 0 ? `-${item.credit} ৳` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 bg-gray-50/30">
                        {item.balance} ৳
                      </td>
                      {role === "admin" && (
                        <td className="px-6 py-4 text-center">
                          {item.type === "invoice" ? (
                            <button 
                              onClick={() => handleDeleteShipment(item.rawObj)}
                              className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-[10px] border border-red-100 flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 shrink-0 rotate-180" /> রিভার্স / ডিলিট
                            </button>
                          ) : (
                            <button 
                              onClick={async () => {
                                setConfirmModal({
                                  show: true,
                                  title: "পেমেন্ট রেকর্ড ডিলিট নিশ্চিতকরণ",
                                  message: "পেমেন্ট রেকর্ডটি ডিলিট করতে চান? সাব-ডিবির ব্যালেন্স পুনরুদ্ধার (বৃদ্ধি) করা হবে।",
                                  onConfirm: async () => {
                                    setConfirmModal(null);
                                    // Restore balance
                                    const subDbObj = subDbs.find(s => s.id === item.rawObj.entityId);
                                    if (subDbObj) {
                                      const currentBalance = Number(subDbObj.balance || 0);
                                      await updateSubDb(subDbObj.id, {
                                        balance: currentBalance + Number(item.rawObj.amount || 0)
                                      });
                                    }
                                    await removePayment(item.id);
                                    toast.success("পেমেন্ট সফলভাবে রিমুভ ও রিভার্স করা হয়েছে!");
                                  }
                                });
                              }}
                              className="p-1 px-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg font-bold text-[10px] mx-auto cursor-pointer"
                            >
                              মুছে ফেলুন
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}

                  {activeLedgerData.list.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400 italic font-medium">কোনো লেনদেন রেকর্ড পাওয়া যায়নি।</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 italic font-medium border-2 border-dashed border-gray-150 rounded-3xl bg-white">
              হিসাব দেখতে উপরে একটি সাব-ডিবি ডিলার পয়েন্ট নির্বাচন করুন।
            </div>
          )}
        </div>
      )}


      {/* VIEW: Sub-DB Reports with PDF/Excel Downloads and WhatsApp Shares */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          
          {/* Settings panel */}
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-6">
            <h3 className="text-sm font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-xs" /> ১. রিপোর্টের ধরণ ও পিরিয়ড ফিল্টার
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 align-middle">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">ফিল্টারের ধরণ</label>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border">
                  <button 
                    type="button"
                    onClick={() => {
                      setReportType("daily");
                    }}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg ${reportType === 'daily' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    তারিখ অনুযায়ী
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setReportType("monthly");
                    }}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg ${reportType === 'monthly' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    মাসিক বিবরণী
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">২. সাব-ডিবি পয়েন্ট</label>
                <select 
                  id="select-report-subdb"
                  value={reportSubDbId}
                  onChange={e => setReportSubDbId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold font-sans"
                  required
                >
                  <option value="">পয়েন্ট সিলেক্ট করুন</option>
                  {approvedSubDbs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {reportType === "daily" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">শুরুর ডেট</label>
                    <input 
                      type="date" 
                      value={reportRangeStart} 
                      onChange={e => setReportRangeStart(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2 bg-white text-xs font-bold font-sans" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">শেষের ডেট</label>
                    <input 
                      type="date" 
                      value={reportRangeEnd} 
                      onChange={e => setReportRangeEnd(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2 bg-white text-xs font-bold font-sans" 
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">বেতন ও চালান হিসাব মাস</label>
                  <input 
                    type="month" 
                    value={reportMonth} 
                    onChange={e => setReportMonth(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 bg-white text-xs font-bold font-mono tracking-widest" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Report Output Content & EXPORTS */}
          {reportSubDbId ? (
            <div className="bg-white border rounded-3xl p-6 shadow-xs space-y-6">
              
              {/* Export Button Drawer */}
              <div className="flex flex-wrap gap-2 justify-between items-center bg-gray-50 p-4 rounded-2xl border">
                <div className="text-xs font-black text-gray-600">
                  চালান বিবরণী ফলাফল: <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{reportOutputData.length} টি রেকর্ড পাওয়া গিয়েছে</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Print / PDF view */}
                  <button 
                    onClick={() => {
                      const printArea = document.getElementById("subdb-printable-report-area");
                      if (printArea) {
                        const originalContent = document.body.innerHTML;
                        const printContent = printArea.innerHTML;
                        document.body.innerHTML = printContent;
                        window.print();
                        document.body.innerHTML = originalContent;
                        // Reload page to reattach React bindings
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 text-xs font-bold rounded-xl border flex items-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 shrink-0" /> PDF এ প্রিন্ট
                  </button>

                  {/* CSV Export */}
                  <button 
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold rounded-xl border border-green-200 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" /> এক্সেল/CSV ফাইল
                  </button>

                  {/* WhatsApp Share */}
                  <button 
                    onClick={handleWhatsAppShare}
                    className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black rounded-xl border flex items-center gap-2 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 shrink-0" /> হোয়াটসঅ্যাপে শেয়ার
                  </button>
                </div>
              </div>

              {/* REPORT OVERVIEW DATA TO VIEW */}
              <div id="subdb-printable-report-area" className="space-y-6 p-4">
                
                {/* Print Header */}
                <div className="hidden print:block text-center border-b pb-4 mb-4">
                  <h1 className="text-xl font-extrabold text-gray-900 uppercase">সমীরা ট্রেডার্স (Samira Traders)</h1>
                  <p className="text-xs text-gray-500 font-bold mt-1">কার্টুন ডিস্ট্রিবিউশন ও সাব-ডিবি চালান বিবরণী</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">রিপোর্ট পিরিয়ড: {reportType === "daily" ? `${reportRangeStart} থেকে ${reportRangeEnd}` : `${reportMonth}`}</p>
                </div>

                {/* Sub-DB Summary Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                    <span className="text-[10px] font-black text-gray-400 block uppercase">মোট চালান (ফ্রিকোয়েন্সি)</span>
                    <span className="text-lg font-black font-mono text-gray-900">{reportTotals.times} বার</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                    <span className="text-[10px] font-black text-gray-400 block uppercase">সর্বমোট কার্টুন চালান</span>
                    <span className="text-lg font-black font-mono text-gray-900">{reportTotals.cartons} ctn</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                    <span className="text-[10px] font-black text-gray-400 block uppercase">চালানি মূল্য (কেনা রেটে)</span>
                    <span className="text-lg font-black font-mono text-indigo-650">{reportTotals.productsCost} ৳</span>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-[10px] font-black text-emerald-600 block uppercase">অর্জিত কার্টুন ও ক্যাব প্রফিট</span>
                    <span className="text-lg font-black font-mono text-emerald-800">{reportTotals.earnedProfits} ৳</span>
                  </div>
                </div>

                {/* Tables Details */}
                <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white mt-6">
                  <table className="w-full text-left text-xs align-middle">
                    <thead className="bg-[#F8F9FA] text-[10px] uppercase font-black text-gray-400 tracking-wider">
                      <tr>
                        <th className="px-6 py-4">তারিখ</th>
                        <th className="px-6 py-4">চালানআইডি</th>
                        <th className="px-6 py-4">চালানকৃত কার্টুনসমূহ</th>
                        <th className="px-6 py-4 text-center">কার্টুন সংখ্যা</th>
                        <th className="px-6 py-4 text-right">গাড়ি ভাড়া প্রাপ্তি</th>
                        <th className="px-6 py-4 text-right">কেনা দাম ভ্যালু</th>
                        <th className="px-6 py-4 text-right">সর্বমোট চালানপত্র দাবি</th>
                        <th className="px-6 py-4 text-right">কোম্পানি প্রফিট (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {reportOutputData.map((s: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-mono">{s.date}</td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-500">#{s.id?.slice(0, 8)}</td>
                          <td className="px-6 py-4 whitespace-normal max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {s.items?.map((it: any, iIdx: number) => (
                                <span key={iIdx} className="inline-block px-2 py-1 bg-gray-50 text-gray-700 rounded border border-gray-100 text-[10px] font-bold">
                                  {it.name} ({it.quantityCartons} Ctn)
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold font-mono">{s.totalCartons} ctn</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{s.rent || 0} ৳</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-indigo-750">{s.totalAmount} ৳</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{s.totalInvoice} ৳</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/20">{s.totalSubDbProfit} ৳</td>
                        </tr>
                      ))}

                      {/* Total Summaries row in Table bottom */}
                      <tr className="bg-slate-900 text-white font-extrabold text-[11px]">
                        <td colSpan={3} className="px-6 py-4 uppercase tracking-wider text-slate-300">মোট সর্বমোট সমষ্টি (Grand Totals):</td>
                        <td className="px-6 py-4 text-center font-mono">{reportTotals.cartons} ctn</td>
                        <td className="px-6 py-4 text-right font-mono">{reportTotals.rentFees} ৳</td>
                        <td className="px-6 py-4 text-right font-mono">{reportTotals.productsCost} ৳</td>
                        <td className="px-6 py-4 text-right font-mono text-amber-400">{reportTotals.totalInvoicesAmount} ৳</td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-400 bg-emerald-950/40">{reportTotals.earnedProfits} ৳</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 italic font-medium bg-white border border-gray-150 rounded-3xl">
              চালানী রিপোর্ট দেখতে ও ডাউনলোড করতে উপরে একটি সাব-ডিবি পয়েন্ট নির্বাচন করুন।
            </div>
          )}
        </div>
      )}

      {/* DETAIL DIALOG MODAL: Custom invoice voucher viewer */}
      {selectedShipmentDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-xs" /> সাব-ডিবি বিক্রয় চালান ও চালানপত্র
                </h3>
                <p className="text-[10px] font-bold text-gray-400 font-mono mt-1">চালান আইডি: #{selectedShipmentDetail.id ? selectedShipmentDetail.id.toUpperCase() : "NEW"}</p>
              </div>
              <button 
                onClick={() => setSelectedShipmentDetail(null)}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-150 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              
              {/* Point information summary */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-150">
                <div>
                  <span className="text-[10.5px] text-gray-400 font-extrabold uppercase tracking-wide block">চালান গ্রহীতা (Sub-DB Point)</span>
                  <span className="text-base font-black text-gray-950 block mt-1">{selectedShipmentDetail.subDbName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] text-gray-400 font-extrabold uppercase tracking-wide block">চালানের তারিখ (Date)</span>
                  <span className="text-base font-black text-gray-950 block mt-1 font-mono">{selectedShipmentDetail.date}</span>
                </div>
              </div>

              {/* Items listing */}
              <div className="space-y-3">
                <span className="text-[10px] text-gray-450 font-black block uppercase tracking-wider">চালান আইটেম বিবরণী (Invoice Details)</span>
                
                <div className="border border-gray-150 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F8F9FA] text-[11px] font-black text-slate-800 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">পণ্যের বিবরণ (Product Details)</th>
                        <th className="px-4 py-3 text-center">মোট কার্টুন (Ctn)</th>
                        <th className="px-4 py-3 text-right">কার্টুন প্রতি দর (Ctn Rate)</th>
                        <th className="px-4 py-3 text-center">মোট পিস (Qty)</th>
                        <th className="px-4 py-3 text-right text-indigo-650">মোট মূল্য (Amount)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-xs text-gray-700">
                      {(selectedShipmentDetail.items || []).map((it: any, itIdx: number) => {
                        const ctnRate = (it.piecesPerCarton || 1) * (it.cost || 0);
                        return (
                          <tr key={itIdx} className="hover:bg-gray-50/20">
                            <td className="px-4 py-3 font-bold text-gray-950">
                              <div>{it.name}</div>
                              {it.sku && <span className="text-[10px] text-gray-400 font-medium font-mono">SKU ID: {it.sku}</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-black text-emerald-700 font-mono">{it.quantityCartons || it.cartons || 1}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900 font-bold">{(ctnRate || 0).toFixed(2)} ৳</td>
                            <td className="px-4 py-3 text-center font-mono text-gray-500 font-bold">{it.totalPieces} Pcs</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-900">{(it.totalAmount || 0).toFixed(2)} ৳</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoices summaries */}
              <div className="border-t border-dashed pt-4 flex flex-col items-end space-y-2 text-xs font-semibold">
                <div className="flex gap-4 w-60 justify-between text-gray-500">
                  <span>সর্বমোট কার্টুন:</span>
                  <span className="font-bold font-mono">{selectedShipmentDetail.totalCartons || 0} Ctn</span>
                </div>
                <div className="flex gap-4 w-60 justify-between border-t pt-2 text-[#121212] font-black text-sm">
                  <span>সর্বমোট চালানি মূল্য:</span>
                  <span className="font-mono text-indigo-650">{(selectedShipmentDetail.totalAmount || selectedShipmentDetail.totalInvoice || 0).toFixed(2)} ৳</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => printFriendlyInvoice(selectedShipmentDetail)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100"
              >
                <Printer className="w-4 h-4" /> প্রিন্ট চালানপত্র (Print)
              </button>
              <button 
                onClick={() => setSelectedShipmentDetail(null)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-bold text-xs text-gray-650 hover:bg-gray-50 hover:text-black cursor-pointer bg-white"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MANUAL OVERLAY: Add Sub-DB */}
      {showAddSubDb && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black mb-4">
              {editingSubDbId ? "সাব-ডিলার পয়েন্ট তথ্য সংশোধন" : "নতুন সাব-ডিলার পয়েন্ট সংযোজন"}
            </h3>
            <form onSubmit={handleSaveSubDbManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">পয়েন্ট বা ডিলারের নাম</label>
                <input 
                  name="name" 
                  defaultValue={editingSubDbId ? subDbs.find(s => s.id === editingSubDbId)?.name : ""} 
                  required 
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-bold" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ফোন / মোবাইল নম্বর</label>
                <input 
                  name="phone" 
                  defaultValue={editingSubDbId ? subDbs.find(s => s.id === editingSubDbId)?.phone : ""} 
                  required 
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-mono" 
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ঠিকানা</label>
                <textarea 
                  name="address" 
                  defaultValue={editingSubDbId ? subDbs.find(s => s.id === editingSubDbId)?.address : ""} 
                  required 
                  className="w-full border border-gray-200 rounded-xl p-2.5 h-20 text-xs" 
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddSubDb(false)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer">বাতিল</button>
                <button type="submit" className="flex-1 btn-primary py-3 font-black text-xs cursor-pointer">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM INLINE CONFIRMATION MODAL TO BYPASS IFRAME RESTRICTIONS */}
      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 transition-all backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-150 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-gray-950 flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-indigo-600 rounded-xs" /> {confirmModal.title}
            </h3>
            <p className="text-xs font-semibold text-gray-650 leading-relaxed whitespace-pre-line">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border border-gray-200 rounded-xl text-xs transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer"
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Icon helper X to dismiss modal
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
