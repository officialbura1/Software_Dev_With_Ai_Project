import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Clock as ClockIcon, 
  Languages, 
  Calculator as CalcIcon,
  Search, 
  Plus, 
  Sun, 
  Moon, 
  Laptop, 
  Bell, 
  FileText, 
  X, 
  ChevronRight, 
  Sparkles,
  Command,
  ArrowRight,
  TrendingUp,
  Award,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
import { CalendarEvent, TodoTask, QuickMemo, ToastMessage } from "./types";

// Modules
import CalendarModule from "./components/CalendarModule";
import CalculatorModule from "./components/CalculatorModule";
import TodoModule from "./components/TodoModule";
import ClockModule from "./components/ClockModule";
import TranslatorModule from "./components/TranslatorModule";

export default function App() {
  // --- STATES ---
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [memos, setMemos] = useState<QuickMemo[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");
  
  // Tab/Focus Management ("dashboard" if home, or module name for expanded)
  const [activeModule, setActiveModule] = useState<"dashboard" | "calendar" | "calculator" | "todo" | "clock" | "translator">("dashboard");
  
  // Theme state: "light" | "dark" | "system"
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  // Auxiliary Direct Actions State
  const [openCalendarModal, setOpenCalendarModal] = useState(false);
  const [openTodoModal, setOpenTodoModal] = useState(false);

  // Selected Date for calendar consistency
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Real-time ticking state for dashboard overview clock
  const [time, setTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut instructions or dialog
  const [showShortcuts, setShowShortcuts] = useState(false);

  // New Note content state
  const [newMemoText, setNewMemoText] = useState("");

  // --- PERSISTENCE ---
  useEffect(() => {
    // Load data from LocalStorage
    const storedEvents = localStorage.getItem("zenith_events");
    const storedTasks = localStorage.getItem("zenith_tasks");
    const storedMemos = localStorage.getItem("zenith_memos");
    const storedTheme = localStorage.getItem("zenith_theme");

    if (storedEvents) setEvents(JSON.parse(storedEvents));
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    } else {
      // Seed initial tasks if blank to make the dashboard look active and delightful!
      const initial: TodoTask[] = [
        { id: "task-1", title: "Finalize Zenith Dashboard UI Kit", description: "Fringe layout system adjustments", completed: false, priority: "high", dueDate: new Date().toISOString().split("T")[0], category: "Design", order: 0 },
        { id: "task-2", title: "Review Translation API integration", description: "Ensure server controllers connect", completed: true, priority: "medium", dueDate: new Date().toISOString().split("T")[0], category: "Technical", order: 1 },
        { id: "task-3", title: "Draft upcoming milestones document", description: "Formulate quarterly growth plans", completed: false, priority: "low", dueDate: new Date().toISOString().split("T")[0], category: "Strategy", order: 2 }
      ];
      setTasks(initial);
      localStorage.setItem("zenith_tasks", JSON.stringify(initial));
    }

    if (storedMemos) {
      setMemos(JSON.parse(storedMemos));
    } else {
      // Seed initial note/memo
      const initialMemo: QuickMemo[] = [
        { id: "memo-1", content: "Key idea: Integrate full-stack Web Speech synthesis for the auto-translator so users hear responsive accents perfectly.", updatedAt: new Date().toLocaleDateString() }
      ];
      setMemos(initialMemo);
      localStorage.setItem("zenith_memos", JSON.stringify(initialMemo));
    }

    if (storedTheme) {
      setTheme(storedTheme as any);
    }
  }, []);

  // --- THEME SYNC ---
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(t);
    };

    if (theme === "system") {
      const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(matchMedia.matches ? "dark" : "light");

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };
      matchMedia.addEventListener("change", listener);
      return () => matchMedia.removeEventListener("change", listener);
    } else {
      applyTheme(theme);
    }
    
    localStorage.setItem("zenith_theme", theme);
  }, [theme]);

  // Save changes
  const saveEvents = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    localStorage.setItem("zenith_events", JSON.stringify(newEvents));
  };

  const saveTasks = (newTasks: TodoTask[]) => {
    setTasks(newTasks);
    localStorage.setItem("zenith_tasks", JSON.stringify(newTasks));
  };

  const saveMemos = (newMemos: QuickMemo[]) => {
    setMemos(newMemos);
    localStorage.setItem("zenith_memos", JSON.stringify(newMemos));
  };

  // --- ACTIONS ---
  const addToast = (message: string, type: ToastMessage["type"] = "success") => {
    const id = "toast-" + Date.now();
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Calendar events
  const handleAddEvent = (ev: CalendarEvent) => {
    const updated = [ev, ...events];
    saveEvents(updated);
    addToast(`Event created: "${ev.title}"`, "success");
  };

  const handleDeleteEvent = (id: string) => {
    const ev = events.find(e => e.id === id);
    const updated = events.filter(e => e.id !== id);
    saveEvents(updated);
    addToast(ev ? `Event "${ev.title}" deleted` : "Event deleted", "warning");
  };

  const handleUpdateEvent = (updatedEv: CalendarEvent) => {
    const updated = events.map(e => e.id === updatedEv.id ? updatedEv : e);
    saveEvents(updated);
    addToast("Event updated", "info");
  };

  // Tasks
  const handleAddTask = (task: TodoTask) => {
    const updated = [task, ...tasks];
    saveTasks(updated);
    addToast(`Task added: "${task.title}"`, "success");
  };

  const handleUpdateTask = (updatedTask: TodoTask) => {
    const updated = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    saveTasks(updated);
    // Completion metrics check in Toast handled inside TodoModule
  };

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    addToast(task ? `Task "${task.title}" deleted` : "Task deleted", "warning");
  };

  const handleReorderTasks = (reordered: TodoTask[]) => {
    saveTasks(reordered);
  };

  // Notes/Memos
  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoText.trim()) return;

    const newMemo: QuickMemo = {
      id: "memo-" + Date.now(),
      content: newMemoText.toUpperCase() === "CLEAR" ? "" : newMemoText,
      updatedAt: new Date().toLocaleDateString()
    };
    const updated = [newMemo, ...memos];
    saveMemos(updated);
    setNewMemoText("");
    addToast("Quick memo saved!", "success");
  };

  const handleDeleteMemo = (id: string) => {
    const updated = memos.filter(m => m.id !== id);
    saveMemos(updated);
    addToast("Memo record deleted", "warning");
  };

  // Global Search filter across Events, Tasks, and Notes
  const searchMatchCount = globalSearch.trim() === "" ? 0 : 
    tasks.filter(t => t.title.toLowerCase().includes(globalSearch.toLowerCase()) || t.description.toLowerCase().includes(globalSearch.toLowerCase())).length +
    events.filter(e => e.title.toLowerCase().includes(globalSearch.toLowerCase()) || e.description.toLowerCase().includes(globalSearch.toLowerCase())).length +
    memos.filter(m => m.content.toLowerCase().includes(globalSearch.toLowerCase())).length;

  const searchedTasks = tasks.filter(t => t.title.toLowerCase().includes(globalSearch.toLowerCase()) || t.description.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5);
  const searchedEvents = events.filter(e => e.title.toLowerCase().includes(globalSearch.toLowerCase()) || e.description.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5);
  const searchedMemos = memos.filter(m => m.content.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5);

  // Keyboard Shortcuts trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // alt/option key bindings
      if (e.altKey) {
        if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          setActiveModule("todo");
          setOpenTodoModal(true);
        } else if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          setActiveModule("calendar");
          setOpenCalendarModal(true);
        } else if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          setActiveModule("calculator");
        } else if (e.key === "w" || e.key === "W") {
          e.preventDefault();
          setActiveModule("clock");
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          setActiveModule("todo");
        } else if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          setActiveModule("dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync tasks metadata statistics
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  
  // Calculate upcoming events in next 7 days
  const upcomingEventsCount = events.filter(ev => {
    try {
      const evDate = new Date(ev.date + "T00:00:00");
      const diffTime = evDate.getTime() - new Date().setHours(0,0,0,0);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    } catch (e) {
      return false;
    }
  }).length;

  const nextUpcomingEvent = events
    .filter(ev => new Date(ev.date + "T" + ev.time).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date + "T" + a.time).getTime() - new Date(b.date + "T" + b.time).getTime())[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4f46e5] via-[#d946ef] to-[#f43f5e] text-white selection:bg-white/20 relative overflow-x-hidden font-sans pb-12 transition-all duration-700">
      
      {/* Background glass blur floating indicators */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-6">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 px-2">
          {/* Logo Brand info */}
          <div className="flex items-center gap-3.5 mr-auto cursor-pointer" onClick={() => setActiveModule("dashboard")}>
            <div className="w-11 h-11 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/25 shadow-lg shadow-purple-500/10 hover:scale-105 transition-all duration-300">
              <Sparkles className="w-5.5 h-5.5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-white drop-shadow-sm select-none">
                Zenith Workspace
              </h1>
              <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                The Premium Productivity Lounge
              </p>
            </div>
          </div>

          {/* Global Search Panel */}
          <div className="w-full md:max-w-md relative flex-1 mx-2">
            <div className="relative">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global Search (tasks, events, memos)..."
                className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-full py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all outline-none"
              />
              <Search className="w-4 h-4 absolute left-4 top-3 text-white/50" />
              {globalSearch && (
                <button 
                  onClick={() => setGlobalSearch("")} 
                  className="absolute right-4 top-3 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Global Search Autocomplete Results Overlay */}
            <AnimatePresence>
              {globalSearch.trim() !== "" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl p-4 z-50 text-left max-h-[360px] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-purple-400">
                      Search Results ({searchMatchCount} items)
                    </span>
                    <button 
                      onClick={() => setGlobalSearch("")}
                      className="text-[10px] text-white/50 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>

                  {searchMatchCount === 0 ? (
                    <p className="text-center py-6 text-xs text-white/50 italic">No corresponding tasks, events, or memos found.</p>
                  ) : (
                    <div className="space-y-4 text-xs">
                      {/* Tasks result */}
                      {searchedTasks.length > 0 && (
                        <div>
                          <h4 className="font-bold text-[10px] text-purple-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <CheckSquare className="w-3" /> To-Do Tasks
                          </h4>
                          <div className="space-y-1">
                            {searchedTasks.map(t => (
                              <div 
                                key={t.id} 
                                onClick={() => { setActiveModule("todo"); setGlobalSearch(""); }}
                                className="p-2 hover:bg-white/10 rounded-xl cursor-pointer transition flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-semibold">{t.title}</p>
                                  <p className="text-[10px] opacity-60 leading-normal">{t.description || "No descriptions available"}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${t.completed ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/20 text-purple-300"}`}>
                                  {t.completed ? "Done" : t.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Events result */}
                      {searchedEvents.length > 0 && (
                        <div>
                          <h4 className="font-bold text-[10px] text-indigo-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <CalendarIcon className="w-3" /> Calendar Events
                          </h4>
                          <div className="space-y-1">
                            {searchedEvents.map(e => (
                              <div 
                                key={e.id} 
                                onClick={() => { setActiveModule("calendar"); setSelectedCalendarDate(e.date); setGlobalSearch(""); }}
                                className="p-2 hover:bg-white/10 rounded-xl cursor-pointer transition flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-semibold">{e.title}</p>
                                  <p className="text-[10px] opacity-60 leading-normal">{e.date} @ {e.time}</p>
                                </div>
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/10 px-1.5 py-0.5 rounded">
                                  {e.category}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Memos result */}
                      {searchedMemos.length > 0 && (
                        <div>
                          <h4 className="font-bold text-[10px] text-pink-300 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <FileText className="w-3" /> Quick Notes
                          </h4>
                          <div className="space-y-1">
                            {searchedMemos.map(m => (
                              <div 
                                key={m.id} 
                                className="p-2 bg-white/5 rounded-xl flex justify-between items-center"
                              >
                                <p className="truncate pr-4 leading-normal font-semibold">{m.content}</p>
                                <span className="text-[8px] opacity-40 shrink-0 font-mono">{m.updatedAt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Controls Panel (Theme + Dialog trigger) */}
          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1.5 flex items-center gap-1 shadow-inner">
              {[
                { id: "light", icon: Sun, label: "Light" },
                { id: "dark", icon: Moon, label: "Dark" },
                { id: "system", icon: Laptop, label: "Auto" }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTheme(item.id as any);
                      addToast(`Theme adjusted to ${item.label}`, "info");
                    }}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      isSelected 
                        ? "bg-white text-indigo-600 shadow-md shadow-white/5" 
                        : "text-white/60 hover:text-white"
                    }`}
                    title={`${item.label} Mode`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Shortcut Dialog info button */}
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="w-9 h-9 bg-white/10 backdrop-blur-md hover:bg-white/15 border border-white/20 rounded-full flex items-center justify-center transition cursor-pointer text-white/85"
              title="Keyboard Shortcuts"
            >
              <Command className="w-4 h-4" />
            </button>

            {/* Profile Avatar mockup */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">Alex Rivera</p>
                <span className="text-[9px] opacity-70 tracking-widest font-semibold uppercase">Zenith Guest</span>
              </div>
              <div 
                className="w-10 h-10 rounded-full border-2 border-white/30 bg-cover bg-center shadow-lg shadow-purple-500/10 cursor-pointer hover:border-white transition"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80')" }}
                title="Guest profile info"
              />
            </div>
          </div>
        </header>

        {/* --- MAIN DASHBOARD BOARD GRID --- */}
        <AnimatePresence mode="wait">
          {activeModule === "dashboard" ? (
            
            /* MULTI-MODULE HOMEPAGE CONTROLLERS (GRID) */
            <motion.div
              key="main-grid"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              
              {/* LEFT COLUMN: MODULE TICKERS (GRID FOCUS PLACEMENT) */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. CLOCK MODULE CARD */}
                <div 
                  onClick={() => setActiveModule("clock")}
                  className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 flex flex-col justify-between shadow-xl shadow-indigo-550/10 cursor-pointer hover:scale-[1.012] hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.99] transition-all duration-300 md:col-span-2 relative group overflow-hidden"
                >
                  <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                      <ClockIcon className="w-3" /> Digital Clock / Live System
                    </span>
                    <span className="text-[10px] text-white/70 flex items-center gap-1">
                      Expand Panel <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="my-3">
                    <h2 className="text-5xl font-mono font-light tracking-tighter">
                      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      <span className="text-xl font-normal opacity-65 ml-1">{time.toLocaleTimeString([], { second: '2-digit' })}</span>
                    </h2>
                    <p className="text-sm opacity-80 mt-1 font-semibold italic">
                      {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 mt-4 text-xs font-mono">
                    <div className="text-left">
                      <p className="text-[9px] opacity-60 uppercase tracking-widest leading-none mb-1">London</p>
                      <p className="font-semibold">{time.toLocaleTimeString([], { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                    </div>
                    <div className="text-center border-x border-white/10">
                      <p className="text-[9px] opacity-60 uppercase tracking-widest leading-none mb-1">Tokyo</p>
                      <p className="font-semibold">{time.toLocaleTimeString([], { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] opacity-60 uppercase tracking-widest leading-none mb-1">Dubai</p>
                      <p className="font-semibold">{time.toLocaleTimeString([], { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                    </div>
                  </div>
                </div>

                {/* 2. CALENDAR CARD */}
                <div 
                  onClick={() => setActiveModule("calendar")}
                  className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 flex flex-col justify-between shadow-xl shadow-pink-500/10 cursor-pointer hover:scale-[1.012] hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.99] transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/25 transition-all pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                      <CalendarIcon className="w-3" /> Monthly Calendar
                    </span>
                    <span className="text-[10px] text-white/70 flex items-center gap-1">
                      Focus <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Active Calendar</h3>
                    <p className="text-xs opacity-75 mt-0.5">{events.length} saved meetings / reminders</p>
                  </div>

                  <div className="mt-5 space-y-1.5 text-xs text-left">
                    {events.slice(0, 2).map((ev) => (
                      <div key={ev.id} className="p-2 bg-white/10 rounded-xl flex items-center gap-2 border border-white/5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          ev.category === "work" ? "bg-indigo-400" : ev.category === "health" ? "bg-rose-400" : "bg-emerald-400"
                        }`} />
                        <div className="truncate flex-1">
                          <p className="font-bold truncate">{ev.title}</p>
                          <p className="text-[9px] opacity-65">{ev.date} @ {ev.time}</p>
                        </div>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <div className="py-2.5 text-center text-white/50 italic text-xs">No upcoming events planned today</div>
                    )}
                  </div>
                </div>

                {/* 3. TODO FOCUS CARD */}
                <div 
                  onClick={() => setActiveModule("todo")}
                  className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 flex flex-col justify-between shadow-xl shadow-purple-500/10 cursor-pointer hover:scale-[1.012] hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.99] transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/25 transition-all pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                      <CheckSquare className="w-3" /> Daily To-Do tasks
                    </span>
                    <span className="text-[10px] text-white/70 flex items-center gap-1">
                      Focus <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{completedTasksCount}/{totalTasksCount} Complete</h3>
                    <p className="text-xs opacity-75 mt-0.5">Tasks metric overview sync</p>
                  </div>

                  <div className="mt-5">
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-[0_0_8px_white]"
                        style={{ width: `${totalTasksCount > 0 ? (completedTasksCount / totalTasksCount)*100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] opacity-70">
                      <span>{pendingTasksCount} remaining to resolve</span>
                      <span>{totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount)*100) : 0}% Progress</span>
                    </div>
                  </div>
                </div>

                {/* 4. TRANSLATOR CARD */}
                <div 
                  onClick={() => setActiveModule("translator")}
                  className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 flex flex-col justify-between shadow-xl shadow-blue-500/10 cursor-pointer hover:scale-[1.012] hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.99] transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/25 transition-all pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                      <Languages className="w-3" /> Gemini Translator
                    </span>
                    <span className="text-[10px] text-white/70 flex items-center gap-1">
                      Translate <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Smart Language AI</h3>
                    <p className="text-xs opacity-75 mt-0.5">Real-time translator machine config</p>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg font-bold">English</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="text-xs px-2.5 py-1 bg-indigo-505/20 bg-indigo-600/30 border border-white/15 rounded-lg font-bold">FR / ES / DE</span>
                  </div>
                </div>

                {/* 5. CALCULATOR CARD */}
                <div 
                  onClick={() => setActiveModule("calculator")}
                  className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 flex flex-col justify-between shadow-xl shadow-orange-500/10 cursor-pointer hover:scale-[1.012] hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.99] transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-orange-500/10 rounded-full blur-xl group-hover:bg-orange-500/25 transition-all pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                      <CalcIcon className="w-3" /> Office Calculator
                    </span>
                    <span className="text-[10px] text-white/70 flex items-center gap-1">
                      Open Keypad <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">O.S. Calculations</h3>
                    <p className="text-xs opacity-75 mt-0.5">Basic operators & advanced memory</p>
                  </div>

                  <div className="mt-4 flex gap-1 bg-white/10 border border-white/5 rounded-xl p-2 justify-center max-w-[200px]">
                    {["C","±","%","÷"].map((btn) => (
                      <span key={btn} className="w-8 h-6 flex items-center justify-center font-bold text-xs select-none">{btn}</span>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: QUICK ACTIONS + ANALYTICS PANEL + NOTEPAD (STICKY MEMOS) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* A. QUICK SHORTCUT ACTIONS */}
                <div className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 shadow-xl relative group">
                  <h3 className="font-bold text-sm tracking-wide uppercase mb-4 text-white/75 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-pink-400" />
                    <span>Quick Shortcuts</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <button
                      onClick={() => {
                        setActiveModule("calendar");
                        setOpenCalendarModal(true);
                        addToast("Quick Shortcut: Starting event creation", "info");
                      }}
                      className="p-3 bg-white/10 hover:bg-white/25 border border-white/10 rounded-2xl transition hover:-translate-y-0.5 active:translate-y-0 text-left flex flex-col gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-300" />
                      <span className="font-bold">New Event</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveModule("todo");
                        setOpenTodoModal(true);
                        addToast("Quick Shortcut: Opening task form", "info");
                      }}
                      className="p-3 bg-white/10 hover:bg-white/25 border border-white/10 rounded-2xl transition hover:-translate-y-0.5 active:translate-y-0 text-left flex flex-col gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-purple-350 text-purple-300" />
                      <span className="font-bold">Add Task</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveModule("calculator");
                        addToast("Quick Shortcut: Opened keypad", "info");
                      }}
                      className="p-3 bg-white/10 hover:bg-white/25 border border-white/10 rounded-2xl transition hover:-translate-y-0.5 active:translate-y-0 text-left flex flex-col gap-1 cursor-pointer"
                    >
                      <CalcIcon className="w-4 h-4 text-orange-355 text-orange-300" />
                      <span className="font-bold">Calculator</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveModule("clock");
                        addToast("Quick Shortcut: Selected Timer clock", "info");
                      }}
                      className="p-3 bg-white/10 hover:bg-white/25 border border-white/10 rounded-2xl transition hover:-translate-y-0.5 active:translate-y-0 text-left flex flex-col gap-1 cursor-pointer"
                    >
                      <ClockIcon className="w-4 h-4 text-pink-300" />
                      <span className="font-bold">Start Timer</span>
                    </button>
                  </div>
                </div>

                {/* B. ANALYTICS & STATS SUMMARY */}
                <div className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 shadow-xl text-left">
                  <h3 className="font-bold text-sm tracking-wide uppercase mb-4 text-white/75 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Productivity Performance</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/20 rounded-xl leading-none text-emerald-300 font-bold text-sm">
                          {completedTasksCount}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase opacity-60 tracking-wider">Total Tasks Done</p>
                          <p className="font-bold text-sm">Tasks complete</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Award className="w-3" /> Sync OK
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-pink-500/20 rounded-xl leading-none text-pink-300 font-bold text-sm">
                          {upcomingEventsCount}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase opacity-60 tracking-wider">Events This Week</p>
                          <p className="font-bold text-sm">Upcoming scheduled</p>
                        </div>
                      </div>
                    </div>

                    {nextUpcomingEvent && (
                      <div className="p-3.5 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl text-[11px]">
                        <p className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold mb-1">⏰ Next Priority Event</p>
                        <p className="font-bold text-slate-102 text-white">{nextUpcomingEvent.title}</p>
                        <p className="opacity-75 mt-0.5 font-mono">{nextUpcomingEvent.date} @ {nextUpcomingEvent.time}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* C. QUICK STICKY NOTEPAD / NOTES */}
                <div className="bg-white/15 backdrop-blur-2xl rounded-[32px] border border-white/20 p-6 shadow-xl flex-1 text-left flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm tracking-wide uppercase mb-3 text-white/75 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span>Workspace Sticky Notepad</span>
                    </h3>

                    <form onSubmit={handleAddMemo} className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={newMemoText}
                          onChange={(e) => setNewMemoText(e.target.value)}
                          placeholder="Type quick thoughts/links..."
                          className="w-full bg-slate-950/20 focus:bg-slate-950/30 border border-white/10 focus:border-purple-400 rounded-xl py-2 pl-3 pr-10 text-xs text-white placeholder-white/40 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="absolute right-1.5 top-1.5 p-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
                          title="Save note"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {memos.map((memo) => (
                        <div 
                          key={memo.id}
                          className="p-3 bg-white/5 border border-white/10 hover:border-purple-400/20 rounded-xl transition flex flex-col justify-between relative group/note"
                        >
                          <p className="text-xs leading-relaxed text-slate-104 pr-4">{memo.content}</p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                            <span className="text-[8px] font-mono opacity-50">{memo.updatedAt}</span>
                            <button
                              onClick={() => handleDeleteMemo(memo.id)}
                              className="opacity-0 group-hover/note:opacity-100 transition-opacity p-0.5 hover:text-red-400 text-white/40"
                              title="Delete note"
                            >
                              <X className="w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {memos.length === 0 && (
                        <p className="text-center py-6 text-xs text-white/40 italic">Note board empty</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[10px] text-white/50 text-right font-mono">
                    Type 'clear' to save custom logs
                  </div>
                </div>

              </div>

            </motion.div>
          ) : (
            
            /* ACTIVE EXPANDED FOCUSED MODULE PANEL */
            <motion.div
              key="active-focus"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full bg-white/10 backdrop-blur-2xl rounded-[36px] border border-white/20 p-6 md:p-8 shadow-2xl relative"
            >
              {/* Back to Home layout control header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <button
                  onClick={() => {
                    setActiveModule("dashboard");
                    setOpenCalendarModal(false);
                    setOpenTodoModal(false);
                  }}
                  id="expanded-view-back-home"
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/25 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer leading-none"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>Dashboard Overview</span>
                </button>

                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-1 rounded-xl text-xs font-semibold capitalize select-none text-white/90">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                  Focus Mode: {activeModule} module
                </div>
              </div>

              {/* Lazy Switch Panel implementation */}
              <div className="min-h-[460px]">
                {activeModule === "calendar" && (
                  <CalendarModule
                    events={events}
                    onAddEvent={handleAddEvent}
                    onDeleteEvent={handleDeleteEvent}
                    onUpdateEvent={handleUpdateEvent}
                    selectedDateStr={selectedCalendarDate}
                    onSelectDate={setSelectedCalendarDate}
                    showAddEventModalDirectly={openCalendarModal}
                    onCloseDirectModal={() => setOpenCalendarModal(false)}
                  />
                )}

                {activeModule === "calculator" && (
                  <CalculatorModule onNotify={addToast} />
                )}

                {activeModule === "todo" && (
                  <TodoModule
                    tasks={tasks}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onReorderTasks={handleReorderTasks}
                    onNotify={addToast}
                    showAddTaskModalDirectly={openTodoModal}
                    onCloseDirectModal={() => setOpenTodoModal(false)}
                  />
                )}

                {activeModule === "clock" && (
                  <ClockModule onNotify={addToast} />
                )}

                {activeModule === "translator" && (
                  <TranslatorModule onNotify={addToast} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- BOTTOM ZENITH FOOTER STATS BAR --- */}
        <footer className="mt-8 bg-white/10 backdrop-blur-xl rounded-[28px] border border-white/20 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center justify-around text-center">
          <div className="flex items-center justify-center gap-4 py-1">
            <div className="p-2.5 bg-green-400/20 rounded-xl leading-none">
              <CheckSquare className="w-5 h-5 text-green-300" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Workspace Tasks Done</p>
              <p className="text-xl font-extrabold flex items-baseline gap-1.5">
                {completedTasksCount}
                <span className="text-[10px] text-green-300 font-bold font-mono">
                  +{totalTasksCount > 0 ? Math.round((completedTasksCount/totalTasksCount)*100) : 0}% Complete
                </span>
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-white/10 mx-auto"></div>

          <div className="flex items-center justify-center gap-4 py-1">
            <div className="p-2.5 bg-purple-400/20 rounded-xl leading-none">
              <ClockIcon className="w-5 h-5 text-purple-300" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Current System Date</p>
              <p className="text-lg font-bold font-mono">
                {time.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase()}
                <span className="text-xs opacity-65 font-normal select-none lowercase leading-none ml-1.5">
                  ({time.toLocaleDateString(undefined, { weekday: 'short' })})
                </span>
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-white/10 mx-auto"></div>

          <div className="flex items-center justify-center gap-4 py-1">
            <div className="p-2.5 bg-blue-400/20 rounded-xl leading-none">
              <CalendarIcon className="w-5 h-5 text-blue-300" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Upcoming Scheduled</p>
              <p className="text-xl font-extrabold">
                {upcomingEventsCount} <span className="text-[10px] text-blue-300 font-bold font-mono">Next 7 days</span>
              </p>
            </div>
          </div>
        </footer>

      </div>

      {/* --- TOAST NOTIFICATIONS ALERTS STACK --- */}
      <div id="toasts-alert-container" className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 25, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-2xl pointer-events-auto flex items-start gap-2.5 ${
                t.type === "success" 
                  ? "bg-slate-900/90 dark:bg-emerald-950/80 border-emerald-500/30 text-white" 
                  : t.type === "warning"
                  ? "bg-slate-900/90 dark:bg-rose-950/80 border-rose-500/30 text-white"
                  : "bg-slate-900/90 border-white/20 text-white"
              }`}
            >
              <div className="mt-0.5">
                {t.type === "success" ? (
                  <span className="text-emerald-400">✔️</span>
                ) : t.type === "warning" ? (
                  <span className="text-rose-455 text-rose-400">⏳</span>
                ) : (
                  <span className="text-indigo-400">ℹ️</span>
                )}
              </div>
              <div className="flex-1 text-xs">
                <p className="font-semibold">{t.message}</p>
              </div>
              <button 
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- KEYBOARD SHORTCUTS DISCLOSURE MODAL --- */}
      <AnimatePresence>
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcuts(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950/95 border border-white/15 max-w-md w-full rounded-3xl p-6 relative z-10 text-left text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-4">
                <h3 className="font-black text-sm tracking-wide uppercase text-purple-400 flex items-center gap-1.5 select-none">
                  <Command className="w-4 h-4 animate-spin-slow" /> Keyboard Action Shortcuts
                </h3>
                <button 
                  onClick={() => setShowShortcuts(false)} 
                  className="p-1 hover:bg-white/10 rounded cursor-pointer text-white/50"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {[
                  { keys: ["Alt", "H"], action: "Return to Dashboard Home" },
                  { keys: ["Alt", "T"], action: "Expand To-Do List & create new task" },
                  { keys: ["Alt", "E"], action: "Expand Monthly Calendar & add event" },
                  { keys: ["Alt", "C"], action: "Expand Calculator modal" },
                  { keys: ["Alt", "W"], action: "Expand Clock dashboard (Stopwatch / Timer)" },
                  { keys: ["Alt", "S"], action: "Focus To-Do List list panel" }
                ].map((sh, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-white/80 leading-normal">{sh.action}</span>
                    <div className="flex gap-1">
                      {sh.keys.map((k) => (
                        <kbd key={k} className="px-2 py-0.5 bg-white/10 text-white font-bold rounded shadow border border-white/10 font-mono text-[10px]">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[9px] text-white/50 bg-white/5 p-2 rounded-xl text-center">
                Press these optional global shortcuts to navigate Zenith fluidly from any tab!
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
