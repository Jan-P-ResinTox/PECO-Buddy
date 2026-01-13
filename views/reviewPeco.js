
import { appState, dom } from '../state.js';
import { ToastService } from '../components/toast.js';
import * as GeminiAPI from '../api/gemini.js';
import { Type } from "@google/genai";
import { extractTextFromFile, showLoading, showError, escapeHtml, handleExport } from '../utils.js';

/**
 * Manuscript Consistency Auditor.
 * Uses Gemini-3-Flash for auditing sections of a manuscript for PECO consistency.
 */

const callLinguisticPreprocessorAPI = async (text, statusContainer) => {
    const prompt = `Analyse the following sentence and deconstruct it into its fundamental conceptual parts: "raw_subject", "raw_intervention", "raw_comparison", "raw_outcome". If a component is not mentioned, return an empty string. Text: "${text}"`;
    // Fix: Using Type.OBJECT instead of 'OBJECT'
    const schema = { 
        type: Type.OBJECT, 
        properties: { 
            raw_subject: { type: Type.STRING }, 
            raw_intervention: { type: Type.STRING }, 
            raw_comparison: { type: Type.STRING }, 
            raw_outcome: { type: Type.STRING } 
        }, 
        required: ["raw_subject", "raw_intervention", "raw_comparison", "raw_outcome"] 
    };
    return await GeminiAPI.callGeminiAPI(prompt, schema, statusContainer);
};

const callPecoMappingAPI = async (preprocessedData, statusContainer) => {
    const { raw_subject, raw_intervention, raw_comparison, raw_outcome } = preprocessedData;
    const prompt = `Assign the following pre-processed components to the correct PECO fields. Ensure the final "exposure" and "comparison" fields DO NOT contain the population/subject. Pre-processed Components: Subject: "${raw_subject}", Intervention/Exposure: "${raw_intervention}", Comparison: "${raw_comparison}", Outcome: "${raw_outcome}"`;
    // Fix: Using Type.OBJECT instead of 'OBJECT'
    const schema = { 
        type: Type.OBJECT, 
        properties: { 
            population: { type: Type.STRING }, 
            exposure: { type: Type.STRING }, 
            comparison: { type: Type.STRING }, 
            outcome: { type: Type.STRING } 
        }, 
        required: ["population", "exposure", "comparison", "outcome"] 
    };
    return await GeminiAPI.callGeminiAPI(prompt, schema, statusContainer);
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

            runAuditBtn.disabled = true;
            showLoading(reportContainer, 'Running consistency audit...');

            try {
                const fullText = await extractTextFromFile(auditFile);

                // Step 1: Identify Sections
                showLoading(reportContainer, 'Step 1/4: Identifying document sections...');
                const sectionsPrompt = `Based on the following text from a scientific manuscript, identify and extract the content for these specific sections: "Abstract", "Introduction", "Methods", "Results", and "Discussion". Return a JSON object where each key is the section name and the value is the text content of that section. If a section is not found, omit it from the JSON. Text: """${fullText.substring(0, 30000)}"""`;
                // Fix: Using Type.OBJECT instead of 'OBJECT'
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

                // Step 2: Analyse PECO in each section
                showLoading(reportContainer, 'Step 2/4: Analysing PECO in each section...');
                const pecoPromises = Object.entries(sections).map(async ([sectionName, sectionText]) => {
                    if (!sectionText || sectionText.trim().length < 50) return null;
                    const preprocessed = await callLinguisticPreprocessorAPI(sectionText, reportContainer);
                    const peco = await callPecoMappingAPI(preprocessed, reportContainer);
                    return { section: sectionName, peco };
                });
                const sectionPecos = (await Promise.all(pecoPromises)).filter(Boolean);

                if (sectionPecos.length < 2) {
                    throw new Error("Could not identify at least two sections with sufficient content for a meaningful comparison.");
                }

                // Step 3: Compare sections for consistency
                showLoading(reportContainer, 'Step 3/4: Comparing sections for consistency...');
                const consistencyPrompt = `You are a manuscript review expert. Analyse the following PECO components extracted from different sections of a paper. Identify inconsistencies between them. Classify each issue with a "severity" of "Critical" or "Minor". "Critical" issues are direct contradictions or omissions (e.g., an outcome mentioned in Methods but not in Results). "Minor" issues are changes in specificity or phrasing. Return a JSON object with a "status" ("Consistent", "Minor Issues", or "Critical Issues") and an "issues" array. Each object in the array should have "sections" (e.g., "Methods vs. Results"), "component" (e.g., "Outcome"), "severity", and "description". If there are no issues, return an empty "issues" array and "Consistent" status. Here is the data: ${JSON.stringify(sectionPecos)}`;
                // Fix: Using Type.OBJECT instead of 'OBJECT'
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
                const auditResult = await GeminiAPI.callGeminiAPI(consistencyPrompt, consistencySchema, reportContainer);
                appState.consistencyAuditData = auditResult;

                // Step 4: Render report
                showLoading(reportContainer, 'Step 4/4: Generating audit report...');
                renderAuditReport(auditResult, reportContainer);

            } catch (err) {
                showError(reportContainer, `Audit failed: ${err.message}`);
                console.error(err);
            } finally {
                runAuditBtn.disabled = false;
            }
        });
    }
}

