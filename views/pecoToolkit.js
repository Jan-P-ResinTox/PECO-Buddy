import { appState, dom } from '../state.js';
import { templates } from './templates.js';
import { ToastService } from '../components/toast.js';
import { PECO_MAP } from '../config.js';
import * as GeminiAPI from '../api/gemini.js';
import { showModal } from '../components/modal.js';
import { formatPecoForDisplay, styleMatrices, showLoading, showError, copyTableToClipboard, escapeHtml } from '../utils.js';

const BASIC_STUDY_TYPES = [
    { id: 'systematic_review', name: 'Systematic Review', icon: 'fa-magnifying-glass-chart' },
    { id: 'meta_analysis', name: 'Meta-Analysis', icon: 'fa-chart-line' },
    { id: 'rct', name: 'RCT', icon: 'fa-vials' },
    { id: 'cohort_prospective', name: 'Prospective Cohort', icon: 'fa-users-line' },
    { id: 'cohort_retrospective', name: 'Retrospective Cohort', icon: 'fa-users-viewfinder' },
    { id: 'case_control', name: 'Case-Control Study', icon: 'fa-user-group' },
    { id: 'animal_study', name: 'Controlled Animal (In Vivo)', icon: 'fa-paw' },
    { id: 'in_vitro', name: 'Cell Culture (In Vitro)', icon: 'fa-microscope' }
];

const EXTENDED_STUDY_TYPES = [
    { id: 'cluster_rct', name: 'Cluster RCT', icon: 'fa-people-roof' },
    { id: 'non_rct', name: 'Non-Randomised Trial', icon: 'fa-vial-circle-check' },
    { id: 'quasi_experimental', name: 'Quasi-Experimental', icon: 'fa-flask-vial' },
    { id: 'nested_case_control', name: 'Nested Case-Control', icon: 'fa-layer-group' },
    { id: 'cross_sectional', name: 'Cross-Sectional', icon: 'fa-chart-pie' },
    { id: 'ecological', name: 'Ecological Study', icon: 'fa-earth-americas' },
    { id: 'ex_vivo', name: 'Ex Vivo Study', icon: 'fa-dna' },
    { id: 'in_silico', name: 'Computational Model', icon: 'fa-laptop-code' },
    { id: 'case_series', name: 'Case Series / Report', icon: 'fa-clipboard-user' }
];

export const initAuthorToolkitFlow = () => {
  const steps = ['step-ideation', 'step-clarity', 'step-peco-workshop'];
  
  steps.forEach(stepId => {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    const contentContainer = stepEl.querySelector('.step-content');
    if (!contentContainer) return;

    switch(stepId) {
      case 'step-ideation':
        contentContainer.innerHTML = templates.ideationView;
        initIdeationView(contentContainer);
        break;
      case 'step-clarity':
        contentContainer.innerHTML = templates.clarityView;
        initClarityView(contentContainer);
        break;
      case 'step-peco-workshop':
        contentContainer.innerHTML = templates.pecoWorkshopView;
        initPecoWorkshopView(contentContainer);
        break;
    }

    const header = stepEl.querySelector('.step-header');
    if (header) {
      header.onclick = () => {
        const isActive = stepEl.classList.contains('active');
        document.querySelectorAll('.workflow-step').forEach(s => s.classList.remove('active'));
        if (!isActive) stepEl.classList.add('active');
        appState.authorWorkflow.currentStep = stepId;
      };
    }
  });

  const currentStepId = appState.authorWorkflow.currentStep || 'step-ideation';
  document.getElementById(currentStepId)?.classList.add('active');
};

