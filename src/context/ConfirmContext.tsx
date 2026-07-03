import React, { createContext, useContext, useState } from "react";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

export interface ConfirmOptions {
  recordName: string;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message?: string;
  warning?: string;
}

interface ConfirmContextType {
  confirmDelete: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = (opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    setIsDeleting(false);
  };

  const handleCancel = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setOptions(null);
  };

  const handleConfirm = async () => {
    if (!options || isDeleting) return;
    setIsDeleting(true);
    try {
      await options.onConfirm();
      setIsOpen(false);
      setOptions(null);
    } catch (err) {
      console.error("Delete confirmation failed:", err);
      // Keep dialog open on failure, as required
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirmDelete }}>
      {children}
      {options && (
        <ConfirmDialog
          isOpen={isOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          recordName={options.recordName}
          isDeleting={isDeleting}
          title={options.title}
          message={options.message}
          warning={options.warning}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