const renderAuditReport = (data, container) => {
    if (!container || !data) {
        if(container) container.innerHTML = '';
        return;
    }

    let headerClass, headerIcon, headerText;
    switch (data.status) {
        case 'Critical Issues':
            headerClass = 'bg-red-100 border-red-500 text-red-800';
            headerIcon = 'fa-circle-exclamation';
            headerText = 'Critical Issues Found';
            break;
        case 'Minor Issues':
            headerClass = 'bg-yellow-100 border-yellow-500 text-yellow-800';
            headerIcon = 'fa-triangle-exclamation';
            headerText = 'Minor Issues Found';
            break;
        default:
            headerClass = 'bg-green-100 border-green-500 text-green-800';
            headerIcon = 'fa-check-circle';
            headerText = 'Consistent';
    }

    const issuesHtml = (data.issues || []).map(issue => {
        const severityClass = issue.severity === 'Critical' ? 'bg-red-500' : 'bg-yellow-500';
        return `
            <tr class="border-b">
                <td class="p-3 text-sm">${escapeHtml(issue.sections)}</td>
                <td class="p-3 text-sm font-semibold">${escapeHtml(issue.component)}</td>
                <td class="p-3 text-sm"><span class="px-2 py-1 text-xs font-bold text-white rounded-full ${severityClass}">${escapeHtml(issue.severity)}</span></td>
                <td class="p-3 text-sm text-slate-600">${escapeHtml(issue.description)}</td>
            </tr>`;
    }).join('');

    const reportHtml = `
        <div id="full-audit-report" class="mt-8 bg-white p-6 rounded-2xl shadow-md border">
            <div id="audit-report-content">
                <div class="p-4 rounded-xl border-l-4 ${headerClass} flex items-center gap-4 mb-6">
                    <i class="fa-solid ${headerIcon} fa-2x"></i>
                    <div>
                        <h3 class="font-bold text-lg">${headerText}</h3>
                        <p class="text-sm">${(data.issues || []).length} issue(s) identified.</p>
                    </div>
                </div>
                ${(data.issues || []).length > 0 
                    ? `<div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="p-3 text-xs font-semibold text-slate-500 uppercase">Sections</th>
                                    <th class="p-3 text-xs font-semibold text-slate-500 uppercase">Component</th>
                                    <th class="p-3 text-xs font-semibold text-slate-500 uppercase">Severity</th>
                                    <th class="p-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                                </tr>
                            </thead>
                            <tbody>${issuesHtml}</tbody>
                        </table>
                       </div>` 
                    : `<p class="text-center text-slate-500 py-8">No inconsistencies found between sections.</p>`
                }
            </div>
            <div class="mt-8 pt-6 border-t flex justify-end gap-2">
                <button id="export-audit-docx-btn" class="bg-blue-100 text-blue-700 font-bold py-2 px-4 rounded-lg hover:bg-blue-200"><i class="fa-solid fa-file-word mr-2"></i>Export DOCX</button>
                <button id="export-audit-pdf-btn" class="bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg hover:bg-red-200"><i class="fa-solid fa-file-pdf mr-2"></i>Export PDF</button>
            </div>
        </div>
    `;

    container.innerHTML = reportHtml;

    // Attach export handlers using the generic handleExport from utils.js
    const reportElement = container.querySelector('#full-audit-report');
    if (reportElement) {
        const pdfBtn = reportElement.querySelector('#export-audit-pdf-btn');
        const docxBtn = reportElement.querySelector('#export-audit-docx-btn');
        
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                handleExport('#audit-report-content', 'pdf', 'peco-audit-report.pdf');
            });
        }
        if (docxBtn) {
            docxBtn.addEventListener('click', () => {
                handleExport('#audit-report-content', 'docx', 'peco-audit-report.docx');
            });
        }
    }
};
