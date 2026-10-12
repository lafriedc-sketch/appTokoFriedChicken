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
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Transaction, InventoryLog, FryingLog } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export default function ReportsPage() {
  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "7days" | "all">("today");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [fryingLogs, setFryingLogs] = useState<FryingLog[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch inventory logs (expenses)
      const { data: invData } = await supabase
        .from("inventory_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (invData) setInventoryLogs(invData);

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

  // Filter Data by Time
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

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
    }

    return { trans, invs };
  }, [transactions, inventoryLogs, timeFilter]);

  // KPI 1: Sales Kotor
  const grossSales = useMemo(() => {
    return filteredData.trans.reduce((acc, t) => acc + Number(t.total_amount), 0);
  }, [filteredData]);

  // KPI 2: Biaya Belanja
  const totalExpense = useMemo(() => {
    return filteredData.invs
      .filter((i) => i.type === "in")
      .reduce((acc, i) => acc + Number(i.cost_total), 0);
  }, [filteredData]);

  // KPI 3: Laba Bersih & Persentase Margin
  const netProfit = grossSales - totalExpense;
  const marginPercentage = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : "0";

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

    // Populate omzet
    transactions.forEach((t) => {
      const dateKey = (t.created_at || "").slice(0, 10);
      if (days[dateKey]) {
        days[dateKey].omzet += Number(t.total_amount);
      }
    });

    // Populate belanja
    inventoryLogs.forEach((i) => {
      if (i.type === "in") {
        const dateKey = (i.created_at || "").slice(0, 10);
        if (days[dateKey]) {
          days[dateKey].belanja += Number(i.cost_total);
        }
      }
    });

    return Object.values(days).map((d) => ({
      ...d,
      laba: d.omzet - d.belanja,
    }));
  }, [transactions, inventoryLogs]);

  // Top Products Ranking
  const topProducts = useMemo(() => {
    const productCounts: { [name: string]: { name: string; qty: number; revenue: number } } = {};

    filteredData.trans.forEach((t) => {
      (t.items || []).forEach((it) => {
        if (!productCounts[it.product_name]) {
          productCounts[it.product_name] = { name: it.product_name, qty: 0, revenue: 0 };
        }
        productCounts[it.product_name].qty += it.qty;
        productCounts[it.product_name].revenue += Number(it.subtotal);
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

  return (
    <div className="space-y-5 pb-10">
      {/* Header & Quick Date Filters */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Dashboard Laporan & Metrik Laba
            </h1>
            <span className="text-lg">📊🌸</span>
          </div>
          <p className="text-xs text-gray-500">
            Analisis penjualan, perbandingan belanja bahan baku, dan performa laba bersih LA Fried Chicken.
          </p>
        </div>

        {/* Quick Date Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: "today", label: "Hari Ini" },
            { key: "yesterday", label: "Kemarin" },
            { key: "7days", label: "7 Hari Terakhir" },
            { key: "all", label: "Semua" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setTimeFilter(btn.key as any)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all btn-bounce ${
                timeFilter === btn.key
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                  : "bg-pink-50 text-gray-700 hover:bg-pink-100"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 KPI CARDS DI BAGIAN TERATAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Sales Kotor */}
        <div className="bg-white rounded-3xl p-5 border border-pink-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500">Sales Kotor (Omzet)</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-rose-600">
                {filteredData.trans.length} Pesanan
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {formatRupiah(grossSales)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-pink-50 text-[11px] text-gray-500 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
            <span>Total penjualan masuk</span>
          </div>
        </div>

        {/* Card 2: Biaya Belanja */}
        <div className="bg-white rounded-3xl p-5 border border-pink-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500">Biaya Belanja Bahan</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                Pengeluaran
              </span>
            </div>
            <p className="text-2xl font-black text-amber-600 tracking-tight">
              {formatRupiah(totalExpense)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-pink-50 text-[11px] text-gray-500 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            <span>Modal belanja stok operasional</span>
          </div>
        </div>

        {/* Card 3: Margin / Laba Bersih (Highlight Utama Kontras) */}
        <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-500 rounded-3xl p-5 text-white shadow-xl shadow-rose-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/90">Laba Bersih & Margin</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white backdrop-blur-md">
                Margin {marginPercentage}%
              </span>
            </div>
            <p className="text-3xl font-black tracking-tight">
              {formatRupiah(netProfit)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-white/20 text-[11px] text-white/80 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Omzet dikurangi Biaya Belanja</span>
          </div>
        </div>
      </div>

      {/* GRAFIK HARIAN INTERAKTIF (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grafik Batang: Omzet vs Biaya Belanja */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-800">
                Tren Harian (Omzet vs Belanja)
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
                <Bar dataKey="belanja" name="Biaya Belanja" fill="#FBBF24" radius={[6, 6, 0, 0]} />
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

      {/* REKAP OPERASIONAL & TOP MENU */}
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
    </div>
  );
}
