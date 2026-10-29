import React, { ChangeEvent, useState } from 'react';
import { LessonMetadata } from '../types';
import { 
  Upload, 
  FileText, 
  Clock, 
  User, 
  BookOpen, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  FileCode, 
  CheckCircle2, 
  Eye, 
  X,
  FileCheck2,
  BookmarkCheck
} from 'lucide-react';
import { extractTextFromFile } from '../services/fileService';
import { AiConfig, OLLAMA_MODEL_PRESETS } from '../types';
import OllamaSettings from './OllamaSettings';

interface Props {
  metadata: LessonMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<LessonMetadata>>;
  sourceMaterial: string;
  setSourceMaterial: (val: string) => void;
  templateMode: 'default' | 'custom';
  setTemplateMode: (mode: 'default' | 'custom') => void;
  templateText: string;
  setTemplateText: (val: string) => void;
  templateFileName: string;
  setTemplateFileName: (name: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  aiConfig: AiConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AiConfig>>;
}

const InputForm: React.FC<Props> = ({ 
  metadata, 
  setMetadata, 
  sourceMaterial, 
  setSourceMaterial, 
  templateMode,
  setTemplateMode,
  templateText,
  setTemplateText,
  templateFileName,
  setTemplateFileName,
  onGenerate, 
  isGenerating,
  aiConfig,
  setAiConfig
}) => {
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: name === 'totalPeriods' ? parseInt(value) || 0 : value
    }));
  };

  const handleSourceUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setFileError(null);

    try {
      const text = await extractTextFromFile(file);
      setSourceMaterial(text);
      // Auto-populate lessonName if user hasn't typed one
      if (!metadata.lessonName || metadata.lessonName === 'Bài (Chuyên đề): ') {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setMetadata(prev => ({
          ...prev,
          lessonName: `Bài (Chuyên đề): ${cleanName}`
        }));
      }
    } catch (err: any) {
      console.error(err);
      setFileError(err.message || "Lỗi khi đọc tệp tài liệu nguồn.");
    } finally {
      setIsLoadingFile(false);
      e.target.value = '';
    }
  };

  const handleTemplateUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingTemplate(true);
    setFileError(null);

    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 20) {
        throw new Error("Tệp mẫu không có đủ nội dung văn bản. Vui lòng kiểm tra lại.");
      }
      setTemplateText(text);
      setTemplateFileName(file.name);
      setTemplateMode('custom');
    } catch (err: any) {
      console.error(err);
      setFileError(err.message || "Lỗi khi đọc tệp mẫu.");
    } finally {
      setIsLoadingTemplate(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-6">
      
      {/* 1. THÔNG TIN CHUNG */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Thông tin chung
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Nhập các thông tin từ bàn phím như cũ (Trường, Khoa, Môn học, Giảng viên, Bài học...)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Trường Đại Học</label>
          <input 
            type="text" 
            name="university" 
            value={metadata.university} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Khoa / Đơn vị</label>
          <input 
            type="text" 
            name="faculty" 
            value={metadata.faculty} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Học phần / Môn học</label>
          <input 
            type="text" 
            name="courseName" 
            value={metadata.courseName} 
            onChange={handleChange} 
            placeholder="Ví dụ: Vật lý đại cương / Giải tích 1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 text-blue-700 font-bold italic">
            Nguyên văn dòng "Bài (Chuyên đề)"
          </label>
          <textarea 
            name="lessonName" 
            value={metadata.lessonName} 
            onChange={handleChange} 
            rows={2}
            className="mt-1 block w-full rounded-md border-blue-200 bg-blue-50/50 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-medium text-sm" 
            placeholder="Ví dụ: Bài (Chuyên đề): Bài 1. Chuyển động cơ học"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Đối tượng</label>
          <input 
            type="text" 
            name="targetAudience" 
            value={metadata.targetAudience} 
            onChange={handleChange} 
            placeholder="Ví dụ: Sinh viên K46 / Học sinh lớp 11"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Năm học</label>
          <input 
            type="text" 
            name="schoolYear" 
            value={metadata.schoolYear} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Giảng viên / Người biên soạn</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              name="lecturerName" 
              value={metadata.lecturerName} 
              onChange={handleChange} 
              placeholder="Ví dụ: ThS. Nguyễn Văn A"
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
            />
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Tổng số tiết</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="number" 
              name="totalPeriods" 
              value={metadata.totalPeriods} 
              onChange={handleChange} 
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
              min="1" 
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Địa danh, ngày tháng (Trang bìa)</label>
          <input 
            type="text" 
            name="coverPlaceDate" 
            value={metadata.coverPlaceDate} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
            placeholder="Ví dụ: KHÁNH HÒA, THÁNG ... NĂM ..." 
          />
        </div>
      </div>

      {/* 2. THÔNG TIN PHÊ DUYỆT */}
      <div className="border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-green-600" />
          Thông tin Phê Duyệt (Ký tên)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Ngày tháng phê duyệt (Trên chức vụ)</label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                name="approvalDate" 
                value={metadata.approvalDate} 
                onChange={handleChange} 
                placeholder="Ngày ... tháng ... năm ..." 
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Chức vụ người phê duyệt</label>
            <input 
              type="text" 
              name="approverRole" 
              value={metadata.approverRole} 
              onChange={handleChange} 
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ tên người phê duyệt</label>
            <input 
              type="text" 
              name="approverName" 
              value={metadata.approverName} 
              onChange={handleChange} 
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Địa điểm thông qua</label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                name="location" 
                value={metadata.location} 
                onChange={handleChange} 
                className="block w-full rounded-md border-gray-300 pl-10 border p-2 text-sm" 
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Ngày biên soạn (Cuối bài)</label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                name="composerDate" 
                value={metadata.composerDate} 
                onChange={handleChange} 
                placeholder="Ngày ... tháng ... năm ..." 
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHUNG MẪU BÀI GIẢNG / KẾ HOẠCH */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            Khung Mẫu Bài Giảng
          </h2>
          {templateMode === 'custom' && templateText && (
            <button
              type="button"
              onClick={() => setShowTemplatePreview(!showTemplatePreview)}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              {showTemplatePreview ? 'Ẩn xem trước' : 'Xem nội dung mẫu'}
            </button>
          )}
        </div>

        {/* Template Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTemplateMode('default')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              templateMode === 'default'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            Mẫu chuẩn Đại học
          </button>
          <button
            type="button"
            onClick={() => setTemplateMode('custom')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              templateMode === 'custom'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Tải tệp mẫu riêng (Word / PDF)
          </button>
        </div>

        {/* Custom Template Upload Box (when custom mode is selected) */}
        {templateMode === 'custom' && (
          <div className="space-y-3 pt-1">
            <label className={`relative flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              templateText 
                ? 'border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50/70' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}>
              <div className="flex flex-col items-center text-center">
                {isLoadingTemplate ? (
                  <>
                    <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mb-1.5" />
                    <p className="text-xs font-medium text-gray-700">Đang đọc tệp mẫu Word / PDF...</p>
                  </>
                ) : templateText ? (
                  <div className="flex items-center gap-2.5 py-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        {templateFileName || 'Tệp mẫu đã sẵn sàng'}
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Giữ nguyên mẫu</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Đã nạp {templateText.length.toLocaleString('vi-VN')} ký tự • Bấm để đổi tệp mẫu khác
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                    <p className="text-xs font-semibold text-gray-700">Tải tệp mẫu của bạn lên (Word .docx hoặc PDF)</p>
                    <p className="text-[11px] text-gray-400">AI sẽ giữ nguyên 100% các đề mục & bảng biểu của tệp mẫu này</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".docx,.pdf,.txt,.md" 
                onChange={handleTemplateUpload}
                disabled={isLoadingTemplate}
              />
            </label>

            {/* Template Preview Accordion */}
            {showTemplatePreview && templateText && (
              <div className="bg-gray-50 border rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-gray-700">Nội dung khung mẫu đã trích xuất:</span>
                  <button onClick={() => setShowTemplatePreview(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={5}
                  className="w-full font-mono text-[11px] p-2 bg-white border rounded border-gray-300"
                />
              </div>
            )}
          </div>
        )}

        {templateMode === 'default' && (
          <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 leading-relaxed">
            <span className="font-bold">Đang áp dụng:</span> Khung mẫu chuẩn (Trang bìa, Trang phê duyệt, Phần I Ý định giảng bài, Phần II Thực hành bảng 5 cột phân bổ theo tiết, Phần III Kết thúc).
          </div>
        )}
      </div>

      {/* 4. TÀI LIỆU NGUỒN */}
      <div className="border-t pt-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Tài liệu nguồn (Nội dung cần đưa vào mẫu)
        </h2>
        
        {fileError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fileError}</span>
            <button onClick={() => setFileError(null)} className="ml-auto underline font-bold">Đóng</button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-center w-full">
            <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isLoadingFile ? 'bg-gray-100 border-gray-400 cursor-wait' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}>
              <div className="flex flex-col items-center justify-center pt-3 pb-3">
                {isLoadingFile ? (
                  <>
                    <Loader2 className="w-6 h-6 mb-2 text-blue-500 animate-spin" />
                    <p className="text-xs text-gray-500">Đang đọc tài liệu nguồn...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-2 text-gray-500" />
                    <p className="text-xs text-gray-600 font-medium">Nhấn để tải tài liệu bài học lên</p>
                    <p className="text-[11px] text-gray-400">Word (.docx), PDF, hoặc Text</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".txt,.md,.pdf,.docx" 
                onChange={handleSourceUpload}
                disabled={isLoadingFile} 
              />
            </label>
          </div>
          <textarea
            className="w-full h-40 p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs"
            placeholder="Dán nội dung giáo trình, bài giảng thô vào đây để AI phân tích và thay thế vào mẫu..."
            value={sourceMaterial}
            onChange={(e) => setSourceMaterial(e.target.value)}
            disabled={isLoadingFile}
          />
          {sourceMaterial && (
            <p className="text-[11px] text-gray-400 text-right">
              Đã nhập {sourceMaterial.length.toLocaleString('vi-VN')} ký tự
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-1.5 rounded border border-blue-200">
            <span className="font-semibold">Hỗ trợ Equation:</span>
            <span>Tự động định dạng các công thức toán học, khoa học ($...$ hoặc $$...$$) thành công thức trực quan và xuất Word Equation chuẩn.</span>
          </div>
        </div>
      </div>

      {/* 5. CẤU HÌNH ĐỘNG CƠ AI (OLLAMA CỤC BỘ HOẶC GEMINI CLOUD) */}
      <OllamaSettings aiConfig={aiConfig} setAiConfig={setAiConfig} />

      {/* 6. NÚT XÂY DỰNG */}
      {(() => {
        const isOllama = aiConfig.provider === 'ollama';
        const preset = OLLAMA_MODEL_PRESETS.find(p => p.tag === aiConfig.ollama.selectedModel);
        const modelDisplay = isOllama 
          ? (preset ? preset.name : (aiConfig.ollama.selectedModel === 'custom' ? (aiConfig.ollama.customModel || 'Ollama Custom') : aiConfig.ollama.selectedModel))
          : 'Gemini 3.8 Flash';

        const isDisabled = isGenerating || !sourceMaterial || isLoadingFile || (templateMode === 'custom' && !templateText);

        return (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isDisabled}
            className={`w-full py-4 px-4 rounded-xl text-white font-bold text-base flex flex-col items-center justify-center gap-1 transition-all shadow-lg ${
              isDisabled
                ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                : isOllama 
                  ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 active:scale-[0.98] shadow-purple-200'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] shadow-blue-200'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5 text-white" />
                <span>
                  {isOllama 
                    ? `Đang chạy mô hình ${modelDisplay} trên máy...` 
                    : 'Đang xây dựng bài giảng theo mẫu...'}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span>
                    {templateMode === 'custom' ? 'Xây dựng Bài Giảng Theo Tệp Mẫu' : 'Xây dựng Bài Giảng'}
                  </span>
                </div>
                <span className="text-[11px] font-normal opacity-90">
                  {isOllama ? `⚡ Chạy Cục Bộ với ${modelDisplay}` : `✨ Sử dụng ${modelDisplay}`}
                </span>
              </>
            )}
          </button>
        );
      })()}

      {templateMode === 'custom' && !templateText && (
        <p className="text-center text-xs text-amber-600 font-medium">
          Vui lòng tải lên tệp mẫu Word hoặc PDF ở mục "Khung Mẫu Bài Giảng"
        </p>
      )}
    </div>
  );
};

export default InputForm;