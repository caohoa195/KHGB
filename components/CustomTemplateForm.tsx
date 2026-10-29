import React, { ChangeEvent, useState } from 'react';
import { CustomTemplateConfig } from '../types';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Sparkles, 
  BookOpen, 
  User, 
  Clock, 
  Sliders, 
  Eye, 
  X,
  FileCode,
  BookmarkCheck
} from 'lucide-react';
import { extractTextFromFile } from '../services/fileService';

// Built-in sample templates for quick exploration
const SAMPLE_TEMPLATES = [
  {
    id: 'cv5512',
    name: 'Mẫu Kế hoạch bài dạy (Công văn 5512/BGDĐT)',
    badge: 'Bộ GD&ĐT',
    description: 'Khung bài dạy chuẩn THCS, THPT: Mục tiêu (Kiến thức, Năng lực, Phẩm chất), Thiết bị, Bảng Tiến trình dạy học (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng).',
    content: `TRƯỜNG: ........................................
TỔ CHUYÊN MÔN: ................................
Họ và tên giáo viên: ..........................

KẾ HOẠCH BÀI DẠY
TÊN BÀI DẠY: .................................
Môn học/Hoạt động giáo dục: .........; Lớp: .....
Thời gian thực hiện: (số tiết)

I. MỤC TIÊU
1. Về kiến thức:
- Nêu được, trình bày được các kiến thức trọng tâm của bài.
2. Về năng lực:
a) Năng lực chung: Tự chủ và tự học; Giao tiếp và hợp tác; Giải quyết vấn đề và sáng tạo.
b) Năng lực đặc thù môn học: Nhận thức khoa học; Vận dụng kiến thức, kỹ năng đã học.
3. Về phẩm chất:
- Yêu nước, nhân ái, chăm chỉ, trung thực, trách nhiệm.

II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. Đối với giáo viên: Kế hoạch bài dạy, bài giảng điện tử, thiết bị thí nghiệm, phiếu học tập.
2. Đối với học sinh: Sách giáo khoa, vở ghi, đồ dùng học tập.

III. TIẾN TRÌNH DẠY HỌC
1. Hoạt động 1: Mở đầu / Khởi động (Xác định vấn đề)
a) Mục tiêu
b) Nội dung
c) Sản phẩm
d) Tổ chức thực hiện:
- Chuyển giao nhiệm vụ: ...
- Thực hiện nhiệm vụ: ...
- Báo cáo, thảo luận: ...
- Kết luận, nhận định: ...

2. Hoạt động 2: Hình thành kiến thức mới
(Tiến trình với bảng phân tích chi tiết)
[BẢNG TIẾN TRÌNH HOẠT ĐỘNG DẠY HỌC:
Cột 1: Hoạt động học | Cột 2: Mục tiêu | Cột 3: Nội dung hoạt động | Cột 4: Sản phẩm học tập | Cột 5: Cách thức tổ chức]

3. Hoạt động 3: Luyện tập
a) Mục tiêu
b) Nội dung
c) Sản phẩm
d) Tổ chức thực hiện

4. Hoạt động 4: Vận dụng
a) Mục tiêu
b) Nội dung
c) Sản phẩm
d) Tổ chức thực hiện

IV. HƯỚNG DẪN VỀ NHÀ VÀ RÚT KINH NGHIỆM
1. Hướng dẫn tự học ở nhà
2. Nhận xét, rút kinh nghiệm sau tiết dạy

NGƯỜI BIÊN SOẠN
(Ký và ghi rõ họ tên)

TỔ TRƯỞNG CHUYÊN MÔN
(Ký và ghi rõ họ tên)`
  },
  {
    id: 'university_module',
    name: 'Mẫu Kế hoạch giảng dạy Chuyên đề / Học phần Đại học',
    badge: 'Đại Học',
    description: 'Khung bài giảng cao cấp: Chuẩn đầu ra (CLO), Phương pháp dạy học, Bảng phân bổ ma trận tiết học (Lý thuyết, Thảo luận, Thực hành), Đánh giá.',
    content: `BỘ GIÁO DỤC VÀ ĐÀO TẠO
TRƯỜNG ĐẠI HỌC ......................
KHOA: ................................
BỘ MÔN: ..............................

KẾ HOẠCH GIẢNG BÀI CHUYÊN ĐỀ
Học phần: .......................................
Mã học phần: ............... Số tín chỉ: ........
Đối tượng sinh viên: ...........................
Giảng viên phụ trách: ..........................

I. MỤC TIÊU VÀ CHUẨN ĐẦU RA (CLOs)
1. Mục tiêu chung của chuyên đề
2. Chuẩn đầu ra chi tiết (Kiến thức CLO1, Kỹ năng CLO2, Mức tự chủ CLO3)

II. NỘI DUNG VÀ TIẾN TRÌNH CHI TIẾT
[BẢNG PHÂN BỔ NỘI DUNG VÀ HOẠT ĐỘNG:
Cột 1: Tiết / Buổi | Cột 2: Nội dung chi tiết | Cột 3: Hoạt động của Giảng viên | Cột 4: Hoạt động của Sinh viên | Cột 5: Học liệu & Đánh giá]

III. PHƯƠNG PHÁP VÀ HÌNH THỨC DẠY HỌC
1. Phương pháp giảng dạy chủ đạo (Dạy học tích cực, Nghiên cứu tình huống, Giải quyết vấn đề)
2. Hoạt động học tập của sinh viên

IV. PHƯƠNG PHÁP KIỂM TRA ĐÁNH GIÁ
1. Đánh giá quá trình (chuyên cần, thảo luận, bài tập nhóm)
2. Đánh giá kết thúc chuyên đề

V. TÀI LIỆU HỌC TẬP VÀ THAM KHẢO
1. Giáo trình chính
2. Tài liệu tham khảo mở rộng

TRƯỞNG BỘ MÔN PHÊ DUYỆT
(Ký và ghi rõ họ tên)

GIẢNG VIÊN BIÊN SOẠN
(Ký và ghi rõ họ tên)`
  }
];

