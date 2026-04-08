'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Тийм',
  cancelLabel = 'Цуцлах',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const dangerColor = '#FF3B30';
  const normalColor = '#007AFF';
  const color = danger ? dangerColor : normalColor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          <AlertTriangle className="w-7 h-7" style={{ color }} />
        </div>
        <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">{title}</h3>
        <p className="text-[14px] text-[#8E8E93] mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 transition-all active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ backgroundColor: color }}
          >
            {loading ? 'Түр хүлээнэ үү...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
