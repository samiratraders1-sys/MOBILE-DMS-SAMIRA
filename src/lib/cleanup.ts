/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import toast from "react-hot-toast";

// Increment this version whenever a schema change or major update occurs
// This will trigger a clean wipe of legacy/stale storage and IndexedDB caches
export const APP_VERSION = "2.1.0";
export const BUILD_TIMESTAMP = "2026-06-24T10:25:00Z";

export async function performAppStorageCleanup() {
  try {
    const savedVersion = localStorage.getItem("app_version");
    const savedTimestamp = localStorage.getItem("app_build_timestamp");

    if (savedVersion === APP_VERSION && savedTimestamp === BUILD_TIMESTAMP) {
      // Storage is up to date, no action needed
      return;
    }

    console.log(`[Storage Cleanup] Version or timestamp mismatch: current is '${APP_VERSION}' (saved: '${savedVersion}'), current timestamp is '${BUILD_TIMESTAMP}' (saved: '${savedTimestamp}'). Initiating cache cleanup...`);

    // 1. Preserve essential user preferences
    const preservedPreferences: Record<string, string | null> = {
      app_language: localStorage.getItem("app_language"),
      app_theme: localStorage.getItem("app_theme"),
      cash_safety_threshold: localStorage.getItem("cash_safety_threshold"),
      cash_safety_alert_enabled: localStorage.getItem("cash_safety_alert_enabled"),
      app_custom_logo: localStorage.getItem("app_custom_logo"),
      dms_config_low_stock: localStorage.getItem("dms_config_low_stock"),
      dms_config_sales_target: localStorage.getItem("dms_config_sales_target"),
      dms_config_reminders: localStorage.getItem("dms_config_reminders"),
    };

    // 2. Clear all localStorage keys
    localStorage.clear();

    // 3. Restore preserved user preferences
    Object.entries(preservedPreferences).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    });

    // Save the new version key and build timestamp to prevent subsequent wipes
    localStorage.setItem("app_version", APP_VERSION);
    localStorage.setItem("app_build_timestamp", BUILD_TIMESTAMP);

    // 4. Wipe all IndexedDB databases
    // This is crucial to clear corrupted/stale Firestore offline persistence caches
    if (window.indexedDB) {
      if (window.indexedDB.databases) {
        try {
          const dbs = await window.indexedDB.databases();
          for (const dbInfo of dbs) {
            if (dbInfo.name) {
              console.log(`[Storage Cleanup] Deleting IndexedDB database: ${dbInfo.name}`);
              window.indexedDB.deleteDatabase(dbInfo.name);
            }
          }
        } catch (dbErr) {
          console.warn("[Storage Cleanup] Error listing/deleting databases via indexedDB.databases():", dbErr);
          // Fallback: Delete common Firestore and app databases manually
          deleteCommonDatabases();
        }
      } else {
        // Fallback for browsers that do not support indexedDB.databases()
        deleteCommonDatabases();
      }
    }

    // 5. Clear Cache Storage (Service Worker Caches)
    if (window.caches) {
      try {
        const cacheNames = await window.caches.keys();
        for (const cacheName of cacheNames) {
          console.log(`[Storage Cleanup] Deleting Cache Storage: ${cacheName}`);
          await window.caches.delete(cacheName);
        }
      } catch (cacheErr) {
        console.warn("[Storage Cleanup] Error clearing Cache Storage:", cacheErr);
      }
    }

    // 6. Unregister older Service Workers to let the registration logic register a clean new service worker
    if (navigator.serviceWorker) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log(`[Storage Cleanup] Unregistering service worker scope: ${registration.scope}`);
          await registration.unregister();
        }
      } catch (swErr) {
        console.warn("[Storage Cleanup] Error unregistering service workers:", swErr);
      }
    }

    console.log("[Storage Cleanup] Stale keys, IndexedDB, Cache Storage, and Service Workers wiped successfully!");
    
    // Notify user of update
    toast.success("সিস্টেম আপডেট করা হয়েছে এবং ক্যাশ পরিষ্কার করা হয়েছে। পেজ রিলোড হচ্ছে...");
    
    // 7. Force location reload after a tiny delay so toast can show, forcing browser to fetch all assets freshly
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  } catch (err) {
    console.error("[Storage Cleanup] Unexpected error during cache cleanup:", err);
  }
}

function deleteCommonDatabases() {
  const commonDbNames = [
    "firestore",
    "firestore/[Map]",
    "firebase-auth-persistence",
    "firebase-common",
    "localforage",
  ];
  
  commonDbNames.forEach((name) => {
    try {
      console.log(`[Storage Cleanup] Attempting fallback deletion of database: ${name}`);
      window.indexedDB.deleteDatabase(name);
    } catch (e) {
      // Silent catch
    }
  });
}
