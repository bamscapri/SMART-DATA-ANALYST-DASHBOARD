import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateUniqueId } from '../../utils/idGenerator';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiDataAnalyst: React.FC = () => {
  const { selectedDataset, currentStats, logActivity, addToast } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Halo! Saya adalah **Smart AI Data Analyst** berbasis Google Gemini.

Saya telah menganalisis dataset aktif **${selectedDataset?.name || 'Dataset'}** (${selectedDataset?.data?.length || 0} baris, ${currentStats.colCount} kolom).

Silakan ajukan pertanyaan analisis bisnis dalam Bahasa Indonesia mengenai performa metrik, korelasi, perbandingan wilayah/kategori, deteksi anomali, atau rekomendasi keputusan berbasis data aktual.`,
      timestamp: new Date().toISOString()
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Apa kesimpulan dan temuan paling krusial dari data ini?',
    'Berapa total penjualan dan produk mana dengan performa terbaik?',
    'Wilayah atau kategori mana yang menghasilkan kontribusi margin tertinggi?',
    'Apakah terdapat anomali atau outliers yang berisiko pada data?',
    'Bagaimana rekomendasi keputusan strategis untuk meningkatkan revenue?'
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
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Call server-side Gemini API
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: selectedDataset?.name,
          schema: currentStats.columns,
          stats: currentStats,
          sampleData: selectedDataset?.data?.slice(0, 20) || [],
          query: text,
          history: messages.slice(-4)
        })
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
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      logActivity('AI_ANALYSIS', 'AI Analyst', selectedDataset?.name || 'Dataset', `Query: "${text.slice(0, 40)}..."`);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'AI Analyst Terkendala', err.message || 'Gagal memproses respon.');
      setMessages(prev => [
        ...prev,
        {
          id: generateUniqueId('ai-err'),
          role: 'assistant',
          content: `⚠️ **Gagal memproses kueri:** ${err.message}\n\nPastikan konfigurasi API Key Gemini aktif di environment server (Settings > Secrets).`,
          timestamp: new Date().toISOString()
        }
      ]);
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BotMessageSquare className="w-5 h-5 text-cyan-400" />
            AI Data Analyst & Conversational Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tanya jawab data interaktif dengan Google Gemini API (model `gemini-3.8-flash`). Bebas halusinasi & berbasis data aktual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Active: {selectedDataset?.name.slice(0, 20)}...
          </span>
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Reset Percakapan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 flex-shrink-0">
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          Quick Prompt:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSend(q)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/30 text-[11px] text-slate-300 transition text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={`${msg.id}-${idx}`}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-cyan-500/20 mt-1">
                  <Sparkles className="w-4 h-4 text-cyan-100" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed transition ${
                  isUser
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-700/20 rounded-tr-sm font-medium'
                    : 'bg-slate-900/95 border border-slate-800 text-slate-200 rounded-tl-sm shadow-xl'
                }`}
              >
                {/* AI Markdown Formatted Body */}
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.content}
                </div>

                {/* Footer timestamp & copy */}
                <div
                  className={`flex items-center justify-between pt-2 mt-2 border-t text-[10px] ${
                    isUser ? 'border-cyan-500/40 text-cyan-100' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isUser && (
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition"
                      title="Salin jawaban"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === msg.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1">
                  <span className="font-bold text-xs">U</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-cyan-400">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            </div>
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Menganalisis dataset aktual & menyusun evaluasi...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="pt-3 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-xl p-1.5 focus-within:border-cyan-500 transition shadow-xl"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            placeholder="Tanyakan analisis apa pun tentang dataset ini (misal: 'Berapa rata-rata margin dan di mana resikonya?')..."
            className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition flex items-center justify-center shadow-md shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
