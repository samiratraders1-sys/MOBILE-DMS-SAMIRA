import React, { useState, useMemo } from "react";
import { Calendar, Trash2, Pencil, Plus, X, Printer, FileText, RefreshCw, AlertTriangle, Wifi, WifiOff, CheckCircle } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import ReportWrapper from "./ReportWrapper";
import toast from "react-hot-toast";
import MultiSelect from "./MultiSelect";
import { recordStockMovement } from "../lib/inventoryEngine";
import { useConfirm } from "../context/ConfirmContext";
import { useCompany } from "../context/CompanyContext";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { db } from "../lib/firebase";

interface SalesProps {
  sales: any[];
  products: any[];
  customers: any[];
  suppliers: any[];
  routes: any[];
  staff: any[];
  user: any;
  add: (item: any) => Promise<any>;
  remove: (id: string) => Promise<void>;
  update?: (id: string, item: any) => Promise<void>;
  updateProduct?: (id: string, item: any) => Promise<void>;
  updateCustomer?: (id: string, item: any) => Promise<void>;
}

export default function SalesView({ 
  sales, 
  products, 
  customers, 
  suppliers, 
  routes, 
  staff, 
  user, 
  add, 
  remove, 
  update, 
  updateProduct, 
  updateCustomer 
}: SalesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterRouteIds, setFilterRouteIds] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterSrId, setFilterSrId] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedSalesIds, setSelectedSalesIds] = useState<string[]>([]);
  const { company } = useCompany();

  const [isSyncing, setIsSyncing] = useState(false);
  const unsyncedSalesCount = useMemo(() => {
    return (sales || []).filter((s: any) => s.pending_changes === true).length;
  }, [sales]);

  const handleRetrySync = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("আপনি এখনও অফলাইন আছেন! ইন্টারনেট কানেকশন চেক করুন।");
      return;
    }
    setIsSyncing(true);
    try {
      toast.loading("ম্যানুয়াল সিঙ্ক শুরু হচ্ছে...", { id: "sync-toast" });
      await disableNetwork(db);
      await enableNetwork(db);
      toast.success("ম্যানুয়াল সিঙ্ক সম্পন্ন হয়েছে এবং ডাটা সফলভাবে ক্লাউডে আপলোড করা হচ্ছে!", { id: "sync-toast" });
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      toast.error("সিঙ্ক করতে ব্যর্থ হয়েছে: " + err.message, { id: "sync-toast" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Print preview configuration states
  const [printPreviewSales, setPrintPreviewSales] = useState<any[] | null>(null);
  const [printOptions, setPrintOptions] = useState({
    paperSize: "A4" as "A4" | "58mm",
    showSerial: true,
    showRates: true, // unit price
    showItemDiscount: true,
    showTaxBreakdown: true,
    showTotals: true,
    showMeta: true,
    showFooter: true,
    showSignatures: true,
    customNote: ""
  });

  // Master HTML print template generator
  const generatePrintHTML = (salesToPrint: any[], options: typeof printOptions) => {
    const invoicesHtml = salesToPrint.map((sale) => {
      const selectedCustomer = customers.find(c => c.id === sale.customerId);
      const selectedRoute = routes.find(r => r.id === sale.routeId);
      const selectedStaff = staff.find(st => st.id === sale.srId);

      return `
        <div class="invoice-sheet">
          <div class="brand-section">
            <h2>সমীরা ট্রেডার্স</h2>
            <p class="subtitle">চকবাজার, ঢাকা | ডিস্ট্রিবিউশন ম্যানেজমেন্ট সিস্টেম (DMS)</p>
            <div class="badge">ক্যাশ মেমো / ইনভয়েস</div>
          </div>
          
          ${options.showMeta ? `
          <div class="meta-section">
            <div class="meta-col">
              <p><strong>মেমো আইডি:</strong> #${sale.id ? sale.id.slice(0, 8).toUpperCase() : 'N/A'}</p>
              <p><strong>তারিখ:</strong> ${new Date(sale.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>কাস্টমার:</strong> ${selectedCustomer?.name || "নগদ কাস্টমার"}</p>
            </div>
            <div class="meta-col">
              <p><strong>ডেলিভারি রোড:</strong> ${selectedRoute?.name || 'N/A'}</p>
              <p><strong>এস আর:</strong> ${selectedStaff?.name || 'N/A'}</p>
              <p><strong>ইস্যুকারী:</strong> ${sale.createdBy || 'Unknown'}</p>
            </div>
          </div>
          ` : `
          <div class="meta-section" style="margin-bottom: 10px; font-size: 11px; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px;">
            <span><strong>মেমো:</strong> #${sale.id ? sale.id.slice(0, 8).toUpperCase() : 'N/A'}</span>
            <span><strong>তারিখ:</strong> ${new Date(sale.date).toLocaleDateString('bn-BD')}</span>
            <span><strong>গ্রাহক:</strong> ${selectedCustomer?.name || "নগদ কাস্টমার"}</span>
          </div>
          `}
          
          <table class="items-table">
            <thead>
              <tr>
                ${options.showSerial ? `<th style="width: 8%;">ক্রমিক</th>` : ''}
                <th>পণ্যের বিবরণ</th>
                <th style="text-align: center; width: 22%;">পরিমাণ (Ctn/Pcs)</th>
                ${options.showRates ? `<th style="text-align: right; width: 14%;">দর (Pcs)</th>` : ''}
                ${options.showItemDiscount ? `<th style="text-align: right; width: 14%;">ডিসকাউন্ট</th>` : ''}
                ${options.showTaxBreakdown ? `<th style="text-align: right; width: 14%;">ভ্যাট/ট্যাক্স</th>` : ''}
                ${options.showTotals ? `<th style="text-align: right; width: 16%;">মোট মূল্য</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${(sale.items || []).map((item: any, idx: number) => {
                const prod = products.find(p => p.id === (item.productId || item.id));
                const name = prod?.name || item.name || 'অজানা পণ্য';
                const qty = Number(item.qty || item.quantity || 0);
                const price = Number(item.price || item.unitPrice || 0);
                const cartonSize = Number(prod?.cartoonSize || prod?.cartonSize || 1);
                
                const discount = Number(item.discount || 0);
                const calculatedDiscount = item.calculatedDiscount ? Number(item.calculatedDiscount) : (item.discountType === 'percent' ? (qty * price * discount / 100) : discount);
                
                const taxPercent = company?.taxPercent || 0;
                const vatPercent = company?.vatPercent || 0;
                const calculatedTax = (qty * price - calculatedDiscount) * (taxPercent + vatPercent) / 100;
                
                let qtyStr = `${qty} Pcs`;
                if (cartonSize > 1) {
                  const c = Math.floor(qty / cartonSize);
                  const p = qty % cartonSize;
                  const pts = [];
                  if (c > 0) pts.push(`${c}C`);
                  if (p > 0) pts.push(`${p}P`);
                  qtyStr = `${pts.join('/')} (${qty} Pcs)`;
                }
                
                const rowTotal = qty * price - calculatedDiscount + (options.showTaxBreakdown ? calculatedTax : 0);
                
                return `
                  <tr>
                    ${options.showSerial ? `<td>${idx + 1}</td>` : ''}
                    <td class="font-bold">${name}</td>
                    <td style="text-align: center; font-weight: bold;">${qtyStr}</td>
                    ${options.showRates ? `<td style="text-align: right;">${price.toFixed(2)} ৳</td>` : ''}
                    ${options.showItemDiscount ? `<td style="text-align: right; color: #dc2626;">${calculatedDiscount > 0 ? `-${calculatedDiscount.toFixed(2)} ৳` : '0.00 ৳'}</td>` : ''}
                    ${options.showTaxBreakdown ? `<td style="text-align: right; color: #4f46e5;">${calculatedTax > 0 ? `${calculatedTax.toFixed(2)} ৳` : '0.00 ৳'}</td>` : ''}
                    ${options.showTotals ? `<td style="text-align: right; font-weight: bold;">${rowTotal.toFixed(2)} ৳</td>` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          ${options.showTotals ? (() => {
            const itemTotals = (sale.items || []).reduce((sum: number, item: any) => {
              const qty = Number(item.qty || item.quantity || 0);
              const price = Number(item.price || item.unitPrice || 0);
              return sum + (qty * price);
            }, 0);
            const totalDiscounts = (sale.items || []).reduce((sum: number, item: any) => {
              const qty = Number(item.qty || item.quantity || 0);
              const price = Number(item.price || item.unitPrice || 0);
              const discount = Number(item.discount || 0);
              const calculatedDiscount = item.calculatedDiscount ? Number(item.calculatedDiscount) : (item.discountType === 'percent' ? (qty * price * discount / 100) : discount);
              return sum + calculatedDiscount;
            }, 0);
            const taxPercent = company?.taxPercent || 0;
            const vatPercent = company?.vatPercent || 0;
            const totalTax = (sale.items || []).reduce((sum: number, item: any) => {
              const qty = Number(item.qty || item.quantity || 0);
              const price = Number(item.price || item.unitPrice || 0);
              const discount = Number(item.discount || 0);
              const calculatedDiscount = item.calculatedDiscount ? Number(item.calculatedDiscount) : (item.discountType === 'percent' ? (qty * price * discount / 100) : discount);
              return sum + ((qty * price - calculatedDiscount) * (taxPercent + vatPercent) / 100);
            }, 0);
            const netBill = itemTotals - totalDiscounts + (options.showTaxBreakdown ? totalTax : 0);

            return `
            <div class="totals-section">
              <div class="totals-box">
                <div class="total-row">
                  <span>উপ-মোট বিল (Subtotal):</span>
                  <span>${itemTotals.toFixed(2)} ৳</span>
                </div>
                ${options.showItemDiscount && totalDiscounts > 0 ? `
                <div class="total-row" style="color: #dc2626;">
                  <span>মোট ডিসকাউন্ট (Discount):</span>
                  <span>-${totalDiscounts.toFixed(2)} ৳</span>
                </div>
                ` : ''}
                ${options.showTaxBreakdown && totalTax > 0 ? `
                <div class="total-row" style="color: #4f46e5;">
                  <span>ভ্যাট ও ট্যাক্স (${(taxPercent + vatPercent)}%):</span>
                  <span>+${totalTax.toFixed(2)} ৳</span>
                </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>চূড়ান্ত নিট বিল (Net Total):</span>
                  <span>${Number(sale.total || netBill).toFixed(2)} ৳</span>
                </div>
              </div>
            </div>
            `;
          })() : ''}

          ${options.customNote ? `
          <div style="margin-top: 15px; border: 1px dashed #000; padding: 10px; font-size: 11px; border-radius: 4px; background: #fafafa;">
            <strong>विशेष नोट:</strong> ${options.customNote}
          </div>
          ` : ''}

          ${options.showSignatures ? `
          <div style="display: flex; justify-content: space-between; margin-top: 60px; font-size: 11px;">
            <div style="border-top: 1px solid #000; width: 28%; text-align: center; padding-top: 5px;">গ্রাহকের স্বাক্ষর</div>
            <div style="border-top: 1px solid #000; width: 28%; text-align: center; padding-top: 5px;">ডেলিভারিম্যান স্বাক্ষর</div>
            <div style="border-top: 1px solid #000; width: 28%; text-align: center; padding-top: 5px;">অনুমোদিত স্বাক্ষর</div>
          </div>
          ` : ''}
          
          ${options.showFooter ? `
          <div class="footer-section">
            <p>ক্রয় করার জন্য ধন্যবাদ! যেকোনো অনুসন্ধানে যোগাযোগ করুন।</p>
            <p class="timestamp">প্রিন্ট সময়: ${new Date().toLocaleString('bn-BD')}</p>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>বিক্রয় মেমো প্রিন্ট (${salesToPrint.length} টি)</title>
  <style>
    ${options.paperSize === "58mm" ? `
    @page {
      size: 58mm auto;
      margin: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace, 'Noto Sans Bengali', sans-serif;
      color: #000;
      background: #fff;
      margin: 0 auto;
      padding: 4px 6px;
      width: 48mm;
      box-sizing: border-box;
      font-size: 10px;
      line-height: 1.3;
    }
    .print-container {
      width: 100%;
    }
    .invoice-sheet {
      background: #fff;
      padding: 2px 0 15px 0;
      box-sizing: border-box;
      border-bottom: 2px dashed #000;
      page-break-after: always;
    }
    .invoice-sheet:last-child {
      page-break-after: avoid;
      border-bottom: none;
    }
    .brand-section {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 6px;
    }
    .brand-section h2 {
      font-size: 14px;
      margin: 0 0 2px 0;
      font-weight: 900;
    }
    .brand-section .subtitle {
      font-size: 8px;
      margin: 0 0 4px 0;
      color: #000;
    }
    .brand-section .badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 1px 6px;
      font-size: 8px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .meta-section {
      display: block;
      margin-bottom: 8px;
      font-size: 9px;
      line-height: 1.4;
      border-bottom: 1px dotted #000;
      padding-bottom: 4px;
    }
    .meta-col {
      width: 100%;
    }
    .meta-col p {
      margin: 2px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 8px;
    }
    .items-table th {
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 4px 1px;
      font-weight: bold;
    }
    .items-table td {
      border-bottom: 1px dotted #000;
      padding: 4px 1px;
    }
    .font-bold {
      font-weight: bold;
    }
    .totals-section {
      display: block;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .totals-box {
      width: 100%;
      font-size: 9px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .grand-total {
      font-weight: bold;
      font-size: 11px;
      border-top: 1px dashed #000;
      border-bottom: 2px double #000;
      padding: 5px 0;
      margin-top: 2px;
    }
    .footer-section {
      text-align: center;
      font-size: 8px;
      margin-top: 15px;
      border-top: 1px dashed #000;
      padding-top: 6px;
    }
    .footer-section p {
      margin: 1px 0;
    }
    .timestamp {
      color: #000;
    }
    ` : `
    body {
      font-family: 'Courier New', Courier, monospace, 'Noto Sans Bengali', sans-serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    .print-container {
      width: 100%;
    }
    .invoice-sheet {
      background: #fff;
      padding: 10px;
      box-sizing: border-box;
      page-break-after: always;
    }
    .invoice-sheet:last-child {
      page-break-after: avoid;
    }
    .brand-section {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px double #000;
      padding-bottom: 10px;
    }
    .brand-section h2 {
      font-size: 24px;
      margin: 0 0 4px 0;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .brand-section .subtitle {
      font-size: 11px;
      margin: 0 0 8px 0;
      color: #333;
    }
    .brand-section .badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 3px 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .meta-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 11px;
      line-height: 1.6;
    }
    .meta-col {
      width: 48%;
    }
    .meta-col p {
      margin: 2px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 20px;
    }
    .items-table th {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
    }
    .items-table td {
      border-bottom: 1px dotted #999;
      padding: 6px 4px;
    }
    .font-bold {
      font-weight: bold;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
      margin-bottom: 30px;
    }
    .totals-box {
      width: 40%;
      font-size: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #ccc;
    }
    .grand-total {
      font-weight: bold;
      font-size: 14px;
      border-top: 1px solid #000;
      border-bottom: 2px double #000;
      padding: 6px 0;
      margin-top: 4px;
    }
    .footer-section {
      text-align: center;
      font-size: 9px;
      margin-top: 40px;
      border-top: 1px dashed #000;
      padding-top: 10px;
    }
    .footer-section p {
      margin: 2px 0;
    }
    .timestamp {
      color: #666;
    }
    `}
  </style>
</head>
<body>
  <div class="print-container">
    ${invoicesHtml}
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>
    `;
  };

  // Trigger high-fidelity print window
  const triggerBrowserPrint = () => {
    if (!printPreviewSales || printPreviewSales.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("প্রিন্ট উইন্ডো ওপেন করা সম্ভব হয়নি! পপ-আপ ব্লক সক্রিয় আছে কিনা চেক করুন।");
      return;
    }
    const htmlContent = generatePrintHTML(printPreviewSales, printOptions);
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const printInvoice = (sale: any) => {
    setPrintPreviewSales([sale]);
  };

  const printBulkInvoices = (salesToPrint: any[]) => {
    if (salesToPrint.length === 0) {
      toast.error("প্রিন্ট করার জন্য কোনো ইনভয়েস সিলেক্ট করা নেই!");
      return;
    }
    setPrintPreviewSales(salesToPrint);
  };

  // Edit States
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editRouteId, setEditRouteId] = useState("");
  const [editSrId, setEditSrId] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editItems, setEditItems] = useState<any[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { confirmDelete } = useConfirm();

  // Dynamic values list: unique product categories
  const categoriesList = React.useMemo(() => {
    return [...new Set(products.map(p => p.category || "General"))];
  }, [products]);

  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const customerName = customer ? customer.name.toLowerCase() : "নগদ কাস্টমার";
      const matchesSearch = searchTerm === "" || customerName.includes(searchTerm.toLowerCase());
      
      const matchesRoute = filterRouteIds.length === 0 || filterRouteIds.includes(s.routeId);
      
      const matchesCategory = filterCategories.length === 0 || s.items?.some((item: any) => {
        const prod = products.find(p => p.id === item.productId || p.id === item.id);
        const cat = prod?.category || "General";
        return filterCategories.includes(cat);
      });

      const matchesSr = filterSrId === "" || s.srId === filterSrId;
      const matchesSupplier = filterSupplierId === "" || s.items?.some((item: any) => {
          const prod = products.find(p => p.id === item.productId);
          return prod?.supplierId === filterSupplierId;
      });
      const saleDate = new Date(s.date);
      const matchesStartDate = filterStartDate === "" || saleDate >= new Date(filterStartDate);
      const matchesEndDate = filterEndDate === "" || saleDate <= new Date(filterEndDate + "T23:59:59");
      return matchesSearch && matchesRoute && matchesCategory && matchesSr && matchesSupplier && matchesStartDate && matchesEndDate;
    });
  }, [sales, searchTerm, filterRouteIds, filterCategories, filterSrId, filterSupplierId, filterStartDate, filterEndDate, customers, products]);

  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  const downloadCSV = () => {
    const headers = ["তারিখ", "রোড", "এস আর", "কাস্টমার", "মোট"];
    const rows = filteredSales.map(s => [
      new Date(s.date).toLocaleDateString('bn-BD'),
      routes.find(r => r.id === s.routeId)?.name || 'N/A',
      staff.find(st => st.id === s.srId)?.name || 'N/A',
      customers.find(c => c.id === s.customerId)?.name || "নগদ কাস্টমার",
      s.total
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareWhatsApp = () => {
    const text = `বিক্রয় রিপোর্ট:\nমোট বিক্রয়: ${formatCurrency(totalSales)}\nমোট অর্ডার: ${filteredSales.length}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Delete Action
  const handleDeleteSale = (sale: any) => {
    confirmDelete({
      recordName: `বিক্রয় মেমো #${sale.id ? sale.id.slice(0,6) : ""}`,
      onConfirm: async () => {
        try {
          if (sale.approved || sale.status === "paid") {
            // Revert product stock
            for (const item of sale.items || []) {
                const prodId = item.productId || item.id;
                if (prodId) {
                  const qty = Number(item.qty || item.quantity) || 0;
                  await recordStockMovement(prodId, 'RETURN', qty, sale.id);
                }
            }

            // Revert Customer Balance
            if (updateCustomer && sale.customerId) {
              const cust = customers.find(c => c.id === sale.customerId);
              if (cust) {
                await updateCustomer(cust.id, {
                  balance: (cust.balance || 0) - (Number(sale.total) || 0)
                });
              }
            }
          }

          await remove(sale.id);
          toast.success("বিক্রয় রেকর্ড সফলভাবে ডিলিট করা হয়েছে!");
        } catch (err: any) {
          console.error(err);
          toast.error("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
          throw err;
        }
      }
    });
  };

  // Edit Initiator
  const handleStartEditSale = (sale: any) => {
    setEditingSale(sale);
    setEditDate(sale.date ? sale.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditRouteId(sale.routeId || "");
    setEditSrId(sale.srId || "");
    setEditCustomerId(sale.customerId || "");
    setEditItems(
      (sale.items || []).map((item: any) => ({
        productId: item.productId || item.id,
        id: item.productId || item.id,
        name: item.name || products.find(p => p.id === (item.productId || item.id))?.name || "অজানা পণ্য",
        qty: Number(item.qty || item.quantity || 0),
        price: Number(item.price || 0)
      }))
    );
  };

  // Add Item inside edit state
  const handleAddProductToSale = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const exists = editItems.find(item => item.productId === productId);
    if (exists) {
      toast.error("পণ্যটি ইতিমধ্যেই যুক্ত রয়েছে!");
      return;
    }

    setEditItems([
      ...editItems,
      {
        productId: prod.id,
        id: prod.id,
        name: prod.name,
        qty: 1,
        price: prod.price || prod.cost || 0
      }
    ]);
    setSelectedAddProductId("");
  };

  const handleUpdateEditItem = (index: number, field: "qty" | "price", value: number) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

  const handleRemoveProductFromSale = (index: number) => {
    setEditItems(editItems.filter((_, idx) => idx !== index));
  };

  // Save Edit Function
  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !update) return;

    if (editItems.length === 0) {
      toast.error("বিক্রয় ইনভয়েসে অন্তত একটি আইটেম থাকতে হবে!");
      return;
    }

    setIsSaving(true);
    try {
      const newTotal = editItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);

      // Revert actions to apply new calculations if approved
      if (editingSale.approved || editingSale.status === "paid") {
        // Revert old stocks
        for (const item of editingSale.items || []) {
            const prodId = item.productId || item.id;
            if (prodId) {
                const qty = Number(item.qty || item.quantity) || 0;
                await recordStockMovement(prodId, 'RETURN', qty, editingSale.id);
            }
        }

        // Revert old customer balances
        if (updateCustomer && editingSale.customerId) {
          const oldCust = customers.find(c => c.id === editingSale.customerId);
          if (oldCust) {
            await updateCustomer(oldCust.id, {
              balance: (oldCust.balance || 0) - (Number(editingSale.total) || 0)
            });
          }
        }

        // Apply new stock deductions
        for (const item of editItems) {
            const prodId = item.id || item.productId;
            if (prodId) {
              const qty = Number(item.qty) || 0;
              await recordStockMovement(prodId, 'SALES', -qty, editingSale.id);
            }
        }

        // Apply new customer balances
        if (updateCustomer && editCustomerId) {
          const newCust = customers.find(c => c.id === editCustomerId);
          if (newCust) {
            await updateCustomer(newCust.id, {
              balance: (newCust.balance || 0) + newTotal
            });
          }
        }
      }

      // Save updated document
      await update(editingSale.id, {
        ...editingSale,
        date: editDate + "T00:00:00.000Z",
        routeId: editRouteId,
        srId: editSrId,
        customerId: editCustomerId,
        items: editItems,
        total: newTotal
      });

      toast.success("বিক্রয় রেকর্ড সফলভাবে আপডেট করা হয়েছে!");
      setEditingSale(null);
    } catch (err: any) {
      console.error(err);
      toast.error("আপডেট করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ReportWrapper title="বিক্রয় হিস্ট্রি" onDownload={downloadCSV} onShare={shareWhatsApp}>
      {/* Offline Sync Status Indicator */}
      <div className="mb-4 bg-slate-50 p-4 border border-slate-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${unsyncedSalesCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {unsyncedSalesCount > 0 ? <WifiOff className="w-5 h-5 animate-pulse" /> : <Wifi className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">
                {unsyncedSalesCount > 0 ? "অফলাইন লেনদেন পেন্ডিং কিউ (Offline Queue)" : "ক্লাউড সিঙ্ক্রোনাইজেশন স্ট্যাটাস (Cloud Sync)"}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                unsyncedSalesCount > 0 
                  ? "bg-amber-100 text-amber-800 border border-amber-200" 
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}>
                {unsyncedSalesCount > 0 ? `${unsyncedSalesCount} টি পেন্ডিং (Pending)` : "সম্পূর্ণ সিঙ্কড (Synced)"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {unsyncedSalesCount > 0 
                ? "কিছু বিক্রয় মেমো ক্লাউডে সিঙ্ক হওয়ার জন্য অপেক্ষা করছে। ইন্টারনেট পুনরায় সংযুক্ত হলে এগুলো স্বয়ংক্রিয়ভাবে ক্লাউডে আপলোড হবে।"
                : "আপনার সকল বিক্রয় মেমো এবং অফলাইন মেমো সফলভাবে ক্লাউড ডাটাবেজের সাথে সিঙ্কড করা রয়েছে।"}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRetrySync}
          disabled={isSyncing}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-2xs border cursor-pointer ${
            isSyncing 
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
              : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "সিঙ্ক হচ্ছে..." : "পুনরায় সিঙ্ক করুন (Retry Sync)"}
        </button>
      </div>

      <div className="bg-white p-4 border rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <input 
            placeholder="কাস্টমার নাম খুঁজুন..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" 
          />
          
          <MultiSelect
            options={routes.map(r => ({ value: r.id, label: r.name }))}
            selectedValues={filterRouteIds}
            onChange={setFilterRouteIds}
            placeholder="সকল রোড"
          />

          <MultiSelect
            options={categoriesList.map(cat => ({ value: cat, label: cat }))}
            selectedValues={filterCategories}
            onChange={setFilterCategories}
            placeholder="সকল ক্যাটাগরি"
          />

          <select 
            value={filterSrId} 
            onChange={(e) => setFilterSrId(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
          >
            <option value="">সকল এস আর</option>
            {staff.filter(st => st.role === 'SR').map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
          <select 
            value={filterSupplierId} 
            onChange={(e) => setFilterSupplierId(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
          >
            <option value="">সকল সাপ্লায়ার</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={(e) => setFilterStartDate(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none" 
          />
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={(e) => setFilterEndDate(e.target.value)} 
            className="p-2 border rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none" 
          />
          <button 
            type="button"
            onClick={() => {
              setSearchTerm("");
              setFilterRouteIds([]);
              setFilterCategories([]);
              setFilterSrId("");
              setFilterSupplierId("");
              setFilterStartDate("");
              setFilterEndDate("");
            }} 
            className="p-2 border rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-650 cursor-pointer transition"
          >
            ফিল্টার রিসেট
          </button>
      </div>

      {selectedSalesIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <p className="text-xs font-bold text-indigo-900">
              {selectedSalesIds.length} টি ইনভয়েস সিলেক্ট করা হয়েছে
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => printBulkInvoices(filteredSales.filter(s => selectedSalesIds.includes(s.id)))}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>বাল্ক প্রিন্ট করুন ({selectedSalesIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedSalesIds([])}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 border rounded-lg transition cursor-pointer"
            >
              সিলেকশন মুছুন
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E9ECEF] rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#F8F9FA]">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={filteredSales.length > 0 && selectedSalesIds.length === filteredSales.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSalesIds(filteredSales.map(s => s.id));
                    } else {
                      setSelectedSalesIds([]);
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                />
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">তারিখ</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">রোড</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">এস আর</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">কাস্টমার</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">অর্ডার আইটেম</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">মোট</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Created By</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-center">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map(s => {
              const isSelected = selectedSalesIds.includes(s.id);
              return (
                <React.Fragment key={s.id}>
                  <tr className={`hover:bg-gray-50 ${isSelected ? "bg-indigo-50/40" : ""}`}>
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSalesIds(prev => [...prev, s.id]);
                            } else {
                              setSelectedSalesIds(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                        />
                      </td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{new Date(s.date).toLocaleDateString('bn-BD')}</td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{routes.find(r => r.id === s.routeId)?.name || 'N/A'}</td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{staff.find(st => st.id === s.srId)?.name || 'N/A'}</td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{customers.find(c => c.id === s.customerId)?.name || "নগদ কাস্টমার"}</td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 text-sm text-gray-600 cursor-pointer">
                          {s.items?.length || 0} আইটেম
                      </td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 font-bold cursor-pointer">{formatCurrency(s.total)}</td>
                      <td onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)} className="px-6 py-4 cursor-pointer">{s.createdBy || 'Unknown'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => printInvoice(s)}
                            className="p-1 px-1.5 text-gray-400 hover:text-emerald-650 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-lg transition-all cursor-pointer"
                            title="মেমো প্রিন্ট করুন"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleStartEditSale(s)}
                            className="p-1 px-1.5 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                            title="সম্পাদনা করুন (Edit)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSale(s)}
                            className="p-1 px-1.5 text-gray-400 hover:text-red-650 hover:bg-rose-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                            title="ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                  </tr>
                  {expandedRowId === s.id && (
                      <tr>
                          <td colSpan={9} className="bg-gray-50 p-4">
                              <h4 className="font-bold mb-2">অর্ডার ডিটেইলস:</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {s.items?.map((item: any, idx: number) => {
                                      const prod = products.find(p => p.id === item.productId);
                                      return (
                                          <div key={idx} className="bg-white p-2 rounded text-sm border shadow-sm">
                                          <span className="font-bold">{prod?.name || item.name || 'Unknown'}</span>
                                          <br />
                                          {item.qty} x {formatCurrency(item.price || 0)} = {formatCurrency(item.qty * (item.price || 0))}
                                          </div>
                                      );
                                  })}
                              </div>
                          </td>
                      </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sale Edit Modal Overlay */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl border border-gray-100 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-black text-gray-900">বিক্রয় ইনভয়েস সম্পাদনা (Edit Sale)</h3>
              <button onClick={() => setEditingSale(null)} className="p-1 text-gray-400 hover:text-gray-650 rounded-xl hover:bg-gray-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={e => setEditDate(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 font-medium whitespace-nowrap text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ডেলিভারি রোড</label>
                  <select 
                    value={editRouteId} 
                    onChange={e => setEditRouteId(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">এস আর (SR)</label>
                  <select 
                    value={editSrId} 
                    onChange={e => setEditSrId(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {staff.filter(st => st.role === 'SR').map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">কাস্টমার</label>
                  <select 
                    value={editCustomerId} 
                    onChange={e => setEditCustomerId(e.target.value)} 
                    required 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-bold"
                  >
                    <option value="">নগদ কাস্টমার/নির্বাচন করুন</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Items in Sale */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm text-gray-800">পণ্য সামগ্রী ও কোয়ান্টিটি</h4>
                  
                  {/* Select product to insert */}
                  <select
                    value={selectedAddProductId}
                    onChange={e => {
                      setSelectedAddProductId(e.target.value);
                      if (e.target.value) handleAddProductToSale(e.target.value);
                    }}
                    className="border border-gray-205 rounded-xl p-1 bg-white text-xs font-bold"
                  >
                    <option value="">+ নতুন পণ্য যোগ করুন</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (স্টক: {p.stock || 0})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs">
                      <span className="flex-1 font-bold text-gray-800">{item.name}</span>
                      <div className="flex gap-1 items-center">
                        <label className="text-[10px] text-gray-450 uppercase">পিস:</label>
                        <input 
                          type="number" 
                          value={item.qty} 
                          onChange={e => handleUpdateEditItem(index, "qty", Number(e.target.value))} 
                          className="w-16 border rounded bg-white p-1 text-center font-mono font-bold"
                          min={1}
                        />
                      </div>
                      <div className="flex gap-1 items-center">
                        <label className="text-[10px] text-gray-450 uppercase">রেট:</label>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={e => handleUpdateEditItem(index, "price", Number(e.target.value))} 
                          className="w-20 border rounded bg-white p-1 text-right font-mono font-bold text-emerald-700"
                          min={0}
                        />
                      </div>
                      <span className="w-16 text-right font-bold text-gray-900 font-mono">
                        {formatCurrency(Number(item.qty || 0) * Number(item.price || 0))}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveProductFromSale(index)} 
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recalculated total info */}
              <div className="flex justify-between items-center font-black text-base border-t pt-4 text-gray-950">
                <span>নতুন মোট বিক্রয় মূল্য:</span>
                <span className="text-indigo-650 font-mono">
                  {formatCurrency(editItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0))}
                </span>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" disabled={isSaving} onClick={() => setEditingSale(null)} className="flex-1 border py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-gray-50 transition-colors">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-1 btn-primary py-3 font-black text-xs cursor-pointer flex items-center justify-center">
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : "ইনভয়েস সেভ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* State-Driven Print Preview & Customization Modal */}
      {printPreviewSales && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-5xl w-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ maxHeight: "90vh" }}>
            
            {/* Left: Configuration Sidebar */}
            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Printer className="w-5 h-5 text-indigo-600" />
                    <span>প্রিন্ট প্রিভিউ সেটিংস</span>
                  </h3>
                  <button 
                    onClick={() => setPrintPreviewSales(null)} 
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                  নিচের অপশনগুলো সিলেক্ট বা আন-সিলেক্ট করে প্রিন্ট লেআউট কাস্টমাইজ করুন। এটি আপনার খাতার রেকর্ডের জন্য নিখুঁত প্রিন্ট তৈরি করতে সাহায্য করবে।
                </p>

                {/* Paper Size Selector */}
                <div className="mb-5 bg-slate-200/50 p-1.5 rounded-2xl flex gap-1 border border-slate-300/40">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintOptions(prev => ({
                        ...prev,
                        paperSize: "A4",
                        showSerial: true,
                        showRates: true,
                        showSignatures: true,
                        showMeta: true
                      }));
                    }}
                    className={`flex-1 py-2 text-[11px] font-black rounded-xl transition cursor-pointer ${printOptions.paperSize === "A4" ? "bg-white text-indigo-650 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Standard A4
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintOptions(prev => ({
                        ...prev,
                        paperSize: "58mm",
                        showSerial: false,
                        showRates: true,
                        showSignatures: false,
                        showMeta: true
                      }));
                    }}
                    className={`flex-1 py-2 text-[11px] font-black rounded-xl transition cursor-pointer ${printOptions.paperSize === "58mm" ? "bg-white text-indigo-650 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    POS (58mm)
                  </button>
                </div>

                {/* Column Visibility Configuration Section */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 shadow-2xs">
                  <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-650 rounded-full"></span>
                    কলাম প্রদর্শন কনফিগারেশন (Data Columns)
                  </h4>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showSerial}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showSerial: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">ক্রমিক নং (Serial) কলাম</span>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showRates}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showRates: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">পণ্যের দর (Unit Price / Rate) কলাম</span>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showItemDiscount}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showItemDiscount: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">ডিসকাউন্ট (Discount) কলাম</span>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showTaxBreakdown}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showTaxBreakdown: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">ভ্যাট ও ট্যাক্স (Vat & Tax) কলাম</span>
                    </label>
                  </div>
                </div>

                {/* Additional Layout Settings */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 shadow-2xs">
                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                    লেআউট ও মেটা অপশন (Layout & Meta)
                  </h4>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showTotals}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showTotals: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">মোট মূল্য ও নিট বিল হিসাব</span>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showMeta}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showMeta: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">এস আর ও মেটা তথ্য প্রদর্শন</span>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showSignatures}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showSignatures: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">স্বাক্ষরের খালি জায়গা (Signatures)</span>
                    </label>

                    <label className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none hover:bg-indigo-50/20 transition active:scale-98">
                      <input 
                        type="checkbox" 
                        checked={printOptions.showFooter}
                        onChange={(e) => setPrintOptions(prev => ({ ...prev, showFooter: e.target.checked }))}
                        className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4.5 w-4.5"
                      />
                      <span className="text-xs font-black text-slate-800">ধন্যবাদ বার্তা ও ফুট নোট</span>
                    </label>
                  </div>
                </div>

                {/* Custom Note input */}
                <div className="mt-5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">বিশেষ নোট যোগ করুন (ঐচ্ছিক):</label>
                  <textarea 
                    value={printOptions.customNote}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, customNote: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-medium text-slate-800 h-16"
                    placeholder="যেমন: ড্যামেজ মাল ফেরত নেওয়া হয়েছে..."
                  />
                </div>
              </div>

              {/* Sidebar bottom buttons */}
              <div className="flex flex-col gap-2 mt-6">
                <button 
                  onClick={triggerBrowserPrint}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer shadow-md active:scale-98"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন (Print Now)</span>
                </button>
                <button 
                  onClick={() => setPrintPreviewSales(null)}
                  className="w-full bg-white hover:bg-slate-100 border text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

            {/* Right: Live Frame Preview */}
            <div className="flex-1 bg-slate-800 p-6 flex flex-col justify-between overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>লাইভ পেপার লেআউট প্রিভিউ ({printPreviewSales.length} টি ইনভয়েস)</span>
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-md">
                  {printOptions.paperSize === "58mm" ? "58mm Thermal POS" : "A4 Portrait"}
                </span>
              </div>

              {/* Dynamic Live Preview IFrame */}
              <div className="flex-1 border border-slate-700 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl relative flex items-center justify-center p-2">
                <div 
                  className={`h-full bg-white transition-all duration-300 shadow-xl overflow-hidden rounded-lg ${
                    printOptions.paperSize === "58mm" ? "w-[240px] border-x-2 border-dashed border-gray-400" : "w-full"
                  }`}
                >
                  <iframe 
                    title="Invoice Print Live Preview"
                    srcDoc={generatePrintHTML(printPreviewSales, printOptions).replace("<script>\n    window.onload = function() {\n      window.print();\n      setTimeout(function() { window.close(); }, 500);\n    };\n  </script>", "")}
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-semibold mt-3">
                * প্রিভিউ স্ক্রিনটি কাগজের আউটপুটের একটি আনুমানিক রূপ দেখায়। ব্রাউজারের প্রিন্ট ডায়ালগে ব্যাকগ্রাউন্ড গ্রাফিক্স সক্রিয় রাখুন।
              </div>
            </div>

          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

function Search({ className, ...props }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className} {...props}
    >
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}
