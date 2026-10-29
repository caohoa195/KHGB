import { 
    Document, 
    Packer, 
    Paragraph, 
    Table, 
    TableCell, 
    TableRow, 
    TextRun, 
    AlignmentType, 
    WidthType, 
    BorderStyle, 
    ShadingType,
    Math as DocxMath,
    MathRun,
    MathFraction,
    MathRadical,
    MathSuperScript,
    MathSubScript
} from "docx";
import { GeneratedContent, LessonMetadata, CustomGeneratedPlan, calculateColumnWidths } from "../types";
import { preprocessTextForMath } from "../components/MathText";
import FileSaver from "file-saver";

// CONSTANTS
const FONT_FAMILY = "Times New Roman";
const FONT_SIZE = 28; // 14pt (docx uses half-points: 14 * 2 = 28)
const BORDER_SIZE = 36; // 4.5pt (docx uses 1/8 points: 4.5 * 8 = 36)
const PAGE_2_INDENT = 720; // 1 Tab indentation (approx 1.27cm)

// Helper to clean common LaTeX math symbols for Word Equation
function cleanLatexMath(str: string): string {
    return str
        .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
        .replace(/\\Delta/g, 'Δ').replace(/\\delta/g, 'δ').replace(/\\pi/g, 'π')
        .replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
        .replace(/\\sigma/g, 'σ').replace(/\\omega/g, 'ω').replace(/\\Omega/g, 'Ω')
        .replace(/\\pm/g, '±').replace(/\\times/g, '×').replace(/\\div/g, '÷')
        .replace(/\\cdot/g, '·').replace(/\\le/g, '≤').replace(/\\ge/g, '≥')
        .replace(/\\neq/g, '≠').replace(/\\approx/g, '≈').replace(/\\infty/g, '∞')
        .replace(/\\rightarrow/g, '→').replace(/\\sum/g, '∑').replace(/\\int/g, '∫');
}

// Convert a math string (inside $...$ or LaTeX) to native Word Equation <m:oMath>
function parseMathExpressionToDocx(mathStr: string): DocxMath {
    const cleaned = cleanLatexMath(mathStr.trim());
    const components: any[] = [];
    const tokenRegex = /(\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}|[a-zA-Z0-9]\^[0-9a-zA-Z]+|[a-zA-Z0-9]_[0-9a-zA-Z]+)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(cleaned)) !== null) {
        if (match.index > lastIdx) {
            components.push(new MathRun(cleaned.substring(lastIdx, match.index)));
        }
        const token = match[0];
        if (token.startsWith('\\frac')) {
            const parts = token.match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/);
            if (parts) {
                components.push(new MathFraction({
                    numerator: [new MathRun(parts[1].trim())],
                    denominator: [new MathRun(parts[2].trim())]
                }));
            }
        } else if (token.startsWith('\\sqrt')) {
            const parts = token.match(/\\sqrt\{([^{}]+)\}/);
            if (parts) {
                components.push(new MathRadical({
                    children: [new MathRun(parts[1].trim())]
                }));
            }
        } else if (token.includes('^')) {
            const [base, exp] = token.split('^');
            components.push(new MathSuperScript({
                children: [new MathRun(base)],
                superScript: [new MathRun(exp)]
            }));
        } else if (token.includes('_')) {
            const [base, sub] = token.split('_');
            components.push(new MathSubScript({
                children: [new MathRun(base)],
                subScript: [new MathRun(sub)]
            }));
        }
        lastIdx = tokenRegex.lastIndex;
        if (match[0].length === 0) tokenRegex.lastIndex++;
    }

    if (lastIdx < cleaned.length) {
        components.push(new MathRun(cleaned.substring(lastIdx)));
    }

    return new DocxMath({
        children: components.length > 0 ? components : [new MathRun(cleaned)]
    });
}

function addFormattedTextRuns(runs: any[], text: string, defaultBold: boolean, defaultItalics: boolean, size: number) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({
                text: part.slice(2, -2),
                bold: true,
                italics: defaultItalics,
                font: FONT_FAMILY,
                size
            }));
        } else {
            runs.push(new TextRun({
                text: part,
                bold: defaultBold,
                italics: defaultItalics,
                font: FONT_FAMILY,
                size
            }));
        }
    }
}

