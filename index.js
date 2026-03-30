import { appState, dom } from './state.js';
import { MODE_CONFIG } from './config.js';
import { templates } from './views/templates.js';
import { ToastService } from './components/toast.js';
import { showModal } from './components/modal.js';
import { initAuthorToolkitFlow } from './views/pecoToolkit.js';
import { initReviewerToolkitView } from './views/reviewPeco.js';
import { initNlpToolkitView } from './views/nlpToolkit.js';

/**
 * Main application entry point for PECO-Buddy Public Beta 0.1.
 * Manages view routing, sidebar interactions, and global settings.
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        const getEl = (id) => document.getElementById(id);

        // Assign core DOM references
        dom.mainContent = getEl('main-content');
        dom.modalPlaceholder = getEl('modal-placeholder');
        dom.sidebarNav = getEl('sidebar-nav');
        dom.headerTitle = getEl('header-title');
        dom.headerSubtitle = getEl('header-subtitle');
        dom.appSidebar = getEl('app-sidebar');
        dom.appMainContent = getEl('app-main-content');

        // Initial Typography Sync
        const applyFontSize = (size) => {
            document.body.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
            document.body.classList.add(`font-size-${size}`);
            appState.fontSize = size;
            localStorage.setItem('peco_buddy_font_size', size);
        };
        applyFontSize(appState.fontSize);

        const renderToolkitView = () => {
            if (!dom.mainContent) return;
            let toolkitHTML;
            switch(appState.currentMode) {
                case 'peco_toolkit': toolkitHTML = templates.pecoToolkit; break;
                case 'review_peco': toolkitHTML = templates.reviewerToolkit; break;
                case 'nlp': toolkitHTML = templates.nlpToolkit; break;
                default: toolkitHTML = templates.pecoToolkit;
            }
            dom.mainContent.innerHTML = toolkitHTML;

            if (appState.currentMode === 'nlp') initNlpToolkitView();
            else if (appState.currentMode === 'review_peco') initReviewerToolkitView();
            else initAuthorToolkitFlow();

            updateSidebar();
        };

        const setMode = (mode) => {
            appState.currentMode = mode;
            const config = MODE_CONFIG[mode] || { title: '', subtitle: ''};
            if (dom.headerTitle) dom.headerTitle.textContent = config.title;
            if (dom.headerSubtitle) dom.headerSubtitle.textContent = config.subtitle;
            renderToolkitView();
        };

        const updateSidebar = () => {
            if (!dom.appSidebar) return;
            dom.appSidebar.querySelectorAll('.sidebar-link').forEach(link => {
                if (link.dataset && link.dataset.mode) {
                    link.classList.toggle('active', link.dataset.mode === appState.currentMode);
                }
            });
        };

        const showSettings = () => {
            showModal('Settings & Analysis Engine', `<div class="modal-body p-6">${templates.settingsView}</div>`, (modal) => {
                const aiBtn = modal.querySelector('#modal-engine-ai-btn');
                const nlpBtn = modal.querySelector('#modal-engine-nlp-btn');
                
                // Provider Configuration
                const providerSelect = modal.querySelector('#settings-provider-select');
                const fieldsGemini = modal.querySelector('#field-group-gemini');
                const fieldsCustom = modal.querySelector('#field-group-custom');
                const inputGeminiKey = modal.querySelector('#input-gemini-key');
                const inputCustomUrl = modal.querySelector('#input-custom-url');
                const inputCustomModel = modal.querySelector('#input-custom-model');
                const inputCustomKey = modal.querySelector('#input-custom-key');
                const saveConfigBtn = modal.querySelector('#save-provider-config-btn');
                const resetConfigBtn = modal.querySelector('#reset-provider-config-btn');
                const statusDisplay = modal.querySelector('#provider-status-display');
                
                // Assistance Level Slider
                const assistSlider = modal.querySelector('#settings-assistance-slider');
                const assistDisplay = modal.querySelector('#assistance-level-display');

                // Seed Control
                const seedSlider = modal.querySelector('#settings-seed-slider');
                const seedDisplay = modal.querySelector('#settings-seed-display');
                const seedInput = modal.querySelector('#settings-seed-input');

                if (seedSlider && seedDisplay && seedInput) {
                    const updateSeed = (val) => {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                            appState.globalSeed = num;
                            seedSlider.value = num;
                            seedInput.value = num;
                            seedDisplay.textContent = num;
                            localStorage.setItem('peco_buddy_seed', num);
                        }
                    };

                    updateSeed(appState.globalSeed);

                    seedSlider.oninput = (e) => updateSeed(e.target.value);
                    seedInput.oninput = (e) => updateSeed(e.target.value);
                }
                
                if (assistSlider && assistDisplay) {
                    assistSlider.value = appState.assistanceLevel;
                    const updateLabel = (val) => {
                        const v = parseInt(val);
                        if (v === 1) assistDisplay.textContent = "Minimal (1/5)";
                        else if (v === 2) assistDisplay.textContent = "Light (2/5)";
                        else if (v === 3) assistDisplay.textContent = "Standard (3/5)";
                        else if (v === 4) assistDisplay.textContent = "Detailed (4/5)";
                        else if (v === 5) assistDisplay.textContent = "Intense (5/5)";
                    };
                    updateLabel(appState.assistanceLevel);
                    
                    assistSlider.oninput = (e) => updateLabel(e.target.value);
                    assistSlider.onchange = (e) => {
                        appState.assistanceLevel = parseInt(e.target.value);
                        localStorage.setItem('peco_buddy_assistance_level', e.target.value);
                    };
                }

                // Strip Metadata Toggle
                const stripMetadataToggle = modal.querySelector('#settings-strip-metadata-toggle');
                if (stripMetadataToggle) {
                    stripMetadataToggle.checked = appState.stripMetadata;
                    stripMetadataToggle.onchange = (e) => {
                        appState.stripMetadata = e.target.checked;
                        localStorage.setItem('peco_buddy_strip_metadata', e.target.checked);
                        ToastService.show(`Metadata stripping ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
                    };
                }

                // Tabs
                const tabs = modal.querySelectorAll('.settings-tab-btn');
                const contents = modal.querySelectorAll('.settings-tab-content');
                tabs.forEach(tab => {
                    tab.onclick = (e) => {
                        e.preventDefault();
                        tabs.forEach(t => {
                            t.classList.remove('active', 'border-teal-600', 'text-teal-600');
                            t.classList.add('text-slate-500');
                        });
                        tab.classList.add('active', 'border-b-2', 'border-teal-600', 'text-teal-600');
                        tab.classList.remove('text-slate-500');
                        contents.forEach(c => c.classList.add('hidden'));
                        modal.querySelector(`#settings-tab-${tab.dataset.tab}`).classList.remove('hidden');
                    };
                });
                if(tabs.length > 0) tabs[0].click(); 

                // Heuristics Editor
                const hComp = modal.querySelector('#heuristic-comparator');
                const hExp = modal.querySelector('#heuristic-exposure');
                const hPop = modal.querySelector('#heuristic-population');
                const hOut = modal.querySelector('#heuristic-outcome');
                const saveHBtn = modal.querySelector('#save-heuristics-btn');

                if (hComp) hComp.value = appState.heuristics.comparator;
                if (hExp) hExp.value = appState.heuristics.exposure;
                if (hPop) hPop.value = appState.heuristics.population;
                if (hOut) hOut.value = appState.heuristics.outcome;

                if (saveHBtn) {
                    saveHBtn.onclick = () => {
                        appState.heuristics.comparator = hComp.value;
                        appState.heuristics.exposure = hExp.value;
                        appState.heuristics.population = hPop.value;
                        appState.heuristics.outcome = hOut.value;
                        ToastService.show('Applied heuristics updated and encoded.', 'success');
                    };
                }

                // Font Size Toggles
                const fsBtns = modal.querySelectorAll('.font-size-btn');
                fsBtns.forEach(btn => {
                    if (btn.dataset.size === appState.fontSize) btn.classList.add('active');
                    btn.onclick = () => {
                        fsBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        applyFontSize(btn.dataset.size);
                    };
                });

                const updateSelection = () => {
                    if (aiBtn) {
                        aiBtn.classList.toggle('bg-teal-50', appState.analysisEngine === 'ai');
                        aiBtn.classList.toggle('border-teal-500', appState.analysisEngine === 'ai');
                    }
                    if (nlpBtn) {
                        nlpBtn.classList.toggle('bg-teal-50', appState.analysisEngine === 'nlp');
                        nlpBtn.classList.toggle('border-teal-500', appState.analysisEngine === 'nlp');
                    }
                    
                    const aiCheck = aiBtn?.querySelector('.active-check');
                    const nlpCheck = nlpBtn?.querySelector('.active-check');
                    if (aiCheck) aiCheck.style.opacity = appState.analysisEngine === 'ai' ? '1' : '0';
                    if (nlpCheck) nlpCheck.style.opacity = appState.analysisEngine === 'nlp' ? '1' : '0';
                };

                // Provider Config Logic
                const initProviderUI = () => {
                    providerSelect.value = appState.aiProvider || 'gemini';
                    inputGeminiKey.value = appState.globalApiKey || '';
                    inputCustomUrl.value = appState.aiBaseUrl || '';
                    inputCustomModel.value = appState.aiModel || '';
                    inputCustomKey.value = appState.globalApiKey || ''; // Reuse global key storage

                    const updateVisibility = () => {
                        const isGemini = providerSelect.value === 'gemini';
                        fieldsGemini.classList.toggle('hidden', !isGemini);
                        fieldsCustom.classList.toggle('hidden', isGemini);
                        
                        // Prefill defaults if empty when switching
                        if (!isGemini && !inputCustomUrl.value) {
                             if (providerSelect.value === 'local') inputCustomUrl.value = 'http://localhost:11434/v1';
                             if (providerSelect.value === 'openai') inputCustomUrl.value = 'https://api.openai.com/v1';
                        }
                    };
                    providerSelect.onchange = updateVisibility;
                    updateVisibility();
                };

                if (saveConfigBtn) {
                    saveConfigBtn.onclick = () => {
                        const provider = providerSelect.value;
                        appState.aiProvider = provider;
                        localStorage.setItem('peco_buddy_ai_provider', provider);
                        
                        if (provider === 'gemini') {
                            const key = inputGeminiKey.value.trim();
                            if (key) {
                                appState.globalApiKey = key;
                                localStorage.setItem('peco_buddy_api_key', key);
                            }
                        } else {
                            const url = inputCustomUrl.value.trim();
                            const model = inputCustomModel.value.trim();
                            const key = inputCustomKey.value.trim();
                            
                            appState.aiBaseUrl = url;
                            appState.aiModel = model;
                            appState.globalApiKey = key; // Save custom key in same global var
                            
                            localStorage.setItem('peco_buddy_ai_base_url', url);
                            localStorage.setItem('peco_buddy_ai_model', model);
                            if(key) localStorage.setItem('peco_buddy_api_key', key);
                        }
                        
                        ToastService.show('AI Configuration Saved', 'success');
                        if (statusDisplay) {
                            statusDisplay.classList.remove('hidden');
                            setTimeout(() => statusDisplay.classList.add('hidden'), 3000);
                        }
                    };
                }

                if (resetConfigBtn) {
                    resetConfigBtn.onclick = () => {
                        if (confirm('Reset all AI configuration to default?')) {
                            localStorage.removeItem('peco_buddy_ai_provider');
                            localStorage.removeItem('peco_buddy_ai_base_url');
                            localStorage.removeItem('peco_buddy_ai_model');
                            localStorage.removeItem('peco_buddy_api_key');
                            
                            appState.aiProvider = 'gemini';
                            appState.aiBaseUrl = '';
                            appState.aiModel = '';
                            appState.globalApiKey = '';
                            
                            initProviderUI();
                            ToastService.show('Configuration Reset', 'info');
                        }
                    };
                }

                if (aiBtn) aiBtn.onclick = () => { appState.analysisEngine = 'ai'; updateSelection(); };
                if (nlpBtn) nlpBtn.onclick = () => { appState.analysisEngine = 'nlp'; updateSelection(); };

                initProviderUI();
                updateSelection();
            }, (modal, close) => {
                const container = modal.querySelector('.modal-container');
                const newFoot = document.createElement('div');
                newFoot.className = 'modal-footer p-4 border-t flex justify-end';
                newFoot.innerHTML = `<button class="bg-teal-600 text-white px-10 py-3 rounded-2xl font-extrabold uppercase text-[11px] tracking-widest shadow-lg hover:bg-teal-700 transition-all border-none">Done</button>`;
                newFoot.querySelector('button').onclick = () => {
                    close();
                    if (appState.currentMode === 'peco_toolkit') renderToolkitView();
                };
                container.appendChild(newFoot);
            });
        };

        const showUserManual = () => {
            showModal('User Manual Public Beta 0.1', `<div class="modal-body p-0">${templates.userManualView}</div>`, (modal) => {
                const searchInput = modal.querySelector('#manual-search-input');
                const sections = modal.querySelectorAll('.manual-section');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        const query = e.target.value.toLowerCase();
                        sections.forEach(section => {
                            const text = section.innerText.toLowerCase();
                            section.style.display = text.includes(query) ? 'block' : 'none';
                        });
                    });
                }
            }, (modal, close) => {
                const container = modal.querySelector('.modal-container');
                const foot = document.createElement('div');
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm border-none cursor-pointer">Close</button>`;
                foot.onclick = close;
                container.appendChild(foot);
            });
        };

        const showRationale = () => {
            showModal('Scientific Version Rationale', `<div class="modal-body p-6">${templates.versionRationaleView}</div>`, null, (modal, close) => {
                const container = modal.querySelector('.modal-container');
                const foot = document.createElement('div');
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm border-none cursor-pointer">Close</button>`;
                foot.onclick = close;
                container.appendChild(foot);
            });
        };

        const showCopyright = () => {
            showModal('Legal Notice & IP', `<div class="modal-body p-6">${templates.copyrightView}</div>`, null, (modal, close) => {
                const container = modal.querySelector('.modal-container');
                const foot = document.createElement('div');
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm border-none cursor-pointer">Close</button>`;
                foot.onclick = close;
                container.appendChild(foot);
            });
        };

        // Attach sidebar event listeners
        if (dom.appSidebar) {
            dom.appSidebar.addEventListener('click', (e) => {
                const link = e.target.closest('.sidebar-link');
                if (!link) return;
                
                e.preventDefault();
                const mode = link.dataset.mode;
                if (mode) {
                    setMode(mode);
                } else {
                    const id = link.id;
                    if (id === 'show-settings-btn') showSettings();
                    else if (id === 'show-manual-btn') showUserManual();
                    else if (id === 'show-rationale-btn') showRationale();
                    else if (id === 'show-copyright-btn') showCopyright();
                }
            });
        }

        // Tooltip logic
        const tooltipEl = getEl('global-tooltip');
        let tooltipTimeout;

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target && tooltipEl) {
                clearTimeout(tooltipTimeout);
                const text = target.getAttribute('data-tooltip');
                tooltipEl.textContent = text;
                tooltipEl.classList.remove('hidden');
                
                const rect = target.getBoundingClientRect();
                const tooltipRect = tooltipEl.getBoundingClientRect();
                
                let top = rect.top - tooltipRect.height - 10;
                let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                
                if (top < 0) top = rect.bottom + 10;
                if (left < 0) left = 10;
                if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 10;
                
                tooltipEl.style.top = `${top + window.scrollY}px`;
                tooltipEl.style.left = `${left + window.scrollX}px`;
                tooltipEl.style.opacity = '1';
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target && tooltipEl) {
                tooltipEl.style.opacity = '0';
                tooltipTimeout = setTimeout(() => {
                    tooltipEl.classList.add('hidden');
                }, 150);
            }
        });

        // Initial render
        setMode('peco_toolkit');

    } catch (e) {
        console.error("Initialization Error:", e);
    }
});