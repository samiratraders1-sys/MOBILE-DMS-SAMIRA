import React, { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, Upload, Sparkles, Check, ChevronRight, FileText, ArrowRightLeft } from "lucide-react";
import toast from "react-hot-toast";

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPurchase?: (ocrData: any) => void;
  onImportSale?: (ocrData: any) => void;
}

export default function DocumentScannerModal({
  isOpen,
  onClose,
  onImportPurchase,
  onImportSale
}: DocumentScannerModalProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Discover camera list
  useEffect(() => {
    if (!isOpen) return;
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          // Prefer back camera if available
          const backCam = videoDevices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      })
      .catch(err => {
        console.warn("Failed to list cameras:", err);
      });

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Handle camera start
  const startCamera = async (deviceId: string) => {
    await stopCamera();
    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCapturedImage(null);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      toast.error("ক্যামেরা অন করা যায়নি। অনুগ্রহ করে পারমিশন দিন বা ফাইল আপলোড অপশনটি ব্যবহার করুন।");
    }
  };

  // Stop camera
  const stopCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Process Document with AI OCR
  const analyzeWithAI = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    setOcrResult(null);

    // Dynamic progress steps
    const steps = [
      "ডকুমেন্ট আপলোড হচ্ছে...",
      "কৃত্রিম বুদ্ধিমত্তা ছবি বিশ্লেষণ করছে...",
      "পণ্যের নাম এবং ক্রয়মূল্য সাজানো হচ্ছে...",
      "ট্যাক্স ও হিসাব মিলিয়ে দেখা হচ্ছে..."
    ];

    let stepIdx = 0;
    setActiveStep(steps[0]);
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setActiveStep(steps[stepIdx]);
      }
    }, 1500);

    try {
      const response = await fetch("/api/ai/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage })
      });

      if (!response.ok) {
        throw new Error("OCR Processing request failed");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setOcrResult(result.data);
        toast.success("ডকুমেন্ট সফলভাবে বিশ্লেষণ করা হয়েছে!");
      } else {
        throw new Error(result.error || "পার্সিং ত্রুটি");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("কৃত্রিম বুদ্ধিমত্তা দিয়ে স্ক্যান করতে সমস্যা হয়েছে। দয়া করে পরিষ্কার ছবি আপলোড করুন।");
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
      setActiveStep("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">স্মার্ট ডকুমেন্ট স্ক্যান ও এআই রিডার (AI OCR)</h2>
              <p className="text-xs text-slate-500">ভাউচার, মেমো বা চালান স্ক্যান করে সরাসরি এন্ট্রি করুন</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Capture or Input */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[300px] overflow-hidden">
              
              {isCameraActive && !capturedImage && (
                <div className="w-full h-full absolute inset-0 flex flex-col justify-between bg-black">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover"
                    playsInline 
                    muted 
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                    <button 
                      onClick={capturePhoto}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-full text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Snap Photo
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="bg-slate-800 text-white px-4 py-2.5 rounded-full text-xs hover:bg-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {capturedImage ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <img src={capturedImage} alt="Captured Document" className="max-h-[280px] rounded-xl object-contain shadow-md border border-slate-100" />
                  <button 
                    onClick={() => {
                      setCapturedImage(null);
                      setOcrResult(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : !isCameraActive ? (
                <div className="text-center py-10 space-y-4 w-full">
                  <Upload className="w-12 h-12 text-indigo-400 mx-auto animate-bounce" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">ফিজিক্যাল ভাউচার বা চালানের ছবি তুলুন / আপলোড করুন</p>
                    <p className="text-xs text-slate-400 mt-1">জেপেগ বা পিএনজি ছবি (সর্বোচ্চ ১০ মেগাবাইট)</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" /> ছবি আপলোড করুন
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    {cameras.length > 0 && (
                      <button 
                        onClick={() => startCamera(selectedCameraId)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-emerald-400" /> সরাসরি ছবি তুলুন
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Camera Selectors */}
            {cameras.length > 1 && !capturedImage && (
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">ক্যামেরা উৎস:</span>
                <select 
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isCameraActive) startCamera(e.target.value);
                  }}
                  className="bg-white border rounded-lg text-xs p-1 flex-1 text-slate-700"
                >
                  {cameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${cameras.indexOf(cam) + 1}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action triggers */}
            {capturedImage && !isAnalyzing && !ocrResult && (
              <button 
                onClick={analyzeWithAI}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl text-sm font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-spin" />
                এআই রিডার দিয়ে ডেটা রিড করুন (Process OCR)
              </button>
            )}

            {isAnalyzing && (
              <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-center space-y-3.5 animate-pulse">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <div>
                  <h4 className="text-sm font-black text-indigo-900">ডকুমেন্ট রিড করা হচ্ছে...</h4>
                  <p className="text-xs text-indigo-600 mt-1 font-sans">{activeStep}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Extracted Output */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between min-h-[350px]">
            {ocrResult ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" /> এআই পার্সড ফলাফল
                    </h3>
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {ocrResult.documentType || "Invoice"}
                    </span>
                  </div>

                  {/* Header Details Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs mb-4">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-150">
                      <span className="block text-[9px] text-slate-400 font-extrabold uppercase">মেমো / চালান নং</span>
                      <strong className="text-slate-800 text-sm font-sans">{ocrResult.invoiceNumber || "N/A"}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-150">
                      <span className="block text-[9px] text-slate-400 font-extrabold uppercase">তারিখ</span>
                      <strong className="text-slate-800 text-sm font-sans">{ocrResult.date || "N/A"}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-150 col-span-2">
                      <span className="block text-[9px] text-slate-400 font-extrabold uppercase">প্রতিষ্ঠান / সাপ্লায়ার নাম</span>
                      <strong className="text-slate-800 text-sm">{ocrResult.partyName || "N/A"}</strong>
                    </div>
                  </div>

                  {/* Product Rows extracted */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">পণ্যের বিবরণী (Extracted Lines)</span>
                    <div className="max-h-[160px] overflow-y-auto bg-white border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                            <th className="p-2">পণ্য</th>
                            <th className="p-2 text-center">পরিমাণ</th>
                            <th className="p-2 text-right">মূল্য</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ocrResult.items && ocrResult.items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
                              <td className="p-2 font-semibold text-slate-700">{item.productName}</td>
                              <td className="p-2 text-center font-bold text-indigo-600 font-sans">{item.quantity}</td>
                              <td className="p-2 text-right font-bold text-slate-700 font-sans">{item.rate || item.total}৳</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grand total banner */}
                  <div className="mt-4 bg-indigo-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-xs font-bold">মোট বিল মূল্য (Grand Total)</span>
                    <strong className="text-lg font-black font-sans">{ocrResult.grandTotal || "0.00"} ৳</strong>
                  </div>
                </div>

                {/* Import destinations triggers */}
                <div className="space-y-2 pt-4">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center block">সরাসরি ইনজেক্ট করুন</span>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {onImportPurchase && (
                      <button 
                        onClick={() => {
                          onImportPurchase(ocrResult);
                          onClose();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        ক্রয় বিল এন্ট্রি <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    
                    {onImportSale && (
                      <button 
                        onClick={() => {
                          onImportSale(ocrResult);
                          onClose();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        বিক্রয় মেমো এন্ট্রি <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2.5 p-6">
                <Sparkles className="w-10 h-10 text-slate-300 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-slate-600">কোনো এআই ডেটা বিশ্লেষণ করা হয়নি</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-normal">চালান বা মেমোর ছবি আপলোড করে "এআই রিডার" বোতামটি চাপুন। এআই স্বয়ংক্রিয়ভাবে সব ডেটা বের করবে।</p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