interface Props {
  templateText: string;
  setTemplateText: (val: string) => void;
  templateFileName: string;
  setTemplateFileName: (name: string) => void;
  sourceMaterial: string;
  setSourceMaterial: (val: string) => void;
  config: CustomTemplateConfig;
  setConfig: React.Dispatch<React.SetStateAction<CustomTemplateConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
}

const CustomTemplateForm: React.FC<Props> = ({
  templateText,
  setTemplateText,
  templateFileName,
  setTemplateFileName,
  sourceMaterial,
  setSourceMaterial,
  config,
  setConfig,
  onGenerate,
  isGenerating,
}) => {
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  const handleTemplateUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingTemplate(true);
    setErrorMsg(null);

    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 20) {
        throw new Error("Tệp mẫu không có đủ nội dung văn bản. Vui lòng kiểm tra lại tệp.");
      }
      setTemplateText(text);
      setTemplateFileName(file.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Lỗi khi đọc tệp mẫu. Hỗ trợ tệp .docx, .pdf, .txt");
    } finally {
      setLoadingTemplate(false);
      e.target.value = '';
    }
  };

  const handleSourceUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingSource(true);
    setErrorMsg(null);

    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 20) {
        throw new Error("Tài liệu nguồn không có đủ nội dung văn bản. Vui lòng kiểm tra lại tệp.");
      }
      setSourceMaterial(text);
      // Auto fill title if empty
      if (!config.planTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setConfig(prev => ({ ...prev, planTitle: cleanName }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Lỗi khi đọc tài liệu nguồn.");
    } finally {
      setLoadingSource(false);
      e.target.value = '';
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_TEMPLATES[0]) => {
    setTemplateText(sample.content);
    setTemplateFileName(sample.name);
  };

  const handleConfigChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name === 'totalPeriods' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-6">
      {/* Header Info */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tạo Kế Hoạch Theo Tệp Mẫu</h2>
              <p className="text-xs text-gray-500 mt-0.5">Tải tệp mẫu (PDF, Word) & Tài liệu nguồn để AI áp dụng chính xác cấu trúc</p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-xs underline font-semibold">Đóng</button>
        </div>
      )}

      {/* STEP 1: TEMPLATE FILE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
            Tệp Mẫu (PDF hoặc Word .docx)
            <span className="text-red-500">*</span>
          </label>
          {templateText && (
            <button
              onClick={() => setShowTemplatePreview(!showTemplatePreview)}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              {showTemplatePreview ? 'Ẩn xem trước' : 'Xem nội dung mẫu'}
            </button>
          )}
        </div>

        {/* Upload Box for Template */}
        <label className={`relative flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          templateText 
            ? 'border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50/70' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
        }`}>
          <div className="flex flex-col items-center text-center">
            {loadingTemplate ? (
              <>
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
                <p className="text-sm font-medium text-gray-700">Đang đọc cấu trúc tệp mẫu...</p>
                <p className="text-xs text-gray-400">Trích xuất bảng biểu & đề mục từ PDF / DOCX</p>
              </>
            ) : templateText ? (
              <div className="flex items-center gap-3 py-1">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    {templateFileName || 'Tệp mẫu đã sẵn sàng'}
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Đã nhận diện</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Đã trích xuất {templateText.length.toLocaleString('vi-VN')} ký tự • Bấm để thay tệp mẫu khác
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-7 h-7 text-indigo-500 mb-2" />
                <p className="text-sm font-semibold text-gray-700">Tải tệp mẫu của bạn lên</p>
                <p className="text-xs text-gray-400 mt-0.5">Chấp nhận .docx (Word), .pdf hoặc .txt</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".docx,.pdf,.txt,.md" 
            onChange={handleTemplateUpload}
            disabled={loadingTemplate}
          />
        </label>

        {/* Sample Templates Quick-Pick */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
            Hoặc chọn nhanh mẫu có sẵn:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {SAMPLE_TEMPLATES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                  templateFileName === sample.name
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-400'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="shrink-0 mt-0.5 font-bold text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border">
                  {sample.badge}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">{sample.name}</p>
                  <p className="text-gray-500 text-[11px] line-clamp-1 mt-0.5">{sample.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Template Preview */}
        {showTemplatePreview && templateText && (
          <div className="bg-gray-50 border rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-600" />
                Xem trước cấu trúc tệp mẫu ({templateFileName}):
              </span>
              <button 
                onClick={() => setShowTemplatePreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={6}
              className="w-full font-mono text-[11px] p-2 bg-white border rounded border-gray-300 focus:ring-1 focus:ring-indigo-500"
              placeholder="Nội dung khung mẫu..."
            />
            <p className="text-[10px] text-gray-400 mt-1">Bạn có thể chỉnh sửa trực tiếp nội dung khung mẫu ở trên nếu cần.</p>
          </div>
        )}
      </div>

      {/* STEP 2: SOURCE MATERIAL */}
      <div className="space-y-3 border-t pt-4">
        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
          Tài Liệu Nguồn (Bài học / Giáo trình / Ghi chú)
          <span className="text-red-500">*</span>
        </label>

        {/* Source Upload Box */}
        <label className={`relative flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          sourceMaterial 
            ? 'border-indigo-300 bg-indigo-50/20 hover:bg-indigo-50/50' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}>
          <div className="flex flex-col items-center text-center">
            {loadingSource ? (
              <>
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-1.5" />
                <p className="text-xs font-medium text-gray-700">Đang đọc tài liệu nguồn...</p>
              </>
            ) : (
              <>
                <FileText className="w-6 h-6 text-indigo-500 mb-1.5" />
                <p className="text-xs font-semibold text-gray-700">Tải tài liệu bài học (PDF, Word .docx, .txt)</p>
                <p className="text-[11px] text-gray-400">Hoặc bạn có thể dán trực tiếp nội dung vào khung bên dưới</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".docx,.pdf,.txt,.md" 
            onChange={handleSourceUpload}
            disabled={loadingSource}
          />
        </label>

        <textarea
          value={sourceMaterial}
          onChange={(e) => setSourceMaterial(e.target.value)}
          rows={5}
          placeholder="Dán nội dung giáo trình, tài liệu chuyên môn, ghi chú bài giảng vào đây..."
          className="w-full text-xs p-3 border rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {sourceMaterial && (
          <p className="text-[11px] text-gray-400 text-right">
            Đã nhập {sourceMaterial.length.toLocaleString('vi-VN')} ký tự
          </p>
        )}
      </div>

      {/* STEP 3: CUSTOM METADATA (OPTIONAL) */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
          className="w-full flex items-center justify-between text-left text-sm font-bold text-gray-700 py-1 hover:text-indigo-600"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Thông Tin Bổ Sung & Yêu Cầu (Tùy chọn)
          </span>
          <span className="text-xs font-normal text-indigo-600">
            {showAdvancedConfig ? 'Thu gọn ▲' : 'Mở rộng ▼'}
          </span>
        </button>

        {showAdvancedConfig && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 mb-1">Tên bài / Kế hoạch</label>
              <input
                type="text"
                name="planTitle"
                value={config.planTitle}
                onChange={handleConfigChange}
                placeholder="Ví dụ: Kế hoạch bài dạy Bài 5: Tốc độ và vận tốc"
                className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Môn học / Học phần</label>
              <input
                type="text"
                name="courseName"
                value={config.courseName}
                onChange={handleConfigChange}
                placeholder="Ví dụ: Vật lý đại cương / Sinh học 10"
                className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Giảng viên / Giáo viên</label>
              <input
                type="text"
                name="lecturerName"
                value={config.lecturerName}
                onChange={handleConfigChange}
                placeholder="Ví dụ: ThS. Nguyễn Văn A"
                className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Đối tượng / Lớp học</label>
              <input
                type="text"
                name="targetAudience"
                value={config.targetAudience}
                onChange={handleConfigChange}
                placeholder="Ví dụ: Sinh viên K46 / Học sinh lớp 11A1"
                className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Số tiết / Thời lượng</label>
              <input
                type="number"
                name="totalPeriods"
                value={config.totalPeriods || ''}
                onChange={handleConfigChange}
                min={1}
                placeholder="Ví dụ: 2 tiết (90 phút)"
                className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 mb-1">Yêu cầu sư phạm đặc biệt</label>
              <textarea
                name="specialRequirements"
                value={config.specialRequirements}
                onChange={handleConfigChange}
                rows={2}
                placeholder="Ví dụ: Chú trọng thảo luận nhóm, tích hợp STEM, sử dụng phần mềm mô phỏng, bám sát ma trận đánh giá..."
                className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* GENERATE ACTION BUTTON */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !templateText || !sourceMaterial || loadingTemplate || loadingSource}
        className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-lg ${
          isGenerating || !templateText || !sourceMaterial || loadingTemplate || loadingSource
            ? 'bg-gray-400 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] shadow-indigo-200'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 text-white" />
            <span>Đang phân tích mẫu và tạo kế hoạch...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span>Tạo Kế Hoạch Theo Tệp Mẫu</span>
          </>
        )}
      </button>

      {(!templateText || !sourceMaterial) && (
        <p className="text-center text-xs text-gray-400 italic">
          {!templateText && !sourceMaterial 
            ? 'Vui lòng tải tệp mẫu và tài liệu nguồn để kích hoạt'
            : !templateText 
              ? 'Vui lòng tải hoặc chọn tệp mẫu' 
              : 'Vui lòng nhập hoặc tải tài liệu nguồn'}
        </p>
      )}
    </div>
  );
};

export default CustomTemplateForm;
