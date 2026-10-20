"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
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

let globalCachedProducts: Product[] | null = null;
let globalCachedAddons: ProductAddon[] | null = null;
let globalCachedSettings: StoreSettings | null = null;

export default function POSPage() {
  const [isMounted, setIsMounted] = useState(false);

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
  
  // State Pop-up Mobile Cart
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // State Animasi +1 Anti-Bug (Berdasarkan ID Produk)
  const [clickCounter, setClickCounter] = useState(0);
  const [floatingPlus, setFloatingPlus] = useState<{id: number, productId: string}[]>([]);

  // Cashier Session
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);

  // Drawer Check
  const [isDrawerOpenModal, setIsDrawerOpenModal] = useState(false);
  const [hasCheckedDrawer, setHasCheckedDrawer] = useState(false);

  // Addon selection modal
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<Product | null>(null);
  const [tempSelectedAddons, setTempSelectedAddons] = useState<ProductAddon[]>([]);

  // Checkout modal & payment
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQrisZoomOpen, setIsQrisZoomOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // Cart badge bounce trigger
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false);

  const fetchData = async () => {
    try {
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

      const [drawerRes, productsRes, addonsRes, settingsRes] = await Promise.all([
        supabase.from("cash_drawers").select("*").eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("products").select("*").order("created_at", { ascending: true }),
        supabase.from("product_addons").select("*").order("created_at", { ascending: true }),
        supabase.from("store_settings").select("*").limit(1).maybeSingle(),
      ]);

      const localDrawer = typeof window !== "undefined" ? localStorage.getItem("la_active_drawer") : null;
      if (!drawerRes.data && !localDrawer) {
        setIsDrawerOpenModal(true);
      }
      setHasCheckedDrawer(true);

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
          localStorage.setItem("la_pos_products_cache", JSON.stringify(merged));
        }
      }

      if (!addonsRes.error && addonsRes.data && addonsRes.data.length > 0) {
        setAddons(addonsRes.data);
        globalCachedAddons = addonsRes.data;
        if (typeof window !== "undefined") {
          localStorage.setItem("la_pos_addons_cache", JSON.stringify(addonsRes.data));
        }
      }

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
    setIsMounted(true);
    fetchData();
  }, []);

  // Kunci scroll halaman belakang saat modal keranjang / pembayaran terbuka
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isMobileCartOpen || isCheckoutOpen || isQrisZoomOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [isMobileCartOpen, isCheckoutOpen, isQrisZoomOpen]);

  const categories = useMemo(() => {
    const desiredOrder = ["Ayam", "Paket", "Promo", "Makanan", "Minuman"];
    const existingCats = Array.from(new Set(products.map((p) => p.category)));

    const result: string[] = [];
    desiredOrder.forEach((c) => {
      if (existingCats.includes(c) || c === "Paket" || c === "Promo") {
        result.push(c);
      }
    });
    existingCats.forEach((c) => {
      if (!result.includes(c)) result.push(c);
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

  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
      return acc + (item.price + addonsPrice) * item.qty;
    }, 0);
  }, [cart]);

  // Peta jumlah per produk di keranjang untuk ditampilkan langsung di kartu menu
  const productQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.productId] = (map[item.productId] || 0) + item.qty;
    });
    return map;
  }, [cart]);

  // Handle Add Product dengan Animasi
  const handleProductClick = (product: Product) => {
    if (!product.is_available) return;

    // Trigger Animasi +1
    const newId = clickCounter + 1;
    setClickCounter(newId);
    setFloatingPlus(prev => [...prev, { id: newId, productId: product.id }]);
    setTimeout(() => {
      setFloatingPlus(prev => prev.filter(f => f.id !== newId));
    }, 600);

    addToCartDirect(product, []);
  };

  // Kurangi produk langsung dari kartu menu tanpa harus buka keranjang
  const handleDecreaseFromCard = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId);
      if (existingIndex === -1) return prev;

      const updated = [...prev];
      const currentQty = updated[existingIndex].qty;
      if (currentQty <= 1) {
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: currentQty - 1,
        };
      }
      return updated;
    });
  };

  const addToCartDirect = (product: Product, selectedAddonsList: ProductAddon[]) => {
    const addonIds = selectedAddonsList.map((a) => a.id).sort().join(",");
    
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        const itemAddonIds = (item.selectedAddons || []).map((a) => a.id).sort().join(",");
        return item.productId === product.id && itemAddonIds === addonIds;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1,
        };
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
        updated[index] = { ...updated[index], qty: newQty };
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cashPresets = [
    { label: "Uang Pas", val: cartTotal },
    { label: "10.000", val: 10000 },
    { label: "20.000", val: 20000 },
    { label: "50.000", val: 50000 },
    { label: "100.000", val: 100000 },
  ];

  const cashDifference = cashReceived - cartTotal;
  const isUnderpaid = paymentMethod === "cash" && cashReceived < cartTotal;

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

    const processFifoStockDeduction = async (cartItems: CartItem[]) => {
      try {
        for (const item of cartItems) {
          if (!item.productId || item.qty <= 0) continue;

          const requiredMaterialsMap = new Map<string, number>();

          let { data: productRecs } = await supabase
            .from("product_recipes")
            .select("*")
            .eq("product_id", item.productId);

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

          if (item.selectedAddons && item.selectedAddons.length > 0) {
            for (const addon of item.selectedAddons) {
              if (!addon.id) continue;
              try {
                const { data: addonRecs } = await supabase
                  .from("addon_recipes")
                  .select("*")
                  .eq("addon_id", addon.id);

                if (addonRecs && addonRecs.length > 0) {
                  for (const ar of addonRecs) {
                    if (!ar.inventory_item_id) continue;
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

          if (requiredMaterialsMap.size === 0) continue;

          for (const [rawItemId, totalNeededQty] of Array.from(requiredMaterialsMap.entries())) {
            if (!rawItemId || totalNeededQty <= 0) continue;
            let remainingToDeduct = totalNeededQty;
            let totalHpp = 0;
            let totalDeductedFromBatches = 0;

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
              if (logErr.code === "23514" || logErr.message?.includes("payment_source")) {
                const { data: retryLog } = await supabase
                  .from("inventory_logs")
                  .insert({ ...logPayload, payment_source: "other" })
                  .select()
                  .maybeSingle();
                insertedRow = retryLog;
              }
            } else {
              insertedRow = logRes;
            }

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

            const { data: curItem } = await supabase
              .from("inventory_items")
              .select("current_stock")
              .eq("id", rawItemId)
              .maybeSingle();

            if (curItem) {
              const updatedStock = Math.max(0, Number(curItem.current_stock || 0) - totalNeededQty);
              await supabase
                .from("inventory_items")
                .update({ current_stock: updatedStock })
                .eq("id", rawItemId);
            }
          }
        }
      } catch (fifoErr) {
        console.error("Gagal proses potong stok FIFO:", fifoErr);
      }
    };

    try {
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
        if (transErr.message?.includes("cashier_name") || transErr.code === "PGRST204" || transErr.code === "PGRST205" || transErr.message?.includes("schema cache")) {
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

      const itemsPayloadWithId = transactionItemsPayload.map((it) => ({
        ...it,
        transaction_id: transData.id,
      }));

      await supabase.from("transaction_items").insert(itemsPayloadWithId);

      const cartSnapshot = [...cart];
      processFifoStockDeduction(cartSnapshot).catch((e) => console.error(e));

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
    <div className="pb-32 lg:pb-10">
      {/* CSS KEYFRAMES UNTUK ANIMASI +1 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes customFloatUp {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          30% { transform: translate(-50%, -100%) scale(1.3); opacity: 1; }
          100% { transform: translate(-50%, -200%) scale(1); opacity: 0; }
        }
        .animate-custom-float {
          animation: customFloatUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}} />

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

      {/* HEADER PENCARIAN & KATEGORI */}
      <div className="bg-white/95 backdrop-blur-md shadow-sm border border-pink-200 mb-4 rounded-3xl p-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-gray-800">Menu Kasir</h1>
              <span className="text-base">🍗🌸</span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="lg:hidden text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 flex items-center gap-1 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu ayam / nasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar mt-1 border-t border-pink-50">
          {categories.map((cat) => {
            const isPromo = cat === "Promo";
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all btn-bounce flex items-center gap-1.5 ${
                  isActive
                    ? isPromo ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-rose-300 ring-2 ring-red-300" : "bg-rose-500 text-white shadow-md shadow-rose-200"
                    : isPromo ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : "bg-pink-50/80 text-gray-700 hover:bg-pink-100"
                }`}
              >
                {isPromo && <span>🔥</span>}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Products Grid */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((p) => {
              const qtyInCart = productQtyMap[p.id] || 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className={`bg-white rounded-3xl p-3.5 sm:p-4 border shadow-sm transition-all text-left flex flex-col justify-between select-none relative overflow-hidden ${
                    p.is_available
                      ? qtyInCart > 0
                        ? "cursor-pointer border-rose-400 ring-2 ring-rose-200 bg-rose-50/10"
                        : "cursor-pointer hover:shadow-md hover:border-pink-300 active:scale-95 btn-bounce border-pink-100"
                      : "opacity-60 cursor-not-allowed border-gray-200 bg-gray-50"
                  }`}
                >
                  {/* RENDER ANIMASI +1 TERBANG LOKAL DI DALAM CARD */}
                  {floatingPlus.filter(f => f.productId === p.id).map(f => (
                    <div key={f.id} className="absolute top-1/2 left-1/2 z-20 text-rose-500 font-black text-4xl drop-shadow-md pointer-events-none animate-custom-float">
                      +1
                    </div>
                  ))}

                  {/* BADGE JUMLAH ITEM DI KERANJANG (POJOK KANAN ATAS) */}
                  {qtyInCart > 0 && p.is_available ? (
                    <span className="absolute top-2.5 right-2.5 text-[11px] font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-sm z-10">
                      {qtyInCart}x
                    </span>
                  ) : !p.is_available ? (
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
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-50 flex items-center justify-center text-3xl mb-3 shadow-inner overflow-hidden">
                      {p.icon_or_image_url?.startsWith("http") ? (
                        <img src={p.icon_or_image_url} alt={p.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <span>{p.icon_or_image_url || "🍗"}</span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-gray-800 leading-tight mb-1">
                      {p.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                      p.category === "Promo" ? "bg-red-100 text-red-600 border border-red-200 font-black" : "text-rose-500 bg-rose-50"
                    }`}>
                      {p.category === "Promo" ? "🔥 Promo Hemat" : p.category}
                    </span>

                    {p.category === "Promo" && p.promo_items && p.promo_items.length > 0 && (
                      <div className="bg-pink-50/70 rounded-xl p-1.5 mb-2 border border-pink-100">
                        <p className="text-[10px] text-gray-600 font-medium leading-tight">
                          <span className="font-bold text-rose-600">Isi: </span>
                          {p.promo_items.map((it) => `${it.qty}x ${it.name}`).join(" + ")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-pink-50 mt-1 gap-1">
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {qtyInCart > 0 && (
                          <button
                            type="button"
                            onClick={(e) => handleDecreaseFromCard(e, p.id)}
                            className="w-7 h-7 rounded-full bg-pink-100 text-rose-600 hover:bg-pink-200 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                            aria-label="Kurangi"
                          >
                            <Minus className="w-4 h-4 stroke-[3]" />
                          </button>
                        )}
                        <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isLoadingProducts && filteredProducts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-4 border border-pink-100 shadow-sm animate-pulse space-y-3">
                  <div className="w-12 h-12 bg-pink-100/70 rounded-2xl mx-auto" />
                  <div className="h-4 bg-pink-100/70 rounded-lg w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-pink-100 mt-4">
              <span className="text-3xl mb-2 block">🍗 🔍</span>
              <p className="text-sm font-bold text-gray-700">Menu tidak ditemukan</p>
            </div>
          ) : null}
        </div>

        {/* KERANJANG KASIR (VERSI DESKTOP) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100 mb-3">
              <div className="flex items-center gap-2">
                <div className={`relative p-2 rounded-xl bg-rose-50 text-rose-500 transition-transform ${cartBadgeAnimate ? "scale-125" : ""}`}>
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-sm">
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
                <button onClick={clearCart} className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {cart.map((item, idx) => {
                const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
                const subtotal = (Number(item.price) + addonsPrice) * item.qty;

                return (
                  <div key={idx} className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100/80 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-gray-800 truncate">{item.name}</p>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <p className="text-[10px] text-rose-600 truncate">+ {item.selectedAddons.map((a) => a.name).join(", ")}</p>
                      )}
                      <p className="text-[11px] font-extrabold text-gray-700 mt-0.5">{formatRupiah(subtotal)}</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-pink-200">
                      <button onClick={() => updateCartQty(idx, -1)} className="w-6 h-6 rounded-lg bg-pink-50 text-rose-600 flex items-center justify-center font-bold">
                        <Minus className="w-3 h-3 stroke-[3]" />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-gray-800">{item.qty}</span>
                      <button onClick={() => updateCartQty(idx, 1)} className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold">
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="text-center py-10 px-4 text-gray-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-pink-300" />
                  <p className="text-xs font-bold text-gray-700">Keranjang Masih Kosong</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-pink-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-600">Total Tagihan:</span>
                  <span className="text-lg font-black text-rose-600">{formatRupiah(cartTotal)}</span>
                </div>

                <button
                  onClick={() => {
                    setCashReceived(cartTotal);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span>Bayar Sekarang ({cartItemCount})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PORTAL KE DOCUMENT.BODY: DIJAMIN 100% MENGAMBANG MENGIKUTI LAYAR HP TANPA PERLU SCROLL */}
      {isMounted &&
        createPortal(
          <>
            {/* 1. BAR KERANJANG MENGAMBANG DI BAWAH (MOBILE FLOATING BAR) */}
            {cart.length > 0 && !isMobileCartOpen && !isCheckoutOpen && (
              <div className="fixed bottom-[74px] left-3 right-3 z-[990] lg:hidden">
                <div
                  className={`bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 text-white p-2.5 pl-4 rounded-2xl shadow-2xl shadow-rose-500/40 border border-white/20 flex items-center justify-between gap-2 transition-transform duration-200 ${
                    cartBadgeAnimate ? "scale-[1.03]" : "scale-100"
                  }`}
                >
                  {/* Klik Kiri: Buka Daftar Item Keranjang */}
                  <button
                    type="button"
                    onClick={() => setIsMobileCartOpen(true)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-80"
                  >
                    <div className="relative bg-white/20 p-2 rounded-xl shrink-0">
                      <ShoppingBag className="w-5 h-5 text-white stroke-[2.5]" />
                      <span className="absolute -top-1.5 -right-1.5 bg-white text-rose-600 w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center shadow">
                        {cartItemCount}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-100 block leading-none mb-0.5">
                        Cek Keranjang ▴
                      </span>
                      <span className="font-black text-base leading-tight block truncate">
                        {formatRupiah(cartTotal)}
                      </span>
                    </div>
                  </button>

                  {/* Klik Kanan: Langsung Buka Form Pembayaran (1-Tap Bayar) */}
                  <button
                    type="button"
                    onClick={() => {
                      setCashReceived(cartTotal);
                      setIsCheckoutOpen(true);
                    }}
                    className="bg-white text-rose-600 hover:bg-pink-50 font-black text-xs px-4 py-3 rounded-xl shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
                  >
                    <span>Bayar</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. MODAL KERANJANG PESANAN (MUNCUL LANGSUNG DI LAYAR SAAT INI) */}
            {isMobileCartOpen && (
              <div
                className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-gray-950/60 backdrop-blur-sm lg:hidden"
                onClick={() => setIsMobileCartOpen(false)}
              >
                <div
                  className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[82dvh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-pink-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h2 className="font-black text-sm text-gray-800">Keranjang Pesanan</h2>
                        <p className="text-[11px] text-gray-500">{cartItemCount} item dipilih</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          clearCart();
                          setIsMobileCartOpen(false);
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMobileCartOpen(false)}
                        className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
                    {cart.map((item, idx) => {
                      const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
                      const subtotal = (Number(item.price) + addonsPrice) * item.qty;

                      return (
                        <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-pink-50/40 border border-pink-100 rounded-2xl">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-gray-800 truncate">{item.name}</p>
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <p className="text-[10px] text-rose-600 truncate">+ {item.selectedAddons.map((a) => a.name).join(", ")}</p>
                            )}
                            <p className="text-xs font-black text-rose-600 mt-0.5">{formatRupiah(subtotal)}</p>
                          </div>

                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-pink-200 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                updateCartQty(idx, -1);
                                if (cart.length === 1 && cart[0].qty === 1) setIsMobileCartOpen(false);
                              }}
                              className="w-7 h-7 rounded-lg bg-pink-50 text-rose-600 flex items-center justify-center font-bold active:scale-90"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-gray-800">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(idx, 1)}
                              className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold active:scale-90"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 border-t border-pink-100 bg-white shrink-0">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-600">Total Tagihan:</span>
                      <span className="text-lg font-black text-rose-600">{formatRupiah(cartTotal)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileCartOpen(false);
                        setCashReceived(cartTotal);
                        setIsCheckoutOpen(true);
                      }}
                      className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      <span>Lanjut Pembayaran ({cartItemCount})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. MODAL CHECKOUT & KALKULATOR KEMBALIAN (MENGAMBANG LANGSUNG DI TENGAH LAYAR) */}
            {isCheckoutOpen && (
              <div
                className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-gray-950/65 backdrop-blur-sm"
                onClick={() => setIsCheckoutOpen(false)}
              >
                <div
                  className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-pink-100 text-left relative max-h-[90dvh] flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header Modal */}
                  <div className="flex items-center justify-between pb-3 border-b border-pink-100 shrink-0">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-gray-800">Pembayaran Kasir 💵</h3>
                      <p className="text-[11px] text-gray-500">{cartItemCount} item dipesan</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="p-2 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body Modal */}
                  <div className="overflow-y-auto flex-1 my-3 pr-1 space-y-3.5">
                    {/* Ringkasan Singkat Pesanan (Bisa diedit cepat kalau ada yang salah) */}
                    <div className="bg-pink-50/60 border border-pink-100 rounded-2xl p-2.5 max-h-28 overflow-y-auto space-y-1.5">
                      {cart.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700 truncate pr-2">
                            {it.qty}x {it.name}
                          </span>
                          <span className="font-extrabold text-gray-800 shrink-0">
                            {formatRupiah(it.price * it.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total Tagihan */}
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-3.5 rounded-2xl text-white shadow-md flex items-center justify-between">
                      <span className="text-xs font-bold opacity-95">Total Tagihan:</span>
                      <p className="text-xl sm:text-2xl font-black tracking-tight">{formatRupiah(cartTotal)}</p>
                    </div>

                    {/* Pilihan Metode */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Metode Pembayaran</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cash")}
                          className={`py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            paymentMethod === "cash"
                              ? "bg-rose-500 text-white border-rose-500 shadow-md"
                              : "bg-white text-gray-700 border-pink-200"
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span>Tunai (Cash)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("qris")}
                          className={`py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            paymentMethod === "qris"
                              ? "bg-rose-500 text-white border-rose-500 shadow-md"
                              : "bg-white text-gray-700 border-pink-200"
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>QRIS Toko</span>
                        </button>
                      </div>
                    </div>

                    {paymentMethod === "cash" && (
                      <div className="space-y-2.5">
                        {/* Tombol Cepat Pecahan Uang */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                            Klik Cepat Uang Diterima:
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                            {cashPresets.map((p, i) => (
                              <button
                                type="button"
                                key={i}
                                onClick={() => setCashReceived(p.val)}
                                className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition-all active:scale-95 ${
                                  cashReceived === p.val
                                    ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                    : "bg-pink-50/60 text-gray-800 border-pink-200 hover:bg-pink-100"
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Atau Ketik Nominal Tunai (Rp):
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={cashReceived || ""}
                            onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-pink-50/50 border border-pink-200 rounded-2xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-rose-400 text-right"
                            placeholder="0"
                          />
                        </div>

                        {isUnderpaid ? (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <div className="text-xs">
                              <span className="font-extrabold block">Uang Kurang!</span>
                              <span>Kurang {formatRupiah(Math.abs(cashDifference))}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold">Kembalian:</span>
                            </div>
                            <span className="text-lg sm:text-xl font-black text-emerald-600">
                              {formatRupiah(cashDifference)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === "qris" && (
                      <div className="text-center p-3 bg-pink-50/50 rounded-2xl border border-pink-200 space-y-2">
                        <p className="text-xs font-bold text-gray-700">Scan QRIS LA Fried Chicken</p>
                        <div
                          onClick={() => setIsQrisZoomOpen(true)}
                          className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl border border-pink-200 shadow-sm flex items-center justify-center cursor-pointer relative"
                        >
                          <img
                            src={
                              settings?.qris_static_image_url ||
                              `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=LA-FRIED-CHICKEN-PAY-${cartTotal}`
                            }
                            alt="QRIS Barcode"
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Klik gambar QRIS untuk memperbesar. Total:{" "}
                          <span className="font-extrabold text-rose-600">{formatRupiah(cartTotal)}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tombol Konfirmasi Lunas */}
                  <div className="pt-2 border-t border-pink-100 shrink-0">
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={isSubmitting || (paymentMethod === "cash" && isUnderpaid)}
                      className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-lg disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {isSubmitting
                          ? "Memproses..."
                          : paymentMethod === "cash"
                          ? `Selesai & Cetak (${formatRupiah(cartTotal)})`
                          : "Konfirmasi Lunas QRIS"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MODAL ZOOM QRIS */}
            {isQrisZoomOpen && (
              <div
                className="fixed inset-0 z-[1020] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md"
                onClick={() => setIsQrisZoomOpen(false)}
              >
                <div
                  className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-pink-100 text-center relative flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setIsQrisZoomOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="mb-3">
                    <h3 className="text-base font-extrabold text-gray-800">Scan QRIS Pembayaran</h3>
                  </div>
                  <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white w-full py-2.5 px-4 rounded-2xl shadow-md mb-3">
                    <span className="text-[11px] font-medium opacity-90 block">Total Tagihan:</span>
                    <span className="text-2xl font-black">{formatRupiah(cartTotal)}</span>
                  </div>
                  <div className="w-64 h-64 bg-white p-3 rounded-2xl border-2 border-dashed border-rose-300 flex items-center justify-center mb-3">
                    <img
                      src={
                        settings?.qris_static_image_url ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=LA-FRIED-CHICKEN-PAY-${cartTotal}`
                      }
                      alt="QRIS Zoom"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
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
          </>,
          document.body
        )}
    </div>
  );
}