// Formats text that may contain math ($...$, $$...$$, \frac, etc.) into a mixture of TextRun and DocxMath (Word Equations)
export function formatTextWithMathRuns(rawText: string, options: { bold?: boolean; italics?: boolean; size?: number } = {}): Array<TextRun | DocxMath> {
    const { bold = false, italics = false, size = FONT_SIZE } = options;
    if (!rawText) return [new TextRun({ text: '', font: FONT_FAMILY, size })];

    const text = preprocessTextForMath(rawText);
    const mathPattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const runs: any[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathPattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const textChunk = text.substring(lastIndex, match.index);
            addFormattedTextRuns(runs, textChunk, bold, italics, size);
        }

        const raw = match[0];
        let mathContent = raw;
        if (raw.startsWith('$$') && raw.endsWith('$$')) {
            mathContent = raw.slice(2, -2);
        } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
            mathContent = raw.slice(2, -2);
        } else if (raw.startsWith('$') && raw.endsWith('$')) {
            mathContent = raw.slice(1, -1);
        } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
            mathContent = raw.slice(2, -2);
        }

        runs.push(parseMathExpressionToDocx(mathContent));
        lastIndex = mathPattern.lastIndex;
        if (match[0].length === 0) mathPattern.lastIndex++;
    }

    if (lastIndex < text.length) {
        const textChunk = text.substring(lastIndex);
        addFormattedTextRuns(runs, textChunk, bold, italics, size);
    }

    return runs;
}

// Helper to create a perfectly aligned 2-column table for the cover page
const createCoverMetadataTable = (items: { label: string, value: string }[]) => {
    return new Table({
        width: { size: 75, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
        },
        rows: items.filter(item => item.value && item.value.trim().length > 0).map(item => new TableRow({
            children: [
                new TableCell({
                    width: { size: 38, type: WidthType.PERCENTAGE },
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: item.label, bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                            spacing: { after: 100, line: 240 }
                        })
                    ]
                }),
                new TableCell({
                    width: { size: 62, type: WidthType.PERCENTAGE },
                    children: [
                        new Paragraph({
                            children: formatTextWithMathRuns(item.value, { size: FONT_SIZE }),
                            spacing: { after: 100, line: 240 }
                        })
                    ]
                })
            ]
        }))
    });
};

// Helper for multi-line indented paragraphs in Part 1
const createMultiLineIndentedParagraphs = (text: string, level: number = 1) => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => {
        const clean = line.trim();
        const isBullet = clean.startsWith('-') || clean.startsWith('*');
        return new Paragraph({
            children: [
                ...(isBullet ? [new TextRun({ text: "- ", font: FONT_FAMILY, size: FONT_SIZE })] : []),
                ...formatTextWithMathRuns(isBullet ? clean.replace(/^[-*]\s*/, '') : clean, { size: FONT_SIZE })
            ],
            indent: { firstLine: PAGE_2_INDENT, left: level * 360 },
            spacing: { after: 60, line: 240 }
        });
    });
};

// Helper for Signature Blocks
const createSignatureBlock = (role: string, name: string, spacingBefore = 240) => {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [], width: { size: 50, type: WidthType.PERCENTAGE } }), // Left empty space
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: (role || "").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: spacingBefore },
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: name || "", bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 1800 }, // Space for signature
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
};

const createApprovalPara = (text: string, bold = false, italics = false, spacingAfter = 60) => {
    return new Paragraph({
        children: formatTextWithMathRuns(text || "", { bold, italics, size: FONT_SIZE }),
        indent: { firstLine: PAGE_2_INDENT, left: 0 }, 
        spacing: { after: spacingAfter, line: 240 } 
    });
};

const createIndentedParagraph = (text: string, level: number = 0, bold = false, italics = false) => {
    return new Paragraph({
        children: formatTextWithMathRuns(text || "", { bold, italics, size: FONT_SIZE }),
        indent: { firstLine: PAGE_2_INDENT, left: 0 },
        spacing: { after: 60, line: 240 }
    });
};

// Smart Requirements Formatter for DOCX
const createRequirementsParagraphs = (text: string) => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
        let cleanLine = line.trim();
        // Loại bỏ markdown hoặc ký tự thừa từ AI
        cleanLine = cleanLine.replace(/^- \*\*/, '').replace(/^\* \*\*/, '').replace(/^\*\*/, '');
        
        // Nhận diện nhãn (Kiến thức, Kỹ năng, Thái độ)
        if (cleanLine.includes('**')) {
             const parts = cleanLine.split('**').filter(p => p && p.trim() !== "");
             if (parts.length >= 2) {
                 const label = parts[0].replace(':', '').trim();
                 const content = parts.slice(1).join("").trim();
                 return new Paragraph({
                     children: [
                         new TextRun({ text: "- ", font: FONT_FAMILY, size: FONT_SIZE }),
                         new TextRun({ text: label + ": ", bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
                         ...formatTextWithMathRuns(content, { size: FONT_SIZE })
                     ],
                     indent: { firstLine: PAGE_2_INDENT, left: 0 }, 
                     spacing: { after: 60, line: 240 }
                 });
             }
        }

        return new Paragraph({
            children: [
                new TextRun({ text: "- ", font: FONT_FAMILY, size: FONT_SIZE }),
                ...formatTextWithMathRuns(cleanLine.replace(/\*\*/g, ""), { size: FONT_SIZE })
            ],
            indent: { firstLine: PAGE_2_INDENT, left: 0 },
            spacing: { after: 60, line: 240 }
        });
    });
};

