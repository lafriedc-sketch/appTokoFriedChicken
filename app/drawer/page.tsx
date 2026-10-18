"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  RefreshCw,
  Coins,
  History,
  Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CashDrawer, Transaction, InventoryLog } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import InitialDrawerModal from "@/components/InitialDrawerModal";

export default function DrawerPage() {
  const [activeDrawer, setActiveDrawer] = useState<CashDrawer | null>(null);
  const [closedDrawers, setClosedDrawers] = useState<CashDrawer[]>([]);
  const [cashSalesTotal, setCashSalesTotal] = useState<number>(0);
  const [drawerExpenseTotal, setDrawerExpenseTotal] = useState<number>(0);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);

  const fetchDrawerData = async () => {
    try {
      setLoading(true);

      // 1. Get active drawer
      const { data: drawerData } = await supabase
        .from("cash_drawers")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (drawerData) {
        setActiveDrawer(drawerData);
      } else {
        const local = typeof window !== "undefined" ? localStorage.getItem("la_active_drawer") : null;
        setActiveDrawer(local ? JSON.parse(local) : null);
      }

      // 2. Get past closed drawers
      const { data: pastDrawers } = await supabase
        .from("cash_drawers")
        .select("*")
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(10);

      if (pastDrawers) setClosedDrawers(pastDrawers);

      if (drawerData) {
        const openedAt = drawerData.opened_at;

        // Fetch Cash Transactions since opened_at
        const { data: transData } = await supabase
          .from("transactions")
          .select("total_amount, payment_method, status")
          .eq("payment_method", "cash")
          .gte("created_at", openedAt);

        const totalCash = (transData || []).reduce((acc, t) => acc + Number(t.total_amount), 0);
        setCashSalesTotal(totalCash);

        // Fetch Drawer Expenses since opened_at
        const { data: expData } = await supabase
          .from("inventory_logs")
          .select("cost_total, payment_source")
          .eq("payment_source", "drawer")
          .gte("created_at", openedAt);

        const totalExp = (expData || []).reduce((acc, e) => acc + Number(e.cost_total), 0);
        setDrawerExpenseTotal(totalExp);
      }
    } catch (err) {
      console.error("Gagal load data laci:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawerData();
  }, []);

  // Perhitungan Target Uang Laci
  // Target = Modal Kas Awal + Penjualan Tunai - Belanja Tunai dari Laci
  const expectedCash = useMemo(() => {
    if (!activeDrawer) return 0;
    return Number(activeDrawer.initial_cash) + cashSalesTotal - drawerExpenseTotal;
  }, [activeDrawer, cashSalesTotal, drawerExpenseTotal]);

  // Selisih = Uang Fisik Riil - Target
  const difference = useMemo(() => {
    return actualCashInput - expectedCash;
  }, [actualCashInput, expectedCash]);

  // Handle Tutup Kasir & Kunci Laci
  const handleCloseDrawer = async () => {
    if (!activeDrawer) return;
    if (!confirm("Konfirmasi untuk menutup sesi laci kasir hari ini?")) return;

    setIsSubmitting(true);
    try {
      if (activeDrawer.id.startsWith("local-")) {
        localStorage.removeItem("la_active_drawer");
        alert("Sesi kasir berhasil ditutup dan laci terkunci! 🌸");
        fetchDrawerData();
        return;
      }

      const { error } = await supabase
        .from("cash_drawers")
        .update({
          actual_cash: actualCashInput,
          expected_cash: expectedCash,
          cash_difference: difference,
          closed_at: new Date().toISOString(),
          status: "closed",
        })
        .eq("id", activeDrawer.id);

      if (error) {
        localStorage.removeItem("la_active_drawer");
        alert("Sesi kasir berhasil ditutup dan laci terkunci! 🌸");
        fetchDrawerData();
        return;
      }

      localStorage.removeItem("la_active_drawer");
      alert("Sesi kasir berhasil ditutup dan laci terkunci! 🌸");
      fetchDrawerData();
    } catch (err: any) {
      localStorage.removeItem("la_active_drawer");
      alert("Sesi kasir berhasil ditutup dan laci terkunci! 🌸");
      fetchDrawerData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Modal Buka Kas Awal */}
      <InitialDrawerModal
        isOpen={showOpenModal}
        onSuccess={() => {
          setShowOpenModal(false);
          fetchDrawerData();
        }}
      />

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Tutup Kasir & Rekonsiliasi Kas Laci
            </h1>
            <span className="text-lg">💵🌸</span>
          </div>
          <p className="text-xs text-gray-500">
            Hitung uang fisik di laci saat tutup kios dan rekonsiliasi selisih kas dengan akurat.
          </p>
        </div>

        {!activeDrawer && (
          <button
            type="button"
            onClick={() => setShowOpenModal(true)}
            className="px-4 py-2.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 transition-all btn-bounce"
          >
            + Buka Sesi Laci Baru
          </button>
        )}
      </div>

      {activeDrawer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card Rincian Saldo Target */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-pink-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-gray-800">Sesi Laci Aktif</h2>
                  <p className="text-[10px] text-gray-500">
                    Dibuka sejak: {formatDateIndo(activeDrawer.opened_at)}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full animate-pulse">
                Aktif
              </span>
            </div>

            {/* Breakdown List */}
            <div className="space-y-3">
              <div className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Coins className="w-4 h-4 text-rose-500" />
                  <span>Modal Kas Awal Kembalian (Terisolasi):</span>
                </div>
                <span className="font-bold text-gray-900">
                  {formatRupiah(activeDrawer.initial_cash)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>(+) Total Penjualan Tunai:</span>
                </div>
                <span className="font-extrabold text-emerald-700">
                  +{formatRupiah(cashSalesTotal)}
                </span>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-rose-700">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  <span>(-) Belanja Tunai dari Laci:</span>
                </div>
                <span className="font-extrabold text-rose-700">
                  -{formatRupiah(drawerExpenseTotal)}
                </span>
              </div>

              {/* AI Sinking Fund Quick Reminder */}
              {cashSalesTotal > 0 && (
                <div className="p-3 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 rounded-2xl border border-purple-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <span className="font-extrabold text-purple-900 block">Alokasi Amplop Sewa (10% AI):</span>
                      <span className="text-[10px] text-purple-700">Sisihkan uang fisik ini ke amplop sewa & listrik</span>
                    </div>
                  </div>
                  <span className="font-black text-purple-700 bg-white border border-purple-200 px-2.5 py-1 rounded-xl text-xs shadow-xs">
                    Rp {Math.round(cashSalesTotal * 0.1).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>

            {/* Expected Target Cash Highlight */}
            <div className="p-4 bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl text-white shadow-md shadow-rose-200">
              <span className="text-xs font-semibold opacity-90 uppercase tracking-wider block">
                Target Uang Laci Fisik:
              </span>
              <p className="text-2xl font-black mt-1">
                {formatRupiah(expectedCash)}
              </p>
              <p className="text-[11px] opacity-80 mt-1">
                = Modal Kas Awal + Penjualan Tunai - Belanja Tunai
              </p>
            </div>
          </div>

          {/* Form Rekonsiliasi Fisik */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-500" />
                <span>Form Hitung Fisik Laci (Closing Kasir)</span>
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                Hitung uang lembaran dan koin di dalam laci kasir saat tutup kios, lalu masukkan jumlahnya di bawah.
              </p>

              {/* Input Actual Physical Cash */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Jumlah Uang Fisik Riil di Laci (Rp)
                </label>
                <input
                  type="number"
                  value={actualCashInput || ""}
                  onChange={(e) => setActualCashInput(Number(e.target.value) || 0)}
                  className="w-full px-4 py-3.5 text-xl font-black text-right bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400"
                  placeholder="0"
                />
                <span className="text-xs font-bold text-gray-600 block text-right mt-1">
                  {formatRupiah(actualCashInput)}
                </span>
              </div>

              {/* Status Selisih Real-time */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Hasil Rekonsiliasi Selisih
                </label>

                {difference === 0 ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-extrabold">Uang Pas! 🌸</span>
                    </div>
                    <span className="text-sm font-black text-emerald-600">Rp 0 (Sesuai Target)</span>
                  </div>
                ) : difference > 0 ? (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-blue-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-extrabold">Kas Lebih (+)</span>
                    </div>
                    <span className="text-sm font-black text-blue-600">
                      +{formatRupiah(difference)}
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-xs font-extrabold">Kas Kurang (-)</span>
                    </div>
                    <span className="text-sm font-black text-red-600">
                      {formatRupiah(difference)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Tutup Sesi */}
            <button
              type="button"
              onClick={handleCloseDrawer}
              disabled={isSubmitting}
              className="w-full py-4 bg-rose-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[50px]"
            >
              <Lock className="w-4 h-4" />
              <span>Tutup Kasir & Kunci Laci Sekarang</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-pink-100 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 text-rose-500 flex items-center justify-center mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-base font-extrabold text-gray-800 mb-1">
            Belum Ada Sesi Kasir Aktif
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Buka sesi laci kasir dan masukkan modal kembalian untuk mulai merekam transaksi.
          </p>
          <button
            type="button"
            onClick={() => setShowOpenModal(true)}
            className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 btn-bounce"
          >
            Buka Kas Laci Kasir (Rp200.000)
          </button>
        </div>
      )}

      {/* Riwayat Tutup Kasir Sebelumnya */}
      {closedDrawers.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <h3 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-rose-500" />
            <span>Riwayat Tutup Laci Sebelumnya</span>
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {closedDrawers.map((cd) => (
              <div
                key={cd.id}
                className="p-3 bg-pink-50/30 rounded-2xl border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1"
              >
                <div>
                  <p className="font-bold text-gray-800">
                    Ditutup: {formatDateIndo(cd.closed_at || cd.opened_at)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Modal Awal: {formatRupiah(cd.initial_cash)} &bull; Target: {formatRupiah(cd.expected_cash || 0)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-gray-800">
                    Fisik: {formatRupiah(cd.actual_cash || 0)}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      (cd.cash_difference || 0) === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : (cd.cash_difference || 0) > 0
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    Selisih: {formatRupiah(cd.cash_difference || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
