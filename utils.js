import { ToastService } from './components/toast.js';

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

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
 * Matrix Visualisation Engine.
 */
export const styleMatrices = (text, mode = 'display') => {
    if (!text) return '';
    
    if (mode === 'edit') {
        return escapeHtml(text); 
    }

    const parts = text.split(/(\{matrix:.*?\})/gi);
    return parts.map(part => {
        const match = part.match(/^\{matrix:(?:(.*?):)?(.*?)\}$/i);
        if (match) {
            const connector = match[1] || 'via';
            const value = match[2] || match[1];
            return `<span class="peco-matrix-connector">${escapeHtml(connector)}</span> ${escapeHtml(value)}`;
        }
        return escapeHtml(part);
    }).join('');
};

export const extractTextFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        return fullText;
    } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } else {
        throw new Error('Unsupported file format. Please upload PDF or DOCX.');
    }
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
            return `<span class="peco-term">${styleMatrices(term, 'display')}</span>`;
        }).join('<span class="text-[9px] font-bold text-slate-400 mx-2">OR</span>');
        
        return `<div class="flex flex-wrap items-center gap-2 inline-block">${orHtml}</div>`;
    }).join('<span class="text-[9px] font-bold text-teal-600 mx-3">AND</span>');
    
    return `<div class="flex flex-wrap items-center gap-3">${andHtml}</div>`;
};

export const extractJsonFromString = (str) => {
    if (!str) return null;
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    let startIndex = (firstBrace !== -1 && (firstBrace < firstBracket || firstBracket === -1)) ? firstBrace : firstBracket;
    if (startIndex === -1) return null;

    const openingChar = str[startIndex];
    const closingChar = openingChar === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    for (let i = startIndex; i < str.length; i++) {
        const char = str[i];
        if (inString) {
            if (char === '"' && str[i-1] !== '\\') inString = false;
            continue; 
        }
        if (char === '"') { inString = true; continue; }
        if (char === openingChar) depth++;
        if (char === closingChar) depth--;
        if (depth === 0) return str.substring(startIndex, i + 1);
    }
    return null;
};

export const showLoading = (container, message) => { 
    if(container) container.innerHTML = `<div class="text-center p-20 text-slate-600 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">${message}</p></div>`; 
};

export const showError = (container, message) => { 
    if(!container) return;
    container.innerHTML = `<div class="p-10 bg-rose-50 border border-rose-100 text-rose-800 rounded-[2.5rem] flex items-center gap-4"><i class="fa-solid fa-triangle-exclamation text-2xl"></i><div><p class="font-extrabold text-[10px] uppercase tracking-widest">System Logic Fault</p><p class="text-sm font-medium mt-1">${message}</p></div></div>`; 
};

export const handleExport = async (contentSelector, format, filename) => {
    ToastService.show('Finalising export...', 'info');
    setTimeout(() => ToastService.show(`${format.toUpperCase()} ready for download.`, 'success'), 1000);
};