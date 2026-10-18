"use client";

import React, { useEffect, useState } from "react";
import { 
  Flame, 
  Plus, 
  Trash2, 
  AlertOctagon, 
  Store, 
  Clock, 
  CheckCircle2, 
  TrendingDown, 
  Sparkles,
  Layers,
  ArrowDownCircle,
  PackageCheck
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { FryingLog } from "@/types";
import { formatDateIndo, formatTimeOnly } from "@/lib/utils";

export default function FryingPage() {
  const [fryingLogs, setFryingLogs] = useState<FryingLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form input batch baru
  const [itemType, setItemType] = useState<"ayam" | "usus">("ayam");
  const [pieceCount, setPieceCount] = useState<number>(20);
  const [fryingTime, setFryingTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [note, setNote] = useState<string>("Batch Reguler (Dada, Paha, Sayap)");

  // Form susut / afkir
  const [wasteType, setWasteType] = useState<"ayam" | "usus">("ayam");
  const [wasteCount, setWasteCount] = useState<number>(0);
  const [wasteNote, setWasteNote] = useState<string>("Gosong / tidak layak");
  const [isSubmittingWaste, setIsSubmittingWaste] = useState(false);

  // Form sisa etalase saat tutup
  const [etalaseAyam, setEtalaseAyam] = useState<number>(0);
  const [etalaseUsus, setEtalaseUsus] = useState<number>(0);
  const [isSubmittingEtalase, setIsSubmittingEtalase] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchFryingLogs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("frying_logs")
        .select("*")
        .order("fried_at", { ascending: false })
        .limit(40);

      if (data) setFryingLogs(data);
    } catch (err) {
      console.error("Gagal load log penggorengan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFryingLogs();
  }, []);

  const showToast = (text: string) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Ubah tipe item batch
  const handleItemTypeChange = (type: "ayam" | "usus") => {
    setItemType(type);
    if (type === "ayam") {
      setPieceCount(20);
      setNote("Batch Reguler (Dada, Paha, Sayap)");
    } else {
      setPieceCount(10);
      setNote("Batch Usus Crispy");
    }
  };

  // Helper memotong stok bahan baku mentah (Ayam Mentah / Usus Mentah) secara FIFO
  const deductRawItemFifo = async (
    targetType: "ayam" | "usus",
    qtyToDeduct: number,
    reason: string
  ) => {
    if (qtyToDeduct <= 0) return { success: true, qtyDeducted: 0 };

    try {
      // 1. Cari master bahan baku yang sesuai di inventory_items
      const { data: allItems, error: itemsErr } = await supabase
        .from("inventory_items")
        .select("id, name, current_stock, unit");

      if (itemsErr || !allItems || allItems.length === 0) {
        console.warn("Gagal membaca master bahan baku:", itemsErr);
        return { success: false, reason: "Gagal membaca inventory_items" };
      }

      // Filter bahan mentah yang relevan
      let matchedItem = null;
      if (targetType === "ayam") {
        matchedItem = allItems.find(
          (i) =>
            i.name.toLowerCase().includes("ayam mentah") ||
            (i.name.toLowerCase().includes("ayam") &&
              !i.name.toLowerCase().includes("bumbu") &&
              !i.name.toLowerCase().includes("tepung"))
        );
      } else {
        matchedItem = allItems.find(
          (i) =>
            i.name.toLowerCase().includes("usus") &&
            !i.name.toLowerCase().includes("bumbu")
        );
      }

      if (!matchedItem) {
        console.warn(`Bahan mentah untuk ${targetType} belum ditemukan di inventory_items.`);
        return { success: false, reason: `Bahan mentah ${targetType} belum ada di gudang` };
      }

      const rawItemId = matchedItem.id;
      let remainingToDeduct = qtyToDeduct;
      let totalHpp = 0;
      let totalDeductedFromBatches = 0;

      // 2. Ambil batch aktif berdasarkan batch_date tertua (FIFO)
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

      const { data: insertedLog, error: logErr } = await supabase
        .from("inventory_logs")
        .insert(logPayload)
        .select()
        .maybeSingle();

      if (logErr) {
        console.error("Gagal insert log FIFO:", logErr);
      }

      // Simpan ke local audit trail agar konsisten dengan kasir POS
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

  // Submit Batch Penggorengan Baru
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pieceCount <= 0) return;

    try {
      const now = new Date();
      const [hours, minutes] = fryingTime.split(":");
      now.setHours(Number(hours), Number(minutes), 0, 0);

      const cleanNote = note.replace(/^\[(Ayam|Usus)\]\s*/i, "").trim();
      const finalNote = itemType === "ayam"
        ? `[Ayam] ${cleanNote || "Batch Reguler"}`
        : `[Usus] ${cleanNote || "Batch Usus Crispy"}`;

      const { error } = await supabase.from("frying_logs").insert({
        fried_at: now.toISOString(),
        piece_count: Number(pieceCount),
        note: finalNote,
      });

      if (error) throw error;
      const unitLabel = itemType === "ayam" ? "potong ayam" : "porsi usus";
      const icon = itemType === "ayam" ? "🍗" : "🥢";
      showToast(`Batch goreng ${pieceCount} ${unitLabel} berhasil dicatat! ${icon}✨`);
      
      if (itemType === "ayam") {
        setPieceCount(20);
        setNote("Batch Reguler (Dada, Paha, Sayap)");
      } else {
        setPieceCount(10);
        setNote("Batch Usus Crispy");
      }
      fetchFryingLogs();
    } catch (err: any) {
      alert(`Gagal mencatat batch: ${err.message || "Error"}`);
    }
  };

  // Submit Susut / Afkir (Otomatis Potong Stok Bahan Mentah)
  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wasteCount <= 0) return;

    try {
      setIsSubmittingWaste(true);
      const typeTag = wasteType === "ayam" ? "[Ayam]" : "[Usus]";
      const unitLabel = wasteType === "ayam" ? "potong ayam" : "porsi usus";

      const { error } = await supabase.from("frying_logs").insert({
        fried_at: new Date().toISOString(),
        piece_count: -Math.abs(wasteCount), // negative for waste
        note: `[SUSUT/AFKIR] ${typeTag} ${wasteNote.trim()}`,
      });

      if (error) throw error;

      // Otomatis potong stok bahan mentah gudang via FIFO
      const wasteDeductRes = await deductRawItemFifo(
        wasteType,
        wasteCount,
        `Susut/Gosong: ${wasteNote.trim()}`
      );

      const potongInfo = wasteDeductRes.success
        ? ` & ${wasteCount} ${wasteType === "ayam" ? "potong ayam" : "porsi usus"} mentah dipotong dari gudang`
        : "";

      showToast(`Catatan susut ${wasteCount} ${unitLabel} dicatat${potongInfo}! ⚠️`);
      setWasteCount(0);
      setWasteNote("Gosong / tidak layak");
      fetchFryingLogs();
    } catch (err: any) {
      alert(`Gagal mencatat susut: ${err.message || "Error"}`);
    } finally {
      setIsSubmittingWaste(false);
    }
  };

  // Submit Sisa Etalase saat Tutup (Otomatis Potong Stok Bawa Pulang)
  const handleSaveEtalaseRemaining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etalaseAyam <= 0 && etalaseUsus <= 0) {
      alert("Masukkan minimal sisa ayam atau sisa usus yang tersisa di etalase.");
      return;
    }

    try {
      setIsSubmittingEtalase(true);
      const { error } = await supabase.from("frying_logs").insert({
        fried_at: new Date().toISOString(),
        piece_count: 0,
        note: `[SISA ETALASE TUTUP] Tersisa ${etalaseAyam} potong ayam & ${etalaseUsus} porsi usus (dibawa pulang)`,
      });

      if (error) throw error;

      // Otomatis potong stok bahan mentah gudang via FIFO
      let deductionNotes: string[] = [];
      if (etalaseAyam > 0) {
        const ayamRes = await deductRawItemFifo("ayam", etalaseAyam, "Sisa Tutup Etalase (Dibawa Pulang)");
        if (ayamRes.success) deductionNotes.push(`${etalaseAyam} ayam mentah`);
      }
      if (etalaseUsus > 0) {
        const ususRes = await deductRawItemFifo("usus", etalaseUsus, "Sisa Tutup Etalase (Dibawa Pulang)");
        if (ususRes.success) deductionNotes.push(`${etalaseUsus} usus mentah`);
      }

      const potongText = deductionNotes.length > 0
        ? ` & stok (${deductionNotes.join(" + ")}) berhasil dipotong dari gudang!`
        : "!";

      showToast(`Sisa etalase dicatat${potongText} 🌸🍗`);
      setEtalaseAyam(0);
      setEtalaseUsus(0);
      fetchFryingLogs();
    } catch (err: any) {
      alert(`Gagal menyimpan sisa etalase: ${err.message || "Error"}`);
    } finally {
      setIsSubmittingEtalase(false);
    }
  };

  // Total Ayam Digoreng Hari Ini
  const totalAyamFriedToday = fryingLogs
    .filter((l) => l.piece_count > 0 && !l.note?.toLowerCase().includes("usus"))
    .reduce((acc, l) => acc + l.piece_count, 0);

  // Total Usus Digoreng Hari Ini
  const totalUsusFriedToday = fryingLogs
    .filter((l) => l.piece_count > 0 && l.note?.toLowerCase().includes("usus"))
    .reduce((acc, l) => acc + l.piece_count, 0);

  // Total Susut / Afkir
  const totalWasteToday = fryingLogs
    .filter((l) => l.piece_count < 0)
    .reduce((acc, l) => acc + Math.abs(l.piece_count), 0);

  return (
    <div className="space-y-5 pb-10">
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl text-xs font-bold border border-emerald-400 animate-pop-in max-w-sm">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Kontrol Penggorengan & Etalase Kios
            </h1>
            <span className="text-lg">🍗🥢🔥</span>
          </div>
          <p className="text-xs text-gray-500">
            Catat batch waktu goreng (Ayam & Usus), potongan susut/rusak, dan sisa etalase saat tutup kios dengan sinkronisasi stok otomatis.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl shadow-inner">
            🍗
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Ayam Digoreng</span>
            <p className="text-lg font-black text-gray-900">{totalAyamFriedToday} <span className="text-xs font-normal">potong</span></p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-inner">
            🥢
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Usus Digoreng</span>
            <p className="text-lg font-black text-amber-700">{totalUsusFriedToday} <span className="text-xs font-normal">porsi</span></p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl shadow-inner">
            ⚠️
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Susut / Afkir</span>
            <p className="text-lg font-black text-orange-600">{totalWasteToday} <span className="text-xs font-normal">item</span></p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
            ✨
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Batch Sesi</span>
            <p className="text-lg font-black text-emerald-600">{fryingLogs.length} <span className="text-xs font-normal">sesi</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form Batch Penggorengan & Susut */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Input Batch Goreng */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Input Batch Penggorengan Baru</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Catat setiap kali mengangkat gorengan dari wajan penggorengan.
            </p>

            <form onSubmit={handleAddBatch} className="space-y-3">
              {/* Dropdown Pilihan Menu */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Pilih Menu yang Digoreng
                </label>
                <select
                  value={itemType}
                  onChange={(e) => handleItemTypeChange(e.target.value as "ayam" | "usus")}
                  className="w-full px-3 py-2 text-xs bg-pink-50/70 border border-pink-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                >
                  <option value="ayam">🍗 Ayam Goreng (Satuan: Potong)</option>
                  <option value="usus">🥢 Usus Crispy (Satuan: Porsi)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Jam Goreng
                  </label>
                  <input
                    type="time"
                    value={fryingTime}
                    onChange={(e) => setFryingTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Jumlah {itemType === "ayam" ? "Potongan" : "Porsi"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pieceCount || ""}
                    onChange={(e) => setPieceCount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-black text-rose-600 text-center text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan Batch (Opsional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={itemType === "ayam" ? "Contoh: Dada & Sayap Krispi" : "Contoh: Batch Usus Pedas / Crispy"}
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce min-h-[48px]"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Simpan Batch Goreng ({pieceCount} {itemType === "ayam" ? "potong ayam" : "porsi usus"})
                </span>
              </button>
            </form>
          </div>

          {/* Card Catat Susut / Gosong */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-500" />
              <span>Catatan Susut / Afkir / Gosong</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Catat gorengan gosong atau jatuh. <span className="font-semibold text-amber-600">Stok bahan baku mentah akan otomatis dipotong dari gudang (FIFO).</span>
            </p>

            <form onSubmit={handleAddWaste} className="space-y-3">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Jenis</label>
                  <select
                    value={wasteType}
                    onChange={(e) => setWasteType(e.target.value as "ayam" | "usus")}
                    className="w-full px-2 py-2 text-xs bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-900"
                  >
                    <option value="ayam">🍗 Ayam</option>
                    <option value="usus">🥢 Usus</option>
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={wasteCount || ""}
                    onChange={(e) => setWasteCount(Number(e.target.value) || 0)}
                    className="w-full px-2 py-2 text-xs bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-700 text-center"
                    placeholder="0"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Satuan</label>
                  <div className="px-2 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-bold text-center">
                    {wasteType === "ayam" ? "potong" : "porsi"}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Susut</label>
                <input
                  type="text"
                  value={wasteNote}
                  onChange={(e) => setWasteNote(e.target.value)}
                  placeholder="Contoh: Terlalu kering / gosong"
                  className="w-full px-3 py-2 text-xs bg-amber-50/50 border border-amber-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={wasteCount <= 0 || isSubmittingWaste}
                className="w-full py-3 bg-amber-500 text-white font-bold text-xs rounded-2xl hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>
                  {isSubmittingWaste 
                    ? "Memotong Stok..." 
                    : `Catat ${wasteType === "ayam" ? "Ayam" : "Usus"} Susut & Potong Stok (${wasteCount} ${wasteType === "ayam" ? "potong" : "porsi"})`}
                </span>
              </button>
            </form>
          </div>

          {/* Card Sisa Etalase Tutup */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-500" />
              <span>Sisa Etalase Saat Tutup Kios (Bawa Pulang)</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Catat sisa gorengan matang saat kios tutup. Sistem akan <span className="font-semibold text-rose-600">otomatis memotong stok bahan baku mentah (FIFO)</span> agar stok fisik di kulkas besok pagi 100% klop.
            </p>

            <form onSubmit={handleSaveEtalaseRemaining} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    🍗 Sisa Ayam (potong)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={etalaseAyam}
                    onChange={(e) => setEtalaseAyam(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-black text-center bg-pink-50/50 border border-pink-200 rounded-xl text-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    🥢 Sisa Usus (porsi)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={etalaseUsus}
                    onChange={(e) => setEtalaseUsus(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-black text-center bg-amber-50/50 border border-amber-200 rounded-xl text-amber-700"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmittingEtalase || (etalaseAyam <= 0 && etalaseUsus <= 0)}
                className="w-full py-3 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-sm hover:bg-rose-600 active:scale-95 transition-all btn-bounce disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                <span>
                  {isSubmittingEtalase 
                    ? "Memotong Stok Gudang..." 
                    : "Simpan & Potong Stok Sisa Bawa Pulang"}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Log Penggorengan List */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center justify-between">
            <span>Riwayat Batch Penggorengan & Etalase</span>
            <span className="text-xs font-semibold text-rose-500">{fryingLogs.length} entri</span>
          </h2>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {fryingLogs.map((log) => {
              const isWaste = log.piece_count < 0;
              const isEtalaseNote = log.piece_count === 0;
              const isUsus = log.note?.toLowerCase().includes("usus");
              const unit = isUsus ? "porsi" : "potong";
              const itemIcon = isUsus ? "🥢" : "🍗";

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    isWaste
                      ? "bg-amber-50/50 border-amber-200"
                      : isEtalaseNote
                      ? "bg-purple-50/40 border-purple-200"
                      : isUsus
                      ? "bg-amber-50/30 border-amber-100"
                      : "bg-pink-50/30 border-pink-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isWaste ? "⚠️" : isEtalaseNote ? "🪟" : itemIcon}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          isWaste
                            ? "bg-amber-200 text-amber-800"
                            : isEtalaseNote
                            ? "bg-purple-200 text-purple-800"
                            : isUsus
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {isEtalaseNote ? "Etalase" : isUsus ? "Usus" : "Ayam"}
                        </span>
                        <p className="font-bold text-gray-800">{log.note || "Batch Penggorengan"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatDateIndo(log.fried_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {isWaste ? (
                      <span className="font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl">
                        {log.piece_count} {unit}
                      </span>
                    ) : isEtalaseNote ? (
                      <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg text-[10px]">
                        Opname Etalase
                      </span>
                    ) : (
                      <span className={`font-black px-2.5 py-1 rounded-xl border ${
                        isUsus
                          ? "text-amber-700 bg-amber-50 border-amber-200"
                          : "text-rose-600 bg-rose-50 border-pink-100"
                      }`}>
                        +{log.piece_count} {unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {fryingLogs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">
                Belum ada batch penggorengan yang dicatat hari ini.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
