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
  CheckCircle2
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
  { id: "5", name: "Nasi", category: "Makanan", price: 4000, is_available: true, icon_or_image_url: "🍚" },
  { id: "6", name: "Es Teh", category: "Minuman", price: 3000, is_available: true, icon_or_image_url: "🥤" },
  { id: "7", name: "Paket Nasi + Dada", category: "Paket", price: 14000, is_available: true, icon_or_image_url: "🍱" },
];

const DEFAULT_ADDONS: ProductAddon[] = [
  { id: "1", name: "Saus Keju", price: 2000 },
  { id: "2", name: "Sambal Geprek", price: 2000 },
  { id: "3", name: "Saus Pedas", price: 1000 },
];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Cashier Session
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);

  // Drawer Check
  const [isDrawerOpenModal, setIsDrawerOpenModal] = useState(false);
  const [hasCheckedDrawer, setHasCheckedDrawer] = useState(false);

  // Addon selection modal when clicking a product
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<Product | null>(null);
  const [tempSelectedAddons, setTempSelectedAddons] = useState<ProductAddon[]>([]);

  // Checkout modal & payment
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // Cart animation trigger
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false);

  // Fetch initial data
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

      // 1. Check Drawer
      const { data: drawerData } = await supabase
        .from("cash_drawers")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const localDrawer = typeof window !== "undefined" ? localStorage.getItem("la_active_drawer") : null;
      if (!drawerData && !localDrawer) {
        setIsDrawerOpenModal(true);
      }
      setHasCheckedDrawer(true);

      // 2. Fetch Products
      const { data: pData, error: pErr } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: true });

      if (!pErr && pData && pData.length > 0) {
        setProducts(pData);
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }

      // 3. Fetch Addons
      const { data: aData, error: aErr } = await supabase
        .from("product_addons")
        .select("*")
        .order("created_at", { ascending: true });

      if (!aErr && aData && aData.length > 0) {
        setAddons(aData);
      } else {
        setAddons(DEFAULT_ADDONS);
      }

      // 4. Fetch Settings
      const { data: sData } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (sData) {
        setSettings(sData);
      }
    } catch (err) {
      console.error("Error fetching POS data:", err);
      setProducts(DEFAULT_PRODUCTS);
      setAddons(DEFAULT_ADDONS);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ["Semua", ...cats];
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

  // Handle Add Product Click
  const handleProductClick = (product: Product) => {
    if (!product.is_available) return;

    // If there are addons available and item is chicken or package, offer add-on dialog
    if (addons.length > 0 && (product.category === "Ayam" || product.category === "Paket")) {
      setSelectedProductForAddon(product);
      setTempSelectedAddons([]);
    } else {
      addToCartDirect(product, []);
    }
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

  const handleConfirmAddon = () => {
    if (selectedProductForAddon) {
      addToCartDirect(selectedProductForAddon, tempSelectedAddons);
      setSelectedProductForAddon(null);
      setTempSelectedAddons([]);
    }
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

    try {
      // 1. Insert Transaction
      const { data: transData, error: transErr } = await supabase
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

      if (transErr) {
        if (transErr.code === "PGRST205" || transErr.message?.includes("schema cache")) {
          // Graceful demo transaction
          const demoTx: Transaction = {
            id: "demo-tx-" + Date.now(),
            receipt_no: receiptNo,
            total_amount: cartTotal,
            payment_method: paymentMethod,
            cash_received: finalCashReceived,
            cash_change: finalChange,
            status: "completed",
            created_at: new Date().toISOString(),
            items: transactionItemsPayload,
          };
          setLastTransaction(demoTx);
          setCart([]);
          setIsCheckoutOpen(false);
          setShowCelebration(true);
          return;
        }
        throw transErr;
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

      const completedTransaction: Transaction = {
        ...transData,
        items: transactionItemsPayload,
      };

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
        created_at: new Date().toISOString(),
        items: transactionItemsPayload,
      };
      setLastTransaction(demoTx);
      setCart([]);
      setIsCheckoutOpen(false);
      setShowCelebration(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-8">
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
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all btn-bounce ${
                activeCategory === cat
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                  : "bg-pink-50/80 text-gray-700 hover:bg-pink-100"
              }`}
            >
              {cat}
            </button>
          ))}
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
                {/* Unavailable Badge */}
                {!p.is_available && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    Habis
                  </span>
                )}

                <div>
                  {/* Icon/Emoji */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-50 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    {p.icon_or_image_url || "🍗"}
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-800 leading-tight mb-1">
                    {p.name}
                  </h3>
                  <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full inline-block mb-2">
                    {p.category}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-pink-50 mt-1">
                  <span className="font-black text-rose-600 text-sm">
                    {formatRupiah(p.price)}
                  </span>
                  {p.is_available && (
                    <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-3xl p-8 text-center border border-pink-100">
              <span className="text-3xl mb-2 block">🍗🔍</span>
              <p className="text-sm font-bold text-gray-700">Menu tidak ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">Coba kata kunci lain atau pilih kategori Semua</p>
            </div>
          )}
        </div>

        {/* Cart Panel (Desktop Sticky & Mobile Floating Bar / Trigger) */}
        <div className="lg:col-span-4">
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
                const subtotal = (item.price + addonsPrice) * item.qty;

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

      {/* MODAL PILIH ADD-ON / SAUS */}
      {selectedProductForAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-pink-100 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100 mb-3">
              <div>
                <h3 className="font-black text-base text-gray-800">
                  Tambah Saus / Pelengkap? 🌸
                </h3>
                <p className="text-xs text-rose-500 font-semibold mt-0.5">
                  {selectedProductForAddon.name} - {formatRupiah(selectedProductForAddon.price)}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Pilih saus lezat atau sambal pelengkap (opsional):
            </p>

            <div className="space-y-2 mb-5">
              {addons.map((add) => {
                const isSelected = tempSelectedAddons.some((a) => a.id === add.id);
                return (
                  <button
                    key={add.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setTempSelectedAddons((prev) => prev.filter((a) => a.id !== add.id));
                      } else {
                        setTempSelectedAddons((prev) => [...prev, add]);
                      }
                    }}
                    className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all btn-bounce ${
                      isSelected
                        ? "bg-rose-50 text-rose-700 border-rose-400 shadow-sm"
                        : "bg-white text-gray-700 border-pink-200 hover:bg-pink-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs ${
                          isSelected ? "bg-rose-500 text-white" : "border border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span>{add.name}</span>
                    </div>
                    <span className="font-extrabold text-rose-600">
                      +{formatRupiah(add.price)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  addToCartDirect(selectedProductForAddon, []);
                  setSelectedProductForAddon(null);
                }}
                className="py-3 bg-pink-50 text-gray-700 font-bold text-xs rounded-2xl border border-pink-200 hover:bg-pink-100 min-h-[48px]"
              >
                Tanpa Saus
              </button>
              <button
                type="button"
                onClick={handleConfirmAddon}
                className="py-3 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 min-h-[48px]"
              >
                Simpan ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

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
                ✕
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
                  <p className="text-xs font-bold text-gray-700">
                    Scan Barcode QRIS LA Fried Chicken
                  </p>
                  
                  {/* QR Image */}
                  <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border border-pink-100 shadow-md flex items-center justify-center">
                    <img
                      src={
                        settings?.qris_static_image_url ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=LA-FRIED-CHICKEN-PAY-${cartTotal}`
                      }
                      alt="QRIS Barcode"
                      className="w-full h-full object-contain rounded-xl"
                    />
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
    </div>
  );
}
