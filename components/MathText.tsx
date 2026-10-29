import React from 'react';
import katex from 'katex';

interface MathTextProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export interface MathToken {
  type: 'text' | 'inline-math' | 'block-math';
  raw: string;
  math: string;
}

/**
 * Common LaTeX command list to detect unwrapped formulas
 */
const LATEX_KEYWORDS = [
  'frac', 'sqrt', 'times', 'cdot', 'pm', 'div',
  'Delta', 'alpha', 'beta', 'gamma', 'theta', 'pi', 'lambda', 'sigma', 'omega', 'mu',
  'sum', 'int', 'prod', 'vec', 'bar', 'hat', 'dot',
  'le', 'ge', 'ne', 'approx', 'equiv', 'in', 'subset', 'cup', 'cap',
  'rightarrow', 'leftarrow', 'to', 'infty', 'partial', 'circ', 'degree'
];

const UNWRAPPED_LATEX_REGEX = new RegExp(
  `(?:[a-zA-Z0-9_\\^\\*\\+\\-\\=\\(\\)\\[\\]\\{\\}\\/\\,\\.\\s]*\\\\(?:${LATEX_KEYWORDS.join('|')})(?:\\{[^{}]*\\}|\\[[^\\[\\]]*\\]|[a-zA-Z0-9_\\^\\*\\+\\-\\=\\(\\)\\[\\]\\{\\}\\/\\,\\.\\s]*)*)`,
  'g'
);

/**
 * Fallback converter: converts LaTeX commands to clean Unicode math if KaTeX encounters issues
 */
function latexToUnicode(latex: string): string {
  let res = latex.trim();
  // Fractions: \frac{a}{b} -> (a)/(b)
  res = res.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  // Square roots: \sqrt{a} -> √(a)
  res = res.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  res = res.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');
  // Greek letters & math symbols
  res = res.replace(/\\times/g, '×');
  res = res.replace(/\\cdot/g, '·');
  res = res.replace(/\\pm/g, '±');
  res = res.replace(/\\div/g, '÷');
  res = res.replace(/\\Delta/g, 'Δ');
  res = res.replace(/\\alpha/g, 'α');
  res = res.replace(/\\beta/g, 'β');
  res = res.replace(/\\gamma/g, 'γ');
  res = res.replace(/\\theta/g, 'θ');
  res = res.replace(/\\pi/g, 'π');
  res = res.replace(/\\lambda/g, 'λ');
  res = res.replace(/\\sigma/g, 'σ');
  res = res.replace(/\\omega/g, 'ω');
  res = res.replace(/\\mu/g, 'μ');
  res = res.replace(/\\le/g, '≤');
  res = res.replace(/\\ge/g, '≥');
  res = res.replace(/\\ne/g, '≠');
  res = res.replace(/\\approx/g, '≈');
  res = res.replace(/\\infty/g, '∞');
  res = res.replace(/\\to|\\rightarrow/g, '→');
  res = res.replace(/\\circ/g, '°');
  res = res.replace(/\\degree/g, '°');
  res = res.replace(/\\vec\{([^{}]+)\}/g, '$1⃗');
  // Superscripts & Subscripts
  res = res.replace(/\^2\b/g, '²');
  res = res.replace(/\^3\b/g, '³');
  res = res.replace(/\^\{([0-9a-zA-Z]+)\}/g, '^$1');
  res = res.replace(/_\{([0-9a-zA-Z]+)\}/g, '_$1');
  // Strip any remaining backslashes from known commands
  res = res.replace(/\\([a-zA-Z]+)/g, '$1');
  return res;
}

/**
 * Preprocess text: Normalize double backslashes and wrap unwrapped LaTeX expressions into $...$
 */
export function preprocessTextForMath(text: string): string {
  if (!text) return '';

  // 1. Normalize escaped backslashes (e.g. \\frac -> \frac)
  let normalized = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // 2. Identify segments that are ALREADY wrapped in $...$ or $$...$$
  // If text already has $ delimiters, we only look for unwrapped math outside those regions
  const segments: string[] = [];
  const delimiterPattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = delimiterPattern.exec(normalized)) !== null) {
    if (m.index > lastIdx) {
      const nonMathChunk = normalized.substring(lastIdx, m.index);
      segments.push(wrapUnwrappedMathInChunk(nonMathChunk));
    }
    segments.push(m[0]);
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < normalized.length) {
    segments.push(wrapUnwrappedMathInChunk(normalized.substring(lastIdx)));
  }

  return segments.join('');
}

/**
 * Searches a plain-text chunk for LaTeX expressions and encloses them in $...$
 */
