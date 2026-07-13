import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import toast from "react-hot-toast";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  placeholderName?: string;
}

export default function VoiceInputButton({
  onTranscript,
  className = "",
  placeholderName = "খুঁজুন..."
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<"bn-BD" | "en-US">("bn-BD");
  const [hasSupport, setHasSupport] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSupport(false);
    }
  }, []);

  const startListening = () => {
    if (!hasSupport) {
      toast.error("আপনার ব্রাউজারে ভয়েস সার্চ সাপোর্ট করে না। Google Chrome ব্যবহার করুন।");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      // If already listening, stop it
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        toast.success(
          language === "bn-BD"
            ? "🎤 ভয়েস সার্চ চালু হয়েছে... বলুন"
            : "🎤 Voice search active... Speak now",
          { id: "voice-status", duration: 2000 }
        );
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
          toast.success(
            language === "bn-BD"
              ? `শনাক্ত হয়েছে: "${transcript}"`
              : `Recognized: "${transcript}"`,
            { id: "voice-status" }
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস চেক করুন।", { id: "voice-status" });
        } else if (event.error === "no-speech") {
          toast.error("কোন শব্দ শোনা যায়নি। আবার চেষ্টা করুন।", { id: "voice-status" });
        } else {
          toast.error("ভয়েস সার্চে সমস্যা হয়েছে। আবার চেষ্টা করুন।", { id: "voice-status" });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.dismiss("voice-status");
    }
  };

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleLanguage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newLang = language === "bn-BD" ? "en-US" : "bn-BD";
    setLanguage(newLang);
    toast.success(
      newLang === "bn-BD" ? "ভাষা পরিবর্তন: বাংলা" : "Language Switched: English",
      { duration: 1500 }
    );
    if (isListening) {
      // Restart with new language
      setTimeout(() => {
        startListening();
      }, 300);
    }
  };

  if (!hasSupport) {
    return null; // Gracefully hide if not supported by browser
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Language Switcher Badge */}
      <button
        type="button"
        onClick={toggleLanguage}
        title={language === "bn-BD" ? "Switch to English" : "বাংলা করুন"}
        className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider border transition-all cursor-pointer select-none bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
      >
        {language === "bn-BD" ? "বাংলা" : "ENG"}
      </button>

      {/* Voice Trigger Button */}
      <button
        type="button"
        onClick={toggleListening}
        title={
          isListening
            ? "ভয়েস সার্চ বন্ধ করুন"
            : `ভয়েস দিয়ে ${placeholderName} খুঁজুন`
        }
        className={`p-1.5 rounded-lg transition-all cursor-pointer relative flex items-center justify-center ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-200"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        }`}
      >
        {isListening ? (
          <>
            <Mic className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 border border-white rounded-full animate-ping" />
          </>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
