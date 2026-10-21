"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Package, 
  ShoppingCart, 
  ClipboardCheck, 
  AlertTriangle, 
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
  TrendingUp,
  Lock,
  Unlock,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { InventoryItem, InventoryLog, InventoryBatch, StoreSettings } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export default function InventoryPage() {
  // KEAMANAN PIN ADMIN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [adminPinValid, setAdminPinValid] = useState("1234");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // INVENTORY STATE
  const [activeTab, setActiveTab] = useState<"items" | "purchase" | "opname" | "batches" | "logs">("items");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [localCosts, setLocalCosts] = useState<Record<string, number>>({});
  const [priceModalItem, setPriceModalItem] = useState<{ item: InventoryItem; currentPrice: number; } | null>(null);
  const [modalInputPrice, setModalInputPrice] = useState<number | string>("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    item_id: "",
    qty_pack: 0,
    qty_per_pack: 1,
    cost_total: 0,
    payment_source: "drawer" as "drawer" | "other",
  });

  const [opnameCounts, setOpnameCounts] = useState<{ [itemId: string]: number }>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  // CEK SESSION STORAGE UNTUK LOGIN GLOBAL & AMBIL PIN DARI DB
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("admin_pin")
          .limit(1)
          .maybeSingle();
        
        if (data && data.admin_pin) {
          setAdminPinValid(data.admin_pin);
        }

        // Cek apakah sudah ada session login aktif di tab Admin
        if (typeof window !== "undefined") {
          const authSession = sessionStorage.getItem("la_admin_auth");
          if (authSession === "true") {
            setIsAuthenticated(true);
            fetchInventoryData(); // Langsung load data jika sudah login
          }
        }
      } catch (err) {
        console.warn("Gagal load setting PIN:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  // LOAD LOCAL COSTS
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("la_item_default_costs");
        if (stored) setLocalCosts(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const { data: itemData } = await supabase.from("inventory_items").select("*").order("name", { ascending: true });
      if (itemData) {
        setItems(itemData);
        const initialOpname: { [id: string]: number } = {};
        itemData.forEach((it) => { initialOpname[it.id] = it.current_stock; });
        setOpnameCounts(initialOpname);
        if (itemData.length > 0 && !purchaseForm.item_id) {
          setPurchaseForm((prev) => ({ ...prev, item_id: itemData[0].id }));
        }
      }

      const { data: logData } = await supabase.from("inventory_logs").select(`id, item_id, change_qty, type, cost_total, payment_source, created_at, inventory_items (id, name, unit)`).order("created_at", { ascending: false }).limit(30);
      if (logData) {
        const formattedLogs: any[] = logData.map((l: any) => ({ ...l, item: l.inventory_items }));
        setLogs(formattedLogs);
      }

      const { data: batchData } = await supabase.from("inventory_batches").select(`id, inventory_item_id, batch_date, initial_qty, remaining_qty, cost_per_unit, created_at, inventory_items (id, name, unit)`).order("batch_date", { ascending: false });
      if (batchData) {
        const formattedBatches: any[] = batchData.map((b: any) => ({ ...b, inventory_item: b.inventory_items }));
        setBatches(formattedBatches);
      }
    } catch (err) {
      console.error("Gagal load inventaris:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleVerifyPin = () => {
    if (pinInput === adminPinValid) {
      setIsAuthenticated(true);
      setPinError("");
      // Simpan status login di memori sesi browser agar tab lain (Admin) tidak tanya PIN lagi
      if (typeof window !== "undefined") {
        sessionStorage.setItem("la_admin_auth", "true");
      }
      fetchInventoryData(); // Load data saat berhasil login
    } else {
      setPinError("PIN salah! Masukkan PIN Admin yang benar.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPinInput("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("la_admin_auth");
    }
  };

  const getItemPriceDetails = (itemId: string, currentStock: number) => {
    const itemBatches = batches.filter((b) => b.inventory_item_id === itemId);
    const activeBatches = itemBatches.filter((b) => Number(b.remaining_qty) > 0);
    let unitCost = 0; let totalValue = 0;

    if (activeBatches.length > 0) {
      const totalRemaining = activeBatches.reduce((acc, b) => acc + Number(b.remaining_qty), 0);
      const totalBatchValue = activeBatches.reduce((acc, b) => acc + Number(b.remaining_qty) * Number(b.cost_per_unit || 0), 0);
      unitCost = totalRemaining > 0 ? Math.round(totalBatchValue / totalRemaining) : Number(activeBatches[0].cost_per_unit || 0);
      totalValue = totalBatchValue;
    } else if (itemBatches.length > 0) {
      unitCost = Number(itemBatches[0].cost_per_unit || 0);
      totalValue = Math.max(0, currentStock) * unitCost;
    } else if (localCosts[itemId]) {
      unitCost = Number(localCosts[itemId]);
      totalValue = Math.max(0, currentStock) * unitCost;
    }

    return { unitCost, totalValue, activeBatchesCount: activeBatches.length };
  };

  const totalInventoryValue = useMemo(() => items.reduce((acc, it) => acc + getItemPriceDetails(it.id, Number(it.current_stock)).totalValue, 0), [items, batches, localCosts]);
  const lowStockItems = useMemo(() => items.filter((it) => Number(it.current_stock) <= Number(it.min_stock)), [items]);

  const handleOpenPriceModal = (item: InventoryItem, currentPrice: number) => {
    setPriceModalItem({ item, currentPrice });
    setModalInputPrice(currentPrice > 0 ? currentPrice : "");
  };

  const handleSavePriceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalItem) return;

    const priceNum = Number(modalInputPrice) || 0;
    if (priceNum <= 0) { alert("Masukkan harga modal yang valid"); return; }

    try {
      setIsSavingPrice(true);
      const item = priceModalItem.item;

      const updatedLocalCosts = { ...localCosts, [item.id]: priceNum };
      setLocalCosts(updatedLocalCosts);
      if (typeof window !== "undefined") localStorage.setItem("la_item_default_costs", JSON.stringify(updatedLocalCosts));

      const itemBatches = batches.filter((b) => b.inventory_item_id === item.id && Number(b.remaining_qty) > 0);
      if (itemBatches.length > 0) {
        for (const b of itemBatches) { await supabase.from("inventory_batches").update({ cost_per_unit: priceNum }).eq("id", b.id); }
      } else {
        const qtyToInit = Number(item.current_stock) > 0 ? Number(item.current_stock) : 1;
        await supabase.from("inventory_batches").insert({ inventory_item_id: item.id, initial_qty: qtyToInit, remaining_qty: qtyToInit, cost_per_unit: priceNum, batch_date: new Date().toISOString() });
      }

      showToast(`Harga modal ${item.name} berhasil disimpan! ✨`);
      setPriceModalItem(null);
      await fetchInventoryData();
    } catch (err: any) { alert(`Gagal menyimpan harga: ${err.message || "Error"}`); } finally { setIsSavingPrice(false); }
  };

  const handleShareWhatsAppRestock = () => {
    if (lowStockItems.length === 0) { showToast("Semua stok bahan masih aman! 👍"); return; }
    const todayStr = formatDateIndo(new Date().toISOString());
    let msg = `*LA FRIED CHICKEN - NOTIFIKASI RESTOCK BAHAN BAKU* 🍗📦\nWaktu: ${todayStr}\n\nHalo Owner / Supplier,\nBahan baku berikut sudah *MENIPIS* di kios dan butuh restock segera:\n\n`;
    lowStockItems.forEach((it, idx) => {
      const priceDetails = getItemPriceDetails(it.id, Number(it.current_stock));
      const estPrice = priceDetails.unitCost > 0 ? ` (@ ${formatRupiah(priceDetails.unitCost)}/${it.unit})` : "";
      msg += `${idx + 1}. *${it.name}*\n   Sisa: *${it.current_stock} ${it.unit}* (Batas Min: ${it.min_stock} ${it.unit})${estPrice}\n`;
    });
    msg += `\nTotal: *${lowStockItems.length} bahan baku* kritis.\nMohon diproses agar kios lancar. Terima kasih! 🌸`;
    if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(msg); showToast("Format disalin ke clipboard! Membuka WhatsApp... 📋"); }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.item_id || purchaseForm.qty_pack <= 0 || purchaseForm.qty_per_pack <= 0) { alert("Pilih bahan dan masukkan jumlah yang valid"); return; }

    try {
      const selectedItem = items.find((it) => it.id === purchaseForm.item_id);
      if (!selectedItem) return;

      const totalUnitsGained = Number(purchaseForm.qty_pack) * Number(purchaseForm.qty_per_pack);
      const costTotalNum = Number(purchaseForm.cost_total);
      const costPerUnit = totalUnitsGained > 0 ? Math.round(costTotalNum / totalUnitsGained) : 0;
      
      const { error: logErr } = await supabase.from("inventory_logs").insert({ item_id: purchaseForm.item_id, change_qty: totalUnitsGained, type: "in", cost_total: costTotalNum, payment_source: purchaseForm.payment_source });
      if (logErr) throw logErr;

      await supabase.from("inventory_batches").insert({ inventory_item_id: purchaseForm.item_id, initial_qty: totalUnitsGained, remaining_qty: totalUnitsGained, cost_per_unit: costPerUnit, batch_date: new Date().toISOString() });

      if (costPerUnit > 0) {
        const updatedLocal = { ...localCosts, [purchaseForm.item_id]: costPerUnit };
        setLocalCosts(updatedLocal);
        if (typeof window !== "undefined") localStorage.setItem("la_item_default_costs", JSON.stringify(updatedLocal));
      }

      const newStock = Number(selectedItem.current_stock) + totalUnitsGained;
      const { error: updateErr } = await supabase.from("inventory_items").update({ current_stock: newStock }).eq("id", purchaseForm.item_id);
      if (updateErr) throw updateErr;

      showToast(`Belanja ${selectedItem.name} berhasil! Masuk +${totalUnitsGained} ${selectedItem.unit} 🌸`);
      setPurchaseForm({ item_id: items[0]?.id || "", qty_pack: 0, qty_per_pack: 1, cost_total: 0, payment_source: "drawer" });
      fetchInventoryData();
    } catch (err: any) { alert(`Gagal menyimpan belanja: ${err.message || "Error"}`); }
  };

  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    try {
      for (const item of items) {
        const physical = Number(opnameCounts[item.id] ?? item.current_stock);
        const difference = physical - Number(item.current_stock);
        if (difference !== 0) {
          await supabase.from("inventory_logs").insert({ item_id: item.id, change_qty: difference, type: "opname", cost_total: 0, payment_source: "other" });
          await supabase.from("inventory_items").update({ current_stock: physical }).eq("id", item.id);
        }
      }
      showToast("Stok Opname fisik berhasil diperbarui! ✨");
      fetchInventoryData();
    } catch (err: any) { alert(`Gagal menyimpan opname: ${err.message || "Error"}`); }
  };

  // LAYAR LOADING
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // SCREEN: KUNCI KEAMANAN (Jika belum login)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[75vh] px-4">
        <div className="max-w-md w-full p-6 bg-white rounded-3xl border border-pink-100 shadow-xl text-center animate-pop-in">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4 animate-bounce">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-1">Keamanan Gudang Stok</h2>
          <p className="text-xs text-gray-500 mb-6">
            Masukkan PIN Admin untuk mengubah harga modal dan stok opname.
          </p>

          <div className="space-y-3">
            <input
              type="password"
              maxLength={6}
              placeholder="Ketik PIN..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPin()}
              className="w-full text-center text-2xl font-black tracking-widest py-3 bg-pink-50/50 border border-pink-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400"
              autoFocus
            />

            {pinError && (
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyPin}
              className="w-full py-3.5 bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
            >
              <Unlock className="w-4 h-4" />
              <span>Buka Akses Stok Gudang</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN UTAMA (Jika sudah login)
  return (
    <div className="space-y-4 pb-12">
      {feedback && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-2xl shadow-xl text-xs font-bold border border-emerald-400 animate-pop-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" /><span>{feedback}</span>
        </div>
      )}

      {/* HEADER AMAN DENGAN TOMBOL LOGOUT */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-pink-100 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-lg sm:text-xl font-black text-gray-800 leading-tight">Inventaris & Stok 📦</h1>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed pr-2">Pantau sisa bahan, nilai aset persediaan, dan catat belanja harian kios.</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {lowStockItems.length > 0 && (
              <button type="button" onClick={handleShareWhatsAppRestock} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all btn-bounce">
                <span>📱</span><span>WA Restock ({lowStockItems.length} Kritis)</span>
              </button>
            )}
            <button type="button" onClick={handleLogout} className="px-3 py-2.5 bg-pink-50 hover:bg-pink-100 text-rose-600 font-bold text-xs rounded-2xl border border-pink-200 flex items-center gap-1.5 transition-all btn-bounce">
              <Lock className="w-3.5 h-3.5" /><span>Kunci</span>
            </button>
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md"><AlertTriangle className="w-5 h-5 animate-bounce" /></div>
              <div>
                <div className="flex items-center gap-2"><h2 className="text-sm sm:text-base font-extrabold text-gray-900">🚨 Peringatan: {lowStockItems.length} Bahan Baku Menipis!</h2><span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">Kritis</span></div>
                <p className="text-xs text-gray-600 mt-0.5">Segera catat belanja bahan agar operasional dapur tidak mandek.</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {lowStockItems.map((it) => (
                    <span key={it.id} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                      <span>⚠️ {it.name}:</span><strong className="text-rose-600">{it.current_stock}</strong> / {it.min_stock} {it.unit}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
              <button type="button" onClick={() => { if (lowStockItems.length > 0) setPurchaseForm((prev) => ({ ...prev, item_id: lowStockItems[0].id })); setActiveTab("purchase"); }} className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-rose-600 transition-all flex items-center justify-center gap-1.5"><ShoppingCart className="w-4 h-4" /><span>+ Belanja Bahan</span></button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-pink-100 shadow-sm flex items-center gap-2 overflow-hidden"><div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-pink-100 text-rose-600 flex items-center justify-center"><Package className="w-4 h-4" /></div><div className="min-w-0"><span className="text-[9px] font-bold text-gray-400 block uppercase">Total Bahan</span><span className="text-sm sm:text-lg font-black text-gray-800 truncate block">{items.length} Macam</span></div></div>
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-pink-100 shadow-sm flex items-center gap-2 overflow-hidden"><div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Coins className="w-4 h-4" /></div><div className="min-w-0"><span className="text-[9px] font-bold text-gray-400 block uppercase">Nilai Persediaan</span><span className="text-sm sm:text-lg font-black text-emerald-600 truncate block">{formatRupiah(totalInventoryValue)}</span></div></div>
        <div className={`col-span-2 sm:col-span-1 bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border shadow-sm flex items-center gap-2 overflow-hidden ${lowStockItems.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-pink-100"}`}><div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${lowStockItems.length > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>{lowStockItems.length > 0 ? <AlertTriangle className="w-4 h-4 animate-pulse" /> : <CheckCircle2 className="w-4 h-4" />}</div><div className="min-w-0"><span className="text-[9px] font-bold text-gray-400 block uppercase">Status Kebutuhan</span><span className={`text-sm font-black truncate block ${lowStockItems.length > 0 ? "text-amber-700" : "text-emerald-600"}`}>{lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : "Aman"}</span></div></div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[{ key: "items", label: "Status Stok", icon: Package, badge: lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : undefined }, { key: "purchase", label: "Belanja Masuk", icon: ShoppingCart }, { key: "batches", label: "Batch FIFO", icon: Layers }, { key: "opname", label: "Opname Fisik", icon: ClipboardCheck }, { key: "logs", label: "Riwayat", icon: History }].map((tab) => {
          const Icon = tab.icon; const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all btn-bounce ${isActive ? "bg-rose-500 text-white shadow-md shadow-rose-200" : "bg-pink-50/80 text-gray-700 hover:bg-pink-100 border border-pink-100"}`}>
              <Icon className="w-4 h-4" /><span>{tab.label}</span>{tab.badge && <span className="ml-1 text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((it) => {
              const isLow = Number(it.current_stock) <= Number(it.min_stock);
              const priceInfo = getItemPriceDetails(it.id, Number(it.current_stock));
              return (
                <div key={it.id} className={`bg-white rounded-3xl p-4 border shadow-sm flex flex-col justify-between hover:shadow-md ${isLow ? "border-amber-300 bg-amber-50/20 ring-1 ring-amber-300" : "border-pink-100"}`}>
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1"><h3 className="font-extrabold text-sm text-gray-800">{it.name}</h3>{isLow ? <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">Menipis</span> : <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Aman</span>}</div>
                    <div className="flex items-baseline gap-1 my-1.5"><span className="text-2xl font-black text-gray-900">{it.current_stock}</span><span className="text-xs font-semibold text-gray-500">{it.unit}</span></div>
                    <div className="bg-pink-50/40 rounded-2xl p-2.5 my-2.5 border border-pink-100/70 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]"><span className="text-gray-500 font-medium">Harga Modal:</span><div className="flex items-center gap-1">{priceInfo.unitCost > 0 ? <span className="font-black text-gray-800">{formatRupiah(priceInfo.unitCost)}<span className="text-[10px] text-gray-400 font-normal">/{it.unit}</span></span> : <span className="text-[10px] text-gray-400 italic font-medium">Belum diatur</span>}<button type="button" onClick={() => handleOpenPriceModal(it, priceInfo.unitCost)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button></div></div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-pink-100/60"><span className="text-gray-500 font-medium">Estimasi Nilai Stok:</span><span className="font-black text-rose-600">{formatRupiah(priceInfo.totalValue)}</span></div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-pink-100 text-[11px] text-gray-500 flex items-center justify-between"><div><span>Batas Min: </span><span className="font-bold text-gray-700">{it.min_stock} {it.unit}</span></div><button type="button" onClick={() => { setPurchaseForm((prev) => ({ ...prev, item_id: it.id })); setActiveTab("purchase"); }} className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"><ShoppingCart className="w-3 h-3" /><span>+ Belanja</span></button></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "purchase" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-1 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-rose-500" /><span>Catat Belanja Bahan Masuk</span></h2>
          <p className="text-xs text-gray-500 mb-5">Sistem akan otomatis menghitung Harga Modal Satuan terkecil (HPP) untuk keperluan laba FIFO.</p>
          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            <div><label className="block text-xs font-bold text-gray-700 mb-1.5">Pilih Bahan Baku</label><select value={purchaseForm.item_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, item_id: e.target.value })} className="w-full px-4 py-3 text-xs bg-pink-50/50 border border-pink-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400" required>{items.map((it) => (<option key={it.id} value={it.id}>{it.name} (Stok di Gudang: {it.current_stock} {it.unit})</option>))}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-700 mb-1.5">Berapa Pack/Bungkus?</label><div className="flex items-center bg-pink-50/50 border border-pink-200 rounded-2xl"><input type="number" min="0.1" step="any" value={purchaseForm.qty_pack || ""} onChange={(e) => setPurchaseForm({ ...purchaseForm, qty_pack: Number(e.target.value) || 0 })} className="w-full px-4 py-3 text-sm font-black bg-transparent text-right outline-none" required /><span className="px-3 py-3 text-xs font-bold text-gray-500 bg-pink-100/50 border-l border-pink-200">Bks</span></div></div>
              <div><label className="block text-xs font-bold text-rose-600 mb-1.5">Isi per 1 Bungkus?</label><div className="flex items-center bg-pink-50/50 border border-pink-200 rounded-2xl"><span className="px-3 py-3 text-xs font-bold text-gray-500 bg-pink-100/50 border-r border-pink-200">Isi</span><input type="number" min="1" step="any" value={purchaseForm.qty_per_pack || ""} onChange={(e) => setPurchaseForm({ ...purchaseForm, qty_per_pack: Number(e.target.value) || 1 })} className="w-full px-4 py-3 text-sm font-black bg-transparent text-right outline-none text-rose-600" required /><span className="px-3 py-3 text-[11px] font-bold text-gray-500 bg-pink-100/50 border-l border-pink-200 truncate max-w-[60px]">{items.find((i) => i.id === purchaseForm.item_id)?.unit || "pcs"}</span></div></div>
            </div>
            <div><label className="block text-xs font-bold text-gray-700 mb-1.5">Total Biaya Belanja (Rp)</label><input type="number" value={purchaseForm.cost_total || ""} onChange={(e) => setPurchaseForm({ ...purchaseForm, cost_total: Number(e.target.value) || 0 })} className="w-full px-4 py-3 text-sm font-black text-rose-600 bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400 text-right" required /><span className="text-[10px] text-gray-500 block text-right mt-1">{formatRupiah(purchaseForm.cost_total)}</span></div>
            {purchaseForm.qty_pack > 0 && purchaseForm.qty_per_pack > 0 && purchaseForm.cost_total > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-2">
                <span className="font-extrabold text-emerald-800 flex items-center gap-1.5 text-xs mb-1"><TrendingUp className="w-4 h-4" /><span>Kalkulasi Otomatis Sistem:</span></span>
                <div className="flex justify-between items-center text-xs border-b border-emerald-100 pb-2"><span className="text-emerald-700">Total Masuk Gudang:</span><span className="font-black text-emerald-800 text-sm">{Number(purchaseForm.qty_pack) * Number(purchaseForm.qty_per_pack)} {items.find((i) => i.id === purchaseForm.item_id)?.unit || "unit"}</span></div>
                <div className="flex justify-between items-center text-xs pt-1"><span className="text-emerald-700">Modal Satuan (HPP Terkecil):</span><span className="font-black text-rose-600 text-sm">{formatRupiah(Math.round(purchaseForm.cost_total / (Number(purchaseForm.qty_pack) * Number(purchaseForm.qty_per_pack))))} <span className="text-[10px] text-emerald-700 font-bold">/ {items.find((i) => i.id === purchaseForm.item_id)?.unit || "unit"}</span></span></div>
              </div>
            )}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Sumber Dana Belanja</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPurchaseForm({ ...purchaseForm, payment_source: "drawer" })} className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${purchaseForm.payment_source === "drawer" ? "bg-rose-500 text-white border-rose-500" : "bg-white text-gray-700 border-pink-200"}`}><Wallet className="w-4 h-4" /><span>Tunai Laci Kasir</span></button>
                <button type="button" onClick={() => setPurchaseForm({ ...purchaseForm, payment_source: "other" })} className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${purchaseForm.payment_source === "other" ? "bg-rose-500 text-white border-rose-500" : "bg-white text-gray-700 border-pink-200"}`}><span>Non-Tunai / Pribadi</span></button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{purchaseForm.payment_source === "drawer" ? "Memotong target saldo uang fisik di laci kasir." : "Tidak mempengaruhi uang fisik di laci."}</p>
            </div>
            <button type="submit" className="w-full py-4 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md hover:bg-rose-600 mt-2"><CheckCircle2 className="w-4 h-4 inline mr-2" />Simpan Catatan Belanja</button>
          </form>
        </div>
      )}

      {activeTab === "batches" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-4xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div><h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2"><Layers className="w-5 h-5 text-rose-500" /><span>Daftar Batch FIFO</span></h2><p className="text-xs text-gray-500">Sistem otomatis memotong stok dari batch tertua secara berurutan untuk akurasi HPP.</p></div>
            <span className="text-xs font-bold text-rose-600 bg-pink-50 border border-pink-200 px-3 py-1 rounded-full self-start sm:self-auto">{batches.filter((b) => Number(b.remaining_qty) > 0).length} Batch Aktif</span>
          </div>
          <div className="space-y-2.5">
            {batches.map((b) => {
              const hasStock = Number(b.remaining_qty) > 0;
              const unit = b.inventory_item?.unit || "";
              return (
                <div key={b.id} className={`p-3.5 rounded-2xl border ${hasStock ? "bg-white border-pink-200 shadow-2xs" : "bg-gray-50/70 border-gray-200 opacity-60"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-extrabold text-gray-800 text-xs">{b.inventory_item?.name || "Bahan Baku"}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasStock ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>{hasStock ? `Sisa ${Number(b.initial_qty) > 0 ? ((Number(b.remaining_qty) / Number(b.initial_qty)) * 100).toFixed(0) : 0}%` : "Habis"}</span></div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 mt-1"><span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />Tgl Batch: {formatDateIndo(b.batch_date || b.created_at)}</span><span>&bull; Modal Satuan: <strong className="text-gray-700">{formatRupiah(b.cost_per_unit)}</strong>/{unit}</span></div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div><span className="text-[10px] text-gray-400 block font-medium">Sisa / Masuk:</span><span className="text-xs font-black text-gray-900"><strong className={hasStock ? "text-rose-600" : "text-gray-500"}>{b.remaining_qty}</strong> / {b.initial_qty} {unit}</span></div>
                      <div className="border-l border-gray-100 pl-4"><span className="text-[10px] text-gray-400 block font-medium">Nilai Batch:</span><span className="text-xs font-black text-rose-600">{formatRupiah(Number(b.remaining_qty) * Number(b.cost_per_unit || 0))}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {batches.length === 0 && <div className="text-center py-8 text-xs text-gray-400">Belum ada batch belanja.</div>}
          </div>
        </div>
      )}

      {activeTab === "opname" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-2xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-1 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-rose-500" /><span>Stok Opname Tutup Kios</span></h2>
          <p className="text-xs text-gray-500 mb-4">Hitung fisik riil sisa bahan saat kios tutup. Sistem akan menyesuaikan stok akhir.</p>
          <form onSubmit={handleOpnameSubmit} className="space-y-3">
            <div className="space-y-2.5">
              {items.map((it) => {
                const physicalVal = opnameCounts[it.id] ?? it.current_stock;
                const used = Number(it.current_stock) - Number(physicalVal);
                return (
                  <div key={it.id} className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div><h4 className="font-bold text-xs text-gray-800">{it.name}</h4><p className="text-[10px] text-gray-500">Tercatat sistem: <span className="font-bold">{it.current_stock} {it.unit}</span></p></div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5"><span className="text-[11px] font-semibold text-gray-600">Sisa Fisik:</span><input type="number" step="any" value={physicalVal} onChange={(e) => setOpnameCounts({ ...opnameCounts, [it.id]: Number(e.target.value) || 0 })} className="w-20 px-2 py-1.5 text-xs font-bold text-center bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400" /><span className="text-[10px] font-semibold text-gray-500">{it.unit}</span></div>
                      {used !== 0 && <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${used > 0 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{used > 0 ? `Terpakai: ${used}` : `Lebih: +${Math.abs(used)}`}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="submit" className="w-full py-4 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md hover:bg-rose-600 mt-4"><Save className="w-4 h-4 inline mr-2" />Simpan Hasil Stok Opname</button>
          </form>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-2"><History className="w-4 h-4 text-rose-500" /><span>Riwayat Log Pergerakan Bahan</span></h2>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-pink-50/30 rounded-2xl border border-pink-100 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{log.item?.name || "Bahan"}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.type === "in" ? "bg-emerald-100 text-emerald-700" : log.type === "opname" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"}`}>{log.type === "in" ? "Belanja Masuk" : log.type === "opname" ? "Opname" : "Keluar"}</span></div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{formatDateIndo(log.created_at)} &bull; Sumber: {log.payment_source === "drawer" ? "Laci Kasir" : "Lainnya"}</p>
                </div>
                <div className="text-right">
                  <span className={`font-black ${log.change_qty > 0 ? "text-emerald-600" : "text-gray-700"}`}>{log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty} {log.item?.unit || ""}</span>
                  {Number(log.cost_total) > 0 && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{formatRupiah(log.cost_total)}</p>}
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Belum ada riwayat pergerakan bahan.</p>}
          </div>
        </div>
      )}

      {/* MODAL ATUR / UBAH HARGA MODAL SATUAN */}
      {priceModalItem && (
        <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-pink-100 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-rose-600 flex items-center justify-center"><Coins className="w-4 h-4" /></div>
                <div><h3 className="font-extrabold text-sm text-gray-800">Atur Harga Modal</h3><p className="text-[10px] text-gray-400">{priceModalItem.item.name}</p></div>
              </div>
              <button type="button" onClick={() => setPriceModalItem(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSavePriceModal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Modal Satuan (Rp / {priceModalItem.item.unit})</label>
                <input type="number" min="1" step="any" value={modalInputPrice} onChange={(e) => setModalInputPrice(e.target.value)} placeholder="Contoh: 6500" className="w-full px-4 py-3 text-base font-black text-rose-600 bg-pink-50/50 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-rose-400 text-right" required autoFocus />
              </div>
              <div className="bg-pink-50/60 rounded-2xl p-3 text-[11px] text-gray-600 space-y-1">
                <div className="flex justify-between"><span>Sisa Stok Sekarang:</span><span className="font-bold text-gray-800">{priceModalItem.item.current_stock} {priceModalItem.item.unit}</span></div>
                <div className="flex justify-between"><span>Estimasi Total Nilai:</span><span className="font-bold text-rose-600">{formatRupiah(Number(priceModalItem.item.current_stock) * (Number(modalInputPrice) || 0))}</span></div>
              </div>
              <p className="text-[10px] text-gray-400 italic">💡 Harga modal ini akan dipakai oleh sistem FIFO POS untuk menghitung HPP laba bersih.</p>
              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setPriceModalItem(null)} className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl">Batal</button>
                <button type="submit" disabled={isSavingPrice} className="flex-1 py-3 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl"><Save className="w-4 h-4 inline mr-1" />{isSavingPrice ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