export const exportToDocx = async (metadata: LessonMetadata, content: GeneratedContent) => {
    
    // --- Page 1: COVER (Carefully calibrated to fit exactly on 1 page without overflow) ---
    const coverChildren = [
        new Paragraph({
            children: [new TextRun({ text: (metadata.university || "TRƯỜNG ĐẠI HỌC KHÁNH HÒA").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 60, line: 240 }, 
        }),
        new Paragraph({
            children: [new TextRun({ text: (metadata.faculty || "KHOA SƯ PHẠM").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80, line: 240 },
        }),
        new Paragraph({
            children: [new TextRun({ text: "_______", bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 1000, line: 240 },
        }),
        new Paragraph({
            children: [new TextRun({ text: "BÀI GIẢNG", bold: true, font: FONT_FAMILY, size: 36 })], // 18pt
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 600, line: 240 },
        }),
        
        createCoverMetadataTable([
            { label: "Học phần:", value: metadata.courseName || "" },
            { label: "Bài (Chuyên đề):", value: (metadata.lessonName || "").replace(/^Bài \(Chuyên đề\):\s*/i, "") },
            { label: "Đối tượng:", value: metadata.targetAudience || "" },
            { label: "Năm học:", value: metadata.schoolYear || "" },
        ]),

        new Paragraph({
            children: [
                new TextRun({ text: "GIẢNG VIÊN BIÊN SOẠN", bold: true, font: FONT_FAMILY, size: FONT_SIZE - 2 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 60, line: 240 }, 
        }),
        new Paragraph({
            children: [
                new TextRun({ text: (metadata.lecturerName || "Họ và tên giảng viên").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120, line: 240 }, 
        }),
        new Paragraph({
            children: [new TextRun({ text: metadata.coverPlaceDate || "KHÁNH HÒA, THÁNG ... NĂM ...", italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, line: 240 }, 
        }),
    ];

    // --- Page 2: APPROVAL (Calibrated to fit exactly on Page 2) ---
    const approvalChildren = [
        new Paragraph({
             children: [new TextRun({ text: metadata.approvalDate || `Ngày ... tháng ... năm ...`, italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
             alignment: AlignmentType.CENTER,
             pageBreakBefore: true,
             spacing: { before: 120, after: 60, line: 240 }
        }),
        new Paragraph({
            children: [new TextRun({ text: "PHÊ DUYỆT", bold: true, font: FONT_FAMILY, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60, line: 240 } 
        }),
        new Paragraph({
            children: [new TextRun({ text: (metadata.approverRole || "CHỦ NHIỆM BỘ MÔN").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 180, line: 240 },
        }),
        createApprovalPara("1. Phê duyệt bài giảng", true),
        createApprovalPara(metadata.lessonName), 
        createApprovalPara(`Giảng viên: ${metadata.lecturerName}`),
        createApprovalPara("2. Địa điểm, thời gian", true),
        createApprovalPara("a) Thông qua", true), 
        createApprovalPara(`- Địa điểm: ${metadata.location}`),
        createApprovalPara("- Thời gian: .."),
        createApprovalPara(`- Ngày ... tháng ... năm ...`),
        createApprovalPara("b) Phê duyệt", true), 
        createApprovalPara(`- Địa điểm: ${metadata.location}`),
        createApprovalPara("- Thời gian: ..."),
        createApprovalPara("3. Nội dung phê duyệt", true),
        createApprovalPara("a) Phần nội dung của bài giảng", true), 
        createApprovalPara(`- Nội dung bài giảng: ${content.approvalSection?.content || ""}`),
        createApprovalPara(`- ${content.approvalSection?.skills || ""}`),
        createApprovalPara("b) Phần thực hành bài giảng", true), 
        createApprovalPara("- Phần thực hành của bài:"),
        createApprovalPara(`- Phương pháp giảng dạy: ${content.approvalSection?.method || ""}`),
        createApprovalPara("4. Kết luận", true),
        createApprovalPara(content.approvalSection?.conclusion || "Nhất trí thông qua bài giảng."),
        
        createSignatureBlock("CHỨC VỤ NGƯỜI PHÊ DUYỆT", metadata.approverName, 120),
    ];


    // --- Content Pages ---
    const contentChildren = [
        new Paragraph({ 
            children: [new TextRun({ text: "Phần I", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], 
            alignment: AlignmentType.CENTER, 
            pageBreakBefore: true,
            spacing: { after: 60, line: 240 }
        }), 
        new Paragraph({ 
            children: [new TextRun({ text: "Ý ĐỊNH GIẢNG BÀI", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], 
            alignment: AlignmentType.CENTER,
            spacing: { after: 120, line: 240 }
        }),
        createIndentedParagraph("I. MỤC ĐÍCH, YÊU CẦU", 0, true),
        createIndentedParagraph("1. Mục đích", 1, true),
        ...createMultiLineIndentedParagraphs(content.part1?.purpose || "", 1),
        createIndentedParagraph("2. Yêu cầu", 1, true),
        ...createRequirementsParagraphs(content.part1?.requirements || ""),
        createIndentedParagraph("II. NỘI DUNG, TRỌNG TÂM", 0, true),
        createIndentedParagraph("1. Nội dung", 1, true),
        ...createMultiLineIndentedParagraphs(content.part1?.content || "", 1),
        createIndentedParagraph("2. Trọng tâm", 1, true),
        ...createMultiLineIndentedParagraphs(content.part1?.focus || "", 1),
        createIndentedParagraph("III. THỜI GIAN", 0, true),
        createIndentedParagraph(`Tổng số: ${metadata.totalPeriods} tiết (mỗi tiết 45 phút).`, 1),
        createIndentedParagraph("IV. TỔ CHỨC, PHƯƠNG PHÁP", 0, true),
        createIndentedParagraph("1. Tổ chức", 1, true),
        ...createMultiLineIndentedParagraphs(content.part1?.organization || "", 1),
        createIndentedParagraph("2. Phương pháp", 1, true),
        createIndentedParagraph("a) Giảng viên", 2, true),
        ...createMultiLineIndentedParagraphs(content.part1?.methodLecturer || "", 2),
        createIndentedParagraph("b) Học viên", 2, true),
        ...createMultiLineIndentedParagraphs(content.part1?.methodStudent || "", 2),
        createIndentedParagraph("V. ĐỊA ĐIỂM", 0, true),
        createIndentedParagraph(metadata.location || "Phòng học bộ môn / Giảng đường", 1),
        createIndentedParagraph("VI. VẬT CHẤT BẢO ĐẢM", 0, true),
        createIndentedParagraph("1. Giảng viên: Máy chiếu, bài giảng điện tử, giáo án, tài liệu tham khảo.", 1),
        createIndentedParagraph("2. Học viên: Giáo trình, vở ghi, đồ dùng học tập.", 1),
        new Paragraph({ 
            children: [new TextRun({ text: "Phần II", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], 
            alignment: AlignmentType.CENTER, 
            pageBreakBefore: true,
            spacing: { after: 60, line: 240 }
        }),
        new Paragraph({ 
            children: [new TextRun({ text: `THỰC HÀNH GIẢNG BÀI (${metadata.totalPeriods * 45} phút)`, bold: true, font: FONT_FAMILY, size: FONT_SIZE })], 
            alignment: AlignmentType.CENTER,
            spacing: { after: 120, line: 240 }
        }),
        createIndentedParagraph("A. THỦ TỤC GIẢNG BÀI (10 phút)", 0, true),
        createIndentedParagraph("1. Nhận lớp nắm quân số.", 1),
        createIndentedParagraph("2. Phổ biến quy định học tập.", 1),
        createIndentedParagraph("3. Giới thiệu bài mới.", 1),
        createIndentedParagraph(`- Nêu tên bài: ${metadata.lessonName}`, 2),
        createIndentedParagraph(`- Nội dung: ${content.part2?.introContent || ""}`, 2),
        createIndentedParagraph("B. NỘI DUNG BÀI GIẢNG", 0, true),
    ];

    const borderStyle = {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
    };

    const periodTables = (content.part2?.periods || []).map(period => {
        const formatCellContent = (text: string, bold = false) => {
            if (!text) return [new Paragraph({ text: "" })];
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            if (lines.length === 0) return [new Paragraph({ text: "" })];
            return lines.map(line => {
                const cleanLine = line.replace(/\t/g, '').trim();
                return new Paragraph({ 
                    children: formatTextWithMathRuns(cleanLine, { bold, size: FONT_SIZE }), 
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 60, line: 240 }
                });
            });
        };
        
        const createSimpleCellPara = (text: string) => [
             new Paragraph({ 
                children: formatTextWithMathRuns((text || "").replace(/\t/g, '').trim(), { size: FONT_SIZE }), 
                alignment: AlignmentType.LEFT,
                spacing: { after: 0, line: 240 } 
            })
        ];

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thứ tự, nội dung", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], width: { size: 42, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thời gian", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], width: { size: 7, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PP Giảng viên", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], width: { size: 21, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PP Học viên", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], width: { size: 21, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vật chất", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], width: { size: 9, type: WidthType.PERCENTAGE }, borders: borderStyle }),
            ],
        });

        const activities = period.activities || [];
        const rows = activities.map(act => new TableRow({
            children: [
                new TableCell({ children: formatCellContent(act.content), width: { size: 42, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (act.timeMinutes || 0).toString(), font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], width: { size: 7, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: createSimpleCellPara(act.methodLecturer), width: { size: 21, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: createSimpleCellPara(act.methodStudent), width: { size: 21, type: WidthType.PERCENTAGE }, borders: borderStyle }),
                new TableCell({ children: createSimpleCellPara(act.materials), width: { size: 9, type: WidthType.PERCENTAGE }, borders: borderStyle }),
            ],
        }));

        return [
            new Paragraph({ 
                children: [new TextRun({ text: `Tiết ${period.periodNumber || 0}: (45 phút)`, bold: true, font: FONT_FAMILY, size: FONT_SIZE })], 
                spacing: { before: 120, after: 60, line: 240 },
                indent: { firstLine: PAGE_2_INDENT, left: 0 }
            }),
            createIndentedParagraph(`- Mục tiêu: ${period.objectives || ""}`, 1),
            new Table({
                rows: [headerRow, ...rows],
                width: { size: 100, type: WidthType.PERCENTAGE },
            })
        ];
    }).flat();

    const endSection = [
         new Paragraph({ children: [new TextRun({ text: "KẾT LUẬN (3 phút)", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], spacing: { before: 120, after: 60, line: 240 }, alignment: AlignmentType.CENTER }),
         createIndentedParagraph(content.conclusion || ""),
         new Paragraph({ children: [new TextRun({ text: "Phần III", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60, line: 240 } }),
         new Paragraph({ children: [new TextRun({ text: "KẾT THÚC GIẢNG BÀI (7 Phút)", bold: true, font: FONT_FAMILY, size: FONT_SIZE })], alignment: AlignmentType.CENTER, spacing: { after: 120, line: 240 } }),
         createIndentedParagraph("- Hệ thống nội dung bài giảng (2 phút)", 0, true),
         createIndentedParagraph(content.part3?.summary || "", 1),
         createIndentedParagraph("- Giải đáp (2 phút)", 0, true),
         createIndentedParagraph(content.part3?.qa || "", 1),
         createIndentedParagraph("- Định hướng nghiên cứu & chuẩn bị bài tiếp theo (2 phút)", 0, true),
         createIndentedParagraph(content.part3?.research || "", 1),
         createIndentedParagraph("- Nhận xét, kết thúc bài giảng (1 phút)", 0, true),
         createIndentedParagraph(content.part3?.remarks || "", 1),
         
         new Paragraph({
            children: [new TextRun({ text: metadata.composerDate || `Ngày ... tháng ... năm ...`, italics: true, font: FONT_FAMILY, size: FONT_SIZE })], 
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, line: 240 }
         }),
         
         createSignatureBlock("NGƯỜI BIÊN SOẠN", metadata.lecturerName, 0),
    ];

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: FONT_FAMILY, size: FONT_SIZE },
                    paragraph: { spacing: { line: 240 } },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        borders: {
                            pageBorderTop: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                            pageBorderRight: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                            pageBorderBottom: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                            pageBorderLeft: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                        },
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                    }
                },
                children: [...coverChildren, ...approvalChildren],
            },
            {
                properties: {
                     page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
                },
                children: [...contentChildren, ...periodTables, ...endSection]
            }
        ],
    });

    const fileName = (metadata.lessonName || "BaiGiang").includes(':') 
        ? metadata.lessonName.split(':')[1].trim() 
        : metadata.lessonName || "BaiGiang";

    const blob = await Packer.toBlob(doc);
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, `${fileName.replace(/[^a-z0-9]/gi, '_')}_BaiGiang.docx`);
};

export const exportCustomPlanToDocx = async (plan: CustomGeneratedPlan, fallbackMetadata?: LessonMetadata) => {
    const borderStyle = {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    };

    const sections: any[] = [];

    // Always guarantee Trang 1 (Bìa) and Trang 2 (Phê duyệt) are created
    const hasCover = Boolean(plan.coverPage || fallbackMetadata || plan.hasCoverPage !== false);
    const hasApproval = Boolean(plan.approvalPage || fallbackMetadata || plan.hasApprovalPage !== false);

    if (hasCover || hasApproval) {
        const coverAndApprovalChildren: any[] = [];

        // 1. COVER PAGE (Calibrated to fit exactly on 1 page without overflow)
        if (hasCover) {
            const cp = {
                university: plan.coverPage?.university || fallbackMetadata?.university || "TRƯỜNG ĐẠI HỌC KHÁNH HÒA",
                faculty: plan.coverPage?.faculty || fallbackMetadata?.faculty || "KHOA SƯ PHẠM",
                title: plan.coverPage?.title || plan.documentTitle || "BÀI GIẢNG",
                courseName: plan.coverPage?.courseName || fallbackMetadata?.courseName || "",
                lessonName: plan.coverPage?.lessonName || fallbackMetadata?.lessonName || "",
                targetAudience: plan.coverPage?.targetAudience || fallbackMetadata?.targetAudience || "",
                schoolYear: plan.coverPage?.schoolYear || fallbackMetadata?.schoolYear || "",
                lecturerName: plan.coverPage?.lecturerName || fallbackMetadata?.lecturerName || "Họ và tên giảng viên",
                coverPlaceDate: plan.coverPage?.coverPlaceDate || fallbackMetadata?.coverPlaceDate || "KHÁNH HÒA, THÁNG ... NĂM ...",
            };

            coverAndApprovalChildren.push(
                new Paragraph({
                    children: [new TextRun({ text: (cp.university || "TRƯỜNG ĐẠI HỌC KHÁNH HÒA").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 160, after: 60, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: (cp.faculty || "KHOA SƯ PHẠM").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: "_______", bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 1000, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: (cp.title || plan.documentTitle || "BÀI GIẢNG").toUpperCase(), bold: true, font: FONT_FAMILY, size: 36 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 600, line: 240 },
                }),
                createCoverMetadataTable([
                    { label: "Học phần:", value: cp.courseName || "" },
                    { label: "Bài (Chuyên đề):", value: (cp.lessonName || "").replace(/^Bài \(Chuyên đề\):\s*/i, "") },
                    { label: "Đối tượng:", value: cp.targetAudience || "" },
                    { label: "Năm học:", value: cp.schoolYear || "" },
                ]),
                new Paragraph({
                    children: [
                        new TextRun({ text: "GIẢNG VIÊN BIÊN SOẠN", bold: true, font: FONT_FAMILY, size: FONT_SIZE - 2 }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 1200, after: 60, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: (cp.lecturerName || "Họ và tên giảng viên").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: cp.coverPlaceDate || "KHÁNH HÒA, THÁNG ... NĂM ...", italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 1200, line: 240 },
                })
            );
        }

        // 2. APPROVAL PAGE (Calibrated to fit exactly on Page 2)
        if (hasApproval) {
            const ap = {
                approvalDate: plan.approvalPage?.approvalDate || fallbackMetadata?.approvalDate || "Ngày ... tháng ... năm ...",
                approverRole: plan.approvalPage?.approverRole || fallbackMetadata?.approverRole || "CHỦ NHIỆM BỘ MÔN",
                approverName: plan.approvalPage?.approverName || fallbackMetadata?.approverName || "Họ và tên",
                lessonName: plan.approvalPage?.lessonName || fallbackMetadata?.lessonName || "",
                lecturerName: plan.approvalPage?.lecturerName || fallbackMetadata?.lecturerName || "",
                location: plan.approvalPage?.location || fallbackMetadata?.location || "Khánh Hòa",
                contentSummary: plan.approvalPage?.contentSummary || `Nội dung: ${fallbackMetadata?.lessonName || 'bài giảng'} theo chương trình chi tiết`,
                skillsSummary: plan.approvalPage?.skillsSummary || "Rèn luyện kỹ năng thực hành và kiến thức chuyên môn",
                methodSummary: plan.approvalPage?.methodSummary || "Kết hợp thuyết trình, phát vấn, trực quan và thảo luận",
                conclusion: plan.approvalPage?.conclusion || "Nhất trí thông qua bài giảng.",
            };

            coverAndApprovalChildren.push(
                new Paragraph({
                    children: [new TextRun({ text: ap.approvalDate || "Ngày ... tháng ... năm ...", italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    pageBreakBefore: hasCover,
                    spacing: { before: 120, after: 60, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: "PHÊ DUYỆT", bold: true, font: FONT_FAMILY, size: 32 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 60, after: 60, line: 240 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: (ap.approverRole || "CHỦ NHIỆM BỘ MÔN").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 180, line: 240 },
                }),
                createApprovalPara("1. Phê duyệt bài giảng", true),
                createApprovalPara(ap.lessonName || ""),
                createApprovalPara(`Giảng viên: ${ap.lecturerName || ""}`),
                createApprovalPara("2. Địa điểm, thời gian", true),
                createApprovalPara("a) Thông qua", true),
                createApprovalPara(`- Địa điểm: ${ap.location || ""}`),
                createApprovalPara("- Thời gian: .."),
                createApprovalPara("b) Phê duyệt", true),
                createApprovalPara(`- Địa điểm: ${ap.location || ""}`),
                createApprovalPara("3. Nội dung phê duyệt", true),
                createApprovalPara("a) Phần nội dung của bài giảng", true),
                createApprovalPara(`- Nội dung bài giảng: ${ap.contentSummary || ""}`),
                createApprovalPara(`- ${ap.skillsSummary || ""}`),
                createApprovalPara("b) Phần thực hành bài giảng", true),
                createApprovalPara(`- Phương pháp giảng dạy: ${ap.methodSummary || ""}`),
                createApprovalPara("4. Kết luận", true),
                createApprovalPara(ap.conclusion || "Nhất trí thông qua bài giảng."),
                createSignatureBlock("CHỨC VỤ NGƯỜI PHÊ DUYỆT", ap.approverName || "", 120)
            );
        }


        sections.push({
            properties: {
                page: {
                    borders: {
                        pageBorderTop: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                        pageBorderRight: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                        pageBorderBottom: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                        pageBorderLeft: { style: BorderStyle.SINGLE, size: BORDER_SIZE, space: 15, color: "000000" },
                    },
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
            },
            children: coverAndApprovalChildren,
        });
    }

    // 3. CONTENT PAGES
    const contentChildren: any[] = [];

    // If there is NO separate cover page (e.g. CV 5512 or school template), render the document title & metadata header
    if (!hasCover) {
        // Document Title
        contentChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: (plan.documentTitle || "KẾ HOẠCH BÀI DẠY").toUpperCase(),
                        bold: true,
                        font: FONT_FAMILY,
                        size: 32, // 16pt
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 120 },
            })
        );

        if (plan.subtitle) {
            contentChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: plan.subtitle,
                            italics: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 240 },
                })
            );
        }

        if (plan.metadata && plan.metadata.length > 0) {
            plan.metadata.forEach(item => {
                if (!item.label && !item.value) return;
                contentChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: item.label ? `${item.label}: ` : "", bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
                            new TextRun({ text: item.value || "", font: FONT_FAMILY, size: FONT_SIZE }),
                        ],
                        spacing: { after: 60, line: 240 },
                        indent: { left: 720 },
                    })
                );
            });
            contentChildren.push(
                new Paragraph({
                    children: [],
                    spacing: { after: 180 },
                })
            );
        }
    }

    // Process all sections
    if (plan.sections && plan.sections.length > 0) {
        plan.sections.forEach((section, sIdx) => {
            const isMajorPart = section.title.toLowerCase().startsWith("phần ") || section.title.toLowerCase().startsWith("phan ");
            
            // Section Title
            contentChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: section.title,
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                        }),
                    ],
                    pageBreakBefore: section.pageBreakBefore || (isMajorPart && sIdx > 0),
                    alignment: isMajorPart ? AlignmentType.CENTER : AlignmentType.LEFT,
                    spacing: { before: 240, after: 120, line: 240 },
                })
            );

            // Direct paragraph contents
            if (section.content) {
                const paragraphs = section.content.split("\n").filter(p => p.trim());
                paragraphs.forEach(p => {
                    const clean = p.trim();
                    const isBullet = clean.startsWith("-") || clean.startsWith("*") || clean.startsWith("+");
                    contentChildren.push(
                        new Paragraph({
                            children: formatTextWithMathRuns(clean, { size: FONT_SIZE }),
                            spacing: { after: 60, line: 240 },
                            indent: isBullet ? { left: 720 } : { firstLine: 720 },
                        })
                    );
                });
            }

            // Subsections
            if (section.subsections && section.subsections.length > 0) {
                section.subsections.forEach(sub => {
                    contentChildren.push(
                        new Paragraph({
                            children: formatTextWithMathRuns(sub.subtitle, { bold: true, size: FONT_SIZE }),
                            spacing: { before: 120, after: 60, line: 240 },
                            indent: { left: 360 },
                        })
                    );

                    if (sub.content) {
                        const subParas = sub.content.split("\n").filter(p => p.trim());
                        subParas.forEach(p => {
                            const clean = p.trim();
                            const isBullet = clean.startsWith("-") || clean.startsWith("*") || clean.startsWith("+");
                            contentChildren.push(
                                new Paragraph({
                                    children: formatTextWithMathRuns(clean, { size: FONT_SIZE }),
                                    spacing: { after: 60, line: 240 },
                                    indent: isBullet ? { left: 1080 } : { firstLine: 720, left: 360 },
                                })
                            );
                        });
                    }
                });
            }

            // Tables (either section.table or section.tables)
            const allTables = [];
            if (section.table && section.table.headers && section.table.headers.length > 0) {
                allTables.push(section.table);
            }
            if (section.tables && section.tables.length > 0) {
                allTables.push(...section.tables);
            }

            allTables.forEach(tbl => {
                if (!tbl.headers || tbl.headers.length === 0) return;
                const colWidths = calculateColumnWidths(tbl.headers);

                const tableHeaderRow = new TableRow({
                    children: tbl.headers.map((h, hIdx) => 
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: formatTextWithMathRuns(h, { bold: true, size: FONT_SIZE - 2 }),
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 60, after: 60, line: 240 },
                                }),
                            ],
                            width: { size: colWidths[hIdx] ?? Math.floor(100 / tbl.headers.length), type: WidthType.PERCENTAGE },
                            borders: borderStyle,
                            shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
                        })
                    ),
                });

                const dataRows = (tbl.rows || []).map(row => 
                    new TableRow({
                        children: (row || []).map((cellText, cIdx) => {
                            const lines = (cellText || "").split("\n").filter(l => l.trim().length > 0);
                            const paras = lines.length > 0 
                                ? lines.map(line => new Paragraph({
                                    children: formatTextWithMathRuns(line.trim(), { size: FONT_SIZE - 2 }),
                                    spacing: { after: 40, line: 240 },
                                }))
                                : [new Paragraph({ children: [new TextRun({ text: "", font: FONT_FAMILY, size: FONT_SIZE - 2 })] })];

                            return new TableCell({
                                children: paras,
                                width: { size: colWidths[cIdx] ?? Math.floor(100 / tbl.headers.length), type: WidthType.PERCENTAGE },
                                borders: borderStyle,
                            });
                        }),
                    })
                );

                contentChildren.push(
                    new Table({
                        rows: [tableHeaderRow, ...dataRows],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    new Paragraph({ children: [], spacing: { after: 180 } })
                );
            });
        });
    }

    // Signatures
    if (plan.signatures && plan.signatures.length > 0) {
        if (plan.signatures.length === 1) {
            const sig = plan.signatures[0];
            contentChildren.push(
                new Paragraph({
                    children: [new TextRun({ text: sig.locationDate || "Ngày ... tháng ... năm ...", italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 360, after: 60 },
                }),
                createSignatureBlock(sig.role || "NGƯỜI BIÊN SOẠN", sig.name || "", 60)
            );
        } else {
            const leftSig = plan.signatures[0];
            const rightSig = plan.signatures[1];

            const sigTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE },
                    insideVertical: { style: BorderStyle.NONE },
                },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ text: leftSig.locationDate || "", italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 60 },
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: (leftSig.role || "").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: leftSig.name || "", bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 1800 },
                                    }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ text: rightSig.locationDate || "Ngày ... tháng ... năm ...", italics: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 60 },
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: (rightSig.role || "").toUpperCase(), bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: rightSig.name || "", bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 1800 },
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            });

            contentChildren.push(
                new Paragraph({ children: [], spacing: { before: 360 } }),
                sigTable
            );
        }
    }

    sections.push({
        properties: {
            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: contentChildren,
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: FONT_FAMILY, size: FONT_SIZE },
                    paragraph: { spacing: { line: 240 } },
                },
            },
        },
        sections: sections,
    });

    const safeTitle = (plan.documentTitle || "KeHoach")
        .replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 50);

    const blob = await Packer.toBlob(doc);
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, `${safeTitle || "KeHoach_TheoMau"}.docx`);
};