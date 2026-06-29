import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
  }).format(amount);
}

export function formatNumber(val: number) {
  return new Intl.NumberFormat("bn-BD").format(val);
}

export function piecesToCartoon(totalPieces: number, cartoonSize: number) {
  const cartons = Math.floor(totalPieces / (cartoonSize || 1));
  const pieces = totalPieces % (cartoonSize || 1);
  return `${cartons}+${pieces}`;
}

export function cartoonToPieces(cartons: number, pieces: number, cartoonSize: number) {
  return (cartons * (cartoonSize || 1)) + pieces;
}

export const GROUP_COLOR_PRESETS = [
  { bg: "bg-teal-600", text: "text-white", border: "border-teal-750" },
  { bg: "bg-cyan-600", text: "text-white", border: "border-cyan-750" },
  { bg: "bg-sky-600", text: "text-white", border: "border-sky-750" },
  { bg: "bg-orange-600", text: "text-white", border: "border-orange-750" },
  { bg: "bg-pink-600", text: "text-white", border: "border-pink-750" },
  { bg: "bg-lime-500", text: "text-slate-950", border: "border-lime-700" },
  { bg: "bg-blue-600", text: "text-white", border: "border-blue-750" },
  { bg: "bg-amber-600", text: "text-white", border: "border-amber-700" },
  { bg: "bg-emerald-700", text: "text-white", border: "border-emerald-850" },
  { bg: "bg-yellow-400", text: "text-slate-950", border: "border-yellow-500" },
  { bg: "bg-red-600", text: "text-white", border: "border-red-750" },
  { bg: "bg-violet-650", text: "text-white", border: "border-violet-800" },
];

export function getGroupColors(groupId: string | undefined | null) {
  if (!groupId) return { bg: "bg-slate-500", text: "text-white", border: "border-slate-600" };
  const val = groupId.trim().toLowerCase();
  
  // Try to lookup in dynamically configured groups first
  try {
    const saved = localStorage.getItem("customer_group_colors");
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) {
        const match = list.find((g: any) => g && g.name && g.name.trim().toLowerCase() === val);
        if (match && match.bg) {
          const bgVal = match.bg;
          // Dynamically compute the border if not specified
          const borderVal = match.border || bgVal.replace("bg-", "border-").replace("500", "600").replace("600", "700").replace("700", "850");
          return {
            bg: bgVal,
            text: match.text || "text-white",
            border: borderVal
          };
        }
      }
    }
  } catch (e) {
    console.error("Error matching customer_group_colors from localStorage:", e);
  }
  
  // High-impact bright matching for the requested preset options
  if (val === "retailer") {
    return { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-700" };
  }
  if (val === "wholesaler") {
    return { bg: "bg-violet-600", text: "text-white", border: "border-violet-700" };
  }
  if (val === "vip") {
    return { bg: "bg-rose-600", text: "text-white", border: "border-rose-700" };
  }
  if (val === "dealer") {
    return { bg: "bg-amber-500", text: "text-black", border: "border-amber-600" };
  }
  if (val === "general") {
    return { bg: "bg-slate-500", text: "text-white", border: "border-slate-600" };
  }

  // Custom high-impact bright presets for common or default customer groups
  if (val.includes("ধামরাই") || val.includes("dhamrai")) {
    return { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-750" };
  }
  if (val.includes("সাভার") || val.includes("savar")) {
    return { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-750" };
  }
  if (val.includes("ঢাকা") || val.includes("dhaka")) {
    return { bg: "bg-rose-600", text: "text-white", border: "border-rose-750" };
  }
  if (val.includes("খুচরা") || val.includes("retail") || val.includes("খুচরা কাস্টমার")) {
    return { bg: "bg-amber-500", text: "text-black", border: "border-amber-600" };
  }
  if (val.includes("পাইকারি") || val.includes("wholesale")) {
    return { bg: "bg-purple-600", text: "text-white", border: "border-purple-750" };
  }
  if (val.includes("গুরুত্বপূর্ণ") || val.includes("vip") || val.includes("ভিআইপি")) {
    return { bg: "bg-fuchsia-600", text: "text-white", border: "border-fuchsia-750" };
  }

  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GROUP_COLOR_PRESETS.length;
  return GROUP_COLOR_PRESETS[index];
}


