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
  Sparkles,
  Flame,
  Utensils,
  Edit3,
  KeyRound,
  X,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CashDrawer, Transaction, InventoryLog, StoreSettings } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import InitialDrawerModal from "@/components/InitialDrawerModal";

export default function DrawerPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<CashDrawer | null>(null);
  const [closedDrawers, setClosedDrawers] = useState<CashDrawer[]>([]);
  const [cashSalesTotal, setCashSalesTotal] = useState<number>(0);
  const [drawerExpenseTotal, setDrawerExpenseTotal] = useState<number>(0);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);

  // State Edit Modal Awal & PIN Admin
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [editCashAmount, setEditCashAmount] = useState<number>(0);

  // State Sisa Etalase / Waste Closing
  const [hasWaste, setHasWaste] = useState<boolean>(false);
  const [wasteAyam, setWasteAyam] = useState<number>(0);
  const [wasteUsus, setWasteUsus] = useState<number>(0);
  const [wasteNote, setWasteNote] = useState<string>("Sisa etalase closing");

  const fetchDrawerData = async () => {
    try {
      setLoading(true);

      // 0. Get store settings for Admin PIN
      const { data: settingsData } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (settingsData) setSettings(settingsData);

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

  // Handle Verify PIN untuk Edit Modal Awal
  const handleVerifyPin = () => {
    const validPin = settings?.admin_pin || "1234";
    if (pinInput === validPin) {
      setIsPinModalOpen(false);
      setPinInput("");
      setPinError("");
      setEditCashAmount(Number(activeDrawer?.initial_cash || 0));
      setIsEditingCash(true);
    } else {
      setPinError("PIN Admin salah!");
    }
  };

  // Handle Simpan Modal Awal yang baru
  const handleSaveInitialCash = async () => {
    if (!activeDrawer) return;
    try {
      setIsSubmitting(true);
      
      // Update DB
      if (!activeDrawer.id.startsWith("local-")) {
        const { error } = await supabase
          .from("cash_drawers")
          .update({ initial_cash: editCashAmount })
          .eq("id", activeDrawer.id);
        if (error) throw error;
      }
      
      // Update Local State
      const updatedDrawer = { ...activeDrawer, initial_cash: editCashAmount };
      setActiveDrawer(updatedDrawer);
      if (typeof window !== "undefined") {
        localStorage.setItem("la_active_drawer", JSON.stringify(updatedDrawer));
      }
      
      setIsEditingCash(false);
      alert("Modal kas awal laci berhasil diperbarui! 🌸");
    } catch (error) {
      console.error("Gagal mengubah modal kas:", error);
      alert("Terjadi kesalahan sistem saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper potong stok gudang secara FIFO untuk sisa etalase closing
  const deductRawItemFifo = async (targetType: "ayam" | "usus", qtyToDeduct: number, noteText: string) => {
    if (qtyToDeduct <= 0) return { success: true, qtyDeducted: 0, totalHpp: 0 };

    try {
      // 1. Cari master item di gudang
      const { data: invItems } = await supabase
        .from("inventory_items")
        .select("id, name, current_stock");

      let matchedItem: any = null;
      if (invItems && invItems.length > 0) {
        if (targetType === "ayam") {
          matchedItem = invItems.find(
            (i: any) => i.name.toLowerCase().includes("ayam mentah") || i.name.toLowerCase().includes("ayam")
          );
        } else {
          matchedItem = invItems.find(
            (i: any) => i.name.toLowerCase().includes("usus")
          );
        }
      }

      if (!matchedItem) {
        console.warn(`Bahan mentah untuk ${targetType} belum ditemukan di gudang.`);
        return { success: false, reason: `Bahan ${targetType} belum ada di gudang` };
      }

      const rawItemId = matchedItem.id;
      let remainingToDeduct = qtyToDeduct;
      let totalHpp = 0;
      let totalDeductedFromBatches = 0;

      // 2. Ambil batch aktif FIFO
      const { data: batches } = await supabase
        .from("inventory_batches")
        .select("*")
        .eq("inventory_item_id", rawItemId)
        .gt("remaining_qty", 0)
        .order("batch_date", { ascending: true });

      if (batches && batches.length > 0) {
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const batchRemaining = Number(batch.remaining_qty || 0);
          if (batchRemaining <= 0) continue;

          const deductQty = Math.min(batchRemaining, remainingToDeduct);
          const costPerUnit = Number(batch.cost_per_unit || 0);
          const batchCost = deductQty * costPerUnit;

          totalHpp += batchCost;
          totalDeductedFromBatches += deductQty;
          remainingToDeduct -= deductQty;

          const newRemaining = Math.max(0, batchRemaining - deductQty);

          await supabase
            .from("inventory_batches")
            .update({ remaining_qty: newRemaining })
            .eq("id", batch.id);
        }
      }

      const actualDeducted = totalDeductedFromBatches > 0 ? totalDeductedFromBatches : qtyToDeduct;

      // 3. Catat transaksi pengurangan ke inventory_logs
      const logPayload = {
        item_id: rawItemId,
        change_qty: -actualDeducted,
        type: "out",
        cost_total: totalHpp,
        payment_source: "other",
      };

      const { data: insertedLog } = await supabase
        .from("inventory_logs")
        .insert(logPayload)
        .select()
        .maybeSingle();

      // Simpan ke local audit trail
      if (typeof window !== "undefined") {
        try {
          const localFifoLogs = JSON.parse(localStorage.getItem("la_fifo_logs") || "[]");
          localFifoLogs.unshift(
            insertedLog || {
              id: "fifo-log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
              item_id: rawItemId,
              change_qty: -actualDeducted,
              type: "out",
              cost_total: totalHpp,
              payment_source: "other",
              created_at: new Date().toISOString(),
            }
          );
          localStorage.setItem("la_fifo_logs", JSON.stringify(localFifoLogs.slice(0, 200)));
        } catch {}
      }

      // 4. Update current_stock di inventory_items
      const updatedStock = Math.max(0, Number(matchedItem.current_stock || 0) - actualDeducted);
      await supabase
        .from("inventory_items")
        .update({ current_stock: updatedStock })
        .eq("id", rawItemId);

      // 5. Catat ke frying_logs sebagai waste closing
      try {
        await supabase.from("frying_logs").insert({
          piece_count: -actualDeducted,
          note: `Sisa Etalase Closing: ${actualDeducted} ${targetType} (${noteText})`,
          fried_at: new Date().toISOString(),
        });
      } catch {}

      return {
        success: true,
        qtyDeducted: actualDeducted,
        totalHpp,
        itemName: matchedItem.name,
      };
    } catch (err: any) {
      console.error("Error executing deductRawItemFifo:", err);
      return { success: false, reason: err.message };
    }
  };

  // Handle Tutup Kasir & Kunci Laci
  const handleCloseDrawer = async () => {
    if (!activeDrawer) return;

    let confirmMsg = "Konfirmasi untuk menutup sesi laci kasir hari ini?";
    if (hasWaste && (wasteAyam > 0 || wasteUsus > 0)) {
      confirmMsg += `\n\nSisa etalase terinput:\n- Ayam: ${wasteAyam} potong\n- Usus: ${wasteUsus} porsi\nStok gudang akan otomatis dipotong.`;
    }
    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      let wasteSummary = "";
      if (hasWaste) {
        if (wasteAyam > 0) {
          const resAyam = await deductRawItemFifo("ayam", wasteAyam, wasteNote);
          if (resAyam.success) {
            wasteSummary += `${wasteAyam} potong ayam`;
          }
        }
        if (wasteUsus > 0) {
          const resUsus = await deductRawItemFifo("usus", wasteUsus, wasteNote);
          if (resUsus.success) {
            wasteSummary += (wasteSummary ? ", " : "") + `${wasteUsus} porsi usus`;
          }
        }
      }

      if (!activeDrawer.id.startsWith("local-")) {
        await supabase
          .from("cash_drawers")
          .update({
            actual_cash: actualCashInput,
            expected_cash: expectedCash,
            cash_difference: difference,
            closed_at: new Date().toISOString(),
            status: "closed",
          })
          .eq("id", activeDrawer.id);
      }

      localStorage.removeItem("la_active_drawer");
      const alertMsg = wasteSummary 
        ? `Sesi kasir berhasil ditutup dan laci terkunci! 🌸\nSisa etalase (${wasteSummary}) otomatis dipotong dari stok gudang.`
        : "Sesi kasir berhasil ditutup dan laci terkunci! 🌸";
      alert(alertMsg);

      setActualCashInput(0);
      setHasWaste(false);
      setWasteAyam(0);
      setWasteUsus(0);
      fetchDrawerData();
    } catch (err: any) {
      console.error("Error closing drawer:", err);
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

      {/* Modal PIN Admin untuk Edit Modal Kas */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 text-center relative">
            <button
              onClick={() => { setIsPinModalOpen(false); setPinInput(""); setPinError(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-gray-800 mb-1">Otorisasi Admin</h3>
            <p className="text-xs text-gray-500 mb-5">
              Masukkan PIN Admin untuk mengubah nominal Modal Kas Awal.
            </p>
            
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPin()}
              placeholder="Ketik PIN..."
              className="w-full text-center px-4 py-3 bg-pink-50/50 border border-pink-200 rounded-xl font-black tracking-widest focus:ring-2 focus:ring-rose-400 mb-3 text-lg"
              autoFocus
            />
            
            {pinError && <p className="text-[11px] font-bold text-red-500 mb-3">{pinError}</p>}
            
            <button
              onClick={handleVerifyPin}
              className="w-full py-3 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-600 shadow-md shadow-rose-200 btn-bounce"
            >
              Verifikasi & Edit
            </button>
          </div>
        </div>
      )}

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
              {/* Row: Modal Kas Awal Kembalian (Dengan Fitur Edit) */}
              <div className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex justify-between items-center text-xs transition-all">
                <div className="flex items-center gap-2 text-gray-700">
                  <Coins className="w-4 h-4 text-rose-500" />
                  <span>Modal Kas Awal Kembalian:</span>
                </div>
                
                {isEditingCash ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <input
                      type="number"
                      value={editCashAmount || ""}
                      onChange={(e) => setEditCashAmount(Number(e.target.value))}
                      className="w-24 px-2 py-1.5 text-xs font-black text-right text-rose-600 bg-white border border-pink-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <button 
                      onClick={handleSaveInitialCash}
                      disabled={isSubmitting}
                      className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setIsEditingCash(false)}
                      className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <span className="font-bold text-gray-900">
                      {formatRupiah(activeDrawer.initial_cash)}
                    </span>
                    <button 
                      onClick={() => setIsPinModalOpen(true)}
                      className="p-1.5 rounded-lg text-gray-400 bg-white border border-pink-100 opacity-50 group-hover:opacity-100 hover:text-rose-600 hover:bg-pink-50 transition-all"
                      title="Edit Modal Kas"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
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

              {/* STEP 1: CEK SISA ETALASE / WASTE GORENGAN CLOSING */}
              <div className="mb-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍗</span>
                    <div>
                      <span className="text-xs font-black text-amber-950 block">1. Cek Sisa Etalase Closing</span>
                      <span className="text-[10px] text-amber-800">Apakah ada ayam/usus matang yang tidak laku malam ini?</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setHasWaste(false);
                        setWasteAyam(0);
                        setWasteUsus(0);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        !hasWaste ? "bg-emerald-500 text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Ludes Bersih (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasWaste(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        hasWaste ? "bg-amber-500 text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Ada Sisa
                    </button>
                  </div>
                </div>

                {hasWaste && (
                  <div className="pt-2 border-t border-amber-200/80 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                          Sisa Ayam Goreng (Potong)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={wasteAyam || ""}
                          onChange={(e) => setWasteAyam(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-400 text-amber-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                          Sisa Usus Krispi (Porsi)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={wasteUsus || ""}
                          onChange={(e) => setWasteUsus(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-400 text-amber-900"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={wasteNote}
                        onChange={(e) => setWasteNote(e.target.value)}
                        placeholder="Keterangan sisa (misal: dibawa pulang kasir / dibuang afkir)"
                        className="w-full px-3 py-1.5 text-[11px] bg-white/90 border border-amber-200 rounded-xl text-gray-700"
                      />
                    </div>

                    <div className="text-[10px] text-amber-900 bg-amber-100/70 p-2 rounded-xl flex items-center gap-1.5">
                      <span>ℹ️</span>
                      <span>Stok bahan baku mentah di gudang akan otomatis dipotong secara FIFO saat laci dikunci.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Input Actual Physical Cash */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  2. Jumlah Uang Fisik Riil di Laci (Rp)
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
            Buka Kas Laci Kasir
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
