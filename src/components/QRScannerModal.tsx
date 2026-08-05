import React, { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, AlertCircle, Sparkles, Check } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import toast from "react-hot-toast";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
  placeholderText?: string;
  exampleCodes?: Array<{ code: string; label: string }>;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "কিউআর / বারকোড স্ক্যানার (Camera Scanner)",
  placeholderText = "উদাহরণঃ EMP-101 অথবা পণ্যের SKU বারকোড",
  exampleCodes = []
}: QRScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scannerError, setScannerError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "reader-element-canvas";

  // Scan cooldown to prevent double scans
  const isHandlingScanRef = useRef(false);
  const isStartingRef = useRef(false);
  const startPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Discover cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setScannerError("কোনো ক্যামেরা ডিভাইস পাওয়া যায়নি।");
        }
      })
      .catch((err) => {
        console.error("Error getting cameras", err);
        setScannerError("ক্যামেরা ব্যবহারের অনুমতি দেওয়া হয়নি অথবা ক্যামেরা অনুপস্থিত।");
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraIdToUse: string) => {
    if (!cameraIdToUse) return;
    
    // Stop any existing session
    await stopScanner();

    try {
      setScannerError("");
      const html5QrCode = new Html5Qrcode(scannerId);
      qrCodeInstanceRef.current = html5QrCode;
      setIsScanning(true);
      isStartingRef.current = true;

      const startPromise = html5QrCode.start(
        cameraIdToUse,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (isHandlingScanRef.current) return;
          isHandlingScanRef.current = true;
          
          // Sound simulation
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.setValueAtTime(1000, context.currentTime);
            gain.gain.setValueAtTime(0.1, context.currentTime);
            osc.start();
            osc.stop(context.currentTime + 0.15);
          } catch (e) {
            console.log("Audio feedback error", e);
          }

          toast.success(`সাফল্যের সাথে স্ক্যান হয়েছে: "${decodedText}"`);
          onScan(decodedText);
          stopScanner();
          onClose();

          setTimeout(() => {
            isHandlingScanRef.current = false;
          }, 1000);
        },
        (errorMessage) => {
          // Non-blocking verbose output can be ignored
        }
      );

      startPromiseRef.current = startPromise;
      await startPromise;
    } catch (err: any) {
      console.error("Failed to start scanner", err);
      setScannerError(`ক্যামেরা চালু করতে ব্যর্থ: ${err.message || err}`);
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
      startPromiseRef.current = null;
    }
  };

  const stopScanner = async () => {
    // If starting process is in progress, await its completion before stopping
    if (isStartingRef.current && startPromiseRef.current) {
      try {
        await startPromiseRef.current;
      } catch (err) {
        // Start might have failed, ignore
      }
    }

    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.warn("Failed to stop scanner", err);
      }
    }
    qrCodeInstanceRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && selectedCameraId) {
      startScanner(selectedCameraId);
    }
  }, [isOpen, selectedCameraId]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      toast.error("অনুগ্রহ করে একটি কোড লিখুন!");
      return;
    }
    onScan(code);
    stopScanner();
    onClose();
    setManualCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-55 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-800 leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">রিয়েল-টাইম কন্টিনিউয়াস ক্যামেরা স্ক্যানিং</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl border hover:shadow-xs transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Camera Selection Dropdown */}
          {cameras.length > 1 && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">ক্যামেরা সিলেক্ট করুন (Select Camera):</label>
              <div className="relative">
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-250 rounded-xl py-2.5 pl-3 pr-8 text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      📷 {cam.label || `Camera ${cam.id}`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}

          {/* Error Message if present */}
          {scannerError && (
            <div className="p-3 bg-rose-50 border border-rose-250 rounded-xl flex gap-2.5 text-rose-800 text-xs font-semibold leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">ক্যামেরা স্ক্যানার ত্রুটিঃ</p>
                <p className="text-[11px] text-rose-650">{scannerError}</p>
                <p className="text-[10px] text-rose-500 mt-1">অনুগ্রহ করে নিচের ম্যানুয়াল কোড ইনপুট অথবা টেস্টিং কুইক সিমুলেটর অপশন ব্যবহার করুন।</p>
              </div>
            </div>
          )}

          {/* Camera Canvas Viewport */}
          <div className="relative bg-slate-950 aspect-video rounded-2xl overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
            {/* Target overlay */}
            {isScanning && !scannerError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                {/* Neon Scan line overlay animation */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500 shadow-[0_0_12px_#ef4444] animate-[bounce_3s_infinite]" />
                <div className="border-2 border-dashed border-indigo-400 w-44 h-44 rounded-xl relative opacity-85">
                  {/* Corner notches */}
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl" />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br" />
                </div>
                <p className="text-[10px] text-white bg-slate-900/80 px-2.5 py-1 rounded-full font-bold mt-4 border border-slate-700/50 backdrop-blur-xs tracking-wider uppercase">
                  স্ক্যান করতে কোডটি ফ্রেমের ভেতরে রাখুন
                </p>
              </div>
            )}

            {/* This is the placeholder div element HTML5 QR code renders on */}
            <div id={scannerId} className="w-full h-full object-cover" />

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-2 p-4 text-center">
                <Camera className="w-10 h-10 text-slate-500 opacity-60" />
                <p className="text-xs font-bold text-slate-300">ক্যামেরা ভিউ নিষ্ক্রিয় রয়েছে</p>
                <p className="text-[10px] text-slate-500">আপনার ক্যামেরার অনুমতি দিন অথবা নিচের সিমুলেটর দিয়ে টেস্টিং সম্পন্ন করুন।</p>
              </div>
            )}
          </div>

          {/* Manual input form fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">ম্যানুয়াল কোড ইনপুট (Manual Input Fallback):</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={placeholderText}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-250 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> সাবমিট
              </button>
            </div>
          </form>

          {/* Testing Quick Simulator List */}
          {exampleCodes.length > 0 && (
            <div className="space-y-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-1.5 text-indigo-950">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <h4 className="text-[10px] font-black uppercase tracking-wider">কুইক টেস্টিং সিমুলেটর (Quick Test Simulator)</h4>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                ক্যামেরা ছাড়া অথবা লোকাল ডিভাইসে ঝটপট টেস্ট করার জন্য নিচের যেকোনো ডেমো আইডি বাটনে ক্লিক করুন:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {exampleCodes.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      toast.success(`সিমুলেটেড স্ক্যানঃ "${item.code}"`);
                      onScan(item.code);
                      stopScanner();
                      onClose();
                    }}
                    className="bg-white hover:bg-indigo-100/50 border border-indigo-150 text-indigo-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1 shadow-2xs"
                  >
                    <span>🎯 {item.label}:</span>
                    <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-700 font-mono text-[9px]">{item.code}</code>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
