import { LessonMetadata, GeneratedContent, CustomGeneratedPlan, OllamaConfig } from "../types";

export interface OllamaConnectionResult {
  ok: boolean;
  version?: string;
  models?: string[];
  error?: string;
  corsHelp?: boolean;
}

const sanitizeBaseUrl = (url: string): string => {
  let clean = (url || "http://localhost:11434").trim();
  clean = clean.replace(/\/+$/, "");
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `http://${clean}`;
  }
  return clean;
};

/**
 * Tests connection to an Ollama server either directly from the browser or via server proxy
 */
export const testOllamaConnection = async (
  baseUrl: string,
  mode: 'direct' | 'proxy' = 'direct'
): Promise<OllamaConnectionResult> => {
  const cleanUrl = sanitizeBaseUrl(baseUrl);

  if (mode === 'proxy') {
    try {
      const res = await fetch('/api/ollama/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: cleanUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        return {
          ok: true,
          version: data.version || '0.x',
          models: data.models || [],
        };
      }
      return {
        ok: false,
        error: data.error || 'Máy chủ không thể kết nối tới Ollama tại ' + cleanUrl,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Lỗi gửi yêu cầu kiểm tra tới proxy máy chủ',
      };
    }
  }

  // Direct fetch from browser to Ollama endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const [tagsRes, versionRes] = await Promise.all([
      fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      }).catch((err) => {
        throw err;
      }),
      fetch(`${cleanUrl}/api/version`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null),
    ]);

    clearTimeout(timeoutId);

    if (!tagsRes.ok) {
      return {
        ok: false,
        error: `Ollama trả về mã lỗi HTTP ${tagsRes.status}: ${tagsRes.statusText}`,
      };
    }

    const tagsData = await tagsRes.json().catch(() => ({ models: [] }));
    let version = '0.x';
    if (versionRes && versionRes.ok) {
      const vData = await versionRes.json().catch(() => ({}));
      version = vData.version || '0.x';
    }

    const modelNames = (tagsData.models || []).map((m: any) => m.name || m.model || '');

    return {
      ok: true,
      version,
      models: modelNames,
    };
  } catch (err: any) {
    console.warn("Direct Ollama ping failed:", err);
    const isCorsOrNetwork =
      err.name === 'AbortError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.name === 'TypeError';

    return {
      ok: false,
      corsHelp: isCorsOrNetwork,
      error: isCorsOrNetwork
        ? `Không thể kết nối trực tiếp đến ${cleanUrl}. Có thể do Ollama chưa bật CORS (OLLAMA_ORIGINS="*") hoặc chưa khởi động dịch vụ.`
        : err.message || 'Không thể kết nối đến Ollama',
    };
  }
};

/**
 * Fetches list of models installed locally in Ollama
 */
export const fetchInstalledOllamaModels = async (
  baseUrl: string,
  mode: 'direct' | 'proxy' = 'direct'
): Promise<string[]> => {
  const result = await testOllamaConnection(baseUrl, mode);
  return result.models || [];
};

/**
 * Robust JSON parser for local LLM output
 */
