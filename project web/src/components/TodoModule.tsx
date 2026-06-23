import React, { useState } from "react";
import { 
  Check, 
  Trash2, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  Edit3, 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  CheckSquare, 
  Square,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TodoTask } from "../types";

interface TodoModuleProps {
  tasks: TodoTask[];
  onAddTask: (task: TodoTask) => void;
  onUpdateTask: (task: TodoTask) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (tasks: TodoTask[]) => void;
  onNotify: (msg: string, type: "success" | "info" | "warning") => void;
  showAddTaskModalDirectly?: boolean;
  onCloseDirectModal?: () => void;
}

export default function TodoModule({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onNotify,
  showAddTaskModalDirectly = false,
  onCloseDirectModal
}: TodoModuleProps) {
  // Filters & Search
  const [filterType, setFilterType] = useState<"all" | "active" | "completed" | "high">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Editing / Adding State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoTask["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("General");

  React.useEffect(() => {
    if (showAddTaskModalDirectly) {
      openAddForm();
    }
  }, [showAddTaskModalDirectly]);

  const openAddForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate(new Date().toISOString().split("T")[0]);
    setCategory("General");
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const openEditForm = (task: TodoTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setCategory(task.category);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    if (onCloseDirectModal) {
      onCloseDirectModal();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      const updated: TodoTask = {
        ...editingTask,
        title,
        description,
        priority,
        dueDate,
        category,
      };
      onUpdateTask(updated);
      onNotify("Task updated successfully", "success");
    } else {
      const newTask: TodoTask = {
        id: "task-" + Date.now(),
        title,
        description,
        completed: false,
        priority,
        dueDate: dueDate || new Date().toISOString().split("T")[0],
        category: category || "General",
        order: tasks.length,
      };
      onAddTask(newTask);
      onNotify("New task added details", "success");
    }
    handleCloseForm();
  };

  const toggleComplete = (task: TodoTask) => {
    const updated = { ...task, completed: !task.completed };
    onUpdateTask(updated);
    if (updated.completed) {
      onNotify("Task marked as completed!", "success");
    } else {
      onNotify("Task restored to active list", "info");
    }
  };

  // Reordering helpers
  const moveTask = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredTasks.length) return;

    const reordered = [...tasks];
    // Find absolute index in main array
    const itemA = filteredTasks[index];
    const itemB = filteredTasks[targetIndex];
    const absIdxA = tasks.findIndex(t => t.id === itemA.id);
    const absIdxB = tasks.findIndex(t => t.id === itemB.id);

    if (absIdxA !== -1 && absIdxB !== -1) {
      const tempOrder = reordered[absIdxA].order;
      reordered[absIdxA].order = reordered[absIdxB].order;
      reordered[absIdxB].order = tempOrder;
      onReorderTasks(reordered.sort((a, b) => a.order - b.order));
    }
  };

  // Statistics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const activeTasksCount = totalTasks - completedTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter and search computation
  const filteredTasks = tasks
    .filter(task => {
      // Filter Type logic
      if (filterType === "active") return !task.completed;
      if (filterType === "completed") return task.completed;
      if (filterType === "high") return task.priority === "high";
      return true;
    })
    .filter(task => {
      // Search Box match
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query)
      );
    })
    // Sort completed to the bottom, then by order
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return a.order - b.order;
    });

  const getPriorityBadge = (prio: TodoTask["priority"]) => {
    switch (prio) {
      case "high":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "low":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    }
  };

  return (
    <div id="todo-module" className="flex flex-col h-full justify-between gap-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daily Focus Tasks</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Manage, organize, and track items</p>
          </div>
        </div>

        {/* Global Task Search bar */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks or tags..."
            className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      {/* Statistics and Interactive Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Statistics Ring Card */}
        <div className="md:col-span-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Workspace Metrics</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{completedTasks}/{totalTasks}</span>
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {progressPercent}% Done
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{activeTasksCount} tasks remaining to do.</p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/20 dark:border-slate-800/20">
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="md:col-span-8 flex flex-col justify-center">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Tasks", count: totalTasks },
              { id: "active", label: "Active", count: activeTasksCount },
              { id: "completed", label: "Completed", count: completedTasks },
              { id: "high", label: "High Priority", count: tasks.filter(t => t.priority === "high" && !t.completed).length }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer border ${
                  filterType === btn.id
                    ? "bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/20"
                    : "bg-white/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                <span>{btn.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                  filterType === btn.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}

            <button
              onClick={openAddForm}
              id="todo-add-task-btn"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer ml-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="flex-1 min-h-[290px] max-h-[380px] overflow-y-auto pr-1 mt-2">
        <AnimatePresence initial={false}>
          {filteredTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center"
            >
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No tasks match your filter</p>
              <p className="text-xs text-slate-400 max-w-[240px] mt-1">Get started by creating a new task detail card above!</p>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 group transition ${
                    task.completed 
                      ? "bg-slate-100/30 dark:bg-slate-900/10 border-slate-250 dark:border-slate-800/25 opacity-60" 
                      : "bg-white/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 hover:shadow-md hover:border-purple-400/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Completion Check Circle */}
                    <button
                      onClick={() => toggleComplete(task)}
                      className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                        task.completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 dark:border-slate-700 hover:border-purple-400"
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm truncate leading-snug ${
                          task.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-105"
                        }`}>
                          {task.title}
                        </h4>
                        
                        {/* Interactive Reordering buttons */}
                        {!task.completed && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:flex">
                            <button
                              onClick={() => moveTask(index, "up")}
                              disabled={index === 0}
                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-25"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveTask(index, "down")}
                              disabled={index === filteredTasks.length - 1}
                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-25"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {task.description && (
                        <p className={`text-xs mt-0.5 truncate ${
                          task.completed ? "text-slate-405" : "text-slate-400 dark:text-slate-550"
                        }`}>
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>

                        {/* Category Tag */}
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                          📁 {task.category}
                        </span>

                        {/* Due Date Indicator */}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                            <CalendarIcon className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                    <button
                      onClick={() => openEditForm(task)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                      title="Edit Task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* TASK FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForm}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>{editingTask ? "Update Task Details" : "Create New Task"}</span>
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g. Finalize Dashboard UI Kit"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add brief details or notes..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TodoTask["priority"])}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🔴 High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                      Category Label
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Design, Meetings"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Due Date Target
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-purple-500/10 cursor-pointer"
                  >
                    Save Task
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
