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
  Layers
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { FryingLog } from "@/types";
import { formatDateIndo, formatTimeOnly } from "@/lib/utils";

export default function FryingPage() {
  const [fryingLogs, setFryingLogs] = useState<FryingLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form input batch baru
  const [pieceCount, setPieceCount] = useState<number>(20);
  const [fryingTime, setFryingTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [note, setNote] = useState<string>("Batch Reguler (Dada, Paha, Sayap)");

  // Form susut / afkir
  const [wasteCount, setWasteCount] = useState<number>(0);
  const [wasteNote, setWasteNote] = useState<string>("Potongan gosong / tidak layak");

  // Form sisa etalase saat tutup
  const [etalaseRemaining, setEtalaseRemaining] = useState<number>(0);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchFryingLogs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("frying_logs")
        .select("*")
        .order("fried_at", { ascending: false })
        .limit(30);

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
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Submit Batch Penggorengan Baru
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pieceCount <= 0) return;

    try {
      const now = new Date();
      const [hours, minutes] = fryingTime.split(":");
      now.setHours(Number(hours), Number(minutes), 0, 0);

      const { error } = await supabase.from("frying_logs").insert({
        fried_at: now.toISOString(),
        piece_count: Number(pieceCount),
        note: note.trim() || "Batch Penggorengan",
      });

      if (error) throw error;
      showToast(`Batch goreng ${pieceCount} potong ayam berhasil dicatat! 🍗✨`);
      setPieceCount(20);
      setNote("Batch Reguler");
      fetchFryingLogs();
    } catch (err: any) {
      alert(`Gagal mencatat batch: ${err.message || "Error"}`);
    }
  };

  // Submit Ayam Susut / Afkir
  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wasteCount <= 0) return;

    try {
      const { error } = await supabase.from("frying_logs").insert({
        fried_at: new Date().toISOString(),
        piece_count: -Math.abs(wasteCount), // negative for waste
        note: `[SUSUT/AFKIR] ${wasteNote.trim()}`,
      });

      if (error) throw error;
      showToast(`Catatan susut ${wasteCount} potong dicatat!`);
      setWasteCount(0);
      setWasteNote("");
      fetchFryingLogs();
    } catch (err: any) {
      alert(`Gagal mencatat susut: ${err.message || "Error"}`);
    }
  };

  // Submit Sisa Etalase saat Tutup
  const handleSaveEtalaseRemaining = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("frying_logs").insert({
        fried_at: new Date().toISOString(),
        piece_count: 0,
        note: `[SISA ETALASE TUTUP] Tersisa ${etalaseRemaining} potong ayam`,
      });

      if (error) throw error;
      showToast(`Sisa etalase ${etalaseRemaining} potong berhasil disimpan! 🌸`);
      fetchFryingLogs();
    } catch (err: any) {
      alert(`Gagal menyimpan sisa etalase: ${err.message || "Error"}`);
    }
  };

  // Total Ayam Digoreng Hari Ini
  const totalFriedToday = fryingLogs
    .filter((l) => l.piece_count > 0)
    .reduce((acc, l) => acc + l.piece_count, 0);

  const totalWasteToday = fryingLogs
    .filter((l) => l.piece_count < 0)
    .reduce((acc, l) => acc + Math.abs(l.piece_count), 0);

  return (
    <div className="space-y-5 pb-10">
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-2xl shadow-xl text-xs font-bold border border-emerald-400 animate-pop-in">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Kontrol Penggorengan & Etalase Ayam
            </h1>
            <span className="text-lg">🍗🔥</span>
          </div>
          <p className="text-xs text-gray-500">
            Catat batch waktu goreng, potongan ayam susut/rusak, dan sisa etalase saat tutup kios.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl shadow-inner">
            🍗
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Total Digoreng</span>
            <p className="text-xl font-black text-gray-900">{totalFriedToday} <span className="text-xs font-normal">potong</span></p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-inner">
            ⚠️
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Susut / Afkir</span>
            <p className="text-xl font-black text-amber-600">{totalWasteToday} <span className="text-xs font-normal">potong</span></p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
            ✨
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Batch Sesi</span>
            <p className="text-xl font-black text-emerald-600">{fryingLogs.length} <span className="text-xs font-normal">sesi</span></p>
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
            <p className="text-xs text-gray-500 mb-4">
              Catat setiap kali mengangkat ayam goreng dari wajan penggorengan.
            </p>

            <form onSubmit={handleAddBatch} className="space-y-3">
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
                    Jumlah Potongan
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
                  placeholder="Contoh: Batch Pagi Dada & Sayap"
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce min-h-[48px]"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Batch Goreng ({pieceCount} pcs)</span>
              </button>
            </form>
          </div>

          {/* Card Catat Susut / Gosong */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-500" />
              <span>Catatan Ayam Susut / Afkir</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Catat ayam gosong, jatuh, atau tidak layak jual.
            </p>

            <form onSubmit={handleAddWaste} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={wasteCount || ""}
                    onChange={(e) => setWasteCount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-700 text-center"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Susut</label>
                  <input
                    type="text"
                    value={wasteNote}
                    onChange={(e) => setWasteNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-amber-50/50 border border-amber-200 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={wasteCount <= 0}
                className="w-full py-3 bg-amber-500 text-white font-bold text-xs rounded-2xl hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
              >
                Catat Ayam Susut
              </button>
            </form>
          </div>

          {/* Card Sisa Etalase Tutup */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-500" />
              <span>Sisa Ayam Etalase Saat Tutup</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Cek fisik sisa potongan ayam siap saji di etalase kaca saat kios tutup.
            </p>

            <form onSubmit={handleSaveEtalaseRemaining} className="flex gap-2">
              <input
                type="number"
                min="0"
                value={etalaseRemaining}
                onChange={(e) => setEtalaseRemaining(Number(e.target.value) || 0)}
                className="w-24 px-3 py-2 text-xs font-black text-center bg-pink-50/50 border border-pink-200 rounded-xl"
              />
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-rose-600 btn-bounce"
              >
                Simpan Sisa Etalase
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

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    isWaste
                      ? "bg-amber-50/50 border-amber-200"
                      : isEtalaseNote
                      ? "bg-purple-50/40 border-purple-200"
                      : "bg-pink-50/30 border-pink-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isWaste ? "⚠️" : isEtalaseNote ? "🪟" : "🍗"}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{log.note || "Batch Penggorengan"}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatDateIndo(log.fried_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {isWaste ? (
                      <span className="font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl">
                        {log.piece_count} potong
                      </span>
                    ) : isEtalaseNote ? (
                      <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg text-[10px]">
                        Opname Etalase
                      </span>
                    ) : (
                      <span className="font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-pink-100">
                        +{log.piece_count} potong
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
