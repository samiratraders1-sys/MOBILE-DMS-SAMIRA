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
        const saved = await getFormState(formId);
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
        console.error("Error restoring form state from IndexedDB:", err);
        setSaveStatus("error");
      } finally {
        setIsRestored(true);
      }
    }

    loadState();
  }, [formId, isEnabled]);

  // Save current state whenever it changes
  useEffect(() => {
    if (!isEnabled || !isRestored) return;

    // Check if currentState is essentially empty, if so, we can clear or skip
    const isStateEmpty = !currentState || (typeof currentState === "object" && Object.values(currentState).every(v => {
      if (Array.isArray(v)) return v.length === 0;
      return v === undefined || v === null || v === "";
    }));

    if (isStateEmpty) {
      clearFormState(formId).then(() => setSaveStatus("idle"));
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

  const clearState = async () => {
    try {
      await clearFormState(formId);
      setSaveStatus("idle");
    } catch (err) {
      console.error("Error clearing form state from IndexedDB:", err);
    }
  };

  return { isRestored, saveStatus, clearState };
}
