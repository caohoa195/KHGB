import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Shared server-side Gemini client with User-Agent header for telemetry
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    approvalSection: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: "Tóm tắt cực ngắn nội dung toàn bài" },
        skills: { type: Type.STRING, description: "Chuẩn đầu ra (1 dòng)" },
        method: { type: Type.STRING, description: "Phương pháp chính" },
        conclusion: { type: Type.STRING, description: "Kết luận phê duyệt" },
      },
      required: ["content", "skills", "method", "conclusion"]
    },
    part1: {
      type: Type.OBJECT,
      properties: {
        purpose: { type: Type.STRING },
        requirements: { type: Type.STRING, description: "3 dòng: - **Kiến thức:** ..., - **Kỹ năng:** ..., - **Thái độ:** ..." },
        content: { type: Type.STRING, description: "Danh sách các chương/mục lớn" },
        focus: { type: Type.STRING },
        organization: { type: Type.STRING },
        methodLecturer: { type: Type.STRING },
        methodStudent: { type: Type.STRING },
      },
      required: ["purpose", "requirements", "content", "focus", "organization", "methodLecturer", "methodStudent"]
    },
    part2: {
      type: Type.OBJECT,
      properties: {
        introContent: { type: Type.STRING },
        periods: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              periodNumber: { type: Type.INTEGER },
              objectives: { type: Type.STRING, description: "Mục tiêu cụ thể của tiết này" },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING, description: "Tên mục/nội dung chi tiết từ tài liệu" },
                    timeMinutes: { type: Type.INTEGER },
                    methodLecturer: { type: Type.STRING },
                    methodStudent: { type: Type.STRING },
                    materials: { type: Type.STRING },
                  },
                  required: ["content", "timeMinutes", "methodLecturer", "methodStudent", "materials"]
                },
              },
            },
            required: ["periodNumber", "objectives", "activities"]
          },
        },
      },
      required: ["introContent", "periods"]
    },
    conclusion: { type: Type.STRING },
    part3: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        qa: { type: Type.STRING },
        research: { type: Type.STRING },
        remarks: { type: Type.STRING },
      },
      required: ["summary", "qa", "research", "remarks"]
    },
  },
  required: ["approvalSection", "part1", "part2", "conclusion", "part3"]
};

const customPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    documentTitle: { type: Type.STRING, description: "Tiêu đề lớn của kế hoạch (chữ in hoa, ví dụ: BÀI GIẢNG hoặc KẾ HOẠCH BÀI DẠY)" },
    subtitle: { type: Type.STRING, description: "Tiêu đề phụ hoặc thông tin phân loại nếu có" },
    hasCoverPage: { type: Type.BOOLEAN, description: "True nếu tệp mẫu có trang bìa riêng biệt" },
    coverPage: {
      type: Type.OBJECT,
      description: "Dữ liệu trang bìa nếu mẫu có trang bìa",
      properties: {
        university: { type: Type.STRING, description: "Tên trường / Cơ quan cấp trên" },
        faculty: { type: Type.STRING, description: "Khoa / Đơn vị môn học" },
        title: { type: Type.STRING, description: "Tiêu đề trên bìa (BÀI GIẢNG / KẾ HOẠCH BÀI DẠY)" },
        courseName: { type: Type.STRING, description: "Học phần / Môn học" },
        lessonName: { type: Type.STRING, description: "Bài (Chuyên đề)" },
        targetAudience: { type: Type.STRING, description: "Đối tượng người học" },
        schoolYear: { type: Type.STRING, description: "Năm học" },
        lecturerName: { type: Type.STRING, description: "Giảng viên / Người biên soạn" },
        coverPlaceDate: { type: Type.STRING, description: "Địa danh, tháng năm trang bìa" },
      },
      required: ["university", "faculty", "title", "courseName", "lessonName", "targetAudience", "schoolYear", "lecturerName", "coverPlaceDate"]
    },
    hasApprovalPage: { type: Type.BOOLEAN, description: "Bắt buộc true để tạo trang phê duyệt" },
    approvalPage: {
      type: Type.OBJECT,
      description: "Dữ liệu phần phê duyệt nếu mẫu có",
      properties: {
        approvalDate: { type: Type.STRING, description: "Ngày tháng phê duyệt" },
        approverRole: { type: Type.STRING, description: "Chức vụ người phê duyệt" },
        approverName: { type: Type.STRING, description: "Họ tên người phê duyệt" },
        lessonName: { type: Type.STRING, description: "Tên bài được phê duyệt" },
        lecturerName: { type: Type.STRING, description: "Tên giảng viên" },
        location: { type: Type.STRING, description: "Địa điểm thông qua/phê duyệt" },
        contentSummary: { type: Type.STRING, description: "Tóm tắt nội dung phê duyệt" },
        skillsSummary: { type: Type.STRING, description: "Chuẩn đầu ra / Kỹ năng" },
        methodSummary: { type: Type.STRING, description: "Phương pháp giảng dạy được duyệt" },
        conclusion: { type: Type.STRING, description: "Kết luận phê duyệt" },
      },
      required: ["approvalDate", "approverRole", "approverName", "lessonName", "lecturerName", "location", "contentSummary", "skillsSummary", "methodSummary", "conclusion"]
    },
    metadata: {
      type: Type.ARRAY,
      description: "Các thông tin thuộc tính cơ bản",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING }
        },
        required: ["label", "value"]
      }
    },
    sections: {
      type: Type.ARRAY,
      description: "Danh sách các phần hoặc mục chính đúng theo thứ tự và cấu trúc của tệp mẫu",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING, description: "Tên mục chính xác theo mẫu (ví dụ: Phần I. Ý ĐỊNH GIẢNG BÀI, Phần II. THỰC HÀNH GIẢNG BÀI, hoặc I. MỤC TIÊU...)" },
          pageBreakBefore: { type: Type.BOOLEAN, description: "True nếu phần này bắt đầu trang mới" },
          content: { type: Type.STRING, description: "Nội dung văn bản chi tiết của mục" },
          subsections: {
            type: Type.ARRAY,
            description: "Các tiểu mục con nếu có",
            items: {
              type: Type.OBJECT,
              properties: {
                subtitle: { type: Type.STRING, description: "Tên tiểu mục con (ví dụ: 1. Mục đích, 2. Yêu cầu, hoặc a) Giảng viên...)" },
                content: { type: Type.STRING, description: "Nội dung chi tiết của tiểu mục" }
              },
              required: ["subtitle", "content"]
            }
          },
          table: {
            type: Type.OBJECT,
            description: "Bảng biểu tương ứng trong mẫu nếu có",
            properties: {
              headers: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            required: ["headers", "rows"]
          }
        },
        required: ["id", "title"]
      }
    },
    signatures: {
      type: Type.ARRAY,
      description: "Chữ ký hoặc thông tin người phê duyệt/người biên soạn ở cuối",
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, description: "Chức vụ (ví dụ: GIẢNG VIÊN BIÊN SOẠN, CHỦ NHIỆM BỘ MÔN)" },
          name: { type: Type.STRING, description: "Họ và tên" },
          locationDate: { type: Type.STRING, description: "Địa danh, ngày tháng" }
        },
        required: ["role", "name"]
      }
    },
    rawMarkdown: { type: Type.STRING, description: "Bản văn bản định dạng markdown hoàn chỉnh đầy đủ của tài liệu" }
  },
  required: ["documentTitle", "hasCoverPage", "coverPage", "hasApprovalPage", "approvalPage", "sections"]
};



const sanitizeOllamaUrl = (url?: string): string => {
  let clean = (url || "http://localhost:11434").trim().replace(/\/+$/, "");
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `http://${clean}`;
  }
  return clean;
};

const extractJsonFromText = (text: string): any => {
  let cleaned = (text || '').trim();
  if (cleaned.includes("```json")) {
    cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "");
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```\s*/g, "");
  }
  cleaned = cleaned.trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
};

// API Endpoint: Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// API Endpoint: Ollama Server-Side Proxy Health Check
app.post('/api/ollama/health', async (req: Request, res: Response) => {
  const { baseUrl } = req.body;
  const cleanUrl = sanitizeOllamaUrl(baseUrl);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const tagsRes = await fetch(`${cleanUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!tagsRes.ok) {
      return res.status(502).json({ ok: false, error: `Ollama trả về mã HTTP ${tagsRes.status}` });
    }
    const tagsData = await tagsRes.json();
    const models = (tagsData.models || []).map((m: any) => m.name || m.model || '');
    return res.json({ ok: true, models, version: '0.x' });
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: `Không thể kết nối tới Ollama tại ${cleanUrl}: ${err.message || 'Lỗi mạng'}`
    });
  }
});

