"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { CheckCircle, Printer, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { Transaction } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface CelebrationModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onOpenReceipt: () => void;
}

export default function CelebrationModal({
  isOpen,
  transaction,
  onClose,
  onOpenReceipt,
}: CelebrationModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire flower & crispy chicken themed confetti burst
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#F43F5E", "#FB7185", "#FDA4AF", "#F59E0B", "#10B981"],
        });

        // Second gentle burst
        setTimeout(() => {
          confetti({
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#F43F5E", "#FDA4AF", "#FEF08A"],
          });
          confetti({
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#F43F5E", "#FDA4AF", "#FEF08A"],
          });
        }, 300);
      } catch (err) {
        console.error("Confetti trigger error:", err);
      }
    }
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  // Floating decorative emojis
  const particles = [
    { emoji: "🍗", delay: "0s", left: "15%" },
    { emoji: "🌺", delay: "0.2s", left: "30%" },
    { emoji: "✨", delay: "0.1s", left: "50%" },
    { emoji: "🌷", delay: "0.3s", left: "70%" },
    { emoji: "🍗", delay: "0.4s", left: "85%" },
    { emoji: "🌻", delay: "0.15s", left: "40%" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
      {/* Floating flower & chicken particles container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-1/3 text-2xl floating-flower select-none"
            style={{
              left: p.left,
              animationDelay: p.delay,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 text-center relative overflow-hidden z-10">
        {/* Glowing circle top decoration */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-100 rounded-full blur-xl pointer-events-none" />

        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-xl shadow-rose-200 mb-4 animate-bounce">
          <div className="relative">
            <CheckCircle className="w-10 h-10 stroke-[2.5]" />
            <span className="absolute -top-3 -right-3 text-lg animate-pulse">✨</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-100 text-rose-600 rounded-full text-xs font-bold mb-2">
          <span>🌺</span>
          <span>Transaksi Sukses!</span>
          <span>🍗</span>
        </div>

        <h3 className="text-xl font-black text-gray-800 mb-1">
          Pembayaran Berhasil
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Nota: <span className="font-semibold text-gray-700">{transaction.receipt_no}</span>
        </p>

        {/* Change / Kembalian Box */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50/60 p-4 rounded-2xl border border-pink-100 mb-5">
          <div className="flex justify-between items-center text-xs text-gray-600 mb-1.5">
            <span>Total Belanja</span>
            <span className="font-bold text-gray-800">{formatRupiah(transaction.total_amount)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
            <span>Uang Diterima ({transaction.payment_method.toUpperCase()})</span>
            <span className="font-bold text-gray-800">
              {transaction.payment_method === "cash"
                ? formatRupiah(transaction.cash_received)
                : formatRupiah(transaction.total_amount)}
            </span>
          </div>
          <div className="pt-2 border-t border-pink-200/60 flex justify-between items-center">
            <span className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">
              Kembalian:
            </span>
            <span className="text-lg font-black text-rose-600">
              {formatRupiah(transaction.cash_change)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onOpenReceipt}
            className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
          >
            <Printer className="w-4 h-4" />
            <span>Lihat & Cetak Struk (58mm)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-pink-50 text-rose-600 font-bold text-xs rounded-2xl border border-pink-200 hover:bg-pink-100 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Pesanan Baru 🛒</span>
          </button>
        </div>
      </div>
    </div>
  );
}
