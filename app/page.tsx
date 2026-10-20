"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Wallet, 
  QrCode, 
  Check, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  ZoomIn,
  Maximize2,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Product, ProductAddon, CartItem, StoreSettings, Transaction, CashierSession } from "@/types";
import { formatRupiah, generateReceiptNo } from "@/lib/utils";
import InitialDrawerModal from "@/components/InitialDrawerModal";
import CelebrationModal from "@/components/CelebrationModal";
import ReceiptModal from "@/components/ReceiptModal";
import CashierLoginModal from "@/components/CashierLoginModal";

// Fallback seed products if table not yet populated
const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Dada", category: "Ayam", price: 11000, is_available: true, icon_or_image_url: "🍗" },
  { id: "2", name: "Paha Atas", category: "Ayam", price: 11000, is_available: true, icon_or_image_url: "🍗" },
  { id: "3", name: "Paha Bawah", category: "Ayam", price: 9000, is_available: true, icon_or_image_url: "🍗" },
  { id: "4", name: "Sayap", category: "Ayam", price: 9000, is_available: true, icon_or_image_url: "🍗" },
  { id: "5", name: "Paket Nasi + Dada", category: "Paket", price: 14000, is_available: true, icon_or_image_url: "🍱" },
  { id: "6", name: "Paket Hemat Paha Bawah", category: "Paket", price: 12000, is_available: true, icon_or_image_url: "🍱" },
  { 
    id: "7", 
    name: "Promo Beli 2 Gratis 1 Sayap", 
    category: "Promo", 
    price: 18000, 
    original_price: 27000,
    discount_percent: 33,
    promo_items: [
      { productId: "4", name: "Sayap", qty: 3, unit_price: 9000 }
    ],
    is_available: true, 
    icon_or_image_url: "🔥" 
  },
  { 
    id: "8", 
    name: "Promo Combo Serbu (Dada + Nasi + Es Teh)", 
    category: "Promo", 
    price: 14400, 
    original_price: 18000,
    discount_percent: 20,
    promo_items: [
      { productId: "1", name: "Dada", qty: 1, unit_price: 11000 },
      { productId: "9", name: "Nasi", qty: 1, unit_price: 4000 },
      { productId: "10", name: "Es Teh", qty: 1, unit_price: 3000 },
    ],
    is_available: true, 
    icon_or_image_url: "🎉" 
  },
  { id: "9", name: "Nasi", category: "Makanan", price: 4000, is_available: true, icon_or_image_url: "🍚" },
  { id: "10", name: "Es Teh", category: "Minuman", price: 3000, is_available: true, icon_or_image_url: "🥤" },
];

const DEFAULT_ADDONS: ProductAddon[] = [
  { id: "1", name: "Saus Keju", price: 2000 },
  { id: "2", name: "Sambal Geprek", price: 2000 },
  { id: "3", name: "Saus Pedas", price: 1000 },
];

