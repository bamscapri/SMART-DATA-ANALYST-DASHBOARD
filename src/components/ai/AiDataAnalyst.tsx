import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateUniqueId } from '../../utils/idGenerator';
import { executeDeterministicQuery } from '../../utils/intelligenceEngine';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Table2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intentSummary?: string;
  evidenceTable?: Record<string, any>[];
}

export const AiDataAnalyst: React.FC = () => {
  const { selectedDataset, currentStats, intelligenceReport, logActivity, addToast } = useApp();

  const buildWelcomeMessage = (): ChatMessage => ({
    id: generateUniqueId('init'),
    role: 'assistant',
    content: `Halo! Saya adalah **Smart AI Data Analyst** terintegrasi dengan **Deterministic Analytical Engine** & Google Gemini.

Saya telah memprofilkan dataset aktif **${selectedDataset?.name || 'Dataset'}** (${selectedDataset?.data?.length || 0} baris, ${currentStats.colCount} kolom, Data Quality Score: **${intelligenceReport.profile.quality.overallScore}/100**, Mode: **${intelligenceReport.analysisMode === 'document' ? 'Document Intelligence' : 'Structured Analytics'}**).

Silakan ajukan pertanyaan analisis bisnis dalam Bahasa Indonesia — setiap jawaban memadukan kalkulasi aktual di browser agar angka akurat dan bebas halusinasi.`,
    timestamp: new Date().toISOString(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage()]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([buildWelcomeMessage()]);
  }, [selectedDataset?.id]);

  const suggestedQuestions =
    intelligenceReport.analysisMode === 'document'
      ? [
          'Apa ringkasan poin dan temuan terpenting dari dokumen ini?',
          'Bagian atau tabel mana yang paling krusial dalam dokumen ini?',
          'Rekomendasi tindakan apa yang perlu segera ditindaklanjuti?',
        ]
      : [
          'Apa kesimpulan dan temuan paling krusial dari data ini?',
          `Bagaimana perbandingan ${currentStats.numericCols[0] || 'metrik'} per ${currentStats.categoricalCols[0] || 'kategori'}?`,
          'Apakah terdapat anomali atau outliers yang berisiko pada data?',
          'Variabel apa yang memiliki korelasi terkuat dan apa implikasinya?',
          'Bagaimana rekomendasi keputusan strategis berdasarkan hasil evaluasi?',
        ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateUniqueId('msg-user'),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    const deterministicCtx = executeDeterministicQuery(
      text,
      selectedDataset,
      intelligenceReport
    );

    const intelligenceSummary = {
      analysisMode: intelligenceReport.analysisMode,
      dataPeriod: intelligenceReport.dataPeriod,
      qualityScore: intelligenceReport.profile.quality,
      topCorrelations: intelligenceReport.eda.topCorrelations.slice(0, 5),
      inferentialTests: intelligenceReport.statistics.inferentialTests
        .filter(t => t.executed)
        .map(t => ({
          testName: t.testName,
          variables: t.variables,
          statistic: `${t.statisticName}=${t.statisticValue}`,
          pValue: t.pValue,
          significantAt05: t.significantAt05,
        })),
      regression: intelligenceReport.mining.regression.executed
        ? intelligenceReport.mining.regression
        : null,
      anomaliesCount: intelligenceReport.mining.anomalies.length,
      forecastingAvailable: intelligenceReport.forecasting.available,
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: selectedDataset?.name,
          schema: currentStats.columns,
          stats: currentStats,
          sampleData: selectedDataset?.data?.slice(0, 15) || [],
          query: text,
          history: messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
          computedFacts: deterministicCtx.computedFactsMarkdown,
          intelligenceSummary,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: generateUniqueId('ai-resp'),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        intentSummary: deterministicCtx.intentSummary,
        evidenceTable: deterministicCtx.evidenceTable,
      };

      setMessages(prev => [...prev, assistantMessage]);
      logActivity(
        'AI_ANALYSIS',
        'AI Analyst',
        selectedDataset?.name || 'Dataset',
        `Query: "${text.slice(0, 40)}..."`
      );
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: generateUniqueId('ai-det-fallback'),
          role: 'assistant',
          content: `### Hasil Analisis Deterministik (${selectedDataset?.name || 'Dataset'})\n\n${deterministicCtx.computedFactsMarkdown}\n\n_(Catatan: Koneksi AI server sedang fallback (${err.message}); angka di atas dihitung langsung dari data aktual.)_`,
          timestamp: new Date().toISOString(),
          intentSummary: deterministicCtx.intentSummary,
          evidenceTable: deterministicCtx.evidenceTable,
        },
      ]);
      addToast('warning', 'Mode Fallback Deterministik', 'Menampilkan hasil kalkulasi lokal terverifikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast('info', 'Disalin ke Clipboard');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <BotMessageSquare className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
            <span className="truncate">AI Data Analyst & Conversational Intelligence</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Tanya jawab data interaktif dengan Deterministic Query Engine + Google Gemini API bebas halusinasi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-[var(--color-primary)] font-semibold hidden sm:inline truncate max-w-[180px]">
            {selectedDataset?.name}
          </span>
          <button
            type="button"
            onClick={() => setMessages([buildWelcomeMessage()])}
            className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] transition-theme cursor-pointer"
            title="Reset Percakapan"
            aria-label="Reset Percakapan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Buttons */}
      <div className="py-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
          <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
          <span>Contoh Pertanyaan:</span>
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleSend(q)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-caramel)] hover:bg-[var(--bg-caramel-soft)] text-[11px] text-[var(--text-main)] transition-theme text-left cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={`${msg.id}-${idx}`}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--accent-caramel)] flex items-center justify-center text-[var(--text-on-primary)] shrink-0 shadow-xs mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed transition-theme ${
                  isUser
                    ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-xs rounded-tr-sm font-medium'
                    : 'surface-card text-[var(--text-main)] rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans space-y-2">{msg.content}</div>

                {/* Compact Evidence Table */}
                {!isUser && msg.evidenceTable && msg.evidenceTable.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                      <Table2 className="w-3.5 h-3.5" />
                      <span>Bukti Agregasi Terhitung ({msg.intentSummary})</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                          <tr>
                            {Object.keys(msg.evidenceTable[0]).map(col => (
                              <th key={col} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {msg.evidenceTable.map((r, rIdx) => (
                            <tr key={rIdx}>
                              {Object.keys(msg.evidenceTable![0]).map(col => (
                                <td key={col} className="px-2.5 py-1.5 tabular-nums whitespace-nowrap">
                                  {typeof r[col] === 'number'
                                    ? Number(r[col]).toLocaleString('id-ID')
                                    : String(r[col] ?? '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-center justify-between pt-2 mt-2 border-t text-[10px] ${
                    isUser
                      ? 'border-[var(--text-on-primary)]/20 text-[var(--text-on-primary)]/80'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="tabular-nums">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--color-primary)] transition-theme cursor-pointer"
                      title="Salin jawaban"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === msg.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--accent-caramel)] flex items-center justify-center text-[var(--color-primary)] shrink-0 mt-1">
                  <span className="font-bold text-xs">U</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-[var(--color-primary)]">
            <div
              className="w-8 h-8 rounded-lg border border-[var(--accent-caramel)] flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
            >
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
            </div>
            <div className="surface-card p-3.5 rounded-2xl text-[var(--text-secondary)] flex items-center gap-2">
              <span>Menghitung bukti empiris & menyusun evaluasi AI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="pt-3 border-t border-[var(--border-color)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-1.5 focus-within:border-[var(--accent-caramel)] transition-theme shadow-xs"
        >
          <input
            type="text"
            aria-label="Pertanyaan untuk AI Data Analyst"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            placeholder="Tanyakan analisis apa pun tentang dataset ini (misal: 'Berapa rata-rata nilai dan di mana risikonya?')..."
            className="flex-1 bg-transparent px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-secondary)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            aria-label="Kirim Pertanyaan"
            className="p-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 text-[var(--text-on-primary)] font-bold transition-theme flex items-center justify-center shadow-2xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
