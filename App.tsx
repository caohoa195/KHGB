import React, { useState } from 'react';
import { LessonMetadata, GeneratedContent, CustomGeneratedPlan, AiConfig, OLLAMA_MODEL_PRESETS } from './types';
import { generateLessonPlan, generatePlanFromCustomTemplate } from './services/geminiService';
import InputForm from './components/InputForm';
import LessonPreview from './components/LessonPreview';
import CustomTemplatePreview from './components/CustomTemplatePreview';
import { AlertTriangle, RefreshCw, FileText, Layers, BookmarkCheck, FileSpreadsheet, Server, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // 1. All keyboard-entered metadata as before
  const [metadata, setMetadata] = useState<LessonMetadata>({
    university: 'TRƯỜNG ĐẠI HỌC KHÁNH HÒA',
    faculty: 'KHOA SƯ PHẠM',
    courseName: '',
    lessonName: 'Bài (Chuyên đề): ',
    targetAudience: '',
    schoolYear: '2024 - 2025',
    lecturerName: '',
    approverName: '',
    approverRole: 'CHỦ NHIỆM BỘ MÔN',
    approvalDate: 'Ngày ... tháng ... năm ...',
    location: 'Khánh Hòa',
    totalPeriods: 2,
    composerDate: '', 
    coverPlaceDate: '', 
  });

  // 2. Source Material
  const [sourceMaterial, setSourceMaterial] = useState<string>('');

  // 3. Template Selection & Custom Template (PDF / Word)
  const [templateMode, setTemplateMode] = useState<'default' | 'custom'>('default');
  const [templateText, setTemplateText] = useState<string>('');
  const [templateFileName, setTemplateFileName] = useState<string>('');

  // 4. AI Engine & Ollama Configuration
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    provider: 'gemini',
    ollama: {
      baseUrl: 'http://localhost:11434',
      selectedModel: 'qwen3.6:35b-a3b-q4',
      customModel: '',
      connectionMode: 'direct',
      temperature: 0.15,
      numCtx: 16384,
    }
  });

  // 5. Generated States
  const [standardContent, setStandardContent] = useState<GeneratedContent | null>(null);
  const [customPlan, setCustomPlan] = useState<CustomGeneratedPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getActiveModelName = () => {
    if (aiConfig.provider === 'gemini') return 'GEMINI 3.8 FLASH';
    const preset = OLLAMA_MODEL_PRESETS.find(p => p.tag === aiConfig.ollama.selectedModel);
    if (preset) return `OLLAMA: ${preset.name}`;
    if (aiConfig.ollama.selectedModel === 'custom') {
      return `OLLAMA: ${aiConfig.ollama.customModel || 'CUSTOM'}`;
    }
    return `OLLAMA: ${aiConfig.ollama.selectedModel}`;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (templateMode === 'custom') {
        if (!templateText.trim()) {
          throw new Error("Vui lòng tải lên tệp mẫu Word hoặc PDF trước khi bấm tạo.");
        }
        const plan = await generatePlanFromCustomTemplate(
          templateText,
          sourceMaterial,
          metadata,
          undefined,
          aiConfig
        );
        setCustomPlan(plan);
      } else {
        const content = await generateLessonPlan(metadata, sourceMaterial, aiConfig);
        setStandardContent(content);
      }
    } catch (err: any) {
      console.error("App Error:", err);
      if (err.message === "API_KEY_NOT_FOUND") {
        setError("Chưa tìm thấy cấu hình API Key trên máy chủ. Bạn cũng có thể chuyển sang chế độ 'Chạy Cục Bộ (Ollama)' để tạo bài giảng mà không cần API Key.");
      } else if (err.message === "RATE_LIMIT_EXCEEDED" || err.message?.includes("RATE_LIMIT")) {
        setError("Đã đạt giới hạn lượt yêu cầu của gói miễn phí (Rate Limit). Vui lòng đợi 1 - 2 phút và bấm thử lại, hoặc chuyển sang chạy cục bộ bằng Ollama.");
      } else if (err.message === "DEPLETED_CREDITS") {
        setError("Đã hết hạn ngạch yêu cầu API. Bạn có thể chọn 'Chạy Cục Bộ (Ollama)' với các model Qwen, Gemma để sử dụng không giới hạn trên máy.");
      } else if (err.message === "LỖI_HỆ_THỐNG_DỮ_LIỆU_LỚN") {
        setError("Lỗi đường truyền (Dữ liệu quá lớn). Vui lòng rút ngắn bớt tài liệu nguồn hoặc giảm số tiết.");
      } else {
        setError(err.message || "Có lỗi xảy ra khi tạo bài giảng. Vui lòng kiểm tra lại tài liệu hoặc thử lại sau.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30">
              <FileSpreadsheet className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Xây dựng Bài Giảng</h1>
              <p className="text-xs text-blue-200 mt-0.5">
                Nhập thông tin từ bàn phím, chọn mẫu (chuẩn hoặc tệp PDF/Word), hỗ trợ động cơ Gemini & Ollama cục bộ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiConfig.provider === 'ollama' ? (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 py-1.5 px-3 rounded-full font-mono uppercase tracking-wider border border-purple-400/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                <Server className="w-3 h-3 text-purple-300" />
                {getActiveModelName()}
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 py-1.5 px-3 rounded-full font-mono uppercase tracking-wider border border-emerald-400/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Sparkles className="w-3 h-3 text-emerald-300" />
                GEMINI 3.8 FLASH
              </span>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form with all keyboard inputs + template option + source material */}
          <div className="lg:col-span-5 space-y-6">
            <InputForm 
              metadata={metadata} 
              setMetadata={setMetadata} 
              sourceMaterial={sourceMaterial}
              setSourceMaterial={setSourceMaterial}
              templateMode={templateMode}
              setTemplateMode={setTemplateMode}
              templateText={templateText}
              setTemplateText={setTemplateText}
              templateFileName={templateFileName}
              setTemplateFileName={setTemplateFileName}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
            />

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm" role="alert">
                <p className="font-bold text-sm uppercase flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Thông báo lỗi
                </p>
                <p className="text-sm mt-1 leading-relaxed">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-3 text-xs uppercase font-bold text-red-600 hover:text-red-800 underline"
                >
                  Đã hiểu
                </button>
              </div>
            )}
          </div>
          
          {/* Right Column: Preview of the generated lesson plan */}
          <div className="lg:col-span-7">
            {templateMode === 'custom' && customPlan ? (
              <CustomTemplatePreview 
                plan={customPlan} 
                metadata={metadata}
                onPlanUpdate={setCustomPlan} 
              />
            ) : templateMode === 'default' && standardContent ? (
              <LessonPreview 
                content={standardContent} 
                metadata={metadata} 
              />
            ) : (
              <div className="bg-white h-full min-h-[620px] rounded-xl shadow-md flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200">
                {isGenerating ? (
                  <div className="flex flex-col items-center text-center max-w-sm animate-pulse">
                    <RefreshCw className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                    <p className="text-lg font-bold text-gray-800 mb-1">
                      {templateMode === 'custom' 
                        ? 'Đang giữ khung mẫu và thay thế nội dung...' 
                        : 'Đang phân tích và xây dựng bài giảng...'}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {templateMode === 'custom'
                        ? `Giữ nguyên cấu trúc tệp mẫu (${templateFileName || 'PDF/Word'}), lấp đầy các trường thông tin bàn phím và nội dung từ tài liệu nguồn.`
                        : 'Mô hình đang phân bổ số tiết học, mục tiêu và tiến trình giảng dạy.'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center max-w-md">
                    <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {templateMode === 'custom' ? (
                        <Layers className="w-8 h-8" />
                      ) : (
                        <FileText className="w-8 h-8" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">
                      {templateMode === 'custom' 
                        ? 'Sẵn Sàng Tạo Theo Tệp Mẫu' 
                        : 'Sẵn Sàng Xây Dựng Bài Giảng'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                      {templateMode === 'custom'
                        ? 'Hệ thống giữ nguyên 100% các đề mục và bảng biểu của tệp mẫu bạn tải lên; thay thế các thông tin nhập từ bàn phím và tổng hợp toàn bộ nội dung từ tài liệu nguồn.'
                        : 'Nhập thông tin từ bàn phím và dán/tải tài liệu nguồn để bắt đầu xây dựng bài giảng chuẩn.'}
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border text-xs text-gray-600 text-left space-y-1">
                      <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <BookmarkCheck className="w-4 h-4 text-blue-600" />
                        Quy trình thực hiện:
                      </p>
                      <p>• Nhập các trường thông tin từ bàn phím như thường lệ (Trường, Khoa, Môn học, Tên bài, Giảng viên...).</p>
                      <p>• Chọn mẫu chuẩn hoặc tải tệp mẫu riêng (Word .docx hoặc PDF).</p>
                      <p>• Tải/dán tài liệu nguồn và bấm nút xây dựng.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
