import { appState, dom, safeStorage } from './state.js';
import { MODE_CONFIG } from './config.js';
import { templates } from './views/templates.js';
import { ToastService } from './components/toast.js';
import { showModal } from './components/modal.js';
import { initAuthorToolkitFlow } from './views/pecoToolkit.js';
import { testProviderConnection } from './api/gemini.js';
import { ActivityChip } from './components/activity.js';
import { resumeDraft } from './session.js';

// Global error logging for Dev-Team
window.addEventListener('error', (event) => {
    console.error(`[Global Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error(`[Unhandled Promise Rejection]`, event.reason);
});

/**
 * Main application entry point for PECO-Buddy Closed Pilot Alpha 0.1.0.
 * Manages view routing, sidebar interactions, and global settings.
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        const getEl = (id) => document.getElementById(id);
        console.info('[PECO-Buddy] Closed Pilot Alpha 0.1.0 — build r9 (2026-09-26) loaded. If this line is missing after a hard refresh, your browser is running a stale bundle.');

        // Assign core DOM references
        dom.mainContent = getEl('main-content');
        dom.modalPlaceholder = getEl('modal-placeholder');
        dom.sidebarNav = getEl('sidebar-nav');
        dom.headerTitle = getEl('header-title');
        dom.headerSubtitle = getEl('header-subtitle');
        dom.appSidebar = getEl('app-sidebar');
        dom.appMainContent = getEl('app-main-content');

        // Activity status chip: every AI phase, retry, and repair renders live.
        ActivityChip.bind(getEl('activity-chip'));

        // Initial Typography Sync
        const applyFontSize = (size) => {
            document.body.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
            document.body.classList.add(`font-size-${size}`);
            appState.fontSize = size;
            safeStorage.setItem('peco_buddy_font_size', size);
        };
        applyFontSize(appState.fontSize);

        // Collapsible sidebar (icon rail mode, persisted)
        const collapseBtn = getEl('sidebar-collapse-btn');
        const collapseIcon = getEl('sidebar-collapse-icon');

        const applySidebarCollapsed = (collapsed) => {
            if (dom.appSidebar) dom.appSidebar.classList.toggle('sidebar-collapsed', collapsed);
            if (dom.appMainContent) dom.appMainContent.classList.toggle('sidebar-collapsed', collapsed);
            if (collapseIcon) collapseIcon.className = `fa-solid ${collapsed ? 'fa-angles-right' : 'fa-angles-left'} text-xs`;
            if (collapseBtn) collapseBtn.setAttribute('data-tooltip', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            safeStorage.setItem('peco_buddy_sidebar_collapsed', collapsed);
        };

        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                applySidebarCollapsed(!dom.appSidebar.classList.contains('sidebar-collapsed'));
            });
        }
        applySidebarCollapsed(safeStorage.getItem('peco_buddy_sidebar_collapsed') === 'true');

        const renderToolkitView = () => {
            if (!dom.mainContent) return;

            // Session resume: a refresh no longer destroys the working draft.
            // A corrupt draft never restores garbage — resumeDraft validates.
            const resumed = resumeDraft();
            if (resumed.applied) {
                const when = resumed.savedAt ? new Date(resumed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier';
                ToastService.show(`Session restored from your draft (saved ${when}).`, 'info');
            }

            dom.mainContent.innerHTML = templates.pecoToolkit;
            initAuthorToolkitFlow();

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
                const fieldsOpenAI = modal.querySelector('#field-group-openai');
                const fieldsAnthropic = modal.querySelector('#field-group-anthropic');
                const fieldsPerplexity = modal.querySelector('#field-group-perplexity');
                const fieldsMistral = modal.querySelector('#field-group-mistral');
                const fieldsCustom = modal.querySelector('#field-group-custom');

                const inputGeminiKey = modal.querySelector('#input-gemini-key');
                const geminiModelSelect = modal.querySelector('#settings-gemini-model');
                const inputOpenAiKey = modal.querySelector('#input-openai-key');
                const inputOpenAiModel = modal.querySelector('#input-openai-model');
                const inputAnthropicKey = modal.querySelector('#input-anthropic-key');
                const inputAnthropicModel = modal.querySelector('#input-anthropic-model');
                const inputPerplexityKey = modal.querySelector('#input-perplexity-key');
                const inputPerplexityModel = modal.querySelector('#input-perplexity-model');
                const inputMistralKey = modal.querySelector('#input-mistral-key');
                const inputMistralModel = modal.querySelector('#input-mistral-model');
                const inputCustomUrl = modal.querySelector('#input-custom-url');
                const inputCustomModel = modal.querySelector('#input-custom-model');
                const inputCustomKey = modal.querySelector('#input-custom-key');
                
                const saveConfigBtn = modal.querySelector('#save-provider-config-btn');
                const resetConfigBtn = modal.querySelector('#reset-provider-config-btn');
                const statusDisplay = modal.querySelector('#provider-status-display');
                
                // Assistance Level Slider
                const assistSlider = modal.querySelector('#settings-assistance-slider');
                const assistDisplay = modal.querySelector('#assistance-level-display');

                // Autonomy Slider
                const tempSlider = modal.querySelector('#settings-temperature-slider');
                const tempDisplay = modal.querySelector('#temperature-level-display');

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
                            safeStorage.setItem('peco_buddy_seed', num);
                        }
                    };

                    updateSeed(appState.globalSeed);

                    seedSlider.oninput = (e) => updateSeed(e.target.value);
                    seedInput.oninput = (e) => updateSeed(e.target.value);
                }

                // Top-P (Nucleus Sampling) Slider
                const topPSlider = modal.querySelector('#settings-topp-slider');
                const topPDisplay = modal.querySelector('#topp-level-display');

                if (topPSlider && topPDisplay) {
                    const updateTopP = (val) => {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                            const v = Math.min(1, Math.max(0.01, num));
                            appState.topP = v;
                            topPSlider.value = Math.round(v * 100);
                            topPDisplay.textContent = v.toFixed(2);
                            safeStorage.setItem('peco_buddy_top_p', v.toString());
                        }
                    };

                    topPSlider.value = Math.round((appState.topP || 0.95) * 100);
                    topPDisplay.textContent = (appState.topP || 0.95).toFixed(2);

                    topPSlider.oninput = (e) => updateTopP(parseFloat(e.target.value) / 100);
                }

                // Max Tokens Slider
                const maxTokensSlider = modal.querySelector('#settings-maxtokens-slider');
                const maxTokensDisplay = modal.querySelector('#maxtokens-level-display');
                const maxTokensInput = modal.querySelector('#settings-maxtokens-input');

                if (maxTokensSlider && maxTokensDisplay && maxTokensInput) {
                    const updateMaxTokens = (val) => {
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 256) {
                            const v = Math.min(65536, num);
                            appState.maxTokens = v;
                            maxTokensSlider.value = Math.min(16384, v);
                            maxTokensInput.value = v;
                            maxTokensDisplay.textContent = v;
                            safeStorage.setItem('peco_buddy_max_tokens', v.toString());
                        }
                    };

                    updateMaxTokens(appState.maxTokens || 4096);

                    maxTokensSlider.oninput = (e) => updateMaxTokens(e.target.value);
                    maxTokensInput.oninput = (e) => updateMaxTokens(e.target.value);
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
                        safeStorage.setItem('peco_buddy_assistance_level', e.target.value);
                    };
                }

                if (tempSlider && tempDisplay) {
                    tempSlider.value = Math.round(appState.autonomyLevel * 10);
                    const updateTempLabel = (val) => {
                        const v = parseFloat(val) / 10.0;
                        if (v <= 0.2) tempDisplay.textContent = v.toFixed(1) + " (Strict Clerk)";
                        else if (v <= 0.7) tempDisplay.textContent = v.toFixed(1) + " (Balanced)";
                        else tempDisplay.textContent = v.toFixed(1) + " (Creative Architect)";
                    };
                    updateTempLabel(Math.round(appState.autonomyLevel * 10));
                    
                    tempSlider.oninput = (e) => updateTempLabel(e.target.value);
                    tempSlider.onchange = (e) => {
                        const v = parseFloat(e.target.value) / 10.0;
                        appState.autonomyLevel = v;
                        safeStorage.setItem('peco_buddy_autonomy_level', v.toString());
                    };
                }

                // Strip Metadata Toggle
                const stripMetadataToggle = modal.querySelector('#settings-strip-metadata-toggle');
                if (stripMetadataToggle) {
                    stripMetadataToggle.checked = appState.stripMetadata;
                    stripMetadataToggle.onchange = (e) => {
                        appState.stripMetadata = e.target.checked;
                        safeStorage.setItem('peco_buddy_strip_metadata', e.target.checked);
                        ToastService.show(`Metadata stripping ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
                    };
                }

                // Matrix Tagging Toggle (semantic formatting)
                const matrixTaggingToggle = modal.querySelector('#settings-matrix-tagging-toggle');
                if (matrixTaggingToggle) {
                    matrixTaggingToggle.checked = appState.matrixTagging !== false;
                    matrixTaggingToggle.onchange = (e) => {
                        appState.matrixTagging = e.target.checked;
                        safeStorage.setItem('peco_buddy_matrix_tagging', e.target.checked);
                        ToastService.show(`Matrix tagging ${e.target.checked ? 'enabled' : 'disabled'}. Applies to new AI calls and rendering.`, 'info');
                    };
                }

                // Ontology Anchoring toggle + endpoint
                const terminologyToggle = modal.querySelector('#settings-terminology-toggle');
                if (terminologyToggle) {
                    terminologyToggle.checked = appState.terminologyAnchoring !== false;
                    terminologyToggle.onchange = (e) => {
                        appState.terminologyAnchoring = e.target.checked;
                        safeStorage.setItem('peco_buddy_terminology_anchoring', e.target.checked);
                        ToastService.show(`Ontology anchoring ${e.target.checked ? 'enabled' : 'disabled'}. ${e.target.checked ? 'Suggested terms will resolve against MeSH.' : 'Terms stay unanchored.'}`, 'info');
                    };
                }
                const terminologyBaseInput = modal.querySelector('#settings-terminology-mesh-base');
                if (terminologyBaseInput) {
                    terminologyBaseInput.value = appState.terminologyMeshBase || '';
                    terminologyBaseInput.onchange = (e) => {
                        appState.terminologyMeshBase = e.target.value.trim();
                        safeStorage.setItem('peco_buddy_terminology_mesh_base', appState.terminologyMeshBase);
                        ToastService.show(appState.terminologyMeshBase ? 'MeSH lookup endpoint updated.' : 'Reverted to the default NLM MeSH endpoint.', 'info');
                    };
                }

                // Connection Self-Test buttons
                const testAiBtn = modal.querySelector('#test-ai-connection-btn');
                const aiStatus = modal.querySelector('#ai-connection-status');
                if (testAiBtn && aiStatus) {
                    testAiBtn.onclick = async () => {
                        testAiBtn.disabled = true;
                        aiStatus.innerHTML = '<span class="text-slate-500">AI provider: testing…</span>';
                        try {
                            const reply = await testProviderConnection();
                            aiStatus.innerHTML = `<span class="text-emerald-700">AI provider: responded (“${reply}”)</span>`;
                        } catch (err) {
                            aiStatus.innerHTML = `<span class="text-rose-700">AI provider: failed — ${err.message}</span>`;
                        } finally {
                            testAiBtn.disabled = false;
                        }
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
                        safeStorage.setItem('peco_buddy_heuristics', JSON.stringify(appState.heuristics));
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
                    if (geminiModelSelect) geminiModelSelect.value = appState.geminiModel || 'gemini-3.1-flash-lite';
                    inputOpenAiKey.value = appState.openaiKey || '';
                    inputOpenAiModel.value = appState.openaiModel || 'gpt-4o';
                    inputAnthropicKey.value = appState.anthropicKey || '';
                    inputAnthropicModel.value = appState.anthropicModel || 'claude-3-7-sonnet-20250219';
                    inputPerplexityKey.value = appState.perplexityKey || '';
                    inputPerplexityModel.value = appState.perplexityModel || 'sonar-pro';
                    inputMistralKey.value = appState.mistralKey || '';
                    inputMistralModel.value = appState.mistralModel || 'mistral-large-latest';
                    inputCustomUrl.value = appState.aiBaseUrl || '';
                    inputCustomModel.value = appState.aiModel || '';
                    inputCustomKey.value = appState.globalApiKey || ''; // Reuse global key storage

                    const updateVisibility = () => {
                        const val = providerSelect.value;
                        fieldsGemini.classList.toggle('hidden', val !== 'gemini');
                        fieldsOpenAI.classList.toggle('hidden', val !== 'openai');
                        fieldsAnthropic.classList.toggle('hidden', val !== 'anthropic');
                        fieldsPerplexity.classList.toggle('hidden', val !== 'perplexity');
                        fieldsMistral.classList.toggle('hidden', val !== 'mistral');
                        fieldsCustom.classList.toggle('hidden', val !== 'local');
                        
                        // Prefill defaults if empty when switching
                        if (val === 'local' && !inputCustomUrl.value) {
                             inputCustomUrl.value = 'http://localhost:11434/v1';
                        }
                    };
                    providerSelect.onchange = updateVisibility;
                    updateVisibility();
                };

                if (saveConfigBtn) {
                    saveConfigBtn.onclick = () => {
                        const provider = providerSelect.value;
                        appState.aiProvider = provider;
                        safeStorage.setItem('peco_buddy_ai_provider', provider);
                        
                        if (provider === 'gemini') {
                            const key = inputGeminiKey.value.trim();
                            if (key) {
                                appState.globalApiKey = key;
                                safeStorage.setItem('peco_buddy_api_key', key);
                            }
                            if (geminiModelSelect) {
                                appState.geminiModel = geminiModelSelect.value;
                                safeStorage.setItem('peco_buddy_gemini_model', geminiModelSelect.value);
                            }
                        } else if (provider === 'openai') {
                            appState.openaiKey = inputOpenAiKey.value.trim();
                            appState.openaiModel = inputOpenAiModel.value.trim();
                            safeStorage.setItem('peco_buddy_openai_key', appState.openaiKey);
                            safeStorage.setItem('peco_buddy_openai_model', appState.openaiModel);
                        } else if (provider === 'anthropic') {
                            appState.anthropicKey = inputAnthropicKey.value.trim();
                            appState.anthropicModel = inputAnthropicModel.value.trim();
                            safeStorage.setItem('peco_buddy_anthropic_key', appState.anthropicKey);
                            safeStorage.setItem('peco_buddy_anthropic_model', appState.anthropicModel);
                        } else if (provider === 'perplexity') {
                            appState.perplexityKey = inputPerplexityKey.value.trim();
                            appState.perplexityModel = inputPerplexityModel.value.trim();
                            safeStorage.setItem('peco_buddy_perplexity_key', appState.perplexityKey);
                            safeStorage.setItem('peco_buddy_perplexity_model', appState.perplexityModel);
                        } else if (provider === 'mistral') {
                            appState.mistralKey = inputMistralKey.value.trim();
                            appState.mistralModel = inputMistralModel.value.trim();
                            safeStorage.setItem('peco_buddy_mistral_key', appState.mistralKey);
                            safeStorage.setItem('peco_buddy_mistral_model', appState.mistralModel);
                        } else {
                            const url = inputCustomUrl.value.trim();
                            const model = inputCustomModel.value.trim();
                            const key = inputCustomKey.value.trim();
                            
                            appState.aiBaseUrl = url;
                            appState.aiModel = model;
                            appState.globalApiKey = key; // Save custom key in same global var
                            
                            safeStorage.setItem('peco_buddy_ai_base_url', url);
                            safeStorage.setItem('peco_buddy_ai_model', model);
                            if(key) safeStorage.setItem('peco_buddy_api_key', key);
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
                            safeStorage.removeItem('peco_buddy_ai_provider');
                            safeStorage.removeItem('peco_buddy_ai_base_url');
                            safeStorage.removeItem('peco_buddy_ai_model');
                            safeStorage.removeItem('peco_buddy_api_key');
                            safeStorage.removeItem('peco_buddy_gemini_model');
                            safeStorage.removeItem('peco_buddy_mistral_key');
                            safeStorage.removeItem('peco_buddy_mistral_model');

                            appState.aiProvider = 'gemini';
                            appState.aiBaseUrl = '';
                            appState.aiModel = '';
                            appState.globalApiKey = '';
                            appState.geminiModel = 'gemini-3.1-flash-lite';
                            appState.mistralKey = '';
                            appState.mistralModel = '';
                            
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
                newFoot.className = 'modal-footer p-4 border-t flex justify-between items-center';
                newFoot.innerHTML = `<span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Build r9 · 2026-09-26</span><button class="bg-teal-600 text-white px-10 py-3 rounded-2xl font-extrabold uppercase text-[11px] tracking-widest shadow-lg hover:bg-teal-700 transition-all border-none">Done</button>`;
                newFoot.querySelector('button').onclick = () => {
                    close();
                    if (appState.currentMode === 'peco_toolkit') renderToolkitView();
                };
                container.appendChild(newFoot);
            });
        };

        const showUserManual = () => {
            showModal('User Manual — PECO-Buddy Closed Pilot Alpha 0.1.0', `<div class="modal-body p-0">${templates.userManualView}</div>`, (modal) => {
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