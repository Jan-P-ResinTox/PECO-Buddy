import { appState, dom } from '../state.js';
import { ToastService } from '../components/toast.js';
import { PECO_MAP } from '../config.js';
import { handleExport } from '../utils.js'; // Using generic export for JSON if needed

export function initNlpToolkitView() {
    const container = dom.mainContent.querySelector('#nlp-toolkit-container');
    if (!container) return;
    
    const termInput = container.querySelector('#nlp-term-input');
    const categorySelect = container.querySelector('#nlp-category-select');
    const addBtn = container.querySelector('#add-nlp-term-btn');
    const tableContainer = container.querySelector('#nlp-table-container');
    const paginationControls = container.querySelector('#nlp-pagination-controls');
    const exportRulesBtn = container.querySelector('#export-nlp-rules-btn');
    const importRulesBtn = container.querySelector('#import-nlp-rules-btn');
    const importRulesInput = container.querySelector('#import-nlp-rules-input');
    const searchInput = container.querySelector('#nlp-search-input');
    const ITEMS_PER_PAGE = 25;

    const renderTable = () => {
        const page = appState.nlpCurrentPage;
        let termsToRender = [...appState.nlpTerms];

        const sortKey = appState.nlpSort.key;
        const sortDir = appState.nlpSort.direction === 'asc' ? 1 : -1;
        termsToRender.sort((a, b) => {
            return a[sortKey].localeCompare(b[sortKey]) * sortDir;
        });
        const query = appState.nlpSearchQuery.toLowerCase();
        if (query) {
            termsToRender = termsToRender.filter(item => item.term.toLowerCase().includes(query));
        }

        if (termsToRender.length === 0) {
            tableContainer.innerHTML = `<p class="text-center text-slate-500 py-8">No terms found.</p>`;
            paginationControls.innerHTML = '';
            return;
        }
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedTerms = termsToRender.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        const tableRows = paginatedTerms.map((item, index) => {
            const originalIndex = appState.nlpTerms.findIndex(t => t.term === item.term && t.category === item.category);
            return `
            <tr class="border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                <td class="p-3 text-sm text-slate-700">${startIndex + index + 1}</td>
                <td class="p-3 text-sm text-slate-900 font-medium">${item.term}</td>
                <td class="p-3 text-sm text-slate-600">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full" style="background-color: ${PECO_MAP[item.category].color}20; color: ${PECO_MAP[item.category].color};">
                        ${PECO_MAP[item.category].label}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <button data-index="${originalIndex}" class="nlp-delete-btn text-red-500 hover:text-red-700 text-lg">&times;</button>
                </td>
            </tr>
        `}).join('');
        const sortIcon = (key) => {
            if (appState.nlpSort.key !== key) return 'fa-sort';
            return appState.nlpSort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
        };
        tableContainer.innerHTML = `
            <table class="w-full text-left">
                <thead class="bg-slate-100 border-b-2 border-slate-300">
                    <tr>
                        <th class="p-3 text-sm font-semibold text-slate-600 w-12">#</th>
                        <th class="p-3 text-sm font-semibold text-slate-600"><button data-sort="term" class="w-full text-left flex items-center justify-between">Term <i class="fa-solid ${sortIcon('term')}"></i></button></th>
                        <th class="p-3 text-sm font-semibold text-slate-600"><button data-sort="category" class="w-full text-left flex items-center justify-between">Category <i class="fa-solid ${sortIcon('category')}"></i></button></th>
                        <th class="p-3 text-sm font-semibold text-slate-600 text-center w-20">Delete</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        renderPagination(termsToRender.length, page);
    };

    const renderPagination = (totalItems, currentPage) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) {
            paginationControls.innerHTML = '';
            return;
        }
        const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
        paginationControls.innerHTML = `
            <span class="font-medium text-slate-700">Showing ${startItem}-${endItem} of ${totalItems}</span>
            <div class="flex gap-2">
                <button id="nlp-prev-page" class="px-3 py-1 bg-slate-200 rounded-md hover:bg-slate-300 disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <button id="nlp-next-page" class="px-3 py-1 bg-slate-200 rounded-md hover:bg-slate-300 disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;
    };

    const handleAddTerm = () => {
        const terms = termInput.value.split(';').map(t => t.trim().toLowerCase()).filter(Boolean);
        const category = categorySelect.value;
        if (terms.length > 0) {
            const existingTerms = new Set(appState.nlpTerms.map(t => `${t.term.toLowerCase()}|${t.category}`));
            const newTerms = terms
                .map(term => ({ term, category }))
                .filter(t => !existingTerms.has(`${t.term}|${t.category}`));
            if (newTerms.length > 0) {
                appState.nlpTerms.unshift(...newTerms);
                ToastService.show(`${newTerms.length} term(s) added.`, 'success');
            }
            if (newTerms.length < terms.length) {
                ToastService.show(`${terms.length - newTerms.length} duplicate(s) ignored.`, 'info');
            }

            termInput.value = '';
            termInput.focus();
            appState.nlpCurrentPage = 1;
            renderTable();
        }
    };

    const exportData = (data, filename) => {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            if (typeof saveAs !== 'undefined') {
                saveAs(blob, filename);
            } else {
                 throw new Error("FileSaver.js is not loaded.");
            }
        } catch (error) {
            ToastService.show(`Error exporting data: ${error.message}`, 'error');
        }
    };

    addBtn.addEventListener('click', handleAddTerm);
    termInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTerm(); } });
    exportRulesBtn.addEventListener('click', () => exportData(appState.nlpTerms, 'peco-nlp-rules.json'));
    importRulesBtn.addEventListener('click', () => importRulesInput.click());
    importRulesInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const loadedRules = JSON.parse(ev.target.result);
                if (!Array.isArray(loadedRules) || (loadedRules.length > 0 && (!loadedRules[0].term || !loadedRules[0].category))) throw new Error('Invalid format.');
                const existing = new Set(appState.nlpTerms.map(t => `${t.term}|${t.category}`));
                const newTerms = loadedRules.filter(t => !existing.has(`${t.term}|${t.category}`));
                appState.nlpTerms.unshift(...newTerms);
                renderTable();
                ToastService.show(`${newTerms.length} new rules imported.`, 'success');
            } catch (err) { ToastService.show(`Import failed: ${err.message}`, 'error'); }
        };
        reader.readAsText(file);
    });

    searchInput.addEventListener('input', (e) => {
        appState.nlpSearchQuery = e.target.value;
        appState.nlpCurrentPage = 1;
        renderTable();
    });

    container.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        if (button.dataset.sort) {
            const sortKey = button.dataset.sort;
            if (appState.nlpSort.key === sortKey) appState.nlpSort.direction = appState.nlpSort.direction === 'asc' ? 'desc' : 'asc';
            else { appState.nlpSort.key = sortKey; appState.nlpSort.direction = 'asc'; }
            renderTable();
        } else if (button.id === 'nlp-prev-page') {
            if (appState.nlpCurrentPage > 1) { appState.nlpCurrentPage--; renderTable(); }
        } else if (button.id === 'nlp-next-page') {
            const totalPages = Math.ceil(appState.nlpTerms.length / ITEMS_PER_PAGE);
            if (appState.nlpCurrentPage < totalPages) { appState.nlpCurrentPage++; renderTable(); }
        } else if (button.classList.contains('nlp-delete-btn')) {
            const index = parseInt(button.dataset.index, 10);
            appState.nlpTerms.splice(index, 1);
            const totalPages = Math.ceil(appState.nlpTerms.length / ITEMS_PER_PAGE);
            if (appState.nlpCurrentPage > totalPages && totalPages > 0) appState.nlpCurrentPage = totalPages;
            renderTable();
        }
    });
    renderTable();
}

