import React from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  recordName?: string;
  isDeleting: boolean;
  title?: string;
  message?: string;
  warning?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordName,
  isDeleting,
  title = "🗑️ ডিলিট নিশ্চিত করুন",
  message = "আপনি কি নিশ্চিত যে এই রেকর্ডটি স্থায়ীভাবে ডিলিট করতে চান?",
  warning = "⚠️ এই কাজটি পরে ফিরিয়ে আনা যাবে না।"
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" 
      id="confirm-dialog-backdrop"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100"
        id="confirm-dialog-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2" id="confirm-dialog-title">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-650 transition-colors p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {message}
              </p>
              {recordName && (
                <div className="bg-gray-50 border border-gray-200/60 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 break-all">
                  {recordName}
                </div>
              )}
              {warning && (
                <p className="text-xs text-red-500 font-medium leading-relaxed">
                  {warning}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            id="confirm-dialog-cancel-btn"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs hover:shadow-md transition duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            id="confirm-dialog-confirm-btn"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ডিলিট করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <span>🗑️</span>
                <span>ডিলিট করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