const jumpToStep = (stepId) => {
  document.querySelectorAll('.workflow-step').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(stepId);
  if (target) {
    target.classList.add('active');
    appState.authorWorkflow.currentStep = stepId;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Shared logic to display the interaction log modal.
 */
function showTransparencyLogModal() {
    const logItems = appState.interactionLog.map((item, idx) => `
        <div class="p-6 border-b last:border-0 hover:bg-slate-50 transition-colors">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-extrabold text-xs">${idx + 1}</span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${new Date(item.timestamp).toLocaleTimeString('en-GB')}</span>
                </div>
                <span class="px-2 py-1 bg-teal-100 text-teal-700 rounded text-[9px] font-extrabold uppercase">Audit Step</span>
            </div>
            
            <div class="space-y-4">
                <div>
                    <h5 class="text-[10px] font-extrabold uppercase text-slate-400 mb-2">Scientific Prompt</h5>
                    <div class="p-4 bg-slate-900 text-slate-300 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed">${escapeHtml(item.prompt)}</div>
                </div>
                <div>
                    <h5 class="text-[10px] font-extrabold uppercase text-slate-400 mb-2">Gemini JSON Synthesis</h5>
                    <div class="p-4 bg-teal-50 text-teal-900 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-teal-100">${escapeHtml(item.response)}</div>
                </div>
            </div>
        </div>
    `).join('');

    const content = `
        <div class="report-modal-content flex-grow overflow-y-auto custom-scrollbar">
            <div class="p-8 bg-slate-50 border-b">
                <p class="text-sm text-slate-600 mb-4">This session log captures every semantic negotiation between the PECO-Buddy Co-Pilot and the Gemini Science Robot. It is provided for total methodological transparency.</p>
                <div class="flex gap-4">
                    <div class="px-3 py-1 bg-white rounded-lg border text-[10px] font-bold text-slate-500">Trace Depth: ${appState.interactionLog.length} Steps</div>
                    <div class="px-3 py-1 bg-white rounded-lg border text-[10px] font-bold text-slate-500">Engine: Gemini-3-Flash</div>
                </div>
            </div>
            <div class="bg-white">
                ${logItems.length > 0 ? logItems : '<p class="p-12 text-center text-slate-400 italic font-medium">No interactions recorded in the current session. Begin analysis to generate logs.</p>'}
            </div>
        </div>
    `;

    showModal('Extended Transparency Log', content, null, (modal, close) => {
        const container = modal.querySelector('.modal-container, .report-modal-container');
        if (!container) return; // Defensive
        const foot = container.appendChild(document.createElement('div'));
        foot.className = 'modal-footer p-4 border-t flex justify-end gap-3';
        foot.innerHTML = `
            <button class="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest">Close</button>
            <button id="download-toolkit-log-btn" class="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Download Trace (.json)</button>
        `;
        foot.querySelector('button').onclick = close;
        const dlBtn = foot.querySelector('#download-toolkit-log-btn');
        if (dlBtn) {
            dlBtn.onclick = () => {
                const blob = new Blob([JSON.stringify(appState.interactionLog, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `peco-toolkit-trace-${new Date().getTime()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                ToastService.show('Semantic trace downloaded.', 'success');
            };
        }
    }, true);
}

function initIdeationView(container) {
  const generateBtn = container.querySelector('#generate-ideation-btn');
  const scopeInput = container.querySelector('#ideation-scope-input');
  const resultsContainer = container.querySelector('#ideation-results-container');
  const studyTypeSelector = container.querySelector('#study-type-selector');
  const studyTypePhase = container.querySelector('#ideation-phase-study-type');
  const toggleBasic = container.querySelector('#toggle-basic-types');
  const toggleExtended = container.querySelector('#toggle-extended-types');

  let activeFilter = 'basic'; 

  const renderStudyTypes = () => {
    const list = activeFilter === 'basic' ? BASIC_STUDY_TYPES : EXTENDED_STUDY_TYPES;
    studyTypeSelector.innerHTML = list.map(st => `
        <button class="study-type-btn p-3 border rounded-xl flex flex-col items-center gap-2 hover:bg-slate-50 transition-all ${appState.authorWorkflow.ideationData.selectedStudyType?.id === st.id ? 'bg-teal-50 border-teal-500' : ''}" data-id="${st.id}" data-name="${st.name}">
          <i class="fa-solid ${st.icon} text-xl text-teal-600"></i>
          <span class="text-[10px] font-bold uppercase text-center leading-tight h-8 flex items-center justify-center">${st.name}</span>
        </button>
      `).join('');
  };

  const updateUI = () => {
    const hasText = scopeInput.value.trim().length > 0;
    studyTypePhase.classList.toggle('hidden', !hasText);
    generateBtn.disabled = !hasText || !appState.authorWorkflow.ideationData.selectedStudyType;
    generateBtn.textContent = hasText ? 'Generate Suggestions' : 'Enter Scope to Continue';
  };

  scopeInput.value = appState.authorWorkflow.ideationData.scopeText || '';
  renderStudyTypes();
  updateUI();

  scopeInput.oninput = () => {
    appState.authorWorkflow.ideationData.scopeText = scopeInput.value;
    updateUI();
  };

  toggleBasic.onclick = () => {
    activeFilter = 'basic';
    toggleBasic.className = "px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all bg-white text-teal-600 shadow-sm";
    toggleExtended.className = "px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-slate-500 hover:text-slate-800";
    renderStudyTypes();
  };

  toggleExtended.onclick = () => {
    activeFilter = 'extended';
    toggleExtended.className = "px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all bg-white text-teal-600 shadow-sm";
    toggleBasic.className = "px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-slate-500 hover:text-slate-800";
    renderStudyTypes();
  };

  studyTypeSelector.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    appState.authorWorkflow.ideationData.selectedStudyType = { id: btn.dataset.id, name: btn.dataset.name };
    
    // RESET generationCount as requested when a new study type is clicked
    appState.authorWorkflow.ideationData.generationCount = 0;
    
    studyTypeSelector.querySelectorAll('button').forEach(b => b.classList.remove('bg-teal-50', 'border-teal-500'));
    btn.classList.add('bg-teal-50', 'border-teal-500');
    updateUI();
  };

  generateBtn.onclick = async () => {
    showLoading(resultsContainer, 'Consulting Scientific Co-Author...');
    try {
      // IMPLEMENT progressive seed logic: Base 42 + increment count per session/study-type
      const currentSeed = 42 + (appState.authorWorkflow.ideationData.generationCount || 0);
      
      const result = await GeminiAPI.callAdvancedIdeationAPI(
        appState.authorWorkflow.ideationData.scopeText,
        appState.authorWorkflow.ideationData.selectedStudyType.name,
        resultsContainer,
        { seed: currentSeed }
      );
      
      if (result && result.questions) {
          appState.authorWorkflow.ideationData.generatedSuggestions = result.questions;
          
          // INCREMENT count for next potential click to provide variations while remaining deterministic
          appState.authorWorkflow.ideationData.generationCount = (appState.authorWorkflow.ideationData.generationCount || 0) + 1;
          
          renderSuggestions();
      } else {
          throw new Error("Model returned invalid question format.");
      }
    } catch(e) { 
        showError(resultsContainer, e.message); 
    }
  };

  const renderSuggestions = () => {
    resultsContainer.innerHTML = appState.authorWorkflow.ideationData.generatedSuggestions.map((q, i) => `
      <div class="bg-white p-5 rounded-2xl border mb-4 shadow-sm hover:shadow-md transition-shadow">
        <p class="font-bold text-slate-800">"${styleMatrices(escapeHtml(q.full_statement))}"</p>
        <div class="text-right mt-4">
          <button class="select-q-btn bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider" data-index="${i}">Develop this Question</button>
        </div>
      </div>
    `).join('');
    resultsContainer.querySelectorAll('.select-q-btn').forEach(btn => {
      btn.onclick = () => {
        const q = appState.authorWorkflow.ideationData.generatedSuggestions[btn.dataset.index];
        appState.authorWorkflow.clarityData.researchQuestion = q.full_statement;
        appState.authorWorkflow.liveCoAuthorData.peco = { 
          population: q.population || '', 
          exposure: q.exposure || '', 
          comparison: q.comparison || '', 
          outcome: q.outcome || '' 
        };
        jumpToStep('step-clarity');
        const container = document.getElementById('step-clarity').querySelector('.step-content');
        initClarityView(container, true);
      };
    });
  };

  if (appState.authorWorkflow.ideationData.generatedSuggestions.length > 0) renderSuggestions();
}

function initClarityView(container, autoRun = false) {
  const dashboardContainer = container.querySelector('#clarity-dashboard-container');
  const footerContainer = container.querySelector('#clarity-footer-container');
  const questionDisplay = container.querySelector('#research-question-display');
  const scoreBtn = container.querySelector('#score-clarity-btn');

  if (!dashboardContainer || !footerContainer || !questionDisplay || !scoreBtn) return;

  const runAnalysis = async (providedPeco = null) => {
    showLoading(dashboardContainer, 'Calibrating Context Logic & Terminology...');
    scoreBtn.disabled = true;
    scoreBtn.innerHTML = '<div class="loader inline-block"></div> UPDATING...';

    try {
      const q = appState.authorWorkflow.clarityData.researchQuestion;
      let peco, analysis;

      if (appState.analysisEngine === 'ai') {
          // STEP 1: Calibrate Context & Species Mapping
          const contextLogic = await GeminiAPI.callContextLogicEngineAPI(q);
          
          if (providedPeco) {
            peco = { ...providedPeco };
          } else {
            // STEP 2: Identify Domain (with context)
            showLoading(dashboardContainer, 'Identifying Scientific Domain...');
            const prelim = await GeminiAPI.callDomainIdentifierAPI(q, contextLogic);
            
            // STEP 3: Specialist Extraction (constrained by context and terminology anchors)
            showLoading(dashboardContainer, `Extracting PECO (Anchored to ${contextLogic.preferred_population_term})...`);
            peco = await GeminiAPI.callSpecialistPecoExtractorAPI(
                prelim.domain, 
                prelim, 
                q, 
                appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General',
                contextLogic
            );
          }
          
          // STEP 4: Quality Audit
          showLoading(dashboardContainer, 'Auditing Question Quality...');
          analysis = await GeminiAPI.callQuestionQualityAPI(q, peco);
      } else {
          peco = providedPeco ? { ...providedPeco } : { population: '', exposure: '', comparison: '', outcome: '' };
          if (!providedPeco) {
              appState.nlpTerms.forEach(t => {
                  if (q.toLowerCase().includes(t.term.toLowerCase())) {
                      peco[t.category] += (peco[t.category] ? ' & ' : '') + t.term;
                  }
              });
          }
          analysis = { strengths: ["Local rule matching completed."], missing_components: [], ambiguities: [] };
          Object.keys(peco).forEach(k => { if(!peco[k]) analysis.missing_components.push(k); });
      }

      appState.authorWorkflow.liveCoAuthorData.peco = peco;
      appState.authorWorkflow.clarityData.analysis = analysis;
      
      let score = 100;
      score -= (analysis.missing_components.length * 15);
      score -= (analysis.ambiguities.length * 10);
      appState.authorWorkflow.clarityData.qualityScore = Math.max(0, score);
      
      renderResults();
    } catch(e) { showError(dashboardContainer, e.message); }
    finally {
        scoreBtn.disabled = false;
        scoreBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> UPDATE QUESTION & DASHBOARD';
    }
  };

  const renderResults = () => {
    const { qualityScore, analysis, isAnalysisCollapsed, researchQuestion } = appState.authorWorkflow.clarityData;
    const peco = appState.authorWorkflow.liveCoAuthorData.peco;
    const offset = 314 * (1 - qualityScore/100);
    const color = qualityScore > 75 ? '#0d9488' : qualityScore > 50 ? '#f59e0b' : '#ef4444';

    // RENDER rich-text statement into the display div
    questionDisplay.innerHTML = `"${styleMatrices(escapeHtml(researchQuestion))}"`;

    dashboardContainer.innerHTML = `
      <div class="bg-white p-10 rounded-[2rem] border shadow-sm">
        <div class="flex justify-between items-center mb-10">
          <div class="flex items-center gap-4">
             <h4 class="text-xs font-extrabold uppercase text-slate-400 tracking-widest">Potential Improvements Dashboard</h4>
             ${analysis.strengths.length > 0 ? `<div class="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full border border-teal-100 uppercase tracking-widest">Quality Verified</div>` : ''}
          </div>
          <div class="flex gap-4 items-center">
            <button id="toggle-gauge-visibility-btn" class="text-xs font-bold text-slate-400 hover:text-teal-600 underline">${appState.showScoreGauge ? 'Hide Gauge' : 'Show Gauge'}</button>
            <button id="toggle-gauge-btn" class="text-xs font-bold text-teal-600 underline">${isAnalysisCollapsed ? 'View Dashboard' : 'Minimise Dashboard'}</button>
          </div>
        </div>

        <div id="gauge-container" class="analysis-collapsible ${isAnalysisCollapsed ? 'collapsed' : ''}" style="max-height: 2000px">
          <div class="flex flex-col lg:flex-row items-start gap-12">
            
            ${appState.showScoreGauge ? `
            <div class="relative w-48 h-48 shrink-0 mx-auto lg:mx-0">
              <svg class="w-full h-full" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" stroke="#f1f5f9" stroke-width="12" fill="none"/>
                <circle class="scoring-circle-fg" cx="60" cy="60" r="50" stroke="${color}" stroke-width="12" fill="none" stroke-dasharray="314" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 60 60)"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-5xl font-extrabold" style="color:${color}">${qualityScore}</span>
                <span class="text-[10px] font-bold text-slate-400">SCORE</span>
              </div>
            </div>` : ''}

            <div class="flex-grow w-full">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${Object.keys(PECO_MAP).map(key => {
                        const isMissing = analysis.missing_components.some(m => m.toLowerCase().includes(key));
                        const componentAmbiguities = analysis.ambiguities.filter(a => a.component.toLowerCase().includes(key));
                        
                        return `
                        <div class="peco-dashboard-card group bg-slate-50/50 p-6 rounded-3xl border border-slate-100 hover:border-teal-500 transition-all flex flex-col gap-4 relative" data-key="${key}">
                            <div class="flex justify-between items-center">
                                <span class="text-[10px] font-extrabold uppercase tracking-widest" style="color:${PECO_MAP[key].color}">${PECO_MAP[key].label}</span>
                                <button class="edit-peco-btn text-slate-300 hover:text-teal-600 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
                            </div>
                            
                            <div class="peco-display-mode text-sm text-slate-700 font-bold leading-relaxed">
                                ${formatPecoForDisplay(peco[key])}
                            </div>
                            
                            <div class="peco-edit-mode">
                                <textarea class="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none font-bold" rows="2">${peco[key]}</textarea>
                                <button class="save-peco-btn w-full bg-teal-600 text-white text-[10px] py-2 rounded-xl mt-3 font-bold uppercase shadow-sm">Sync and Re-Analyse</button>
                            </div>

                            <div class="peco-feedback-space space-y-2">
                                ${isMissing ? `
                                    <div class="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-xl text-[10px] font-extrabold border border-red-200">
                                        <i class="fa-solid fa-circle-exclamation"></i> MISSING COMPONENT
                                    </div>` : ''}
                                ${componentAmbiguities.map(a => `
                                    <div class="p-3 bg-amber-50 text-amber-900 rounded-xl text-[10px] font-bold border border-amber-200 flex items-start gap-2">
                                        <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                        <span>"${a.term}": ${a.reason}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
          </div>
        </div>
      </div>
    `;

    footerContainer.innerHTML = `
        <div class="bg-white p-10 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
           <div class="text-left w-full md:w-auto">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Confidence</p>
              <p class="text-sm font-bold text-slate-700">${qualityScore > 75 ? 'Excellent Logic' : qualityScore > 50 ? 'Developing' : 'Action Required'}</p>
           </div>
           <button id="finalise-btn" class="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-extrabold uppercase tracking-widest text-xs shadow-xl transition-all">Review Protocol &raquo;</button>
        </div>
    `;

    dashboardContainer.querySelectorAll('.peco-dashboard-card').forEach(card => {
      const key = card.dataset.key;
      card.querySelector('.edit-peco-btn').onclick = () => {
        card.classList.toggle('is-editing');
        const textarea = card.querySelector('.peco-edit-mode textarea');
        if (textarea) textarea.focus();
      };
      card.querySelector('.save-peco-btn').onclick = async (e) => {
        const btn = e.target;
        btn.disabled = true;
        btn.innerHTML = '<div class="loader w-3 h-3 border-2 inline-block"></div> SYNCING...';
        
        const val = card.querySelector('textarea').value;
        appState.authorWorkflow.liveCoAuthorData.peco[key] = val;
        
        try {
            const synth = await GeminiAPI.callPecoSynthesizerAPI(appState.authorWorkflow.liveCoAuthorData.peco);
            appState.authorWorkflow.clarityData.researchQuestion = synth.semantic_statement;
            await runAnalysis(appState.authorWorkflow.liveCoAuthorData.peco);
        } catch(err) {
            ToastService.show("Failed to sync: " + err.message, "error");
            btn.disabled = false;
            btn.innerHTML = 'Sync and Re-Analyse';
        }
      };
    });

    dashboardContainer.querySelector('#toggle-gauge-visibility-btn').onclick = () => {
      appState.showScoreGauge = !appState.showScoreGauge;
      renderResults();
    };
    dashboardContainer.querySelector('#toggle-gauge-btn').onclick = () => {
      appState.authorWorkflow.clarityData.isAnalysisCollapsed = !appState.authorWorkflow.clarityData.isAnalysisCollapsed;
      renderResults();
    };
    footerContainer.querySelector('#finalise-btn').onclick = () => {
       initPecoWorkshopView(document.getElementById('step-peco-workshop').querySelector('.step-content'));
       jumpToStep('step-peco-workshop');
    };
  };

  scoreBtn.onclick = () => runAnalysis();

  if (autoRun || appState.authorWorkflow.clarityData.analysis) {
    if (appState.authorWorkflow.clarityData.analysis) renderResults();
    else runAnalysis();
  } else {
      dashboardContainer.innerHTML = `<div class="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed"><p class="font-bold">Dashboard ready for input.</p><p class="text-xs mt-2">Complete Step 1 to generate analysis.</p></div>`;
  }
}

function initPecoWorkshopView(container) {
  if (!container) return;
  const peco = appState.authorWorkflow.liveCoAuthorData.peco;
  const q = appState.authorWorkflow.clarityData.researchQuestion;

  const qDisplay = container.querySelector('#final-question-display');
  const pecoDisplay = container.querySelector('#final-peco-display');
  const saveBtn = container.querySelector('#save-to-notebook-btn');
  const logBtn = container.querySelector('#show-transparency-log-workshop-btn');
  const reportBtn = container.querySelector('#view-transparency-report-btn');

  if (qDisplay) qDisplay.innerHTML = q ? `"${styleMatrices(escapeHtml(q))}"` : 'No finalised question found yet.';
  if (pecoDisplay) {
      pecoDisplay.innerHTML = `
        <table id="peco-final-table" class="w-full text-sm border-collapse rounded-2xl overflow-hidden border border-slate-200">
          ${Object.keys(PECO_MAP).map(key => `
            <tr class="border-b border-slate-100 last:border-0">
              <th class="p-4 bg-slate-50 text-left w-1/4 font-extrabold uppercase text-[10px] tracking-widest text-slate-500">${PECO_MAP[key].label}</th>
              <td class="p-4 bg-white">${formatPecoForDisplay(peco[key])}</td>
            </tr>
          `).join('')}
        </table>
      `;
  }

  if (saveBtn) {
      saveBtn.onclick = () => {
          Object.assign(appState.notebookData, {
              finalQuestion: q,
              population: peco.population,
              exposure: peco.exposure,
              comparison: peco.comparison,
              outcome: peco.outcome
          });
          document.dispatchEvent(new CustomEvent('notebook-save-request'));
          ToastService.show('Protocol saved to Notebook.', 'success');
      };
  }

  if (logBtn) {
      logBtn.onclick = () => showTransparencyLogModal();
  }

  if (reportBtn) {
      reportBtn.onclick = () => renderTransparencyReport();
  }
}

function renderTransparencyReport() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = templates.transparencyReportView;
    
    const peco = appState.authorWorkflow.liveCoAuthorData.peco;
    const q = appState.authorWorkflow.clarityData.researchQuestion;
    const timestamp = new Date().toLocaleString('en-GB');
    
    document.getElementById('report-timestamp').textContent = timestamp;
    document.getElementById('report-final-question').innerHTML = `"${styleMatrices(escapeHtml(q))}"`;
    
    const tableWrapper = document.getElementById('report-peco-table-wrapper');
    tableWrapper.innerHTML = `
        <table id="report-peco-table" class="w-full text-sm border-collapse">
            ${Object.keys(PECO_MAP).map(key => `
                <tr class="border-b last:border-0">
                    <th class="p-4 bg-slate-50 text-left w-1/4 font-extrabold uppercase text-[9px] tracking-widest text-slate-500">${PECO_MAP[key].label}</th>
                    <td class="p-4 bg-white">${formatPecoForDisplay(peco[key])}</td>
                </tr>
            `).join('')}
        </table>
    `;

    const logSummaryContainer = document.getElementById('report-log-entries');
    if (appState.authorWorkflow.clarityData.analysis) {
        logSummaryContainer.innerHTML = `
            <div class="text-[10px] p-2 bg-white border rounded-xl">
                <span class="font-bold text-teal-600 mr-2">LOGIC AUDIT:</span> Found ${appState.authorWorkflow.clarityData.analysis.missing_components.length} omissions and ${appState.authorWorkflow.clarityData.analysis.ambiguities.length} conceptual ambiguities.
            </div>
            <div class="text-[10px] p-2 bg-white border rounded-xl">
                <span class="font-bold text-teal-600 mr-2">SEMANTIC SYNC:</span> Synchronised ${appState.interactionLog.length} interaction blocks for scientific reproducibility.
            </div>
        `;
    }

    const reportLogBtn = document.getElementById('report-show-log-btn');
    if (reportLogBtn) {
        reportLogBtn.onclick = () => showTransparencyLogModal();
    }

    document.getElementById('report-copy-table-btn').onclick = () => copyTableToClipboard('#report-peco-table');
    
    document.getElementById('report-export-nanopub-btn').onclick = () => {
        const nanopub = {
            "@context": "http://nanopub.org/ns/context.jsonld",
            "assertion": {
                "researchQuestion": q,
                "components": peco,
                "studyType": appState.authorWorkflow.ideationData.selectedStudyType?.name
            },
            "provenance": {
                "generatedBy": "PECO-Buddy v8.1 Beta",
                "timestamp": timestamp,
                "author": "EBTC Researcher"
            }
        };
        const blob = new Blob([JSON.stringify(nanopub, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'peco-nanopub.json';
        a.click();
        URL.revokeObjectURL(url);
        ToastService.show('Nano-publication exported!', 'success');
    };
}