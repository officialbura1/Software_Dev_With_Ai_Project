import React, { useState, useEffect } from "react";
import { 
  Volume2, 
  Copy, 
  Mic, 
  MicOff, 
  RotateCw, 
  ChevronRight, 
  Sparkles, 
  X,
  Languages, 
  Check, 
  ArrowLeftRight 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TranslatorModuleProps {
  onNotify: (msg: string, type: "success" | "info" | "warning") => void;
}

export default function TranslatorModule({ onNotify }: TranslatorModuleProps) {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("French");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const languages = [
    { code: "auto", name: "✨ Detect Language" },
    { code: "English", name: "English" },
    { code: "Spanish", name: "Spanish" },
    { code: "French", name: "French" },
    { code: "German", name: "German" },
    { code: "Italian", name: "Italian" },
    { code: "Chinese", name: "Chinese (Mandarin)" },
    { code: "Japanese", name: "Japanese" },
    { code: "Korean", name: "Korean" },
    { code: "Hindi", name: "Hindi" },
    { code: "Arabic", name: "Arabic" },
    { code: "Portuguese", name: "Portuguese" },
    { code: "Russian", name: "Russian" }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recObj = new SpeechRecognition();
      recObj.continuous = false;
      recObj.interimResults = false;
      recObj.lang = "en-US"; // Default voice detection locale

      recObj.onstart = () => {
        setIsListening(true);
        onNotify("Voice recognition active... Speak now.", "info");
      };

      recObj.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSourceText((prev) => (prev ? prev + " " + transcript : transcript));
        onNotify("Speech converted to text", "success");
      };

      recObj.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        setIsListening(false);
        onNotify("Speech error: " + (e?.error || "Could not understand voice"), "warning");
      };

      recObj.onend = () => {
        setIsListening(false);
      };

      setRecognitionInstance(recObj);
    }
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionInstance) {
      onNotify("Speech recognition is not supported in this browser environment.", "warning");
      return;
    }

    if (isListening) {
      recognitionInstance.stop();
    } else {
      recognitionInstance.start();
    }
  };

  // Debounced/Triggered Translation calling real backend
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setTranslatedText("");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          sourceLang,
          targetLang
        })
      });

      const data = await res.json();
      if (res.ok && data?.translatedText) {
        setTranslatedText(data.translatedText);
      } else {
        throw new Error(data?.error || "Translation API returned an error status");
      }
    } catch (e: any) {
      console.error(e);
      onNotify("Translation failed: " + (e?.message || "Check network configurations"), "warning");
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically trigger translate when text or languages change (debounced manually)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.trim()) {
        handleTranslate();
      } else {
        setTranslatedText("");
      }
    }, 850); // debounce input

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang]);

  // Swap Languages
  const handleSwap = () => {
    if (sourceLang === "auto") {
      // cannot swap auto with a real language direct, default source to English if auto
      setSourceLang(targetLang);
      setTargetLang("English");
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    // Also swap text values
    const tempText = sourceText;
    setSourceText(translatedText);
    setTranslatedText(tempText);
    onNotify("Languages swapped", "info");
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    onNotify("Translation copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (textToSpeak: string, languageName: string) => {
    if (!textToSpeak) return;
    try {
      const speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
      // Map basic standard language locales
      const langMap: Record<string, string> = {
        "English": "en-US",
        "Spanish": "es-ES",
        "French": "fr-FR",
        "German": "de-DE",
        "Italian": "it-IT",
        "Chinese": "zh-CN",
        "Japanese": "ja-JP",
        "Korean": "ko-KR",
        "Hindi": "hi-IN",
        "Arabic": "ar-SA",
        "Portuguese": "pt-PT",
        "Russian": "ru-RU"
      };

      const locale = langMap[languageName] || "en-US";
      speechUtterance.lang = locale;
      window.speechSynthesis.cancel(); // clear queue
      window.speechSynthesis.speak(speechUtterance);
      onNotify(`Reading aloud in ${languageName}...`, "info");
    } catch (e) {
      onNotify("Voice outputs are un-supported in this sandbox format", "warning");
    }
  };

  const handleClear = () => {
    setSourceText("");
    setTranslatedText("");
    onNotify("Text cleared", "info");
  };

  return (
    <div id="translator-module" className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-[32px] p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
      
      {/* Header Info */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Smart Translator</span>
              <span className="text-[10px] bg-indigo-500/15 border border-indigo-400/20 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-3" /> Gemini Powered
              </span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Instant AI machine translation</p>
          </div>
        </div>
      </div>

      {/* Language Bar Toolbar Selector */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-2.5 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl mb-4 gap-2">
        <div className="flex-1">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            {languages.filter(l => l.code !== targetLang).map((l) => (
              <option key={l.code} value={l.code} className="dark:bg-slate-900">{l.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSwap}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 rounded-xl transition cursor-pointer"
          title="Swap Languages"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        <div className="flex-1 text-right">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 text-right focus:outline-none cursor-pointer"
          >
            {languages.filter(l => l.code !== "auto" && l.code !== sourceLang).map((l) => (
              <option key={l.code} value={l.code} className="dark:bg-slate-900">{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Translation Panels Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Source Content Side card */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 flex flex-col justify-between min-h-[210px] relative">
          <div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Type or paste text to begin translating instantly..."
              rows={5}
              className="w-full bg-transparent border-none text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200/20 dark:border-slate-800/20 mt-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleVoiceInput}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isListening 
                    ? "bg-rose-500/20 text-rose-500 animate-pulse" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                }`}
                title={isListening ? "Stop Voice Input" : "Voice Input (Speak)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {sourceText && (
                <button
                  onClick={() => handleSpeak(sourceText, sourceLang === "auto" ? "English" : sourceLang)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
                  title="Listen Source Text"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}

              {sourceText && (
                <button
                  onClick={handleClear}
                  className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-450 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition cursor-pointer"
                  title="Clear original content"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {sourceText.length}/2000 chars
            </span>
          </div>
        </div>

        {/* Translation Content Target card */}
        <div className="bg-indigo-500/5 dark:bg-indigo-950/10 border border-indigo-400/10 dark:border-indigo-500/10 rounded-2xl p-4 flex flex-col justify-between min-h-[210px] relative">
          <div>
            <div className="w-full text-slate-850 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap min-h-[110px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-indigo-500 dark:text-indigo-400">
                  <RotateCw className="w-7 h-7 animate-spin mb-2" />
                  <span className="text-xs font-semibold tracking-wider animate-pulse">Consulting Gemini translator...</span>
                </div>
              ) : translatedText ? (
                translatedText
              ) : (
                <span className="text-slate-400/70 italic text-xs">Translation output displays here in real-time...</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-indigo-400/10 dark:border-indigo-500/10 mt-3">
            <div className="flex gap-2">
              {translatedText && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <button
                    onClick={() => handleSpeak(translatedText, targetLang)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-indigo-950/20 text-slate-450 hover:text-indigo-550 dark:hover:text-indigo-400 rounded-lg transition cursor-pointer"
                    title="Speak Translation out loud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">
              <span>Target: {targetLang}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
