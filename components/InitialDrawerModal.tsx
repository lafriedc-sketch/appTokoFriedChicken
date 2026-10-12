"use client";

import React, { useState } from "react";
import { Wallet, Sparkles, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatRupiah } from "@/lib/utils";

interface InitialDrawerModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
}

export default function InitialDrawerModal({ isOpen, onSuccess, onClose }: InitialDrawerModalProps) {
  const [initialCash, setInitialCash] = useState<number>(200000);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const presets = [100000, 200000, 300000, 500000];

  const handleOpenDrawer = async () => {
    if (initialCash < 0) {
      setErrorMsg("Nominal kas awal tidak boleh negatif");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.from("cash_drawers").insert({
        initial_cash: initialCash,
        status: "open",
        opened_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("schema cache")) {
          // Fallback to local storage so user can test the app immediately
          localStorage.setItem(
            "la_active_drawer",
            JSON.stringify({
              id: "local-drawer-" + Date.now(),
              initial_cash: initialCash,
              status: "open",
              opened_at: new Date().toISOString(),
            })
          );
          setErrorMsg("TABLE_NOT_FOUND");
          return;
        }
        throw error;
      }
      onSuccess();
    } catch (err: any) {
      console.error("Gagal membuka laci:", err);
      if (err.code === "PGRST205" || err.message?.includes("schema cache")) {
        setErrorMsg("TABLE_NOT_FOUND");
      } else {
        setErrorMsg(err.message || "Gagal membuka sesi laci kasir");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoMode = () => {
    localStorage.setItem(
      "la_active_drawer",
      JSON.stringify({
        id: "local-drawer-" + Date.now(),
        initial_cash: initialCash,
        status: "open",
        opened_at: new Date().toISOString(),
      })
    );
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pink-100 text-center relative overflow-hidden">
        {/* Close button if optional */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors z-20"
            title="Lewati modal kas laci"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Cute decorative background floral accent */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-100 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-100 rounded-full blur-2xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4 animate-bounce">
          <Wallet className="w-8 h-8" />
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-1">
          <h2 className="text-xl font-extrabold text-gray-800">Buka Kas Laci Awal</h2>
          <span className="text-lg">🌸</span>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Masukkan modal kembalian di laci sebelum memulai transaksi penjualan kios LA Fried Chicken.
        </p>

        {/* Amount Input */}
        <div className="mb-4 text-left">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Nominal Modal Kembalian (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
              Rp
            </span>
            <input
              type="number"
              value={initialCash || ""}
              onChange={(e) => setInitialCash(Number(e.target.value) || 0)}
              className="w-full pl-12 pr-4 py-3.5 bg-pink-50/50 border border-pink-200 rounded-2xl text-lg font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all text-right"
              placeholder="0"
            />
          </div>
          <p className="text-xs font-semibold text-rose-500 text-right mt-1">
            {formatRupiah(initialCash)}
          </p>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {presets.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setInitialCash(val)}
              className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all btn-bounce ${
                initialCash === val
                  ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                  : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50"
              }`}
            >
              {val / 1000}k
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4">
            {errorMsg === "TABLE_NOT_FOUND" ? (
              <div className="p-3.5 bg-rose-50 text-rose-800 rounded-2xl text-left border border-rose-200 space-y-2">
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-rose-600">
                  <span>⚠️</span>
                  <span>Tabel Supabase Belum Dibuat!</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Skema database belum dieksekusi di Supabase. Silakan jalankan file{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 text-rose-600 font-bold">
                    supabase/schema.sql
                  </code>{" "}
                  di SQL Editor Supabase.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleUseDemoMode}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all btn-bounce"
                  >
                    Lanjutkan dengan Mode Demo (Penyimpanan Lokal) 🌸
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          disabled={loading || initialCash <= 0}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-300 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[52px]"
        >
          {loading ? (
            <span className="animate-spin text-lg">🌸</span>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Buka Laci Kasir Sekarang</span>
            </>
          )}
        </button>

        {/* Skip button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2.5 py-2.5 bg-transparent text-gray-500 hover:text-rose-600 font-semibold text-xs rounded-xl hover:bg-pink-50/50 transition-colors"
          >
            Lewati Modal Laci (Buka Menu Saja)
          </button>
        )}
      </div>
    </div>
  );
}
