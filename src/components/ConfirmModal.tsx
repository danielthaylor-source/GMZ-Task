/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Sim, Excluir",
  cancelText = "Cancelar",
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-5"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle size={20} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-100 leading-snug">{title}</h3>
              <p className="text-xs text-neutral-400 leading-normal">{description}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-neutral-850">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-neutral-955 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-neutral-100 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
