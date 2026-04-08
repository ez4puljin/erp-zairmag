'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 animate-ios-fade-in">
      <AlertTriangle className="w-5 h-5 text-[#FF3B30] shrink-0" />
      <p className="flex-1 text-[13px] font-medium text-[#FF3B30]">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-[#FF3B30]/10 transition-colors">
          <X className="w-4 h-4 text-[#FF3B30]" />
        </button>
      )}
    </div>
  );
}