function wrapUnwrappedMathInChunk(chunk: string): string {
  // Check if chunk has any LaTeX command
  if (!chunk.includes('\\')) return chunk;

  // Replace matched LaTeX expressions with $...$
  return chunk.replace(UNWRAPPED_LATEX_REGEX, (match) => {
    const trimmed = match.trim();
    // Guard: Don't wrap if too short or just a single backslash
    if (trimmed.length <= 2 || !trimmed.includes('\\')) return match;
    
    // Check if there are trailing punctuation marks like . or , or : or ;
    let cleanMatch = trimmed;
    let trailingPunct = '';
    const punctMatch = cleanMatch.match(/([.,:;!?]+)$/);
    if (punctMatch) {
      trailingPunct = punctMatch[1];
      cleanMatch = cleanMatch.slice(0, -trailingPunct.length).trim();
    }

    return `$${cleanMatch}$${trailingPunct}`;
  });
}

/**
 * Splits text into text chunks and LaTeX math chunks ($...$ or $$...$$ or \[...\] or \(...\))
 */
export function splitMathTokens(rawText: string): Array<MathToken> {
  if (!rawText) return [];

  // Preprocess text to ensure all math expressions are properly delimited
  const text = preprocessTextForMath(rawText);

  // Match $$...$$ or \[...\] or $...$ or \(...\)
  const pattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
  const tokens: Array<MathToken> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        raw: text.substring(lastIndex, match.index),
        math: '',
      });
    }

    const raw = match[0];
    let mathContent = raw;

    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      mathContent = raw.slice(2, -2).trim();
      tokens.push({ type: 'block-math', raw, math: mathContent });
    } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
      mathContent = raw.slice(2, -2).trim();
      tokens.push({ type: 'block-math', raw, math: mathContent });
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      mathContent = raw.slice(1, -1).trim();
      tokens.push({ type: 'inline-math', raw, math: mathContent });
    } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
      mathContent = raw.slice(2, -2).trim();
      tokens.push({ type: 'inline-math', raw, math: mathContent });
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      raw: text.substring(lastIndex),
      math: '',
    });
  }

  return tokens;
}

/**
 * Safely renders LaTeX string into KaTeX HTML with graceful Unicode math fallback
 */
export function renderKaTeXHtml(math: string, displayMode: boolean = false): string {
  if (!math) return '';

  // Clean math string
  let cleanMath = math.trim();
  cleanMath = cleanMath.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Handle trailing punctuation that might be inside math
  let trailingPunct = '';
  const punctMatch = cleanMath.match(/([.,:;!?]+)$/);
  if (punctMatch && !cleanMath.endsWith('}') && !cleanMath.endsWith('\\.')) {
    trailingPunct = punctMatch[1];
    cleanMath = cleanMath.slice(0, -trailingPunct.length).trim();
  }

  try {
    const katexHtml = katex.renderToString(cleanMath, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });

    // Verify if KaTeX generated an error element
    if (katexHtml.includes('class="katex-error"')) {
      // If KaTeX could not parse cleanly, fallback to clean Unicode math styling
      const unicodeMath = latexToUnicode(cleanMath);
      return `<span class="inline-math font-serif italic text-blue-900 font-medium px-1">${unicodeMath}</span>${trailingPunct}`;
    }

    return katexHtml + trailingPunct;
  } catch (e) {
    console.warn('KaTeX render fallback for:', math, e);
    const unicodeMath = latexToUnicode(cleanMath);
    return `<span class="inline-math font-serif italic text-blue-900 font-medium px-1">${unicodeMath}</span>${trailingPunct}`;
  }
}

/**
 * Component to render text with embedded mathematical equations (Equation)
 */
export const MathText: React.FC<MathTextProps> = ({ content, className = '', inline = false }) => {
  if (!content) return null;

  const tokens = splitMathTokens(content);

  // If no math tokens found, render text with bold parsing
  if (tokens.length === 1 && tokens[0].type === 'text') {
    return <span className={className}>{renderTextWithBold(tokens[0].raw)}</span>;
  }

  return (
    <span className={`math-text-container ${className}`}>
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <span key={idx}>{renderTextWithBold(token.raw)}</span>;
        }

        const isBlock = !inline && token.type === 'block-math';
        const html = renderKaTeXHtml(token.math, isBlock);

        if (isBlock) {
          return (
            <div
              key={idx}
              className="my-3 py-1.5 px-4 bg-slate-50/90 border border-slate-200/80 rounded-lg text-center overflow-x-auto shadow-sm"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        return (
          <span
            key={idx}
            className="inline-math px-1 py-0.5 rounded bg-blue-50/40 inline-block align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};

/**
 * Helper to parse bold markdown **...** inside plain text
 */
function renderTextWithBold(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={pIdx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return <span key={pIdx}>{part}</span>;
  });
}

export default MathText;
