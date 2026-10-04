import { appState } from '../state.js';
import { ToastService } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { escapeHtml } from '../utils.js';

/**
 * Extended Transparency Log — the complete semantic interaction trail for
 * the current PECO session. Extracted from the Review PECO workspace; the
 * PECO Toolkit's trace button is its only consumer in this app.
 */
export function showTransparencyLogModal() {
    const logItems = appState.interactionLog.map((item, idx) => `
        <div class="p-6 border-b last:border-0 hover:bg-slate-50 transition-colors">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-extrabold text-xs">${idx + 1}</span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${new Date(item.timestamp).toLocaleTimeString('en-GB')}</span>
                </div>
                <span class="px-2 py-1 bg-teal-100 text-teal-700 rounded text-[9px] font-extrabold uppercase">Step Completed</span>
            </div>

            <div class="space-y-4">
                <div>
                    <h5 class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Scientific Prompt</h5>
                    <div class="p-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-200">${escapeHtml(item.prompt)}</div>
                </div>
                <div>
                    <h5 class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Structural Response</h5>
                    <div class="p-4 bg-teal-50 text-teal-900 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-teal-100">${escapeHtml(item.response)}</div>
                </div>
            </div>
        </div>
    `).join('');

    const content = `
        <div class="report-modal-content flex-grow overflow-y-auto custom-scrollbar h-[60vh]">
            <div class="p-8 bg-slate-50 border-b">
                <p class="text-sm text-slate-600 mb-4">This log contains the complete semantic interaction trail used to generate the current session content.</p>
                <div class="flex gap-4">
                    <div class="px-3 py-1 bg-white rounded-lg border text-[10px] font-bold text-slate-500">Total Steps: ${appState.interactionLog.length}</div>
                    <div class="px-3 py-1 bg-white rounded-lg border text-[10px] font-bold text-slate-500">Engine: PECO-Buddy Closed Pilot 0.1.0 Alpha</div>
                </div>
            </div>
            <div class="bg-white">
                ${logItems.length > 0 ? logItems : '<p class="p-12 text-center text-slate-400 italic">No interaction logs available for this session.</p>'}
            </div>
        </div>
    `;

    showModal('Extended Transparency Log', content, null, (modal, close) => {
        const container = modal.querySelector('.modal-container, .report-modal-container');
        const foot = container.appendChild(document.createElement('div'));
        foot.className = 'modal-footer p-4 border-t flex justify-end gap-3 bg-white';
        foot.innerHTML = `
            <button id="download-log-btn" class="bg-slate-700 text-white px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-slate-800 transition-colors">Download Log (.json)</button>
            <button class="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-300 transition-colors">Close</button>
        `;
        foot.querySelector('.bg-slate-200').onclick = close;
        const dlBtn = foot.querySelector('#download-log-btn');
        if (dlBtn) dlBtn.onclick = () => {
            const blob = new Blob([JSON.stringify(appState.interactionLog, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `peco-interaction-log-${new Date().getTime()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            ToastService.show('Log downloaded.', 'success');
        };
    }, true);
}
