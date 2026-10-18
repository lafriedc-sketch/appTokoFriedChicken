"use client";

import React, { useEffect, useState } from "react";
import { 
  Package, 
  ShoppingCart, 
  ClipboardCheck, 
  AlertTriangle, 
  ArrowDownRight, 
  History, 
  CheckCircle2, 
  Save, 
  Wallet,
  Sparkles,
  Layers,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { InventoryItem, InventoryLog, InventoryBatch } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"items" | "purchase" | "opname" | "batches" | "logs">("items");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Input Belanja Masuk
  const [purchaseForm, setPurchaseForm] = useState({
    item_id: "",
    qty: 0,
    cost_total: 0,
    payment_source: "drawer" as "drawer" | "other",
  });

  // Form Stok Opname
  const [opnameCounts, setOpnameCounts] = useState<{ [itemId: string]: number }>({});

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      // 1. Fetch items
      const { data: itemData } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });

      if (itemData) {
        setItems(itemData);
        // Initialize opname counts with current stock
        const initialOpname: { [id: string]: number } = {};
        itemData.forEach((it) => {
          initialOpname[it.id] = it.current_stock;
        });
        setOpnameCounts(initialOpname);

        if (itemData.length > 0 && !purchaseForm.item_id) {
          setPurchaseForm((prev) => ({ ...prev, item_id: itemData[0].id }));
        }
      }

      // 2. Fetch logs
      const { data: logData } = await supabase
        .from("inventory_logs")
        .select(`
          id,
          item_id,
          change_qty,
          type,
          cost_total,
          payment_source,
          created_at,
          inventory_items (id, name, unit)
        `)
        .order("created_at", { ascending: false })
        .limit(30);

      if (logData) {
        const formattedLogs: any[] = logData.map((l: any) => ({
          ...l,
          item: l.inventory_items,
        }));
        setLogs(formattedLogs);
      }

      // 3. Fetch inventory batches (FIFO)
      const { data: batchData } = await supabase
        .from("inventory_batches")
        .select(`
          id,
          inventory_item_id,
          batch_date,
          initial_qty,
          remaining_qty,
          cost_per_unit,
          created_at,
          inventory_items (id, name, unit)
        `)
        .order("batch_date", { ascending: false });

      if (batchData) {
        const formattedBatches: any[] = batchData.map((b: any) => ({
          ...b,
          inventory_item: b.inventory_items,
        }));
        setBatches(formattedBatches);
      }
    } catch (err) {
      console.error("Gagal load inventaris:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Submit Belanja Masuk
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.item_id || purchaseForm.qty <= 0) {
      alert("Pilih bahan dan masukkan jumlah belanja yang valid");
      return;
    }

    try {
      const selectedItem = items.find((it) => it.id === purchaseForm.item_id);
      if (!selectedItem) return;

      const qtyNum = Number(purchaseForm.qty);
      const costTotalNum = Number(purchaseForm.cost_total);
      const costPerUnit = qtyNum > 0 ? costTotalNum / qtyNum : 0;
      const batchDate = new Date().toISOString();

      // 1. Insert Inventory Log
      const { error: logErr } = await supabase.from("inventory_logs").insert({
        item_id: purchaseForm.item_id,
        change_qty: qtyNum,
        type: "in",
        cost_total: costTotalNum,
        payment_source: purchaseForm.payment_source,
      });

      if (logErr) throw logErr;

      // 2. Insert data baru ke tabel inventory_batches (FIFO)
      const { error: batchErr } = await supabase.from("inventory_batches").insert({
        inventory_item_id: purchaseForm.item_id,
        initial_qty: qtyNum,
        remaining_qty: qtyNum,
        cost_per_unit: costPerUnit,
        batch_date: batchDate,
      });

      if (batchErr) {
        console.error("Gagal menyimpan inventory_batches:", batchErr);
      }

      // 3. Update Item Current Stock
      const newStock = Number(selectedItem.current_stock) + qtyNum;
      const { error: updateErr } = await supabase
        .from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", purchaseForm.item_id);

      if (updateErr) throw updateErr;

      showToast(`Belanja ${selectedItem.name} berhasil dicatat & batch FIFO dibuat! (+${qtyNum} ${selectedItem.unit} @ ${formatRupiah(costPerUnit)}) 🌸`);
      setPurchaseForm({
        item_id: items[0]?.id || "",
        qty: 0,
        cost_total: 0,
        payment_source: "drawer",
      });
      fetchInventoryData();
    } catch (err: any) {
      alert(`Gagal menyimpan belanja: ${err.message || "Error"}`);
    }
  };

  // Submit Stok Opname Tutup Kios
  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    try {
      for (const item of items) {
        const physical = Number(opnameCounts[item.id] ?? item.current_stock);
        const difference = physical - Number(item.current_stock);

        if (difference !== 0) {
          // Log opname adjustment
          await supabase.from("inventory_logs").insert({
            item_id: item.id,
            change_qty: difference,
            type: "opname",
            cost_total: 0,
            payment_source: "other",
          });

          // Update current stock to physical
          await supabase
            .from("inventory_items")
            .update({ current_stock: physical })
            .eq("id", item.id);
        }
      }

      showToast("Hasil Stok Opname tutup kios berhasil diperbarui! ✨");
      fetchInventoryData();
    } catch (err: any) {
      alert(`Gagal menyimpan opname: ${err.message || "Error"}`);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-2xl shadow-xl text-xs font-bold border border-emerald-400 animate-pop-in">
          {feedback}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Inventaris Bahan & Stok Opname
            </h1>
            <span className="text-lg">📦🌸</span>
          </div>
          <p className="text-xs text-gray-500">
            Kontrol stok bahan baku kios, catat belanja bahan harian, dan opname fisik tutup kios.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: "items", label: "Status Stok Bahan", icon: Package },
          { key: "purchase", label: "Catat Belanja Masuk", icon: ShoppingCart },
          { key: "batches", label: "Batch Stok (FIFO)", icon: Layers },
          { key: "opname", label: "Stok Opname Fisik", icon: ClipboardCheck },
          { key: "logs", label: "Riwayat Pergerakan", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all btn-bounce ${
                isActive
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                  : "bg-white text-gray-700 border border-pink-100 hover:bg-pink-50/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STATUS STOK BAHAN */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((it) => {
              const isLow = Number(it.current_stock) <= Number(it.min_stock);

              return (
                <div
                  key={it.id}
                  className={`bg-white rounded-3xl p-4 border shadow-sm flex flex-col justify-between transition-all ${
                    isLow ? "border-amber-300 bg-amber-50/30" : "border-pink-100"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <h3 className="font-extrabold text-sm text-gray-800">{it.name}</h3>
                      {isLow ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Hampir Habis</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                          Aman
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-2xl font-black text-gray-900">
                        {it.current_stock}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        {it.unit}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-pink-100 text-[11px] text-gray-500 flex justify-between">
                    <span>Batas Minimum:</span>
                    <span className="font-semibold text-gray-700">
                      {it.min_stock} {it.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CATAT BELANJA MASUK */}
      {activeTab === "purchase" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-1 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-rose-500" />
            <span>Form Pencatatan Belanja Stok Bahan</span>
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Setiap belanja bahan baku akan menambah kuantiti stok dan jika dibayar dari laci kasir, saldo laci akan otomatis terpotong saat rekonsiliasi.
          </p>

          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Pilih Bahan Baku
              </label>
              <select
                value={purchaseForm.item_id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, item_id: e.target.value })}
                className="w-full px-4 py-3 text-xs bg-pink-50/50 border border-pink-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
                required
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} (Sisa: {it.current_stock} {it.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Jumlah Kuantiti Masuk
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={purchaseForm.qty || ""}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-3 text-sm font-black bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400 text-right"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Total Biaya Belanja (Rp)
                </label>
                <input
                  type="number"
                  value={purchaseForm.cost_total || ""}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, cost_total: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-3 text-sm font-black text-rose-600 bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400 text-right"
                  placeholder="0"
                  required
                />
                <span className="text-[10px] text-gray-500 block text-right mt-1">
                  {formatRupiah(purchaseForm.cost_total)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Sumber Dana Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurchaseForm({ ...purchaseForm, payment_source: "drawer" })}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all btn-bounce ${
                    purchaseForm.payment_source === "drawer"
                      ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                      : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Tunai Laci Kasir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseForm({ ...purchaseForm, payment_source: "other" })}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all btn-bounce ${
                    purchaseForm.payment_source === "other"
                      ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                      : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50"
                  }`}
                >
                  <span>Non-Tunai / Pribadi</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {purchaseForm.payment_source === "drawer"
                  ? "Pengeluaran ini akan memotong target saldo uang fisik di laci kasir."
                  : "Pengeluaran tidak mempengaruhi uang fisik di laci kasir."}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Catatan Belanja</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB: BATCH STOK FIFO */}
      {activeTab === "batches" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-4xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-rose-500" />
                <span>Daftar Batch Persediaan FIFO</span>
              </h2>
              <p className="text-xs text-gray-500">
                Sistem otomatis memotong stok dari batch tertua dengan remaining_qty &gt; 0 secara berurutan dan menghitung modal HPP aktual.
              </p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-pink-50 border border-pink-200 px-3 py-1 rounded-full self-start sm:self-auto">
              {batches.filter((b) => Number(b.remaining_qty) > 0).length} Batch Aktif
            </span>
          </div>

          <div className="space-y-2.5">
            {batches.map((b) => {
              const hasStock = Number(b.remaining_qty) > 0;
              const unit = b.inventory_item?.unit || "";
              const percentLeft = Number(b.initial_qty) > 0 ? ((Number(b.remaining_qty) / Number(b.initial_qty)) * 100).toFixed(0) : "0";

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    hasStock
                      ? "bg-white border-pink-200 shadow-2xs hover:border-rose-300"
                      : "bg-gray-50/70 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-800 text-xs">
                          {b.inventory_item?.name || "Bahan Baku"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            hasStock
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {hasStock ? `Sisa ${percentLeft}%` : "Habis"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Tgl Batch: {formatDateIndo(b.batch_date || b.created_at)}</span>
                        </span>
                        <span>&bull;</span>
                        <span>Modal Satuan: <strong className="text-gray-700">{formatRupiah(b.cost_per_unit)}</strong>/{unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Sisa / Masuk:</span>
                        <span className="text-xs font-black text-gray-900">
                          <strong className={hasStock ? "text-rose-600" : "text-gray-500"}>
                            {b.remaining_qty}
                          </strong>
                          {" "}/ {b.initial_qty} {unit}
                        </span>
                      </div>
                      <div className="border-l border-gray-100 pl-4">
                        <span className="text-[10px] text-gray-400 block font-medium">Sisa Nilai Batch:</span>
                        <span className="text-xs font-black text-rose-600">
                          {formatRupiah(Number(b.remaining_qty) * Number(b.cost_per_unit || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {batches.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs bg-pink-50/30 rounded-2xl border border-dashed border-pink-200">
                Belum ada batch belanja bahan. Masukkan belanja di tab "Catat Belanja Masuk" untuk membuat batch FIFO baru.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STOK OPNAME FISIK */}
      {activeTab === "opname" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-2xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-1 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-rose-500" />
            <span>Stok Opname Tutup Kios LA Fried Chicken</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Hitung fisik riil sisa bahan saat kios tutup. Sistem akan menghitung estimasi pemakaian bahan secara akurat.
          </p>

          <form onSubmit={handleOpnameSubmit} className="space-y-3">
            <div className="space-y-2.5">
              {items.map((it) => {
                const physicalVal = opnameCounts[it.id] ?? it.current_stock;
                const used = Number(it.current_stock) - Number(physicalVal);

                return (
                  <div
                    key={it.id}
                    className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-gray-800">{it.name}</h4>
                      <p className="text-[10px] text-gray-500">
                        Tercatat di sistem: <span className="font-bold">{it.current_stock} {it.unit}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-gray-600">Sisa Fisik:</span>
                        <input
                          type="number"
                          step="any"
                          value={physicalVal}
                          onChange={(e) =>
                            setOpnameCounts({
                              ...opnameCounts,
                              [it.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-2 py-1.5 text-xs font-bold text-center bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
                        />
                        <span className="text-[10px] font-semibold text-gray-500">{it.unit}</span>
                      </div>

                      {used !== 0 && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          used > 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {used > 0 ? `Terpakai: ${used}` : `Lebih: +${Math.abs(used)}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px] mt-4"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Hasil Stok Opname Tutup Kios</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: RIWAYAT PERGERAKAN */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-rose-500" />
            <span>Riwayat Log Pergerakan Bahan Baku</span>
          </h2>

          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-pink-50/30 rounded-2xl border border-pink-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {log.item?.name || "Bahan"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.type === "in"
                          ? "bg-emerald-100 text-emerald-700"
                          : log.type === "opname"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.type === "in" ? "Belanja Masuk" : log.type === "opname" ? "Opname" : "Keluar"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {formatDateIndo(log.created_at)} &bull; Sumber: {log.payment_source === "drawer" ? "Laci Kasir" : "Lainnya"}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`font-black ${log.change_qty > 0 ? "text-emerald-600" : "text-gray-700"}`}>
                    {log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty} {log.item?.unit || ""}
                  </span>
                  {Number(log.cost_total) > 0 && (
                    <p className="text-[11px] font-bold text-rose-600 mt-0.5">
                      {formatRupiah(log.cost_total)}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                Belum ada pergerakan bahan yang dicatat.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
