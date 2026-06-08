/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useDB } from "../dbState";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useDB();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-in ${
            t.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : t.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === "success" && <CheckCircle size={18} className="text-emerald-400" />}
            {t.type === "error" && <AlertCircle size={18} className="text-rose-400" />}
            {t.type === "info" && <Info size={18} className="text-blue-400" />}
          </div>
          <div className="flex-1 text-sm font-medium leading-relaxed font-sans text-neutral-200">
            {t.message}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
