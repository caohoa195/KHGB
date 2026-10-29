export interface LessonMetadata {
  university: string;
  faculty: string;
  courseName: string; // Học phần
  lessonName: string; // Bài (Chuyên đề)
  targetAudience: string; // Đối tượng
  schoolYear: string; // Năm học
  lecturerName: string;
  approverName: string;
  approverRole: string; // e.g., CHỦ NHIỆM BM TOÁN - LÝ
  approvalDate: string; // ngày ... tháng ...
  location: string; // Địa điểm phê duyệt/thông qua
  totalPeriods: number; // Tổng số tiết
  composerDate: string; // Ngày tháng năm biên soạn (Input manual for end of doc)
  coverPlaceDate: string; // e.g. KHÁNH HÒA, THÁNG ... NĂM ... (Input manual for Cover)
}

export type AiProvider = 'gemini' | 'ollama';

export interface OllamaModelPreset {
  id: string;
  name: string;
  tag: string;
  aliases: string[];
  description: string;
  specs: string;
  badge: string;
}

export const OLLAMA_MODEL_PRESETS: OllamaModelPreset[] = [
  {
    id: 'qwen3.6-35b-a3b-q4',
    name: 'Qwen3.6 35B-A3B (Q4)',
    tag: 'qwen3.6:35b-a3b-q4',
    aliases: ['qwen3.6:35b', 'qwen3.6:35b-a3b', 'qwen3.6:35b-q4'],
    description: 'Mô hình MoE/Dense mạnh mẽ, phiên bản lượng tử Q4 tối ưu hiệu năng cao cho nội dung học thuật sâu',
    specs: '~22GB VRAM / RAM • Chất lượng sư phạm đỉnh cao',
    badge: 'Đề xuất mạnh'
  },
  {
    id: 'gemma4-12b',
    name: 'Gemma 4 12B',
    tag: 'gemma4:12b',
    aliases: ['gemma4', 'gemma4:latest'],
    description: 'Thế hệ Gemma 4 từ Google cỡ 12B, khả năng khái quát, lập luận sư phạm và diễn giải xuất sắc',
    specs: '~8GB - 12GB VRAM • Cân bằng tốc độ & chất lượng',
    badge: 'Chất lượng cao'
  },
  {
    id: 'qwen2.5-coder-7b',
    name: 'qwen2.5-coder:7b',
    tag: 'qwen2.5-coder:7b',
    aliases: ['qwen2.5-coder', 'qwen2.5-coder:latest'],
    description: 'Chuyên gia cấu trúc logic, tuân thủ 100% định dạng JSON, bảng biểu 5 cột và công thức toán',
    specs: '~5GB - 6GB VRAM • Rất nhanh & chính xác cấu trúc',
    badge: 'Cực chuẩn JSON'
  },
  {
    id: 'gemma4-e4b',
    name: 'gemma4:e4b',
    tag: 'gemma4:e4b',
    aliases: ['gemma4:4b', 'gemma4:e4b-latest'],
    description: 'Phiên bản Gemma 4 tinh gọn, nhẹ nhàng, chạy mượt mà ngay cả trên máy tính không có card đồ họa rời',
    specs: '~3GB - 4GB RAM • Siêu nhẹ & phản hồi tức thì',
    badge: 'Tiết kiệm tài nguyên'
  }
];

export interface OllamaConfig {
  baseUrl: string; // default "http://localhost:11434"
  selectedModel: string; // e.g. "qwen3.6:35b-a3b-q4"
  customModel: string;
  connectionMode: 'direct' | 'proxy'; // 'direct' = fetch directly from client, 'proxy' = through /api/ollama
  temperature: number;
  numCtx: number; // default 16384
}

export interface AiConfig {
  provider: AiProvider;
  ollama: OllamaConfig;
}

export interface Activity {
  content: string;
  timeMinutes: number;
  methodLecturer: string;
  methodStudent: string;
  materials: string;
}

export interface Period {
  periodNumber: number;
  objectives: string;
  activities: Activity[];
}

export interface GeneratedContent {
  approvalSection: {
    content: string;
    skills: string;
    method: string;
    conclusion: string;
  };
  part1: {
    purpose: string;
    requirements: string;
    content: string;
    focus: string;
    organization: string;
    methodLecturer: string;
    methodStudent: string;
  };
  part2: {
    introContent: string;
    periods: Period[];
  };
  part3: {
    summary: string; // Hệ thống nội dung
    qa: string; // Giải đáp
    research: string; // Định hướng nghiên cứu
    remarks: string; // Nhận xét
  };
  conclusion: string; // The section just before Part III (3 mins)
}

