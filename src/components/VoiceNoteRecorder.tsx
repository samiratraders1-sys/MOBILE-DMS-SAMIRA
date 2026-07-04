import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Volume2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

interface VoiceNoteRecorderProps {
  onRecordingComplete?: (base64Audio: string | null) => void;
  existingAudio?: string | null;
  readOnly?: boolean;
}

export default function VoiceNoteRecorder({
  onRecordingComplete,
  existingAudio = null,
  readOnly = false
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize existing audio if it changes
  useEffect(() => {
    if (existingAudio) {
      setAudioUrl(existingAudio);
    }
  }, [existingAudio]);

  // Request/Check permission on mount (only if not read-only and no audio)
  useEffect(() => {
    if (!readOnly && !audioUrl) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, [readOnly, audioUrl]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) { // Limit to 60 seconds
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Handle Playback Progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setPlaybackTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setPlaybackDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // Start recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);

      // Detect supported mime types
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        options = { mimeType: "audio/ogg;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to Base64 string for persistent storage
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (onRecordingComplete) {
            onRecordingComplete(base64Audio);
          }
        };

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      setRecordingTime(0);
      mediaRecorder.start();
      setIsRecording(true);
      toast.success("রেকর্ডিং শুরু হয়েছে...");
    } catch (err) {
      console.error("Microphone access failed", err);
      setHasPermission(false);
      toast.error("মাইক্রোফোন অ্যাক্সেস করতে সমস্যা হয়েছে!");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Delete/Clear Recording
  const clearRecording = () => {
    setAudioUrl(null);
    setIsPlaying(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    if (onRecordingComplete) {
      onRecordingComplete(null);
    }
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Failed to play audio", err);
        toast.error("অডিও প্লে করতে ব্যর্থ হয়েছে");
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Render purely as a compact play widget if readOnly or existing audio
  if (readOnly) {
    if (!audioUrl) return null;
    return (
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2.5 px-4 rounded-2xl w-full max-w-[280px] shadow-sm select-none">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        <button
          onClick={togglePlay}
          className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all cursor-pointer active:scale-95 shrink-0"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[9px] font-bold text-slate-400 font-mono">
            <span>{formatTime(playbackTime)}</span>
            <span>{formatTime(playbackDuration || 3)}</span>
          </div>
          {/* Custom micro-progress bar */}
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div 
              className="bg-emerald-400 h-1 transition-all duration-100" 
              style={{ width: `${playbackDuration > 0 ? (playbackTime / playbackDuration) * 100 : 0}%` }}
            />
          </div>
        </div>

        <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
          ভয়েস নোট (Voice Audio Note)
        </span>
        {hasPermission === false && (
          <span className="text-[9px] font-extrabold text-rose-500 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> মাইক্রোফোন পারমিশন ব্লকড
          </span>
        )}
      </div>

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 p-2.5 px-4 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all cursor-pointer shadow-md animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>রেকর্ডিং থামান ({formatTime(recordingTime)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={hasPermission === false}
              className="flex items-center gap-2 p-2.5 px-4 bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all cursor-pointer shadow-md"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>ভয়েস রেকর্ড করুন</span>
            </button>
          )}
          <span className="text-[10px] font-bold text-slate-400">
            {isRecording ? "কথোপকথন রেকর্ড করা হচ্ছে (সর্বোচ্চ ৬০ সেকেন্ড)" : "লেনদেনের সাথে একটি অডিও বার্তা জুড়ে দিন"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-white border p-3 rounded-xl shadow-sm">
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          <button
            type="button"
            onClick={togglePlay}
            className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all cursor-pointer active:scale-95 shrink-0"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-extrabold text-slate-500 font-mono">
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(playbackDuration)}</span>
            </div>
            {/* Custom progress slider container */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-100" 
                style={{ width: `${playbackDuration > 0 ? (playbackTime / playbackDuration) * 100 : 0}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={clearRecording}
            className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all cursor-pointer shrink-0"
            title="মুছে দিন"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
