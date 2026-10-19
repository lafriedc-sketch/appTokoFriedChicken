"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Lock, 
  Unlock, 
  Store, 
  ShoppingBag, 
  Plus, 
  Minus,
  Trash2, 
  Edit3, 
  Save, 
  Check, 
  QrCode, 
  Boxes, 
  Layers, 
  AlertCircle,
  Sparkles,
  KeyRound,
  Users,
  UserPlus,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Camera,
  Eye,
  EyeOff,
  History,
  Search,
  Download,
  X,
  Calendar,
  DollarSign,
  CheckCircle2,
  Receipt,
  ChevronRight,
  Percent,
  Tag,
  Calculator,
  CookingPot,
  Package,
  Box
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Product, ProductAddon, InventoryItem, StoreSettings, CashierUser, Transaction, CashierActivityLog, PromoItemComponent, FixedExpenseItem, RentSettings } from "@/types";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  
  // Active Tab: 'users' | 'profile' | 'products' | 'addons' | 'inventory' | 'qris'
  const [activeTab, setActiveTab] = useState<"users" | "profile" | "products" | "addons" | "inventory" | "qris">("users");

  // State Data
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: "LA Fried Chicken",
    address: "Jl. Melati Rasa No. 88, Kios Sentra Kuliner",
    whatsapp_number: "081234567890",
    receipt_footer: "Terima kasih telah berbelanja di LA Fried Chicken! Renyah, Gurih & Selalu Fresh 🍗🌸",
    qris_mode: "static",
    qris_static_image_url: "",
    admin_pin: "1234",
  });
  const [newPin, setNewPin] = useState("");
  const [adminMonthlyRent, setAdminMonthlyRent] = useState<number>(1500000);
  const [adminMonthlyElectricity, setAdminMonthlyElectricity] = useState<number>(300000);
  const [adminRentDueDay, setAdminRentDueDay] = useState<number>(25);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseItem[]>([
    { id: "exp_1", name: "Sewa Toko / Kios", amount: 1500000 },
    { id: "exp_2", name: "Token Listrik & Air", amount: 300000 },
    { id: "exp_3", name: "Gas LPG 3kg", amount: 400000 },
  ]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | string>("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseName, setEditExpenseName] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState<number | string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // User & PIN Management State
  const [cashierUsers, setCashierUsers] = useState<CashierUser[]>([]);
  const [newCashierName, setNewCashierName] = useState("");
  const [newCashierPin, setNewCashierPin] = useState("1234");
  const [adminOldPinInput, setAdminOldPinInput] = useState("");
  const [adminNewPinInput, setAdminNewPinInput] = useState("");
  const [adminConfirmPinInput, setAdminConfirmPinInput] = useState("");

  // Cashier History & Transactions State
  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [activityLogs, setActivityLogs] = useState<CashierActivityLog[]>([]);
  const [selectedCashierForHistory, setSelectedCashierForHistory] = useState<CashierUser | null>(null);
  const [historyFilterDate, setHistoryFilterDate] = useState<"all" | "today" | "7days">("all");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyTab, setHistoryTab] = useState<"transactions" | "logs">("transactions");

  // Edit Cashier Modal State
  const [editingCashier, setEditingCashier] = useState<CashierUser | null>(null);
  const [editCashierName, setEditCashierName] = useState("");
  const [editCashierPin, setEditCashierPin] = useState("");
  const [editCashierActive, setEditCashierActive] = useState(true);

  // Toggle show password per cashier
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Form states
  // Product Form (termasuk konfigurasi paket promo dari alacarte)
  const [productForm, setProductForm] = useState<{
    id: string;
    name: string;
    category: string;
    price: number;
    is_available: boolean;
    icon_or_image_url: string;
    original_price: number;
    discount_percent: number;
    promo_items: PromoItemComponent[];
  }>({
    id: "",
    name: "",
    category: "Ayam",
    price: 0,
    is_available: true,
    icon_or_image_url: "🍗",
    original_price: 0,
    discount_percent: 20,
    promo_items: [],
  });
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // State BOM (Bill of Materials) & Packaging
  const [mainIngredients, setMainIngredients] = useState<{
    id?: string;
    inventory_item_id: string;
    qty_required: number | string;
    selected_unit?: string;
  }[]>([]);
  const [packagingItems, setPackagingItems] = useState<{
    id?: string;
    inventory_item_id: string;
    qty_required: number | string;
    selected_unit?: string;
  }[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [productRecipesMap, setProductRecipesMap] = useState<Record<string, number>>({});

  // State BOM (Bill of Materials) & Packaging untuk Addon (Saus / Pelengkap)
  const [addonMainIngredients, setAddonMainIngredients] = useState<{
    id?: string;
    inventory_item_id: string;
    qty_required: number | string;
    selected_unit?: string;
  }[]>([]);
  const [addonPackagingItems, setAddonPackagingItems] = useState<{
    id?: string;
    inventory_item_id: string;
    qty_required: number | string;
    selected_unit?: string;
  }[]>([]);
  const [isLoadingAddonRecipes, setIsLoadingAddonRecipes] = useState(false);
  const [addonRecipesMap, setAddonRecipesMap] = useState<Record<string, number>>({});

  // Helper deteksi kategori kemasan/packaging
  const isPackagingItem = (name: string) => {
    const lower = (name || "").toLowerCase();
    return (
      lower.includes("box") ||
      lower.includes("cup") ||
      lower.includes("kresek") ||
      lower.includes("kantong") ||
      lower.includes("kemasan") ||
      lower.includes("plastik") ||
      lower.includes("bungkus") ||
      lower.includes("paper") ||
      lower.includes("pack") ||
      lower.includes("sedotan") ||
      lower.includes("wadah")
    );
  };

  // Helper opsi satuan kompatibel berdasarkan satuan master bahan
  const getCompatibleUnits = (baseUnit: string = ""): string[] => {
    const u = (baseUnit || "").toLowerCase().trim();
    if (u === "kg" || u === "gram" || u === "gr" || u === "g") {
      return ["gram", "kg"];
    }
    if (u === "liter" || u === "l" || u === "ml") {
      return ["ml", "liter"];
    }
    return [baseUnit || "pcs"];
  };

  // Helper konversi qty input ke satuan master database
  const convertToDatabaseUnit = (inputQty: number, selectedUnit: string, baseUnit: string): number => {
    const sUnit = (selectedUnit || "").toLowerCase().trim();
    const bUnit = (baseUnit || "").toLowerCase().trim();

    // Kasus Berat
    if (bUnit === "kg" && (sUnit === "gram" || sUnit === "gr" || sUnit === "g")) {
      return Number((inputQty / 1000).toFixed(6));
    }
    if ((bUnit === "gram" || bUnit === "gr" || bUnit === "g") && sUnit === "kg") {
      return Number((inputQty * 1000).toFixed(6));
    }

    // Kasus Cairan
    if ((bUnit === "liter" || bUnit === "l") && sUnit === "ml") {
      return Number((inputQty / 1000).toFixed(6));
    }
    if (bUnit === "ml" && (sUnit === "liter" || sUnit === "l")) {
      return Number((inputQty * 1000).toFixed(6));
    }

    return inputQty;
  };

  // Helper teks preview konversi
  const getConversionPreviewText = (inputQty: number | string, selectedUnit: string, baseUnit: string): string | null => {
    const qty = Number(inputQty);
    if (!qty || isNaN(qty)) return null;

    const sUnit = (selectedUnit || "").toLowerCase().trim();
    const bUnit = (baseUnit || "").toLowerCase().trim();

    if (bUnit === "kg" && (sUnit === "gram" || sUnit === "gr" || sUnit === "g")) {
      const inKg = qty / 1000;
      return `(= ${inKg} kg)`;
    }
    if ((bUnit === "gram" || bUnit === "gr" || bUnit === "g") && sUnit === "kg") {
      const inGr = qty * 1000;
      return `(= ${inGr.toLocaleString("id-ID")} gram)`;
    }
    if ((bUnit === "liter" || bUnit === "l") && sUnit === "ml") {
      const inL = qty / 1000;
      return `(= ${inL} liter)`;
    }
    if (bUnit === "ml" && (sUnit === "liter" || sUnit === "l")) {
      const inMl = qty * 1000;
      return `(= ${inMl.toLocaleString("id-ID")} ml)`;
    }
    return null;
  };

  // Handlers untuk Komposisi Bahan Utama
  const handleAddMainIngredient = () => {
    const firstMain = inventoryItems.find((it) => !isPackagingItem(it.name));
    const compUnits = getCompatibleUnits(firstMain?.unit);
    setMainIngredients((prev) => [
      ...prev,
      {
        inventory_item_id: firstMain?.id || "",
        qty_required: 1,
        selected_unit: compUnits[0] || firstMain?.unit || "",
      },
    ]);
  };

  const handleUpdateMainIngredient = (
    index: number,
    field: "inventory_item_id" | "qty_required" | "selected_unit",
    value: any,
    extraUnit?: string
  ) => {
    setMainIngredients((prev) => {
      const next = [...prev];
      if (field === "inventory_item_id") {
        next[index] = {
          ...next[index],
          inventory_item_id: value,
          selected_unit: extraUnit || next[index].selected_unit,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveMainIngredient = (index: number) => {
    setMainIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers untuk Packaging / Kemasan
  const handleAddPackagingItem = () => {
    const firstPack = inventoryItems.find((it) => isPackagingItem(it.name));
    const compUnits = getCompatibleUnits(firstPack?.unit);
    setPackagingItems((prev) => [
      ...prev,
      {
        inventory_item_id: firstPack?.id || "",
        qty_required: 1,
        selected_unit: compUnits[0] || firstPack?.unit || "",
      },
    ]);
  };

  const handleUpdatePackagingItem = (
    index: number,
    field: "inventory_item_id" | "qty_required" | "selected_unit",
    value: any,
    extraUnit?: string
  ) => {
    setPackagingItems((prev) => {
      const next = [...prev];
      if (field === "inventory_item_id") {
        next[index] = {
          ...next[index],
          inventory_item_id: value,
          selected_unit: extraUnit || next[index].selected_unit,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemovePackagingItem = (index: number) => {
    setPackagingItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers untuk Komposisi Bahan Utama Addon
  const handleAddAddonMainIngredient = () => {
    const firstMain = inventoryItems.find((it) => !isPackagingItem(it.name));
    const compUnits = getCompatibleUnits(firstMain?.unit);
    setAddonMainIngredients((prev) => [
      ...prev,
      {
        inventory_item_id: firstMain?.id || "",
        qty_required: 1,
        selected_unit: compUnits[0] || firstMain?.unit || "",
      },
    ]);
  };

  const handleUpdateAddonMainIngredient = (
    index: number,
    field: "inventory_item_id" | "qty_required" | "selected_unit",
    value: any,
    extraUnit?: string
  ) => {
    setAddonMainIngredients((prev) => {
      const next = [...prev];
      if (field === "inventory_item_id") {
        next[index] = {
          ...next[index],
          inventory_item_id: value,
          selected_unit: extraUnit || next[index].selected_unit,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveAddonMainIngredient = (index: number) => {
    setAddonMainIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers untuk Packaging / Kemasan Addon
  const handleAddAddonPackagingItem = () => {
    const firstPack = inventoryItems.find((it) => isPackagingItem(it.name));
    const compUnits = getCompatibleUnits(firstPack?.unit);
    setAddonPackagingItems((prev) => [
      ...prev,
      {
        inventory_item_id: firstPack?.id || "",
        qty_required: 1,
        selected_unit: compUnits[0] || firstPack?.unit || "",
      },
    ]);
  };

  const handleUpdateAddonPackagingItem = (
    index: number,
    field: "inventory_item_id" | "qty_required" | "selected_unit",
    value: any,
    extraUnit?: string
  ) => {
    setAddonPackagingItems((prev) => {
      const next = [...prev];
      if (field === "inventory_item_id") {
        next[index] = {
          ...next[index],
          inventory_item_id: value,
          selected_unit: extraUnit || next[index].selected_unit,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveAddonPackagingItem = (index: number) => {
    setAddonPackagingItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper: Daftar produk alacarte (menu satuan) untuk dikombinasikan ke promo
  const alacarteProducts = useMemo(() => {
    return products.filter((p) => p.category !== "Promo");
  }, [products]);

  // Tambah / kurangi menu alacarte ke paket promo
  const handleUpdatePromoItemQty = (alacarteItem: Product, delta: number) => {
    setProductForm((prev) => {
      const currentPromoItems = [...(prev.promo_items || [])];
      const existingIdx = currentPromoItems.findIndex((it) => it.productId === alacarteItem.id);

      if (existingIdx > -1) {
        const newQty = currentPromoItems[existingIdx].qty + delta;
        if (newQty <= 0) {
          currentPromoItems.splice(existingIdx, 1);
        } else {
          currentPromoItems[existingIdx].qty = newQty;
        }
      } else if (delta > 0) {
        currentPromoItems.push({
          productId: alacarteItem.id,
          name: alacarteItem.name,
          qty: 1,
          unit_price: alacarteItem.price,
        });
      }

      // Hitung total harga normal asli alacarte
      const normalPrice = currentPromoItems.reduce(
        (sum, it) => sum + it.qty * it.unit_price,
        0
      );

      // Hitung harga promo baru berdasarkan diskon persen
      const discount = prev.discount_percent || 20;
      const promoPrice = normalPrice > 0 ? Math.round((normalPrice * (100 - discount)) / 100) : 0;

      // Buat saran nama promo otomatis jika nama masih kosong atau diawali "Promo"
      let newName = prev.name;
      if (!prev.id && currentPromoItems.length > 0) {
        const itemSummary = currentPromoItems.map((it) => `${it.qty > 1 ? it.qty + 'x ' : ''}${it.name}`).join(" + ");
        newName = `Promo Combo: ${itemSummary}`;
      }

      return {
        ...prev,
        name: newName,
        icon_or_image_url: prev.icon_or_image_url === "🍗" ? "🔥" : prev.icon_or_image_url,
        original_price: normalPrice,
        price: promoPrice,
        promo_items: currentPromoItems,
      };
    });
  };

  // Ubah persentase diskon promo
  const handleApplyDiscountPercent = (percent: number) => {
    setProductForm((prev) => {
      const normalPrice = prev.original_price || 0;
      const promoPrice = normalPrice > 0 ? Math.round((normalPrice * (100 - percent)) / 100) : prev.price;
      return {
        ...prev,
        discount_percent: percent,
        price: promoPrice,
      };
    });
  };

  // Addon Form
  const [addonForm, setAddonForm] = useState({
    id: "",
    name: "",
    price: 0,
  });
  const [isEditingAddon, setIsEditingAddon] = useState(false);

  // Inventory Item Form
  const [inventoryForm, setInventoryForm] = useState({
    id: "",
    name: "",
    unit: "potong",
    min_stock: 10,
    current_stock: 50,
  });
  const [isEditingInventory, setIsEditingInventory] = useState(false);

  // Feedback notifications
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3000);
  };

  // Fetch all Admin Data
  const fetchAllData = async () => {
    try {
      // 1. Settings
      const { data: sData } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (sData) {
        setSettings(sData);
      }

      // Load Rent & Fixed Expenses Settings untuk AI Advisor
      if (typeof window !== "undefined") {
        try {
          const rentJson = localStorage.getItem("la_rent_settings");
          if (rentJson) {
            const parsed = JSON.parse(rentJson);
            if (parsed.monthly_rent) setAdminMonthlyRent(parsed.monthly_rent);
            if (parsed.monthly_electricity) setAdminMonthlyElectricity(parsed.monthly_electricity);
            if (parsed.rent_due_day) setAdminRentDueDay(parsed.rent_due_day);
            if (Array.isArray(parsed.fixed_expenses) && parsed.fixed_expenses.length > 0) {
              setFixedExpenses(parsed.fixed_expenses);
            } else {
              const initial: FixedExpenseItem[] = [
                { id: "exp_1", name: "Sewa Toko / Kios", amount: Number(parsed.monthly_rent) || 1500000 },
                { id: "exp_2", name: "Token Listrik & Air", amount: Number(parsed.monthly_electricity) || 300000 },
                { id: "exp_3", name: "Gas LPG 3kg", amount: 400000 },
              ];
              setFixedExpenses(initial);
            }
          }
        } catch {}
      }

      // 2. Products
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: true });
      if (pData) {
        let merged = pData;
        if (typeof window !== "undefined") {
          try {
            const extras = JSON.parse(localStorage.getItem("la_promo_products_extras") || "{}");
            merged = pData.map((p) => {
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
      }

      // 3. Addons
      const { data: aData } = await supabase
        .from("product_addons")
        .select("*")
        .order("created_at", { ascending: true });
      if (aData) setAddons(aData);

      // 4. Inventory Items
      const { data: iData } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });
      if (iData) setInventoryItems(iData);

      // 4b. Fetch Product Recipes Count untuk indikator BOM katalog
      try {
        const { data: recData } = await supabase
          .from("product_recipes")
          .select("id, product_id");
        if (recData) {
          const countMap: Record<string, number> = {};
          recData.forEach((r) => {
            countMap[r.product_id] = (countMap[r.product_id] || 0) + 1;
          });
          setProductRecipesMap(countMap);
        }
      } catch (e) {
        console.warn("Gagal load hitungan resep produk:", e);
      }

      // 4c. Fetch Addon Recipes Count untuk indikator BOM katalog varian saus
      try {
        const { data: aRecData } = await supabase
          .from("addon_recipes")
          .select("id, addon_id");
        if (aRecData) {
          const aCountMap: Record<string, number> = {};
          aRecData.forEach((r) => {
            aCountMap[r.addon_id] = (aCountMap[r.addon_id] || 0) + 1;
          });
          setAddonRecipesMap(aCountMap);
        }
      } catch (e) {
        console.warn("Gagal load hitungan resep addon:", e);
      }

      // 5. Cashier Users
      if (typeof window !== "undefined") {
        const storedUsers = localStorage.getItem("la_cashier_users");
        if (storedUsers) {
          try {
            setCashierUsers(JSON.parse(storedUsers));
          } catch {}
        } else {
          const defaultUsers: CashierUser[] = [
            { id: "1", name: "Kasir 1", pin: "1234", role: "cashier", is_active: true },
            { id: "2", name: "Kasir 2", pin: "1234", role: "cashier", is_active: true },
            { id: "3", name: "Mbak Siti", pin: "1234", role: "cashier", is_active: true },
            { id: "4", name: "Owner", pin: "1234", role: "admin", is_active: true },
          ];
          setCashierUsers(defaultUsers);
          localStorage.setItem("la_cashier_users", JSON.stringify(defaultUsers));
        }
      }

      // 6. Fetch Transactions for Cashier History
      let remoteTxs: Transaction[] = [];
      try {
        const { data: tData } = await supabase
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

        if (tData) {
          remoteTxs = tData.map((t: any) => ({
            ...t,
            items: t.transaction_items,
          }));
        }
      } catch (e) {
        console.warn("Gagal fetch transactions Supabase:", e);
      }

      // Merge with local cashier transaction map for 100% reliable offline/demo data
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
          setAdminTransactions(Array.from(combined.values()));
        } catch {
          setAdminTransactions(remoteTxs);
        }

        try {
          const storedLogs: CashierActivityLog[] = JSON.parse(
            localStorage.getItem("la_cashier_activity_logs") || "[]"
          );
          setActivityLogs(storedLogs);
        } catch {}
      }
    } catch (err) {
      console.error("Gagal load admin data:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // UPDATE ADMIN PIN
  const handleUpdateAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentValidPin = settings.admin_pin || "1234";
    if (adminOldPinInput !== currentValidPin) {
      showNotification("PIN Admin Lama salah!", "error");
      return;
    }
    if (adminNewPinInput.length < 4) {
      showNotification("PIN Admin minimal 4 digit!", "error");
      return;
    }
    if (adminNewPinInput !== adminConfirmPinInput) {
      showNotification("Konfirmasi PIN baru tidak cocok!", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          id: settings.id || "00000000-0000-0000-0000-000000000001",
          admin_pin: adminNewPinInput,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setSettings((prev) => ({ ...prev, admin_pin: adminNewPinInput }));
      setAdminOldPinInput("");
      setAdminNewPinInput("");
      setAdminConfirmPinInput("");
      showNotification("PIN Admin berhasil diubah! 🔐");
    } catch (err: any) {
      showNotification(err.message || "Gagal mengubah PIN", "error");
    }
  };

  // TAMBAH KASIR
  const handleAddCashierUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashierName.trim()) return;

    const newUser: CashierUser = {
      id: "cashier-" + Date.now(),
      name: newCashierName.trim(),
      pin: newCashierPin.trim() || "1234",
      role: "cashier",
      is_active: true,
    };

    const updated = [...cashierUsers, newUser];
    setCashierUsers(updated);
    localStorage.setItem("la_cashier_users", JSON.stringify(updated));
    setNewCashierName("");
    setNewCashierPin("1234");
    showNotification(`Kasir ${newUser.name} berhasil didaftarkan! 🌸`);
  };

  // HAPUS KASIR
  const handleDeleteCashierUser = (id: string) => {
    const target = cashierUsers.find((c) => c.id === id);
    if (!confirm(`Hapus kasir ${target?.name || ""}?`)) return;

    const updated = cashierUsers.filter((c) => c.id !== id);
    setCashierUsers(updated);
    localStorage.setItem("la_cashier_users", JSON.stringify(updated));
    showNotification("Kasir berhasil dihapus.");
  };

  // EDIT KASIR
  const handleOpenEditCashier = (user: CashierUser) => {
    setEditingCashier(user);
    setEditCashierName(user.name);
    setEditCashierPin(user.pin);
    setEditCashierActive(user.is_active);
  };

  const handleSaveEditCashier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCashier || !editCashierName.trim()) return;

    const updated = cashierUsers.map((c) =>
      c.id === editingCashier.id
        ? {
            ...c,
            name: editCashierName.trim(),
            pin: editCashierPin.trim() || "1234",
            is_active: editCashierActive,
          }
        : c
    );

    setCashierUsers(updated);
    localStorage.setItem("la_cashier_users", JSON.stringify(updated));
    setEditingCashier(null);
    showNotification(`Data kasir ${editCashierName} berhasil diperbarui! 🌸`);
  };

  // TOGGLE STATUS KASIR (AKTIF / NONAKTIF)
  const handleToggleActiveCashier = (id: string) => {
    const updated = cashierUsers.map((c) =>
      c.id === id ? { ...c, is_active: !c.is_active } : c
    );
    setCashierUsers(updated);
    localStorage.setItem("la_cashier_users", JSON.stringify(updated));
  };

  // TOGGLE INTIP PASSWORD KASIR
  const toggleShowPassword = (id: string) => {
    setShowPasswordMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // HITUNG STATISTIK INPUTAN KASIR
  const getCashierStats = (name: string) => {
    const targetName = name.trim().toLowerCase();
    const txs = adminTransactions.filter(
      (t) => (t.cashier_name || "kasir").trim().toLowerCase() === targetName
    );
    const count = txs.length;
    const omzet = txs.reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
    const lastTx = txs[0]?.created_at;
    return { count, omzet, lastTx, transactions: txs };
  };

  // EXPORT RIWAYAT KASIR KE CSV
  const handleExportCashierCSV = (cashierName: string, transactionsToExport: Transaction[]) => {
    if (transactionsToExport.length === 0) {
      showNotification("Tidak ada transaksi untuk diekspor!", "error");
      return;
    }

    const headers = ["Waktu", "No Struk", "Kasir", "Total Belanja (Rp)", "Metode Bayar", "Status"];
    const rows = transactionsToExport.map((t) => [
      t.created_at ? new Date(t.created_at).toLocaleString("id-ID") : "-",
      t.receipt_no,
      `"${t.cashier_name || cashierName}"`,
      t.total_amount,
      t.payment_method.toUpperCase(),
      t.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `riwayat-input-kasir-${cashierName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Riwayat kasir ${cashierName} berhasil diekspor! 📥`);
  };

  // UPLOAD FOTO QRIS DENGAN KOMPRESI OTOMATIS (JPEG)
  const handleQrisFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const img = new Image();
      img.onload = () => {
        // Setup Canvas untuk kompresi
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Lebar maksimal ideal untuk barcode
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Isi background putih agar PNG transparan tidak jadi hitam
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Konversi hasil canvas ke JPEG dengan kualitas 80%
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          
          setSettings((prev) => ({ ...prev, qris_static_image_url: compressedBase64 }));
          showNotification("Foto barcode QRIS berhasil diproses! Klik Simpan di bawah untuk mengaktifkan.");
        }
      };
      // Fallback URL jika pembacaan gagal
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle PIN Unlock
  const handleVerifyPin = () => {
    const validPin = settings.admin_pin || "1234";
    if (pinInput === validPin) {
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("PIN salah! Masukkan PIN yang benar");
    }
  };

  // 1. UPDATE SETTINGS / PROFIL
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<StoreSettings> = {
        store_name: settings.store_name,
        address: settings.address,
        whatsapp_number: settings.whatsapp_number,
        receipt_footer: settings.receipt_footer,
        qris_mode: settings.qris_mode,
        qris_static_image_url: settings.qris_static_image_url,
      };

      if (newPin.trim()) {
        payload.admin_pin = newPin.trim();
      }

      const { error } = await supabase
        .from("store_settings")
        .upsert({
          id: settings.id || "00000000-0000-0000-0000-000000000001",
          ...payload,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Simpan pengaturan sewa & beban tetap untuk AI Advisor
      if (typeof window !== "undefined") {
        try {
          const rentItem = fixedExpenses.find((e) => e.name.toLowerCase().includes("sewa"))?.amount || adminMonthlyRent || 1500000;
          const elecItem = fixedExpenses.find((e) => e.name.toLowerCase().includes("listrik"))?.amount || adminMonthlyElectricity || 300000;
          const rentPayload = {
            monthly_rent: Number(rentItem),
            monthly_electricity: Number(elecItem),
            rent_due_day: Math.min(31, Math.max(1, Number(adminRentDueDay) || 25)),
            fixed_expenses: fixedExpenses,
          };
          localStorage.setItem("la_rent_settings", JSON.stringify(rentPayload));
        } catch {}
      }

      showNotification("Pengaturan profil berhasil disimpan! 🌸");
      setNewPin("");
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan pengaturan", "error");
    }
  };

  // Helper CRUD Pengeluaran Tetap Bulanan (Sinking Fund)
  const saveFixedExpensesToStorage = (items: FixedExpenseItem[], dueDay = adminRentDueDay) => {
    if (typeof window !== "undefined") {
      try {
        const rentItem = items.find((e) => e.name.toLowerCase().includes("sewa"))?.amount || 1500000;
        const elecItem = items.find((e) => e.name.toLowerCase().includes("listrik"))?.amount || 300000;
        const payload = {
          monthly_rent: Number(rentItem),
          monthly_electricity: Number(elecItem),
          rent_due_day: Math.min(31, Math.max(1, Number(dueDay) || 25)),
          fixed_expenses: items,
        };
        localStorage.setItem("la_rent_settings", JSON.stringify(payload));
      } catch {}
    }
  };

  const handleAddExpense = (customName?: string, customAmount?: number) => {
    const finalName = (customName !== undefined ? customName : newExpenseName).trim();
    const finalAmount = Number(customAmount !== undefined ? customAmount : newExpenseAmount);
    if (!finalName || finalAmount <= 0) {
      showNotification("Nama pengeluaran dan nominal harus diisi dengan benar!", "error");
      return;
    }
    const newItem: FixedExpenseItem = {
      id: "exp_" + Date.now(),
      name: finalName,
      amount: finalAmount,
    };
    const updated = [...fixedExpenses, newItem];
    setFixedExpenses(updated);
    setNewExpenseName("");
    setNewExpenseAmount("");
    saveFixedExpensesToStorage(updated);
    showNotification(`Beban "${newItem.name}" (${formatRupiah(newItem.amount)}) berhasil ditambahkan! 🌸`);
  };

  const handleStartEditExpense = (item: FixedExpenseItem) => {
    setEditingExpenseId(item.id);
    setEditExpenseName(item.name);
    setEditExpenseAmount(item.amount);
  };

  const handleSaveEditExpense = (id: string) => {
    const trimmed = editExpenseName.trim();
    const amt = Number(editExpenseAmount);
    if (!trimmed || amt <= 0) {
      showNotification("Nama dan nominal harus valid!", "error");
      return;
    }
    const updated = fixedExpenses.map((it) =>
      it.id === id ? { ...it, name: trimmed, amount: amt } : it
    );
    setFixedExpenses(updated);
    setEditingExpenseId(null);
    saveFixedExpensesToStorage(updated);
    showNotification("Beban pengeluaran berhasil diperbarui! 🌸");
  };

  const handleDeleteExpense = (id: string, name: string) => {
    if (fixedExpenses.length <= 1) {
      showNotification("Minimal sisakan 1 pos pengeluaran bulanan", "error");
      return;
    }
    const updated = fixedExpenses.filter((it) => it.id !== id);
    setFixedExpenses(updated);
    saveFixedExpensesToStorage(updated);
    showNotification(`Pengeluaran "${name}" berhasil dihapus`, "success");
  };

  // 2. PRODUCT CRUD
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    const isPromo = productForm.category === "Promo";
    const promoPayload = {
      name: productForm.name.trim(),
      category: productForm.category,
      price: Number(productForm.price),
      is_available: productForm.is_available,
      icon_or_image_url: productForm.icon_or_image_url || (isPromo ? "🔥" : "🍗"),
      original_price: isPromo ? Number(productForm.original_price || 0) : null,
      discount_percent: isPromo ? Number(productForm.discount_percent || 0) : null,
      promo_items: isPromo ? productForm.promo_items : null,
    };

    const basePayload = {
      name: productForm.name.trim(),
      category: productForm.category,
      price: Number(productForm.price),
      is_available: productForm.is_available,
      icon_or_image_url: productForm.icon_or_image_url || (isPromo ? "🔥" : "🍗"),
    };

    try {
      let savedId = productForm.id;

      if (isEditingProduct && productForm.id) {
        const { error: updErr } = await supabase
          .from("products")
          .update(promoPayload)
          .eq("id", productForm.id);

        if (updErr) {
          const { error: baseErr } = await supabase
            .from("products")
            .update(basePayload)
            .eq("id", productForm.id);
          if (baseErr) throw baseErr;
        }
        showNotification("Menu berhasil diperbarui! 🌸");
      } else {
        const { data: insData, error: insErr } = await supabase
          .from("products")
          .insert(promoPayload)
          .select()
          .single();

        if (insErr) {
          const { data: baseData, error: baseErr } = await supabase
            .from("products")
            .insert(basePayload)
            .select()
            .single();
          if (baseErr) throw baseErr;
          savedId = baseData?.id || "";
        } else {
          savedId = insData?.id || "";
        }
        showNotification(isPromo ? "Menu promo alacarte berhasil ditambahkan! 🔥" : "Menu baru berhasil ditambahkan! 🍗");
      }

      // Simpan data alacarte promo ke local backup
      if (isPromo && typeof window !== "undefined") {
        try {
          const extras = JSON.parse(localStorage.getItem("la_promo_products_extras") || "{}");
          const targetKey = savedId || productForm.id || "promo-" + Date.now();
          extras[targetKey] = {
            original_price: productForm.original_price,
            discount_percent: productForm.discount_percent,
            promo_items: productForm.promo_items,
          };
          localStorage.setItem("la_promo_products_extras", JSON.stringify(extras));
        } catch {}
      }

      // Simpan seluruh data dari kedua kelompok (Bahan Utama + Packaging) ke tabel product_recipes
      if (savedId) {
        try {
          const combinedRecipes = [...mainIngredients, ...packagingItems];
          const validRecipes = combinedRecipes.filter(
            (r) => r.inventory_item_id && Number(r.qty_required) > 0
          );

          // Hapus resep lama untuk product_id ini
          await supabase
            .from("product_recipes")
            .delete()
            .eq("product_id", savedId);

          // Insert data resep gabungan baru (dikonversi ke satuan dasar gudang)
          if (validRecipes.length > 0) {
            const recipePayload = validRecipes.map((r) => {
              const inv = inventoryItems.find((it) => it.id === r.inventory_item_id);
              const baseUnit = inv?.unit || "";
              const selectedUnit = r.selected_unit || baseUnit;
              const convertedQty = convertToDatabaseUnit(Number(r.qty_required), selectedUnit, baseUnit);

              return {
                product_id: savedId,
                inventory_item_id: r.inventory_item_id,
                qty_required: convertedQty,
              };
            });

            const { error: recInsertErr } = await supabase
              .from("product_recipes")
              .insert(recipePayload);

            if (recInsertErr) {
              console.error("Gagal simpan product_recipes:", recInsertErr);
            }
          }
        } catch (bomErr) {
          console.error("Error saat menyimpan BOM resep:", bomErr);
        }
      }

      setMainIngredients([]);
      setPackagingItems([]);
      setProductForm({
        id: "",
        name: "",
        category: "Ayam",
        price: 0,
        is_available: true,
        icon_or_image_url: "🍗",
        original_price: 0,
        discount_percent: 20,
        promo_items: [],
      });
      setIsEditingProduct(false);
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan menu", "error");
    }
  };

  // EDIT PRODUK: FETCH DATA RESEP DARI product_recipes BERDASARKAN product_id
  const handleStartEditProduct = async (p: Product) => {
    setIsEditingProduct(true);
    setProductForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      is_available: p.is_available,
      icon_or_image_url: p.icon_or_image_url || (p.category === "Promo" ? "🔥" : "🍗"),
      original_price: p.original_price || 0,
      discount_percent: p.discount_percent || 20,
      promo_items: p.promo_items || [],
    });

    // Lakukan fetch data dari product_recipes berdasarkan product_id
    setIsLoadingRecipes(true);
    try {
      const { data: recData, error: recErr } = await supabase
        .from("product_recipes")
        .select(`
          id,
          product_id,
          inventory_item_id,
          qty_required
        `)
        .eq("product_id", p.id);

      if (recErr) {
        console.error("Gagal load resep produk:", recErr);
      }

      const mainList: { id?: string; inventory_item_id: string; qty_required: number | string; selected_unit?: string }[] = [];
      const packList: { id?: string; inventory_item_id: string; qty_required: number | string; selected_unit?: string }[] = [];

      (recData || []).forEach((r) => {
        const inv = inventoryItems.find((it) => it.id === r.inventory_item_id);
        const itemName = inv?.name || "";
        const baseUnit = (inv?.unit || "").toLowerCase().trim();
        const rawQty = Number(r.qty_required || 0);

        let displayQty: number | string = rawQty;
        let selectedUnit = inv?.unit || "";

        // Jika satuan dasar kg tapi takarannya < 1, tampilkan dalam gram agar mudah dibaca
        if (baseUnit === "kg" && rawQty > 0 && rawQty < 1) {
          displayQty = Number((rawQty * 1000).toFixed(4));
          selectedUnit = "gram";
        } else if ((baseUnit === "liter" || baseUnit === "l") && rawQty > 0 && rawQty < 1) {
          displayQty = Number((rawQty * 1000).toFixed(4));
          selectedUnit = "ml";
        }

        const itemObj = {
          id: r.id,
          inventory_item_id: r.inventory_item_id,
          qty_required: displayQty,
          selected_unit: selectedUnit,
        };

        if (isPackagingItem(itemName)) {
          packList.push(itemObj);
        } else {
          mainList.push(itemObj);
        }
      });

      setMainIngredients(mainList);
      setPackagingItems(packList);
    } catch (err) {
      console.error("Error fetching recipes on edit:", err);
    } finally {
      setIsLoadingRecipes(false);
    }

    if (typeof window !== "undefined") {
      const formEl = document.getElementById("admin-product-form-card");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleToggleProductAvailability = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_available: !product.is_available })
        .eq("id", product.id);

      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: !p.is_available } : p
        )
      );
    } catch (err: any) {
      showNotification(err.message || "Gagal mengubah status", "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Yakin ingin menghapus menu ini dari katalog?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      showNotification("Menu berhasil dihapus.");
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus", "error");
    }
  };

  // 3. ADDON CRUD
  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonForm.name.trim()) return;

    try {
      let savedId = addonForm.id;

      if (isEditingAddon && addonForm.id) {
        const { error } = await supabase
          .from("product_addons")
          .update({
            name: addonForm.name.trim(),
            price: Number(addonForm.price),
          })
          .eq("id", addonForm.id);

        if (error) throw error;
        showNotification("Varian saus diperbarui! 🌸");
      } else {
        const { data: insData, error } = await supabase
          .from("product_addons")
          .insert({
            name: addonForm.name.trim(),
            price: Number(addonForm.price),
          })
          .select()
          .single();

        if (error) throw error;
        savedId = insData?.id || "";
        showNotification("Varian saus baru ditambahkan! 🌸");
      }

      // Simpan seluruh data dari kedua kelompok (Bahan Utama + Packaging) ke tabel addon_recipes
      if (savedId) {
        try {
          const combinedRecipes = [...addonMainIngredients, ...addonPackagingItems];
          const validRecipes = combinedRecipes.filter(
            (r) => r.inventory_item_id && Number(r.qty_required) > 0
          );

          // Hapus resep lama untuk addon_id ini
          await supabase
            .from("addon_recipes")
            .delete()
            .eq("addon_id", savedId);

          // Insert data resep gabungan baru (dikonversi ke satuan dasar gudang)
          if (validRecipes.length > 0) {
            const recipePayload = validRecipes.map((r) => {
              const inv = inventoryItems.find((it) => it.id === r.inventory_item_id);
              const baseUnit = inv?.unit || "";
              const selectedUnit = r.selected_unit || baseUnit;
              const convertedQty = convertToDatabaseUnit(Number(r.qty_required), selectedUnit, baseUnit);

              return {
                addon_id: savedId,
                inventory_item_id: r.inventory_item_id,
                qty_required: convertedQty,
              };
            });

            const { error: recInsertErr } = await supabase
              .from("addon_recipes")
              .insert(recipePayload);

            if (recInsertErr) {
              console.error("Gagal simpan addon_recipes:", recInsertErr);
            }
          }
        } catch (bomErr) {
          console.error("Error saat menyimpan BOM addon:", bomErr);
        }
      }

      setAddonMainIngredients([]);
      setAddonPackagingItems([]);
      setAddonForm({ id: "", name: "", price: 0 });
      setIsEditingAddon(false);
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan varian", "error");
    }
  };

  // EDIT VARIAN SAUS: FETCH DATA RESEP DARI addon_recipes BERDASARKAN addon_id
  const handleStartEditAddon = async (a: ProductAddon) => {
    setIsEditingAddon(true);
    setAddonForm({
      id: a.id,
      name: a.name,
      price: a.price,
    });

    // Lakukan fetch data dari addon_recipes berdasarkan addon_id
    setIsLoadingAddonRecipes(true);
    try {
      const { data: recData, error: recErr } = await supabase
        .from("addon_recipes")
        .select(`
          id,
          addon_id,
          inventory_item_id,
          qty_required
        `)
        .eq("addon_id", a.id);

      if (recErr) {
        console.error("Gagal load resep varian saus:", recErr);
      }

      const mainList: { id?: string; inventory_item_id: string; qty_required: number | string; selected_unit?: string }[] = [];
      const packList: { id?: string; inventory_item_id: string; qty_required: number | string; selected_unit?: string }[] = [];

      (recData || []).forEach((r) => {
        const inv = inventoryItems.find((it) => it.id === r.inventory_item_id);
        const itemName = inv?.name || "";
        const baseUnit = (inv?.unit || "").toLowerCase().trim();
        const rawQty = Number(r.qty_required || 0);

        let displayQty: number | string = rawQty;
        let selectedUnit = inv?.unit || "";

        // Jika satuan dasar kg tapi takarannya < 1, tampilkan dalam gram agar mudah dibaca
        if (baseUnit === "kg" && rawQty > 0 && rawQty < 1) {
          displayQty = Number((rawQty * 1000).toFixed(4));
          selectedUnit = "gram";
        } else if ((baseUnit === "liter" || baseUnit === "l") && rawQty > 0 && rawQty < 1) {
          displayQty = Number((rawQty * 1000).toFixed(4));
          selectedUnit = "ml";
        }

        const itemObj = {
          id: r.id,
          inventory_item_id: r.inventory_item_id,
          qty_required: displayQty,
          selected_unit: selectedUnit,
        };

        if (isPackagingItem(itemName)) {
          packList.push(itemObj);
        } else {
          mainList.push(itemObj);
        }
      });

      setAddonMainIngredients(mainList);
      setAddonPackagingItems(packList);
    } catch (err) {
      console.error("Error fetching addon recipes on edit:", err);
    } finally {
      setIsLoadingAddonRecipes(false);
    }

    if (typeof window !== "undefined") {
      const formEl = document.getElementById("admin-addon-form-card");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm("Hapus saus ini?")) return;
    try {
      const { error } = await supabase.from("product_addons").delete().eq("id", id);
      if (error) throw error;
      showNotification("Saus dihapus.");
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus", "error");
    }
  };

  // 4. INVENTORY MASTER CRUD
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryForm.name.trim()) return;

    try {
      if (isEditingInventory && inventoryForm.id) {
        const { error } = await supabase
          .from("inventory_items")
          .update({
            name: inventoryForm.name,
            unit: inventoryForm.unit,
            min_stock: Number(inventoryForm.min_stock),
            current_stock: Number(inventoryForm.current_stock),
          })
          .eq("id", inventoryForm.id);

        if (error) throw error;
        showNotification("Master bahan baku diperbarui!");
      } else {
        const { error } = await supabase.from("inventory_items").insert({
          name: inventoryForm.name,
          unit: inventoryForm.unit,
          min_stock: Number(inventoryForm.min_stock),
          current_stock: Number(inventoryForm.current_stock),
        });

        if (error) throw error;
        showNotification("Bahan baku baru berhasil didaftarkan!");
      }

      setInventoryForm({
        id: "",
        name: "",
        unit: "potong",
        min_stock: 10,
        current_stock: 50,
      });
      setIsEditingInventory(false);
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan bahan", "error");
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm("Hapus master bahan baku ini?")) return;
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
      showNotification("Bahan baku dihapus.");
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus", "error");
    }
  };

  // SCREEN: PIN PROTECTION LOCK
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-3xl border border-pink-100 shadow-xl text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4 animate-bounce">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-1">Keamanan Admin Kios</h2>
        <p className="text-xs text-gray-500 mb-6">
          Masukkan PIN keamanan untuk mengakses pengaturan harga, menu, & toko.
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
            <span>Buka Akses Admin</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl text-xs font-bold border flex items-center gap-2 animate-pop-in ${
            notice.type === "success"
              ? "bg-emerald-500 text-white border-emerald-400"
              : "bg-red-500 text-white border-red-400"
          }`}
        >
          <span>{notice.text}</span>
        </div>
      )}

      {/* Header Admin */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800">
              Panel Pengaturan & Master Data
            </h1>
            <span className="text-lg">⚙️🌸</span>
          </div>
          <p className="text-xs text-gray-500">
            Kelola profil LA Fried Chicken, katalog menu, saus, bahan baku, dan konfigurasi QRIS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAuthenticated(false)}
          className="self-start sm:self-center px-4 py-2 bg-pink-50 hover:bg-pink-100 text-rose-600 font-bold text-xs rounded-2xl border border-pink-200 flex items-center gap-1.5 transition-all btn-bounce"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Kunci Admin</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: "users", label: "Kelola User & PIN", icon: Users },
          { key: "profile", label: "Profil Toko", icon: Store },
          { key: "products", label: "Menu & Produk", icon: ShoppingBag },
          { key: "addons", label: "Varian Saus", icon: Layers },
          { key: "inventory", label: "Master Bahan", icon: Boxes },
          { key: "qris", label: "Mode QRIS", icon: QrCode },
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

      {/* TAB 0: KELOLA USER & PIN */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Ganti Password / PIN Admin (Owner) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-rose-500" />
              <span>Ganti Password / PIN Admin (Owner)</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Ubah PIN utama untuk mengunci dan mengakses halaman Admin ini.
            </p>

            <form onSubmit={handleUpdateAdminPin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  PIN Admin Lama
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminOldPinInput}
                  onChange={(e) => setAdminOldPinInput(e.target.value)}
                  placeholder="Ketik PIN saat ini"
                  className="w-full px-3.5 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold tracking-widest text-center focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  PIN Admin Baru (Minimal 4 Angka)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminNewPinInput}
                  onChange={(e) => setAdminNewPinInput(e.target.value)}
                  placeholder="Ketik PIN baru..."
                  className="w-full px-3.5 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold tracking-widest text-center focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ulangi Konfirmasi PIN Baru
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminConfirmPinInput}
                  onChange={(e) => setAdminConfirmPinInput(e.target.value)}
                  placeholder="Ketik ulang PIN baru..."
                  className="w-full px-3.5 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold tracking-widest text-center focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce min-h-[48px]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Simpan PIN Admin Baru 🔐</span>
              </button>
            </form>
          </div>

          {/* Card 2: Kelola Staf & Kasir */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-pink-100 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-gray-800 mb-0.5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-500" />
                  <span>Manajemen Akun Staf Kasir ({cashierUsers.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Atur nama kasir, password / PIN kasir, dan pantau riwayat inputan transaksi staf.
                </p>
              </div>
            </div>

            {/* Form Tambah Kasir */}
            <form onSubmit={handleAddCashierUser} className="p-4 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-3">
              <span className="text-[11px] font-black text-rose-600 block uppercase tracking-wider">
                + Tambah Akun Kasir Baru
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Staf / Kasir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasir Siti"
                    value={newCashierName}
                    onChange={(e) => setNewCashierName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-pink-200 rounded-xl font-semibold focus:ring-2 focus:ring-rose-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Password / PIN Kasir</label>
                  <input
                    type="text"
                    placeholder="Contoh: 1234 atau siti123"
                    value={newCashierPin}
                    onChange={(e) => setNewCashierPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-pink-200 rounded-xl font-bold tracking-wider text-center focus:ring-2 focus:ring-rose-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all btn-bounce flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Simpan & Daftarkan Kasir Baru</span>
              </button>
            </form>

            {/* List Kasir */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {cashierUsers.map((user) => {
                const stats = getCashierStats(user.name);
                const isPasswordVisible = !!showPasswordMap[user.id];

                return (
                  <div
                    key={user.id}
                    className="p-3.5 bg-pink-50/30 hover:bg-pink-50/60 rounded-2xl border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-xs flex items-center justify-center text-lg border border-pink-100 flex-shrink-0">
                        🍗
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-gray-800 text-sm">{user.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {user.is_active ? "● Aktif" : "● Nonaktif"}
                          </span>
                        </div>

                        {/* Password / PIN Viewer */}
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span>Password:</span>
                          <span className="font-mono font-bold text-gray-800 bg-white px-2 py-0.5 rounded-lg border border-pink-100">
                            {isPasswordVisible ? user.pin : "••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(user.id)}
                            className="text-gray-400 hover:text-rose-500 p-0.5 transition-colors"
                            title={isPasswordVisible ? "Sembunyikan Password" : "Lihat Password"}
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Ringkasan Inputan Kasir */}
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-rose-600 pt-0.5">
                          <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            🧾 {stats.count} Transaksi
                          </span>
                          <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            💰 {formatRupiah(stats.omzet)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {/* Tombol Lihat Riwayat Inputan */}
                      <button
                        type="button"
                        onClick={() => setSelectedCashierForHistory(user)}
                        className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm shadow-rose-200 flex items-center gap-1.5 btn-bounce"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Riwayat Inputan</span>
                      </button>

                      {/* Tombol Edit Nama & Password */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditCashier(user)}
                        className="p-2 bg-white text-gray-700 border border-pink-200 hover:bg-pink-50 rounded-xl text-[11px] font-bold transition-colors"
                        title="Edit Kasir"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCashierUser(user.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                        title="Hapus Kasir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT KASIR */}
      {editingCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-rose-500" />
                <span>Edit Data Kasir</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCashier(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCashier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Staf Kasir
                </label>
                <input
                  type="text"
                  value={editCashierName}
                  onChange={(e) => setEditCashierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password / PIN Kasir
                </label>
                <input
                  type="text"
                  value={editCashierPin}
                  onChange={(e) => setEditCashierPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold tracking-wider text-center focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Status Akun
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCashierActive(true)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      editCashierActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-gray-500 border-gray-200"
                    }`}
                  >
                    ● Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCashierActive(false)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      !editCashierActive
                        ? "bg-gray-100 text-gray-800 border-gray-400"
                        : "bg-white text-gray-500 border-gray-200"
                    }`}
                  >
                    ● Nonaktif
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCashier(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all btn-bounce"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT INPUTAN KASIR */}
      {selectedCashierForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-pink-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-pink-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-gray-800">
                      Riwayat Inputan: {selectedCashierForHistory.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      Kasir Kios
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Semua transaksi dan aktivitas operasional yang diinput oleh staf ini.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCashierForHistory(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-pink-100 text-gray-500 hover:text-gray-800 flex items-center justify-center border border-pink-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const targetName = selectedCashierForHistory.name.trim().toLowerCase();
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

                // Transaksi kasir
                const allCashierTxs = adminTransactions.filter(
                  (t) => (t.cashier_name || "kasir").trim().toLowerCase() === targetName
                );

                // Filter by date
                let filtered = allCashierTxs.filter((t) => {
                  if (!t.created_at) return true;
                  const time = new Date(t.created_at).getTime();
                  if (historyFilterDate === "today") return time >= startOfToday;
                  if (historyFilterDate === "7days") return time >= sevenDaysAgo;
                  return true;
                });

                // Filter by search query
                if (historySearchQuery.trim()) {
                  const q = historySearchQuery.trim().toLowerCase();
                  filtered = filtered.filter(
                    (t) =>
                      t.receipt_no.toLowerCase().includes(q) ||
                      (t.items || []).some((it) => it.product_name.toLowerCase().includes(q))
                  );
                }

                // Stats
                const totalTxs = filtered.length;
                const totalOmzet = filtered.reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
                const avgBasket = totalTxs > 0 ? Math.round(totalOmzet / totalTxs) : 0;
                const cashCount = filtered.filter((t) => t.payment_method === "cash").length;
                const qrisCount = filtered.filter((t) => t.payment_method === "qris").length;

                // Activity logs
                const cashierLogs = activityLogs.filter(
                  (a) => a.cashier_name.trim().toLowerCase() === targetName
                );

                return (
                  <>
                    {/* 3 KPI Cards Ringkasan */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100 text-center">
                        <span className="text-[10px] font-bold text-gray-500 block">Total Transaksi</span>
                        <p className="text-lg font-black text-rose-600">{totalTxs} Nota</p>
                        <span className="text-[9px] text-gray-400">
                          {cashCount} Tunai • {qrisCount} QRIS
                        </span>
                      </div>
                      <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100 text-center">
                        <span className="text-[10px] font-bold text-gray-500 block">Total Omzet Kasir</span>
                        <p className="text-lg font-black text-gray-900">{formatRupiah(totalOmzet)}</p>
                        <span className="text-[9px] text-gray-400">Penjualan masuk</span>
                      </div>
                      <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100 text-center">
                        <span className="text-[10px] font-bold text-gray-500 block">Rata-rata / Struk</span>
                        <p className="text-lg font-black text-emerald-600">{formatRupiah(avgBasket)}</p>
                        <span className="text-[9px] text-gray-400">Basket size</span>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                      {/* Date Filter Buttons */}
                      <div className="flex items-center gap-1 bg-pink-50/60 p-1 rounded-xl border border-pink-100 self-start">
                        {[
                          { key: "today", label: "Hari Ini" },
                          { key: "7days", label: "7 Hari" },
                          { key: "all", label: "Semua Waktu" },
                        ].map((df) => (
                          <button
                            key={df.key}
                            type="button"
                            onClick={() => setHistoryFilterDate(df.key as any)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              historyFilterDate === df.key
                                ? "bg-rose-500 text-white shadow-xs"
                                : "text-gray-600 hover:text-rose-600"
                            }`}
                          >
                            {df.label}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar & Export Button */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-48">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari nota / menu..."
                            value={historySearchQuery}
                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-pink-50/40 border border-pink-200 rounded-xl focus:ring-1 focus:ring-rose-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExportCashierCSV(selectedCashierForHistory.name, filtered)}
                          className="px-2.5 py-1.5 bg-white hover:bg-pink-50 text-rose-600 border border-pink-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs whitespace-nowrap btn-bounce"
                          title="Ekspor CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* View Tabs: Transaksi vs Log Aktivitas */}
                    <div className="flex items-center gap-2 border-b border-pink-100 pb-2">
                      <button
                        type="button"
                        onClick={() => setHistoryTab("transactions")}
                        className={`text-xs font-bold pb-1 transition-all ${
                          historyTab === "transactions"
                            ? "text-rose-600 border-b-2 border-rose-500"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        Daftar Transaksi ({filtered.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTab("logs")}
                        className={`text-xs font-bold pb-1 transition-all ${
                          historyTab === "logs"
                            ? "text-rose-600 border-b-2 border-rose-500"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        Log Aktivitas Shift ({cashierLogs.length})
                      </button>
                    </div>

                    {/* TAB 1: DAFTAR TRANSAKSI YANG DIINPUT KASIR */}
                    {historyTab === "transactions" && (
                      <div className="space-y-2.5">
                        {filtered.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 bg-white rounded-2xl border border-pink-100 shadow-xs hover:border-rose-200 transition-all space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-gray-800">
                                  #{t.receipt_no}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.payment_method === "cash"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {t.payment_method === "cash" ? "💵 Tunai" : "📱 QRIS"}
                                </span>
                              </div>
                              <span className="font-black text-rose-600 text-sm">
                                {formatRupiah(t.total_amount)}
                              </span>
                            </div>

                            {/* Waktu Transaksi */}
                            <p className="text-[10px] text-gray-400">
                              {formatDateIndo(t.created_at)}
                            </p>

                            {/* Items Preview */}
                            {t.items && t.items.length > 0 && (
                              <div className="bg-pink-50/40 rounded-xl p-2 text-[11px] text-gray-600 space-y-0.5">
                                {t.items.map((it, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>
                                      {it.qty}x {it.product_name}
                                    </span>
                                    <span className="font-semibold text-gray-700">
                                      {formatRupiah(it.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {filtered.length === 0 && (
                          <div className="text-center py-10 bg-pink-50/20 rounded-2xl border border-dashed border-pink-200 text-gray-400 text-xs">
                            <Receipt className="w-8 h-8 mx-auto mb-2 text-pink-300" />
                            <p className="font-bold">Belum ada inputan transaksi pada periode ini.</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Transaksi yang diinput oleh kasir ini di layar POS akan otomatis tercatat di sini.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: LOG AKTIVITAS SHIFT */}
                    {historyTab === "logs" && (
                      <div className="space-y-2">
                        {cashierLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 bg-white rounded-xl border border-pink-100 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {log.action === "login"
                                  ? "🟢"
                                  : log.action === "sale"
                                  ? "🛒"
                                  : "📦"}
                              </span>
                              <div>
                                <p className="font-bold text-gray-800">{log.details}</p>
                                <p className="text-[10px] text-gray-400">
                                  {formatDateIndo(log.created_at)}
                                </p>
                              </div>
                            </div>
                            {log.amount && (
                              <span className="font-bold text-rose-600 text-xs">
                                {formatRupiah(log.amount)}
                              </span>
                            )}
                          </div>
                        ))}

                        {cashierLogs.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-xs">
                            Belum ada catatan aktivitas shift tercatat.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-pink-100 bg-pink-50/30 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCashierForHistory(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xl transition-all btn-bounce"
              >
                Tutup Riwayat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PROFIL TOKO */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-2xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-rose-500" />
            <span>Informasi Kios & Struk Pembelian</span>
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Toko / Kios
              </label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full px-4 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Alamat Kios Lengkap
              </label>
              <input
                type="text"
                value={settings.address || ""}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-4 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nomor WhatsApp Toko (Untuk Kirim Nota)
              </label>
              <input
                type="tel"
                value={settings.whatsapp_number || ""}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Catatan Kaki Struk (Receipt Footer)
              </label>
              <textarea
                rows={2}
                value={settings.receipt_footer || ""}
                onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                className="w-full px-4 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Target Biaya Tetap & Pengeluaran Rutin untuk AI Financial Advisor (DYNAMIC CRUD) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-pink-50/70 border-2 border-pink-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-pink-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🤖</span>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-gray-800">
                      Kelola Beban Tetap & Operasional Bulanan (Sinking Fund AI)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Tambah/ubah pos pengeluaran rutin (Sewa, Gas LPG, Listrik, Gaji, dll). AI otomatis menghitung total beban & rekomendasi sisihan harian toko.
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2 self-start sm:self-auto">
                  <div className="bg-rose-500 text-white px-3 py-1.5 rounded-xl shadow-xs">
                    <span className="text-[10px] font-semibold block uppercase">Total Beban / Bulan</span>
                    <span className="text-sm font-black tracking-tight">
                      {formatRupiah(fixedExpenses.reduce((sum, it) => sum + (Number(it.amount) || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tgl Jatuh Tempo Utama */}
              <div className="bg-white p-3 rounded-2xl border border-pink-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Tanggal Jatuh Tempo Pembayaran Sewa</span>
                  <span className="text-[10px] text-gray-500">AI menghitung sisa hari mundur ke tanggal ini tiap bulan.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Tgl</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={adminRentDueDay}
                    onChange={(e) => {
                      const day = Math.min(31, Math.max(1, Number(e.target.value) || 25));
                      setAdminRentDueDay(day);
                      saveFixedExpensesToStorage(fixedExpenses, day);
                    }}
                    className="w-14 px-2 py-1.5 text-xs font-black text-center bg-pink-50 border border-pink-200 rounded-xl text-rose-600 focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="text-xs font-semibold text-gray-500">tiap bulan</span>
                </div>
              </div>

              {/* List Pengeluaran Bulanan yang Terdaftar (CRUD READ, UPDATE, DELETE) */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
                  Daftar Pos Pengeluaran Rutin ({fixedExpenses.length} Pos)
                </span>

                <div className="space-y-2">
                  {fixedExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-white p-3 rounded-2xl border border-pink-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all hover:border-pink-300"
                    >
                      {editingExpenseId === exp.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            value={editExpenseName}
                            onChange={(e) => setEditExpenseName(e.target.value)}
                            placeholder="Nama Beban"
                            className="w-full sm:w-1/2 px-3 py-1.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold"
                          />
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={editExpenseAmount}
                            onChange={(e) => setEditExpenseAmount(e.target.value)}
                            placeholder="Nominal (Rp)"
                            className="w-full sm:w-1/2 px-3 py-1.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold text-rose-600"
                          />
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleSaveEditExpense(exp.id)}
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExpenseId(null)}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-pink-100 text-rose-600 text-xs flex items-center justify-center font-bold">
                              {exp.name.toLowerCase().includes("sewa")
                                ? "🏢"
                                : exp.name.toLowerCase().includes("listrik")
                                ? "⚡"
                                : exp.name.toLowerCase().includes("gas")
                                ? "🔥"
                                : exp.name.toLowerCase().includes("gaji")
                                ? "👨‍🍳"
                                : exp.name.toLowerCase().includes("sampah")
                                ? "🧹"
                                : "📦"}
                            </span>
                            <div>
                              <span className="font-bold text-xs text-gray-800 block">{exp.name}</span>
                              <span className="text-[10px] text-gray-500">Biaya rutin bulanan</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <span className="font-black text-xs text-gray-900 bg-pink-50/80 px-2.5 py-1 rounded-xl border border-pink-100">
                              {formatRupiah(exp.amount)} <span className="text-[10px] text-gray-500 font-normal">/ bln</span>
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditExpense(exp)}
                                className="w-7 h-7 rounded-xl bg-gray-50 hover:bg-pink-100 text-gray-600 hover:text-rose-600 flex items-center justify-center transition-colors"
                                title="Edit pengeluaran ini"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id, exp.name)}
                                className="w-7 h-7 rounded-xl bg-gray-50 hover:bg-rose-100 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                                title="Hapus pengeluaran ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Tambah Pengeluaran Baru (CRUD CREATE) */}
              <div className="bg-white p-3.5 rounded-2xl border border-pink-200/90 shadow-xs space-y-2.5">
                <span className="text-[11px] font-black text-rose-600 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pos Pengeluaran Rutin Baru</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={newExpenseName}
                      onChange={(e) => setNewExpenseName(e.target.value)}
                      placeholder="Nama beban (misal: Gas LPG 3kg, Gaji Staf, Air)"
                      className="w-full px-3 py-2 text-xs bg-pink-50/40 border border-pink-200 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      placeholder="Nominal / bln (Rp)"
                      className="w-full px-3 py-2 text-xs bg-pink-50/40 border border-pink-200 rounded-xl font-bold text-rose-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleAddExpense()}
                      className="w-full h-full py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 btn-bounce min-h-[36px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>

                {/* Quick Preset Chips */}
                <div className="pt-2 border-t border-pink-100 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-500">Pilihan Cepat:</span>
                  {[
                    { label: "🔥 Gas LPG 3kg", name: "Gas LPG 3kg", amount: 400000 },
                    { label: "👨‍🍳 Gaji Karyawan", name: "Gaji Karyawan", amount: 1500000 },
                    { label: "🧹 Iuran Sampah", name: "Iuran Sampah & Kebersihan", amount: 100000 },
                    { label: "💧 Air Galon / PDAM", name: "Air Bersih & Galon", amount: 100000 },
                    { label: "📶 Kuota Internet Kios", name: "Kuota Internet Kios", amount: 75000 },
                  ]
                    .filter((p) => !fixedExpenses.some((e) => e.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 5))))
                    .map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleAddExpense(preset.name, preset.amount)}
                        className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-gray-700 hover:text-rose-600 rounded-lg text-[10px] font-semibold border border-pink-200 transition-all active:scale-95"
                      >
                        + {preset.label} ({formatRupiah(preset.amount)})
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Change Admin PIN */}
            <div className="pt-3 border-t border-pink-100">
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-rose-500" />
                <span>Ganti PIN Keamanan Admin (Opsional)</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ganti PIN"
                className="w-full px-4 py-2.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil & Pengaturan</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MENU & PRODUK CRUD */}
      {activeTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Form Create/Edit */}
          <div id="admin-product-form-card" className="lg:col-span-5 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center justify-between">
              <span>{isEditingProduct ? "Edit Menu Produk" : "Tambah Menu Baru"}</span>
              {isEditingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProduct(false);
                    setMainIngredients([]);
                    setPackagingItems([]);
                    setProductForm({
                      id: "",
                      name: "",
                      category: "Ayam",
                      price: 0,
                      is_available: true,
                      icon_or_image_url: "🍗",
                      original_price: 0,
                      discount_percent: 20,
                      promo_items: [],
                    });
                  }}
                  className="text-xs text-rose-500 hover:underline font-normal"
                >
                  Batal Edit
                </button>
              )}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Menu</label>
                <input
                  type="text"
                  placeholder={productForm.category === "Promo" ? "Contoh: Promo Combo Kenyang (Dada + Nasi + Es Teh)" : "Contoh: Dada Krispi Pedas"}
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-semibold"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setProductForm((prev) => ({
                          ...prev,
                          category: newCat,
                          icon_or_image_url: newCat === "Promo" && prev.icon_or_image_url === "🍗" ? "🔥" : prev.icon_or_image_url,
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-bold"
                    >
                      <option value="Ayam">Ayam</option>
                      <option value="Paket">Paket</option>
                      <option value="Promo">Promo 🔥</option>
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Pilihan Cepat Ikon
                    </label>
                    <select
                      value={["🍗", "🥩", "🍱", "🥤", "🍚", "🍟", "🍔", "🔥", "🎉", "🌶️", "🧀", "🌭", "🍵", "🧃"].includes(productForm.icon_or_image_url) ? productForm.icon_or_image_url : "custom"}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          setProductForm({ ...productForm, icon_or_image_url: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-bold"
                    >
                      <option value="🍗">🍗 Ayam Krispi</option>
                      <option value="🥩">🥩 Daging / Steak</option>
                      <option value="🍱">🍱 Paket Bento / Nasi</option>
                      <option value="🥤">🥤 Minuman Segar / Es</option>
                      <option value="🍚">🍚 Nasi Putih</option>
                      <option value="🍟">🍟 Kentang Goreng</option>
                      <option value="🍔">🍔 Burger Crispy</option>
                      <option value="🔥">🔥 Promo Panas</option>
                      <option value="🎉">🎉 Promo Spesial</option>
                      <option value="🌶️">🌶️ Sambal Geprek / Pedas</option>
                      <option value="🧀">🧀 Saus Keju</option>
                      <option value="🌭">🌭 Sosis Bakar/Goreng</option>
                      <option value="🍵">🍵 Teh Hangat</option>
                      <option value="🧃">🧃 Jus / Kotak</option>
                      <option value="custom">✏️ Kustom / Input Sendiri</option>
                    </select>
                  </div>
                </div>

                {/* Input Text & Preview Icon Dinamis */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Icon/Emoji (Contoh: 🍗, 🥩, 🍱, 🥤)
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">Bisa emoji atau link URL gambar</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Live Animated Preview */}
                    <div className="w-10 h-10 rounded-xl bg-pink-100/80 border border-pink-200 flex items-center justify-center shrink-0 shadow-2xs group">
                      {productForm.icon_or_image_url?.startsWith("http") ? (
                        <img
                          src={productForm.icon_or_image_url}
                          alt="preview"
                          className="w-7 h-7 object-cover rounded-lg group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="text-xl inline-block hover:scale-125 transition-transform duration-200 animate-pulse">
                          {productForm.icon_or_image_url || "🍗"}
                        </span>
                      )}
                    </div>

                    {/* Text Input */}
                    <input
                      type="text"
                      placeholder="Contoh: 🍗, 🥩, 🍱, 🥤 atau URL gambar..."
                      value={productForm.icon_or_image_url}
                      onChange={(e) => setProductForm({ ...productForm, icon_or_image_url: e.target.value })}
                      className="flex-1 px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-medium"
                    />
                  </div>

                  {/* Quick Click Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold text-gray-400 mr-1">Klik Cepat:</span>
                    {["🍗", "🥩", "🍱", "🥤", "🍚", "🍟", "🍔", "🔥", "🎉", "🌶️"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setProductForm({ ...productForm, icon_or_image_url: emoji })}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                          productForm.icon_or_image_url === emoji
                            ? "bg-rose-500 text-white scale-110 shadow-xs border border-rose-600"
                            : "bg-white hover:bg-pink-100 border border-pink-200 hover:scale-105"
                        }`}
                        title={`Pilih ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* JIKA KATEGORI PROMO: RENDER ALACARTE COMBO PICKER & DISCOUNT CALCULATOR */}
              {productForm.category === "Promo" && (
                <div className="bg-gradient-to-b from-rose-50/90 to-pink-50/50 border border-rose-200 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-rose-700">
                      <Tag className="w-4 h-4 text-rose-600" />
                      <span>Pilih Menu Satuan (Alacarte)</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                      {productForm.promo_items?.reduce((s, it) => s + it.qty, 0) || 0} Porsi Dipilih
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-tight">
                    Pilih menu satuan di bawah untuk digabung jadi paket promo. Harga normal dihitung otomatis dari total alacarte.
                  </p>

                  {/* Grid Pilihan Menu Alacarte */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {alacarteProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 italic col-span-2">Belum ada menu alacarte yang terdaftar.</p>
                    ) : (
                      alacarteProducts.map((alacarte) => {
                        const current = productForm.promo_items?.find((it) => it.productId === alacarte.id);
                        const qty = current ? current.qty : 0;
                        const isSelected = qty > 0;

                        return (
                          <div
                            key={alacarte.id}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 transition-all ${
                              isSelected
                                ? "bg-white border-rose-400 shadow-xs ring-1 ring-rose-200"
                                : "bg-white/80 border-gray-200 hover:border-pink-300"
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="text-base">{alacarte.icon_or_image_url || "🍗"}</span>
                              <div className="truncate">
                                <p className="text-[11px] font-bold text-gray-800 truncate">{alacarte.name}</p>
                                <p className="text-[10px] font-semibold text-gray-400">{formatRupiah(alacarte.price)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {qty > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePromoItemQty(alacarte, -1)}
                                  className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-rose-100 text-gray-700 hover:text-rose-600 flex items-center justify-center font-bold text-xs transition-colors"
                                  title="Kurangi"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              )}
                              {qty > 0 && (
                                <span className="w-5 text-center text-xs font-black text-rose-600">
                                  {qty}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUpdatePromoItemQty(alacarte, 1)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                                  qty > 0
                                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-xs"
                                    : "bg-pink-100 text-rose-600 hover:bg-rose-500 hover:text-white"
                                }`}
                                title="Tambah"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Ringkasan Item yang Terpilih */}
                  {productForm.promo_items && productForm.promo_items.length > 0 && (
                    <div className="bg-white rounded-xl p-2.5 border border-rose-200 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span>Rincian Komponen Paket:</span>
                        <span className="text-gray-500">
                          Total Normal: <strong className="text-gray-800">{formatRupiah(productForm.original_price || 0)}</strong>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {productForm.promo_items.map((it) => (
                          <span
                            key={it.productId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-50 border border-pink-200 text-[10px] font-bold text-gray-700"
                          >
                            <span>{it.qty}x {it.name}</span>
                            <span className="text-gray-400 font-normal">({formatRupiah(it.unit_price * it.qty)})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pengaturan Diskon Persen */}
                  <div className="pt-2 border-t border-rose-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-rose-500" />
                        <span>Diskon Promo (%)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={productForm.discount_percent ?? 20}
                          onChange={(e) => handleApplyDiscountPercent(Number(e.target.value) || 0)}
                          className="w-14 px-2 py-1 text-xs text-center font-black bg-white border border-rose-300 rounded-lg text-rose-600 focus:ring-2 focus:ring-rose-400"
                        />
                        <span className="text-xs font-black text-rose-600">%</span>
                      </div>
                    </div>

                    {/* Preset Diskon Cepat */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-500">Preset Diskon:</span>
                      {[10, 15, 20, 25, 30, 50].map((disc) => (
                        <button
                          key={disc}
                          type="button"
                          onClick={() => handleApplyDiscountPercent(disc)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                            productForm.discount_percent === disc
                              ? "bg-rose-500 text-white shadow-xs"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-600"
                          }`}
                        >
                          {disc}%
                        </button>
                      ))}
                    </div>

                    {/* Preview Hemat & Harga Promo */}
                    <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span>Total Normal:</span>
                          <span className="line-through text-gray-400 font-semibold">{formatRupiah(productForm.original_price || 0)}</span>
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                          Hemat {formatRupiah(Math.max(0, (productForm.original_price || 0) - (productForm.price || 0)))} ({productForm.discount_percent || 0}%)
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-rose-600 block uppercase">Harga Jual Promo</span>
                        <span className="text-base font-black text-rose-600">{formatRupiah(productForm.price || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {productForm.category === "Promo" ? "Harga Jual Promo Final (Rp)" : "Harga Jual (Rp)"}
                </label>
                <input
                  type="number"
                  value={productForm.price || ""}
                  onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold text-rose-600 focus:ring-2 focus:ring-rose-400"
                  required
                />
                {productForm.category === "Promo" && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    *Harga promo otomatis terisi dari kalkulasi diskon alacarte, namun Anda tetap dapat menyesuaikan/membulatkan nominalnya jika diperlukan.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={productForm.is_available}
                  onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })}
                  className="w-4 h-4 text-rose-500 rounded border-gray-300 focus:ring-rose-400"
                />
                <label htmlFor="availCheck" className="text-xs font-semibold text-gray-700">
                  Status Tersedia untuk Dijual
                </label>
              </div>

              {/* SEKSI BILL OF MATERIALS (BOM) & PACKAGING */}
              <div className="border border-pink-200/90 rounded-2xl p-3.5 bg-gradient-to-b from-pink-50/50 via-white to-pink-50/30 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-pink-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <CookingPot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                        <span>Resep & Bill of Materials (BOM)</span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.2 rounded-full">
                          FIFO Terhubung
                        </span>
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        Takaran bahan baku dan kemasan yang otomatis dipotong saat menu terjual di kasir.
                      </p>
                    </div>
                  </div>
                  {isLoadingRecipes && (
                    <span className="text-[10px] text-rose-500 font-bold animate-pulse">
                      Memuat resep...
                    </span>
                  )}
                </div>

                {/* KELOMPOK A: KOMPOSISI BAHAN UTAMA */}
                <div className="space-y-2 bg-white/90 rounded-xl p-3 border border-pink-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-2xs">
                        A
                      </span>
                      <span className="text-xs font-black text-gray-800">
                        Komposisi Bahan Utama
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        (Ayam, Beras, Minuman, dll.)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMainIngredient}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-pink-50 hover:bg-rose-100 border border-pink-200 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Bahan</span>
                    </button>
                  </div>

                  {mainIngredients.length === 0 ? (
                    <div className="py-2.5 text-center text-[11px] text-gray-400 bg-pink-50/30 rounded-lg border border-dashed border-pink-200">
                      Belum ada bahan utama. Klik <strong className="text-rose-500 font-semibold">+ Tambah Bahan</strong> jika menu ini memakai stok bahan baku.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mainIngredients.map((row, idx) => {
                        const selectedItem = inventoryItems.find((it) => it.id === row.inventory_item_id);
                        const baseUnit = selectedItem?.unit || "";
                        const compatibleUnits = getCompatibleUnits(baseUnit);
                        const curUnit = row.selected_unit || compatibleUnits[0] || baseUnit || "pcs";
                        const previewText = getConversionPreviewText(row.qty_required, curUnit, baseUnit);

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-pink-50/30 rounded-xl border border-pink-100 hover:border-pink-300 transition-all text-xs"
                          >
                            {/* Dropdown Bahan Utama */}
                            <div className="flex-1 min-w-0">
                              <select
                                value={row.inventory_item_id}
                                onChange={(e) => {
                                  const newId = e.target.value;
                                  const targetInv = inventoryItems.find((it) => it.id === newId);
                                  const defUnit = getCompatibleUnits(targetInv?.unit)[0] || targetInv?.unit || "";
                                  handleUpdateMainIngredient(idx, "inventory_item_id", newId, defUnit);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-pink-200 rounded-lg font-semibold text-gray-700 focus:ring-2 focus:ring-rose-400 truncate"
                              >
                                <option value="">-- Pilih Bahan Baku --</option>
                                {inventoryItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Satuan: {it.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Input Qty Required & Satuan Resep */}
                            <div className="flex flex-col items-end shrink-0">
                              <div className="flex items-center bg-white border border-pink-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-400">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  placeholder="Qty"
                                  value={row.qty_required || ""}
                                  onChange={(e) => handleUpdateMainIngredient(idx, "qty_required", e.target.value)}
                                  className="w-20 px-2 py-1.5 text-xs font-bold text-gray-800 text-right outline-none"
                                  required
                                />
                                {compatibleUnits.length > 1 ? (
                                  <select
                                    value={curUnit}
                                    onChange={(e) => handleUpdateMainIngredient(idx, "selected_unit", e.target.value)}
                                    className="px-2 py-1.5 text-[10px] font-bold text-rose-600 bg-pink-50 border-l border-pink-100 outline-none cursor-pointer hover:bg-pink-100 transition-colors"
                                  >
                                    {compatibleUnits.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-2 py-1.5 text-[10px] font-bold text-gray-500 bg-pink-50 border-l border-pink-100 whitespace-nowrap min-w-[42px] text-center">
                                    {baseUnit || "-"}
                                  </span>
                                )}
                              </div>
                              {previewText && (
                                <span className="text-[9px] font-medium text-rose-500 mt-0.5 whitespace-nowrap">
                                  {previewText}
                                </span>
                              )}
                            </div>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveMainIngredient(idx)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Hapus bahan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* KELOMPOK B: PACKAGING / KEMASAN */}
                <div className="space-y-2 bg-white/90 rounded-xl p-3 border border-amber-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-2xs">
                        B
                      </span>
                      <span className="text-xs font-black text-gray-800">
                        Packaging / Kemasan
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        (Box Kertas, Cup, Kantong, dll.)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPackagingItem}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Kemasan</span>
                    </button>
                  </div>

                  {packagingItems.length === 0 ? (
                    <div className="py-2.5 text-center text-[11px] text-gray-400 bg-amber-50/20 rounded-lg border border-dashed border-amber-200">
                      Belum ada kemasan. Klik <strong className="text-amber-700 font-semibold">+ Tambah Kemasan</strong> untuk memasukkan box, cup, atau plastik.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {packagingItems.map((row, idx) => {
                        const selectedItem = inventoryItems.find((it) => it.id === row.inventory_item_id);
                        const baseUnit = selectedItem?.unit || "";
                        const compatibleUnits = getCompatibleUnits(baseUnit);
                        const curUnit = row.selected_unit || compatibleUnits[0] || baseUnit || "pcs";
                        const previewText = getConversionPreviewText(row.qty_required, curUnit, baseUnit);

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-amber-50/20 rounded-xl border border-amber-100 hover:border-amber-300 transition-all text-xs"
                          >
                            {/* Dropdown Kemasan */}
                            <div className="flex-1 min-w-0">
                              <select
                                value={row.inventory_item_id}
                                onChange={(e) => {
                                  const newId = e.target.value;
                                  const targetInv = inventoryItems.find((it) => it.id === newId);
                                  const defUnit = getCompatibleUnits(targetInv?.unit)[0] || targetInv?.unit || "";
                                  handleUpdatePackagingItem(idx, "inventory_item_id", newId, defUnit);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-200 rounded-lg font-semibold text-gray-700 focus:ring-2 focus:ring-amber-400 truncate"
                              >
                                <option value="">-- Pilih Kemasan / Wadah --</option>
                                {inventoryItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Satuan: {it.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Input Qty Required & Satuan */}
                            <div className="flex flex-col items-end shrink-0">
                              <div className="flex items-center bg-white border border-amber-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  placeholder="Qty"
                                  value={row.qty_required || ""}
                                  onChange={(e) => handleUpdatePackagingItem(idx, "qty_required", e.target.value)}
                                  className="w-20 px-2 py-1.5 text-xs font-bold text-gray-800 text-right outline-none"
                                  required
                                />
                                {compatibleUnits.length > 1 ? (
                                  <select
                                    value={curUnit}
                                    onChange={(e) => handleUpdatePackagingItem(idx, "selected_unit", e.target.value)}
                                    className="px-2 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border-l border-amber-100 outline-none cursor-pointer hover:bg-amber-100 transition-colors"
                                  >
                                    {compatibleUnits.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-2 py-1.5 text-[10px] font-bold text-gray-500 bg-amber-50 border-l border-amber-100 whitespace-nowrap min-w-[42px] text-center">
                                    {baseUnit || "-"}
                                  </span>
                                )}
                              </div>
                              {previewText && (
                                <span className="text-[9px] font-medium text-amber-600 mt-0.5 whitespace-nowrap">
                                  {previewText}
                                </span>
                              )}
                            </div>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemovePackagingItem(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Hapus kemasan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[48px]"
              >
                {isEditingProduct ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isEditingProduct ? "Perbarui Menu" : "Tambah ke Menu"}</span>
              </button>
            </form>
          </div>

          {/* Product List */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3">
              Daftar Menu Aktif ({products.length})
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl p-2 bg-white rounded-xl shadow-xs shrink-0">
                      {p.icon_or_image_url || "🍗"}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-gray-800 truncate">{p.name}</h4>

                      {/* Komponen Promo jika ada */}
                      {p.category === "Promo" && p.promo_items && p.promo_items.length > 0 && (
                        <p className="text-[10px] text-gray-500 font-medium truncate max-w-[200px] sm:max-w-xs mt-0.5">
                          Isi: {p.promo_items.map((it) => `${it.qty}x ${it.name}`).join(" + ")}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            p.category === "Promo"
                              ? "bg-red-50 text-red-600 border-red-200 font-black"
                              : "bg-white text-gray-500 border-pink-100"
                          }`}
                        >
                          {p.category === "Promo" ? "🔥 Promo" : p.category}
                        </span>

                        {p.category === "Promo" && p.discount_percent && p.discount_percent > 0 ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-red-500 text-white rounded-md">
                            -{p.discount_percent}%
                          </span>
                        ) : null}

                        {p.original_price && p.original_price > p.price ? (
                          <span className="text-[10px] line-through text-gray-400 font-semibold">
                            {formatRupiah(p.original_price)}
                          </span>
                        ) : null}

                        <span className="text-xs font-black text-rose-600">
                          {formatRupiah(p.price)}
                        </span>

                        {productRecipesMap[p.id] ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-200">
                            🥗 {productRecipesMap[p.id]} Resep/BOM
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Toggle Availability */}
                    <button
                      type="button"
                      onClick={() => handleToggleProductAvailability(p)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-xl border transition-all ${
                        p.is_available
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-300"
                      }`}
                    >
                      {p.is_available ? "Tersedia" : "Habis"}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleStartEditProduct(p)}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors"
                      title="Edit menu & komposisi resep"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VARIAN & ADD-ON CRUD */}
      {activeTab === "addons" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Addon Form */}
          <div id="admin-addon-form-card" className="lg:col-span-5 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center justify-between">
              <span>{isEditingAddon ? "Edit Saus Pelengkap" : "Tambah Saus / Pelengkap"}</span>
              {isEditingAddon && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAddon(false);
                    setAddonMainIngredients([]);
                    setAddonPackagingItems([]);
                    setAddonForm({ id: "", name: "", price: 0 });
                  }}
                  className="text-xs text-rose-500 hover:underline font-normal"
                >
                  Batal Edit
                </button>
              )}
            </h2>

            <form onSubmit={handleSaveAddon} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Saus / Add-on</label>
                <input
                  type="text"
                  placeholder="Contoh: Saus Keju Lumer"
                  value={addonForm.name}
                  onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Tambahan (Rp)</label>
                <input
                  type="number"
                  value={addonForm.price || ""}
                  onChange={(e) => setAddonForm({ ...addonForm, price: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold text-rose-600"
                  required
                />
              </div>

              {/* SEKSI BILL OF MATERIALS (BOM) & PACKAGING UNTUK VARIAN SAUS */}
              <div className="border border-pink-200/90 rounded-2xl p-3.5 bg-gradient-to-b from-pink-50/50 via-white to-pink-50/30 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-pink-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <CookingPot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                        <span>Resep & Bill of Materials (BOM)</span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.2 rounded-full">
                          FIFO Terhubung
                        </span>
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        Takaran bahan baku dan kemasan yang otomatis dipotong saat varian ini dipilih di kasir.
                      </p>
                    </div>
                  </div>
                  {isLoadingAddonRecipes && (
                    <span className="text-[10px] text-rose-500 font-bold animate-pulse">
                      Memuat resep...
                    </span>
                  )}
                </div>

                {/* KELOMPOK A: KOMPOSISI BAHAN UTAMA SAUS */}
                <div className="space-y-2 bg-white/90 rounded-xl p-3 border border-pink-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-2xs">
                        A
                      </span>
                      <span className="text-xs font-black text-gray-800">
                        Komposisi Bahan Utama
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        (Bahan Saus, Bubuk Keju, Gula, dll.)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAddonMainIngredient}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-pink-50 hover:bg-rose-100 border border-pink-200 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Bahan</span>
                    </button>
                  </div>

                  {addonMainIngredients.length === 0 ? (
                    <div className="py-2.5 text-center text-[11px] text-gray-400 bg-pink-50/30 rounded-lg border border-dashed border-pink-200">
                      Belum ada bahan utama. Klik <strong className="text-rose-500 font-semibold">+ Tambah Bahan</strong> untuk menautkan bahan baku saus.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {addonMainIngredients.map((row, idx) => {
                        const selectedItem = inventoryItems.find((it) => it.id === row.inventory_item_id);
                        const baseUnit = selectedItem?.unit || "";
                        const compatibleUnits = getCompatibleUnits(baseUnit);
                        const curUnit = row.selected_unit || compatibleUnits[0] || baseUnit || "pcs";
                        const previewText = getConversionPreviewText(row.qty_required, curUnit, baseUnit);

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-pink-50/30 rounded-xl border border-pink-100 hover:border-pink-300 transition-all text-xs"
                          >
                            {/* Dropdown Bahan Utama */}
                            <div className="flex-1 min-w-0">
                              <select
                                value={row.inventory_item_id}
                                onChange={(e) => {
                                  const newId = e.target.value;
                                  const targetInv = inventoryItems.find((it) => it.id === newId);
                                  const defUnit = getCompatibleUnits(targetInv?.unit)[0] || targetInv?.unit || "";
                                  handleUpdateAddonMainIngredient(idx, "inventory_item_id", newId, defUnit);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-pink-200 rounded-lg font-semibold text-gray-700 focus:ring-2 focus:ring-rose-400 truncate"
                              >
                                <option value="">-- Pilih Bahan Baku --</option>
                                {inventoryItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Satuan: {it.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Input Qty Required & Satuan Resep */}
                            <div className="flex flex-col items-end shrink-0">
                              <div className="flex items-center bg-white border border-pink-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-400">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  placeholder="Qty"
                                  value={row.qty_required || ""}
                                  onChange={(e) => handleUpdateAddonMainIngredient(idx, "qty_required", e.target.value)}
                                  className="w-20 px-2 py-1.5 text-xs font-bold text-gray-800 text-right outline-none"
                                  required
                                />
                                {compatibleUnits.length > 1 ? (
                                  <select
                                    value={curUnit}
                                    onChange={(e) => handleUpdateAddonMainIngredient(idx, "selected_unit", e.target.value)}
                                    className="px-2 py-1.5 text-[10px] font-bold text-rose-600 bg-pink-50 border-l border-pink-100 outline-none cursor-pointer hover:bg-pink-100 transition-colors"
                                  >
                                    {compatibleUnits.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-2 py-1.5 text-[10px] font-bold text-gray-500 bg-pink-50 border-l border-pink-100 whitespace-nowrap min-w-[42px] text-center">
                                    {baseUnit || "-"}
                                  </span>
                                )}
                              </div>
                              {previewText && (
                                <span className="text-[9px] font-medium text-rose-500 mt-0.5 whitespace-nowrap">
                                  {previewText}
                                </span>
                              )}
                            </div>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveAddonMainIngredient(idx)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Hapus bahan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* KELOMPOK B: PACKAGING / KEMASAN SAUS */}
                <div className="space-y-2 bg-white/90 rounded-xl p-3 border border-amber-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-2xs">
                        B
                      </span>
                      <span className="text-xs font-black text-gray-800">
                        Packaging / Kemasan
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        (Cup Saus, Plastik Klip, Tutup Cup, dll.)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAddonPackagingItem}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Kemasan</span>
                    </button>
                  </div>

                  {addonPackagingItems.length === 0 ? (
                    <div className="py-2.5 text-center text-[11px] text-gray-400 bg-amber-50/20 rounded-lg border border-dashed border-amber-200">
                      Belum ada kemasan. Klik <strong className="text-amber-700 font-semibold">+ Tambah Kemasan</strong> untuk memasukkan cup saus atau plastik klip.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {addonPackagingItems.map((row, idx) => {
                        const selectedItem = inventoryItems.find((it) => it.id === row.inventory_item_id);
                        const baseUnit = selectedItem?.unit || "";
                        const compatibleUnits = getCompatibleUnits(baseUnit);
                        const curUnit = row.selected_unit || compatibleUnits[0] || baseUnit || "pcs";
                        const previewText = getConversionPreviewText(row.qty_required, curUnit, baseUnit);

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-amber-50/20 rounded-xl border border-amber-100 hover:border-amber-300 transition-all text-xs"
                          >
                            {/* Dropdown Kemasan */}
                            <div className="flex-1 min-w-0">
                              <select
                                value={row.inventory_item_id}
                                onChange={(e) => {
                                  const newId = e.target.value;
                                  const targetInv = inventoryItems.find((it) => it.id === newId);
                                  const defUnit = getCompatibleUnits(targetInv?.unit)[0] || targetInv?.unit || "";
                                  handleUpdateAddonPackagingItem(idx, "inventory_item_id", newId, defUnit);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-200 rounded-lg font-semibold text-gray-700 focus:ring-2 focus:ring-amber-400 truncate"
                              >
                                <option value="">-- Pilih Kemasan / Wadah --</option>
                                {inventoryItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Satuan: {it.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Input Qty Required & Satuan */}
                            <div className="flex flex-col items-end shrink-0">
                              <div className="flex items-center bg-white border border-amber-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  placeholder="Qty"
                                  value={row.qty_required || ""}
                                  onChange={(e) => handleUpdateAddonPackagingItem(idx, "qty_required", e.target.value)}
                                  className="w-20 px-2 py-1.5 text-xs font-bold text-gray-800 text-right outline-none"
                                  required
                                />
                                {compatibleUnits.length > 1 ? (
                                  <select
                                    value={curUnit}
                                    onChange={(e) => handleUpdateAddonPackagingItem(idx, "selected_unit", e.target.value)}
                                    className="px-2 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border-l border-amber-100 outline-none cursor-pointer hover:bg-amber-100 transition-colors"
                                  >
                                    {compatibleUnits.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-2 py-1.5 text-[10px] font-bold text-gray-500 bg-amber-50 border-l border-amber-100 whitespace-nowrap min-w-[42px] text-center">
                                    {baseUnit || "-"}
                                  </span>
                                )}
                              </div>
                              {previewText && (
                                <span className="text-[9px] font-medium text-amber-600 mt-0.5 whitespace-nowrap">
                                  {previewText}
                                </span>
                              )}
                            </div>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveAddonPackagingItem(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Hapus kemasan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[48px]"
              >
                {isEditingAddon ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isEditingAddon ? "Perbarui Varian" : "Tambah Varian Saus"}</span>
              </button>
            </form>
          </div>

          {/* Addon List */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3">
              Daftar Saus & Pelengkap ({addons.length})
            </h2>

            <div className="space-y-2">
              {addons.map((a) => (
                <div
                  key={a.id}
                  className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center justify-between gap-2"
                >
                  <div>
                    <h4 className="font-bold text-xs text-gray-800">{a.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs font-black text-rose-600">
                        +{formatRupiah(a.price)}
                      </span>
                      {addonRecipesMap[a.id] ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-200">
                          🥗 {addonRecipesMap[a.id]} Resep/BOM
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditAddon(a)}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors"
                      title="Edit varian & resep BOM"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddon(a.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MASTER BAHAN BAKU CRUD */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inventory Form */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center justify-between">
              <span>{isEditingInventory ? "Edit Master Bahan" : "Tambah Bahan Baku Baru"}</span>
              {isEditingInventory && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingInventory(false);
                    setInventoryForm({
                      id: "",
                      name: "",
                      unit: "potong",
                      min_stock: 10,
                      current_stock: 50,
                    });
                  }}
                  className="text-xs text-rose-500 hover:underline font-normal"
                >
                  Batal Edit
                </button>
              )}
            </h2>

            <form onSubmit={handleSaveInventory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Bahan Baku</label>
                <input
                  type="text"
                  placeholder="Contoh: Daging Ayam Segar"
                  value={inventoryForm.name}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Satuan</label>
                  <select
                    value={inventoryForm.unit}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-medium"
                  >
                    <option value="potong">potong</option>
                    <option value="kg">kg (kilogram)</option>
                    <option value="gram">gram (gr)</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml (mililiter)</option>
                    <option value="pack">pack</option>
                    <option value="pcs">pcs</option>
                    <option value="lembar">lembar</option>
                    <option value="butir">butir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Batas Minimum Stok</label>
                  <input
                    type="number"
                    value={inventoryForm.min_stock}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, min_stock: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Stok Awal Sekarang</label>
                <input
                  type="number"
                  value={inventoryForm.current_stock}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, current_stock: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[48px]"
              >
                {isEditingInventory ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isEditingInventory ? "Perbarui Bahan" : "Daftarkan Bahan Baku"}</span>
              </button>
            </form>
          </div>

          {/* Inventory Items List */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3">
              Master Bahan Baku ({inventoryItems.length})
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {inventoryItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-gray-800">{item.name}</h4>
                    <p className="text-[10px] text-gray-500">
                      Stok: <span className="font-bold text-gray-700">{item.current_stock} {item.unit}</span> (Min: {item.min_stock} {item.unit})
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingInventory(true);
                        setInventoryForm({
                          id: item.id,
                          name: item.name,
                          unit: item.unit,
                          min_stock: item.min_stock,
                          current_stock: item.current_stock,
                        });
                      }}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteInventory(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HYBRID QRIS CONFIG */}
      {activeTab === "qris" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 max-w-2xl">
          <h2 className="text-base font-extrabold text-gray-800 mb-2 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-rose-500" />
            <span>Pengaturan Mode QRIS Hybrid</span>
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Pilih antara QRIS Statis (manual konfirmasi kasir tanpa potongan) atau QRIS Dinamis (otomatis payment gateway).
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setSettings({ ...settings, qris_mode: "static" })}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all btn-bounce ${
                  settings.qris_mode === "static"
                    ? "bg-rose-50/70 border-rose-400 shadow-sm"
                    : "bg-white border-pink-100 hover:bg-pink-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-gray-800">Mode A: Statis</span>
                    {settings.qris_mode === "static" && (
                      <Check className="w-4 h-4 text-rose-600 stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Kasir menunjukkan barcode toko & konfirmasi manual setelah dicek. Tanpa potongan fee gateway.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSettings({ ...settings, qris_mode: "dynamic" })}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all btn-bounce ${
                  settings.qris_mode === "dynamic"
                    ? "bg-rose-50/70 border-rose-400 shadow-sm"
                    : "bg-white border-pink-100 hover:bg-pink-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-gray-800">Mode B: Dinamis</span>
                    {settings.qris_mode === "dynamic" && (
                      <Check className="w-4 h-4 text-rose-600 stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Membuat QRIS per transaksi melalui payment gateway dengan auto-check verifikasi lunas.
                  </p>
                </div>
              </label>
            </div>

            {/* Static QRIS Settings */}
            {settings.qris_mode === "static" && (
              <div className="p-4 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Upload Foto Barcode QRIS Toko
                  </label>
                  <p className="text-[11px] text-gray-500 mb-3">
                    Pilih gambar QRIS (BCA, LinkAja, GoPay, ShopeePay, dll.) langsung dari galeri atau kamera HP Anda.
                  </p>
                </div>

                {/* Upload Button Box */}
                <label className="border-2 border-dashed border-pink-300 hover:border-rose-400 bg-white rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-pink-50/40 group text-center">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-rose-600">
                    Pilih File Foto QRIS (PNG / JPG / JPEG)
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Maksimal 3MB &bull; Langsung tersimpan
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Preview QRIS Image */}
                {settings.qris_static_image_url ? (
                  <div className="p-3 bg-white rounded-2xl border border-pink-200 text-center">
                    <p className="text-[11px] font-bold text-gray-700 mb-2">Pratinjau Barcode QRIS Aktif:</p>
                    <div className="w-44 h-44 mx-auto bg-pink-50/50 p-2 rounded-xl border border-pink-100 flex items-center justify-center mb-2">
                      <img
                        src={settings.qris_static_image_url}
                        alt="Preview QRIS"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, qris_static_image_url: "" }))}
                      className="px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Hapus Foto QRIS
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-700 font-medium">
                    ⚠️ Belum ada foto barcode QRIS yang diunggah. Silakan upload gambar barcode kios Anda.
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Gateway Settings */}
            {settings.qris_mode === "dynamic" && (
              <div className="p-4 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-3">
                <p className="text-xs font-bold text-gray-800">Konfigurasi Gateway Dinamis</p>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Provider Gateway
                  </label>
                  <select className="w-full px-3 py-2 text-xs bg-white border border-pink-200 rounded-xl">
                    <option value="midtrans">Midtrans Snap QRIS</option>
                    <option value="tripay">Tripay Closed Payment</option>
                    <option value="xendit">Xendit QR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Server Key / API Key
                  </label>
                  <input
                    type="password"
                    placeholder="SB-Mid-server-xxxxxxxxxxxx"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-pink-200 rounded-xl"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 btn-bounce min-h-[48px]"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi QRIS</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