export interface AppState {
  metadata: LessonMetadata;
  sourceMaterial: string;
  isGenerating: boolean;
  generatedContent: GeneratedContent | null;
  error: string | null;
}

export interface CustomTemplateMetadataItem {
  label: string;
  value: string;
}

export interface CustomTemplateTable {
  headers: string[];
  rows: string[][];
}

export interface CustomTemplateSubsection {
  subtitle: string;
  content: string;
}

export interface CustomTemplateSection {
  id: string;
  title: string;
  content?: string;
  subsections?: CustomTemplateSubsection[];
  table?: CustomTemplateTable;
  tables?: CustomTemplateTable[];
  pageBreakBefore?: boolean;
}

export interface CustomTemplateSignature {
  role: string;
  name: string;
  locationDate?: string;
}

export interface CustomCoverPage {
  university?: string;
  faculty?: string;
  title: string;
  courseName?: string;
  lessonName?: string;
  targetAudience?: string;
  schoolYear?: string;
  lecturerName?: string;
  coverPlaceDate?: string;
}

export interface CustomApprovalPage {
  approvalDate?: string;
  approverRole?: string;
  approverName?: string;
  lessonName?: string;
  lecturerName?: string;
  location?: string;
  contentSummary?: string;
  skillsSummary?: string;
  methodSummary?: string;
  conclusion?: string;
}

export interface CustomGeneratedPlan {
  documentTitle: string;
  subtitle?: string;
  hasCoverPage?: boolean;
  coverPage?: CustomCoverPage;
  hasApprovalPage?: boolean;
  approvalPage?: CustomApprovalPage;
  metadata: CustomTemplateMetadataItem[];
  sections: CustomTemplateSection[];
  signatures?: CustomTemplateSignature[];
  rawMarkdown?: string;
  templateName?: string;
}


export interface CustomTemplateConfig {
  planTitle: string;
  courseName: string;
  lecturerName: string;
  targetAudience: string;
  totalPeriods: number;
  specialRequirements: string;
}

/**
 * Calculates optimal table column widths based on headers:
 * - Keeps Thời gian and Vật chất small (6-7% and 9-10%)
 * - Grants generous space (40-45%) to Thứ tự, nội dung / Hoạt động
 */
export function calculateColumnWidths(headers: string[]): number[] {
  const n = headers.length;
  if (n === 0) return [];
  if (n === 1) return [100];

  const assigned: (number | null)[] = new Array(n).fill(null);
  let remainingPercent = 100;
  let unassignedCount = n;

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase().trim();
    if (/^(stt|số tt|thứ tự$)/i.test(lower)) {
      assigned[idx] = 5;
      remainingPercent -= 5;
      unassignedCount--;
    } else if (/(thời gian|t\.gian|t\s*gian|thời lượng|phút)/i.test(lower)) {
      assigned[idx] = 7;
      remainingPercent -= 7;
      unassignedCount--;
    } else if (/(vật chất|thiết bị|đồ dùng|học liệu|dddh)/i.test(lower)) {
      assigned[idx] = 10;
      remainingPercent -= 10;
      unassignedCount--;
    }
  });

  const contentIndices: number[] = [];
  const otherIndices: number[] = [];

  assigned.forEach((val, idx) => {
    if (val === null) {
      const lower = headers[idx].toLowerCase().trim();
      if (/(nội dung|hoạt động|tiến trình|bài học|chuyên đề)/i.test(lower)) {
        contentIndices.push(idx);
      } else {
        otherIndices.push(idx);
      }
    }
  });

  if (contentIndices.length > 0 && otherIndices.length > 0) {
    const contentWidth = Math.max(38, Math.floor(remainingPercent * 0.50 / contentIndices.length));
    contentIndices.forEach(idx => {
      assigned[idx] = contentWidth;
      remainingPercent -= contentWidth;
      unassignedCount--;
    });

    const eachOther = Math.floor(remainingPercent / otherIndices.length);
    otherIndices.forEach((idx, i) => {
      const w = (i === otherIndices.length - 1) ? remainingPercent : eachOther;
      assigned[idx] = w;
      remainingPercent -= w;
      unassignedCount--;
    });
  } else {
    const each = Math.floor(remainingPercent / unassignedCount);
    assigned.forEach((val, idx) => {
      if (val === null) {
        const w = (unassignedCount === 1) ? remainingPercent : each;
        assigned[idx] = w;
        remainingPercent -= w;
        unassignedCount--;
      }
    });
  }

  return assigned.map(w => w || Math.floor(100 / n));
}