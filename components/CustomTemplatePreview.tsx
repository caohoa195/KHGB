import React, { useState } from 'react';
import { CustomGeneratedPlan, LessonMetadata, calculateColumnWidths } from '../types';
import { 
  FileDown, 
  Copy, 
  Check, 
  Printer, 
  Edit3, 
  BookOpen, 
  Sparkles,
  FileText
} from 'lucide-react';
import { exportCustomPlanToDocx } from '../services/docxService';
import MathText from './MathText';

interface Props {
  plan: CustomGeneratedPlan;
  metadata?: LessonMetadata;
  onPlanUpdate?: (updated: CustomGeneratedPlan) => void;
}

const CustomTemplatePreview: React.FC<Props> = ({ plan, metadata, onPlanUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'document' | 'markdown'>('document');
  const [isEditing, setIsEditing] = useState(false);
  const [editablePlan, setEditablePlan] = useState<CustomGeneratedPlan>(plan);

  // Sync if plan prop updates
  React.useEffect(() => {
    setEditablePlan(plan);
  }, [plan]);

  const handleDownload = () => {
    exportCustomPlanToDocx(editablePlan, metadata);
  };

  const handleCopyMarkdown = () => {
    const textToCopy = editablePlan.rawMarkdown || generateMarkdownFromPlan(editablePlan);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const generateMarkdownFromPlan = (p: CustomGeneratedPlan): string => {
    let md = '';
    
    if (p.hasCoverPage && p.coverPage) {
      md += `# ${p.coverPage.university || ''}\n`;
      md += `## ${p.coverPage.faculty || ''}\n\n`;
      md += `# ${p.coverPage.title || p.documentTitle}\n\n`;
      md += `- **Học phần:** ${p.coverPage.courseName || ''}\n`;
      md += `- **${p.coverPage.lessonName || ''}**\n`;
      md += `- **Đối tượng:** ${p.coverPage.targetAudience || ''}\n`;
      md += `- **Năm học:** ${p.coverPage.schoolYear || ''}\n`;
      md += `- **Giảng viên:** ${p.coverPage.lecturerName || ''}\n\n`;
      md += `*${p.coverPage.coverPlaceDate || ''}*\n\n---\n\n`;
    } else {
      md += `# ${p.documentTitle}\n`;
      if (p.subtitle) md += `*${p.subtitle}*\n\n`;
      if (p.metadata && p.metadata.length > 0) {
        p.metadata.forEach(m => {
          md += `- **${m.label}:** ${m.value}\n`;
        });
        md += `\n---\n\n`;
      }
    }

    if (p.hasApprovalPage && p.approvalPage) {
      const ap = p.approvalPage;
      md += `### PHÊ DUYỆT\n`;
      md += `**${ap.approverRole || 'CHỦ NHIỆM BỘ MÔN'}**\n\n`;
      md += `1. **Phê duyệt bài giảng:** ${ap.lessonName || ''}\n`;
      md += `2. **Địa điểm, thời gian:** ${ap.location || ''}\n`;
      md += `3. **Nội dung phê duyệt:** ${ap.contentSummary || ''} (${ap.methodSummary || ''})\n`;
      md += `4. **Kết luận:** ${ap.conclusion || ''}\n\n`;
      md += `**Người phê duyệt:** ${ap.approverName || ''}\n\n---\n\n`;
    }

    if (p.sections) {
      p.sections.forEach(s => {
        md += `## ${s.title}\n\n`;
        if (s.content) md += `${s.content}\n\n`;

        if (s.subsections) {
          s.subsections.forEach(sub => {
            md += `### ${sub.subtitle}\n\n${sub.content}\n\n`;
          });
        }

        const tables = [
          ...(s.table ? [s.table] : []),
          ...(s.tables || [])
        ];

        tables.forEach(t => {
          if (t && t.headers && t.headers.length > 0) {
            md += `| ${t.headers.join(' | ')} |\n`;
            md += `| ${t.headers.map(() => '---').join(' | ')} |\n`;
            (t.rows || []).forEach(row => {
              md += `| ${row.join(' | ')} |\n`;
            });
            md += `\n`;
          }
        });
      });
    }

    if (p.signatures) {
      md += `\n---\n\n`;
      p.signatures.forEach(sig => {
        md += `**${sig.role}**: ${sig.name} (${sig.locationDate || ''})\n\n`;
      });
    }

    return md;
  };

  const handleSectionContentChange = (idx: number, newContent: string) => {
    const updated = { ...editablePlan };
    updated.sections[idx].content = newContent;
    setEditablePlan(updated);
    if (onPlanUpdate) onPlanUpdate(updated);
  };

  const handleSubsectionContentChange = (secIdx: number, subIdx: number, newContent: string) => {
    const updated = { ...editablePlan };
    if (updated.sections[secIdx].subsections) {
      updated.sections[secIdx].subsections![subIdx].content = newContent;
      setEditablePlan(updated);
      if (onPlanUpdate) onPlanUpdate(updated);
    }
  };

  const renderContentLines = (text: string = '') => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-sm text-gray-900 leading-relaxed">
        {lines.map((line, idx) => {
          const clean = line.trim();
          if (!clean) return <div key={idx} className="h-1.5" />;

          const isBullet = clean.startsWith('-') || clean.startsWith('*') || clean.startsWith('+');
          const isNumbered = /^([0-9]+[\.\)]|[a-zA-Z][\.\)])\s/.test(clean);
          const rawContent = isBullet ? clean.replace(/^[-*+]\s*/, '') : clean;

          if (isBullet) {
            return (
              <div key={idx} className="pl-5 relative text-justify">
                <span className="absolute left-1.5 top-0 text-gray-700 font-bold">-</span>
                <MathText content={rawContent} inline />
              </div>
            );
          }

          if (isNumbered) {
            return (
              <div key={idx} className="pl-4 text-justify font-medium">
                <MathText content={clean} inline />
              </div>
            );
          }

          // Đoạn văn thông thường: chỉ thụt đầu dòng (indent-6), các dòng sau căn đều mép lề
          return (
            <p key={idx} className="indent-6 text-justify leading-relaxed">
              <MathText content={clean} inline />
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800">
              Bài Giảng Theo Mẫu Đã Hoàn Thành
            </h2>
            <p className="text-xs text-gray-500">Giữ nguyên cấu trúc tệp mẫu, thay thế các thông tin bàn phím & nội dung tài liệu nguồn</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-gray-200 p-0.5 rounded-lg flex text-xs">
            <button
              onClick={() => setViewMode('document')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'document' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trang In (A4)
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'markdown' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Văn Bản Markdown
            </button>
          </div>

          {/* Quick Edit Toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isEditing 
                ? 'bg-amber-50 text-amber-800 border-amber-300' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Chỉnh sửa trực tiếp nội dung trước khi xuất Word"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? 'Lưu chỉnh sửa' : 'Chỉnh sửa'}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all"
            title="Sao chép toàn bộ văn bản kế hoạch"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all"
            title="In hoặc Lưu thành tệp PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In / PDF</span>
          </button>

          {/* Primary Export to DOCX */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 shadow shadow-green-200 transition-all active:scale-95"
            title="Tải về tệp Microsoft Word (.docx) chuẩn định dạng"
          >
            <FileDown className="w-4 h-4" />
            <span>Xuất file Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* Editing Banner */}
      {isEditing && (
        <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between no-print">
          <span className="flex items-center gap-1.5 font-medium">
            <Edit3 className="w-3.5 h-3.5" />
            Đang bật chế độ chỉnh sửa. Bạn có thể sửa trực tiếp từng phần văn bản dưới đây.
          </span>
          <button 
            onClick={() => setIsEditing(false)} 
            className="font-bold underline text-amber-900 ml-2"
          >
            Hoàn tất
          </button>
        </div>
      )}

      {/* View Mode: Markdown */}
      {viewMode === 'markdown' && (
        <div className="p-6 bg-gray-900 text-gray-100 font-mono text-xs overflow-auto max-h-[750px]">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {editablePlan.rawMarkdown || generateMarkdownFromPlan(editablePlan)}
          </pre>
        </div>
      )}

      {/* View Mode: Document (A4 Print Preview) */}
      {viewMode === 'document' && (
        <div className="space-y-6">
          
          {/* =========================================================================
              TRANG 1: TRANG BÌA (A4 INDEPENDENT SHEET WITH ACADEMIC BORDER)
             ========================================================================= */}
          <div className="relative mx-auto max-w-[210mm] bg-white shadow-2xl p-[8mm] sm:p-[10mm] border border-gray-300 min-h-[297mm] flex flex-col font-serif text-gray-900">
            <div className="absolute top-2 right-3 text-[10px] font-mono text-gray-400 uppercase tracking-widest no-print">
              Trang 1: Bìa
            </div>

            {/* Khung viền kép chuẩn học thuật (Academic Double Border) */}
            <div className="border-[3px] border-black p-1 flex-1 flex flex-col min-h-[277mm]">
              <div className="border border-black p-6 sm:p-10 flex-1 flex flex-col justify-between text-center min-h-[272mm]">
                {/* Header */}
                <div className="pt-2">
                  <h3 className="uppercase font-bold text-base sm:text-lg tracking-wide text-black">
                    {editablePlan.coverPage?.university || metadata?.university || "TRƯỜNG ĐẠI HỌC KHÁNH HÒA"}
                  </h3>
                  <h3 className="uppercase font-bold text-base sm:text-lg tracking-wide mt-1 text-black">
                    {editablePlan.coverPage?.faculty || metadata?.faculty || "KHOA SƯ PHẠM"}
                  </h3>
                  <div className="w-28 mx-auto border-b-2 border-black mt-3 mb-1"></div>
                </div>

                {/* Title & Metadata */}
                <div className="my-auto py-6">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.2em] uppercase mb-10 text-gray-950">
                    {editablePlan.coverPage?.title || editablePlan.documentTitle || "BÀI GIẢNG"}
                  </h1>

                  <div className="mx-auto text-left max-w-xl w-full px-6 space-y-4 text-sm sm:text-base">
                    {(editablePlan.coverPage?.courseName || metadata?.courseName) && (
                      <div className="flex items-baseline">
                        <span className="font-bold w-40 sm:w-44 shrink-0">Học phần:</span>
                        <span className="flex-1 font-medium">{editablePlan.coverPage?.courseName || metadata?.courseName}</span>
                      </div>
                    )}
                    {(editablePlan.coverPage?.lessonName || metadata?.lessonName) && (
                      <div className="flex items-baseline">
                        <span className="font-bold w-40 sm:w-44 shrink-0">Bài (Chuyên đề):</span>
                        <span className="flex-1 font-medium">
                          <MathText content={(editablePlan.coverPage?.lessonName || metadata?.lessonName || '').replace(/^Bài \(Chuyên đề\):\s*/i, '')} inline />
                        </span>
                      </div>
                    )}
                    {(editablePlan.coverPage?.targetAudience || metadata?.targetAudience) && (
                      <div className="flex items-baseline">
                        <span className="font-bold w-40 sm:w-44 shrink-0">Đối tượng:</span>
                        <span className="flex-1 font-medium">{editablePlan.coverPage?.targetAudience || metadata?.targetAudience}</span>
                      </div>
                    )}
                    {(editablePlan.coverPage?.schoolYear || metadata?.schoolYear) && (
                      <div className="flex items-baseline">
                        <span className="font-bold w-40 sm:w-44 shrink-0">Năm học:</span>
                        <span className="flex-1 font-medium">{editablePlan.coverPage?.schoolYear || metadata?.schoolYear}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lecturer & Bottom Location */}
                <div className="pb-2 space-y-10">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-gray-600 mb-1">
                      GIẢNG VIÊN BIÊN SOẠN
                    </p>
                    <p className="font-bold text-lg sm:text-xl uppercase tracking-wider text-gray-950">
                      {editablePlan.coverPage?.lecturerName || metadata?.lecturerName || "HỌ VÀ TÊN GIẢNG VIÊN"}
                    </p>
                  </div>

                  <div>
                    <p className="italic text-xs sm:text-sm text-gray-800 uppercase tracking-wide">
                      {editablePlan.coverPage?.coverPlaceDate || metadata?.coverPlaceDate || "KHÁNH HÒA, THÁNG ... NĂM ..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              TRANG 2: TRANG PHÊ DUYỆT (A4 INDEPENDENT SHEET WITH ACADEMIC BORDER)
             ========================================================================= */}
          <div className="relative mx-auto max-w-[210mm] bg-white shadow-2xl p-[8mm] sm:p-[10mm] border border-gray-300 min-h-[297mm] flex flex-col font-serif text-gray-900 page-break-before">
            <div className="absolute top-2 right-3 text-[10px] font-mono text-gray-400 uppercase tracking-widest no-print">
              Trang 2: Phê Duyệt
            </div>

            {/* Khung viền kép chuẩn học thuật (Academic Double Border) */}
            <div className="border-[3px] border-black p-1 flex-1 flex flex-col min-h-[277mm]">
              <div className="border border-black p-6 sm:p-10 flex-1 flex flex-col justify-between min-h-[272mm]">
                <div>
                  <h4 className="text-center italic text-xs sm:text-sm mb-1.5">
                    {editablePlan.approvalPage?.approvalDate || metadata?.approvalDate || "Ngày ... tháng ... năm ..."}
                  </h4>
                  <h4 className="text-center font-bold text-xl sm:text-2xl tracking-wide">
                    PHÊ DUYỆT
                  </h4>
                  <p className="text-center font-bold text-sm sm:text-base uppercase tracking-wider mt-1 mb-8">
                    {editablePlan.approvalPage?.approverRole || metadata?.approverRole || "CHỦ NHIỆM BỘ MÔN"}
                  </p>

                  <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-justify">
                    <div>
                      <p className="font-bold">1. Phê duyệt bài giảng</p>
                      <p className="pl-6">{editablePlan.approvalPage?.lessonName || metadata?.lessonName}</p>
                      <p className="pl-6">Giảng viên: {editablePlan.approvalPage?.lecturerName || metadata?.lecturerName}</p>
                    </div>

                    <div>
                      <p className="font-bold">2. Địa điểm, thời gian</p>
                      <p className="pl-6 font-semibold italic">a) Thông qua</p>
                      <p className="pl-8">- Địa điểm: {editablePlan.approvalPage?.location || metadata?.location || "Khánh Hòa"}</p>
                      <p className="pl-8">- Thời gian: ..</p>
                      <p className="pl-8">- Ngày ... tháng ... năm ...</p>
                      <p className="pl-6 font-semibold italic mt-1">b) Phê duyệt</p>
                      <p className="pl-8">- Địa điểm: {editablePlan.approvalPage?.location || metadata?.location || "Khánh Hòa"}</p>
                      <p className="pl-8">- Thời gian: ...</p>
                    </div>

                    <div>
                      <p className="font-bold">3. Nội dung phê duyệt</p>
                      <p className="pl-6 font-semibold italic">a) Phần nội dung của bài giảng</p>
                      <div className="pl-8"><span className="font-bold">- Nội dung bài giảng: </span><MathText content={editablePlan.approvalPage?.contentSummary || `Nội dung ${metadata?.lessonName || 'bài giảng'} theo chương trình chi tiết`} inline /></div>
                      <div className="pl-8"><span className="font-bold">- </span><MathText content={editablePlan.approvalPage?.skillsSummary || "Rèn luyện kỹ năng thực hành và kiến thức chuyên môn"} inline /></div>
                      <p className="pl-6 font-semibold italic mt-1">b) Phần thực hành bài giảng</p>
                      <p className="pl-8">- Phần thực hành của bài:</p>
                      <div className="pl-8"><span className="font-bold">- Phương pháp giảng dạy: </span><MathText content={editablePlan.approvalPage?.methodSummary || "Kết hợp thuyết trình, phát vấn, trực quan và thảo luận"} inline /></div>
                    </div>

                    <div>
                      <p className="font-bold">4. Kết luận</p>
                      <div className="pl-6"><MathText content={editablePlan.approvalPage?.conclusion || "Nhất trí thông qua bài giảng."} inline /></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-end pr-6">
                  <div className="text-center min-w-[250px]">
                    <p className="font-bold uppercase text-xs sm:text-sm mb-16 tracking-wide">
                      CHỨC VỤ NGƯỜI PHÊ DUYỆT
                    </p>
                    <p className="font-bold text-sm sm:text-base">
                      {editablePlan.approvalPage?.approverName || metadata?.approverName || "Họ và tên"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              TRANG 3 TRỞ ĐI: NỘI DUNG KẾ HOẠCH BÀI DẠY (A4 SHEETS WITHOUT BORDER)
             ========================================================================= */}
          <div className="relative mx-auto max-w-[210mm] bg-white shadow-2xl p-[16mm] border border-gray-300 font-serif text-sm leading-relaxed text-gray-900 page-break-before">
            <div className="absolute top-3 right-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest no-print">
              {editablePlan.hasCoverPage ? 'Từ Trang 3: Nội Dung Kế Hoạch' : 'Nội Dung Kế Hoạch'}
            </div>

            {/* Standard Header (if template has NO separate cover page, e.g. CV 5512) */}
            {!editablePlan.hasCoverPage && (
              <div className="mb-6">
                <div className="text-center mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-gray-900">
                    {editablePlan.documentTitle || "KẾ HOẠCH BÀI DẠY"}
                  </h1>
                  {editablePlan.subtitle && (
                    <p className="italic text-gray-600 mt-1 text-sm">
                      {editablePlan.subtitle}
                    </p>
                  )}
                </div>

                {editablePlan.metadata && editablePlan.metadata.length > 0 && (
                  <div className="mb-6 pb-4 border-b border-gray-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-700">
                      {editablePlan.metadata.map((item, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <span className="font-bold shrink-0">{item.label}:</span>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Sections */}
            <div className="space-y-6">
              {editablePlan.sections && editablePlan.sections.map((sec, secIdx) => {
                const isMajorPart = sec.title.toLowerCase().startsWith("phần ") || sec.title.toLowerCase().startsWith("phan ");

                return (
                  <div key={sec.id || secIdx} className="space-y-3">
                    {/* Section Title */}
                    <h2 className={`font-bold text-gray-900 uppercase tracking-tight ${
                      isMajorPart 
                        ? 'text-center text-base mt-8 mb-4 border-b pb-2' 
                        : 'text-sm border-l-4 border-blue-800 pl-2'
                    }`}>
                      {sec.title}
                    </h2>

                    {/* Section Direct Content */}
                    {sec.content && (
                      <div>
                        {isEditing ? (
                          <textarea
                            rows={4}
                            value={sec.content}
                            onChange={(e) => handleSectionContentChange(secIdx, e.target.value)}
                            className="w-full text-xs p-2.5 font-sans border rounded border-amber-300 bg-amber-50/40 focus:ring-1 focus:ring-amber-500"
                          />
                        ) : (
                          renderContentLines(sec.content)
                        )}
                      </div>
                    )}

                    {/* Subsections */}
                    {sec.subsections && sec.subsections.length > 0 && (
                      <div className="space-y-4">
                        {sec.subsections.map((sub, subIdx) => (
                          <div key={subIdx} className="space-y-1">
                            <h3 className="font-bold text-sm text-gray-900 mt-3 mb-1 border-l-2 border-indigo-600 pl-2">
                              {sub.subtitle}
                            </h3>
                            {isEditing ? (
                              <textarea
                                rows={3}
                                value={sub.content}
                                onChange={(e) => handleSubsectionContentChange(secIdx, subIdx, e.target.value)}
                                className="w-full text-xs p-2 font-sans border rounded border-amber-300 bg-amber-50/40 focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              renderContentLines(sub.content)
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tables */}
                    {(() => {
                      const tables = [
                        ...(sec.table ? [sec.table] : []),
                        ...(sec.tables || [])
                      ];

                      return tables.map((tbl, tIdx) => {
                        const colWidths = calculateColumnWidths(tbl.headers || []);
                        return (
                          <div key={tIdx} className="mt-4 mb-4 overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-xs leading-snug table-fixed">
                              <thead>
                                <tr className="bg-gray-100 font-bold">
                                  {tbl.headers.map((h, hIdx) => {
                                    const isSmallCol = /(thời gian|t\.gian|t\s*gian|vật chất|thiết bị|đồ dùng|dddh|stt)/i.test(h);
                                    return (
                                      <th 
                                        key={hIdx} 
                                        style={{ width: `${colWidths[hIdx]}%` }}
                                        className={`border border-black ${isSmallCol ? 'p-1.5' : 'p-2.5'} text-center align-middle`}
                                      >
                                        {h}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {(tbl.rows || []).map((row, rIdx) => (
                                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                                    {row.map((cell, cIdx) => {
                                      const headerName = tbl.headers[cIdx] || '';
                                      const isTime = /(thời gian|t\.gian|t\s*gian|phút)/i.test(headerName);
                                      const isCenter = isTime || /^(stt|số tt|thứ tự$)/i.test(headerName);
                                      return (
                                        <td 
                                          key={cIdx} 
                                          style={{ width: `${colWidths[cIdx]}%` }}
                                          className={`border border-black p-2 align-top ${isCenter ? 'text-center font-mono font-medium' : 'text-justify'}`}
                                        >
                                          {cell.split('\n').map((cl, clIdx) => (
                                            <div key={clIdx} className={cl.startsWith('-') ? 'pl-2' : ''}>
                                              <MathText content={cl} inline />
                                            </div>
                                          ))}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              })}
            </div>

            {/* 5. SIGNATURE BLOCKS */}
            {editablePlan.signatures && editablePlan.signatures.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-300">
                <div className={`grid ${editablePlan.signatures.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
                  {editablePlan.signatures.map((sig, sigIdx) => (
                    <div key={sigIdx} className="text-center flex flex-col items-center">
                      {sig.locationDate && (
                        <p className="italic text-xs text-gray-600 mb-1">{sig.locationDate}</p>
                      )}
                      <p className="font-bold text-xs uppercase text-gray-900">{sig.role}</p>
                      <div className="h-20" />
                      <p className="font-bold text-sm text-gray-900">{sig.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTemplatePreview;
