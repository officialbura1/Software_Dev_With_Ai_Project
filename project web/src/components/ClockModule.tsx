import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Flag, 
  Timer, 
  Globe, 
  Volume2, 
  VolumeX,
  Bell, 
  Plus, 
  Trash2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WorldClockZone } from "../types";

interface ClockModuleProps {
  onNotify: (msg: string, type: "success" | "info" | "warning") => void;
}

export default function ClockModule({ onNotify }: ClockModuleProps) {
  // --- REAL-TIME CLOCK ---
  const [time, setTime] = useState<Date>(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- STOPWATCH ---
  const [swActive, setSwActive] = useState(false);
  const [swTime, setSwTime] = useState(0); // in millseconds
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const swRef = useRef<NodeJS.Timeout | null>(null);

  const startStopwatch = () => {
    if (swActive) {
      if (swRef.current) clearInterval(swRef.current);
      setSwActive(false);
    } else {
      setSwActive(true);
      const startTime = Date.now() - swTime;
      swRef.current = setInterval(() => {
        setSwTime(Date.now() - startTime);
      }, 10);
    }
  };

  const resetStopwatch = () => {
    if (swRef.current) clearInterval(swRef.current);
    setSwActive(false);
    setSwTime(0);
    setSwLaps([]);
  };

  const recordLap = () => {
    setSwLaps([swTime, ...swLaps]);
    onNotify(`Lap recorded: ${formatStopwatchTime(swTime)}`, "info");
  };

  const formatStopwatchTime = (ms: number): string => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const centi = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(centi).padStart(2, "0")}`;
  };

  // --- TIMER (COUNTDOWN) ---
  const [timerDuration, setTimerDuration] = useState(60); // custom text/slider input in seconds
  const [timerLeft, setTimerLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!timerActive && !timerRef.current) {
      setTimerLeft(timerDuration);
    }
  }, [timerDuration, timerActive]);

  const startTimer = () => {
    if (timerActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerActive(false);
    } else {
      if (timerLeft <= 0) {
        setTimerLeft(timerDuration);
      }
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            triggerTimerDone();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setTimerLeft(timerDuration);
  };

  const triggerTimerDone = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    onNotify("⏳ Countdown Timer finished!", "warning");
    
    // Play HTML5 beep sound
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.value = 880; // A5 pitch
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.8);
      } catch (err) {
        console.warn("Failed play audio beep", err);
      }
    }
  };

  const formatTimerTime = (s: number): string => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleTimerChange = (valStr: string) => {
    const parsed = parseInt(valStr) || 0;
    setTimerDuration(parsed);
  };

  // --- WORLD CLOCK ---
  const [worldZones, setWorldZones] = useState<WorldClockZone[]>([
    { id: "utc", name: "UTC", tz: "UTC", icon: "🌐" },
    { id: "ny", name: "New York", tz: "America/New_York", icon: "🗽" },
    { id: "ldn", name: "London", tz: "Europe/London", icon: "👑" },
    { id: "dxb", name: "Dubai", tz: "Asia/Dubai", icon: "🐫" },
    { id: "tokio", name: "Tokyo", tz: "Asia/Tokyo", icon: "🍣" },
    { id: "delhi", name: "Delhi", tz: "Asia/Kolkata", icon: "🛕" }
  ]);

  const getWorldTimeStr = (tz: string): string => {
    try {
      return time.toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    } catch (e) {
      return "--:--:--";
    }
  };

  const getWorldDateStr = (tz: string): string => {
    try {
      return time.toLocaleDateString("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return "---";
    }
  };

  return (
    <div id="clock-module" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      
      {/* SECTION 1: MAIN CLOCK + WORLD CLOCK */}
      <div className="flex flex-col gap-6">
        {/* Digital Clock Banner Card */}
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-[32px] p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                Local Time System
              </span>
            </div>
            <div className="text-[11px] font-mono select-none px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
              UTC {time.getTimezoneOffset() < 0 ? "+" : ""}{Math.round(-time.getTimezoneOffset() / 60)}h
            </div>
          </div>

          <div className="my-6">
            <h2 id="main-digital-clock-time" className="text-6xl font-light tracking-tighter text-slate-800 dark:text-white font-mono flex items-baseline">
              <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              <span className="text-2xl font-normal opacity-50 ml-1.5">{time.toLocaleTimeString([], { second: '2-digit' })}</span>
            </h2>
            <p id="main-digital-clock-date" className="text-base text-slate-500 dark:text-slate-350 mt-1 font-semibold flex items-center gap-1.5">
              <span>{time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800/40 text-xs text-slate-400 flex items-center justify-between">
            <span>Clock syncing secure</span>
            <span>100% Precision</span>
          </div>
        </div>

        {/* World Timezones Grid list */}
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-[32px] p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg flex-1">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/40 dark:border-slate-800/40">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">World Clock</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Live Hubs</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {worldZones.map((zone) => (
              <div 
                key={zone.id} 
                className="p-3 bg-slate-50/40 dark:bg-slate-900/20 border border-slate-200/30 dark:border-slate-800/30 rounded-2xl flex flex-col justify-between hover:border-indigo-400/20 transition-all duration-200 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-sm shrink-0">{zone.icon}</span>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">
                    {zone.name}
                  </p>
                </div>
                <div className="my-2.5">
                  <p className="text-lg font-semibold text-slate-850 dark:text-white font-mono tracking-tight">
                    {getWorldTimeStr(zone.tz)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-550 truncate font-medium">
                    {getWorldDateStr(zone.tz)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: STOPWATCH + COUNTDOWN TIMER */}
      <div className="flex flex-col gap-6">
        
        {/* Stopwatch Component */}
        <div id="stopwatch-card" className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-[32px] p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Stopwatch Counter</h3>
            </div>
          </div>

          <div className="text-center py-6">
            <h3 id="stopwatch-display-time" className="text-5xl font-mono font-bold tracking-tight text-slate-800 dark:text-white my-3 select-none">
              {formatStopwatchTime(swTime)}
            </h3>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={startStopwatch}
                id="stopwatch-start-btn"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                  swActive 
                    ? "bg-amber-150 hover:bg-amber-200/80 text-amber-600 border border-amber-300"
                    : "bg-indigo-500 hover:bg-indigo-650 text-white shadow-md shadow-indigo-500/25"
                }`}
              >
                {swActive ? <Pause className="w-5 h-5 fill-amber-600" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <button
                onClick={recordLap}
                disabled={swTime === 0}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-355 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
                title="Lap Record"
              >
                <Flag className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={resetStopwatch}
                disabled={swTime === 0}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 text-slate-600 dark:text-slate-355 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Laps List */}
          <div className="mt-2 h-[120px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {swLaps.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs italic">
                  Laps ticker shows here
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {swLaps.map((lap, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-2 bg-slate-50/40 dark:bg-slate-900/10 rounded-xl border border-slate-200/20 dark:border-slate-800/20"
                    >
                      <span className="font-semibold text-slate-400">Lap {swLaps.length - idx}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{formatStopwatchTime(lap)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Countdown Timer Component */}
        <div id="countdown-card" className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-[32px] p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-pink-500" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Countdown Timer</h3>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              title={soundEnabled ? "Mute alert beep" : "Unmute alert beep"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
            </button>
          </div>

          <div className="my-5 text-center">
            {/* Display Countdown Clock */}
            <h3 id="timer-display-remaining" className="text-5xl font-mono font-bold tracking-tight text-slate-800 dark:text-white my-2 select-none">
              {formatTimerTime(timerLeft)}
            </h3>

            {/* Inputs / Preset Duration Selectors */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {[
                { label: "1m", sec: 60 },
                { label: "5m", sec: 300 },
                { label: "10m", sec: 600 },
                { label: "15m", sec: 900 },
                { label: "30m", sec: 1800 }
              ].map((prio) => (
                <button
                  key={prio.label}
                  onClick={() => {
                    setTimerDuration(prio.sec);
                    setTimerLeft(prio.sec);
                    setTimerActive(false);
                    if (timerRef.current) clearInterval(timerRef.current);
                  }}
                  className={`px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    timerDuration === prio.sec ? "font-bold text-pink-500 ring-2 ring-pink-500/30" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {prio.label}
                </button>
              ))}
            </div>

            {/* Manual seconds slider/input */}
            <div className="mt-4 flex items-center justify-center gap-2.5 max-w-xs mx-auto">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Seconds:</label>
              <input
                type="number"
                min="5"
                max="86400"
                value={timerDuration}
                onChange={(e) => handleTimerChange(e.target.value)}
                disabled={timerActive}
                className="w-20 bg-slate-50 dark:bg-slate-800/55 border border-slate-150 dark:border-slate-800 px-2 py-1 text-center font-bold text-xs rounded-lg text-slate-800 dark:text-white"
              />
              <input 
                type="range"
                min="10"
                max="3600"
                step="10"
                value={timerDuration}
                onChange={(e) => handleTimerChange(e.target.value)}
                disabled={timerActive}
                className="flex-1 accent-pink-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={startTimer}
              id="timer-start-btn"
              className={`px-6 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                timerActive
                  ? "bg-amber-100/80 hover:bg-amber-150 text-amber-600 border border-amber-300"
                  : "bg-pink-550 hover:bg-pink-600 text-white shadow-md shadow-pink-500/25 bg-pink-500"
              }`}
            >
              {timerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{timerActive ? "Pause" : "Start"}</span>
            </button>

            <button
              onClick={resetTimer}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 text-slate-600 dark:text-slate-355 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
