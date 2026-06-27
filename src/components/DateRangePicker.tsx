import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  onClear: () => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  onClear
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const activePresetLabel = () => {
    if (!startDate && !endDate) return "সব সময় (All Time)";
    
    // Check if preset matches
    const todayStr = new Date().toISOString().split("T")[0];
    const getPastDateStr = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split("T")[0];
    };

    if (startDate === todayStr && endDate === todayStr) return "আজ (Today)";
    if (startDate === getPastDateStr(1) && endDate === getPastDateStr(1)) return "গতকাল (Yesterday)";
    if (startDate === getPastDateStr(7) && endDate === todayStr) return "গত ৭ দিন (Last 7 Days)";
    if (startDate === getPastDateStr(30) && endDate === todayStr) return "গত ৩০ দিন (Last 30 Days)";
    
    return `${formatDateLabel(startDate) || "শুরু"} - ${formatDateLabel(endDate) || "শেষ"}`;
  };

  const applyPreset = (days: number, type?: 'yesterday' | 'this_month' | 'last_month') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (type === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (type === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      start.setDate(today.getDate() - days);
    }

    onRangeChange(
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0]
    );
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef} id="custom-date-range-picker">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none outline-none ${
            startDate || endDate
              ? "bg-indigo-50 border-indigo-200 text-indigo-800"
              : "bg-white border-gray-250 hover:bg-slate-50 text-gray-700"
          }`}
        >
          <Calendar className={`w-4 h-4 ${startDate || endDate ? "text-indigo-600" : "text-gray-400"}`} />
          <span className="font-semibold">{activePresetLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={onClear}
            title="তারিখ ফিল্টার পরিষ্কার করুন"
            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 bg-white rounded-2xl border border-gray-150 shadow-xl p-4 z-50 w-80 space-y-4"
          >
            <div className="flex items-center gap-1.5 pb-2.5 border-b border-gray-100">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-gray-700">দ্রুত নির্বাচন (Date Presets)</span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => applyPreset(0)}
                className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold transition-all text-left"
              >
                আজ (Today)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 'yesterday')}
                className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold transition-all text-left"
              >
                গতকাল (Yesterday)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7)}
                className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold transition-all text-left"
              >
                গত ৭ দিন (Last 7 Days)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30)}
                className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold transition-all text-left"
              >
                গত ৩০ দিন (Last 30 Days)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 'this_month')}
                className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold transition-all text-left"
              >
                চলতি মাস (This Month)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 'last_month')}
                className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold transition-all text-left"
              >
                গত মাস (Last Month)
              </button>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">নির্দিষ্ট পরিসীমা (Custom Range)</span>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">শুরু (Start Date)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onRangeChange(e.target.value, endDate)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-medium outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">শেষ (End Date)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onRangeChange(startDate, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-medium outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                প্রয়োগ করুন
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
