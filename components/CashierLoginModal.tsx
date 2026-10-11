"use client";

import React, { useState } from "react";
import { UserCheck, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { CashierSession } from "@/types";

interface CashierLoginModalProps {
  isOpen: boolean;
  onSuccess: (session: CashierSession) => void;
  validPin?: string;
}

export default function CashierLoginModal({
  isOpen,
  onSuccess,
  validPin = "1234",
}: CashierLoginModalProps) {
  const [cashierName, setCashierName] = useState("Kasir 1");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const presets = ["Kasir 1", "Kasir 2", "Mbak Siti", "Owner"];

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cashierName.trim()) {
      setErrorMsg("Nama kasir tidak boleh kosong");
      return;
    }

    // Default pin is 1234 or configured store PIN
    if (pin !== validPin && pin !== "1234") {
      setErrorMsg("PIN Kasir salah! (Default: 1234)");
      return;
    }

    const session: CashierSession = {
      name: cashierName.trim(),
      loggedInAt: new Date().toISOString(),
    };

    localStorage.setItem("la_active_cashier", JSON.stringify(session));
    setErrorMsg("");
    onSuccess(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-pink-100 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-rose-100 rounded-full blur-2xl pointer-events-none" />

        {/* Avatar Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4 animate-bounce">
          <UserCheck className="w-8 h-8" />
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-1">
          <h2 className="text-xl font-extrabold text-gray-800">Login Shift Kasir</h2>
          <span className="text-lg">🌸</span>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Masuk untuk mulai melayani transaksi di kios LA Fried Chicken.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Pilih Nama Kasir
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCashierName(p)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all btn-bounce ${
                    cashierName === p
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200"
                      : "bg-pink-50/50 text-gray-700 border-pink-200 hover:bg-pink-100/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom Name Input */}
            <input
              type="text"
              placeholder="Atau ketik nama kasir lain..."
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-semibold focus:ring-2 focus:ring-rose-400"
              required
            />
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>PIN Kasir (4 Digit)</span>
              <span className="text-[10px] text-gray-400 font-normal">Default: 1234</span>
            </label>
            <input
              type="password"
              maxLength={6}
              placeholder="Ketik PIN..."
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-xl font-black tracking-widest py-2.5 bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-200 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
          >
            <span>Masuk Shift Kasir</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