export function extractAndParseJson<T>(rawText: string): T {
  if (!rawText || !rawText.trim()) {
    throw new Error("Mô hình Ollama không trả về nội dung.");
  }

  let cleaned = rawText.trim();

  // Strip Markdown code blocks if present
  if (cleaned.includes("```json")) {
    cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```\s*/g, "");
  }

  cleaned = cleaned.trim();

  // Locate the first '{' and last '}'
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Attempt direct JSON parse
  try {
    return JSON.parse(cleaned) as T;
  } catch (initialErr) {
    // Attempt basic JSON sanitization (remove trailing commas, fix unescaped newlines in strings)
    try {
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1') // remove trailing commas before } or ]
        .replace(/[\u0000-\u001F]+/g, (match) => {
          if (match === '\n' || match === '\r' || match === '\t') return match;
          return '';
        });
      return JSON.parse(sanitized) as T;
    } catch (secondErr: any) {
      console.error("Failed to parse JSON from Ollama:", rawText);
      throw new Error(`Dữ liệu JSON trả về từ Ollama bị lỗi định dạng: ${secondErr.message || 'Cấu trúc không hợp lệ'}`);
    }
  }
}

/**
 * Executes chat generation directly on local Ollama
 */
export async function queryOllamaDirect(
  ollamaConfig: OllamaConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const cleanUrl = sanitizeBaseUrl(ollamaConfig.baseUrl);
  const targetModel = (ollamaConfig.selectedModel === 'custom'
    ? ollamaConfig.customModel
    : ollamaConfig.selectedModel) || 'qwen2.5-coder:7b';

  const payload = {
    model: targetModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    format: "json",
    stream: false,
    options: {
      temperature: ollamaConfig.temperature ?? 0.15,
      num_ctx: ollamaConfig.numCtx || 16384,
    },
  };

  const response = await fetch(`${cleanUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama trả về lỗi HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const text = data?.message?.content || data?.response;
  if (!text) {
    throw new Error("Ollama phản hồi rỗng.");
  }
  return text;
}

/**
 * Generates Standard Lesson Plan directly via Ollama
 */
export async function generateLessonPlanDirectOllama(
  metadata: LessonMetadata,
  sourceMaterial: string,
  ollamaConfig: OllamaConfig
): Promise<GeneratedContent> {
  const truncatedMaterial = (sourceMaterial || '').substring(0, 25000);

  const systemPrompt = `Bạn là chuyên gia sư phạm cao cấp biên soạn kế hoạch giảng bài đại học chuẩn mực.
BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM LỜI DẪN, KHÔNG KÈM GIẢI THÍCH).
JSON PHẢI CÓ CẤU TRÚC SAU:
{
  "approvalSection": {
    "content": "Tóm tắt cực ngắn nội dung toàn bài",
    "skills": "Chuẩn đầu ra và kỹ năng đạt được",
    "method": "Phương pháp giảng dạy chủ đạo",
    "conclusion": "Nhất trí thông qua bài giảng."
  },
  "part1": {
    "purpose": "Mục đích tổng quát bài học, chia thành các ý xuống dòng (\\n)",
    "requirements": "- **Kiến thức:** ...\\n- **Kỹ năng:** ...\\n- **Thái độ:** ...",
    "content": "- 1. [Tên mục 1]: Tóm tắt...\\n- 2. [Tên mục 2]: Tóm tắt...",
    "focus": "Trọng tâm bài giảng, xuống dòng cho từng ý",
    "organization": "Tổ chức lớp học",
    "methodLecturer": "Phương pháp của giảng viên",
    "methodStudent": "Phương pháp của người học"
  },
  "part2": {
    "introContent": "Giới thiệu mở đầu bài học (khoảng 5 phút)",
    "periods": [
      {
        "periodNumber": 1,
        "objectives": "Mục tiêu cụ thể của tiết này",
        "activities": [
          {
            "content": "Nội dung bài giảng chi tiết, dày dặn từ 150-300 từ, có công thức toán/khoa học dạng $...$ nếu có",
            "timeMinutes": 45,
            "methodLecturer": "Thuyết trình, vấn đáp, thị phạm",
            "methodStudent": "Lắng nghe, ghi chép, thảo luận",
            "materials": "Giáo trình, slide, máy chiếu"
          }
        ]
      }
    ]
  },
  "conclusion": "Kết luận kết thúc bài giảng (khoảng 3 phút)",
  "part3": {
    "summary": "Hệ thống nội dung bài học",
    "qa": "Giải đáp thắc mắc",
    "research": "Định hướng học tập và nghiên cứu",
    "remarks": "Nhận xét buổi học"
  }
}`;

  const userPrompt = `
Hãy biên soạn Kế hoạch Giảng bài chi tiết cho:
- Môn học: ${metadata.courseName || 'Học phần'}
- Tên bài: ${metadata.lessonName || 'Bài giảng'}
- Đối tượng: ${metadata.targetAudience || 'Sinh viên'}
- Tổng số tiết: ${metadata.totalPeriods} tiết (45 phút/tiết).
BẮT BUỘC mảng 'periods' trong 'part2' phải có ĐÚNG ${metadata.totalPeriods} tiết, phân bổ đều kiến thức từ đầu đến cuối tài liệu nguồn.
Nội dung cột 'content' trong từng hoạt động phải thật sự chi tiết, sâu sắc, không tóm tắt sơ sài.

TÀI LIỆU NGUỒN:
${truncatedMaterial}
`;

  const rawJson = await queryOllamaDirect(ollamaConfig, systemPrompt, userPrompt);
  const parsed = extractAndParseJson<GeneratedContent>(rawJson);

  // Guarantee required fields
  if (!parsed.approvalSection) {
    parsed.approvalSection = {
      content: metadata.lessonName || "Nội dung bài giảng",
      skills: "Nắm vững lý thuyết và kỹ năng thực hành",
      method: "Thuyết trình tích cực, đàm thoại gợi mở",
      conclusion: "Nhất trí thông qua bài giảng."
    };
  }
  if (!parsed.part1) {
    parsed.part1 = {
      purpose: "Trang bị cho sinh viên kiến thức chuyên sâu và phương pháp ứng dụng",
      requirements: "- **Kiến thức:** Nắm vững các khái niệm cơ bản.\n- **Kỹ năng:** Vận dụng giải quyết bài toán thực tế.\n- **Thái độ:** Nghiêm túc, chủ động tìm tòi.",
      content: "- 1. Kiến thức nền tảng\n- 2. Phương pháp thực hành\n- 3. Ứng dụng thực tiễn",
      focus: "- Nắm vững bản chất nguyên lý\n- Kỹ năng xử lý bài tập",
      organization: "Tập trung tại giảng đường",
      methodLecturer: "Thuyết trình, thị phạm, gợi mở",
      methodStudent: "Lắng nghe, thảo luận nhóm, làm bài tập"
    };
  }
  if (!parsed.part2 || !Array.isArray(parsed.part2.periods)) {
    parsed.part2 = {
      introContent: "Ổn định lớp, kiểm tra sĩ số, dẫn nhập nội dung bài học.",
      periods: []
    };
  }

  // Ensure correct number of periods
  if (parsed.part2.periods.length < metadata.totalPeriods) {
    const startNum = parsed.part2.periods.length + 1;
    for (let p = startNum; p <= metadata.totalPeriods; p++) {
      parsed.part2.periods.push({
        periodNumber: p,
        objectives: `Hoàn thiện nội dung chuyên môn phần ${p}`,
        activities: [
          {
            content: `1. Phân tích nội dung chuyên sâu tiết ${p}\n2. Bài tập vận dụng và giải đáp vướng mắc\n3. Đánh giá kết quả tiếp thu.`,
            timeMinutes: 45,
            methodLecturer: "Giảng giải, giao nhiệm vụ, hướng dẫn",
            methodStudent: "Thực hành, tương tác, làm việc nhóm",
            materials: "Tài liệu học tập, slide bài giảng"
          }
        ]
      });
    }
  }

  if (!parsed.conclusion) {
    parsed.conclusion = "Tổng kết toàn bộ nội dung trọng tâm của bài giảng, nhấn mạnh các điểm then chốt cần ghi nhớ.";
  }
  if (!parsed.part3) {
    parsed.part3 = {
      summary: "Hệ thống hóa toàn bộ kiến thức theo sơ đồ tư duy.",
      qa: "Giải đáp các câu hỏi thắc mắc của người học.",
      research: "Đọc thêm tài liệu tham khảo và làm bài tập về nhà.",
      remarks: "Nhận xét tinh thần học tập và thái độ của lớp học."
    };
  }

  return parsed;
}

/**
 * Generates Plan from Custom Template directly via Ollama
 */
export async function generatePlanFromCustomTemplateDirectOllama(
  templateText: string,
  sourceMaterial: string,
  metadata: LessonMetadata | undefined,
  ollamaConfig: OllamaConfig
): Promise<CustomGeneratedPlan> {
  const truncatedTemplate = (templateText || '').substring(0, 25000);
  const truncatedSource = (sourceMaterial || '').substring(0, 30000);

  const systemPrompt = `Bạn là chuyên gia sư phạm và biên soạn kế hoạch bài dạy / bài giảng đại học.
Nhiệm vụ: Dựa vào TỆP MẪU được cung cấp, giữ nguyên 100% cấu trúc đề mục và bảng biểu của mẫu; thay thế các thông tin từ bàn phím và điền đầy đủ nội dung từ TÀI LIỆU NGUỒN.
BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM GIẢI THÍCH):
{
  "documentTitle": "BÀI GIẢNG",
  "hasCoverPage": true,
  "coverPage": {
    "university": "${metadata?.university || 'TRƯỜNG ĐẠI HỌC KHÁNH HÒA'}",
    "faculty": "${metadata?.faculty || 'KHOA SƯ PHẠM'}",
    "title": "BÀI GIẢNG",
    "courseName": "${metadata?.courseName || ''}",
    "lessonName": "${metadata?.lessonName || ''}",
    "targetAudience": "${metadata?.targetAudience || ''}",
    "schoolYear": "${metadata?.schoolYear || ''}",
    "lecturerName": "${metadata?.lecturerName || ''}",
    "coverPlaceDate": "${metadata?.coverPlaceDate || ''}"
  },
  "hasApprovalPage": true,
  "approvalPage": {
    "approvalDate": "${metadata?.approvalDate || 'Ngày ... tháng ... năm ...'}",
    "approverRole": "${metadata?.approverRole || 'CHỦ NHIỆM BỘ MÔN'}",
    "approverName": "${metadata?.approverName || ''}",
    "lessonName": "${metadata?.lessonName || ''}",
    "lecturerName": "${metadata?.lecturerName || ''}",
    "location": "${metadata?.location || 'Khánh Hòa'}",
    "contentSummary": "Tóm tắt nội dung bài giảng",
    "skillsSummary": "Kỹ năng đạt được",
    "methodSummary": "Phương pháp giảng dạy",
    "conclusion": "Nhất trí thông qua bài giảng."
  },
  "metadata": [],
  "sections": [
    {
      "id": "section_1",
      "title": "Tên mục chính xác theo tệp mẫu",
      "content": "Nội dung văn bản chi tiết nếu có",
      "table": {
        "headers": ["Thứ tự, nội dung", "Thời gian", "PP Giảng viên", "PP Học viên", "Vật chất"],
        "rows": [
          ["1. Nội dung chi tiết dày dặn...", "45 phút", "Thuyết trình, hướng dẫn", "Lắng nghe, ghi chép", "Giáo trình"]
        ]
      }
    }
  ],
  "signatures": [
    {
      "role": "GIẢNG VIÊN BIÊN SOẠN",
      "name": "${metadata?.lecturerName || ''}",
      "locationDate": "${metadata?.composerDate || ''}"
    }
  ]
}`;

  const userPrompt = `
==================== TỆP MẪU ĐƯỢC CUNG CẤP ====================
${truncatedTemplate}
================================================================

======================= TÀI LIỆU NGUỒN =======================
${truncatedSource}
================================================================

HÃY LẬP JSON KẾ HOẠCH BÀI GIẢNG HOÀN CHỈNH KHỚP VỚI MẪU TRÊN.
`;

  const rawJson = await queryOllamaDirect(ollamaConfig, systemPrompt, userPrompt);
  const parsed = extractAndParseJson<CustomGeneratedPlan>(rawJson);

  // Guarantee 100% cover and approval pages
  parsed.hasCoverPage = true;
  if (!parsed.coverPage) parsed.coverPage = {} as any;
  parsed.coverPage.university = metadata?.university || parsed.coverPage.university || 'TRƯỜNG ĐẠI HỌC KHÁNH HÒA';
  parsed.coverPage.faculty = metadata?.faculty || parsed.coverPage.faculty || 'KHOA SƯ PHẠM';
  parsed.coverPage.title = parsed.coverPage.title || 'BÀI GIẢNG';
  parsed.coverPage.courseName = metadata?.courseName || parsed.coverPage.courseName || '';
  parsed.coverPage.lessonName = metadata?.lessonName || parsed.coverPage.lessonName || '';
  parsed.coverPage.targetAudience = metadata?.targetAudience || parsed.coverPage.targetAudience || '';
  parsed.coverPage.schoolYear = metadata?.schoolYear || parsed.coverPage.schoolYear || '';
  parsed.coverPage.lecturerName = metadata?.lecturerName || parsed.coverPage.lecturerName || '';
  parsed.coverPage.coverPlaceDate = metadata?.coverPlaceDate || parsed.coverPage.coverPlaceDate || '';

  parsed.hasApprovalPage = true;
  if (!parsed.approvalPage) parsed.approvalPage = {} as any;
  parsed.approvalPage.approvalDate = metadata?.approvalDate || parsed.approvalPage.approvalDate || 'Ngày ... tháng ... năm ...';
  parsed.approvalPage.approverRole = metadata?.approverRole || parsed.approvalPage.approverRole || 'CHỦ NHIỆM BỘ MÔN';
  parsed.approvalPage.approverName = metadata?.approverName || parsed.approvalPage.approverName || '';
  parsed.approvalPage.lessonName = metadata?.lessonName || parsed.approvalPage.lessonName || '';
  parsed.approvalPage.lecturerName = metadata?.lecturerName || parsed.approvalPage.lecturerName || '';
  parsed.approvalPage.location = metadata?.location || parsed.approvalPage.location || 'Khánh Hòa';
  if (!parsed.approvalPage.contentSummary) {
    parsed.approvalPage.contentSummary = `Nội dung: ${metadata?.lessonName || 'bài giảng'} theo chương trình đào tạo`;
  }
  if (!parsed.approvalPage.skillsSummary) {
    parsed.approvalPage.skillsSummary = 'Phát triển năng lực chuyên môn và tư duy phân tích';
  }
  if (!parsed.approvalPage.methodSummary) {
    parsed.approvalPage.methodSummary = 'Kết hợp thuyết trình, gợi mở và bài tập tình huống';
  }
  if (!parsed.approvalPage.conclusion) {
    parsed.approvalPage.conclusion = 'Nhất trí thông qua bài giảng.';
  }

  // Filter out accidental duplicate cover/approval sections
  if (parsed.sections && Array.isArray(parsed.sections)) {
    parsed.sections = parsed.sections.filter((sec: any) => {
      const lower = (sec.title || '').toLowerCase().trim();
      return !lower.includes('trang bìa') && 
             !lower.includes('trang bià') && 
             !lower.startsWith('bìa') &&
             !lower.startsWith('phê duyệt') &&
             !lower.startsWith('phe duyet');
    });
  }

  return parsed;
}
