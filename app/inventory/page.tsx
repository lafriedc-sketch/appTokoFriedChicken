"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Clock,
  Coins,
  Edit3,
  X,
  Share2,
  AlertCircle,
  TrendingUp,
  Tag
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

  // Local storage fallback for item costs
  const [localCosts, setLocalCosts] = useState<Record<string, number>>({});

  // Modal Atur / Ubah Harga Modal
  const [priceModalItem, setPriceModalItem] = useState<{
    item: InventoryItem;
    currentPrice: number;
  } | null>(null);
  const [modalInputPrice, setModalInputPrice] = useState<number | string>("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Form Input Belanja Masuk
  const [purchaseForm, setPurchaseForm] = useState({
    item_id: "",
    qty_pack: 0, // Kuantiti berdasarkan pack/kemasan belanjaan
    qty_per_pack: 1, // Isi per pack (default 1)
    cost_total: 0,
    payment_source: "drawer" as "drawer" | "other",
  });

  // Form Stok Opname
  const [opnameCounts, setOpnameCounts] = useState<{ [itemId: string]: number }>({});

  const [feedback, setFeedback] = useState<string | null>(null);

  // Load local costs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("la_item_default_costs");
        if (stored) setLocalCosts(JSON.parse(stored));
      } catch (e) {
        console.warn("Gagal load local costs:", e);
      }
    }
  }, []);

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
    setTimeout(() => setFeedback(null), 3500);
  };

  // Helper untuk mendapatkan harga modal satuan dan total nilai stok bahan
  const getItemPriceDetails = (itemId: string, currentStock: number) => {
    const itemBatches = batches.filter((b) => b.inventory_item_id === itemId);
    const activeBatches = itemBatches.filter((b) => Number(b.remaining_qty) > 0);

    let unitCost = 0;
    let totalValue = 0;

    if (activeBatches.length > 0) {
      const totalRemaining = activeBatches.reduce((acc, b) => acc + Number(b.remaining_qty), 0);
      const totalBatchValue = activeBatches.reduce(
        (acc, b) => acc + Number(b.remaining_qty) * Number(b.cost_per_unit || 0),
        0
      );
      unitCost = totalRemaining > 0 ? Math.round(totalBatchValue / totalRemaining) : Number(activeBatches[0].cost_per_unit || 0);
      totalValue = totalBatchValue;
    } else if (itemBatches.length > 0) {
      unitCost = Number(itemBatches[0].cost_per_unit || 0);
      totalValue = Math.max(0, currentStock) * unitCost;
    } else if (localCosts[itemId]) {
      unitCost = Number(localCosts[itemId]);
      totalValue = Math.max(0, currentStock) * unitCost;
    }

    return {
      unitCost,
      totalValue,
      activeBatchesCount: activeBatches.length,
    };
  };

  // Summary Metrics
  const totalInventoryValue = useMemo(() => {
    return items.reduce((acc, it) => {
      const { totalValue } = getItemPriceDetails(it.id, Number(it.current_stock));
      return acc + totalValue;
    }, 0);
  }, [items, batches, localCosts]);

  const lowStockItems = useMemo(() => {
    return items.filter((it) => Number(it.current_stock) <= Number(it.min_stock));
  }, [items]);

  // Open Modal Atur Harga Modal
  const handleOpenPriceModal = (item: InventoryItem, currentPrice: number) => {
    setPriceModalItem({ item, currentPrice });
    setModalInputPrice(currentPrice > 0 ? currentPrice : "");
  };

  // Save Modal Harga Modal
  const handleSavePriceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalItem) return;

    const priceNum = Number(modalInputPrice) || 0;
    if (priceNum <= 0) {
      alert("Masukkan harga modal yang valid (lebih dari 0)");
      return;
    }

    try {
      setIsSavingPrice(true);
      const item = priceModalItem.item;

      // 1. Simpan ke localStorage fallback
      const updatedLocalCosts = { ...localCosts, [item.id]: priceNum };
      setLocalCosts(updatedLocalCosts);
      if (typeof window !== "undefined") {
        localStorage.setItem("la_item_default_costs", JSON.stringify(updatedLocalCosts));
      }

      // 2. Cek apakah ada batch aktif di tabel inventory_batches
      const itemBatches = batches.filter(
        (b) => b.inventory_item_id === item.id && Number(b.remaining_qty) > 0
      );

      if (itemBatches.length > 0) {
        // Update batch aktif dengan harga modal baru
        for (const b of itemBatches) {
          await supabase
            .from("inventory_batches")
            .update({ cost_per_unit: priceNum })
            .eq("id", b.id);
        }
      } else {
        // Buat batch persediaan baru agar FIFO POS langsung memakai harga ini
        const qtyToInit = Number(item.current_stock) > 0 ? Number(item.current_stock) : 1;
        await supabase.from("inventory_batches").insert({
          inventory_item_id: item.id,
          initial_qty: qtyToInit,
          remaining_qty: qtyToInit,
          cost_per_unit: priceNum,
          batch_date: new Date().toISOString(),
        });
      }

      showToast(`Harga modal ${item.name} berhasil disimpan: ${formatRupiah(priceNum)}/${item.unit} ✨`);
      setPriceModalItem(null);
      await fetchInventoryData();
    } catch (err: any) {
      alert(`Gagal menyimpan harga: ${err.message || "Error"}`);
    } finally {
      setIsSavingPrice(false);
    }
  };

  // Quick WhatsApp Restock Generator
  const handleShareWhatsAppRestock = () => {
    if (lowStockItems.length === 0) {
      showToast("Semua stok bahan masih aman! Tidak ada bahan kritis saat ini 👍");
      return;
    }

    const todayStr = formatDateIndo(new Date().toISOString());
    let msg = `*LA FRIED CHICKEN - NOTIFIKASI RESTOCK BAHAN BAKU* 🍗📦\n`;
    msg += `Waktu: ${todayStr}\n\n`;
    msg += `Halo Owner / Supplier,\n`;
    msg += `Bahan baku berikut sudah *MENIPIS / MENCAPAI BATAS MINIMUM* di kios dan butuh restock segera:\n\n`;

    lowStockItems.forEach((it, idx) => {
      const priceDetails = getItemPriceDetails(it.id, Number(it.current_stock));
      const estPrice = priceDetails.unitCost > 0 ? ` (@ ${formatRupiah(priceDetails.unitCost)}/${it.unit})` : "";
      msg += `${idx + 1}. *${it.name}*\n   Sisa: *${it.current_stock} ${it.unit}* (Batas Min: ${it.min_stock} ${it.unit})${estPrice}\n`;
    });

    msg += `\nTotal: *${lowStockItems.length} bahan baku* kritis.\n`;
    msg += `Mohon segera diproses agar operasional kios tetap lancar. Terima kasih! 🌸`;

    // Copy to clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      showToast("Format pesan restock disalin ke clipboard! Membuka WhatsApp... 📋");
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Submit Belanja Masuk
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.item_id || purchaseForm.qty_pack <= 0 || purchaseForm.qty_per_pack <= 0) {
      alert("Pilih bahan dan masukkan jumlah belanja yang valid");
      return;
    }

    try {
      const selectedItem = items.find((it) => it.id === purchaseForm.item_id);
      if (!selectedItem) return;

      // Hitung total unit yang didapat: Jumlah Pack Beli * Isi per Pack
      const totalUnitsGained = Number(purchaseForm.qty_pack) * Number(purchaseForm.qty_per_pack);
      const costTotalNum = Number(purchaseForm.cost_total);
      
      // HPP Satuan = Total Modal / Total Unit (otomatis dihitung sistem)
      const costPerUnit = totalUnitsGained > 0 ? Math.round(costTotalNum / totalUnitsGained) : 0;
      const batchDate = new Date().toISOString();

      // 1. Insert Inventory Log
      const { error: logErr } = await supabase.from("inventory_logs").insert({
        item_id: purchaseForm.item_id,
        change_qty: totalUnitsGained,
        type: "in",
        cost_total: costTotalNum,
        payment_source: purchaseForm.payment_source,
      });

      if (logErr) throw logErr;

      // 2. Insert data baru ke tabel inventory_batches (FIFO)
      const { error: batchErr } = await supabase.from("inventory_batches").insert({
        inventory_item_id: purchaseForm.item_id,
        initial_qty: totalUnitsGained,
        remaining_qty: totalUnitsGained,
        cost_per_unit: costPerUnit,
        batch_date: batchDate,
      });

      if (batchErr) {
        console.error("Gagal menyimpan inventory_batches:", batchErr);
      }

      // Simpan juga ke localStorage fallback
      if (costPerUnit > 0) {
        const updatedLocal = { ...localCosts, [purchaseForm.item_id]: costPerUnit };
        setLocalCosts(updatedLocal);
        if (typeof window !== "undefined") {
          localStorage.setItem("la_item_default_costs", JSON.stringify(updatedLocal));
        }
      }

      // 3. Update Item Current Stock
      const newStock = Number(selectedItem.current_stock) + totalUnitsGained;
      const { error: updateErr } = await supabase
        .from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", purchaseForm.item_id);

      if (updateErr) throw updateErr;

      showToast(`Belanja ${selectedItem.name} berhasil! Masuk +${totalUnitsGained} ${selectedItem.unit} dengan HPP ${formatRupiah(costPerUnit)}/${selectedItem.unit} 🌸`);
      setPurchaseForm({
        item_id: items[0]?.id || "",
        qty_pack: 0,
        qty_per_pack: 1,
        cost_total: 0,
        payment_source: "drawer",
      });
      fetchInventoryData();
    } catch (err: any) {
      alert(`Gagal menyimpan belanja: ${err.message || "Error"}`);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-2xl shadow-xl text-xs font-bold border border-emerald-400 animate-pop-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header Info - Dirapikan untuk Mobile */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-pink-100 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-lg sm:text-xl font-black text-gray-800 leading-tight">
                Inventaris & Stok 📦
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed pr-2">
              Pantau sisa bahan, nilai aset persediaan, dan catat belanja harian kios.
            </p>
          </div>

          {/* Action Button: WhatsApp Restock Alert */}
          {lowStockItems.length > 0 && (
            <button
              type="button"
              onClick={handleShareWhatsAppRestock}
              className="self-start sm:self-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-200 flex items-center gap-2 transition-all btn-bounce"
            >
              <span>📱</span>
              <span>WA Restock ({lowStockItems.length} Kritis)</span>
            </button>
          )}
        </div>
      </div>

      {/* ALERT NOTIFIKASI STOK MENIPIS / MINIMUM */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900">
                    🚨 Peringatan: {lowStockItems.length} Bahan Baku Menipis / Mencapai Batas Minimum!
                  </h2>
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                    Kritis
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Stok saat ini sudah berada di batas minimum atau di bawahnya. Segera catat belanja bahan agar dapur tidak kekurangan pasokan.
                </p>

                {/* Badges of Low Stock Items */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {lowStockItems.map((it) => (
                    <span
                      key={it.id}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                    >
                      <span>⚠️ {it.name}:</span>
                      <strong className="text-rose-600">{it.current_stock}</strong> / Min {it.min_stock} {it.unit}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Restock CTA */}
            <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (lowStockItems.length > 0) {
                    setPurchaseForm((prev) => ({ ...prev, item_id: lowStockItems[0].id }));
                  }
                  setActiveTab("purchase");
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>+ Belanja Bahan</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsAppRestock}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce"
                title="Kirim daftar kebutuhan belanja via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WA Supplier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY STATS PERSINGKATAN NILAI ASET STOK */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Macam Bahan */}
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 text-rose-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Total Bahan Baku</span>
            <span className="text-lg font-black text-gray-800">{items.length} Macam</span>
          </div>
        </div>

        {/* Total Nilai Aset Stok */}
        <div className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Total Nilai Persediaan</span>
            <span className="text-lg font-black text-emerald-600">{formatRupiah(totalInventoryValue)}</span>
          </div>
        </div>

        {/* Status Stok Kios */}
        <div className={`col-span-2 sm:col-span-1 bg-white rounded-3xl p-4 border shadow-sm flex items-center gap-3 ${
          lowStockItems.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-pink-100"
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            lowStockItems.length > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
          }`}>
            {lowStockItems.length > 0 ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Status Kebutuhan Stok</span>
            <span className={`text-sm font-black ${lowStockItems.length > 0 ? "text-amber-700" : "text-emerald-600"}`}>
              {lowStockItems.length > 0 ? `${lowStockItems.length} Menipis (Restock Segera)` : "Semua Bahan Aman"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { 
            key: "items", 
            label: "Status Stok Bahan", 
            icon: Package, 
            badge: lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : undefined 
          },
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
              className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all btn-bounce flex items-center gap-1.5 ${
                isActive
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                  : "bg-pink-50/80 text-gray-700 hover:bg-pink-100 border border-pink-100"
              }`}
            >
              <Icon className="w-4 sm:w-4 h-4 sm:h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
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
              const priceInfo = getItemPriceDetails(it.id, Number(it.current_stock));

              return (
                <div
                  key={it.id}
                  className={`bg-white rounded-3xl p-4 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                    isLow ? "border-amber-300 bg-amber-50/20 ring-1 ring-amber-300" : "border-pink-100"
                  }`}
                >
                  <div>
                    {/* Item Title & Low Alert Badge */}
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="font-extrabold text-sm text-gray-800">{it.name}</h3>
                      {isLow ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Menipis</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full shrink-0">
                          Aman
                        </span>
                      )}
                    </div>

                    {/* Current Stock Quantity */}
                    <div className="flex items-baseline gap-1 my-1.5">
                      <span className="text-2xl font-black text-gray-900">
                        {it.current_stock}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        {it.unit}
                      </span>
                    </div>

                    {/* Harga Modal Satuan & Total Nilai Persediaan */}
                    <div className="bg-pink-50/40 rounded-2xl p-2.5 my-2.5 border border-pink-100/70 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-medium">Harga Modal:</span>
                        <div className="flex items-center gap-1">
                          {priceInfo.unitCost > 0 ? (
                            <span className="font-black text-gray-800">
                              {formatRupiah(priceInfo.unitCost)}
                              <span className="text-[10px] text-gray-400 font-normal">/{it.unit}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic font-medium">
                              Belum diatur
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenPriceModal(it, priceInfo.unitCost)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Atur atau ubah harga modal bahan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-pink-100/60">
                        <span className="text-gray-500 font-medium">Estimasi Nilai Stok:</span>
                        <span className="font-black text-rose-600">
                          {formatRupiah(priceInfo.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Min Stock & Quick Belanja */}
                  <div className="pt-2 border-t border-pink-100 text-[11px] text-gray-500 flex items-center justify-between">
                    <div>
                      <span>Batas Min: </span>
                      <span className="font-bold text-gray-700">
                        {it.min_stock} {it.unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPurchaseForm((prev) => ({ ...prev, item_id: it.id }));
                        setActiveTab("purchase");
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-0.5"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>+ Belanja</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CATAT BELANJA MASUK (DIUPGRADE DENGAN PERHITUNGAN MULTIPLIER KEMASAN) */}
      {activeTab === "purchase" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-1 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-rose-500" />
            <span>Form Pencatatan Belanja Stok Bahan</span>
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Otomatis menghitung HPP (Harga Pokok Penjualan) bahan sampai ke satuan terkecil. Jika beli per pack, sistem yang akan mecah isinya dan menghitung modal satuannya buat lu.
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
                    {it.name} (Stok di Gudang: {it.current_stock} {it.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Jumlah Belanja Berapa Bungkus/Pack */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Berapa Pack/Bungkus?
                </label>
                <div className="flex items-center bg-pink-50/50 border border-pink-200 rounded-2xl focus-within:ring-2 focus-within:ring-rose-400 overflow-hidden">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={purchaseForm.qty_pack || ""}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, qty_pack: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-sm font-black bg-transparent text-right outline-none"
                    placeholder="Contoh: 15"
                    required
                  />
                  <span className="px-3 py-3 text-xs font-bold text-gray-500 bg-pink-100/50 border-l border-pink-200">
                    Bks
                  </span>
                </div>
              </div>

              {/* Isi Dalam 1 Bungkus/Pack */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 text-rose-600">
                  Isi per 1 Bungkus?
                </label>
                <div className="flex items-center bg-pink-50/50 border border-pink-200 rounded-2xl focus-within:ring-2 focus-within:ring-rose-400 overflow-hidden">
                  <span className="px-3 py-3 text-xs font-bold text-gray-500 bg-pink-100/50 border-r border-pink-200">
                    Isi
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={purchaseForm.qty_per_pack || ""}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, qty_per_pack: Number(e.target.value) || 1 })}
                    className="w-full px-4 py-3 text-sm font-black bg-transparent text-right outline-none text-rose-600"
                    placeholder="Contoh: 100"
                    required
                  />
                  <span className="px-3 py-3 text-[11px] font-bold text-gray-500 bg-pink-100/50 border-l border-pink-200 truncate max-w-[60px]">
                    {items.find((i) => i.id === purchaseForm.item_id)?.unit || "pcs"}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Biaya Belanja Keseluruhan */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Total Biaya Belanja (Rp)
              </label>
              <input
                type="number"
                value={purchaseForm.cost_total || ""}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, cost_total: Number(e.target.value) || 0 })}
                className="w-full px-4 py-3 text-sm font-black text-rose-600 bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400 text-right"
                placeholder="Contoh: 225000"
                required
              />
              <span className="text-[10px] text-gray-500 block text-right mt-1">
                {formatRupiah(purchaseForm.cost_total)}
              </span>
            </div>

            {/* LIVE PREVIEW HASIL KALKULASI OTOMATIS */}
            {purchaseForm.qty_pack > 0 && purchaseForm.qty_per_pack > 0 && purchaseForm.cost_total > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-2 animate-pop-in">
                <span className="font-extrabold text-emerald-800 flex items-center gap-1.5 text-xs mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Kalkulasi Otomatis Sistem:</span>
                </span>
                
                <div className="flex justify-between items-center text-xs border-b border-emerald-100 pb-2">
                  <span className="text-emerald-700">Total Stok Masuk Gudang:</span>
                  <span className="font-black text-emerald-800 text-sm">
                    {Number(purchaseForm.qty_pack) * Number(purchaseForm.qty_per_pack)} {items.find((i) => i.id === purchaseForm.item_id)?.unit || "unit"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-emerald-700">Modal Satuan (HPP Terkecil):</span>
                  <span className="font-black text-rose-600 text-sm">
                    {formatRupiah(Math.round(purchaseForm.cost_total / (Number(purchaseForm.qty_pack) * Number(purchaseForm.qty_per_pack))))} <span className="text-[10px] text-emerald-700 font-bold">/ {items.find((i) => i.id === purchaseForm.item_id)?.unit || "unit"}</span>
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
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
              className="w-full py-4 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px] mt-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Catatan Belanja</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: BATCH STOK FIFO */}
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
              <div className="text-center py-8 text-xs text-gray-400">
                Belum ada batch belanja bahan. Masukkan belanja di tab "Catat Belanja Masuk" atau atur harga modal untuk membuat batch FIFO.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STOK OPNAME FISIK */}
      {activeTab === "opname" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-2xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-1 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-rose-500" />
            <span>Stok Opname Tutup Kios LA Fried Chicken</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Hitung fisik riil sisa bahan saat kios tutup. Sistem akan mencatat penyesuaian stok dan menghitung estimasi pemakaian bahan secara akurat.
          </p>

          <form onSubmit={handleOpnameSubmit} className="space-y-3">
            <div className="space-y-2.5">
              {items.map((it) => {
                const physicalVal = opnameCounts[it.id] ?? it.current_stock;
                const used = Number(it.current_stock) - Number(physicalVal);
                const priceInfo = getItemPriceDetails(it.id, Number(it.current_stock));

                return (
                  <div
                    key={it.id}
                    className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-gray-800">{it.name}</h4>
                      <p className="text-[10px] text-gray-500">
                        Tercatat di sistem: <span className="font-bold">{it.current_stock} {it.unit}</span>
                        {priceInfo.unitCost > 0 && ` (@ ${formatRupiah(priceInfo.unitCost)})`}
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
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                            used > 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
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

      {/* TAB 5: RIWAYAT PERGERAKAN */}
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

      {/* MODAL ATUR / UBAH HARGA MODAL SATUAN */}
      {priceModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-pink-100 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-rose-600 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-800">
                    Atur Harga Modal
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {priceModalItem.item.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriceModalItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePriceModal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Harga Modal Satuan (Rp / {priceModalItem.item.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={modalInputPrice}
                  onChange={(e) => setModalInputPrice(e.target.value)}
                  placeholder="Contoh: 6500"
                  className="w-full px-4 py-3 text-base font-black text-rose-600 bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400 text-right"
                  required
                  autoFocus
                />
                <span className="text-[11px] font-bold text-gray-500 block text-right mt-1">
                  {formatRupiah(Number(modalInputPrice) || 0)} / {priceModalItem.item.unit}
                </span>
              </div>

              <div className="bg-pink-50/60 rounded-2xl p-3 text-[11px] text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Stok Sekarang:</span>
                  <span className="font-bold text-gray-800">
                    {priceModalItem.item.current_stock} {priceModalItem.item.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimasi Total Nilai:</span>
                  <span className="font-bold text-rose-600">
                    {formatRupiah(
                      Number(priceModalItem.item.current_stock) * (Number(modalInputPrice) || 0)
                    )}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 italic">
                💡 Harga modal ini akan dipakai oleh sistem FIFO POS untuk menghitung HPP laba bersih dan nilai aset stok kios.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPriceModalItem(null)}
                  className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice}
                  className="flex-1 py-3 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPrice ? "Menyimpan..." : "Simpan Harga"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
