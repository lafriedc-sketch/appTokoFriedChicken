import { NextRequest, NextResponse } from "next/server";
import { AiAdvisorResult, RentSettings, FixedExpenseItem } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      period = "today",
      grossSales = 0,
      totalTransactions = 0,
      totalHpp = 0,
      netProfit = 0,
      marginPercentage = 0,
      rentSettings = {
        monthly_rent: 1500000,
        monthly_electricity: 300000,
        rent_due_day: 25,
        accumulated_fund: 0,
      } as RentSettings,
      activeDaysThisMonth = 1,
      totalFriedAyam = 0,
      totalFriedUsus = 0,
      totalWaste = 0,
      peakHours = "12:00 - 13:30 dan 18:30 - 20:00",
    } = body;

    const now = new Date();
    const currentDay = now.getDate();
    const dueDay = Math.min(31, Math.max(1, Number(rentSettings.rent_due_day) || 25));

    // Hitung total dari dynamic fixed_expenses jika tersedia, atau fallback ke monthly_rent + electricity
    const fixedExpenses: FixedExpenseItem[] = Array.isArray(rentSettings.fixed_expenses) && rentSettings.fixed_expenses.length > 0
      ? rentSettings.fixed_expenses
      : [
          { id: "1", name: "Sewa Toko", amount: Number(rentSettings.monthly_rent) || 1500000 },
          { id: "2", name: "Token Listrik", amount: Number(rentSettings.monthly_electricity) || 300000 },
        ];

    const targetTotal = fixedExpenses.reduce((sum: number, item: FixedExpenseItem) => sum + (Number(item.amount) || 0), 0);
    const targetRent = Number(rentSettings.monthly_rent) || 1500000;
    const targetElectricity = Number(rentSettings.monthly_electricity) || 300000;
    const expenseBreakdownText = fixedExpenses.map((e) => `${e.name}: Rp ${Number(e.amount).toLocaleString("id-ID")}`).join(", ");

    // Hitung sisa hari menuju jatuh tempo
    let daysRemaining = 0;
    if (currentDay <= dueDay) {
      daysRemaining = dueDay - currentDay;
    } else {
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      daysRemaining = daysInCurrentMonth - currentDay + dueDay;
    }

    const accumulatedFund = Number(rentSettings.accumulated_fund) || 0;
    const deficit = Math.max(0, targetTotal - accumulatedFund);

    // Estimasi sisa hari buka (asumsi kios buka ~85% dari total hari tersisa)
    const estimatedOpenDaysLeft = Math.max(1, Math.round(daysRemaining * 0.85));
    const dailyPaceNeeded = daysRemaining > 0 ? Math.ceil(deficit / estimatedOpenDaysLeft) : deficit;

    // Kalkulasi Persentase Rekomendasi Sisihan Hari Ini
    let recPercent = 10;
    if (grossSales > 0 && deficit > 0) {
      const rawPct = (dailyPaceNeeded / grossSales) * 100;
      // Batasi persentase aman kuliner antara 6% - 15% agar cashflow tidak tercekik
      recPercent = Math.min(18, Math.max(6, Math.round(rawPct * 2) / 2));
    } else if (deficit <= 0) {
      recPercent = 0;
    }

    const recAmount = Math.round((grossSales * recPercent) / 100);

    // Uang Aman Dipakai (Laba Bersih dikurangi Sisihan Beban Tetap)
    const safeMoney = Math.max(0, netProfit - recAmount);
    const safeMoneyPercent = grossSales > 0 ? ((safeMoney / grossSales) * 100).toFixed(1) : "0";

    // Health Score
    let healthScore: AiAdvisorResult["healthScore"] = "Sehat";
    if (marginPercentage >= 55) {
      healthScore = "Sangat Sehat";
    } else if (marginPercentage >= 40) {
      healthScore = "Sehat";
    } else if (marginPercentage >= 25) {
      healthScore = "Waspada";
    } else {
      healthScore = "Perlu Perhatian";
    }

    // Status Jatuh Tempo Text
    const dueDateStatusText =
      daysRemaining === 0
        ? "🚨 HARI INI JATUH TEMPO BAYAR SEWA & LISTRIK!"
        : daysRemaining <= 3
        ? `⚠️ Waspada: Jatuh tempo tinggal ${daysRemaining} hari lagi (Tgl ${dueDay})!`
        : `Target jatuh tempo tanggal ${dueDay} (${daysRemaining} hari lagi). Target sewa & listrik ${
            deficit <= 0 ? "SUDAH TERCAPAI 100% 🎉" : `kurang Rp ${deficit.toLocaleString("id-ID")}`
          }`;

    // Cek apakah ada Gemini API Key untuk personalisasi narasi LLM
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    let isAiLive = false;
    let aiHealthSummary = "";
    let aiSinkingExplanation = "";
    let aiSafeMoneyExplanation = "";
    let aiOperationalTip = "";

    if (geminiApiKey) {
      try {
        const promptText = `
Anda adalah CFO & Konsultan Finansial Ahli untuk UMKM Kios "LA Fried Chicken". Berikan analisa cerdas, santai, solutif, to-the-point dalam Bahasa Indonesia berdasarkan data berikut:
- Periode: ${period}
- Omzet: Rp ${grossSales.toLocaleString("id-ID")} (${totalTransactions} transaksi)
- Modal Bahan Baku FIFO (HPP): Rp ${totalHpp.toLocaleString("id-ID")}
- Laba Kotor: Rp ${netProfit.toLocaleString("id-ID")} (Margin: ${marginPercentage}%)
- Target Pengeluaran Rutin & Beban Tetap: Rp ${targetTotal.toLocaleString("id-ID")} (${expenseBreakdownText})
- Jatuh tempo sewa: Tanggal ${dueDay} (${daysRemaining} hari lagi). Kurang dana: Rp ${deficit.toLocaleString("id-ID")}
- Sisihan disarankan: ${recPercent}% (Rp ${recAmount.toLocaleString("id-ID")})
- Uang aman ditarik pemilik: Rp ${safeMoney.toLocaleString("id-ID")}
- Penggorengan: Ayam ${totalFriedAyam} potong, Usus ${totalFriedUsus} porsi, Susut: ${totalWaste} potong. Jam ramai biasanya: ${peakHours}

Balas HANYA dalam format JSON valid tanpa markdown backticks:
{
  "healthSummary": "1-2 kalimat ringkasan kesehatan finansial toko dan margin keuntungan.",
  "sinkingExplanation": "1-2 kalimat penjelasan kenapa persentase sisihan ini aman untuk mengcover beban rutin (${expenseBreakdownText}) menuju tanggal jatuh tempo.",
  "safeMoneyExplanation": "1-2 kalimat motivasi dan kepastian berapa uang yang 100% aman ditarik ke dompet pribadi hari ini setelah beban tertutup.",
  "operationalTip": "1-2 kalimat saran taktis operasional (misal jam mulai goreng batch berikutnya agar ayam/usus selalu hangat di jam ramai dan mencegah susut)."
}
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText.trim());
            aiHealthSummary = parsed.healthSummary || "";
            aiSinkingExplanation = parsed.sinkingExplanation || "";
            aiSafeMoneyExplanation = parsed.safeMoneyExplanation || "";
            aiOperationalTip = parsed.operationalTip || "";
            isAiLive = true;
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini API call failed, using built-in deterministic advisor:", geminiErr);
      }
    }

    // Fallback cerdas berkualitas tinggi jika Gemini API Key belum ada atau offline
    if (!aiHealthSummary) {
      if (marginPercentage >= 50) {
        aiHealthSummary = `Margin keuntungan toko berada di angka ${marginPercentage}%, masuk kategori Sangat Sehat untuk standar bisnis ayam & usus krispi. Arus kas toko berjalan sangat efisien!`;
      } else if (marginPercentage >= 35) {
        aiHealthSummary = `Margin keuntungan toko stabil di angka ${marginPercentage}%. Modal bahan baku dan hasil penjualan berada dalam ritme yang aman.`;
      } else {
        aiHealthSummary = `Margin keuntungan saat ini berada di ${marginPercentage}%. Perhatikan porsi potongan dan pastikan susut wajan penggorengan diminimalkan agar margin kembali ke atas 45%.`;
      }
    }

    if (!aiSinkingExplanation) {
      if (deficit <= 0) {
        aiSinkingExplanation = `Alhamdulillah! Tabungan sewa dan seluruh beban rutin bulanan (${expenseBreakdownText}) sudah lunas terpenuhi 100%. Lu tidak perlu menyisihkan tambahan hari ini.`;
      } else {
        aiSinkingExplanation = `Dengan sisa ${daysRemaining} hari menuju jatuh tempo tanggal ${dueDay}, menyisihkan ${recPercent}% (Rp ${recAmount.toLocaleString("id-ID")}) hari ini akan menjaga target ${fixedExpenses.length} pos beban rutin (${expenseBreakdownText}) tetap aman tercapai tanpa membebani kasir.`;
      }
    }

    if (!aiSafeMoneyExplanation) {
      if (safeMoney > 0) {
        aiSafeMoneyExplanation = `Setelah modal putar belanja besok (Rp ${totalHpp.toLocaleString("id-ID")}) dan tabungan sewa (Rp ${recAmount.toLocaleString("id-ID")}) diamankan, uang sebesar Rp ${safeMoney.toLocaleString("id-ID")} (${safeMoneyPercent}%) adalah murni laba bersih yang 100% AMAN lu tarik ke dompet pribadi!`;
      } else {
        aiSafeMoneyExplanation = `Hari ini omzet sedang sejuk. Utamakan modal belanja bahan esok hari terlebih dahulu agar operasional toko tetap lancar.`;
      }
    }

    if (!aiOperationalTip) {
      aiOperationalTip = `Jam paling ramai pembeli biasanya berada di ${peakHours}. Mulai panaskan wajan dan goreng batch ayam & usus 25 menit sebelum jam tersebut agar etalase selalu hangat dan renyah!`;
    }

    const result: AiAdvisorResult = {
      period,
      healthScore,
      healthSummary: aiHealthSummary,
      grossSales,
      totalHpp,
      netProfit,
      marginPercentage: Number(marginPercentage) || 0,
      recommendedSinkingFund: {
        percentage: recPercent,
        amount: recAmount,
        explanation: aiSinkingExplanation,
      },
      safeMoneyToTake: {
        amount: safeMoney,
        percentage: Number(safeMoneyPercent) || 0,
        explanation: aiSafeMoneyExplanation,
      },
      dueDateStatus: {
        dueDay,
        daysRemaining,
        targetTotal,
        accumulatedFund,
        deficit,
        dailyPaceNeeded,
        statusText: dueDateStatusText,
      },
      operationalTip: aiOperationalTip,
      generatedAt: new Date().toISOString(),
      isAiLive,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("AI Advisor Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

