import { appState, dom } from '../state.js';
import { ToastService } from '../components/toast.js';
import * as GeminiAPI from '../api/gemini.js';
import { Type } from "@google/genai";
import { showModal } from '../components/modal.js';
import { extractTextFromFile, showLoading, showError, escapeHtml, handleExport, formatPecoForDisplay, styleMatrices } from '../utils.js';
import { PECO_MAP } from '../config.js';

/**
 * Manuscript Consistency Auditor.
 * Uses Gemini-3-Flash for auditing sections of a manuscript for PECO consistency.
 */

const callSovereignExtractorAPI = async (text, sectionName, truthAnchor = null) => {
    const prohibitionRule = `
    *** RULE: ZERO-SHOT PROHIBITION IS IN EFFECT ***
    1. NO INFERENCE: You are strictly forbidden from guessing, inferring, or synthesizing information based on your pre-trained knowledge.
    2. VERBATIM ONLY: All extracted data must match the text exactly if present.
    3. MISSING COMPONENTS: If a component is physically missing from the text, you MUST output "Not Specified" (if it's typically expected) or "Not Required" (if the study design inherently lacks it). Do not attempt to fill in the blanks.
    4. CORE ENTITY ISOLATION: The main PECO fields (population, exposure, comparison, outcome) MUST represent the core biological, conceptual, or physical entity only.
    5. QUANTIFIER EXTRACTION: Any dosage, threshold, quantile, magnitude, frequency, or severity (e.g., "Top quartile", "5mg/kg", "High levels", "Lower quartiles") MUST be separated and placed into the 'quantifiers_and_modifiers' field. Do not leave them in the main PECO fields.
    
    *** CHAIN OF THOUGHT (CoT) ANCHORING ***
    Before populating the 'extracted_data' fields, you must populate the 'extraction_metadata' object:
    1. Write out your reasoning for finding the data.
    2. Extract the exact sentence/paragraph (verbatim quote) from the text where the data resides.
    3. Only after securing the quote, map the data into the 'extracted_data' object.`;

    const anchorRule = truthAnchor ? `\nTRUTH ANCHOR IN EFFECT: Compare extracted data to this stated objective: "${truthAnchor}". Assess semantic drift.` : '';

    const prompt = `Identify and extract strictly DISCRETE PECO components from the following "${sectionName}" text:
    -----------------------
    ${text}
    -----------------------
    
    CRITICAL EXTRACTION RULES:
    ${prohibitionRule}
    ${anchorRule}
    - Ensure the final "exposure" and "comparison" fields DO NOT contain the population/subject.
    - Return ONLY valid JSON matching the schema.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            extraction_metadata: {
                type: Type.OBJECT,
                properties: {
                    chain_of_thought_reasoning: { type: Type.STRING },
                    verbatim_source_quotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    semantic_drift_detected: { type: Type.BOOLEAN },
                    drift_reasoning: { type: Type.STRING }
                },
                required: ["chain_of_thought_reasoning", "verbatim_source_quotes"]
            },
            extracted_data: {
                type: Type.OBJECT,
                properties: {
                    population: { type: Type.STRING },
                    exposure: { type: Type.STRING },
                    comparison: { type: Type.STRING },
                    outcome: { type: Type.STRING },
                    quantifiers_and_modifiers: {
                        type: Type.OBJECT,
                        properties: {
                            population_modifiers: { type: Type.STRING },
                            exposure_modifiers: { type: Type.STRING },
                            comparison_modifiers: { type: Type.STRING },
                            outcome_modifiers: { type: Type.STRING }
                        }
                    }
                },
                required: ["population", "exposure", "comparison", "outcome", "quantifiers_and_modifiers"]
            }
        },
        required: ["extraction_metadata", "extracted_data"]
    };
    return await GeminiAPI.callGeminiAPI(prompt, schema, null, { task: 'extraction', temperature: 0.0 });
};

export function initReviewerToolkitView() {
    const container = dom.mainContent.querySelector('#reviewer-toolkit-container');
    if (!container) return;

    const fileInput = container.querySelector('#audit-file-upload');
    const fileNameSpan = container.querySelector('#audit-file-name');
    const runAuditBtn = container.querySelector('#run-audit-btn');
    const reportContainer = container.querySelector('#audit-report-container');
    let auditFile = null;

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            auditFile = e.target.files?.[0];
            if (auditFile) {
                fileNameSpan.textContent = auditFile.name;
            } else {
                fileNameSpan.textContent = '';
            }
        });
    }

    if (runAuditBtn) {
        runAuditBtn.addEventListener('click', async () => {
            if (!auditFile) {
                ToastService.show('Please choose a manuscript file to audit.', 'error');
                return;
            }

            appState.interactionLog = [];
            
            runAuditBtn.disabled = true;
            reportContainer.innerHTML = ''; 
            showLoading(reportContainer, 'Preparing manuscript for analysis...');

            try {
                const fullText = await extractTextFromFile(auditFile);

                showLoading(reportContainer, 'Identifying manuscript sections (scanning first 30,000 chars)...');
                const sectionsPrompt = `Based on the following text from a scientific manuscript, identify and extract the content for these specific sections: "Abstract", "Introduction", "Methods", "Results", and "Discussion". Return a JSON object where each key is the section name and the value is the text content of that section. If a section is not found, omit it from the JSON. Text: """${fullText.substring(0, 30000)}"""`;
                
                const sectionsSchema = { 
                    type: Type.OBJECT, 
                    properties: { 
                        Abstract: { type: Type.STRING }, 
                        Introduction: { type: Type.STRING }, 
                        Methods: { type: Type.STRING }, 
                        Results: { type: Type.STRING }, 
                        Discussion: { type: Type.STRING } 
                    } 
                };
                const sections = await GeminiAPI.callGeminiAPI(sectionsPrompt, sectionsSchema, reportContainer);

                const sectionEntries = Object.entries(sections).filter(([_, text]) => text && text.trim().length > 50);

                if (sectionEntries.length === 0) {
                    throw new Error("No usable manuscript sections (Abstract, Methods, etc.) were identified in the scanned portion.");
                }

                renderLiveFeedSkeleton(reportContainer, sectionEntries.map(e => e[0]));

                let truthAnchor = null;
                const sectionPecos = [];

                for (const [sectionName, sectionText] of sectionEntries) {
                    updateSectionStatus(sectionName, 'analysing');
                    
                    try {
                        const response = await callSovereignExtractorAPI(sectionText, sectionName, truthAnchor);
                        const peco = response.extracted_data;
                        const metadata = response.extraction_metadata;

                        // If this is Abstract or Intro, set the truth anchor based on their verbatim quotes
                        if (!truthAnchor && (sectionName === 'Abstract' || sectionName === 'Introduction')) {
                            if (metadata.verbatim_source_quotes && metadata.verbatim_source_quotes.length > 0) {
                                truthAnchor = metadata.verbatim_source_quotes.join(" ");
                            }
                        }
                        
                        sectionPecos.push({ section: sectionName, peco, metadata });
                        updateSectionResult(sectionName, peco, metadata);
                    } catch (secErr) {
                        console.warn(`Failed to process section ${sectionName}:`, secErr);
                        updateSectionStatus(sectionName, 'failed');
                    }
                }

                if (sectionPecos.length < 2) {
                    throw new Error("Could not extract enough PECO data for cross-sectional comparison.");
                }

                const consistencyContainer = document.createElement('div');
                consistencyContainer.id = 'audit-synthesis-container';
                consistencyContainer.className = 'mt-12 animate-fade-in';
                reportContainer.appendChild(consistencyContainer);

                showLoading(consistencyContainer, 'Synthesising consistency audit results...');
                
                const consistencyPrompt = `You are a manuscript review expert for EBTC. Analyse the following PECO components extracted from different sections of a paper. Identify inconsistencies between them. 
                
                IMPORTANT: When describing inconsistencies, if you mention biological matrices or measurement sites (e.g. blood, urine, liver tissue), ALWAYS wrap them in the {matrix:term} format. 
                
                Classify each issue with a "severity" of "Critical" or "Minor". Return a JSON object with a "status" ("Consistent", "Minor Issues", or "Critical Issues") and an "issues" array. Data: ${JSON.stringify(sectionPecos)}`;
                
                const consistencySchema = { 
                    type: Type.OBJECT, 
                    properties: { 
                        status: { type: Type.STRING }, 
                        issues: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: { 
                                    sections: { type: Type.STRING }, 
                                    component: { type: Type.STRING }, 
                                    severity: { type: Type.STRING }, 
                                    description: { type: Type.STRING } 
                                }, 
                                required: ["sections", "component", "severity", "description"] 
                            } 
                        } 
                    }, 
                    required: ["status", "issues"] 
                };
                const auditResult = await GeminiAPI.callGeminiAPI(consistencyPrompt, consistencySchema, consistencyContainer);
                appState.consistencyAuditData = auditResult;

                renderAuditSynthesis(auditResult, consistencyContainer);

            } catch (err) {
                showError(reportContainer, `Audit failed: ${err.message}`);
                console.error(err);
            } finally {
                runAuditBtn.disabled = false;
            }
        });
    }
}

function renderLiveFeedSkeleton(container, sectionNames) {
    container.innerHTML = `
        <div class="mt-8 animate-fade-in">
            <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <i class="fa-solid fa-microscope text-teal-600"></i> Section-by-Section PECO Extraction
            </h3>
            <div class="overflow-hidden border border-slate-200 rounded-3xl bg-white shadow-sm">
                <table id="live-audit-table" class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 border-b">
                        <tr>
                            <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-32">Section</th>
                            <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Population</th>
                            <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Exposure</th>
                            <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Outcome</th>
                            <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sectionNames.map(name => `
                            <tr id="row-${name.toLowerCase()}" class="border-b last:border-0 transition-colors">
                                <td class="p-4 font-extrabold text-xs text-slate-800 uppercase tracking-tight">${name}</td>
                                <td class="p-4 peco-cell" data-key="population"><div class="h-4 bg-slate-100 rounded w-full animate-pulse"></div></td>
                                <td class="p-4 peco-cell" data-key="exposure"><div class="h-4 bg-slate-100 rounded w-full animate-pulse"></div></td>
                                <td class="p-4 peco-cell" data-key="outcome"><div class="h-4 bg-slate-100 rounded w-full animate-pulse"></div></td>
                                <td class="p-4 status-cell text-center">
                                    <div class="inline-flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                                        <i class="fa-solid fa-circle-notch fa-spin"></i> Pending
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function updateSectionStatus(sectionName, status, metadata = null) {
    const row = document.getElementById(`row-${sectionName.toLowerCase()}`);
    if (!row) return;
    const statusCell = row.querySelector('.status-cell');
    
    if (status === 'analysing') {
        row.classList.add('bg-teal-50/30');
        statusCell.innerHTML = `
            <div class="inline-flex items-center gap-2 text-[9px] font-bold text-teal-600 uppercase">
                <i class="fa-solid fa-brain fa-pulse"></i> Analysing
            </div>
        `;
    } else if (status === 'complete') {
        row.classList.remove('bg-teal-50/30');
        
        const btnHtml = metadata ? `
            <button class="view-metadata-btn ml-2 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-extrabold uppercase transition-colors" data-section="${sectionName}">
               <i class="fa-solid fa-list-check"></i> Log
            </button>
        ` : '';

        statusCell.innerHTML = `
            <div class="flex items-center justify-center gap-2">
              <div class="inline-flex items-center gap-2 text-[9px] font-bold text-emerald-600 uppercase">
                  <i class="fa-solid fa-circle-check"></i> Complete
              </div>
              ${btnHtml}
            </div>
        `;

        if (metadata) {
            const btn = statusCell.querySelector('.view-metadata-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    const content = `
                      <div class="space-y-4">
                        <div>
                           <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Chain of Thought</h4>
                           <p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(metadata.chain_of_thought_reasoning || 'N/A')}</p>
                        </div>
                        <div>
                           <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Verbatim Source Quotes</h4>
                           <ul class="list-disc list-inside text-sm text-slate-700">
                             ${(metadata.verbatim_source_quotes || []).map(q => `<li>${escapeHtml(q)}</li>`).join('')}
                           </ul>
                        </div>
                        <div>
                           <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Drift Detected</h4>
                           <p class="text-sm text-slate-700">${metadata.semantic_drift_detected ? '<span class="text-rose-600 font-bold">YES</span>' : '<span class="text-emerald-600 font-bold">NO</span>'}</p>
                        </div>
                        ${metadata.semantic_drift_detected ? `
                        <div>
                           <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Drift Reasoning</h4>
                           <p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(metadata.drift_reasoning || 'N/A')}</p>
                        </div>` : ''}
                      </div>
                    `;
                    showModal(`Zero-Shot Audit Log: ${sectionName}`, content, false);
                });
            }
        }
    } else if (status === 'failed') {
        row.classList.remove('bg-teal-50/30', 'bg-emerald-50/30');
        row.classList.add('bg-rose-50/30');
        statusCell.innerHTML = `
            <div class="inline-flex items-center gap-2 text-[9px] font-bold text-rose-600 uppercase">
                <i class="fa-solid fa-circle-xmark"></i> Failed
            </div>
        `;
    }
}

function updateSectionResult(sectionName, peco, metadata = null) {
    const row = document.getElementById(`row-${sectionName.toLowerCase()}`);
    if (!row) return;
    
    const popCell = row.querySelector('[data-key="population"]');
    const expCell = row.querySelector('[data-key="exposure"]');
    const outCell = row.querySelector('[data-key="outcome"]');
    
    if (popCell) popCell.innerHTML = formatPecoForDisplay(peco.population);
    if (expCell) expCell.innerHTML = formatPecoForDisplay(peco.exposure);
    if (outCell) outCell.innerHTML = formatPecoForDisplay(peco.outcome);
    
    updateSectionStatus(sectionName, 'complete', metadata);
}

/**
 * Renders the final interaction log modal.
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
                    <h5 class="text-[10px] font-extrabold uppercase text-slate-400 mb-2">Scientific Prompt</h5>
                    <div class="p-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-200">${escapeHtml(item.prompt)}</div>
                </div>
                <div>
                    <h5 class="text-[10px] font-extrabold uppercase text-slate-400 mb-2">Structural Response</h5>
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
                    <div class="px-3 py-1 bg-white rounded-lg border text-[10px] font-bold text-slate-500">Engine: PECO-Buddy Public Beta 0.1.1</div>
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

function renderAuditSynthesis(data, container) {
    if (!container || !data) return;

    let headerClass, headerIcon, headerText;
    switch (data.status) {
        case 'Critical Issues':
            headerClass = 'bg-rose-50 border-rose-500 text-rose-800';
            headerIcon = 'fa-circle-exclamation';
            headerText = 'Critical Inconsistencies Detected';
            break;
        case 'Minor Issues':
            headerClass = 'bg-amber-50 border-amber-500 text-amber-800';
            headerIcon = 'fa-triangle-exclamation';
            headerText = 'Minor Variations Identified';
            break;
        default:
            headerClass = 'bg-emerald-50 border-emerald-500 text-emerald-800';
            headerIcon = 'fa-check-double';
            headerText = 'High Internal Consistency Verified';
    }

    const issuesHtml = (data.issues || []).map(issue => {
        const severityClass = issue.severity === 'Critical' ? 'bg-rose-600' : 'bg-amber-500';
        return `
            <tr class="border-b last:border-0 hover:bg-slate-50 transition-colors">
                <td class="p-4 text-xs font-bold text-slate-500 uppercase tracking-tight">${escapeHtml(issue.sections)}</td>
                <td class="p-4 text-xs font-extrabold text-slate-800 uppercase tracking-widest">${escapeHtml(issue.component)}</td>
                <td class="p-4 text-xs"><span class="px-2 py-1 text-[10px] font-extrabold text-white rounded-lg shadow-sm ${severityClass}">${escapeHtml(issue.severity).toUpperCase()}</span></td>
                <td class="p-4 text-sm text-slate-600 font-medium leading-relaxed">${styleMatrices(escapeHtml(issue.description))}</td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div id="audit-report-synthesis-card" class="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden relative">
            <div id="audit-report-content">
                <div class="flex flex-col md:flex-row items-center gap-8 mb-10">
                    <div class="w-24 h-24 rounded-3xl ${headerClass} border flex items-center justify-center shadow-sm">
                        <i class="fa-solid ${headerIcon} fa-3x"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">${headerText}</h3>
                        <p class="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Global Manuscript Consistency Synthesis</p>
                    </div>
                </div>

                ${(data.issues || []).length > 0 
                    ? `<div class="overflow-hidden border border-slate-100 rounded-3xl bg-white shadow-subtle">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-slate-50 border-b">
                                <tr>
                                    <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Comparison Context</th>
                                    <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">PECO Component</th>
                                    <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Severity</th>
                                    <th class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Observations</th>
                                </tr>
                            </thead>
                            <tbody>${issuesHtml}</tbody>
                        </table>
                       </div>` 
                    : `<div class="text-center py-16 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                        <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-check-double text-2xl"></i>
                        </div>
                        <p class="text-sm font-extrabold text-slate-500 uppercase tracking-widest">No internal inconsistencies detected.</p>
                       </div>`
                }
            </div>

            <div class="mt-10 pt-8 border-t flex flex-wrap justify-between items-center gap-6">
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i class="fa-solid fa-shield-halved text-teal-600"></i> Audit Report | Engine: PECO-Buddy Public Beta 0.1.1
                </div>
                <div class="flex gap-3">
                    <button id="show-transparency-log-btn" class="bg-white border border-slate-200 text-slate-600 font-extrabold py-3 px-6 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"><i class="fa-solid fa-code"></i> Extended Transparency</button>
                    <button id="export-audit-pdf-btn" class="bg-rose-600 text-white font-extrabold py-3 px-6 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all flex items-center gap-2"><i class="fa-solid fa-file-pdf"></i> Export PDF</button>
                </div>
            </div>
        </div>
    `;

    const logBtn = container.querySelector('#show-transparency-log-btn');
    if (logBtn) logBtn.addEventListener('click', showTransparencyLogModal);

    const pdfBtn = container.querySelector('#export-audit-pdf-btn');
    if (pdfBtn) pdfBtn.addEventListener('click', () => handleExport('#audit-report-content', 'pdf', 'peco-audit-report.pdf'));
}