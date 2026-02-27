import { appState, dom } from '../state.js';
import { ToastService } from '../components/toast.js';
import { callEligibilitySuggesterAPI } from '../api/gemini.js';
import { escapeHtml } from '../utils.js';

export function initEligibilityToolkitView() {
    const viewContainer = document.getElementById('eligibility-toolkit-container');
    if (!viewContainer) return;

    const pecoContextContainer = document.getElementById('eligibility-peco-context');
    const inclusionTextarea = document.getElementById('eligibility-inclusion');
    const exclusionTextarea = document.getElementById('eligibility-exclusion');
    const suggestBtn = document.getElementById('eligibility-suggest-btn');
    const suggestionsDisplay = document.getElementById('eligibility-suggestions-display');

    // Robust State Access
    let currentPeco = null;
    try {
        if (appState.authorWorkflow && appState.authorWorkflow.pecoWorkshopData) {
            currentPeco = appState.authorWorkflow.pecoWorkshopData.peco;
        } else if (appState.authorWorkflow && appState.authorWorkflow.liveCoAuthorData) {
            currentPeco = appState.authorWorkflow.liveCoAuthorData.peco;
        }
    } catch(err) {
        console.error("Error reading PECO state for Eligibility Toolkit:", err);
    }

    if (pecoContextContainer) {
        if (currentPeco) {
            pecoContextContainer.innerHTML = `
                <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><strong>P:</strong> ${escapeHtml(currentPeco.population || 'N/A')}</div>
                    <div><strong>E:</strong> ${escapeHtml(currentPeco.exposure || 'N/A')}</div>
                    <div><strong>C:</strong> ${escapeHtml(currentPeco.comparison || 'N/A')}</div>
                    <div><strong>O:</strong> ${escapeHtml(currentPeco.outcome || 'N/A')}</div>
                </div>
            `;
            pecoContextContainer.classList.remove('italic');
        } else {
             pecoContextContainer.innerHTML = 'No PECO context loaded. Please complete PECO analysis.';
             pecoContextContainer.classList.add('italic');
        }
    }

    if (suggestBtn) {
        suggestBtn.addEventListener('click', async () => {
            if (!currentPeco) { ToastService.show('No PECO context found to generate suggestions.', 'warning'); return; }

            suggestBtn.disabled = true;
            suggestBtn.innerHTML = '<div class="loader"></div> Generating...';
            if (suggestionsDisplay) suggestionsDisplay.innerHTML = '';

            try {
                const result = await callEligibilitySuggesterAPI(currentPeco, null);
                
                const renderSuggestions = (criteria, type) => criteria.map(c => `
                    <div class="flex items-center justify-between text-sm p-2 rounded ${type === 'inclusion' ? 'bg-green-50' : 'bg-red-50'} border ${type === 'inclusion' ? 'border-green-100' : 'border-red-100'}">
                        <span>${escapeHtml(c)}</span>
                        <button class="add-criteria-btn text-lg font-bold ${type === 'inclusion' ? 'text-green-600' : 'text-red-600'} hover:scale-110 transition-transform" data-type="${type}" data-text="${escapeHtml(c)}">+</button>
                    </div>
                `).join('');

                if (suggestionsDisplay) {
                    suggestionsDisplay.innerHTML = `
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4 p-4 bg-slate-50 border rounded-xl">
                            <div>
                                <h5 class="font-bold text-green-700 mb-2 uppercase text-xs tracking-wider">Inclusion Suggestions</h5>
                                <div class="space-y-2">${renderSuggestions(result.inclusion_criteria, 'inclusion')}</div>
                            </div>
                            <div>
                                <h5 class="font-bold text-red-700 mb-2 uppercase text-xs tracking-wider">Exclusion Suggestions</h5>
                                <div class="space-y-2">${renderSuggestions(result.exclusion_criteria, 'exclusion')}</div>
                            </div>
                        </div>`;
                }

            } catch (error) {
                ToastService.show(`Suggestion failed: ${error.message}`, 'error');
            } finally {
                suggestBtn.disabled = false;
                suggestBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Suggest with AI';
            }
        });
    }

    if (suggestionsDisplay) {
        suggestionsDisplay.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-criteria-btn');
            if (btn) {
                const { type, text } = btn.dataset;
                const textarea = type === 'inclusion' ? inclusionTextarea : exclusionTextarea;
                if (textarea) {
                    textarea.value = (textarea.value.trim() ? textarea.value.trim() + '\n' : '') + (text || '');
                    btn.parentElement?.remove();
                }
            }
        });
    }
}