// In-memory module cache untuk instant page switching tanpa delay
let globalCachedProducts: Product[] | null = null;
let globalCachedAddons: ProductAddon[] | null = null;
let globalCachedSettings: StoreSettings | null = null;

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>(() => {
    if (globalCachedProducts && globalCachedProducts.length > 0) return globalCachedProducts;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("la_pos_products_cache");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.length > 0) {
            globalCachedProducts = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    return DEFAULT_PRODUCTS;
  });

  const [addons, setAddons] = useState<ProductAddon[]>(() => {
    if (globalCachedAddons && globalCachedAddons.length > 0) return globalCachedAddons;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("la_pos_addons_cache");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.length > 0) {
            globalCachedAddons = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    return DEFAULT_ADDONS;
  });

  const [settings, setSettings] = useState<StoreSettings | null>(() => globalCachedSettings);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => !globalCachedProducts || globalCachedProducts.length === 0);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Cashier Session
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);

  // Drawer Check
  const [isDrawerOpenModal, setIsDrawerOpenModal] = useState(false);
  const [hasCheckedDrawer, setHasCheckedDrawer] = useState(false);

  // Checkout modal & payment
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQrisZoomOpen, setIsQrisZoomOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // Cart animation trigger
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false);

  // Fetch initial data secara PARALEL untuk kecepatan maksimal (< 800ms vs 5000ms)
  const fetchData = async () => {
    try {
      // 0. Check Cashier Session
      if (typeof window !== "undefined") {
        const storedCashier = localStorage.getItem("la_active_cashier");
        if (storedCashier) {
          try {
            setCashierSession(JSON.parse(storedCashier));
          } catch {
            setIsCashierModalOpen(true);
          }
        } else {
          setIsCashierModalOpen(true);
        }
      }

      // 1. Eksekusi semua query secara PARALEL (Promise.all)
      const [drawerRes, productsRes, addonsRes, settingsRes] = await Promise.all([
        supabase
          .from("cash_drawers")
          .select("*")
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("product_addons")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("store_settings")
          .select("*")
          .limit(1)
          .maybeSingle(),
      ]);

      // Check Drawer
      const localDrawer = typeof window !== "undefined" ? localStorage.getItem("la_active_drawer") : null;
      if (!drawerRes.data && !localDrawer) {
        setIsDrawerOpenModal(true);
      }
      setHasCheckedDrawer(true);

      // Handle Products
      if (!productsRes.error && productsRes.data && productsRes.data.length > 0) {
        let merged = productsRes.data;
        if (typeof window !== "undefined") {
          try {
            const extras = JSON.parse(localStorage.getItem("la_promo_products_extras") || "{}");
            merged = productsRes.data.map((p) => {
              const extra = extras[p.id];
              if (extra) {
                return {
                  ...p,
                  original_price: p.original_price ?? extra.original_price,
                  discount_percent: p.discount_percent ?? extra.discount_percent,
                  promo_items: p.promo_items ?? extra.promo_items,
                };
              }
              return p;
            });
          } catch {}
        }
        setProducts(merged);
        globalCachedProducts = merged;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("la_pos_products_cache", JSON.stringify(merged));
          } catch {}
        }
      }

      // Handle Addons
      if (!addonsRes.error && addonsRes.data && addonsRes.data.length > 0) {
        setAddons(addonsRes.data);
        globalCachedAddons = addonsRes.data;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("la_pos_addons_cache", JSON.stringify(addonsRes.data));
          } catch {}
        }
      }

      // Handle Settings
      if (settingsRes.data) {
        setSettings(settingsRes.data);
        globalCachedSettings = settingsRes.data;
      }
    } catch (err) {
      console.error("Error fetching POS data:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Categories: Urutkan agar 'Promo' selalu berada persis disamping 'Paket'
  const categories = useMemo(() => {
    const desiredOrder = ["Ayam", "Paket", "Promo", "Makanan", "Minuman"];
    const existingCats = Array.from(new Set(products.map((p) => p.category)));

    const result: string[] = [];
    desiredOrder.forEach((c) => {
      // Selalu sertakan Paket & Promo atau kategori yang memiliki produk
      if (existingCats.includes(c) || c === "Paket" || c === "Promo") {
        result.push(c);
      }
    });

    existingCats.forEach((c) => {
      if (!result.includes(c)) {
        result.push(c);
      }
    });

    return ["Semua", ...result];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "Semua" || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Cart Calculations
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
      return acc + (item.price + addonsPrice) * item.qty;
    }, 0);
  }, [cart]);

  // Handle Add Product Click (VERSI CEPAT - TANPA POPUP SAUS)
  const handleProductClick = (product: Product) => {
    if (!product.is_available) return;
    // Langsung masuk keranjang tanpa memunculkan modal
    addToCartDirect(product, []);
  };

  const addToCartDirect = (product: Product, selectedAddonsList: ProductAddon[]) => {
    // Check if same product with same addons already in cart
    const addonIds = selectedAddonsList.map((a) => a.id).sort().join(",");
    
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        const itemAddonIds = (item.selectedAddons || []).map((a) => a.id).sort().join(",");
        return item.productId === product.id && itemAddonIds === addonIds;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            selectedAddons: selectedAddonsList,
          },
        ];
      }
    });

    // Trigger cart badge bounce
    setCartBadgeAnimate(true);
    setTimeout(() => setCartBadgeAnimate(false), 300);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].qty + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].qty = newQty;
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cash Quick Presets
  const cashPresets = [
    { label: "Uang Pas", val: cartTotal },
    { label: "10.000", val: 10000 },
    { label: "20.000", val: 20000 },
    { label: "50.000", val: 50000 },
    { label: "100.000", val: 100000 },
  ];

  // Kembalian logic
  const cashDifference = cashReceived - cartTotal;
  const isUnderpaid = paymentMethod === "cash" && cashReceived < cartTotal;

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && isUnderpaid) return;

    setIsSubmitting(true);
    const receiptNo = generateReceiptNo();
    const finalCashReceived = paymentMethod === "cash" ? cashReceived : cartTotal;
    const finalChange = paymentMethod === "cash" ? Math.max(0, cashDifference) : 0;

    const transactionItemsPayload = cart.map((item) => {
      const addonsNames = (item.selectedAddons || []).map((a) => a.name).join(", ");
      const fullName = addonsNames ? `${item.name} (+${addonsNames})` : item.name;
      const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
      const unitPrice = item.price + addonsPrice;
      return {
        product_name: fullName,
        qty: item.qty,
        unit_price: unitPrice,
        subtotal: unitPrice * item.qty,
      };
    });

    // Simpan riwayat transaksi kasir ke local memory untuk audit trail offline/online
    const saveCashierHistory = (tx: Transaction) => {
      try {
        const cName = tx.cashier_name || cashierSession?.name || "Kasir";
        const mapList = JSON.parse(localStorage.getItem("la_cashier_transactions_map") || "[]");
        mapList.unshift({
          id: tx.id,
          receipt_no: tx.receipt_no,
          cashier_name: cName,
          total_amount: tx.total_amount,
          payment_method: tx.payment_method,
          cash_received: tx.cash_received,
          cash_change: tx.cash_change,
          status: tx.status,
          created_at: tx.created_at || new Date().toISOString(),
          items: tx.items || [],
        });
        localStorage.setItem("la_cashier_transactions_map", JSON.stringify(mapList.slice(0, 500)));

        const actLogs = JSON.parse(localStorage.getItem("la_cashier_activity_logs") || "[]");
        actLogs.unshift({
          id: "act-" + Date.now(),
          cashier_name: cName,
          action: "sale",
          details: `Input transaksi #${tx.receipt_no} - Total ${formatRupiah(tx.total_amount)}`,
          receipt_no: tx.receipt_no,
          amount: tx.total_amount,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("la_cashier_activity_logs", JSON.stringify(actLogs.slice(0, 200)));
      } catch (err) {
        console.error("Gagal simpan log riwayat kasir:", err);
      }
    };

    const currentCashierName = cashierSession?.name || "Kasir";

    // PROSES BACKGROUND ASYNCHRONOUS UNTUK MEMOTONG STOK (FIFO) BERDASARKAN RESEP
    const processFifoStockDeduction = async (cartItems: CartItem[]) => {
      try {
        for (const item of cartItems) {
          if (!item.productId || item.qty <= 0) continue;

          // Map untuk agregasi total kebutuhan bahan baku dan kemasan (rawItemId -> totalNeededQty)
          const requiredMaterialsMap = new Map<string, number>();

          // 1. Ambil data kebutuhan bahan dari product_recipes berdasarkan productId
          let { data: productRecs, error: recErr } = await supabase
            .from("product_recipes")
            .select("*")
            .eq("product_id", item.productId);

          if (recErr) {
            console.error(`Gagal mengambil resep untuk productId ${item.productId}:`, recErr);
          }

          // Cek jika produk merupakan promo / paket dengan promo_items
          if (!productRecs || productRecs.length === 0) {
            const matchedProd = products.find((p) => p.id === item.productId);
            if (matchedProd?.promo_items && matchedProd.promo_items.length > 0) {
              const combinedRecipes: any[] = [];
              for (const comp of matchedProd.promo_items) {
                const { data: compRecs } = await supabase
                  .from("product_recipes")
                  .select("*")
                  .eq("product_id", comp.productId);

                if (compRecs && compRecs.length > 0) {
                  compRecs.forEach((cr) => {
                    combinedRecipes.push({
                      ...cr,
                      qty_required: Number(cr.qty_required || 1) * Number(comp.qty || 1),
                    });
                  });
                }
              }
              productRecs = combinedRecipes;
            }
          }

          if (productRecs && productRecs.length > 0) {
            for (const pr of productRecs) {
              if (!pr.inventory_item_id) continue;
              const need = Number(pr.qty_required || 1) * Number(item.qty);
              requiredMaterialsMap.set(
                pr.inventory_item_id,
                (requiredMaterialsMap.get(pr.inventory_item_id) || 0) + need
              );
            }
          }

          // 1b. Iterasi pada item.selectedAddons (jika ada) dan ambil resep dari addon_recipes
          if (item.selectedAddons && item.selectedAddons.length > 0) {
            for (const addon of item.selectedAddons) {
              if (!addon.id) continue;
              try {
                const { data: addonRecs, error: addonRecErr } = await supabase
                  .from("addon_recipes")
                  .select("*")
                  .eq("addon_id", addon.id);

                if (addonRecErr) {
                  console.error(`Gagal mengambil resep untuk addonId ${addon.id}:`, addonRecErr);
                } else if (addonRecs && addonRecs.length > 0) {
                  for (const ar of addonRecs) {
                    if (!ar.inventory_item_id) continue;
                    // Kebutuhan bahan baku / kemasan addon dikalikan dengan qty cart item
                    const addonNeed = Number(ar.qty_required || 1) * Number(item.qty);
                    requiredMaterialsMap.set(
                      ar.inventory_item_id,
                      (requiredMaterialsMap.get(ar.inventory_item_id) || 0) + addonNeed
                    );
                  }
                }
              } catch (addonErr) {
                console.error("Error fetching addon_recipes:", addonErr);
              }
            }
          }

          // Jika tidak ada bahan yang perlu dipotong untuk menu & addon ini, lewati
          if (requiredMaterialsMap.size === 0) {
            continue;
          }

          // Looping setiap bahan dalam resep yang telah diagregasikan
          for (const [rawItemId, totalNeededQty] of Array.from(requiredMaterialsMap.entries())) {
            if (!rawItemId || totalNeededQty <= 0) continue;
            let remainingToDeduct = totalNeededQty;
            let totalHpp = 0;
            let totalDeductedFromBatches = 0;

            // 2. Cari stok bahan di inventory_batches (filter remaining_qty > 0, urutkan batch_date ASCENDING)
            const { data: batches, error: batchErr } = await supabase
              .from("inventory_batches")
              .select("*")
              .eq("inventory_item_id", rawItemId)
              .gt("remaining_qty", 0)
              .order("batch_date", { ascending: true });

            if (batchErr) {
              console.error(`Gagal mengambil inventory_batches untuk ${rawItemId}:`, batchErr);
            }

            // 3. Lakukan looping FIFO: potong remaining_qty dari batch tertua
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

                // Update ke tabel inventory_batches
                const { error: updBatchErr } = await supabase
                  .from("inventory_batches")
                  .update({ remaining_qty: newRemaining })
                  .eq("id", batch.id);

                if (updBatchErr) {
                  console.error(`Gagal update batch ${batch.id}:`, updBatchErr);
                }
              }
            }

            // 4. Krusial untuk Laba Bersih: Hitung total HPP (modal asli) dari batch yang terpotong.
            // Insert catatan ke inventory_logs dengan data: type: "out", payment_source: "system_fifo",
            // dan masukkan total HPP tersebut ke kolom cost_total.
            const qtyDeducted = totalDeductedFromBatches > 0 ? totalDeductedFromBatches : totalNeededQty;

            const logPayload = {
              item_id: rawItemId,
              change_qty: -qtyDeducted,
              type: "out",
              cost_total: totalHpp,
              payment_source: "system_fifo",
            };

            let insertedRow: any = null;
            const { data: logRes, error: logErr } = await supabase
              .from("inventory_logs")
              .insert(logPayload)
              .select()
              .maybeSingle();

            if (logErr) {
              // Jika constraint database belum diperbarui, fallback ke payment_source 'other'
              if (logErr.code === "23514" || logErr.message?.includes("payment_source")) {
                const { data: retryLog } = await supabase
                  .from("inventory_logs")
                  .insert({
                    ...logPayload,
                    payment_source: "other",
                  })
                  .select()
                  .maybeSingle();
                insertedRow = retryLog;
              } else {
                console.error("Gagal insert log FIFO:", logErr);
              }
            } else {
              insertedRow = logRes;
            }

            // Simpan ke local audit trail untuk offline/fallback laporan
            if (typeof window !== "undefined") {
              try {
                const localFifoLogs = JSON.parse(localStorage.getItem("la_fifo_logs") || "[]");
                localFifoLogs.unshift(
                  insertedRow || {
                    id: "fifo-log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
                    item_id: rawItemId,
                    change_qty: -qtyDeducted,
                    type: "out",
                    cost_total: totalHpp,
                    payment_source: "system_fifo",
                    created_at: new Date().toISOString(),
                  }
                );
                localStorage.setItem("la_fifo_logs", JSON.stringify(localFifoLogs.slice(0, 200)));
              } catch {}
            }

            // 5. Update current_stock di tabel inventory_items
            const { data: curItem } = await supabase
              .from("inventory_items")
              .select("current_stock")
              .eq("id", rawItemId)
              .maybeSingle();

            if (curItem) {
              const updatedStock = Math.max(0, Number(curItem.current_stock || 0) - totalNeededQty);
              const { error: updItemErr } = await supabase
                .from("inventory_items")
                .update({ current_stock: updatedStock })
                .eq("id", rawItemId);

              if (updItemErr) {
                console.error(`Gagal update current_stock ${rawItemId}:`, updItemErr);
              }
            }
          }
        }
      } catch (fifoErr) {
        console.error("Gagal proses potong stok FIFO di background:", fifoErr);
      }
    };

    try {
      // 1. Insert Transaction (Mencoba dengan kolom cashier_name)
      let transData: any = null;
      const { data: tData, error: transErr } = await supabase
        .from("transactions")
        .insert({
          receipt_no: receiptNo,
          total_amount: cartTotal,
          payment_method: paymentMethod,
          cash_received: finalCashReceived,
          cash_change: finalChange,
          status: "completed",
          cashier_name: currentCashierName,
        })
        .select()
        .single();

      if (transErr) {
        // Jika kolom cashier_name belum ada di schema Supabase, fallback insert tanpa kolom tersebut
        if (transErr.message?.includes("cashier_name") || transErr.code === "PGRST204") {
          const { data: retryData, error: retryErr } = await supabase
            .from("transactions")
            .insert({
              receipt_no: receiptNo,
              total_amount: cartTotal,
              payment_method: paymentMethod,
              cash_received: finalCashReceived,
              cash_change: finalChange,
              status: "completed",
            })
            .select()
            .single();

          if (retryErr) {
            if (retryErr.code === "PGRST205" || retryErr.message?.includes("schema cache")) {
              const demoTx: Transaction = {
                id: "demo-tx-" + Date.now(),
                receipt_no: receiptNo,
                total_amount: cartTotal,
                payment_method: paymentMethod,
                cash_received: finalCashReceived,
                cash_change: finalChange,
                status: "completed",
                cashier_name: currentCashierName,
                created_at: new Date().toISOString(),
                items: transactionItemsPayload,
              };
              saveCashierHistory(demoTx);
              setLastTransaction(demoTx);
              setCart([]);
              setIsCheckoutOpen(false);
              setShowCelebration(true);
              return;
            }
            throw retryErr;
          }
          transData = retryData;
        } else if (transErr.code === "PGRST205" || transErr.message?.includes("schema cache")) {
          // Graceful demo transaction
          const demoTx: Transaction = {
            id: "demo-tx-" + Date.now(),
            receipt_no: receiptNo,
            total_amount: cartTotal,
            payment_method: paymentMethod,
            cash_received: finalCashReceived,
            cash_change: finalChange,
            status: "completed",
            cashier_name: currentCashierName,
            created_at: new Date().toISOString(),
            items: transactionItemsPayload,
          };
          saveCashierHistory(demoTx);
          setLastTransaction(demoTx);
          setCart([]);
          setIsCheckoutOpen(false);
          setShowCelebration(true);
          return;
        } else {
          throw transErr;
        }
      } else {
        transData = tData;
      }

      // 2. Insert Transaction Items
      const itemsPayloadWithId = transactionItemsPayload.map((it) => ({
        ...it,
        transaction_id: transData.id,
      }));

      const { error: itemsErr } = await supabase
        .from("transaction_items")
        .insert(itemsPayloadWithId);

      if (itemsErr) console.error("Error inserting items:", itemsErr);

      // PROSES BACKGROUND ASYNCHRONOUS: MEMOTONG STOK (FIFO) BERDASARKAN RESEP
      const cartSnapshot = [...cart];
      processFifoStockDeduction(cartSnapshot).catch((err) => {
        console.error("Asynchronous FIFO process error:", err);
      });

      const completedTransaction: Transaction = {
        ...transData,
        cashier_name: currentCashierName,
        items: transactionItemsPayload,
      };

      saveCashierHistory(completedTransaction);
      setLastTransaction(completedTransaction);
      setCart([]);
      setIsCheckoutOpen(false);
      setShowCelebration(true);
    } catch (err: any) {
      console.error("Gagal memproses transaksi:", err);
      // Fallback in case of network issue
      const demoTx: Transaction = {
        id: "demo-tx-" + Date.now(),
        receipt_no: receiptNo,
        total_amount: cartTotal,
        payment_method: paymentMethod,
        cash_received: finalCashReceived,
        cash_change: finalChange,
        status: "completed",
        cashier_name: currentCashierName,
        created_at: new Date().toISOString(),
        items: transactionItemsPayload,
      };
      saveCashierHistory(demoTx);
      setLastTransaction(demoTx);
      setCart([]);
      setIsCheckoutOpen(false);
      setShowCelebration(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-28 lg:pb-8"> {/* Memberi ruang kosong di bawah layar HP agar tombol melayang tidak tertutup */}
      {/* Cashier Login Modal */}
      <CashierLoginModal
        isOpen={isCashierModalOpen}
        validPin={settings?.admin_pin || "1234"}
        onSuccess={(session) => {
          setCashierSession(session);
          setIsCashierModalOpen(false);
        }}
      />

      {/* Drawer Requirement Modal */}
      <InitialDrawerModal
        isOpen={!isCashierModalOpen && isDrawerOpenModal}
        onSuccess={() => setIsDrawerOpenModal(false)}
        onClose={() => setIsDrawerOpenModal(false)}
      />

      {/* Celebration FX Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        transaction={lastTransaction}
        onClose={() => setShowCelebration(false)}
        onOpenReceipt={() => {
          setShowCelebration(false);
          setShowReceipt(true);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        transaction={lastTransaction}
        settings={settings}
        cashierName={cashierSession?.name}
        onClose={() => setShowReceipt(false)}
      />

      {/* Floating Mobile Cart Bar (Khusus Layar HP) */}
      {cart.length > 0 && (
        <div className="fixed bottom-[72px] left-4 right-4 z-40 lg:hidden animate-pop-in">
          <button
            onClick={() => {
              document.getElementById('cart-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="w-full bg-rose-600 text-white shadow-xl shadow-rose-300 rounded-2xl p-3.5 flex items-center justify-between active:scale-95 transition-transform border border-rose-400"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-rose-600 text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                  {cartItemCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-medium text-rose-100 leading-none mb-0.5">Cek Keranjang & Bayar</p>
                <p className="text-sm font-black leading-tight">{formatRupiah(cartTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-xs bg-white/20 px-3 py-1.5 rounded-xl">
              <span>Ke Kasir</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Top Banner & Search */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-pink-100 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-gray-800">
                Menu Kios LA Fried Chicken
              </h1>
              <span className="text-base">🍗🌸</span>
            </div>
            <p className="text-xs text-gray-500">
              Sentuh produk untuk menambahkan pesanan ke keranjang
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu ayam / nasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all font-medium"
            />
          </div>
        </div>

        {/* Category Pills (Touch Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isPromo = cat === "Promo";
            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all btn-bounce flex items-center gap-1.5 ${
                  isActive
                    ? isPromo
                      ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-rose-300 ring-2 ring-red-300"
                      : "bg-rose-500 text-white shadow-md shadow-rose-200"
                    : isPromo
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-extrabold"
                    : "bg-pink-50/80 text-gray-700 hover:bg-pink-100"
                }`}
              >
                {isPromo && <span>🔥</span>}
                <span>{cat}</span>
                {isPromo && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-black uppercase rounded-full ${
                      isActive ? "bg-white text-red-600" : "bg-red-500 text-white"
                    }`}
                  >
                    HOT
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Products Grid (Touch-friendly large cards) */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleProductClick(p)}
                className={`bg-white rounded-3xl p-3.5 sm:p-4 border shadow-sm transition-all text-left flex flex-col justify-between select-none relative overflow-hidden ${
                  p.is_available
                    ? "cursor-pointer hover:shadow-md hover:border-pink-300 active:scale-95 btn-bounce border-pink-100"
                    : "opacity-60 cursor-not-allowed border-gray-200 bg-gray-50"
                }`}
              >
                {/* Badges: Habis vs Promo Diskon */}
                {!p.is_available ? (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    Habis
                  </span>
                ) : p.category === "Promo" && p.discount_percent && Number(p.discount_percent) > 0 ? (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-black bg-gradient-to-r from-red-500 to-rose-600 text-white px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 animate-pulse">
                    <span>🔥</span>
                    <span>-{p.discount_percent}%</span>
                  </span>
                ) : null}

                <div>
                  {/* Icon/Emoji */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-50 flex items-center justify-center text-3xl mb-3 shadow-inner overflow-hidden">
                    {p.icon_or_image_url?.startsWith("http") ? (
                      <img
                        src={p.icon_or_image_url}
                        alt={p.name}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <span>{p.icon_or_image_url || "🍗"}</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-800 leading-tight mb-1">
                    {p.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                      p.category === "Promo"
                        ? "bg-red-100 text-red-600 border border-red-200 font-black"
                        : "text-rose-500 bg-rose-50"
                    }`}
                  >
                    {p.category === "Promo" ? "🔥 Promo Hemat" : p.category}
                  </span>

                  {/* Komponen Alacarte Paket Promo jika ada */}
                  {p.category === "Promo" && p.promo_items && p.promo_items.length > 0 && (
                    <div className="bg-pink-50/70 rounded-xl p-1.5 mb-2 border border-pink-100">
                      <p className="text-[10px] text-gray-600 font-medium leading-tight">
                        <span className="font-bold text-rose-600">Isi: </span>
                        {p.promo_items.map((it) => `${it.qty}x ${it.name}`).join(" + ")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-pink-50 mt-1">
                  <div className="min-w-0">
                    {p.original_price && Number(p.original_price) > Number(p.price) ? (
                      <span className="text-[10px] line-through text-gray-400 font-bold block leading-none mb-0.5">
                        {formatRupiah(Number(p.original_price))}
                      </span>
                    ) : null}
                    <span className="font-black text-rose-600 text-sm leading-tight block">
                      {formatRupiah(Number(p.price))}
                    </span>
                  </div>
                  {p.is_available && (
                    <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isLoadingProducts && filteredProducts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm animate-pulse space-y-3">
                  <div className="w-12 h-12 bg-pink-100/70 rounded-2xl mx-auto" />
                  <div className="h-4 bg-pink-100/70 rounded-lg w-3/4 mx-auto" />
                  <div className="h-3 bg-pink-50 rounded-lg w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-pink-100">
              <span className="text-3xl mb-2 block">🍗 🔍</span>
              <p className="text-sm font-bold text-gray-700">Menu tidak ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">Coba kata kunci lain atau pilih kategori Semua</p>
            </div>
          ) : null}
        </div>

        {/* Cart Panel (Desktop Sticky & Mobile Floating Bar / Trigger) */}
        <div id="cart-panel" className="lg:col-span-4 scroll-mt-20">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-pink-100 sticky top-20">
            {/* Header Keranjang */}
            <div className="flex items-center justify-between pb-3 border-b border-pink-100 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`relative p-2 rounded-xl bg-rose-50 text-rose-500 transition-transform ${
                    cartBadgeAnimate ? "scale-125" : ""
                  }`}
                >
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-sm animate-pop-in">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-gray-800">Keranjang Kasir</h2>
                  <span className="text-[11px] text-gray-500">{cartItemCount} item dipilih</span>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 transition-colors"
                  title="Kosongkan Keranjang"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-[300px] sm:max-h-[360px] overflow-y-auto pr-1">
              {cart.map((item, idx) => {
                const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
                const subtotal = (Number(item.price) + addonsPrice) * item.qty;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-gray-800 truncate">{item.name}</p>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <p className="text-[10px] text-rose-600 truncate">
                          + {item.selectedAddons.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      <p className="text-[11px] font-extrabold text-gray-700 mt-0.5">
                        {formatRupiah(subtotal)}
                      </p>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-pink-200">
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, -1)}
                        className="w-6 h-6 rounded-lg bg-pink-50 hover:bg-pink-100 text-rose-600 flex items-center justify-center font-bold text-xs transition-colors"
                      >
                        <Minus className="w-3 h-3 stroke-[3]" />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-gray-800">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, 1)}
                        className="w-6 h-6 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs transition-colors"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-pink-50 text-rose-400 flex items-center justify-center mb-2">
                    <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">Keranjang Masih Kosong</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Silakan sentuh menu di samping untuk mulai transaksi.
                  </p>
                </div>
              )}
            </div>

            {/* Total & Checkout Button */}
            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-pink-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-600">Total Tagihan:</span>
                  <span className="text-lg font-black text-rose-600">
                    {formatRupiah(cartTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCashReceived(cartTotal);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-200 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[52px]"
                >
                  <span>Bayar Sekarang ({cartItemCount})</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CHECKOUT & KALKULATOR KEMBALIAN INSTAN */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-pink-100 text-left relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div>
                <h3 className="font-black text-lg text-gray-800">
                  Pembayaran Kasir 💵
                </h3>
                <p className="text-xs text-gray-500">Pilih metode & hitung kembalian cepat</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-3 pr-1 space-y-4">
              {/* Total Card */}
              <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 rounded-2xl text-white shadow-md shadow-rose-200">
                <span className="text-xs font-semibold opacity-90">Total Belanja:</span>
                <p className="text-2xl font-black tracking-tight">{formatRupiah(cartTotal)}</p>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all btn-bounce min-h-[48px] ${
                      paymentMethod === "cash"
                        ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                        : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50"
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qris")}
                    className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all btn-bounce min-h-[48px] ${
                      paymentMethod === "qris"
                        ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                        : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS Toko</span>
                  </button>
                </div>
              </div>

              {/* Cash Section with Instant Denomination & Change Calculator */}
              {paymentMethod === "cash" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nominal Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      value={cashReceived || ""}
                      onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-pink-50/50 border border-pink-200 rounded-2xl text-xl font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 text-right"
                      placeholder="0"
                    />
                  </div>

                  {/* Quick Denominations */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {cashPresets.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCashReceived(p.val)}
                        className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all btn-bounce ${
                          cashReceived === p.val
                            ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                            : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Change or Underpaid Warning */}
                  {isUnderpaid ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <div className="text-xs">
                        <span className="font-extrabold block">Uang Kurang!</span>
                        <span>Kurang {formatRupiah(Math.abs(cashDifference))}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold">Kembalian:</span>
                      </div>
                      <span className="text-xl font-black text-emerald-600">
                        {formatRupiah(cashDifference)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* QRIS Mode Presentation */}
              {paymentMethod === "qris" && (
                <div className="text-center p-4 bg-pink-50/50 rounded-2xl border border-pink-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-700">
                      Scan Barcode QRIS LA Fried Chicken
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsQrisZoomOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-pink-200 rounded-xl text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Perbesar QR</span>
                    </button>
                  </div>
                  
                  {/* QR Image (Larger & Clickable to Zoom) */}
                  <div 
                    onClick={() => setIsQrisZoomOpen(true)}
                    className="w-56 h-56 sm:w-60 sm:h-60 mx-auto bg-white p-2.5 rounded-2xl border border-pink-200 shadow-md flex items-center justify-center cursor-pointer group hover:border-rose-400 hover:shadow-lg transition-all relative overflow-hidden"
                    title="Ketuk untuk memperbesar QRIS ke layar penuh"
                  >
                    <img
                      src={
                        settings?.qris_static_image_url ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=LA-FRIED-CHICKEN-PAY-${cartTotal}`
                      }
                      alt="QRIS Barcode"
                      className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-[0.5px]">
                      <span className="px-3 py-1.5 bg-rose-600/90 text-white text-[11px] font-black rounded-xl shadow-md flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Klik untuk Perbesar</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setIsQrisZoomOpen(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 py-1 px-3 bg-white/80 rounded-xl border border-pink-100"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Tampilkan Layar Penuh ke Pelanggan</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    Minta pembeli menunjukkan bukti transfer lunas senilai{" "}
                    <span className="font-extrabold text-rose-600">{formatRupiah(cartTotal)}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Transaction Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isSubmitting || (paymentMethod === "cash" && isUnderpaid)}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-200 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[52px]"
            >
              {isSubmitting ? (
                <span className="animate-spin text-lg">🌸</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    {paymentMethod === "cash"
                      ? `Konfirmasi Bayar (${formatRupiah(cartTotal)})`
                      : "Konfirmasi Lunas QRIS 🌸"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL ZOOM QRIS LAYAR BESAR (UNTUK SCAN HP PELANGGAN) */}
      {isQrisZoomOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md animate-pop-in"
          onClick={() => setIsQrisZoomOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-pink-100 text-center relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsQrisZoomOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Tutup Tampilan QRIS"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Store Header */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black rounded-full mb-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>{settings?.store_name || "LA Fried Chicken"}</span>
              </span>
              <h3 className="text-base font-extrabold text-gray-800">
                Scan QRIS Pembayaran
              </h3>
            </div>

            {/* Big Amount Badge */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white w-full py-2.5 px-4 rounded-2xl shadow-md shadow-rose-200 mb-3">
              <span className="text-[11px] font-medium opacity-90 block">Total Tagihan:</span>
              <span className="text-2xl font-black tracking-tight">{formatRupiah(cartTotal)}</span>
            </div>

            {/* Giant QRIS Image */}
            <div className="w-64 h-64 sm:w-72 sm:h-72 bg-white p-3 rounded-2xl border-2 border-dashed border-rose-300 shadow-xl flex items-center justify-center mb-3">
              <img
                src={
                  settings?.qris_static_image_url ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=LA-FRIED-CHICKEN-PAY-${cartTotal}`
                }
                alt="QRIS Barcode Jumbo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <p className="text-xs text-gray-500 font-medium mb-4">
              Arahkan kamera smartphone atau aplikasi e-wallet / mobile banking ke barcode di atas.
            </p>

            <button
              type="button"
              onClick={() => setIsQrisZoomOpen(false)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-2xl transition-all"
            >
              Tutup & Kembali ke Kasir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
