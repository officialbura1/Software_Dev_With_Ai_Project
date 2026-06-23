export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  category: "work" | "personal" | "health" | "urgent" | "general";
  reminder: boolean;
}

export interface TodoTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate: string; // YYYY-MM-DD format
  category: string; // e.g. "Work", "Personal", "Shopping", "Health"
  order: number;
}

export interface QuickMemo {
  id: string;
  content: string;
  updatedAt: string;
}

export interface CalculatorHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export interface WorldClockZone {
  id: string;
  name: string;
  tz: string;
  icon: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}
