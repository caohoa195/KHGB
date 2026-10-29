import React from 'react';
import { GeneratedContent, LessonMetadata } from '../types';
import { FileDown, Printer } from 'lucide-react';
import { exportToDocx } from '../services/docxService';
import MathText from './MathText';

interface Props {
  content: GeneratedContent;
  metadata: LessonMetadata;
}

const LessonPreview: React.FC<Props> = ({ content, metadata }) => {
  const handleDownload = () => {
    exportToDocx(metadata, content);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderLessonLine = (text: string) => {
    if (!text) return null;
    const clean = text.replace(/^Bài \(Chuyên đề\):\s*/i, '');
    return <MathText content={clean} inline />;
  };

  const renderBlockText = (text?: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          const clean = line.trim();
          const isBullet = clean.startsWith('-') || clean.startsWith('*');
          const isNumbered = /^\d+[\.\)]\s/.test(clean);
          return (
            <div 
              key={idx} 
              className={`${isBullet ? 'pl-4 relative' : isNumbered ? 'pl-2 font-medium' : ''} leading-relaxed`}
            >
              {isBullet && <span className="absolute left-0 top-0 font-bold">-</span>}
              <MathText content={isBullet ? clean.replace(/^[-*]\s*/, '') : clean} inline />
            </div>
          );
        })}
      </div>
    );
  };

  const renderRequirements = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          let cleanLine = line.trim();
          cleanLine = cleanLine.replace(/^- \*\*/, '- **').replace(/^\*/, '-');
          if (!cleanLine.startsWith('-')) cleanLine = '- ' + cleanLine;
          
          const labelMatch = cleanLine.match(/^- \*\*(.*?):\*\*(.*)/) || cleanLine.match(/^- \*\*(.*?)\*\*(.*)/);
          
          if (labelMatch) {
            const label = labelMatch[1].replace(':', '').trim();
            const val = labelMatch[2].trim();
            return (
              <p key={idx} className="flex gap-1.5 pl-4">
                <span className="flex-shrink-0 font-bold">-</span>
                <span><span className="font-bold">{label}:</span> <MathText content={val} inline /></span>
              </p>
            );
          }

          return (
            <p key={idx} className="flex gap-1.5 pl-4">
               <span className="flex-shrink-0 font-bold">-</span>
               <span><MathText content={cleanLine.replace(/^- /, '')} inline /></span>
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex flex-wrap justify-between items-center gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Xem trước Bài Giảng</h2>
          <p className="text-xs text-gray-500">Hiển thị chuẩn trang in: Trang 1 (Bìa), Trang 2 (Phê duyệt), Từ trang 3 (Nội dung)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border border-gray-300"
          >
            <Printer className="w-4 h-4" />
            In / Lưu PDF
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow shadow-green-200 active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            Xuất file Word (.docx)
          </button>
        </div>
      </div>

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
            {/* Header: Đơn vị cấp trên & Khoa */}
            <div className="pt-2">
              <h3 className="uppercase font-bold text-base sm:text-lg tracking-wide text-black">
                {metadata.university || "TRƯỜNG ĐẠI HỌC KHÁNH HÒA"}
              </h3>
              <h3 className="uppercase font-bold text-base sm:text-lg tracking-wide mt-1 text-black">
                {metadata.faculty || "KHOA SƯ PHẠM"}
              </h3>
              <div className="w-28 mx-auto border-b-2 border-black mt-3 mb-1"></div>
            </div>

            {/* Title & Metadata (Cân đối chính giữa trang bìa) */}
            <div className="my-auto py-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.2em] uppercase mb-10 text-gray-950">
                BÀI GIẢNG
              </h1>

              {/* Bảng thông tin cân đối 2 cột thẳng hàng */}
              <div className="mx-auto text-left max-w-xl w-full px-6 space-y-4 text-sm sm:text-base">
                <div className="flex items-baseline">
                  <span className="font-bold w-40 sm:w-44 shrink-0">Học phần:</span>
                  <span className="flex-1 font-medium">{metadata.courseName || "..."}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-40 sm:w-44 shrink-0">Bài (Chuyên đề):</span>
                  <span className="flex-1 font-medium">
                    {renderLessonLine(metadata.lessonName)}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-40 sm:w-44 shrink-0">Đối tượng:</span>
                  <span className="flex-1 font-medium">{metadata.targetAudience || "..."}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-40 sm:w-44 shrink-0">Năm học:</span>
                  <span className="flex-1 font-medium">{metadata.schoolYear || "..."}</span>
                </div>
              </div>
            </div>

            {/* Giảng viên & Địa danh ngày tháng ở đáy trang */}
            <div className="pb-2 space-y-10">
              <div>
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-gray-600 mb-1">
                  GIẢNG VIÊN BIÊN SOẠN
                </p>
                <p className="font-bold text-lg sm:text-xl uppercase tracking-wider text-gray-950">
                  {metadata.lecturerName || "HỌ VÀ TÊN GIẢNG VIÊN"}
                </p>
              </div>

              <div>
                <p className="italic text-xs sm:text-sm text-gray-800 uppercase tracking-wide">
                  {metadata.coverPlaceDate || "KHÁNH HÒA, THÁNG ... NĂM ..."}
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
                {metadata.approvalDate || "Ngày ... tháng ... năm ..."}
              </h4>
              <h4 className="text-center font-bold text-xl sm:text-2xl tracking-wide">
                PHÊ DUYỆT
              </h4>
              <p className="text-center font-bold text-sm sm:text-base uppercase tracking-wider mt-1 mb-8">
                {metadata.approverRole || "CHỦ NHIỆM BỘ MÔN"}
              </p>

              <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-justify">
                <div>
                  <p className="font-bold">1. Phê duyệt bài giảng</p>
                  <p className="pl-6">{metadata.lessonName}</p>
                  <p className="pl-6">Giảng viên: {metadata.lecturerName}</p>
                </div>

                <div>
                  <p className="font-bold">2. Địa điểm, thời gian</p>
                  <p className="pl-6 font-semibold italic">a) Thông qua</p>
                  <p className="pl-8">- Địa điểm: {metadata.location}</p>
                  <p className="pl-8">- Thời gian: ..</p>
                  <p className="pl-8">- Ngày ... tháng ... năm ...</p>
                  <p className="pl-6 font-semibold italic mt-1">b) Phê duyệt</p>
                  <p className="pl-8">- Địa điểm: {metadata.location}</p>
                  <p className="pl-8">- Thời gian: ...</p>
                </div>

                {content.approvalSection && (
                  <div>
                    <p className="font-bold">3. Nội dung phê duyệt</p>
                    <p className="pl-6 font-semibold italic">a) Phần nội dung của bài giảng</p>
                    <div className="pl-8"><span className="font-bold">- Nội dung bài giảng: </span><MathText content={content.approvalSection.content || ''} inline /></div>
                    <div className="pl-8"><span className="font-bold">- </span><MathText content={content.approvalSection.skills || ''} inline /></div>
                    <p className="pl-6 font-semibold italic mt-1">b) Phần thực hành bài giảng</p>
                    <p className="pl-8">- Phần thực hành của bài:</p>
                    <div className="pl-8"><span className="font-bold">- Phương pháp giảng dạy: </span><MathText content={content.approvalSection.method || ''} inline /></div>
                  </div>
                )}

                {content.approvalSection?.conclusion && (
                  <div>
                    <p className="font-bold">4. Kết luận</p>
                    <div className="pl-6"><MathText content={content.approvalSection.conclusion} inline /></div>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Box */}
            <div className="mt-8 flex flex-col items-end pr-6">
              <div className="text-center min-w-[250px]">
                <p className="font-bold uppercase text-xs sm:text-sm mb-16 tracking-wide">
                  CHỨC VỤ NGƯỜI PHÊ DUYỆT
                </p>
                <p className="font-bold text-sm sm:text-base">
                  {metadata.approverName || "Họ và tên"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TRANG 3 TRỞ ĐI: NỘI DUNG BÀI GIẢNG (A4 SHEETS WITHOUT PAGE BORDER)
         ========================================================================= */}
      <div className="relative mx-auto max-w-[210mm] bg-white shadow-2xl p-[16mm] border border-gray-300 font-serif text-sm leading-relaxed text-gray-900 page-break-before">
        <div className="absolute top-3 right-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest no-print">
          Từ Trang 3: Nội Dung Bài Giảng
        </div>

        {/* Phần I: Ý định giảng bài */}
        <div className="mb-10">
          <h4 className="text-center font-bold text-base mb-1">Phần I</h4>
          <h4 className="text-center font-bold text-base uppercase mb-6 tracking-wide border-b pb-2">
            Ý ĐỊNH GIẢNG BÀI
          </h4>

          <div className="space-y-4">
            <div>
              <p className="font-bold uppercase text-sm">I. MỤC ĐÍCH, YÊU CẦU</p>
              <div className="pl-4 mt-2">
                <p className="font-bold text-gray-950">1. Mục đích:</p>
                <div className="pl-4 text-justify mt-0.5 leading-relaxed">
                  {renderBlockText(content.part1?.purpose)}
                </div>
              </div>
              <div className="pl-4 mt-2">
                <p className="font-bold text-gray-950">2. Yêu cầu:</p>
                {renderRequirements(content.part1?.requirements || "")}
              </div>
            </div>

            <div className="pt-1">
              <p className="font-bold uppercase text-sm">II. NỘI DUNG, TRỌNG TÂM</p>
              <div className="pl-4 mt-2">
                <p className="font-bold text-gray-950">1. Nội dung:</p>
                <div className="pl-4 text-justify mt-0.5 leading-relaxed space-y-1">
                  {renderBlockText(content.part1?.content)}
                </div>
              </div>
              <div className="pl-4 mt-2">
                <p className="font-bold text-gray-950">2. Trọng tâm:</p>
                <div className="pl-4 text-justify mt-0.5 leading-relaxed space-y-1">
                  {renderBlockText(content.part1?.focus)}
                </div>
              </div>
            </div>

            <div className="pt-1">
              <p className="font-bold uppercase text-sm">III. THỜI GIAN</p>
              <p className="pl-4 mt-1">Tổng số: {metadata.totalPeriods} tiết (mỗi tiết 45 phút).</p>
            </div>

            <div className="pt-1">
              <p className="font-bold uppercase text-sm">IV. TỔ CHỨC, PHƯƠNG PHÁP</p>
              <div className="pl-4 mt-2">
                <p className="font-bold text-gray-950">1. Tổ chức:</p>
                <div className="pl-4 text-justify mt-0.5 leading-relaxed">
                  {renderBlockText(content.part1?.organization)}
                </div>
              </div>
              <div className="pl-4 mt-2">
                <p className="font-bold text-gray-950">2. Phương pháp:</p>
                <div className="pl-4 mt-1 space-y-2">
                  <div>
                    <p className="font-bold italic">a) Giảng viên:</p>
                    <div className="pl-4 text-justify mt-0.5 leading-relaxed">
                      {renderBlockText(content.part1?.methodLecturer)}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold italic">b) Học viên:</p>
                    <div className="pl-4 text-justify mt-0.5 leading-relaxed">
                      {renderBlockText(content.part1?.methodStudent)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <p className="font-bold uppercase text-sm">V. ĐỊA ĐIỂM</p>
              <p className="pl-4 mt-1">{metadata.location || "Phòng học bộ môn / Giảng đường"}</p>
            </div>

            <div className="pt-1">
              <p className="font-bold uppercase text-sm">VI. VẬT CHẤT BẢO ĐẢM</p>
              <p className="pl-4 mt-1">1. Giảng viên: Máy chiếu, bài giảng điện tử, giáo án, tài liệu tham khảo.</p>
              <p className="pl-4 mt-1">2. Học viên: Giáo trình, vở ghi, đồ dùng học tập.</p>
            </div>
          </div>
        </div>

        {/* Phần II: Thực hành giảng bài */}
        <div className="mb-10 pt-6 border-t">
          <h4 className="text-center font-bold text-base mb-1">Phần II</h4>
          <h4 className="text-center font-bold text-base uppercase mb-6 tracking-wide border-b pb-2">
            THỰC HÀNH GIẢNG BÀI ({metadata.totalPeriods * 45} phút)
          </h4>
          
          <div className="mb-4">
            <p className="font-bold uppercase mb-2">A. THỦ TỤC GIẢNG BÀI (10 phút)</p>
            <p className="pl-4">1. Nhận lớp, nắm quân số và phổ biến quy định học tập.</p>
            <div className="pl-4"><span>2. Giới thiệu bài mới: </span><MathText content={content.part2?.introContent || ''} inline /></div>
          </div>
          
          <p className="font-bold uppercase mb-4">B. NỘI DUNG BÀI GIẢNG</p>
          
          {(content.part2?.periods || []).map((period) => (
            <div key={period.periodNumber} className="mb-8">
              <div className="font-bold text-blue-900 mb-2 border-l-4 border-blue-900 pl-2">
                <span>Tiết {period.periodNumber}: (45 phút) - </span>
                <MathText content={period.objectives || ''} inline />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs leading-snug table-fixed">
                  <thead>
                    <tr className="bg-gray-100 font-bold">
                      <th className="border border-black p-2.5 w-[42%] text-center">Thứ tự, nội dung</th>
                      <th className="border border-black p-1.5 w-[7%] text-center">T.Gian</th>
                      <th className="border border-black p-2.5 w-[21%] text-center">PP Giảng viên</th>
                      <th className="border border-black p-2.5 w-[21%] text-center">PP Học viên</th>
                      <th className="border border-black p-1.5 w-[9%] text-center">Vật chất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(period.activities || []).map((act, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                        <td className="border border-black p-2.5 align-top text-justify">
                          <div className="space-y-1">
                            {renderBlockText(act.content)}
                          </div>
                        </td>
                        <td className="border border-black p-1 text-center align-top font-mono font-bold">{act.timeMinutes}'</td>
                        <td className="border border-black p-2 align-top text-justify">
                          <div className="space-y-0.5">
                            {renderBlockText(act.methodLecturer)}
                          </div>
                        </td>
                        <td className="border border-black p-2 align-top text-justify">
                          <div className="space-y-0.5">
                            {renderBlockText(act.methodStudent)}
                          </div>
                        </td>
                        <td className="border border-black p-1.5 align-top text-justify">
                          <div className="space-y-0.5">
                            {renderBlockText(act.materials)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {content.conclusion && (
            <div className="mt-6 p-3 bg-gray-50 border-l-4 border-gray-400 text-xs">
              <span className="font-bold">KẾT LUẬN (3 phút): </span>
              <MathText content={content.conclusion} inline />
            </div>
          )}
        </div>

        {/* Phần III: Kết thúc giảng bài */}
        <div className="pt-6 border-t">
          <h4 className="text-center font-bold text-base mb-1">Phần III</h4>
          <h4 className="text-center font-bold text-base uppercase mb-6 tracking-wide border-b pb-2">
            KẾT THÚC GIẢNG BÀI (7 phút)
          </h4>
          <div className="space-y-2.5 text-sm pl-4">
            <div><span className="font-bold">- Hệ thống nội dung bài giảng (2 phút): </span><MathText content={content.part3?.summary || ''} inline /></div>
            <div><span className="font-bold">- Giải đáp thắc mắc (2 phút): </span><MathText content={content.part3?.qa || ''} inline /></div>
            <div><span className="font-bold">- Định hướng nghiên cứu & chuẩn bị bài (2 phút): </span><MathText content={content.part3?.research || ''} inline /></div>
            <div><span className="font-bold">- Nhận xét, kết thúc bài giảng (1 phút): </span><MathText content={content.part3?.remarks || ''} inline /></div>
          </div>

          <div className="mt-12 flex flex-col items-end">
            <p className="italic text-xs mb-2">{metadata.composerDate || "Ngày ... tháng ... năm ..."}</p>
            <div className="text-center min-w-[250px] pr-8">
              <p className="font-bold uppercase mb-20 text-sm">NGƯỜI BIÊN SOẠN</p>
              <p className="font-bold text-base tracking-wide">{metadata.lecturerName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPreview;
