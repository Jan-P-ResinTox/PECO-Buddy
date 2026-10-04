import { ToastService } from './components/toast.js';
import { appState } from './state.js';

export const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * LaTeX / Markdown cleanup for model-generated display text.
 * Structured-output models occasionally leak LaTeX (\textit{...}, \'e) or
 * markdown emphasis (**bold**, *italic*) into free-text fields. decodeLaTeX
 * runs before HTML escaping so accents become real Unicode characters and
 * emphasis markers survive escaping; applyMarkdownEmphasis then turns the
 * surviving markers into semantic <strong>/<em> tags.
 */
const ACCENT_MAPS = {
    "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', n: 'ń', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', Y: 'Ý', N: 'Ń' },
    '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
    '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
    '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' },
    '~': { a: 'ã', n: 'ñ', o: 'õ', A: 'Ã', N: 'Ñ', O: 'Õ' }
};

const decodeLaTeX = (text) => {
    let out = text;
    out = out.replace(/\\(?:textbf|textsc)\{([^{}]*)\}/g, '**$1**');
    out = out.replace(/\\(?:textit|emph)\{([^{}]*)\}/g, '*$1*');
    out = out.replace(/\{\\(?:bf|bfseries)\s+([^{}]*)\}/g, '**$1**');
    out = out.replace(/\{\\(?:it|itshape|em)\s+([^{}]*)\}/g, '*$1*');
    out = out.replace(/\\(?:texttt|underline|text)\{([^{}]*)\}/g, '$1');
    out = out.replace(/\\(['`^"~])\{?([a-zA-Z])\}?/g, (m, accent, ch) => (ACCENT_MAPS[accent] && ACCENT_MAPS[accent][ch]) || ch);
    out = out.replace(/\\c\{([cC])\}/g, (m, ch) => (ch === 'c' ? 'ç' : 'Ç'));
    out = out.replace(/\\([&%$#_{}])/g, '$1');
    out = out.replace(/\\[,;! ]/g, ' ');
    return out;
};

const applyMarkdownEmphasis = (html) => {
    return html
        .replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^\w*])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>');
};

/**
 * Matrix Visualisation Engine.
 */
const MATRIX_CONNECTORS = ['in', 'via', 'within', 'across', 'from'];
// Models occasionally echo the placeholder from the prompt's syntax
// description ({matrix:connector:term}); these words never carry meaning.
const MATRIX_PLACEHOLDERS = ['connector', 'preposition', 'term'];

/**
 * Parses the body of a {matrix:connector:value} tag. Returns
 * { connector, value }; connector is null when the tag omits it, value is
 * null for connector-only or empty tags. Never invents a connector.
 */
const parseMatrixTag = (inner) => {
    const segments = inner.split(':').map(s => s.trim()).filter(s => s.length > 0);
    if (segments.length === 0) return { connector: null, value: null };
    const firstIsPlaceholder = MATRIX_PLACEHOLDERS.includes(segments[0].toLowerCase());
    if (segments.length === 1) {
        if (MATRIX_CONNECTORS.includes(segments[0].toLowerCase()) || firstIsPlaceholder) {
            return { connector: null, value: null };
        }
        return { connector: null, value: segments[0] };
    }
    if (firstIsPlaceholder) {
        // {matrix:connector:maternal blood} — drop the echoed placeholder,
        // the remainder is the value.
        return { connector: null, value: segments.slice(1).join(':').trim() };
    }
    return { connector: segments[0], value: segments.slice(1).join(':').trim() };
};

/**
 * Converts {matrix:...} tags to plain descriptive prose: keeps an explicit
 * connector as an ordinary word, keeps a lone value, and drops connector-only
 * or empty tags. Used to enforce the "Matrix Tagging off" setting on AI
 * responses so tags never reach stored state or exports.
 */
export const stripMatrixTags = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{matrix:([^}]*)\}/gi, (_, inner) => {
        const { connector, value } = parseMatrixTag(inner);
        if (!value) return '';
        return connector ? `${connector} ${value}` : value;
    });
};

export const styleMatrices = (text, mode = 'display') => {
    if (!text) return '';

    if (mode === 'edit') {
        return escapeHtml(text);
    }

    const parts = text.split(/(\{matrix:.*?\})/gi);
    return parts.map(part => {
        const inner = (part.match(/^\{matrix:(.*?)\}$/i) || [])[1];
        if (inner === undefined) {
            return applyMarkdownEmphasis(escapeHtml(decodeLaTeX(part)));
        }
        const { connector, value } = parseMatrixTag(inner);
        // Tagging disabled: plain descriptive prose, no matrix treatment.
        if (appState.matrixTagging === false) {
            return escapeHtml(value ? (connector ? `${connector} ${value}` : value) : '');
        }
        // Connector-only or value-less tag: nothing to display — never a
        // dangling connector word.
        if (!connector || !value) {
            return escapeHtml(value || '');
        }
        return `<span class="peco-matrix-connector">${escapeHtml(connector)}</span> ${escapeHtml(value)}`;
    }).join('');
};

export const stripMetadataFromText = (text) => {
    if (!text) return '';
    // Remove common metadata patterns
    return text
        .replace(/^Author:.*$/gim, '')
        .replace(/^Date:.*$/gim, '')
        .replace(/^Subject:.*$/gim, '')
        .replace(/^Keywords:.*$/gim, '')
        .replace(/^Creator:.*$/gim, '')
        .replace(/^Producer:.*$/gim, '')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]') // Redact emails
        .replace(/^\s*[\r\n]/gm, ''); // Remove empty lines created by stripping
};

