import { Users, Database, ShoppingCart, Package, TrendingUp, RefreshCw, FileText, Truck, Wallet, DollarSign, BookOpen, BarChart } from "lucide-react";
import { motion } from "motion/react";

const menuItems = [
  { name: "Customers Management", label: "কাস্টমার ম্যানেজমেন্ট", icon: Users, view: "customer-mgmt" },
  { name: "Suppliers Management", label: "সাপ্লায়ার ম্যানেজমেন্ট", icon: Database, view: "supplier-mgmt" },
  { name: "Purchase Management", label: "পারচেজ ম্যানেজমেন্ট", icon: ShoppingCart, view: "purchase" },
  { name: "Stock Management", label: "স্টক ম্যানেজমেন্ট", icon: Package, view: "inventory" },
  { name: "Sales Management", label: "সেলস ম্যানেজমেন্ট", icon: TrendingUp, view: "sales" },
  { name: "Return Management", label: "রিটার্ন ম্যানেজমেন্ট", icon: RefreshCw, view: "damage-mgmt" },
  { name: "Order Management", label: "অর্ডার ম্যানেজমেন্ট", icon: FileText, view: "orders" },
  { name: "Delivery Management", label: "ডেলিভারি ম্যানেজমেন্ট", icon: Truck, view: "loadsheet" },
  { name: "Dues Management", label: "বাকি ম্যানেজমেন্ট", icon: Wallet, view: "ledger" },
  { name: "Collection Management", label: "কালেকশন ম্যানেজমেন্ট", icon: DollarSign, view: "payment-history" },
  { name: "SR/DSR/DM Management", label: "SR/DSR/DM ম্যানেজমেন্ট", icon: BookOpen, view: "dsr-portal" },
  { name: "Reports Management", label: "রিপোর্টস ম্যানেজমেন্ট", icon: BarChart, view: "reports" },
  { name: "Supplier Claim Bill", label: "সাপ্লায়ার ক্লেইম বিল", icon: FileText, view: "claim-bill" },
];

export default function MainMenuView({ setActiveView }: { setActiveView: (view: string) => void }) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.view}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(item.view)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer"
          >
            <item.icon className="w-10 h-10 text-indigo-600 mb-4" />
            <span className="text-sm font-black text-gray-900 text-center">{item.name}</span>
            <span className="text-xs font-bold text-gray-500 text-center mt-1">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

