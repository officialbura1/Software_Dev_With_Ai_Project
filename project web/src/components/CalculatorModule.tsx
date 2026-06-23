import React, { useState, useEffect, useRef } from "react";
import { Copy, History, Trash2, Delete, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalculatorHistoryItem } from "../types";

interface CalculatorModuleProps {
  onNotify: (msg: string, type: "success" | "info") => void;
}

export default function CalculatorModule({ onNotify }: CalculatorModuleProps) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [history, setHistory] = useState<CalculatorHistoryItem[]>([]);
  const [memory, setMemory] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load History & Memory
  useEffect(() => {
    const savedHistory = localStorage.getItem("calc_history");
    const savedMemory = localStorage.getItem("calc_memory");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedMemory) setMemory(parseFloat(savedMemory) || 0);
  }, []);

  const saveHistory = (newHistory: CalculatorHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("calc_history", JSON.stringify(newHistory));
  };

  const handleKeyPress = (char: string) => {
    if (display === "Error" || display === "Infinity") {
      if (char === "C" || char === "AC") {
        setDisplay("0");
        setEquation("");
      }
      return;
    }

    if (char === "AC") {
      setDisplay("0");
      setEquation("");
    } else if (char === "C") {
      if (display.length <= 1) {
        setDisplay("0");
      } else {
        setDisplay(display.slice(0, -1));
      }
    } else if (char === "=") {
      evaluateResult();
    } else if (char === "%") {
      try {
        const val = parseFloat(display);
        if (!isNaN(val)) {
          const res = (val / 100).toString();
          setDisplay(res);
          setEquation(res);
        }
      } catch (e) {
        setDisplay("Error");
      }
    } else if (char === "1/x") {
      try {
        const val = parseFloat(display);
        if (val === 0) {
          setDisplay("Error");
        } else if (!isNaN(val)) {
          const res = (1 / val).toString();
          setDisplay(res);
          setEquation(res);
        }
      } catch (e) {
        setDisplay("Error");
      }
    } else if (char === "√") {
      try {
        const val = parseFloat(display);
        if (val < 0) {
          setDisplay("Error");
        } else if (!isNaN(val)) {
          const res = Math.sqrt(val).toString();
          setDisplay(res);
          setEquation(res);
        }
      } catch (e) {
        setDisplay("Error");
      }
    } else if (char === "+/-") {
      if (display !== "0") {
        if (display.startsWith("-")) {
          setDisplay(display.substring(1));
        } else {
          setDisplay("-" + display);
        }
      }
    } else if (["+", "-", "*", "/", "^", "(", ")"].includes(char)) {
      // Append operators
      if (display === "0" && char === "-") {
        setDisplay("-");
        setEquation("-");
        return;
      }
      setEquation(prev => {
        const last = prev.trim().slice(-1);
        // Avoid repeating operators (except parens)
        if (["+", "-", "*", "/", "^"].includes(last) && ["+", "-", "*", "/", "^"].includes(char)) {
          return prev.slice(0, -1) + char;
        }
        return prev + char;
      });
      setDisplay("0");
    } else {
      // Numbers and decimals
      setDisplay(prev => {
        if (prev === "0" && char !== ".") {
          return char;
        }
        if (char === "." && prev.includes(".")) {
          return prev;
        }
        return prev + char;
      });
      setEquation(prev => prev + char);
    }
  };

  // Safe expression evaluator
  const evaluateResult = () => {
    let expr = equation.trim();
    if (!expr) {
      // fallback to current display
      expr = display;
    }

    try {
      // Sanitize expression
      // Allow only numbers, operators, parens, decimal, and power notation
      const sanitized = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**") // JavaScript exponentiation operator
        .replace(/[^-().+*/**0-9]/g, ""); // strip anything unsafe

      if (!sanitized) return;

      // Safe evaluation using Function
      const evalFn = new Function(`return (${sanitized})`);
      const rawResult = evalFn();
      
      if (rawResult === undefined || isNaN(rawResult)) {
        setDisplay("Error");
        return;
      }

      // Format result beautifully (max 10 decimals)
      let finalResult = rawResult.toString();
      if (finalResult.includes(".") && finalResult.length > 12) {
        finalResult = Number(rawResult).toFixed(8);
        // remove trailing zeros
        finalResult = parseFloat(finalResult).toString();
      }

      setDisplay(finalResult);
      setEquation(finalResult);

      // Save History
      const item: CalculatorHistoryItem = {
        id: "calc-" + Date.now(),
        expression: expr,
        result: finalResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveHistory([item, ...history].slice(0, 30));

    } catch (e) {
      setDisplay("Error");
    }
  };

  // Memory Operations
  const handleMemory = (op: "MC" | "MR" | "M+" | "M-") => {
    const val = parseFloat(display) || 0;
    let newMem = memory;
    if (op === "MC") {
      newMem = 0;
      onNotify("Memory cleared", "info");
    } else if (op === "MR") {
      setDisplay(memory.toString());
      setEquation(prev => prev + memory.toString());
      onNotify(`Recalled memory: ${memory}`, "info");
      return;
    } else if (op === "M+") {
      newMem = memory + val;
      onNotify(`Added to memory (+${val})`, "info");
    } else if (op === "M-") {
      newMem = memory - val;
      onNotify(`Subtracted from memory (-${val})`, "info");
    }
    setMemory(newMem);
    localStorage.setItem("calc_memory", newMem.toString());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    onNotify("Result copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // Listen to keyboard press events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      // Map keys to calculator button inputs
      if (/[0-9]/.test(key)) {
        handleKeyPress(key);
      } else if (key === ".") {
        handleKeyPress(".");
      } else if (key === "+") {
        handleKeyPress("+");
      } else if (key === "-") {
        handleKeyPress("-");
      } else if (key === "*") {
        handleKeyPress("*");
      } else if (key === "/") {
        handleKeyPress("/");
      } else if (key === "%") {
        handleKeyPress("%");
      } else if (key === "^") {
        handleKeyPress("^");
      } else if (key === "(") {
        handleKeyPress("(");
      } else if (key === ")") {
        handleKeyPress(")");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleKeyPress("=");
      } else if (key === "Backspace") {
        handleKeyPress("C");
      } else if (key === "Escape") {
        handleKeyPress("AC");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [display, equation, memory, history]);

  const clearHistory = () => {
    saveHistory([]);
    onNotify("Calculator history cleared", "info");
  };

  const useHistoryItem = (item: CalculatorHistoryItem) => {
    setDisplay(item.result);
    setEquation(item.result);
    setShowHistory(false);
  };

  return (
    <div id="calculator-module" className="max-w-md mx-auto bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-xl overflow-hidden relative">
      
      {/* Display Card */}
      <div className="mb-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 text-right flex flex-col justify-end min-h-[110px] relative group">
        
        {/* Toggle History & Copy Button */}
        <div className="absolute top-3 left-3 flex gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition cursor-pointer"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
          <button 
            onClick={handleCopy}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition cursor-pointer"
            title="Copy Result"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Memory Indicator */}
        {memory !== 0 && (
          <span className="absolute top-3 right-3 text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
            M = {memory}
          </span>
        )}

        {/* Equation Display */}
        <div id="calculator-equation" className="text-xs text-slate-400 dark:text-slate-500 truncate mb-1 pr-1 font-mono tracking-tight min-h-[16px]">
          {equation || " "}
        </div>

        {/* Current Result Value */}
        <div id="calculator-display" className="text-3xl font-bold font-mono tracking-tight text-slate-800 dark:text-white truncate">
          {display}
        </div>
      </div>

      <AnimatePresence>
        {showHistory ? (
          /* History Overlay Component */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute inset-x-6 top-[182px] bottom-6 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xl z-20 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2 mb-3">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Calculation History</h4>
              <div className="flex gap-2">
                <button 
                  onClick={clearHistory}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition cursor-pointer" 
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-sm">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 italic">No history yet</div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => useHistoryItem(item)}
                    className="p-2 border border-slate-100 dark:border-slate-800 hover:border-indigo-400/40 hover:bg-indigo-50/10 rounded-xl cursor-pointer transition text-right group/item"
                  >
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{item.expression}</div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 font-mono">{item.result}</div>
                    <div className="text-[9px] text-slate-300 dark:text-slate-600 font-mono group-hover/item:text-indigo-500">{item.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Memory Panel */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {["MC", "MR", "M+", "M-"].map((memOp) => (
          <button
            key={memOp}
            onClick={() => handleMemory(memOp as any)}
            className="py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 active:scale-95 border border-slate-200/20 dark:border-slate-800/20 rounded-xl transition cursor-pointer"
          >
            {memOp}
          </button>
        ))}
      </div>

      {/* Calculator Buttons Grid (inspired by premium mobile UI) */}
      <div className="grid grid-cols-4 gap-3 bg-slate-500/5 dark:bg-slate-500/5 p-3 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
        
        {/* Row 1 */}
        <button 
          onClick={() => handleKeyPress("AC")}
          className="aspect-square bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-2xl text-base transition-all active:scale-95 cursor-pointer"
        >
          AC
        </button>
        <button 
          onClick={() => handleKeyPress("C")}
          className="aspect-square bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-base transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <Delete className="w-5 h-5" />
        </button>
        <button 
          onClick={() => handleKeyPress("(")}
          className="aspect-square bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-base transition-all active:scale-95 cursor-pointer"
        >
          (
        </button>
        <button 
          onClick={() => handleKeyPress(")")}
          className="aspect-square bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-base transition-all active:scale-95 cursor-pointer"
        >
          )
        </button>

        {/* Row 2 */}
        <button 
          onClick={() => handleKeyPress("√")}
          className="aspect-square bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-base transition-all active:scale-95 cursor-pointer"
          title="Square Root"
        >
          √
        </button>
        <button 
          onClick={() => handleKeyPress("^")}
          className="aspect-square bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-base transition-all active:scale-95 cursor-pointer"
          title="Power / Exponent"
        >
          ^
        </button>
        <button 
          onClick={() => handleKeyPress("1/x")}
          className="aspect-square bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-xs transition-all active:scale-95 cursor-pointer"
          title="Reciprocal"
        >
          1/x
        </button>
        <button 
          onClick={() => handleKeyPress("/")}
          className="aspect-square bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl text-xl transition-all active:scale-95 cursor-pointer"
        >
          ÷
        </button>

        {/* Row 3 */}
        {[7, 8, 9].map((n) => (
          <button 
            key={n}
            onClick={() => handleKeyPress(n.toString())}
            className="aspect-square bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-150 font-semibold rounded-2xl text-lg shadow-sm active:scale-95 cursor-pointer"
          >
            {n}
          </button>
        ))}
        <button 
          onClick={() => handleKeyPress("*")}
          className="aspect-square bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl text-xl transition-all active:scale-95 cursor-pointer"
        >
          ×
        </button>

        {/* Row 4 */}
        {[4, 5, 6].map((n) => (
          <button 
            key={n}
            onClick={() => handleKeyPress(n.toString())}
            className="aspect-square bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-150 font-semibold rounded-2xl text-lg shadow-sm active:scale-95 cursor-pointer"
          >
            {n}
          </button>
        ))}
        <button 
          onClick={() => handleKeyPress("-")}
          className="aspect-square bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl text-xl transition-all active:scale-95 cursor-pointer"
        >
          -
        </button>

        {/* Row 5 */}
        {[1, 2, 3].map((n) => (
          <button 
            key={n}
            onClick={() => handleKeyPress(n.toString())}
            className="aspect-square bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-150 font-semibold rounded-2xl text-lg shadow-sm active:scale-95 cursor-pointer"
          >
            {n}
          </button>
        ))}
        <button 
          onClick={() => handleKeyPress("+")}
          className="aspect-square bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl text-xl transition-all active:scale-95 cursor-pointer"
        >
          +
        </button>

        {/* Row 6 */}
        <button 
          onClick={() => handleKeyPress("+/-")}
          className="aspect-square bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-150 font-semibold rounded-2xl text-sm shadow-sm active:scale-95 cursor-pointer"
        >
          +/-
        </button>
        <button 
          onClick={() => handleKeyPress("0")}
          className="aspect-square bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-150 font-semibold rounded-2xl text-lg shadow-sm active:scale-95 cursor-pointer"
        >
          0
        </button>
        <button 
          onClick={() => handleKeyPress(".")}
          className="aspect-square bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-150 font-semibold rounded-2xl text-lg shadow-sm active:scale-95 cursor-pointer"
        >
          .
        </button>
        <button 
          onClick={() => handleKeyPress("=")}
          id="calculator-equals"
          className="aspect-square bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xl transition-all active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          =
        </button>

      </div>
    </div>
  );
}
