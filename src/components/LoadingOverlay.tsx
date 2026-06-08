/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center flex flex-col items-center">
        {/* Animated premium spin ring */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6 col-span-1">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin"></div>
          <Loader2 className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        
        <h2 className="text-xl font-bold text-neutral-100 font-sans tracking-tight mb-2">
          Carregando ERP Premium
        </h2>
        
        {/* Fun phrases */}
        <p className="text-sm font-mono text-neutral-400 h-10 flex items-center justify-center px-4 animate-fade-in">
          {message}
        </p>

        <div className="mt-4 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-linear-to-r from-purple-500 to-indigo-500 rounded-full animate-bar-grow w-full"></div>
        </div>
      </div>
    </div>
  );
};
