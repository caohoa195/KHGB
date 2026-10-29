import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://aistudiocdn.com/pdfjs-dist@^4.0.589/build/pdf.worker.mjs";

export const extractTextFromFile = async (file: File): Promise<string> => {
    const type = file.type;
    const name = file.name.toLowerCase();

    try {
        if (type === 'application/pdf' || name.endsWith('.pdf')) {
            return await extractFromPdf(file);
        } else if (
            type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            name.endsWith('.docx')
        ) {
            return await extractFromDocx(file);
        } else {
            // Default to text (txt, md)
            return await file.text();
        }
    } catch (e) {
        console.error("File reading error:", e);
        throw new Error("Không thể đọc nội dung tệp. Vui lòng kiểm tra định dạng.");
    }
};

async function extractFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        let pageStr = "";
        let lastY: number | null = null;

        for (const item of items) {
            if (!item.str && item.str !== "") continue;

            const currentY = item.transform ? Math.round(item.transform[5]) : null;
            
            // Check if line changed
            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 3) {
                pageStr += "\n";
            } else if (item.hasEOL) {
                pageStr += "\n";
            } else if (pageStr.length > 0 && !pageStr.endsWith("\n") && !pageStr.endsWith(" ")) {
                pageStr += " ";
            }

            pageStr += item.str;
            if (currentY !== null) lastY = currentY;
        }

        fullText += `[TRANG ${i}]\n${pageStr.trim()}\n\n`;
    }
    return fullText;
}

async function extractFromDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const lib = mammoth || (window as any).mammoth;
    if (!lib) {
        throw new Error("Thư viện đọc Word chưa tải xong. Vui lòng thử lại.");
    }

    try {
        // Try convertToHtml to retain table structures and headings
        const htmlResult = await lib.convertToHtml({ arrayBuffer });
        if (htmlResult && htmlResult.value && htmlResult.value.trim().length > 0) {
            return convertHtmlToStructuredText(htmlResult.value);
        }
    } catch (e) {
        console.warn("mammoth convertToHtml failed, falling back to extractRawText:", e);
    }

    const result = await lib.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * Converts Mammoth HTML output to clear, structured text that preserves
 * tables (as Markdown tables), headings, and paragraphs so Gemini can see the exact layout.
 */
function convertHtmlToStructuredText(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Process tables into Markdown tables so column structure is completely visible
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
        const trs = Array.from(table.querySelectorAll('tr'));
        if (trs.length === 0) return;

        let tableText = '\n\n[BẢNG BIỂU]:\n';
        trs.forEach((tr, trIdx) => {
            const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => {
                return (cell.textContent || '')
                    .replace(/\r?\n+/g, ' ')
                    .replace(/\|/g, '/')
                    .trim();
            });
            
            tableText += '| ' + cells.join(' | ') + ' |\n';
            if (trIdx === 0) {
                tableText += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
            }
        });
        tableText += '\n';

        const replacement = doc.createTextNode(tableText);
        table.parentNode?.replaceChild(replacement, table);
    });

    // 2. Process headings
    doc.querySelectorAll('h1').forEach(h => {
        h.textContent = `\n\n# ${h.textContent?.trim()}\n`;
    });
    doc.querySelectorAll('h2').forEach(h => {
        h.textContent = `\n\n## ${h.textContent?.trim()}\n`;
    });
    doc.querySelectorAll('h3').forEach(h => {
        h.textContent = `\n\n### ${h.textContent?.trim()}\n`;
    });

    // 3. Process list items
    doc.querySelectorAll('li').forEach(li => {
        li.textContent = `- ${li.textContent?.trim()}\n`;
    });

    // 4. Process paragraphs
    doc.querySelectorAll('p').forEach(p => {
        p.textContent = `${p.textContent?.trim()}\n`;
    });

    return doc.body.textContent || '';
}
