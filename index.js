import { appState, dom } from './state.js';
import { MODE_CONFIG } from './config.js';
import { templates } from './views/templates.js';
import { ToastService } from './components/toast.js';
import { showModal } from './components/modal.js';
import { initAuthorToolkitFlow } from './views/pecoToolkit.js';
import { initReviewerToolkitView } from './views/reviewPeco.js';
import { initNlpToolkitView } from './views/nlpToolkit.js';
import { initNotebookListeners, loadNotebookData, updateNotebookUI } from './views/notebook.js';

/**
 * Main application entry point for PECO-Buddy.
 * Manages view routing, sidebar interactions, and global settings.
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        const getEl = (id) => document.getElementById(id);

        dom.mainContent = getEl('main-content');
        dom.saveProjectBtn = getEl('save-project-btn');
        dom.loadProjectBtn = getEl('load-project-btn');
        dom.loadProjectInput = getEl('load-project-input');
        dom.modalPlaceholder = getEl('modal-placeholder');
        dom.sidebarNav = getEl('sidebar-nav');
        dom.headerTitle = getEl('header-title');
        dom.headerSubtitle = getEl('header-subtitle');
        dom.appSidebar = getEl('app-sidebar');
        dom.appMainContent = getEl('app-main-content');
        dom.sidebarToggleBtn = getEl('sidebar-toggle-btn');
        const toggleTooltipsBtn = getEl('toggle-tooltips-btn');
        const globalTooltip = getEl('global-tooltip');

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
                const connectKeyBtn = modal.querySelector('#modal-connect-key-btn');
                const gaugeToggle = modal.querySelector('#modal-toggle-gauge-btn');
                const manualKeyInput = modal.querySelector('#modal-manual-key-input');
                const saveKeyBtn = modal.querySelector('#save-manual-key-btn');
                const toggleKeyVisBtn = modal.querySelector('#toggle-key-visibility');
                
                // Initialize manual key from storage
                if (manualKeyInput) {
                    manualKeyInput.value = window.localStorage.getItem('PECO_BUDDY_CUSTOM_KEY') || '';
                }

                if (saveKeyBtn && manualKeyInput) {
                    saveKeyBtn.onclick = () => {
                        const key = manualKeyInput.value.trim();
                        window.localStorage.setItem('PECO_BUDDY_CUSTOM_KEY', key);
                        if (key) {
                            ToastService.show("Manual API Key saved successfully to local storage.", "success");
                            saveKeyBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Saved';
                            setTimeout(() => { saveKeyBtn.innerText = 'Save Key'; }, 2000);
                        } else {
                            ToastService.show("Manual key cleared.", "info");
                        }
                    };
                }

                if (toggleKeyVisBtn && manualKeyInput) {
                    toggleKeyVisBtn.onclick = () => {
                        const isPass = manualKeyInput.type === 'password';
                        manualKeyInput.type = isPass ? 'text' : 'password';
                        toggleKeyVisBtn.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
                    };
                }

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
                    
                    if (gaugeToggle) gaugeToggle.checked = appState.showScoreGauge;
                };

                if (aiBtn) aiBtn.onclick = () => { appState.analysisEngine = 'ai'; updateSelection(); };
                if (nlpBtn) nlpBtn.onclick = () => { appState.analysisEngine = 'nlp'; updateSelection(); };
                if (gaugeToggle) gaugeToggle.onchange = (e) => { appState.showScoreGauge = e.target.checked; };
                
                if (connectKeyBtn) {
                    connectKeyBtn.onclick = async () => {
                        try {
                            if (window.aistudio && window.aistudio.openSelectKey) {
                                await window.aistudio.openSelectKey();
                                ToastService.show("API Studio connection triggered.", "success");
                            } else {
                                ToastService.show("AI Studio key manager not found.", "error");
                            }
                        } catch (e) {
                            ToastService.show(`Error: ${e.message}`, "error");
                        }
                    };
                }

                updateSelection();
            }, (modal, close) => {
                const foot = modal.querySelector('.modal-container').appendChild(document.createElement('div'));
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Done</button>`;
                foot.onclick = () => {
                    // One final check to save if they entered something but didn't hit save button
                    const input = modal.querySelector('#modal-manual-key-input');
                    if (input) {
                        window.localStorage.setItem('PECO_BUDDY_CUSTOM_KEY', input.value.trim());
                    }
                    close();
                    if (appState.currentMode === 'peco_toolkit') {
                        renderToolkitView();
                    }
                };
            });
        };

        const showUserManual = () => {
            showModal('User Manual v8.1 Beta', `<div class="modal-body p-6">${templates.userManualView}</div>`, (modal) => {
                const searchInput = modal.querySelector('#manual-search-input');
                const contentContainer = modal.querySelector('#manual-content-container');
                const sections = modal.querySelectorAll('.manual-section');
                const navLinks = modal.querySelectorAll('.manual-nav-link');
                
                navLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const targetId = link.getAttribute('href').substring(1);
                        const targetSection = modal.querySelector(`#${targetId}`);
                        
                        navLinks.forEach(l => l.classList.remove('active'));
                        link.classList.add('active');

                        if (targetSection && contentContainer) {
                            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                });

                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        const query = e.target.value.toLowerCase();
                        sections.forEach(section => {
                            const text = section.innerText.toLowerCase();
                            const matches = text.includes(query);
                            section.style.display = matches ? 'block' : 'none';
                            if (query.length > 2 && matches) {
                                section.classList.add('bg-yellow-50/50');
                            } else {
                                section.classList.remove('bg-yellow-50/50');
                            }
                        });
                        navLinks.forEach(link => {
                            const targetId = link.getAttribute('href').substring(1);
                            const section = modal.querySelector(`#${targetId}`);
                            link.style.opacity = (section && section.style.display === 'none') ? '0.3' : '1';
                        });
                    });
                }
            }, (modal, close) => {
                const foot = modal.querySelector('.modal-container').appendChild(document.createElement('div'));
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold">Close Manual</button>`;
                foot.onclick = close;
            }, true);
        };

        const showRationale = () => {
            showModal('Version 8.1 Rationale', `<div class="modal-body p-6">${templates.versionRationaleView}</div>`, null, (modal, close) => {
                const foot = modal.querySelector('.modal-container').appendChild(document.createElement('div'));
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold">Close</button>`;
                foot.onclick = close;
            });
        };

        const showCopyright = () => {
            showModal('Legal Notice', `<div class="modal-body p-6">${templates.copyrightView}</div>`, null, (modal, close) => {
                const foot = modal.querySelector('.modal-container').appendChild(document.createElement('div'));
                foot.className = 'modal-footer p-4 border-t flex justify-end';
                foot.innerHTML = `<button class="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold">Close</button>`;
                foot.onclick = close;
            });
        };

        if (dom.appSidebar) {
            dom.appSidebar.addEventListener('click', (e) => {
                const link = e.target.closest('.sidebar-link');
                if (!link) return;
                e.preventDefault();

                if (link.dataset.mode) {
                    setMode(link.dataset.mode);
                } else if (link.id === 'show-settings-btn') {
                    showSettings();
                } else if (link.id === 'show-manual-btn') {
                    showUserManual();
                } else if (link.id === 'show-rationale-btn') {
                    showRationale();
                } else if (link.id === 'show-copyright-btn') {
                    showCopyright();
                }
            });
        }

        loadNotebookData();
        updateNotebookUI();
        initNotebookListeners();
        setMode('peco_toolkit');
    } catch (e) {
        console.error("Initialization Error:", e);
    }
});