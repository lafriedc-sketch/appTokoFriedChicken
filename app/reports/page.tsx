"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Download, 
  Calendar, 
  Award, 
  Sparkles,
  ArrowUpRight,
  PieChart,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sliders,
  RefreshCw,
  X,
  Clock,
  Flame,
  Wallet,
  PiggyBank,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Transaction, InventoryLog, FryingLog, RentSettings, AiAdvisorResult } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export default function ReportsPage() {
  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "7days" | "month" | "all">("today");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [fryingLogs, setFryingLogs] = useState<FryingLog[]>([]);
  const [loading, setLoading] = useState(true);

  // State Pengaturan Target Sewa & Listrik (Sinking Fund)
  const [rentSettings, setRentSettings] = useState<RentSettings>({
    monthly_rent: 1500000,
    monthly_electricity: 300000,
    rent_due_day: 25,
    accumulated_fund: 0,
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editRent, setEditRent] = useState<number>(1500000);
  const [editElectricity, setEditElectricity] = useState<number>(300000);
  const [editDueDay, setEditDueDay] = useState<number>(25);

  // State AI Advisor
  const [aiResult, setAiResult] = useState<AiAdvisorResult | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Load rent settings dari localStorage saat awal
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("la_rent_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          setRentSettings(parsed);
          setEditRent(parsed.monthly_rent || 1500000);
          setEditElectricity(parsed.monthly_electricity || 300000);
          setEditDueDay(parsed.rent_due_day || 25);
        }
      } catch {}
    }
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);

      // Fetch all transactions with items & cashier
      let remoteTxs: any[] = [];
      try {
        const { data: transData } = await supabase
          .from("transactions")
          .select(`
            id,
            receipt_no,
            total_amount,
            payment_method,
            cash_received,
            cash_change,
            status,
            cashier_name,
            created_at,
            transaction_items (id, product_name, qty, unit_price, subtotal)
          `)
          .order("created_at", { ascending: false });

        if (transData) {
          remoteTxs = transData.map((t: any) => ({
            ...t,
            items: t.transaction_items,
          }));
        }
      } catch (e) {
        console.warn("Gagal query remote transactions di reports:", e);
      }

      if (typeof window !== "undefined") {
        try {
          const localMap: Transaction[] = JSON.parse(
            localStorage.getItem("la_cashier_transactions_map") || "[]"
          );
          const combined = new Map<string, Transaction>();
          localMap.forEach((tx) => combined.set(tx.receipt_no, tx));
          remoteTxs.forEach((tx) => {
            const loc = combined.get(tx.receipt_no);
            if (loc) {
              combined.set(tx.receipt_no, {
                ...tx,
                cashier_name: tx.cashier_name || loc.cashier_name,
                items: tx.items && tx.items.length > 0 ? tx.items : loc.items,
              });
            } else {
              combined.set(tx.receipt_no, tx);
            }
          });
          setTransactions(Array.from(combined.values()));
        } catch {
          setTransactions(remoteTxs);
        }
      } else {
        setTransactions(remoteTxs);
      }

      // Fetch inventory logs (expenses & FIFO HPP)
      const { data: invData } = await supabase
        .from("inventory_logs")
        .select(`
          id,
          item_id,
          change_qty,
          type,
          cost_total,
          payment_source,
          created_at,
          inventory_items (name, unit)
        `)
        .order("created_at", { ascending: false });

      let allLogs: InventoryLog[] = [];
      if (invData) {
        allLogs = invData.map((d: any) => ({
          ...d,
          item: d.inventory_items,
        }));
      }

      // Merge local FIFO logs
      if (typeof window !== "undefined") {
        try {
          const localFifo: InventoryLog[] = JSON.parse(
            localStorage.getItem("la_fifo_logs") || "[]"
          );
          const combinedLogs = new Map<string, InventoryLog>();
          localFifo.forEach((l) => combinedLogs.set(l.id, l));
          allLogs.forEach((l) => combinedLogs.set(l.id, l));
          allLogs = Array.from(combinedLogs.values());
        } catch {}
      }

      setInventoryLogs(allLogs);

      // Fetch frying logs
      const { data: fryData } = await supabase
        .from("frying_logs")
        .select("*")
        .order("fried_at", { ascending: false });

      if (fryData) setFryingLogs(fryData);
    } catch (err) {
      console.error("Gagal load laporan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  // Filter Data by Time (Termasuk Bulan Ini / Bulanan)
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let trans = [...transactions];
    let invs = [...inventoryLogs];

    if (timeFilter === "today") {
      trans = trans.filter((t) => new Date(t.created_at || "").getTime() >= startOfToday.getTime());
      invs = invs.filter((i) => new Date(i.created_at || "").getTime() >= startOfToday.getTime());
    } else if (timeFilter === "yesterday") {
      trans = trans.filter((t) => {
        const time = new Date(t.created_at || "").getTime();
        return time >= startOfYesterday.getTime() && time < startOfToday.getTime();
      });
      invs = invs.filter((i) => {
        const time = new Date(i.created_at || "").getTime();
        return time >= startOfYesterday.getTime() && time < startOfToday.getTime();
      });
    } else if (timeFilter === "7days") {
      trans = trans.filter((t) => new Date(t.created_at || "").getTime() >= sevenDaysAgo.getTime());
      invs = invs.filter((i) => new Date(i.created_at || "").getTime() >= sevenDaysAgo.getTime());
    } else if (timeFilter === "month") {
      trans = trans.filter((t) => new Date(t.created_at || "").getTime() >= startOfMonth.getTime());
      invs = invs.filter((i) => new Date(i.created_at || "").getTime() >= startOfMonth.getTime());
    }

    return { trans, invs };
  }, [transactions, inventoryLogs, timeFilter]);

  // KPI 1: Sales Kotor (Omzet)
  const grossSales = useMemo(() => {
    return filteredData.trans.reduce((acc, t) => acc + Number(t.total_amount), 0);
  }, [filteredData]);

  // KPI 2: Biaya Belanja (HPP Modal Bahan Terpotong FIFO)
  const totalHpp = useMemo(() => {
    return filteredData.invs
      .filter((i) => i.type === "out" && (i.payment_source === "system_fifo" || i.payment_source === "other"))
      .reduce((acc, i) => acc + Number(i.cost_total || 0), 0);
  }, [filteredData]);

  // Total biaya belanja masuk bahan baku (type: "in")
  const totalPurchaseIn = useMemo(() => {
    return filteredData.invs
      .filter((i) => i.type === "in")
      .reduce((acc, i) => acc + Number(i.cost_total || 0), 0);
  }, [filteredData]);

  // KPI 3: Laba Kotor (Omzet - HPP Aktual FIFO)
  const netProfit = grossSales - totalHpp;
  const marginPercentage = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : "0";

  // Hitung Hari Buka Riil Bulan Ini (Berdasarkan tanggal unik transaksi)
  const activeDaysThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTrans = transactions.filter(
      (t) => new Date(t.created_at || "").getTime() >= startOfMonth.getTime()
    );
    const uniqueDays = new Set(monthTrans.map((t) => (t.created_at || "").slice(0, 10)));
    return Math.max(1, uniqueDays.size);
  }, [transactions]);

  // Panggil AI Financial Advisor
  const runAiAdvisor = async (
    targetFilter = timeFilter,
    targetGross = grossSales,
    targetHpp = totalHpp,
    targetTrans = filteredData.trans.length,
    targetNet = netProfit,
    targetMargin = marginPercentage,
    customSettings = rentSettings
  ) => {
    try {
      setLoadingAi(true);

      const fryAyam = fryingLogs
        .filter((l) => l.piece_count > 0 && !l.note?.toLowerCase().includes("usus"))
        .reduce((acc, l) => acc + l.piece_count, 0);

      const fryUsus = fryingLogs
        .filter((l) => l.piece_count > 0 && l.note?.toLowerCase().includes("usus"))
        .reduce((acc, l) => acc + l.piece_count, 0);

      const fryWaste = fryingLogs
        .filter((l) => l.piece_count < 0)
        .reduce((acc, l) => acc + Math.abs(l.piece_count), 0);

      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: targetFilter,
          grossSales: targetGross,
          totalTransactions: targetTrans,
          totalHpp: targetHpp,
          netProfit: targetNet,
          marginPercentage: Number(targetMargin) || 0,
          rentSettings: customSettings,
          activeDaysThisMonth,
          totalFriedAyam: fryAyam,
          totalFriedUsus: fryUsus,
          totalWaste: fryWaste,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAiResult(json.data);
      }
    } catch (err) {
      console.warn("Gagal call AI advisor:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Jalankan AI saat data atau filter berubah
  useEffect(() => {
    if (!loading) {
      runAiAdvisor(timeFilter, grossSales, totalHpp, filteredData.trans.length, netProfit, marginPercentage, rentSettings);
    }
  }, [timeFilter, grossSales, totalHpp, netProfit, marginPercentage, loading]);

  // Simpan Target Sewa Baru
  const handleSaveRentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RentSettings = {
      monthly_rent: Number(editRent) || 1500000,
      monthly_electricity: Number(editElectricity) || 300000,
      rent_due_day: Math.min(31, Math.max(1, Number(editDueDay) || 25)),
      accumulated_fund: rentSettings.accumulated_fund || 0,
    };
    setRentSettings(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("la_rent_settings", JSON.stringify(updated));
    }
    setIsSettingsModalOpen(false);
    runAiAdvisor(timeFilter, grossSales, totalHpp, filteredData.trans.length, netProfit, marginPercentage, updated);
  };

  // Chart Data: Tren 7 Hari Terakhir
  const chartData = useMemo(() => {
    const days: { [dateStr: string]: { date: string; omzet: number; belanja: number; laba: number } } = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
      const isoDateKey = d.toISOString().slice(0, 10);
      days[isoDateKey] = { date: key, omzet: 0, belanja: 0, laba: 0 };
    }

    transactions.forEach((t) => {
      const dateKey = (t.created_at || "").slice(0, 10);
      if (days[dateKey]) {
        days[dateKey].omzet += Number(t.total_amount);
      }
    });

    inventoryLogs.forEach((i) => {
      if (i.type === "out" && (i.payment_source === "system_fifo" || i.payment_source === "other")) {
        const dateKey = (i.created_at || "").slice(0, 10);
        if (days[dateKey]) {
          days[dateKey].belanja += Number(i.cost_total || 0);
        }
      }
    });

    Object.keys(days).forEach((k) => {
      days[k].laba = Math.max(0, days[k].omzet - days[k].belanja);
    });

    return Object.values(days);
  }, [transactions, inventoryLogs]);

  // Top 5 Produk Terlaris
  const topProducts = useMemo(() => {
    const productCounts: { [name: string]: { name: string; qty: number; revenue: number } } = {};

    filteredData.trans.forEach((t) => {
      t.items?.forEach((item) => {
        if (!productCounts[item.product_name]) {
          productCounts[item.product_name] = {
            name: item.product_name,
            qty: 0,
            revenue: 0,
          };
        }
        productCounts[item.product_name].qty += item.qty;
        productCounts[item.product_name].revenue += item.subtotal;
      });
    });

    return Object.values(productCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredData]);

  // Rekap Performa Penjualan Per Kasir
  const cashierRanking = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredData.trans.forEach((t) => {
      const c = t.cashier_name || "Kasir Utama";
      const curr = map.get(c) || { count: 0, total: 0 };
      map.set(c, {
        count: curr.count + 1,
        total: curr.total + Number(t.total_amount || 0),
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["No Nota", "Waktu", "Kasir", "Metode", "Total Belanja", "Tunai Diterima", "Kembalian"];
    const rows = filteredData.trans.map((t) => [
      t.receipt_no,
      t.created_at ? new Date(t.created_at).toLocaleString("id-ID") : "",
      `"${t.cashier_name || "Kasir Utama"}"`,
      t.payment_method.toUpperCase(),
      t.total_amount,
      t.cash_received,
      t.cash_change,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_LA_Fried_Chicken_${timeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Nilai rekomendasi sisihan dari AI atau kalkulasi aman default
  const recSinkingAmount = aiResult?.recommendedSinkingFund?.amount ?? Math.round(grossSales * 0.1);
  const recSinkingPercent = aiResult?.recommendedSinkingFund?.percentage ?? 10;
  const safeMoneyAmount = aiResult?.safeMoneyToTake?.amount ?? Math.max(0, netProfit - recSinkingAmount);
  const safeMoneyPercent = aiResult?.safeMoneyToTake?.percentage ?? (grossSales > 0 ? ((safeMoneyAmount / grossSales) * 100).toFixed(0) : "0");
  const targetTotalBeban = (rentSettings.monthly_rent || 1500000) + (rentSettings.monthly_electricity || 300000);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Date Filters */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Dashboard Laporan & AI Financial Advisor
            </h1>
            <span className="text-lg">🤖🌸</span>
          </div>
          <p className="text-xs text-gray-500">
            Analisis penjualan, kontrol modal FIFO, dan rekomendasi cerdas AI sewa toko & laba aman pemilik.
          </p>
        </div>

        {/* Quick Date Filters (Harian, Mingguan, Bulanan) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: "today", label: "Hari Ini" },
            { key: "yesterday", label: "Kemarin" },
            { key: "7days", label: "7 Hari (Mingguan)" },
            { key: "month", label: "Bulan Ini (Bulanan)" },
            { key: "all", label: "Semua Data" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setTimeFilter(btn.key as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all btn-bounce ${
                timeFilter === btn.key
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200 scale-105"
                  : "bg-pink-50 text-gray-700 hover:bg-pink-100"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 🤖 HERO SECTION: AI FINANCIAL ADVISOR & 3 KANTONG DISIPLIN                     */}
      {/* ============================================================================== */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-pink-200/80 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pink-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header AI Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-pink-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xl shadow-md shadow-rose-200 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base text-gray-800">
                  AI Financial & Operational Advisor
                </h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  aiResult?.healthScore === "Sangat Sehat"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : aiResult?.healthScore === "Sehat"
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}>
                  ● {aiResult?.healthScore || "Sehat"} (Margin {marginPercentage}%)
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Mode Laporan: <strong className="text-rose-600 font-bold uppercase">{timeFilter}</strong> • Toko buka {activeDaysThisMonth} hari bulan ini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-pink-50 text-gray-700 hover:bg-pink-100 text-xs font-bold border border-pink-200 flex items-center gap-1.5 transition-all btn-bounce"
            >
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
              <span>Target Sewa & Jatuh Tempo</span>
            </button>

            <button
              onClick={() => runAiAdvisor()}
              disabled={loadingAi}
              className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-sm hover:bg-rose-600 disabled:opacity-50 flex items-center gap-1.5 transition-all btn-bounce"
              title="Analisis Ulang dengan AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{loadingAi ? "Menganalisa..." : "Refresh AI"}</span>
            </button>
          </div>
        </div>

        {/* 💵 3 KANTONG DISIPLIN KEUANGAN + UANG AMAN GUA PAKE (4 CARDS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {/* Card 1: Omzet Penjualan */}
          <div className="bg-pink-50/40 rounded-2xl p-4 border border-pink-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">1. Omzet Penjualan</span>
                <span className="text-xs">💵</span>
              </div>
              <p className="text-xl font-black text-gray-900 tracking-tight">
                {formatRupiah(grossSales)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-pink-100/60 text-[10px] text-gray-500 flex items-center justify-between">
              <span>{filteredData.trans.length} Transaksi</span>
              <span className="font-semibold text-rose-500">Uang Kas Masuk</span>
            </div>
          </div>

          {/* Card 2: Modal Putar Bahan Baku (HPP) */}
          <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">2. Modal Putar Bahan</span>
                <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Wajib Belanja</span>
              </div>
              <p className="text-xl font-black text-amber-700 tracking-tight">
                {formatRupiah(totalHpp)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-amber-200/50 text-[10px] text-amber-800 font-bold flex items-center gap-1">
              <span>⚠️ JANGAN DIPAKAI! Untuk putar ayam & tepung</span>
            </div>
          </div>

          {/* Card 3: Tabungan Sewa & Listrik */}
          <div className="bg-purple-50/40 rounded-2xl p-4 border border-purple-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">3. Alokasi Sewa & Listrik</span>
                <span className="text-[10px] font-black bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded">
                  {recSinkingPercent}% Sinking Fund
                </span>
              </div>
              <p className="text-xl font-black text-purple-700 tracking-tight">
                {formatRupiah(recSinkingAmount)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-purple-200/50 text-[10px] text-purple-800 font-bold flex items-center gap-1">
              <PiggyBank className="w-3 h-3 text-purple-600" />
              <span>Simpan ke amplop sewa & listrik</span>
            </div>
          </div>

          {/* Card 4: UANG YANG AMAN GUA PAKE (HIGHLIGHT UTAMA EMERALD) */}
          <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200 flex flex-col justify-between border border-emerald-400">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">4. Uang Aman Gua Pake</span>
                <span className="text-[10px] font-black bg-white/25 text-white px-2 py-0.5 rounded-full backdrop-blur-md">
                  Margin {safeMoneyPercent}%
                </span>
              </div>
              <p className="text-2xl font-black tracking-tight text-white">
                {formatRupiah(safeMoneyAmount)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-white/20 text-[10px] text-emerald-100 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>100% AMAN DITARIK / DIBAWA PULANG!</span>
            </div>
          </div>
        </div>

        {/* 📅 STATUS JATUH TEMPO SEWA TOKO & PROGRESS BAR BULAN INI */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50/80 via-white to-pink-50/80 border border-pink-200/90 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-black text-gray-800">
                Jatuh Tempo Sewa: Setiap Tanggal {rentSettings.rent_due_day}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                {aiResult?.dueDateStatus?.daysRemaining ?? 0} Hari Tersisa
              </span>
            </div>
            <div className="text-xs font-bold text-gray-600">
              Target Bulanan: <strong className="text-gray-900">{formatRupiah(targetTotalBeban)}</strong> (Sewa {formatRupiah(rentSettings.monthly_rent)} + Listrik {formatRupiah(rentSettings.monthly_electricity)})
            </div>
          </div>

          <div className="text-xs text-gray-600 mb-2 font-medium">
            💡 {aiResult?.dueDateStatus?.statusText || "Memeriksa status jatuh tempo sewa..."}
          </div>

          <div className="w-full bg-pink-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(10, (activeDaysThisMonth / 26) * 100))}%`
              }}
            />
          </div>
        </div>

        {/* 🤖 KOTAK INSIGHT NARATIF AI (BAHASA MANUSIA) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧠 Analisa & Rekomendasi Cerdas AI</span>
            </h3>
            <span className="text-[10px] font-semibold text-rose-500">
              {aiResult?.isAiLive ? "✨ Powered by Google Gemini AI" : "⚡ Built-in Smart Financial Engine"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Box 1: Kesehatan & Margin */}
            <div className="p-3.5 rounded-2xl bg-white border border-pink-100 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <span>🩺</span>
                <span>Rangkuman Kesehatan Toko & Margin:</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                {aiResult?.healthSummary || "Menghitung analisa margin keuntungan..."}
              </p>
            </div>

            {/* Box 2: Rekomendasi Sisihan Hari Ini */}
            <div className="p-3.5 rounded-2xl bg-white border border-pink-100 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <span>🏷️</span>
                <span>Rekomendasi Sisihan Sewa & Listrik:</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                {aiResult?.recommendedSinkingFund?.explanation || "Menghitung persentase sisihan yang aman..."}
              </p>
            </div>

            {/* Box 3: Uang Aman Gua Pake */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <span>🟢</span>
                <span>Uang yang Aman Lu Pake Hari Ini:</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed font-normal">
                {aiResult?.safeMoneyToTake?.explanation || "Menghitung sisa kas bersih yang aman ditarik..."}
              </p>
            </div>

            {/* Box 4: Saran Dapur & Jam Ramai */}
            <div className="p-3.5 rounded-2xl bg-white border border-pink-100 shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <span>🍗</span>
                <span>Analisis Penggorengan & Jam Ramai:</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                {aiResult?.operationalTip || "Menganalisa data wajan penggorengan dan keramaian toko..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 📊 GRAFIK HARIAN & TREN PENJUALAN                                              */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grafik Batang: Omzet vs HPP FIFO */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-800">
                Tren Harian (Omzet vs HPP FIFO)
              </h3>
              <p className="text-[11px] text-gray-500">7 Hari Terakhir</p>
            </div>
            <span className="text-lg">📊</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  formatter={(val: any) => formatRupiah(Number(val))}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "1rem",
                    border: "1px solid #FFE4E6",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="omzet" name="Omzet Penjualan" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="belanja" name="HPP Modal FIFO" fill="#FBBF24" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik Garis: Tren Laba Bersih */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-800">
                Tren Pergerakan Laba Bersih
              </h3>
              <p className="text-[11px] text-gray-500">Performa Harian LA Fried Chicken</p>
            </div>
            <span className="text-lg">📈</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  formatter={(val: any) => formatRupiah(Number(val))}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "1rem",
                    border: "1px solid #FFE4E6",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line
                  type="monotone"
                  dataKey="laba"
                  name="Laba Bersih"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10B981" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* REKAP KINERJA KASIR & TOP MENU */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Rekap Kinerja Kasir */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500" />
              <h3 className="font-extrabold text-sm text-gray-800">
                Rekap Inputan Per Kasir
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-500">Staf Bertugas</span>
          </div>

          <div className="space-y-2.5">
            {cashierRanking.map((c, idx) => (
              <div
                key={c.name}
                className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-white text-gray-700 font-bold text-xs flex items-center justify-center border border-pink-100 shadow-xs">
                    👤
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-800">{c.name}</h4>
                    <span className="text-[10px] text-gray-500">{c.count} nota diinput</span>
                  </div>
                </div>

                <span className="font-black text-rose-600">
                  {formatRupiah(c.total)}
                </span>
              </div>
            ))}

            {cashierRanking.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                Belum ada data inputan kasir di periode ini.
              </p>
            )}
          </div>
        </div>

        {/* Top Menu Laris */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-rose-500" />
              <h3 className="font-extrabold text-sm text-gray-800">
                Menu Paling Laris (Ranking)
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-500">Favorit Pelanggan</span>
          </div>

          <div className="space-y-2.5">
            {topProducts.map((p, idx) => (
              <div
                key={p.name}
                className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-xl bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-800">{p.name}</h4>
                    <span className="text-[10px] text-gray-500">{p.qty} porsi terjual</span>
                  </div>
                </div>

                <span className="font-black text-rose-600">
                  {formatRupiah(p.revenue)}
                </span>
              </div>
            ))}

            {topProducts.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                Belum ada transaksi di periode ini.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ekspor Laporan & Tombol Aksi */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-gray-800 mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-rose-500" />
            <span>Ekspor Data Transaksi Lengkap (Termasuk Kasir)</span>
          </h3>
          <p className="text-xs text-gray-500">
            Unduh rekap data transaksi format CSV (kompatibel Excel) mencakup nomor nota, nama kasir, jam, dan total penjualan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="py-3 px-6 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px] whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Export Laporan CSV</span>
        </button>
      </div>

      {/* ============================================================================== */}
      {/* ⚙️ MODAL PENGATURAN TARGET SEWA & TANGGAL JATUH TEMPO                          */}
      {/* ============================================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-pink-200 animate-pop-in space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <h3 className="font-extrabold text-base text-gray-800">
                  Target Sewa & Jatuh Tempo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-pink-50 text-gray-500 hover:bg-pink-100 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Data ini dipakai oleh AI untuk menghitung rekomendasi persentase sisihan harian dan uang yang aman lu ambil.
            </p>

            <form onSubmit={handleSaveRentSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Biaya Sewa Toko per Bulan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={editRent}
                  onChange={(e) => setEditRent(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Estimasi Token Listrik per Bulan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="20000"
                  value={editElectricity}
                  onChange={(e) => setEditElectricity(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tanggal Jatuh Tempo Bayar Sewa (Setiap Bulan)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Tanggal:</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(Number(e.target.value) || 25)}
                    className="w-24 px-3 py-2 text-xs font-black text-center bg-pink-50/50 border border-pink-200 rounded-xl text-rose-600"
                    required
                  />
                  <span className="text-xs text-gray-500">setiap bulannya</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-200 hover:bg-rose-600 btn-bounce"
                >
                  Simpan & Terapkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