// API Endpoint: Generate Lesson Plan
app.post('/api/generate-lesson-plan', async (req: Request, res: Response) => {
  try {
    const { metadata, sourceMaterial, aiConfig } = req.body;

    if (!metadata || !sourceMaterial) {
      return res.status(400).json({ error: 'Thiếu thông tin metadata hoặc tài liệu nguồn.' });
    }

    const truncatedMaterial = (sourceMaterial || '').substring(0, 25000);

    // 1. If provider is Ollama running via server proxy
    if (aiConfig?.provider === 'ollama') {
      const ollama = aiConfig.ollama || {};
      const cleanUrl = sanitizeOllamaUrl(ollama.baseUrl);
      const targetModel = (ollama.selectedModel === 'custom' ? ollama.customModel : ollama.selectedModel) || 'qwen2.5-coder:7b';

      const systemPrompt = `Bạn là chuyên gia sư phạm cao cấp biên soạn kế hoạch giảng bài đại học chuẩn mực.
BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM GIẢI THÍCH):
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

      const userPrompt = `Hãy biên soạn Kế hoạch Giảng bài chi tiết cho:
- Môn học: ${metadata.courseName || 'Học phần'}
- Tên bài: ${metadata.lessonName || 'Bài giảng'}
- Đối tượng: ${metadata.targetAudience || 'Sinh viên'}
- Tổng số tiết: ${metadata.totalPeriods} tiết (45 phút/tiết).
BẮT BUỘC mảng 'periods' trong 'part2' phải có ĐÚNG ${metadata.totalPeriods} tiết, phân bổ đều kiến thức từ đầu đến cuối tài liệu nguồn.
Nội dung cột 'content' trong từng hoạt động phải thật sự chi tiết, sâu sắc.

TÀI LIỆU NGUỒN:
${truncatedMaterial}`;

      try {
        const ollamaRes = await fetch(`${cleanUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            format: 'json',
            stream: false,
            options: {
              temperature: ollama.temperature ?? 0.15,
              num_ctx: ollama.numCtx || 16384,
            }
          })
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text().catch(() => '');
          throw new Error(`Ollama (${cleanUrl}) trả về HTTP ${ollamaRes.status}: ${errText || ollamaRes.statusText}`);
        }

        const data = await ollamaRes.json();
        const text = data?.message?.content || data?.response;
        const parsed = extractJsonFromText(text);

        // Ensure periods count
        if (!parsed.part2?.periods || !Array.isArray(parsed.part2.periods)) {
          if (!parsed.part2) parsed.part2 = { introContent: "Mở đầu tiết học", periods: [] };
          parsed.part2.periods = [];
        }
        while (parsed.part2.periods.length < metadata.totalPeriods) {
          const num = parsed.part2.periods.length + 1;
          parsed.part2.periods.push({
            periodNumber: num,
            objectives: `Mục tiêu tiết ${num}`,
            activities: [
              {
                content: `1. Nội dung chuyên sâu tiết ${num}\n2. Thực hành và bài tập`,
                timeMinutes: 45,
                methodLecturer: "Thuyết trình, hướng dẫn",
                methodStudent: "Lắng nghe, làm bài",
                materials: "Giáo trình, slide"
              }
            ]
          });
        }

        return res.json({ success: true, data: parsed });
      } catch (ollamaErr: any) {
        console.error("Lỗi khi gọi Ollama từ server:", ollamaErr);
        return res.status(502).json({
          error: `Không thể kết nối đến Ollama model ${targetModel} tại ${cleanUrl}: ${ollamaErr.message}. Vui lòng kiểm tra lệnh 'ollama serve' và đảm bảo đã tải model.`
        });
      }
    }

    // 2. Default Provider: Gemini API
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API_KEY_NOT_FOUND' });
    }

    const ai = getAiClient();

    const prompt = `
    Bạn là chuyên gia sư phạm cao cấp. Nhiệm vụ của bạn là xây dựng Bài giảng chi tiết dựa trên tài liệu nguồn.
    
    QUY TẮC BIÊN SOẠN BÀI GIẢNG VÀ PHÂN BỔ NỘI DUNG (TUYỆT ĐỐI BẮT BUỘC):
    1. Số tiết yêu cầu: ${metadata.totalPeriods} tiết. Bạn PHẢI tạo chính xác ${metadata.totalPeriods} đối tượng trong mảng 'periods'. Tổng thời gian mỗi tiết học phải đạt 45 phút (tổng các 'timeMinutes' trong mỗi tiết = 45).
    2. Chiến lược bao phủ toàn diện:
       - Chia đều toàn bộ kiến thức của tài liệu nguồn thành ${metadata.totalPeriods} tiết học logic, từ đầu đến kết thúc tài liệu.
       - Tiết cuối cùng (${metadata.totalPeriods}) PHẢI chứa nội dung kết thúc của tài liệu.
    3. ĐẶC BIỆT QUAN TRỌNG: CỘT 'THỨ TỰ, NỘI DUNG' ('content') PHẢI DÀY DẶN, CHI TIẾT, ĐẦY ĐỦ NỘI DUNG SƯ PHẠM (TUYỆT ĐỐI KHÔNG TÓM TẮT NGẮN NGỦN):
       - Trong mỗi hoạt động giảng dạy, cột 'content' phải là nội dung bài giảng chi tiết mà giảng viên đứng lớp trình bày.
       - BẮT BUỘC viết thành nhiều ý xuống dòng (dùng ký tự \n), phân chia rõ ràng các tiểu mục:
         + 1. Khái niệm / Định nghĩa / Bản chất vấn đề...
         + 2. Các đặc điểm, nguyên lý, cấu tạo, hoặc công thức toán học/khoa học... (kèm giải thích từng đại lượng)
         + 3. Quy trình thực hiện, phương pháp phân tích, các bước tiến hành...
         + 4. Ví dụ minh họa thực tế, bài tập áp dụng, tình huống thảo luận sâu sắc...
         + 5. Lưu ý quan trọng, các lỗi sai thường gặp, câu hỏi củng cố...
       - Mỗi hoạt động phải có dung lượng phong phú (từ 150 - 300 từ với đầy đủ kiến thức chuyên môn), phản ánh trọn vẹn tài liệu nguồn, xứng tầm bài giảng bậc đại học/chuyên nghiệp.
    4. XUỐNG DÒNG RÕ RÀNG Ở CÁC MỤC PHẦN I (MỤC ĐÍCH, NỘI DUNG, TRỌNG TÂM...):
       - 'purpose' (Mục đích): Trình bày mục đích tổng quát, chia thành các ý xuống dòng (\n) rõ ràng.
       - 'requirements' (Yêu cầu): BẮT BUỘC đúng 3 dòng:
         - **Kiến thức:** ...
         - **Kỹ năng:** ...
         - **Thái độ:** ...
       - 'content' (Nội dung của Phần I): TUYỆT ĐỐI KHÔNG viết thành một đoạn dính liền. BẮT BUỘC phân rã thành danh sách các đề mục kiến thức chính xuống dòng (\n) rõ ràng:
         - 1. [Tên mục 1]: Tóm tắt nội dung...
         - 2. [Tên mục 2]: Tóm tắt nội dung...
         - 3. [Tên mục 3]: Tóm tắt nội dung...
       - 'focus' (Trọng tâm của Phần I): Nêu rõ các kiến thức cốt lõi và kỹ năng then chốt, xuống dòng (\n) cho từng trọng tâm:
         - [Nội dung trọng tâm 1...]
         - [Nội dung trọng tâm 2...]
       - 'organization' (Tổ chức) và 'methodLecturer', 'methodStudent': Trình bày rõ ràng, xuống dòng cho các phương pháp chủ đạo.
    5. QUY TẮC HIỂN THỊ CÔNG THỨC TOÁN HỌC / KHOA HỌC (EQUATION):
       - Khi tài liệu có chứa công thức toán học, vật lý, hóa học, kỹ thuật, kinh tế... BẮT BUỘC đặt công thức trong dấu $...$ (nội dòng, ví dụ: $v = \\frac{s}{t}$, $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$, $a^2 + b^2 = c^2$, $E = mc^2$) hoặc $$...$$ (khối công thức riêng).
       - Sử dụng ký hiệu LaTeX chuẩn (\\frac{tử}{mẫu}, \\sqrt{...}, ^2, _1, \\pm, \\times, \\alpha, \\beta, \\Delta) để hệ thống tự động xuất thành đối tượng Equation chuẩn trong Microsoft Word và hiển thị toán học trực quan trên giao diện.

    TÀI LIỆU NGUỒN:
    ${truncatedMaterial}
    `;

    // Using free-tier models: gemini-3.8-flash with fallback to gemini-3.1-flash-lite
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.1,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error("Mô hình không phản hồi.");
        }

        const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.part2?.periods?.length !== metadata.totalPeriods) {
          console.warn(`AI tạo sai số tiết: ${parsed.part2?.periods?.length}/${metadata.totalPeriods}`);
        }

        return res.json({ success: true, data: parsed });
      } catch (err: any) {
        console.warn(`Thử mô hình ${model} thất bại:`, err?.message || err);
        lastError = err;
        if (err?.message?.includes("Lỗi cấu trúc dữ liệu")) {
          break;
        }
      }
    }

    console.error("Tất cả mô hình đều lỗi:", lastError);
    if (lastError?.message?.includes("429") || lastError?.message?.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED", message: "Đã đạt giới hạn yêu cầu của gói miễn phí. Vui lòng chờ 1-2 phút rồi thử lại." });
    }
    if (lastError?.message?.includes("depleted") || lastError?.message?.includes("402")) {
      return res.status(402).json({ error: "DEPLETED_CREDITS", message: "Hạn ngạch API đã dùng hết." });
    }
    if (lastError?.message?.includes("500") || lastError?.message?.includes("xhr") || lastError?.message?.includes("Rpc failed")) {
      return res.status(500).json({ error: "LỖI_HỆ_THỐNG_DỮ_LIỆU_LỚN" });
    }
    if (lastError?.message?.includes("Requested entity was not found") || lastError?.message?.includes("API key")) {
      return res.status(401).json({ error: "API_KEY_NOT_FOUND" });
    }

    return res.status(500).json({ error: lastError?.message || "Có lỗi xảy ra khi tạo bài giảng." });
  } catch (err: any) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
  }
});

