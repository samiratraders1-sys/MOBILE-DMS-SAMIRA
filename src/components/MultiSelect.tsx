import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  className?: string;
}

export default function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder,
  className = "",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    const visibleOptionValues = filteredOptions.map((o) => o.value);
    const allVisibleSelected = visibleOptionValues.every((v) => selectedValues.includes(v));

    if (allVisibleSelected) {
      // Unselect all visible
      onChange(selectedValues.filter((v) => !visibleOptionValues.includes(v)));
    } else {
      // Select all visible
      const newSelection = Array.from(new Set([...selectedValues, ...visibleOptionValues]));
      onChange(newSelection);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const displayedLabel = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === options.length) {
      return `সব নির্বাচিত (${selectedValues.length})`;
    }
    return `${selectedValues.length}টি নির্বাচিত`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#E9ECEF] rounded-xl p-2.5 px-4 text-xs font-bold text-slate-800 flex items-center justify-between shadow-xs hover:border-gray-300 transition-all cursor-pointer text-left gap-1 select-none"
      >
        <span className="truncate text-gray-700 font-bold">{displayedLabel()}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="p-0.5 hover:bg-slate-100 rounded-full text-gray-400 hover:text-rose-500 cursor-pointer transition"
              title="পরিষ্কার করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-[#E9ECEF] rounded-2xl shadow-xl z-50 p-3 animate-in fade-in duration-100 max-h-80 flex flex-col">
          {/* Search Box */}
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 p-2 text-slate-900"
            />
          </div>

          {/* Quick Controls */}
          {filteredOptions.length > 0 && (
            <div className="flex justify-between items-center mb-2 px-1 text-[11px] font-black text-indigo-600 border-b pb-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:underline hover:text-indigo-800 cursor-pointer"
              >
                {filteredOptions.map((o) => o.value).every((v) => selectedValues.includes(v))
                  ? "সব বাদ দিন"
                  : "সব নির্বাচন"}
              </button>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="hover:underline hover:text-rose-600 text-rose-500 cursor-pointer"
                >
                  সব মুছুন
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto flex-1 space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 font-bold">কোনো মিল নেই</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleOption(opt.value)}
                    className={`w-full text-left flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-750"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
