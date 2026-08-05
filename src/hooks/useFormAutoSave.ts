import { useEffect, useState } from "react";
import { getFormState, saveFormState, clearFormState } from "../lib/indexedDB";

export function useFormAutoSave<T>(
  formId: string,
  currentState: T,
  onRestore: (savedState: T) => void,
  isEnabled: boolean = true
) {
  const [isRestored, setIsRestored] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load saved state on mount
  useEffect(() => {
    if (!isEnabled) return;
    
    async function loadState() {
      try {
        let saved = await getFormState(formId);
        
        // Restore from localStorage backup as a secondary safety measure
        try {
          const localBackupStr = localStorage.getItem(`autosave_backup_${formId}`);
          if (localBackupStr) {
            const localBackup = JSON.parse(localBackupStr);
            if (localBackup && typeof localBackup === "object") {
              saved = { ...saved, ...localBackup };
            }
          }
        } catch (e) {
          console.warn("Could not read form state from localStorage backup:", e);
        }

        if (saved) {
          // Verify that saved is an object and has actual data (not just empty)
          const hasData = saved && typeof saved === "object" && Object.values(saved).some(v => {
            if (Array.isArray(v)) return v.length > 0;
            return v !== undefined && v !== null && v !== "";
          });
          
          if (hasData) {
            onRestore(saved);
          }
          setSaveStatus("saved");
        }
      } catch (err) {
        console.error("Error restoring form state from IndexedDB/localStorage:", err);
        setSaveStatus("error");
      } finally {
        setIsRestored(true);
      }
    }

    loadState();
  }, [formId, isEnabled]);

  // Save current state whenever it changes (IndexedDB debounced save)
  useEffect(() => {
    if (!isEnabled || !isRestored) return;

    // Check if currentState is essentially empty, if so, we can clear or skip
    const isStateEmpty = !currentState || (typeof currentState === "object" && Object.values(currentState).every(v => {
      if (Array.isArray(v)) return v.length === 0;
      return v === undefined || v === null || v === "";
    }));

    if (isStateEmpty) {
      clearFormState(formId).then(() => {
        try {
          localStorage.removeItem(`autosave_backup_${formId}`);
        } catch (e) {}
        setSaveStatus("idle");
      });
      return;
    }

    setSaveStatus("saving");

    const timer = setTimeout(async () => {
      try {
        await saveFormState(formId, currentState);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Error saving form state to IndexedDB:", err);
        setSaveStatus("error");
      }
    }, 800); // 800ms debounce to avoid excessive IndexedDB writes during typing

    return () => clearTimeout(timer);
  }, [currentState, formId, isEnabled, isRestored]);

  // Explicitly backup to localStorage every 30 seconds as requested by the user
  useEffect(() => {
    if (!isEnabled || !isRestored) return;

    const interval = setInterval(() => {
      const isStateEmpty = !currentState || (typeof currentState === "object" && Object.values(currentState).every(v => {
        if (Array.isArray(v)) return v.length === 0;
        return v === undefined || v === null || v === "";
      }));

      if (!isStateEmpty) {
        try {
          localStorage.setItem(`autosave_backup_${formId}`, JSON.stringify(currentState));
          console.log(`[AutoSave 30s] Backed up ${formId} to localStorage.`);
        } catch (e) {
          console.warn("Could not backup form state to localStorage:", e);
        }
      }
    }, 30000); // exactly 30 seconds interval

    return () => clearInterval(interval);
  }, [currentState, formId, isEnabled, isRestored]);

  const clearState = async () => {
    try {
      await clearFormState(formId);
      try {
        localStorage.removeItem(`autosave_backup_${formId}`);
      } catch (e) {}
      setSaveStatus("idle");
    } catch (err) {
      console.error("Error clearing form state from IndexedDB/localStorage:", err);
    }
  };

  return { isRestored, saveStatus, clearState };
}
