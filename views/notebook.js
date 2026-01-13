import { appState, dom } from '../state.js';
import { NOTEBOOK_STORAGE_KEY } from '../config.js';
import { ToastService } from '../components/toast.js';

export const saveNotebookData = () => {
    try { localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(appState.notebookData)); }
    catch (e) { console.error("Failed to save notebook data:", e); }
};

export const loadNotebookData = () => {
    const defaultData = { 
        researchScope: '', initialQuestion: '', finalQuestion: '', 
        population: '', exposure: '', comparison: '', outcome: '', 
        notes: '' 
    };
    try {
        const data = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
        appState.notebookData = data ? { ...defaultData, ...JSON.parse(data) } : defaultData;
    } catch(e) { appState.notebookData = defaultData; }
};

export const updateNotebookUI = () => {
    const container = document.getElementById('notebook-content');
    if (!container) return;
    container.querySelectorAll('textarea').forEach(textarea => {
        const key = textarea.dataset.notebookKey;
        textarea.value = appState.notebookData[key] || '';
    });
};

export const initNotebookListeners = () => {
    const notebookToggleBtn = document.getElementById('notebook-toggle-btn');
    const notebookContent = document.getElementById('notebook-content');
    const exportBtn = document.getElementById('notebook-export-json-btn');
    const importBtn = document.getElementById('notebook-import-btn');
    const importInput = document.getElementById('notebook-import-input');

    if (notebookToggleBtn && notebookContent) {
        notebookToggleBtn.addEventListener('click', e => {
            e.preventDefault();
            const isExpanded = notebookToggleBtn.classList.toggle('expanded');
            notebookContent.style.maxHeight = isExpanded ? `${notebookContent.scrollHeight}px` : '0';
        });

        notebookContent.addEventListener('click', e => {
            const header = e.target.closest('.notebook-section-header');
            if (header) {
                const body = header.nextElementSibling;
                if (body) {
                    const isExpanded = body.classList.toggle('expanded');
                    body.style.display = isExpanded ? 'block' : 'none';
                    header.querySelector('i').classList.toggle('fa-chevron-down');
                    header.querySelector('i').classList.toggle('fa-chevron-up');
                    if (notebookToggleBtn.classList.contains('expanded')) {
                        notebookContent.style.maxHeight = `none`;
                    }
                }
            }
        });

        notebookContent.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', () => {
                const key = textarea.dataset.notebookKey;
                appState.notebookData[key] = textarea.value;
                saveNotebookData();
            });
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
             try {
                const blob = new Blob([JSON.stringify(appState.notebookData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'peco-notebook.json';
                a.click();
                URL.revokeObjectURL(url);
                ToastService.show('Notebook exported successfully.', 'success');
            } catch (error) {
                ToastService.show(`Error exporting data: ${error.message}`, 'error');
            }
        });
    }

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => {
            importInput.click();
        });
        
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    Object.assign(appState.notebookData, data);
                    saveNotebookData();
                    updateNotebookUI();
                    ToastService.show('Notebook data imported!', 'success');
                } catch (err) {
                    ToastService.show('Failed to import notebook data.', 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    document.addEventListener('notebook-save-request', () => {
        saveNotebookData();
        updateNotebookUI();
    });
};