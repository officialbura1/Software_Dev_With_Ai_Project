import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Bell, 
  X, 
  Clock, 
  Tag 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarEvent } from "../types";

interface CalendarModuleProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  showAddEventModalDirectly?: boolean;
  onCloseDirectModal?: () => void;
}

export default function CalendarModule({
  events,
  onAddEvent,
  onDeleteEvent,
  onUpdateEvent,
  selectedDateStr,
  onSelectDate,
  showAddEventModalDirectly = false,
  onCloseDirectModal
}: CalendarModuleProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("09:00");
  const [category, setCategory] = useState<CalendarEvent["category"]>("general");
  const [reminder, setReminder] = useState(false);

  useEffect(() => {
    if (showAddEventModalDirectly) {
      openAddModal();
    }
  }, [showAddEventModalDirectly]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper properties
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentDate(new Date(year - 1, month, 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(year + 1, month, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayStr = formatDate(today);
    onSelectDate(todayStr);
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const openAddModal = () => {
    setTitle("");
    setDescription("");
    setTime("09:00");
    setCategory("general");
    setReminder(false);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setTime(event.time);
    setCategory(event.category);
    setReminder(event.reminder);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onCloseDirectModal) {
      onCloseDirectModal();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingEvent) {
      const updated: CalendarEvent = {
        ...editingEvent,
        title,
        description,
        time,
        category,
        reminder,
      };
      onUpdateEvent(updated);
    } else {
      const newEv: CalendarEvent = {
        id: "ev-" + Date.now(),
        title,
        description,
        date: selectedDateStr,
        time,
        category,
        reminder,
      };
      onAddEvent(newEv);
    }

    handleCloseModal();
  };

  // Get days representation
  const calendarDays: { dayNum: number | null; dateStr: string | null }[] = [];
  // Shift day indices so Monday is start or use standard Sunday start (0 = Sunday)
  const emptyCellsCount = firstDayOfMonth;

  for (let i = 0; i < emptyCellsCount; i++) {
    calendarDays.push({ dayNum: null, dateStr: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const padD = String(d).padStart(2, "0");
    const padM = String(month + 1).padStart(2, "0");
    const dateStr = `${year}-${padM}-${padD}`;
    calendarDays.push({ dayNum: d, dateStr });
  }

  const todayStr = formatDate(new Date());

  const getDayEvents = (dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  };

  const getCategoryColor = (cat: CalendarEvent["category"]) => {
    switch (cat) {
      case "work": return "bg-indigo-500 text-indigo-500";
      case "personal": return "bg-emerald-500 text-emerald-500";
      case "health": return "bg-rose-500 text-rose-500";
      case "urgent": return "bg-amber-500 text-amber-500";
      default: return "bg-slate-400 text-slate-400";
    }
  };

  const getCategoryBg = (cat: CalendarEvent["category"]) => {
    switch (cat) {
      case "work": return "bg-indigo-100 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300";
      case "personal": return "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300";
      case "health": return "bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300";
      case "urgent": return "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300";
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const selectedDayEvents = events.filter(e => e.date === selectedDateStr);

  return (
    <div id="calendar-module" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Calendar Grid Controller & View */}
      <div className="lg:col-span-8 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <span>{monthNames[month]}</span>
                <span className="text-slate-400 dark:text-slate-500 text-base">{year}</span>
              </h2>
              <div className="flex gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                <button onClick={handlePrevYear} className="hover:text-indigo-500 cursor-pointer transition">« Yr</button>
                <span>•</span>
                <button onClick={handleNextYear} className="hover:text-indigo-500 cursor-pointer transition">Yr »</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              id="calendar-prev-month"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleJumpToToday}
              id="calendar-jump-today"
              className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs rounded-lg transition shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              id="calendar-next-month"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Grid cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell, index) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDateStr;
            const dayEvents = cell.dateStr ? getDayEvents(cell.dateStr) : [];

            return (
              <div
                key={index}
                onClick={() => cell.dateStr && onSelectDate(cell.dateStr)}
                className={`min-h-[72px] p-1.5 rounded-xl border border-transparent flex flex-col justify-between transition cursor-pointer relative group ${
                  !cell.dayNum 
                    ? "bg-transparent pointer-events-none" 
                    : isSelected
                    ? "bg-indigo-500/15 border-indigo-400/40 dark:border-indigo-400/30"
                    : isToday
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 hover:bg-slate-150 dark:hover:bg-slate-800/50"
                    : "bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/70 dark:hover:bg-slate-800/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  {cell.dayNum && (
                    <span className={`text-xs font-semibold ${
                      isSelected 
                        ? "text-indigo-600 dark:text-indigo-400 font-bold" 
                        : isToday 
                        ? "text-indigo-500" 
                        : "text-slate-700 dark:text-slate-300"
                    }`}>
                      {cell.dayNum}
                    </span>
                  )}
                  {isToday && (
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" title="Today"></span>
                  )}
                </div>

                {/* Event dots/category indicators */}
                <div className="flex flex-wrap gap-1 mt-1 max-h-[22px] overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span 
                      key={ev.id} 
                      className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(ev.category).split(" ")[0]}`}
                      title={ev.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-slate-400 leading-none">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Side Panel */}
      <div className="lg:col-span-4 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/40 dark:border-slate-800/40">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Agenda</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {new Date(selectedDateStr + "T00:00:00").toLocaleDateString(undefined, { 
                  weekday: 'short', month: 'short', day: 'numeric' 
                })}
              </p>
            </div>
            <button
              onClick={openAddModal}
              id="calendar-add-event-btn"
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No events planned</p>
                <button 
                  onClick={openAddModal}
                  className="mt-2 text-xs text-indigo-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            ) : (
              selectedDayEvents.sort((a,b) => a.time.localeCompare(b.time)).map((ev) => (
                <div 
                  key={ev.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between group/item transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${getCategoryBg(ev.category)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm leading-snug break-words">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-xs line-clamp-2 mt-1 opacity-80 leading-relaxed text-slate-600 dark:text-slate-300">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(ev)}
                        className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded text-slate-600 dark:text-slate-300 transition"
                        title="Edit Event"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => onDeleteEvent(ev.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded text-red-600 dark:text-red-400 transition"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-500/10 text-[10px] opacity-75">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3" />
                      {ev.time}
                    </span>
                    {ev.reminder && (
                      <span className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-medium">
                        <Bell className="w-3" />
                        Reminder
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs text-slate-400">
          <span>Categories Color Code:</span>
          <div className="flex gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span>Work</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Pers</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-full"></span>Health</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span>Urgent</span>
          </div>
        </div>
      </div>

      {/* EVENT CREATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g. Performance Review Meeting"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add meeting notes, location, or link..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                      Event Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CalendarEvent["category"])}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="general">💼 General</option>
                      <option value="work">🏢 Work</option>
                      <option value="personal">🏠 Personal</option>
                      <option value="health">❤️ Health</option>
                      <option value="urgent">🚨 Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enable Notification</p>
                      <p className="text-[10px] text-slate-400">Receive alert when event approaches</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={reminder}
                      onChange={(e) => setReminder(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500" />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