// API Endpoint: Generate Lesson Plan From Custom Template (PDF / Word)
app.post('/api/generate-from-template', async (req: Request, res: Response) => {
  try {
    const { templateText, sourceMaterial, customConfig, metadata, aiConfig } = req.body;

    if (!templateText || !templateText.trim()) {
      return res.status(400).json({ error: 'Vui lòng tải lên hoặc cung cấp nội dung tệp mẫu (Word hoặc PDF).' });
    }

    if (!sourceMaterial || !sourceMaterial.trim()) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tài liệu nguồn để tổng hợp nội dung kế hoạch.' });
    }

    const truncatedTemplate = (templateText || '').substring(0, 30000);
    const truncatedSource = (sourceMaterial || '').substring(0, 35000);

    // 1. If provider is Ollama
    if (aiConfig?.provider === 'ollama') {
      const ollama = aiConfig.ollama || {};
      const cleanUrl = sanitizeOllamaUrl(ollama.baseUrl);
      const targetModel = (ollama.selectedModel === 'custom' ? ollama.customModel : ollama.selectedModel) || 'qwen2.5-coder:7b';

      const systemPrompt = `Bạn là chuyên gia sư phạm và biên soạn kế hoạch bài dạy / bài giảng đại học.
Nhiệm vụ: Dựa vào TỆP MẪU được cung cấp, giữ nguyên 100% cấu trúc đề mục và bảng biểu của mẫu; thay thế các thông tin từ bàn phím và điền đầy đủ nội dung từ TÀI LIỆU NGUỒN.
BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM LỜI DẪN, KHÔNG KÈM GIẢI THÍCH):
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
      "id": "sec_1",
      "title": "Tên mục chính xác theo tệp mẫu",
      "content": "Nội dung chi tiết",
      "table": {
        "headers": ["Thứ tự, nội dung", "Thời gian", "PP Giảng viên", "PP Học viên", "Vật chất"],
        "rows": [
          ["1. Nội dung chi tiết...", "45 phút", "Thuyết trình", "Ghi chép", "Tài liệu"]
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

      const userPrompt = `==================== TỆP MẪU ====================
${truncatedTemplate}
==================================================

THÔNG TIN BÀN PHÍM:
- Trường: ${metadata?.university || ''}
- Khoa: ${metadata?.faculty || ''}
- Môn: ${metadata?.courseName || ''}
- Tên bài: ${metadata?.lessonName || ''}
- Đối tượng: ${metadata?.targetAudience || ''}
- Giảng viên: ${metadata?.lecturerName || ''}
- Tổng số tiết: ${metadata?.totalPeriods || 2} tiết

==================== TÀI LIỆU NGUỒN ====================
${truncatedSource}
========================================================

HÃY LẬP JSON KẾ HOẠCH BÀI GIẢNG KHỚP 100% VỚI KHUNG MẪU TRÊN.`;

      try {
        const ollamaRes = await fetch(`${cleanUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            format: 'json',
            stream: false,
            options: {
              temperature: ollama.temperature ?? 0.15,
              num_ctx: ollama.numCtx || 16384,
            }
          })
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text().catch(() => '');
          throw new Error(`Ollama (${cleanUrl}) trả về HTTP ${ollamaRes.status}: ${errText || ollamaRes.statusText}`);
        }

        const data = await ollamaRes.json();
        const text = data?.message?.content || data?.response;
        const parsed = extractJsonFromText(text);

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
        if (!parsed.approvalPage.contentSummary) parsed.approvalPage.contentSummary = `Nội dung: ${metadata?.lessonName || 'bài giảng'}`;
        if (!parsed.approvalPage.skillsSummary) parsed.approvalPage.skillsSummary = 'Phát triển năng lực chuyên môn và tư duy';
        if (!parsed.approvalPage.methodSummary) parsed.approvalPage.methodSummary = 'Kết hợp thuyết trình và phát vấn gợi mở';
        if (!parsed.approvalPage.conclusion) parsed.approvalPage.conclusion = 'Nhất trí thông qua bài giảng.';

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

        return res.json({ success: true, data: parsed });
      } catch (ollamaErr: any) {
        console.error("Lỗi khi gọi Ollama từ server (custom template):", ollamaErr);
        return res.status(502).json({
          error: `Không thể kết nối đến Ollama model ${targetModel} tại ${cleanUrl}: ${ollamaErr.message}. Vui lòng kiểm tra lệnh 'ollama serve' và đảm bảo đã tải model.`
        });
      }
    }

    // 2. Default Provider: Gemini API
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API_KEY_NOT_FOUND' });
    }

    const ai = getAiClient();

    const userKeyboardInfo = metadata ? `
THÔNG TIN NGƯỜI DÙNG NHẬP TỪ BÀN PHÍM (BẮT BUỘC ĐIỀN VÀO MẪU):
- Tên trường: ${metadata.university || ''}
- Khoa / Tổ bộ môn: ${metadata.faculty || ''}
- Học phần / Môn học: ${metadata.courseName || ''}
- Tên bài (Chuyên đề): ${metadata.lessonName || ''}
- Đối tượng người học: ${metadata.targetAudience || ''}
- Năm học: ${metadata.schoolYear || ''}
- Giảng viên / Người biên soạn: ${metadata.lecturerName || ''}
- Tổng số tiết: ${metadata.totalPeriods || 2} tiết (45 phút/tiết)
- Chức vụ người phê duyệt: ${metadata.approverRole || ''}
- Họ tên người phê duyệt: ${metadata.approverName || ''}
- Ngày tháng phê duyệt: ${metadata.approvalDate || ''}
- Địa điểm thông qua/phê duyệt: ${metadata.location || ''}
- Ngày biên soạn: ${metadata.composerDate || ''}
- Địa danh ngày tháng trang bìa: ${metadata.coverPlaceDate || ''}
` : '';

    const configInfo = customConfig ? `
THÔNG TIN TÙY CHỈNH THÊM:
- Tiêu đề kế hoạch: ${customConfig.planTitle || ''}
- Môn học / Học phần: ${customConfig.courseName || ''}
- Giảng viên / Giáo viên: ${customConfig.lecturerName || ''}
- Đối tượng: ${customConfig.targetAudience || ''}
- Thời lượng: ${customConfig.totalPeriods ? `${customConfig.totalPeriods} tiết` : ''}
- Yêu cầu sư phạm đặc biệt: ${customConfig.specialRequirements || ''}
` : '';

    const prompt = `
Bạn là chuyên gia sư phạm và biên soạn kế hoạch bài dạy / bài giảng chuyên nghiệp hàng đầu.
YÊU CẦU QUAN TRỌNG NHẤT: BÀI GIẢNG XUẤT RA PHẢI KHỚP 100% VỚI KHUNG MẪU ĐÃ CUNG CẤP VÀ THAY THẾ NỘI DUNG TỪ BÀN PHÍM VÀ TÀI LIỆU NGUỒN.

==================== TỆP MẪU (WORD / PDF ĐƯỢC CUNG CẤP) ====================
${truncatedTemplate}
=============================================================================

${userKeyboardInfo}

${configInfo}

=========================== TÀI LIỆU NGUỒN BÀI HỌC ===========================
${truncatedSource}
=============================================================================

QUY TẮC BẮT BUỘC ĐỂ ĐẢM BẢO KHỚP CHÍNH XÁC MẪU (TUYỆT ĐỐI TUÂN THỦ):
1. BẮT BUỘC TẠO 2 TRANG BÌA (TRANG 1: BÌA VÀ TRANG 2: PHÊ DUYỆT):
   - 'hasCoverPage': BẮT BUỘC ĐẶT LÀ true.
   - 'coverPage': Điền toàn bộ thông tin người dùng nhập từ bàn phím:
     + university: "${metadata?.university || 'TRƯỜNG ĐẠI HỌC KHÁNH HÒA'}"
     + faculty: "${metadata?.faculty || 'KHOA SƯ PHẠM'}"
     + title: "BÀI GIẢNG"
     + courseName: "${metadata?.courseName || ''}"
     + lessonName: "${metadata?.lessonName || ''}"
     + targetAudience: "${metadata?.targetAudience || ''}"
     + schoolYear: "${metadata?.schoolYear || ''}"
     + lecturerName: "${metadata?.lecturerName || ''}"
     + coverPlaceDate: "${metadata?.coverPlaceDate || ''}"
   - 'hasApprovalPage': BẮT BUỘC ĐẶT LÀ true.
   - 'approvalPage': Điền đầy đủ thông tin bàn phím và tóm tắt sư phạm:
     + approvalDate: "${metadata?.approvalDate || 'Ngày ... tháng ... năm ...'}"
     + approverRole: "${metadata?.approverRole || 'CHỦ NHIỆM BỘ MÔN'}"
     + approverName: "${metadata?.approverName || ''}"
     + lessonName: "${metadata?.lessonName || ''}"
     + lecturerName: "${metadata?.lecturerName || ''}"
     + location: "${metadata?.location || 'Khánh Hòa'}"
     + contentSummary: Tóm tắt nội dung chính của bài giảng từ tài liệu nguồn cung cấp
     + skillsSummary: Kỹ năng và chuẩn đầu ra đạt được từ bài học
     + methodSummary: Phương pháp giảng dạy
     + conclusion: "Nhất trí thông qua bài giảng."

2. TỪ TRANG 3 TRỞ ĐI: CÁC PHẦN VÀ MỤC NỘI DUNG ('sections'):
   - BẮT BUỘC GIỮ NGUYÊN 100% CẤU TRÚC ĐỀ MỤC VÀ BẢNG BIỂU CỦA TỆP MẪU CUNG CẤP (tên các Phần I, II, III... hoặc các mục I, II, III, IV... và các cột trong bảng biểu của mẫu).
   - TUYỆT ĐỐI KHÔNG ĐƯA Trang bìa hay Trang phê duyệt vào mảng 'sections' (vì chúng đã được xử lý ở 2 trang bìa riêng biệt).
   - Nếu mẫu có chia theo các tiết học (ví dụ: Tiết 1, Tiết 2... ứng với tổng số tiết ${metadata?.totalPeriods || 2} tiết), hãy chia đều nội dung tài liệu nguồn thành đúng số tiết đó.

3. XỬ LÝ BẢNG BIỂU & CỘT 'THỨ TỰ, NỘI DUNG' (BẮT BUỘC VIẾT DÀY DẶN, ĐẦY ĐỦ, CHI TIẾT NHƯ GIÁO ÁN MẪU):
   - Khi tệp mẫu có bảng biểu (ví dụ bảng 5 cột: "Thứ tự, nội dung", "Thời gian", "PP Giảng viên", "PP Học viên", "Vật chất" HOẶC bảng tiến trình hoạt động 4-5 cột):
     + 'headers': BẮT BUỘC giữ đúng tên các cột của bảng trong mẫu.
     + 'rows': Mảng 2 chiều chứa các hàng dữ liệu chi tiết cho từng nội dung/hoạt động được trích xuất từ tài liệu nguồn.
     + ĐẶC BIỆT: Cột 'Thứ tự, nội dung' trong bảng tiến trình giảng dạy TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt ngắn ngủn vài dòng! BẮT BUỘC viết đầy đủ hệ thống đề mục, khái niệm, công thức, nguyên lý, quy trình, ví dụ phân tích cụ thể, câu hỏi tư duy... xuống dòng (\n) rõ ràng cho từng ý để giáo viên có thể giảng dạy trực tiếp.

4. XUỐNG DÒNG RÕ RÀNG Ở CÁC MỤC (NỘI DUNG, TRỌNG TÂM, MỤC ĐÍCH...):
   - Trong các mục như 'Mục đích', 'Nội dung', 'Trọng tâm', 'Phương pháp'... TUYỆT ĐỐI KHÔNG gộp các ý thành một đoạn văn dính liền.
   - BẮT BUỘC xuống dòng rõ ràng (dùng \n) giữa các ý (ví dụ: 1. ..., 2. ..., 3. ... hoặc các gạch đầu dòng - ...).
   - Nghiên cứu sâu tài liệu nguồn để lấy toàn bộ kiến thức, khái niệm, kỹ năng, hoạt động, câu hỏi, bài tập và lấp đầy từng mục và từng ô của bảng biểu trong mẫu. Viết đầy đặn, giàu tính sư phạm, không để mục trống.

5. QUY TẮC HIỂN THỊ CÔNG THỨC TOÁN HỌC / KHOA HỌC (EQUATION):
   - Khi tài liệu nguồn có chứa công thức toán học, vật lý, hóa học, kỹ thuật, thống kê, kinh tế... BẮT BUỘC đặt công thức trong dấu $...$ (nội dòng, ví dụ: $v = \\frac{s}{t}$, $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$, $a^2 + b^2 = c^2$, $E = mc^2$, $\\alpha, \\beta$) hoặc $$...$$ (khối riêng).
   - Sử dụng cú pháp LaTeX chuẩn (\\frac{tử}{mẫu}, \\sqrt{...}, ^2, _1, \\pm, \\times, \\alpha, \\beta, \\Delta) để hệ thống tự động render thành công thức toán học trực quan trên màn hình và xuất sang tệp Word dưới dạng đối tượng Equation chuẩn (m:oMath).
`;



    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: customPlanResponseSchema,
            temperature: 0.15,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error("Mô hình không phản hồi.");
        }

        const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        const parsed = JSON.parse(jsonStr);

        // ENFORCE 100% RELIABILITY: Always guarantee Trang 1 (Bìa) and Trang 2 (Phê duyệt)
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
          parsed.approvalPage.contentSummary = `Nội dung: ${metadata?.lessonName || 'bài giảng'} theo chương trình chi tiết môn học`;
        }
        if (!parsed.approvalPage.skillsSummary) {
          parsed.approvalPage.skillsSummary = 'Rèn luyện kỹ năng thực hành và kiến thức chuyên môn';
        }
        if (!parsed.approvalPage.methodSummary) {
          parsed.approvalPage.methodSummary = 'Kết hợp thuyết trình, phát vấn, trực quan và thảo luận';
        }
        if (!parsed.approvalPage.conclusion) {
          parsed.approvalPage.conclusion = 'Nhất trí thông qua bài giảng.';
        }

        // Filter out accidental duplicate cover/approval sections from the body
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

        return res.json({ success: true, data: parsed });
      } catch (err: any) {
        console.warn(`Thử mô hình ${model} (kế hoạch theo mẫu) thất bại:`, err?.message || err);
        lastError = err;
      }
    }

    console.error("Tất cả mô hình đều lỗi (custom template):", lastError);
    if (lastError?.message?.includes("429") || lastError?.message?.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED", message: "Đã đạt giới hạn yêu cầu của gói miễn phí. Vui lòng chờ 1-2 phút rồi thử lại." });
    }
    if (lastError?.message?.includes("depleted") || lastError?.message?.includes("402")) {
      return res.status(402).json({ error: "DEPLETED_CREDITS", message: "Hạn ngạch API đã dùng hết." });
    }
    if (lastError?.message?.includes("500") || lastError?.message?.includes("xhr") || lastError?.message?.includes("Rpc failed")) {
      return res.status(500).json({ error: "LỖI_HỆ_THỐNG_DỮ_LIỆU_LỚN" });
    }
    if (lastError?.message?.includes("Requested entity was not found") || lastError?.message?.includes("API key")) {
      return res.status(401).json({ error: "API_KEY_NOT_FOUND" });
    }

    return res.status(500).json({ error: lastError?.message || "Có lỗi xảy ra khi tạo kế hoạch theo mẫu." });
  } catch (err: any) {
    console.error("Custom Template API Error:", err);
    return res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
  }
});

// Vite middleware in dev or static files in production
const setupServer = async () => {

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
};

setupServer().catch((err) => {
  console.error("Failed to start server:", err);
});
