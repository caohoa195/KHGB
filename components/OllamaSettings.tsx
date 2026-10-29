import React, { useState, useEffect } from 'react';
import { AiConfig, OLLAMA_MODEL_PRESETS } from '../types';
import { testOllamaConnection, OllamaConnectionResult } from '../services/ollamaService';
import { 
  Server, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Terminal, 
  Copy, 
  Check, 
  HardDrive,
  Cpu,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  aiConfig: AiConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AiConfig>>;
}

const OllamaSettings: React.FC<Props> = ({ aiConfig, setAiConfig }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<OllamaConnectionResult | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);

  const activeProvider = aiConfig.provider;
  const ollama = aiConfig.ollama;

  const handleProviderChange = (provider: 'gemini' | 'ollama') => {
    setAiConfig(prev => ({
      ...prev,
      provider
    }));
  };

  const handleModelSelect = (modelTag: string) => {
    setAiConfig(prev => ({
      ...prev,
      ollama: {
        ...prev.ollama,
        selectedModel: modelTag
      }
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testOllamaConnection(ollama.baseUrl, ollama.connectionMode);
      setTestResult(res);
      if (res.ok && res.models) {
        setDetectedModels(res.models);
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err.message || 'Lỗi không xác định khi kết nối Ollama'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test on mount if Ollama is selected
  useEffect(() => {
    if (activeProvider === 'ollama') {
      handleTestConnection();
    }
  }, [ollama.baseUrl, ollama.connectionMode, activeProvider]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const currentModelName = () => {
    const preset = OLLAMA_MODEL_PRESETS.find(p => p.tag === ollama.selectedModel);
    if (preset) return preset.name;
    if (ollama.selectedModel === 'custom') return ollama.customModel || 'Model tùy chỉnh';
    return ollama.selectedModel;
  };

  const activePullCommand = `ollama run ${ollama.selectedModel === 'custom' ? (ollama.customModel || 'qwen2.5-coder:7b') : ollama.selectedModel}`;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all">
      {/* Header Tabs: Cloud (Gemini) vs Local (Ollama) */}
      <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-blue-50/40">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            Động cơ AI phân tích & tạo bài giảng
          </label>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeProvider === 'ollama' 
              ? 'bg-purple-100 text-purple-800 border border-purple-300' 
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {activeProvider === 'ollama' ? 'CỤC BỘ (OLLAMA)' : 'ĐÁM MÂY (GEMINI)'}
          </span>
        </div>

        {/* Engine Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleProviderChange('gemini')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeProvider === 'gemini'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Google Gemini Flash</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('ollama')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeProvider === 'ollama'
                ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Server className="w-4 h-4 text-purple-600" />
            <span>Chạy Cục Bộ (Ollama)</span>
          </button>
        </div>
      </div>

      {/* Ollama Configuration Panel */}
      {activeProvider === 'ollama' ? (
        <div className="p-4 sm:p-5 space-y-5 bg-purple-50/20">
          
          {/* 1. MODEL SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                Chọn Mô Hình Ollama Sư Phạm
              </span>
              <span className="text-[11px] text-purple-700 font-semibold bg-purple-100 px-2 py-0.5 rounded">
                Đang chọn: {currentModelName()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OLLAMA_MODEL_PRESETS.map((preset) => {
                const isSelected = ollama.selectedModel === preset.tag;
                const isPulled = detectedModels.some(m => m.toLowerCase().includes(preset.tag.toLowerCase()) || preset.aliases.some(a => m.toLowerCase().includes(a.toLowerCase())));

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleModelSelect(preset.tag)}
                    className={`text-left p-3 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        {preset.name}
                        {isPulled && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đã có sẵn trên máy" />
                        )}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {preset.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-1.5">
                      {preset.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px]">
                      <code className="text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded font-mono">
                        {preset.tag}
                      </code>
                      <span className="text-gray-400 text-[10px]">
                        {preset.specs.split('•')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Model Option */}
            <div className="mt-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleModelSelect('custom')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                    ollama.selectedModel === 'custom'
                      ? 'border-purple-600 bg-purple-100 text-purple-900 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Nhập tên model khác (Custom Tag)
                </button>

                {detectedModels.length > 0 && (
                  <div className="flex-1 flex items-center gap-1 text-[11px] text-gray-500 overflow-x-auto py-1">
                    <span className="text-[10px] text-gray-400 shrink-0">Đã cài trên máy:</span>
                    {detectedModels.slice(0, 4).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setAiConfig(prev => ({
                            ...prev,
                            ollama: {
                              ...prev.ollama,
                              selectedModel: m
                            }
                          }));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border shrink-0 transition-all ${
                          ollama.selectedModel === m
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white hover:bg-purple-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {ollama.selectedModel === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={ollama.customModel}
                    onChange={(e) => setAiConfig(prev => ({
                      ...prev,
                      ollama: {
                        ...prev.ollama,
                        customModel: e.target.value
                      }
                    }))}
                    placeholder="Ví dụ: qwen2.5:14b, deepseek-r1:8b, mistral:latest..."
                    className="w-full text-xs p-2 rounded-lg border border-purple-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. CONNECTION STATUS & QUICK ACTIONS */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${
                    testResult?.ok ? 'bg-emerald-500 animate-pulse' : testResult === null ? 'bg-amber-400' : 'bg-red-500'
                  }`} />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-gray-800">
                    {testResult?.ok 
                      ? `Đã kết nối Ollama ${testResult.version || ''}`
                      : isTesting 
                        ? 'Đang kiểm tra kết nối...' 
                        : testResult 
                          ? 'Chưa kết nối được với Ollama' 
                          : 'Sẵn sàng kiểm tra kết nối'}
                  </span>
                  {testResult?.ok && testResult.models && (
                    <span className="text-gray-500 text-[11px] ml-1.5">
                      ({testResult.models.length} model khả dụng)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all self-end sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-purple-600' : ''}`} />
                {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </button>
            </div>

            {/* Error or Instruction Alert if offline */}
            {testResult && !testResult.ok && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{testResult.error}</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Hướng dẫn kích hoạt Ollama cục bộ:
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 p-2 rounded border border-amber-200 space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-gray-800">
                    <span>1. Khởi động Ollama (hỗ trợ gọi từ trình duyệt):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('OLLAMA_ORIGINS="*" ollama serve')}
                      className="text-amber-700 hover:text-amber-900 flex items-center gap-1 font-sans text-[10px]"
                    >
                      {copiedCmd === 'OLLAMA_ORIGINS="*" ollama serve' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Sao chép
                    </button>
                  </div>
                  <code className="text-purple-800 block bg-slate-100 p-1.5 rounded">
                    OLLAMA_ORIGINS="*" ollama serve
                  </code>
                  
                  <div className="flex items-center justify-between text-gray-800 pt-1">
                    <span>2. Tải và chạy model đã chọn:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activePullCommand)}
                      className="text-amber-700 hover:text-amber-900 flex items-center gap-1 font-sans text-[10px]"
                    >
                      {copiedCmd === activePullCommand ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Sao chép
                    </button>
                  </div>
                  <code className="text-purple-800 block bg-slate-100 p-1.5 rounded">
                    {activePullCommand}
                  </code>
                </div>

                <div className="text-[11px] text-gray-600 flex items-center gap-1.5 pt-1">
                  <span>Mẹo: Nếu dùng trình duyệt web mà bị chặn CORS, hãy chuyển sang chế độ</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAiConfig(prev => ({
                        ...prev,
                        ollama: { ...prev.ollama, connectionMode: 'proxy' }
                      }));
                    }}
                    className="font-bold text-purple-700 underline"
                  >
                    "Proxy qua Máy chủ"
                  </button>
                </div>
              </div>
            )}

            {/* Quick copy command for the currently selected model */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-gray-600 text-[11px]">Lệnh tải model vào máy:</span>
                <code className="font-mono text-purple-900 font-bold bg-white px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                  {activePullCommand}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activePullCommand)}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-purple-200 shadow-2xs shrink-0"
              >
                {copiedCmd === activePullCommand ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép lệnh</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. ADVANCED CONNECTION SETTINGS (COLLAPSIBLE) */}
          <div className="border-t pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 font-medium py-1"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              <span>Cấu hình kết nối & thông số mở rộng</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-white rounded-xl border border-gray-200 space-y-3.5 text-xs">
                {/* Host URL */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Địa chỉ máy chủ Ollama (Host URL):
                  </label>
                  <input
                    type="text"
                    value={ollama.baseUrl}
                    onChange={(e) => setAiConfig(prev => ({
                      ...prev,
                      ollama: { ...prev.ollama, baseUrl: e.target.value }
                    }))}
                    placeholder="http://localhost:11434"
                    className="w-full p-2 border rounded-lg font-mono text-xs focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Mặc định là <code>http://localhost:11434</code> hoặc IP máy chủ LAN/VPS của bạn.
                  </p>
                </div>

                {/* Connection Mode */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Phương thức truyền tải:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiConfig(prev => ({
                        ...prev,
                        ollama: { ...prev.ollama, connectionMode: 'direct' }
                      }))}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        ollama.connectionMode === 'direct'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="block font-semibold">Trực tiếp từ Trình duyệt</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        Gọi thẳng Ollama trên máy tính của bạn (cần CORS)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiConfig(prev => ({
                        ...prev,
                        ollama: { ...prev.ollama, connectionMode: 'proxy' }
                      }))}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        ollama.connectionMode === 'proxy'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="block font-semibold">Proxy qua Máy chủ</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        Chuyển tiếp qua backend Node.js (tránh lỗi CORS)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Context Size and Temperature */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Kích thước ngữ cảnh (Context):
                    </label>
                    <select
                      value={ollama.numCtx || 16384}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        ollama: { ...prev.ollama, numCtx: parseInt(e.target.value) || 16384 }
                      }))}
                      className="w-full p-2 border rounded-lg text-xs"
                    >
                      <option value="8192">8,192 tokens (Tài liệu vừa)</option>
                      <option value="16384">16,384 tokens (Đề xuất chuẩn bài giảng)</option>
                      <option value="32768">32,768 tokens (Tài liệu rất dài)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Nhiệt độ (Temperature: {ollama.temperature ?? 0.15}):
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.7"
                      step="0.05"
                      value={ollama.temperature ?? 0.15}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        ollama: { ...prev.ollama, temperature: parseFloat(e.target.value) }
                      }))}
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>0.0 (Chính xác)</span>
                      <span>0.7 (Sáng tạo)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Gemini info banner when Cloud is active */
        <div className="p-3.5 bg-blue-50/50 text-xs text-blue-900 border-t border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Đang dùng <strong>Google Gemini 3.8 Flash</strong> qua Cloud API (Tự động chuyển đổi dự phòng 3.1 Flash-Lite).
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleProviderChange('ollama')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 underline shrink-0 ml-2"
          >
            Đổi sang Ollama
          </button>
        </div>
      )}
    </div>
  );
};

export default OllamaSettings;
