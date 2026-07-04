import React, { useState, useMemo } from "react";
import { Search, Save, CheckCircle2, ShoppingCart, AlertCircle, TrendingDown, Gift, Wallet, Users, AlertTriangle, Plus, Trash2, X, Printer, Loader2 } from "lucide-react";
import { formatCurrency, piecesToCartoon, getGroupColors } from "../lib/utils";
import toast from "react-hot-toast";
import { recordStockMovement } from "../lib/inventoryEngine";
import { MovementType } from "../lib/stockMovement";

const EXPENSE_HEADS = [
  { id: "carriage", name: "পরিবহন খরচ / ক্যারেজ (Carriage)" },
  { id: "labor", name: "লেবার / কুলি বিল (Labor Cost)" },
  { id: "nasta", name: "ডিএসআর নাস্তা বিল (DSR Snacks Bill)" },
  { id: "fuel", name: "গাড়ি জ্বালানি খরচ (Fuel Cost)" },
  { id: "mobile", name: "ডিএসআর মোবাইল বিল (Mobile Bill)" },
  { id: "misc", name: "বিবিধ উপযোগ খরচ (Miscellaneous)" },
  { id: "bazaar", name: "অফিস বাজার খরচ (Bazaar Bill)" },
  { id: "rent", name: "ভাড়া / স্থান ভাড়া (Rent)" },
  { id: "salary", name: "ডিএসআর বেতন / কমিশন (DSR Salary)" },
  { id: "repair", name: "গাড়ি মেরামত খরচ (Repair & Servicing)" },
  { id: "toll", name: "রোড টোল / ঘাট খেসারত (Toll & Ferry)" }
];

interface SettlementProps {
  summaries: any[];
  products: any[];
  staff: any[];
  routes: any[];
  customers: any[];
  updateSummary: (id: string, item: any) => Promise<void>;
  updateCustomer?: (id: string, item: any) => Promise<void>;
  updateProduct?: (id: string, item: any) => Promise<void>;
  addDamage?: (item: any) => Promise<void>;
  addExpense?: (item: any) => Promise<void>;
  role?: string;
}