export const runLocalNlpAnalysis = (text) => {
    const terms = appState.nlpTerms;
    const peco = { population: '', exposure: '', comparison: '', outcome: '' };
    const matches = [];

    // Normalize text
    const normalizedText = text.toLowerCase();

    // Find matches
    terms.forEach(termObj => {
        const term = termObj.term.toLowerCase();
        if (normalizedText.includes(term)) {
            // Check if term is already added to avoid duplicates
            const currentVal = peco[termObj.category];
            if (!currentVal.toLowerCase().includes(term)) {
                peco[termObj.category] = currentVal ? `${currentVal} ; ${termObj.term}` : termObj.term;
                matches.push(termObj);
            }
        }
    });

    // Construct analysis object mocking Gemini response
    const analysis = {
        feedback: Object.keys(PECO_MAP).map(key => {
            const categoryMatches = matches.filter(m => m.category === key);
            if (categoryMatches.length > 0) {
                return {
                    component: key,
                    suggestions: categoryMatches.map(m => ({
                        refined_term: m.term,
                        advisory_message: `Identified "${m.term}" from your local vocabulary.`,
                        counter_consideration: null
                    }))
                };
            } else {
                return {
                    component: key,
                    suggestions: [{
                        refined_term: "Missing",
                        advisory_message: `No terms found for ${PECO_MAP[key].label} in your local vocabulary.`,
                        counter_consideration: "Consider adding relevant terms to the NLP Toolkit."
                    }]
                };
            }
        })
    };

    return { peco, analysis };
};