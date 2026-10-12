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
  Camera
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Product, ProductAddon, InventoryItem, StoreSettings, CashierUser } from "@/types";
import { formatRupiah } from "@/lib/utils";

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

  // UBAH PIN KASIR
  const handleUpdateCashierPin = (id: string) => {
    const target = cashierUsers.find((c) => c.id === id);
    if (!target) return;
    const pinBaru = prompt(`Masukkan PIN baru untuk kasir ${target.name}:`, target.pin);
    if (pinBaru && pinBaru.trim()) {
      const updated = cashierUsers.map((c) =>
        c.id === id ? { ...c, pin: pinBaru.trim() } : c
      );
      setCashierUsers(updated);
      localStorage.setItem("la_cashier_users", JSON.stringify(updated));
      showNotification(`PIN ${target.name} berhasil diubah! 🌸`);
    }
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
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" />
                <span>Manajemen Akun Staf Kasir ({cashierUsers.length})</span>
              </h2>
              <p className="text-xs text-gray-500">
                Atur nama staf kasir dan PIN masing-masing untuk login shift di layar depan.
              </p>
            </div>

            {/* Form Tambah Kasir */}
            <form onSubmit={handleAddCashierUser} className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Staf / Kasir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Siti Rahma"
                    value={newCashierName}
                    onChange={(e) => setNewCashierName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-pink-200 rounded-xl font-semibold focus:ring-2 focus:ring-rose-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">PIN Kasir (4 Digit)</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="1234"
                    value={newCashierPin}
                    onChange={(e) => setNewCashierPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-pink-200 rounded-xl font-bold tracking-widest text-center focus:ring-2 focus:ring-rose-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all btn-bounce flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Daftarkan Kasir Baru</span>
              </button>
            </form>

            {/* List Kasir */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {cashierUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3 bg-pink-50/30 rounded-2xl border border-pink-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-sm border border-pink-100">
                      👤
                    </span>
                    <div>
                      <h4 className="font-bold text-gray-800">{user.name}</h4>
                      <p className="text-[10px] text-gray-500">
                        PIN: <span className="font-mono font-bold tracking-widest">••••</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateCashierPin(user.id)}
                      className="px-2.5 py-1.5 bg-white text-gray-700 border border-pink-200 hover:bg-pink-50 rounded-xl text-[11px] font-bold transition-colors"
                    >
                      Ganti PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCashierUser(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                      title="Hapus Kasir"
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
