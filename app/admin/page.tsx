"use client";

import React, { useEffect, useState } from "react";
import { 
  Lock, 
  Unlock, 
  Store, 
  ShoppingBag, 
  Plus, 
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
  ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Product, ProductAddon, InventoryItem, StoreSettings, CashierUser, Transaction, CashierActivityLog } from "@/types";
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
  // Product Form
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    category: "Ayam",
    price: 0,
    is_available: true,
    icon_or_image_url: "🍗",
  });
  const [isEditingProduct, setIsEditingProduct] = useState(false);

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

      // 2. Products
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: true });
      if (pData) setProducts(pData);

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

  // UPLOAD FOTO QRIS
  const handleQrisFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showNotification("Ukuran foto maksimal 3MB!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setSettings((prev) => ({ ...prev, qris_static_image_url: base64 }));
      showNotification("Foto barcode QRIS berhasil dipilih! Klik Simpan di bawah untuk mengaktifkan.");
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
      setPinError("PIN salah! Masukkan PIN yang benar (default: 1234)");
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
      showNotification("Pengaturan profil berhasil disimpan! 🌸");
      setNewPin("");
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan pengaturan", "error");
    }
  };

  // 2. PRODUCT CRUD
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    try {
      if (isEditingProduct && productForm.id) {
        const { error } = await supabase
          .from("products")
          .update({
            name: productForm.name,
            category: productForm.category,
            price: Number(productForm.price),
            is_available: productForm.is_available,
            icon_or_image_url: productForm.icon_or_image_url,
          })
          .eq("id", productForm.id);

        if (error) throw error;
        showNotification("Menu berhasil diperbarui!");
      } else {
        const { error } = await supabase.from("products").insert({
          name: productForm.name,
          category: productForm.category,
          price: Number(productForm.price),
          is_available: productForm.is_available,
          icon_or_image_url: productForm.icon_or_image_url,
        });

        if (error) throw error;
        showNotification("Menu baru berhasil ditambahkan! 🍗");
      }

      setProductForm({
        id: "",
        name: "",
        category: "Ayam",
        price: 0,
        is_available: true,
        icon_or_image_url: "🍗",
      });
      setIsEditingProduct(false);
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan menu", "error");
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
      if (isEditingAddon && addonForm.id) {
        const { error } = await supabase
          .from("product_addons")
          .update({
            name: addonForm.name,
            price: Number(addonForm.price),
          })
          .eq("id", addonForm.id);

        if (error) throw error;
        showNotification("Varian saus diperbarui!");
      } else {
        const { error } = await supabase.from("product_addons").insert({
          name: addonForm.name,
          price: Number(addonForm.price),
        });

        if (error) throw error;
        showNotification("Varian saus baru ditambahkan!");
      }

      setAddonForm({ id: "", name: "", price: 0 });
      setIsEditingAddon(false);
      fetchAllData();
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan varian", "error");
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
          Masukkan PIN keamanan untuk mengakses pengaturan harga, menu, & toko (Default: 1234).
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
                  placeholder="Ketik PIN saat ini (default: 1234)"
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
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center justify-between">
              <span>{isEditingProduct ? "Edit Menu Produk" : "Tambah Menu Baru"}</span>
              {isEditingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProduct(false);
                    setProductForm({
                      id: "",
                      name: "",
                      category: "Ayam",
                      price: 0,
                      is_available: true,
                      icon_or_image_url: "🍗",
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
                  placeholder="Contoh: Dada Krispi Pedas"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:ring-2 focus:ring-rose-400"
                  >
                    <option value="Ayam">Ayam</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Paket">Paket</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ikon / Emoji</label>
                  <input
                    type="text"
                    value={productForm.icon_or_image_url || "🍗"}
                    onChange={(e) => setProductForm({ ...productForm, icon_or_image_url: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  value={productForm.price || ""}
                  onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl font-bold text-rose-600 focus:ring-2 focus:ring-rose-400"
                  required
                />
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
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-white rounded-xl shadow-xs">
                      {p.icon_or_image_url || "🍗"}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-gray-800">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-pink-100">
                          {p.category}
                        </span>
                        <span className="text-xs font-black text-rose-600">
                          {formatRupiah(p.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                      onClick={() => {
                        setIsEditingProduct(true);
                        setProductForm({
                          id: p.id,
                          name: p.name,
                          category: p.category,
                          price: p.price,
                          is_available: p.is_available,
                          icon_or_image_url: p.icon_or_image_url || "🍗",
                        });
                      }}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors"
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
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 shadow-sm border border-pink-100">
            <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center justify-between">
              <span>{isEditingAddon ? "Edit Saus Pelengkap" : "Tambah Saus / Pelengkap"}</span>
              {isEditingAddon && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAddon(false);
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
                  className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-gray-800">{a.name}</h4>
                    <span className="text-xs font-black text-rose-600">
                      +{formatRupiah(a.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAddon(true);
                        setAddonForm({ id: a.id, name: a.name, price: a.price });
                      }}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors"
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
                    className="w-full px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl"
                  >
                    <option value="potong">potong</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="pack">pack</option>
                    <option value="pcs">pcs</option>
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