export const copyTableToClipboard = async (tableSelector) => {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    try {
        const html = table.outerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([table.innerText], { type: 'text/plain' });
        const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })];
        await navigator.clipboard.write(data);
        ToastService.show('Table data copied to clipboard!', 'success');
    } catch (err) {
        console.error('Clipboard error:', err);
        ToastService.show('Failed to copy table.', 'error');
    }
};

/**
 * Renders PECO components.
 */
export const formatPecoForDisplay = (text, isEditable = false) => {
    if (!text || typeof text !== 'string') return '<span class="italic text-slate-400">Empty</span>';
    
    const andGroups = text.split('&').map(s => s.trim()).filter(Boolean);
    const andHtml = andGroups.map((group, andIdx) => {
        const orTerms = group.split(';').map(s => s.trim()).filter(Boolean);
        const orHtml = orTerms.map((term, orIdx) => {
            if (isEditable) {
                return `
                    <span class="peco-pill-editable">
                        <span class="peco-term-inner font-mono text-[11px]">${escapeHtml(term)}</span>
                        <button class="peco-pill-remove" data-and="${andIdx}" data-or="${orIdx}" aria-label="Remove term">&times;</button>
                    </span>`;
            }
            return `<span class="peco-term" data-term="${escapeHtml(term)}">${styleMatrices(term, 'display')}</span>`;
        }).join('<span class="text-[9px] font-bold text-slate-400 mx-2">OR</span>');
        
        return `<div class="flex flex-wrap items-center gap-2 inline-block">${orHtml}</div>`;
    }).join('<span class="text-[9px] font-bold text-teal-600 mx-3">AND</span>');
    
    return `<div class="flex flex-wrap items-center gap-3">${andHtml}</div>`;
};

export const cleanJsonOutput = (text) => {
    if (!text) return "{}";
    let cleaned = String(text).trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    return cleaned.trim();
};

export const extractJsonFromString = (str) => {
    if (!str) return null;
    const cleaned = cleanJsonOutput(str);

    // 1. Direct parse test
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch (_) {}

    // 2. Balanced bracket scan
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIndex = (firstBrace !== -1 && (firstBrace < firstBracket || firstBracket === -1)) ? firstBrace : firstBracket;
    if (startIndex !== -1) {
        const openingChar = cleaned[startIndex];
        const closingChar = openingChar === '{' ? '}' : ']';
        let depth = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = startIndex; i < cleaned.length; i++) {
            const char = cleaned[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === openingChar) depth++;
                if (char === closingChar) {
                    depth--;
                    if (depth === 0) {
                        const candidate = cleaned.substring(startIndex, i + 1);
                        try {
                            JSON.parse(candidate);
                            return candidate;
                        } catch (_) {
                            // continue scanning if nested/malformed
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback regex extraction of largest JSON block
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try {
            JSON.parse(objMatch[0]);
            return objMatch[0];
        } catch (_) {}
    }

    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
        try {
            JSON.parse(arrMatch[0]);
            return arrMatch[0];
        } catch (_) {}
    }

    return null;
};

export const showLoading = (container, message) => {
    if(container) container.innerHTML = `<div class="text-center p-20 text-slate-600 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">${message}</p></div>`; 
};

export const showError = (container, message) => { 
    if(!container) return;
    container.innerHTML = `<div class="p-10 bg-rose-50 border border-rose-100 text-rose-800 rounded-[2.5rem] flex items-start gap-4"><i class="fa-solid fa-triangle-exclamation text-2xl mt-1"></i><div class="flex-1 min-w-0"><p class="font-extrabold text-[10px] uppercase tracking-widest">System Logic Fault</p><p class="text-sm font-medium mt-1 whitespace-pre-wrap break-words overflow-hidden text-ellipsis">${escapeHtml(message)}</p></div></div>`; 
};

export const handleExport = async (contentSelector, format, filename) => {
    if (format === 'pdf') {
        ToastService.show('Preparing document for download...', 'info');
        try {
            const element = document.querySelector(contentSelector);
            if (!element) throw new Error("Content not found");

            // Save original styles of the element and its parent
            const originalStyle = element.style.cssText;
            const parent = element.parentElement;
            const parentOriginalStyle = parent ? parent.style.cssText : '';
            
            // Temporarily adjust for rendering to capture full scroll height
            element.style.width = '800px';
            element.style.maxWidth = 'none';
            element.style.height = 'max-content';
            element.style.maxHeight = 'none';
            element.style.overflow = 'visible';
            
            if (parent) {
                parent.style.height = 'max-content';
                parent.style.maxHeight = 'none';
                parent.style.overflow = 'visible';
                parent.scrollTop = 0;
            }
            element.scrollTop = 0;

            const canvas = await window.html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 800,
                scrollY: 0,
                scrollX: 0
            });

            // Restore original styles
            element.style.cssText = originalStyle;
            if (parent) {
                parent.style.cssText = parentOriginalStyle;
            }

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(filename || 'export.pdf');
            ToastService.show('PDF ready for download.', 'success');
        } catch (error) {
            console.error(error);
            ToastService.show('Error generating PDF.', 'error');
        }
    } else {
        ToastService.show('Finalising export...', 'info');
        setTimeout(() => ToastService.show(`${format.toUpperCase()} ready for download.`, 'success'), 1000);
    }
};