export default function SettlementView({ 
  summaries, 
  products, 
  staff, 
  routes, 
  customers, 
  updateSummary, 
  updateCustomer, 
  updateProduct, 
  addDamage,
  addExpense,
  role
}: SettlementProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState(false);
  const activeSummary = useMemo(() => summaries.find(s => s.id === selectedId), [summaries, selectedId]);

  // Settlement Form State
  const [returnQtys, setReturnQtys] = useState<{[key: string]: number}>({});
  
  // New Search-based lists
  const [freeItems, setFreeItems] = useState<{productId: string, quantity: number}[]>([]);
  const [discountItems, setDiscountItems] = useState<{productId: string, amount: number}[]>([]);
  const [damageItems, setDamageItems] = useState<{productId: string, quantity: number, price: number}[]>([]);
  
  const [expenses, setExpenses] = useState<{type: string, amount: number}[]>([]);
  const [credits, setCredits] = useState<{customerId: string, amount: number}[]>([]);
  const [payments, setPayments] = useState<{method: string, amount: number}[]>([]);

  // Search states
  const [expenseSearch, setExpenseSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);

  const activeResults = useMemo(() => {
    if (!activeSummary) return null;

    let totalSalesValue = 0;
    
    // Main items (Sales)
    const items = activeSummary.items.map((item: any) => {
      const returns = returnQtys[item.productId] || 0;
      const soldQty = Math.max(0, item.totalPieces - returns);
      const saleVal = soldQty * item.price;
      totalSalesValue += saleVal;

      return {
        ...item,
        returns,
        soldQty,
        saleValue: saleVal
      };
    });

    // Sub-calculations
    const totalFreeValue = freeItems.reduce((acc, f) => {
      const p = products.find(x => x.id === f.productId);
      return acc + (f.quantity * (p?.price || 0));
    }, 0);

    const totalDiscountValue = discountItems.reduce((acc, d) => acc + d.amount, 0);
    
    const totalDamageValue = damageItems.reduce((acc, d) => acc + (d.quantity * d.price), 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalCredits = credits.reduce((acc, c) => acc + c.amount, 0);
    const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0);

    // DSR Payable = (Total Sales) - (Free Items Value) - (Cash Discounts Given) - (Damage Value) - (Credits/Baki) - (Expenses)
    const dsrPayable = totalSalesValue - totalFreeValue - totalDiscountValue - totalDamageValue - totalExpenses - totalCredits;
    const balance = totalPayments - dsrPayable;

    return {
      items,
      totalSalesValue,
      totalFreeValue,
      totalDiscountValue,
      totalDamageValue,
      totalExpenses,
      totalCredits,
      totalPayments,
      dsrPayable,
      balance
    };
  }, [activeSummary, returnQtys, freeItems, discountItems, damageItems, expenses, credits, payments, products]);

  const printConsolidatedA4Report = (summary: any, resultsInput?: any) => {
    const results = resultsInput || {
      items: summary.items || [],
      totalSalesValue: summary.salesValue || 0,
      totalFreeValue: summary.totalFreeValue || 0,
      totalDiscountValue: summary.totalDiscountValue || 0,
      totalDamageValue: summary.totalDamageValue || 0,
      totalExpenses: summary.totalExpenses || 0,
      totalCredits: summary.totalCredits || 0,
      totalPayments: summary.totalPayments || 0,
      dsrPayable: summary.dsrPayable || 0,
      balance: summary.dsrBalance !== undefined ? summary.dsrBalance : 0
    };

    const route = routes.find(r => r.id === summary.routeId)?.name || "Unknown Route";
    const dsr = staff.find(st => st.id === summary.dsrId)?.name || "Unknown DSR";
    const date = summary.settlementDate || summary.date || new Date().toISOString().split('T')[0];
    const free = summary.freeItems || freeItems;
    const discount = summary.discountItems || discountItems;
    const damage = summary.damageItems || damageItems;
    const creds = summary.credits || credits;
    const exps = summary.expenses || expenses;
    const pmts = summary.payments || payments;

    const printContent = `
      <html>
        <head>
          <title>একত্রিত বিকেলে সেটেলমেন্ট সামারি রিপোর্ট - ${route}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 24px; 
              color: #222;
              line-height: 1.4;
            }
            .header-container {
              text-align: center;
              border-bottom: 3px double #333;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header-container h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              color: #111;
            }
            .header-container p {
              margin: 4px 0 0 0;
              font-size: 13px;
              color: #555;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              margin-bottom: 20px;
              font-size: 13px;
              font-weight: bold;
              background-color: #f8f9fa;
              padding: 10px 14px;
              border-radius: 8px;
              border: 1px solid #dee2e6;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px; 
              margin-bottom: 20px;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #dee2e6; 
              padding: 6px 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f1f3f5; 
              font-weight: bold;
              text-transform: uppercase;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .section-title {
              font-size: 13px;
              font-weight: bold;
              border-left: 4px solid #1a73e8;
              padding-left: 8px;
              margin-top: 25px;
              margin-bottom: 8px;
              color: #1a73e8;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .summary-box {
              border: 2px solid #1a73e8;
              border-radius: 8px;
              padding: 12px;
              background-color: #fcfdbf;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              border-bottom: 1px solid rgba(0,0,0,0.05);
              font-size: 12px;
            }
            .summary-row:last-child {
              border-bottom: none;
              font-size: 15px;
              font-weight: bold;
              color: #1a73e8;
              margin-top: 6px;
              padding-top: 6px;
              border-top: 1px solid #ced4da;
            }
            .signature-section {
              margin-top: 45px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              width: 150px;
              border-top: 1px solid #000;
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h2>সমিরা ট্রেডার্স (SAMIRA TRADERS)</h2>
            <p>বিকেলের চূড়ান্ত সেটেলমেন্ট ও বিক্রয় সামারি রিপোর্ট (Evening Settlement Summary Sheet)</p>
          </div>

          <div class="meta-grid">
            <div>তারিখ: ${date}</div>
            <div class="text-center">রুট/রোড: ${route}</div>
            <div class="text-right">ডিএসআর (DSR): ${dsr}</div>
          </div>

          <div class="section-title">১. লোড সামগ্রী, রিটার্ন ও প্রকৃত বিক্রয় হিসাব (Inventory & Sales Activity)</div>
          <table>
            <thead>
              <tr>
                <th>পণ্যের নাম</th>
                <th class="text-center">প্রদত্ত পরিমাণ (Assigned)</th>
                <th class="text-center">রিটার্ন পরিমাণ (Returns)</th>
                <th class="text-center">প্রকৃত বিক্রয় (Sold)</th>
                <th class="text-center">বিক্রয় কার্টুন/পিস (Sold CTN/PCS)</th>
                <th class="text-right">দর (Price)</th>
                <th class="text-right">মোট বিক্রয় ভ্যালু (Sales Value)</th>
              </tr>
            </thead>
            <tbody>
              ${results.items.map((item: any) => {
                const piecesPerCtn = item.cartoonSize || 1;
                const ctns = Math.floor(item.soldQty / piecesPerCtn);
                const leftPieces = item.soldQty % piecesPerCtn;
                const soldCtnPcs = ctns > 0 ? `${ctns} CTN ${leftPieces > 0 ? `+ ${leftPieces} PCS` : ''}` : `${leftPieces} PCS`;
                return `
                  <tr>
                    <td>${item.name}</td>
                    <td class="text-center">${item.totalPieces} পিস</td>
                    <td class="text-center">${item.returns} পিস</td>
                    <td class="text-center bold">${item.soldQty} পিস</td>
                    <td class="text-center font-mono text-xs">${item.soldQty > 0 ? soldCtnPcs : "০"}</td>
                    <td class="text-right">${formatCurrency(item.price)}</td>
                    <td class="text-right bold">${formatCurrency(item.saleValue)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="bold" style="background-color: #f8f9fa;">
                <td colspan="6" class="text-right">মোট গ্রোস বিক্রয় মূল্য (Total Gross Sales):</td>
                <td class="text-right">${formatCurrency(results.totalSalesValue)}</td>
              </tr>
            </tbody>
          </table>

          <div class="grid-2">
            <div>
              <div class="section-title">২. ফ্রি ও উপহার সামগ্রী বিতরণ (Free / Gift Outflow)</div>
              <table>
                <thead>
                  <tr>
                    <th>পণ্যের নাম</th>
                    <th class="text-center">ফ্রি পরিমাণ</th>
                    <th class="text-right">মোট ভ্যালু</th>
                  </tr>
                </thead>
                <tbody>
                  ${free.length > 0 ? free.map((f: any) => {
                    const prod = products.find(p => p.id === f.productId);
                    return `
                      <tr>
                        <td>${prod?.name || "Unknown Product"}</td>
                        <td class="text-center">${f.quantity} পিস</td>
                        <td class="text-right">${formatCurrency(f.quantity * (prod?.price || 0))}</td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="3" class="text-center">কোনো ফ্রি পণ্য নেই</td></tr>`}
                  <tr class="bold" style="background-color: #f8f9fa;">
                    <td colspan="2" class="text-right">মোট ফ্রি ভ্যালু:</td>
                    <td class="text-right">${formatCurrency(results.totalFreeValue)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title">৩. স্পেশাল ক্যাশ ডিসকাউন্ট (Special Discounts)</div>
              <table>
                <thead>
                  <tr>
                    <th>পণ্যের নাম</th>
                    <th class="text-right">ছাড়ের পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  ${discount.length > 0 ? discount.map((d: any) => {
                    const prod = products.find(p => p.id === d.productId);
                    return `
                      <tr>
                        <td>${prod?.name || "Unknown Product"}</td>
                        <td class="text-right bold">${formatCurrency(d.amount)}</td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="2" class="text-center">কোনো ডিসকাউন্ট দেওয়া হয়নি</td></tr>`}
                  <tr class="bold" style="background-color: #f8f9fa;">
                    <td class="text-right">মোট ডিসকাউন্ট:</td>
                    <td class="text-right">${formatCurrency(results.totalDiscountValue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">৪. নষ্ট ও ড্যামেজ পণ্য ফেরত বিবরণী (Damage Returns)</div>
              <table>
                <thead>
                  <tr>
                    <th>পণ্যের নাম</th>
                    <th class="text-center">পরিমাণ</th>
                    <th class="text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody>
                  ${damage.length > 0 ? damage.map((d: any) => {
                    const prod = products.find(p => p.id === d.productId);
                    return `
                      <tr>
                        <td>${prod?.name || "Unknown Product"}</td>
                        <td class="text-center">${d.quantity} পিস</td>
                        <td class="text-right bold">${formatCurrency(d.quantity * d.price)}</td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="3" class="text-center">কোনো ড্যামেজ পণ্য নেই</td></tr>`}
                  <tr class="bold" style="background-color: #f8f9fa;">
                    <td colspan="2" class="text-right">মোট ড্যামেজ ভ্যালু:</td>
                    <td class="text-right">${formatCurrency(results.totalDamageValue)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title">৫. কাস্টমারদের নিকট মার্কেট বাকি হিসাব (Customer Due Cards)</div>
              <table>
                <thead>
                  <tr>
                    <th>কাস্টমারের নাম</th>
                    <th class="text-right">বাকি পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  ${creds.length > 0 ? creds.map((c: any) => {
                    const cust = customers.find(custObj => custObj.id === c.customerId);
                    return `
                      <tr>
                        <td>${cust?.name || "সাধারণ কাস্টমার"} ${cust?.shopName ? `(${cust.shopName})` : ''}</td>
                        <td class="text-right bold text-danger" style="color: #dc3545;">${formatCurrency(c.amount)}</td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="2" class="text-center">কোনো বাকি বিক্রয় নেই</td></tr>`}
                  <tr class="bold" style="background-color: #f8f9fa;">
                    <td class="text-right">মোট বকেয়া (Total Credits):</td>
                    <td class="text-right text-danger" style="color: #dc3545;">${formatCurrency(results.totalCredits)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="grid-2">
            <div>
              <div class="section-title">৬. সেটেলমেন্টের রাস্তা খরচ বিবরণ (Vouchered Road Expenses)</div>
              <table>
                <thead>
                  <tr>
                    <th>খরচের খাত / বিবরণ</th>
                    <th class="text-right">টাকার পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  ${exps.length > 0 ? exps.map((e: any) => `
                    <tr>
                      <td>${e.type}</td>
                      <td class="text-right bold">${formatCurrency(e.amount)}</td>
                    </tr>
                  `).join('') : `<tr><td colspan="2" class="text-center">কোনো রাস্তা খরচ নেই</td></tr>`}
                  <tr class="bold" style="background-color: #f8f9fa;">
                    <td class="text-right">মোট অনুমোদিত খরচ:</td>
                    <td class="text-right">${formatCurrency(results.totalExpenses)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title">৭. ক্যাশ সংগ্রহ ও পেমেন্ট আদায় বিবরণী (DSR Collections)</div>
              <table>
                <thead>
                  <tr>
                    <th>পেমেন্ট মাধ্যম</th>
                    <th class="text-right">আদায়কৃত পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  ${pmts.length > 0 ? pmts.map((p: any) => `
                    <tr>
                      <td class="bold">${p.method}</td>
                      <td class="text-right bold">${formatCurrency(p.amount)}</td>
                    </tr>
                  `).join('') : `<tr><td colspan="2" class="text-center">কোনো আদায় রেকর্ড নেই</td></tr>`}
                  <tr class="bold" style="background-color: #f8f9fa;">
                    <td class="text-right">মোট আদায়কৃত ক্যাশ (Total Paid):</td>
                    <td class="text-right" style="color: #28a745;">${formatCurrency(results.totalPayments)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">৮. সেটেলমেন্টের চূড়ান্ত ব্যালেন্স শিট (Grand Balance Sheet)</div>
              <div class="summary-box" style="margin-top: 10px;">
                <div class="summary-row">
                  <span>১. মোট বিক্রি ভ্যালু (Gross Sales):</span>
                  <span class="bold">${formatCurrency(results.totalSalesValue)}</span>
                </div>
                <div class="summary-row">
                  <span>২. ফ্রি পণ্য বিতরণ ভ্যালু (-):</span>
                  <span>${formatCurrency(results.totalFreeValue)}</span>
                </div>
                <div class="summary-row">
                  <span>৩. ক্যাশ ডিসকাউন্ট সমন্বয় (-):</span>
                  <span>${formatCurrency(results.totalDiscountValue)}</span>
                </div>
                <div class="summary-row">
                  <span>৪. নষ্ট/ড্যামেজ পণ্য সমন্বয় (-):</span>
                  <span>${formatCurrency(results.totalDamageValue)}</span>
                </div>
                <div class="summary-row">
                  <span>৫. রাস্তা খরচ সমন্বয় (-):</span>
                  <span>${formatCurrency(results.totalExpenses)}</span>
                </div>
                <div class="summary-row">
                  <span>৬. কাস্টমার বকেয়া baki সমন্বয় (-):</span>
                  <span>${formatCurrency(results.totalCredits)}</span>
                </div>
                <div class="summary-row" style="font-weight: bold; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #bbb;">
                  <span>ডিএসআর প্রদেয় (Payable):</span>
                  <span style="color: #1a73e8;">${formatCurrency(results.dsrPayable)}</span>
                </div>
                <div class="summary-row">
                  <span>আদায়কৃত নগদ ক্যাশ (+):</span>
                  <span style="color: #28a745; font-weight: bold;">${formatCurrency(results.totalPayments)}</span>
                </div>
                <div class="summary-row" style="font-size: 14.5px; border-top: 2px solid #1a73e8; padding-top: 6px; font-weight: 800;">
                  <span>নেট ব্যালেন্স (DSR Balance):</span>
                  <span style="color: ${results.balance >= 0 ? '#28a745' : '#dc3545'};">
                    ${results.balance >= 0 ? '+' : ''}${formatCurrency(results.balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-line">ডিএসআর স্বাক্ষর (DSR)</div>
            <div class="signature-line">ম্যানেজার স্বাক্ষর (Manager)</div>
            <div class="signature-line">স্বত্বাধিকারী স্বাক্ষর (Owner)</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win?.document.write(printContent);
    win?.document.close();
  };

  const printThermalReport = (summary: any, resultsInput?: any) => {
    const results = resultsInput || {
      items: summary.items || [],
      totalSalesValue: summary.salesValue || 0,
      totalFreeValue: summary.totalFreeValue || 0,
      totalDiscountValue: summary.totalDiscountValue || 0,
      totalDamageValue: summary.totalDamageValue || 0,
      totalExpenses: summary.totalExpenses || 0,
      totalCredits: summary.totalCredits || 0,
      totalPayments: summary.totalPayments || 0,
      dsrPayable: summary.dsrPayable || 0,
      balance: summary.dsrBalance !== undefined ? summary.dsrBalance : 0
    };

    const route = routes.find(r => r.id === summary.routeId)?.name || "Unknown Route";
    const dsr = staff.find(st => st.id === summary.dsrId)?.name || "Unknown DSR";
    const date = summary.settlementDate || summary.date || new Date().toISOString().split('T')[0];
    const pmts = summary.payments || payments;

    const printContent = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              width: 72mm; 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              padding: 4mm;
              margin: 0;
              line-height: 1.2;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 2mm 0; }
            .flex { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <div class="center bold">SAMIRA TRADERS</div>
          <div class="center">Evening Settlement Report</div>
          <div class="line"></div>
          <div style="border: 1px solid #000; padding: 2mm;">
            <div>Date: ${date}</div>
            <div>Route: ${route}</div>
            <div>DSR: ${dsr}</div>
          </div>
          <div class="line"></div>
          
          <div class="bold">SALES SUMMARY</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Dlv</th>
                <th>Ret</th>
                <th>Rate</th>
                <th>Val</th>
              </tr>
            </thead>
            <tbody>
              ${results.items.map((i:any) => {
                const val = (i.totalPieces - i.returns) * i.price;
                return `
                <tr>
                  <td>${i.name}</td>
                  <td>${i.totalPieces}</td>
                  <td>${i.returns}</td>
                  <td>${i.price}</td>
                  <td>${val}</td>
                </tr>
              `}).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th>${results.items.reduce((sum:number, i:any) => sum + i.totalPieces, 0)}</th>
                <th>${results.items.reduce((sum:number, i:any) => sum + i.returns, 0)}</th>
                <th>-</th>
                <th>${results.totalSalesValue}</th>
              </tr>
              <tr>
                <th colspan="2">Dlv Val: ${results.items.reduce((sum:number, i:any) => sum + (i.totalPieces * i.price), 0)}</th>
                <th colspan="2">Ret Val: ${results.items.reduce((sum:number, i:any) => sum + (i.returns * i.price), 0)}</th>
                <th>Sales Val: ${results.totalSalesValue}</th>
              </tr>
            </tfoot>
          </table>
          
          <div class="line"></div>
          <div class="bold">DEDUCTIONS</div>
          <div>Free Items:</div>
          ${results.totalFreeValue > 0 ? freeItems.map((f: any) => {
             const prod = products.find(p => p.id === f.productId);
             const val = f.quantity * (prod?.price || 0);
             return `<div class="flex"><span>${prod?.name || 'Item'}:</span> <span>${f.quantity} pcs - ${val}</span></div>`
          }).join('') : '<div>None</div>'}
          
          <div class="line"></div>
          <div>Discount:</div>
          ${results.totalDiscountValue > 0 ? discountItems.map((d: any) => {
             const prod = products.find(p => p.id === d.productId);
             return `<div class="flex"><span>${prod?.name || 'Item'}:</span> <span>${d.amount}</span></div>`
          }).join('') : '<div>None</div>'}

          <div class="line"></div>
          <div>Damage:</div>
          ${results.totalDamageValue > 0 ? damageItems.map((d: any) => {
             const prod = products.find(p => p.id === d.productId);
             const val = d.quantity * d.price;
             return `<div class="flex"><span>${prod?.name || 'Item'}:</span> <span>${d.quantity} pcs - ${val}</span></div>`
          }).join('') : '<div>None</div>'}

          <div class="line"></div>
          <div>Expense:</div>
          ${results.totalExpenses > 0 ? expenses.map((e: any) => {
             return `<div class="flex"><span>${e.type}:</span> <span>${e.amount}</span></div>`
          }).join('') : '<div>None</div>'}

          <div class="line"></div>
          <div>Credits (Baki):</div>
          ${results.totalCredits > 0 ? credits.map((c: any) => {
             const cust = customers.find(custObj => custObj.id === c.customerId);
             return `<div class="flex"><span>${cust?.name || 'Customer'}:</span> <span>${c.amount}</span></div>`
          }).join('') : '<div>None</div>'}

          <div class="line"></div>
          <div class="flex bold" style="font-size: 13px;">
            <span>PAYABLE:</span> 
            <span>${results.dsrPayable}</span>
          </div>
          
          <div class="line"></div>
          <div class="bold">PAYMENTS RECEIVED</div>
          ${pmts.map((p: any) => `<div class="flex"><span>${p.method}:</span> <span>${p.amount}</span></div>`).join('')}
          <div class="flex bold"><span>Total Paid:</span> <span>${results.totalPayments}</span></div>
          
          <div class="line"></div>
          <div class="flex bold">
            <span>BALANCE:</span> 
            <span>${results.balance >= 0 ? '+' : ''}${results.balance}</span>
          </div>
          <br/><br/>
          <div class="center">-----------------------</div>
          <div class="center">Signature</div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=400,height=600");
    win?.document.write(printContent);
    win?.document.close();
  };

  const handleSettle = async () => {
    if (!activeSummary || !activeResults) return;
    if (isSubmitting || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const isManager = role === "manager";
      const settlementData = {
        status: isManager ? "pending_approval" : "settled",
        approved: !isManager,
        settlementDate: new Date().toISOString().split('T')[0],
        items: activeResults.items,
        freeItems,
        discountItems,
        damageItems,
        expenses,
        credits,
        payments,
        salesValue: activeResults.totalSalesValue,
        totalFreeValue: activeResults.totalFreeValue,
        totalDiscountValue: activeResults.totalDiscountValue,
        totalDamageValue: activeResults.totalDamageValue,
        totalExpenses: activeResults.totalExpenses,
        totalCredits: activeResults.totalCredits,
        totalPayments: activeResults.totalPayments,
        dsrPayable: activeResults.dsrPayable,
        dsrBalance: activeResults.balance
      };

      // Update Summary Status in Firestore
      await updateSummary(activeSummary.id, settlementData);

      // Route DSR expense data to shared expenses collection
      if (addExpense && expenses && expenses.length > 0) {
        for (const e of expenses) {
          await addExpense({
            date: settlementData.settlementDate,
            amount: Number(e.amount),
            source: "DSR",
            category: e.type,
            description: `DSR Route Expense (${activeSummary.srName} - ${activeSummary.id})`,
            refId: activeSummary.id,
            approved: settlementData.approved
          });
        }
      }

      if (isManager) {
        toast.success("রিপোর্টটি সফলভাবে সেভ করা হয়েছে এবং অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে!");
        setSelectedId(null);
        return;
      }

      // Update Inventory (Added = Returns)
      for (const item of activeResults.items) {
        const product = products.find(p => p.id === item.productId);
        if (product && item.returns > 0) {
          await recordStockMovement(product.id, 'RETURN', item.returns, activeSummary.id);
        }
      }

      // Add to Damage Inventory
      if (addDamage && damageItems.length > 0) {
        for (const d of damageItems) {
          const product = products.find(p => p.id === d.productId);
          await addDamage({
            productId: d.productId,
            supplierId: product?.supplierId || "unknown",
            quantity: d.quantity,
            price: d.price,
            date: new Date().toISOString().split('T')[0]
          });
        }
      }

      // Update Customer Credits
      if (updateCustomer) {
        for (const credit of credits) {
          const cust = customers.find(c => c.id === credit.customerId);
          if (cust) {
            await updateCustomer(cust.id, {
              balance: (cust.balance || 0) + credit.amount
            });
          }
        }
      }

      toast.success("হিসাব সফলভাবে সম্পন্ন হয়েছে!");
      printConsolidatedA4Report(activeSummary, activeResults);
      setSelectedId(null);
    } catch (err) {
      toast.error("হিসাব সেভ করতে সমস্যা হয়েছে");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!selectedId) {
    const list = summaries.filter(s => viewHistory ? s.status === 'settled' : s.status === 'open');
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E9ECEF] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className={`w-6 h-6 ${viewHistory ? 'text-blue-600' : 'text-green-600'}`} /> 
              {viewHistory ? 'হিসাব হিস্টোরি (Settlement History)' : 'বিকেলের হিসাব (Afternoon Settlement)'}
            </h2>
            <p className="text-[#6C757D]">{viewHistory ? 'গতকালের এবং পূর্বের সমস্ত হিসাব তালিকা' : 'মাঠ থেকে ফিরে আসা ডিএসআরের হিসাব গ্রহণ করুন'}</p>
          </div>
          <button 
            type="button"
            onClick={() => setViewHistory(!viewHistory)}
            className={`px-6 py-2 rounded-xl font-bold border transition-all ${viewHistory ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}
          >
            {viewHistory ? 'ওপেন হিসাব দেখুন' : 'হিস্টোরি দেখুন'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-3xl border border-[#E9ECEF] hover:shadow-lg transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${s.status === 'settled' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {routes.find(r => r.id === s.routeId)?.name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-bold">{routes.find(r => r.id === s.routeId)?.name}</h3>
                    <p className="text-xs text-[#ADB5BD]">{s.date} {s.settlementDate && `| Settled: ${s.settlementDate}`}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-6 text-sm">
                 <div className="flex justify-between">
                   <span className="text-[#ADB5BD]">ডিএসআর:</span>
                   <span className="font-medium">{staff.find(st => st.id === s.dsrId)?.name}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-[#ADB5BD]">{s.status === 'settled' ? 'মোট বিক্রি:' : 'অ্যাসাইন ভ্যালু:'}</span>
                   <span className={`font-bold ${s.status === 'settled' ? 'text-green-600' : 'text-blue-600'}`}>{formatCurrency(s.status === 'settled' ? s.salesValue : s.totalSummaryValue)}</span>
                 </div>
                 {s.status === 'settled' && (
                   <div className="flex justify-between border-t pt-2 mt-2">
                     <span className="text-[#ADB5BD]">DSR ব্যালেন্স:</span>
                     <span className={`font-bold ${s.dsrBalance < 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatCurrency(s.dsrBalance)}</span>
                   </div>
                 )}
              </div>
              <div className="flex gap-2">
                {s.status === 'settled' ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => printConsolidatedA4Report(s)}
                      className="flex-1 py-3 bg-gray-800 hover:bg-black text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs"
                      title="একত্রিত সামারি প্রিন্ট"
                    >
                      <Printer className="w-4 h-4" /> একত্রিত প্রিন্ট
                    </button>
                    <button 
                      type="button"
                      onClick={() => printThermalReport(s)}
                      className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-750 rounded-xl font-bold transition-all flex items-center justify-center"
                      title="থার্মাল রিসিট প্রিন্ট"
                    >
                      <Printer className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setReturnQtys({});
                      setFreeItems([]);
                      setDiscountItems([]);
                      setDamageItems([]);
                      setExpenses([]);
                      setCredits([]);
                      setPayments([]);
                      setSelectedId(s.id);
                    }}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all text-sm"
                  >
                    হিসাব গ্রহণ করুন
                  </button>
                )}
                {s.status === 'settled' && (
                   <button 
                    type="button"
                    onClick={() => { 
                      setReturnQtys(s.items?.reduce((acc: any, i: any) => ({ ...acc, [i.productId]: i.returns || 0 }), {}) || {});
                      setFreeItems(s.freeItems || []);
                      setDiscountItems(s.discountItems || []);
                      setDamageItems(s.damageItems || []);
                      setExpenses(s.expenses || []);
                      setCredits(s.credits || []);
                      setPayments(s.payments || []);
                      setSelectedId(s.id); 
                    }}
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                    title="সম্পাদনা করুন"
                   >
                     <Plus className="w-5 h-5" />
                   </button>
                )}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white border border-dashed rounded-3xl text-[#ADB5BD]">
              {viewHistory ? 'কোনো পূর্বের হিসাব নেই' : 'আজ সংগ্রহ করার মতো কোনো হিসাব নেই'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E9ECEF]">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{routes.find(r => r.id === activeSummary?.routeId)?.name} (বিকেলের রিপোর্ট)</h2>
            <p className="text-xs text-[#ADB5BD]">ডিএসআর: {staff.find(st => st.id === activeSummary?.dsrId)?.name}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
           <button 
             type="button"
             onClick={() => printConsolidatedA4Report(activeSummary, activeResults)}
             className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border border-blue-100 shadow-sm cursor-pointer"
           >
             <Printer className="w-4 h-4" /> একত্রিত রিপোর্ট প্রিন্ট করুন
           </button>
           <button 
             type="button"
             onClick={() => printThermalReport(activeSummary, activeResults)}
             className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border border-gray-150 shadow-sm cursor-pointer"
           >
             <Printer className="w-4 h-4" /> থার্মাল রিসিপ্ট প্রিন্ট
           </button>
           <div className="text-right border-l pl-4 hidden sm:block">
             <p className="text-[10px] uppercase font-bold text-[#ADB5BD]">অ্যাসাইনকৃত ভ্যালু</p>
             <p className="text-xl font-black">{formatCurrency(activeSummary?.totalSummaryValue)}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Main Sales Table */}
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
             <div className="bg-[#F8F9FA] p-4 border-b flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-800">পণ্য ও বিক্রয় হিসাব (Inventory Sales)</h3>
             </div>
             
             {/* Reconciliation Table */}
             <div className="p-4">
               <h4 className="font-bold text-gray-700 mb-4 text-sm flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-orange-500" /> 
                 স্টক রিকনসিলিয়েশন (Stock Breakdown)
               </h4>
               <div className="overflow-x-auto border rounded-xl">
                 <table className="w-full text-sm text-center">
                   <thead className="bg-gray-100">
                     <tr className="text-[10px] uppercase text-[#ADB5BD]">
                       <th className="p-3 text-left">পণ্য</th>
                       <th className="p-3">Opening Stock</th>
                       <th className="p-3 text-red-500">Delivered</th>
                       <th className="p-3 text-green-600">Returned</th>
                       <th className="p-3 font-bold text-gray-800">Closing Stock</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y text-xs">
                     {activeSummary?.items.map((item: any) => {
                       const returns = returnQtys[item.productId] || 0;
                       const delivered = Math.max(0, item.totalPieces - returns);
                       return (
                         <tr key={item.productId} className="hover:bg-gray-50">
                           <td className="p-3 text-left font-medium">{item.name}</td>
                           <td className="p-3 text-gray-500">{item.totalPieces}</td>
                           <td className="p-3 text-red-500 font-bold">{delivered}</td>
                           <td className="p-3 text-green-600 font-bold">{returns}</td>
                           <td className="p-3 font-black text-gray-800">{returns}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8F9FA]">
                    <tr className="text-center font-bold text-[10px] uppercase text-[#ADB5BD]">
                      <th className="p-4 text-left">পণ্যের নাম</th>
                      <th className="p-4">পরিমাণ (Assigned)</th>
                      <th className="p-4 bg-orange-50 text-orange-600">রিটার্ন পিস (Return)</th>
                      <th className="p-4">দর (Price)</th>
                      <th className="p-4 bg-blue-50 text-blue-600 font-black">বিক্রি ভ্যালু (Sale Value)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeSummary?.items.map((item: any) => {
                      const returns = returnQtys[item.productId] || 0;
                      const sold = Math.max(0, item.totalPieces - returns);
                      return (
                        <tr key={item.productId} className="hover:bg-gray-50 text-center">
                          <td className="p-4 text-left font-bold text-gray-800">{item.name}</td>
                          <td className="p-4">{item.totalPieces} পিস</td>
                          <td className="p-2 bg-orange-50/30">
                             <input 
                               type="number" 
                               className="w-20 p-2 border rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-orange-300"
                               value={returnQtys[item.productId] !== undefined ? returnQtys[item.productId] : ""}
                               placeholder="0"
                               onChange={e => setReturnQtys({...returnQtys, [item.productId]: Number(e.target.value)})}
                             />
                          </td>
                          <td className="p-4">{formatCurrency(item.price)}</td>
                          <td className="p-4 bg-blue-50 font-black text-blue-600">
                            {formatCurrency(sold * item.price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>

          {/* Deductions: Free, Discount, Expense, Damage, Customer Credit separated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-6">
                {/* Free Product Entry */}
                <div className="bg-white rounded-3xl border shadow-sm">
                   <div className="bg-purple-50 p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-purple-900">ফ্রি প্রোডাক্ট ক্যালকুলেশন (Free Items)</h3>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      <SearchAndAddItem 
                        products={activeSummary?.items || []} 
                        onAdd={(pid, qty) => {
                          const existingIdx = freeItems.findIndex(f => f.productId === pid);
                          if (existingIdx > -1) {
                            const updated = [...freeItems];
                            updated[existingIdx].quantity += qty;
                            setFreeItems(updated);
                          } else {
                            setFreeItems([...freeItems, { productId: pid, quantity: qty }]);
                          }
                        }}
                        label="পণ্যের নাম লিখে খুঁজুন..."
                        qtyLabel="পিস"
                      />
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                         {freeItems.map((f, i) => (
                           <div key={i} className="flex justify-between items-center text-sm p-3 bg-purple-50/30 rounded-xl border border-purple-100">
                              <span className="font-medium text-gray-800">{products.find(p => p.id === f.productId)?.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-purple-700">{f.quantity} পিস</span>
                                <button type="button" onClick={() => setFreeItems(freeItems.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Discount Entry */}
                <div className="bg-white rounded-3xl border shadow-sm">
                   <div className="bg-pink-50 p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-pink-600" />
                        <h3 className="font-bold text-pink-900">ডিসকাউন্ট ক্যালকুলেশন (Cash Discount)</h3>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      <SearchAndAddItem 
                        products={activeSummary?.items || []} 
                        onAdd={(pid, amt) => {
                          const existingIdx = discountItems.findIndex(d => d.productId === pid);
                          if (existingIdx > -1) {
                            const updated = [...discountItems];
                            updated[existingIdx].amount += amt;
                            setDiscountItems(updated);
                          } else {
                            setDiscountItems([...discountItems, { productId: pid, amount: amt }]);
                          }
                        }}
                        label="পণ্যের নাম লিখে খুঁজুন..."
                        qtyLabel="ছাড়ের টাকা"
                      />
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                         {discountItems.map((d, i) => (
                           <div key={i} className="flex justify-between items-center text-sm p-3 bg-pink-50/30 rounded-xl border border-pink-100">
                              <span className="font-medium text-gray-800">{products.find(p => p.id === d.productId)?.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-pink-600">{formatCurrency(d.amount)}</span>
                                <button type="button" onClick={() => setDiscountItems(discountItems.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Expenses list (খরচ সমূহ) */}
                <div className="bg-white rounded-3xl border shadow-sm">
                   <div className="bg-yellow-50 p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-bold text-yellow-900">খরচ সমূহ (Expenses)</h3>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      <SearchAndAddExpenseHead 
                        expenseHeads={EXPENSE_HEADS}
                        onAdd={(type, amt) => {
                          const existingIdx = expenses.findIndex(e => e.type === type);
                          if (existingIdx > -1) {
                            const updated = [...expenses];
                            updated[existingIdx].amount += amt;
                            setExpenses(updated);
                          } else {
                            setExpenses([...expenses, { type, amount: amt }]);
                          }
                        }}
                      />
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                         {expenses.map((e, idx) => (
                           <div key={idx} className="flex justify-between items-center text-sm p-3 bg-yellow-50/30 rounded-xl border border-yellow-100">
                              <span className="font-medium text-gray-800">{e.type}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-yellow-700">{formatCurrency(e.amount)}</span>
                                <button type="button" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                {/* Damage Returns */}
                <div className="bg-white rounded-3xl border shadow-sm">
                   <div className="bg-red-50 p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-bold text-red-900">ড্যামেজ রিটার্ন (Damage Return)</h3>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      <SearchAndAddItem 
                        products={products} 
                        onAdd={(pid, qty, price) => {
                          const existingIdx = damageItems.findIndex(d => d.productId === pid);
                          if (existingIdx > -1) {
                            const updated = [...damageItems];
                            updated[existingIdx].quantity += qty;
                            setDamageItems(updated);
                          } else {
                            setDamageItems([...damageItems, { productId: pid, quantity: qty, price: price || 0 }]);
                          }
                        }}
                        label="ড্যামেজ প্রোডাক্ট খুঁজুন..."
                        qtyLabel="পিস"
                        showPrice
                      />
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                         {damageItems.map((d, i) => (
                           <div key={i} className="flex justify-between items-center text-sm p-3 bg-red-50/30 rounded-xl border border-red-100">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800">{products.find(p => p.id === d.productId)?.name}</span>
                                <span className="text-[10px] text-red-600 font-bold">দর: {d.price} ৳</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-red-700">{d.quantity} পিস</span>
                                <button type="button" onClick={() => setDamageItems(damageItems.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
                
                {/* Customer Credits (কাস্টমার বাকি) */}
                <div className="bg-white rounded-3xl border shadow-sm">
                   <div className="bg-orange-50 p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <h3 className="font-bold text-orange-900">কাস্টমার বাকি (Customer Due)</h3>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      <SearchAndAddCustomer 
                        customers={customers}
                        onAdd={(cid, amt) => {
                          const existingIdx = credits.findIndex(c => c.customerId === cid);
                          if (existingIdx > -1) {
                            const updated = [...credits];
                            updated[existingIdx].amount += amt;
                            setCredits(updated);
                          } else {
                            setCredits([...credits, { customerId: cid, amount: amt }]);
                          }
                        }}
                      />
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                         {credits.map((c, idx) => {
                           const cust = customers.find(custObj => custObj.id === c.customerId);
                           return (
                             <div key={idx} className="flex justify-between items-center text-sm p-3 bg-orange-50/30 rounded-xl border border-orange-100 animate-in fade-in">
                               <div className="flex flex-col">
                                 <span className="font-medium text-gray-800">{cust?.name || "সাধারণ কাস্টমার"}</span>
                                 <span className="text-[10px] text-orange-500 font-bold">{cust?.shopName || "দোকানের নাম নেই"}</span>
                               </div>
                               <div className="flex items-center gap-4">
                                 <span className="font-bold text-orange-700">{formatCurrency(c.amount)}</span>
                                 <button type="button" onClick={() => setCredits(credits.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors">
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             </div>
                           );
                         })}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar: Final Calculations */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-3xl border shadow-xl sticky top-8">
              <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-800">হিসাব সামারি</h3>
              <div className="space-y-3 text-sm mb-6">
                 <div className="flex justify-between">
                    <span className="text-[#6C757D]">মোট বিক্রি (+):</span>
                    <span className="font-bold text-gray-800">{formatCurrency(activeResults?.totalSalesValue)}</span>
                 </div>
                 <div className="flex justify-between text-purple-600">
                    <span className="text-[#6C757D]">ফ্রি পিস (-):</span>
                    <span className="font-bold">{formatCurrency(activeResults?.totalFreeValue)}</span>
                 </div>
                 <div className="flex justify-between text-pink-500">
                    <span className="text-[#6C757D]">ডিসকাউন্ট (-):</span>
                    <span className="font-bold">{formatCurrency(activeResults?.totalDiscountValue)}</span>
                 </div>
                 <div className="flex justify-between text-red-500">
                    <span className="text-[#6C757D]">ড্যামেজ ভ্যালু (-):</span>
                    <span className="font-bold">{formatCurrency(activeResults?.totalDamageValue)}</span>
                 </div>
                 <div className="flex justify-between text-yellow-600">
                    <span className="text-[#6C757D]">মোট খরচ (-):</span>
                    <span className="font-bold">{formatCurrency(activeResults?.totalExpenses)}</span>
                 </div>
                 <div className="flex justify-between text-orange-600">
                    <span className="text-[#6C757D]">কাস্টমার বাকি (-):</span>
                    <span className="font-bold">{formatCurrency(activeResults?.totalCredits)}</span>
                 </div>
                 <div className="border-t pt-3 flex justify-between text-xl font-black text-blue-600 animate-in hover:scale-100">
                    <span>প্রদেয় (Payable):</span>
                    <span>{formatCurrency(activeResults?.dsrPayable)}</span>
                 </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                 <h4 className="font-bold text-xs uppercase text-[#ADB5BD]">পেমেন্ট এন্ট্রি (Collection)</h4>
                 <div className="space-y-3">
                    <div className="flex gap-2">
                       <select id="pay-method" className="flex-1 p-2 border rounded-xl text-xs bg-[#F8F9FA]">
                          <option>Cash</option>
                          <option>bKash</option>
                          <option>Nagad</option>
                       </select>
                       <input id="pay-amt" type="number" placeholder="টাকা" className="w-24 p-2 border rounded-xl text-xs" />
                       <button 
                         type="button"
                         onClick={() => {
                           const m = (document.getElementById('pay-method') as HTMLSelectElement).value;
                           const a = Number((document.getElementById('pay-amt') as HTMLInputElement).value);
                           if (a > 0) {
                             setPayments([...payments, { method: m, amount: a }]);
                             (document.getElementById('pay-amt') as HTMLInputElement).value = "";
                           }
                         }} 
                         className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                       >
                         <Plus className="w-4 h-4" />
                       </button>
                    </div>
                    {payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold p-2 bg-gray-50 rounded-lg">
                        <span>{p.method}</span>
                        <div className="flex items-center gap-1">
                          {formatCurrency(p.amount)}
                          <button type="button" onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="mt-8 space-y-3">
                 <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 animate-in fade-in">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">ব্যালেন্স</p>
                    <p className={`text-2xl font-black ${activeResults?.balance !== null && activeResults!.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCurrency(activeResults?.balance)}
                    </p>
                 </div>
                 <button 
                  type="button"
                  onClick={handleSettle}
                  disabled={isSubmitting}
                  className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-1.5 ${
                    isSubmitting ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 cursor-pointer"
                  }`}
                 >
                   {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> সম্পন্ন হচ্ছে (Processing)...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" /> সেটেলমেন্ট ও প্রিন্ট (Statement)
                      </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SearchAndAddItem({ 
  products, 
  onAdd, 
  label, 
  qtyLabel, 
  showPrice 
}: { 
  products: any[], 
  onAdd: (id: string, qty: number, price?: number) => void, 
  label: string, 
  qtyLabel: string,
  showPrice?: boolean
}) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input 
          placeholder={label} 
          className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-150 bg-white" 
          value={selectedProduct ? selectedProduct.name : search}
          onChange={e => { setSearch(e.target.value); setSelectedProduct(null); }}
        />
        {search && !selectedProduct && (
          <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
            {filtered.map(p => (
              <button 
                key={p.id || p.productId} 
                type="button"
                onClick={() => { setSelectedProduct(p); setSearch(""); setPrice(p.price || ""); }}
                className="w-full p-2 text-left text-sm hover:bg-gray-50 border-b last:border-0 block font-medium"
              >
                {p.name} {p.price ? `(${formatCurrency(p.price)})` : ''}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedProduct && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-200">
          <div className="flex-1">
            <span className="text-[10px] text-gray-400 block mb-1">পরিমাণ ({qtyLabel})</span>
            <input 
              type="number" 
              placeholder={qtyLabel} 
              className="w-full p-2 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 text-center font-bold" 
              value={qty} 
              onChange={e => setQty(e.target.value)} 
            />
          </div>
          {showPrice && (
            <div className="flex-1">
              <span className="text-[10px] text-gray-400 block mb-1 font-semibold">দর (৳)</span>
              <input 
                type="number" 
                placeholder="দর" 
                className="w-full p-2 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 text-center font-bold" 
                value={price} 
                onChange={e => setPrice(e.target.value)} 
              />
            </div>
          )}
          <div className="flex items-end">
            <button 
              type="button"
              onClick={() => {
                if (qty) {
                  onAdd(selectedProduct.productId || selectedProduct.id, Number(qty), Number(price));
                  setSelectedProduct(null);
                  setQty("");
                  setPrice("");
                } else {
                  toast.error("সঠিক পরিমাণ দিন");
                }
              }}
              className="w-full sm:w-auto bg-black text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all h-[38px] cursor-pointer"
            >
              যোগ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchAndAddCustomer({ 
  customers, 
  onAdd 
}: { 
  customers: any[], 
  onAdd: (customerId: string, amount: number) => void 
}) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [amount, setAmount] = useState("");

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.shopName && c.shopName.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  ).slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input 
          placeholder="কাস্টমার খুঁজুন (নাম, দোকান বা ফোন)..." 
          className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-200 bg-white" 
          value={selectedCustomer ? selectedCustomer.name : search}
          onChange={e => { setSearch(e.target.value); setSelectedCustomer(null); }}
        />
        {search && !selectedCustomer && (
          <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
            {filtered.map(c => {
              const colors = getGroupColors(c.groupId);
              return (
                <button 
                  key={c.id} 
                  type="button"
                  onClick={() => { setSelectedCustomer(c); setSearch(""); }}
                  className="w-full p-2.5 text-left text-xs hover:bg-orange-50/50 flex items-center justify-between transition-colors gap-2 cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    {c.groupId && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {c.groupId}
                      </span>
                    )}
                    <span className="font-extrabold text-slate-800">{c.name}</span>
                    {c.shopName && (
                      <span className="text-[11px] text-slate-400 font-bold">({c.shopName})</span>
                    )}
                  </div>
                  {c.phone && <span className="text-[10px] text-slate-400 font-mono scale-95">{c.phone}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selectedCustomer && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2 bg-orange-50/20 p-2.5 rounded-xl border border-dashed border-orange-200">
          <div className="flex-1">
            <span className="text-[10px] text-orange-600 font-bold block mb-1">বাকি টাকার পরিমাণ (Due Value)</span>
            <input 
              type="number" 
              placeholder="বাকি টাকা" 
              className="w-full p-2 border rounded-xl bg-white text-sm outline-none text-center font-bold focus:ring-2 focus:ring-orange-100" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
          </div>
          <div className="flex items-end">
            <button 
              type="button"
              onClick={() => {
                const amt = Number(amount);
                if (amt > 0) {
                  onAdd(selectedCustomer.id, amt);
                  setSelectedCustomer(null);
                  setAmount("");
                } else {
                  toast.error("সঠিক টাকার পরিমাণ দিন");
                }
              }}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all h-[38px] cursor-pointer"
            >
              যোগ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchAndAddExpenseHead({ 
  expenseHeads, 
  onAdd 
}: { 
  expenseHeads: any[], 
  onAdd: (headName: string, amount: number) => void 
}) {
  const [search, setSearch] = useState("");
  const [selectedHead, setSelectedHead] = useState<any>(null);
  const [amount, setAmount] = useState("");

  const filtered = expenseHeads.filter(h => h.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input 
          placeholder="খরচের বিবরণ বা ভাউচার খুঁজুন..." 
          className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-200 bg-white" 
          value={selectedHead ? selectedHead.name : search}
          onChange={e => { setSearch(e.target.value); setSelectedHead(null); }}
        />
        {search && !selectedHead && (
          <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
            {filtered.map(h => (
              <button 
                key={h.id} 
                type="button"
                onClick={() => { setSelectedHead(h); setSearch(""); }}
                className="w-full p-2 text-left text-sm hover:bg-yellow-50 border-b last:border-0 block font-medium"
              >
                {h.name}
              </button>
            ))}
            <button 
              type="button"
              onClick={() => { setSelectedHead({ id: "custom", name: search }); setSearch(""); }}
              className="w-full p-2 text-left text-xs font-bold text-blue-600 hover:bg-yellow-50 border-t block"
            >
              + নতুন খরচ: "{search}" যুক্ত করুন
            </button>
          </div>
        )}
      </div>
      {selectedHead && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2 bg-yellow-50/20 p-2.5 rounded-xl border border-dashed border-yellow-200">
          <div className="flex-1">
            <span className="text-[10px] text-yellow-700 font-bold block mb-1">ভাউচার খরচের টাকা (Expense Amount)</span>
            <input 
              type="number" 
              placeholder="আমানত টাকা" 
              className="w-full p-2 border rounded-xl bg-white text-sm outline-none text-center font-bold focus:ring-2 focus:ring-yellow-105" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
          </div>
          <div className="flex items-end">
            <button 
              type="button"
              onClick={() => {
                const amt = Number(amount);
                if (amt > 0) {
                  onAdd(selectedHead.name, amt);
                  setSelectedHead(null);
                  setAmount("");
                } else {
                  toast.error("সঠিক টাকার পরিমাণ দিন");
                }
              }}
              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all h-[38px] cursor-pointer"
            >
              যোগ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
