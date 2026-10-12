"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Flame, 
  Package, 
  Wallet, 
  BarChart3, 
  Settings,
  Sparkles,
  Store
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CashDrawer } from "@/types";

export default function Navbar() {
  const pathname = usePathname();
  const [activeDrawer, setActiveDrawer] = useState<CashDrawer | null>(null);
  const [cashierName, setCashierName] = useState<string | null>(null);

  useEffect(() => {
    function checkSession() {
      if (typeof window !== "undefined") {
        const localCashier = localStorage.getItem("la_active_cashier");
        if (localCashier) {
          try {
            setCashierName(JSON.parse(localCashier).name);
          } catch {
            setCashierName(null);
          }
        } else {
          setCashierName(null);
        }
      }
    }
    checkSession();
  }, [pathname]);

  const handleCashierLogout = () => {
    if (confirm(`Keluar dari shift ${cashierName || "kasir"}?`)) {
      localStorage.removeItem("la_active_cashier");
      setCashierName(null);
      window.location.reload();
    }
  };

  useEffect(() => {
    async function checkDrawer() {
      try {
        const { data, error } = await supabase
          .from("cash_drawers")
          .select("*")
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setActiveDrawer(data);
        } else {
          const local = typeof window !== "undefined" ? localStorage.getItem("la_active_drawer") : null;
          setActiveDrawer(local ? JSON.parse(local) : null);
        }
      } catch (err) {
        const local = typeof window !== "undefined" ? localStorage.getItem("la_active_drawer") : null;
        setActiveDrawer(local ? JSON.parse(local) : null);
      }
    }
    checkDrawer();

    const interval = setInterval(checkDrawer, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  const navItems = [
    { label: "Kasir", href: "/", icon: ShoppingBag, emoji: "🛒" },
    { label: "Etalase", href: "/frying", icon: Flame, emoji: "🍗" },
    { label: "Stok", href: "/inventory", icon: Package, emoji: "📦" },
    { label: "Laci Kas", href: "/drawer", icon: Wallet, emoji: "💵" },
    { label: "Laporan", href: "/reports", icon: BarChart3, emoji: "📊" },
    { label: "Admin", href: "/admin", icon: Settings, emoji: "⚙️" },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
              <span className="text-xl">🍗</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg text-gray-800 tracking-tight">
                  LA Fried Chicken
                </span>
                <span className="text-sm">🌸</span>
              </div>
              <p className="text-[11px] font-medium text-rose-500 tracking-wider uppercase">
                Renyah Gurih &bull; Kios POS
              </p>
            </div>
          </Link>

          {/* Status & Desktop Nav */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Cashier Badge */}
            {cashierName && (
              <button
                type="button"
                onClick={handleCashierLogout}
                title="Klik untuk ganti kasir / keluar shift"
                className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all shadow-sm"
              >
                <span>👤</span>
                <span className="max-w-[80px] sm:max-w-none truncate">{cashierName}</span>
                <span className="text-[10px] text-rose-400">✕</span>
              </button>
            )}

            {/* Drawer Status Pill */}
            <Link
              href="/drawer"
              className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all ${
                activeDrawer
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                  : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeDrawer ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="hidden sm:inline">Laci:</span>
              <span>{activeDrawer ? "Buka" : "Belum Buka"}</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-pink-50/70 p-1 rounded-2xl border border-pink-100">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-rose-500 text-white shadow-sm shadow-rose-300"
                        : "text-gray-600 hover:text-rose-600 hover:bg-white/80"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile (Thumb-Friendly, Fixed) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-100 shadow-lg px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all btn-bounce ${
                isActive
                  ? "text-rose-500 font-bold"
                  : "text-gray-400 hover:text-gray-600 font-medium"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? "bg-rose-50 scale-110" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-rose-500 stroke-[2.5]" : "text-gray-500"}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
