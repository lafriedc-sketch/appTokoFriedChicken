"use client";

import React, { useState } from "react";
import { X, Printer, Share2, MessageCircle, Copy, Check } from "lucide-react";
import { Transaction, StoreSettings } from "@/types";
import { formatRupiah, formatDateIndo, createWhatsAppReceiptUrl } from "@/lib/utils";

interface ReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  settings: StoreSettings | null;
  onClose: () => void;
}

export default function ReceiptModal({
  isOpen,
  transaction,
  settings,
  onClose,
}: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState("");

  if (!isOpen || !transaction) return null;

  const storeName = settings?.store_name || "LA Fried Chicken";
  const storeAddress = settings?.address || "Kios LA Fried Chicken";
  const storePhone = settings?.whatsapp_number || "081234567890";
  const receiptFooter = settings?.receipt_footer || "Terima kasih! Renyahnya bikin nagih 🍗🌸";

  const handlePrint = () => {
    window.print();
  };

  // Build clean text receipt for WhatsApp
  const generateReceiptText = () => {
    const itemsText = (transaction.items || [])
      .map(
        (it) =>
          `- ${it.product_name} x${it.qty} = ${formatRupiah(it.subtotal)}`
      )
      .join("\n");

    return `🍗 *${storeName}* 🌸\n` +
      `${storeAddress}\n` +
      `Telp/WA: ${storePhone}\n` +
      `--------------------------------\n` +
      `Nota: ${transaction.receipt_no}\n` +
      `Waktu: ${formatDateIndo(transaction.created_at || new Date().toISOString())}\n` +
      `--------------------------------\n` +
      `${itemsText}\n` +
      `--------------------------------\n` +
      `*Total: ${formatRupiah(transaction.total_amount)}*\n` +
      `Metode: ${transaction.payment_method.toUpperCase()}\n` +
      (transaction.payment_method === "cash"
        ? `Tunai Diterima: ${formatRupiah(transaction.cash_received)}\nKembalian: ${formatRupiah(transaction.cash_change)}\n`
        : `Status: LUNAS (QRIS)\n`) +
      `--------------------------------\n` +
      `${receiptFooter}`;
  };

  const handleShareWhatsApp = () => {
    const text = generateReceiptText();
    const url = createWhatsAppReceiptUrl(buyerPhone || storePhone, text);
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReceiptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-pink-100 relative max-h-[90vh] flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 border-b border-pink-100">
          <div className="flex items-center gap-1.5">
            <span className="text-rose-500 font-extrabold text-sm">Pratinjau Struk Kasir</span>
            <span className="text-xs">🧾</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content Card (Styled like 58mm Thermal Slip) */}
        <div className="my-3 flex-1 overflow-y-auto px-1">
          <div
            id="thermal-receipt-container"
            className="bg-pink-50/40 p-4 rounded-2xl border border-pink-200 text-gray-800 font-mono text-xs leading-relaxed shadow-inner"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400 mb-2">
              <p className="font-extrabold text-sm tracking-wider uppercase text-rose-600">
                🍗 {storeName} 🌸
              </p>
              <p className="text-[10px] text-gray-500">{storeAddress}</p>
              <p className="text-[10px] text-gray-500">WA: {storePhone}</p>
            </div>

            {/* Meta */}
            <div className="text-[10px] text-gray-600 mb-2 border-b border-dashed border-gray-400 pb-2">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold text-gray-800">{transaction.receipt_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatDateIndo(transaction.created_at || new Date().toISOString())}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5 py-1 mb-2 border-b border-dashed border-gray-400">
              {(transaction.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex-1 pr-2">
                    <span className="font-semibold text-gray-800">{item.product_name}</span>
                    <span className="text-gray-500 text-[10px] block">
                      {item.qty} x {formatRupiah(item.unit_price)}
                    </span>
                  </div>
                  <span className="font-bold text-gray-800 text-right">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-1 text-[11px] mb-2 pb-2 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-0.5">
                <span>TOTAL:</span>
                <span className="text-rose-600">{formatRupiah(transaction.total_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Metode:</span>
                <span className="uppercase font-semibold">{transaction.payment_method}</span>
              </div>
              {transaction.payment_method === "cash" && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Tunai:</span>
                    <span>{formatRupiah(transaction.cash_received)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(transaction.cash_change)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-1 text-[10px] text-gray-500 italic">
              <p>{receiptFooter}</p>
              <p className="mt-1 text-[9px] text-gray-400 font-sans">*** Kios LA Fried Chicken POS ***</p>
            </div>
          </div>
        </div>

        {/* Share via WhatsApp Target Phone Input */}
        <div className="mb-3">
          <label className="block text-[10px] font-bold text-gray-600 mb-1">
            Kirim Nota ke No. WhatsApp Pembeli (Opsional)
          </label>
          <div className="flex gap-1.5">
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 font-medium"
            />
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 btn-bounce"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WA</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce min-h-[48px]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak 58mm</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-3 bg-white text-gray-700 border border-pink-200 font-bold text-xs rounded-2xl hover:bg-pink-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 btn-bounce min-h-[48px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600">Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-500" />
                <span>Salin Teks</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
