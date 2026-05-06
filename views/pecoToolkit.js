import { appState, dom } from '../state.js';
import { templates } from './templates.js';
import { ToastService } from '../components/toast.js';
import { PECO_MAP } from '../config.js';
import * as GeminiAPI from '../api/gemini.js';
import { runLocalNlpAnalysis } from './nlpToolkit.js';
import { showModal } from '../components/modal.js';
import { formatPecoForDisplay, styleMatrices, showLoading, showError, copyTableToClipboard, escapeHtml, stripMetadataFromText, handleExport } from '../utils.js';
import { showTransparencyLogModal } from './reviewPeco.js';

const STUDY_TYPES = [
    { 
        id: 'systematic_review', 
        name: 'Systematic Review', 
        icon: 'fa-magnifying-glass-chart', 
        tooltip: 'Select this if you are planning to summarize existing research on a specific topic.',
        explanation: '<b>PECO in Systematic Reviews:</b><br/>PECO is vital here to define strict inclusion and exclusion criteria for your literature search. Broad but well-defined populations and exposures are recommended.'
    },
    { 
        id: 'rct', 
        name: 'RCT', 
        icon: 'fa-vials', 
        tooltip: 'Select this if you are planning an experiment where participants are randomly assigned to different groups.',
        explanation: '<b>PECO in RCTs:</b><br/>For an RCT, the "Exposure" is your Intervention, and "Comparator" is the control/placebo. PECO helps establish your precise trial parameters.'
    },
    { 
        id: 'cohort', 
        name: 'Cohort Study', 
        icon: 'fa-users-line', 
        tooltip: 'Select this if you are planning to follow a group of people over time to observe outcomes.',
        explanation: '<b>PECO in Cohort Studies:</b><br/>PECO ensures clear distinction between exposed and unexposed groups within the population over time. Essential for preventing wild-west reporting variables.'
    },
    { 
        id: 'case_control', 
        name: 'Case-Control Study', 
        icon: 'fa-user-group', 
        tooltip: 'Select this if you are planning to compare people with a specific outcome to those without it.',
        explanation: '<b>PECO in Case-Control:</b><br/>This is often reversed logically (Outcome is known first). PECO forces clarity on what constitutes the Population from which cases and controls are drawn, and the primary Exposure of interest.'
    },
    { 
        id: 'animal_study', 
        name: 'Animal Study', 
        icon: 'fa-paw', 
        tooltip: 'Select this if you are planning an experiment using animal models.',
        explanation: '<b>PECO in Animal Studies:</b><br/>Crucial for primary studies! Define the exact strain/model (Population), precise dosing (Exposure), the negative/vehicle group (Comparator), and the specific endpoints (Outcome).'
    },
    { 
        id: 'in_vitro', 
        name: 'In Vitro Study', 
        icon: 'fa-microscope', 
        tooltip: 'Select this if you are planning an experiment using cells or tissues in a lab setting.',
        explanation: '<b>PECO in In Vitro:</b><br/>Brings reporting order to bench science. Define the cell line/assay (Population), exact chemical/concentration (Exposure), the vehicle control (Comparator), and the measured biomarkers (Outcome).'
    },
    { 
        id: 'cross_sectional', 
        name: 'Cross-Sectional', 
        icon: 'fa-chart-pie', 
        tooltip: 'Select this if you are planning to analyze data from a population at a specific point in time.',
        explanation: '<b>PECO in Cross-Sectional:</b><br/>While snapshot-based and often lacking a true longitudinal Comparator, PECO helps define the target demographic (Population), the factor being measured (Exposure), and the associated status (Outcome).'
    },
    { 
        id: 'case_series', 
        name: 'Case Series / Report', 
        icon: 'fa-clipboard-user', 
        tooltip: 'Select this if you are planning to describe a single patient or a small group of patients.',
        explanation: '<b>PECO in Case Series:</b><br/>Often lacks a Comparator entirely. PECO can still define the precise characteristics of the patients (Population) and the precipitating factor (Exposure).'
    }
];

export const initAuthorToolkitFlow = () => {
  const steps = ['step-ideation', 'step-clarity', 'step-peco-workshop'];
  
  steps.forEach(stepId => {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    const contentContainer = stepEl.querySelector('.step-content');
    if (!contentContainer) return;

    if (appState.authorWorkflow.currentStep === stepId) {
        stepEl.classList.add('active');
    }

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
        if (!isActive) {
            stepEl.classList.add('active');
            appState.authorWorkflow.currentStep = stepId;
            if (stepId === 'step-clarity') {
                initClarityView(stepEl.querySelector('.step-content'));
            }
            if (stepId === 'step-peco-workshop') {
                initPecoWorkshopView(stepEl.querySelector('.step-content'));
            }
        }
      };
    }
  });
};

const jumpToStep = (stepId) => {
  document.querySelectorAll('.workflow-step').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(stepId);
  if (target) {
    target.classList.add('active');
    appState.authorWorkflow.currentStep = stepId;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const content = target.querySelector('.step-content');
    if (stepId === 'step-clarity') {
        initClarityView(content);
    } else if (stepId === 'step-peco-workshop') {
        initPecoWorkshopView(content);
    }
  }
};

const showProgressGauge = (container, message, progress = 0, subMessage = "") => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * (progress / 100));
    container.innerHTML = `
        <div class="progress-gauge-container animate-fade-in">
            <div class="gauge relative w-44 h-44">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                    <circle class="bg" cx="50" cy="50" r="${radius}" fill="none" stroke="#f1f5f9" stroke-width="10"></circle>
                    <circle class="progress" cx="50" cy="50" r="${radius}" fill="none" stroke="#0d9488" stroke-width="10" stroke-linecap="round" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}"></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                   <div class="text-4xl font-extrabold text-teal-600">${Math.round(progress)}%</div>
                </div>
            </div>
            <div class="text-center space-y-2">
                <p class="text-2xl font-bold text-slate-800 tracking-tight leading-tight">${message}</p>
                ${subMessage ? `<p class="text-[10px] font-bold text-teal-600 uppercase tracking-widest">${subMessage}</p>` : ''}
                <div class="running-dots flex justify-center gap-2 mt-4">
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce"></span>
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style="animation-delay: 0.1s"></span>
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style="animation-delay: 0.2s"></span>
                </div>
            </div>
        </div>
    `;
};

function initIdeationView(container) {
  const generateBtn = container.querySelector('#generate-ideation-btn');
  const continueOwnBtn = container.querySelector('#continue-own-question-btn');
  const scopeInput = container.querySelector('#ideation-scope-input');
  const resultsContainer = container.querySelector('#ideation-results-container');
  const studyTypeSelector = container.querySelector('#study-type-selector');
  const studyTypePhase = container.querySelector('#ideation-phase-study-type');

  const renderStudyTypes = () => {
    studyTypeSelector.innerHTML = STUDY_TYPES.map(st => `
        <button class="study-type-btn ${appState.authorWorkflow.ideationData.selectedStudyType?.id === st.id ? 'active' : ''}" data-id="${st.id}" data-name="${st.name}" data-tooltip="${st.tooltip}">
          <i class="fa-solid ${st.icon} text-teal-600"></i>
          <span class="text-[12px] font-bold uppercase tracking-widest text-center">${st.name}</span>
        </button>
      `).join('');
  };

  const updateUI = () => {
    const hasText = scopeInput.value.trim().length > 0;
    studyTypePhase.classList.toggle('hidden', !hasText);
    generateBtn.disabled = !hasText || !appState.authorWorkflow.ideationData.selectedStudyType;
    if (continueOwnBtn) continueOwnBtn.disabled = !hasText;
  };

  scopeInput.value = appState.authorWorkflow.ideationData.scopeText || '';
  renderStudyTypes();
  updateUI();

  scopeInput.oninput = () => {
    appState.authorWorkflow.ideationData.scopeText = scopeInput.value;
    updateUI();
  };

  studyTypeSelector.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const isAlreadyActive = btn.classList.contains('active');
    appState.authorWorkflow.ideationData.selectedStudyType = { id: btn.dataset.id, name: btn.dataset.name };
    studyTypeSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateUI();

    if (!isAlreadyActive) {
        const studyData = STUDY_TYPES.find(st => st.id === btn.dataset.id);
        if (studyData && studyData.explanation) {
            showModal(`Focus: ${studyData.name}`, `
                <div class="modal-body p-8">
                    <div class="flex flex-col items-center gap-4 mb-6 text-center">
                        <div class="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-3xl shadow-sm border border-teal-200">
                            <i class="fa-solid ${studyData.icon}"></i>
                        </div>
                        <p class="text-slate-600 text-sm font-medium leading-relaxed">${studyData.tooltip}</p>
                    </div>
                    <div class="bg-indigo-50/50 border-l-4 border-indigo-500 rounded-r-xl p-5 text-sm text-slate-800 leading-relaxed shadow-sm">
                        ${studyData.explanation}
                    </div>
                </div>
            `, null, (modal, closeModal) => {
                const container = modal.querySelector('.modal-container');
                if (container) {
                    const footer = document.createElement('div');
                    footer.className = 'modal-footer p-6 border-t flex justify-end gap-3 bg-slate-50';
                    footer.innerHTML = `
                        <button class="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all close-trigger">Cancel</button>
                        <button class="px-6 py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm close-trigger">Continue With This</button>
                    `;
                    footer.querySelectorAll('.close-trigger').forEach(b => b.addEventListener('click', closeModal));
                    container.appendChild(footer);
                }
            });
        }
    }
  };

  generateBtn.onclick = async () => {
    showProgressGauge(resultsContainer, 'Generating Suggestions...', 30, "Initialising Engine");
    try {
      const result = await GeminiAPI.callAdvancedIdeationAPI(
        appState.authorWorkflow.ideationData.scopeText,
        appState.authorWorkflow.ideationData.selectedStudyType.name,
        resultsContainer,
        { seed: appState.globalSeed }
      );
      showProgressGauge(resultsContainer, 'Generating Suggestions...', 100, "Finalising Results");
      if (result && result.questions) {
          appState.authorWorkflow.ideationData.generatedSuggestions = result.questions;
          setTimeout(() => renderSuggestions(), 500);
      }
    } catch(e) { 
        console.error("Ideation Generate Error:", e);
        showError(resultsContainer, e.message); 
    }
  };

  if (continueOwnBtn) {
    continueOwnBtn.onclick = () => {
      const text = scopeInput.value.trim();
      if (text) {
          appState.authorWorkflow.clarityData.researchQuestion = text;
          appState.authorWorkflow.liveCoAuthorData.peco = { population: '', exposure: '', comparison: '', outcome: '' };
          jumpToStep('step-clarity');
      }
    };
  }

  const renderSuggestions = () => {
    resultsContainer.innerHTML = (appState.authorWorkflow.ideationData.generatedSuggestions || []).map((q, i) => `
      <div class="bg-white p-8 rounded-3xl border mb-6 shadow-sm hover:shadow-md transition-shadow">
        <p class="font-bold text-slate-800 text-lg mb-6">"${styleMatrices(q.full_statement, 'display')}"</p>
        
        <div class="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden mb-6">
            <table class="w-full text-xs text-left">
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.population.color}">Population</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.population || 'N/A', 'display')}</td>
                </tr>
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.exposure.color}">Exposure</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.exposure || 'N/A', 'display')}</td>
                </tr>
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.comparison.color}">Comparator</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.comparison || 'N/A', 'display')}</td>
                </tr>
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.outcome.color}">Outcome</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.outcome || 'N/A', 'display')}</td>
                </tr>
            </table>
        </div>

        <div class="text-right">
          <button class="select-q-btn bg-teal-600 hover:bg-teal-700 text-white px-10 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest" data-index="${i}">Develop this Question</button>
        </div>
      </div>
    `).join('');
    resultsContainer.querySelectorAll('.select-q-btn').forEach(btn => {
      btn.onclick = () => {
        const q = appState.authorWorkflow.ideationData.generatedSuggestions[btn.dataset.index];
        appState.authorWorkflow.clarityData.researchQuestion = q.full_statement;
        appState.authorWorkflow.clarityData.analysis = null; // Clear previous analysis to trigger auto-run
        appState.authorWorkflow.liveCoAuthorData.peco = { population: q.population || '', exposure: q.exposure || '', comparison: q.comparison || '', outcome: q.outcome || '' };
        jumpToStep('step-clarity');
      };
    });
  };

  if (appState.authorWorkflow.ideationData.generatedSuggestions.length > 0) renderSuggestions();
}

function smartAdaptTerm(currentValue, suggestion) {
    if (!currentValue) return suggestion;
    const getRoot = (str) => str.split(/[\(\,]/)[0].trim().toLowerCase();
    const suggestionRoot = getRoot(suggestion);
    const normalizedSuggestion = suggestion.trim().toLowerCase();
    const existingTerms = currentValue.split(/[;&]/).map(t => t.trim().toLowerCase());
    
    if (existingTerms.includes(normalizedSuggestion)) return currentValue;

    return `${currentValue} ; ${suggestion}`;
}

function initClarityView(container) {
  const dashboardContainer = container.querySelector('#clarity-dashboard-container');
  const footerContainer = container.querySelector('#clarity-footer-container');
  const questionDisplay = container.querySelector('#research-question-display');
  const scoreBtn = container.querySelector('#score-clarity-btn');
  const depthGroup = container.querySelector('#depth-selector-group');

  if (!dashboardContainer || !footerContainer || !questionDisplay || !scoreBtn) return;

  const refreshDisplay = () => {
      const q = appState.authorWorkflow.clarityData.researchQuestion;
      questionDisplay.innerHTML = q ? `"${styleMatrices(q, 'display')}"` : '<span class="text-slate-300 font-medium">Awaiting selection from Step 1...</span>';
  };
  refreshDisplay();

  if (depthGroup) {
      depthGroup.querySelectorAll('.depth-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.depth === appState.authorWorkflow.clarityData.analysisDepth);
          btn.onclick = () => {
              appState.authorWorkflow.clarityData.analysisDepth = btn.dataset.depth;
              depthGroup.querySelectorAll('.depth-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
          };
      });
  }

  const runAnalysis = async (isRefresh = false) => {
    const scoreBtnBottom = footerContainer.querySelector('#score-clarity-btn-bottom');
    if (!isRefresh) {
        scoreBtn.disabled = true;
        scoreBtn.innerHTML = '<div class="loader inline-block"></div> <span class="animate-pulse">ANALYSING...</span>';
        if (scoreBtnBottom) {
            scoreBtnBottom.disabled = true;
            scoreBtnBottom.innerHTML = '<div class="loader inline-block"></div> <span class="animate-pulse">ANALYSING...</span>';
        }
    } else {
        scoreBtn.disabled = true;
        scoreBtn.innerHTML = '<div class="loader inline-block"></div> <span class="animate-pulse">RE-ANALYSING...</span>';
        if (scoreBtnBottom) {
            scoreBtnBottom.disabled = true;
            scoreBtnBottom.innerHTML = '<div class="loader inline-block"></div> <span class="animate-pulse">RE-ANALYSING...</span>';
        }
    }

    try {
      const q = appState.authorWorkflow.clarityData.researchQuestion;
      
      if (appState.analysisEngine === 'nlp') {
          showProgressGauge(dashboardContainer, 'Running Local NLP Analysis...', 50, "Matching Vocabulary");
          
          // Strip metadata if enabled (though q is usually short text, good practice)
          const textToAnalyze = appState.stripMetadata ? stripMetadataFromText(q) : q;
          
          // Simulate a small delay for UX
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const result = runLocalNlpAnalysis(textToAnalyze);
          
          showProgressGauge(dashboardContainer, 'Finalising Advisory Feed...', 100, "Synthesis Complete");

          if (!appState.authorWorkflow.liveCoAuthorData.peco || !Object.values(appState.authorWorkflow.liveCoAuthorData.peco).some(v => !!v)) {
            appState.authorWorkflow.liveCoAuthorData.peco = result.peco;
          }
          appState.authorWorkflow.clarityData.analysis = result.analysis;
          setTimeout(() => renderResults(), 800);

      } else {
          // AI Engine (Gemini)
          showProgressGauge(dashboardContainer, isRefresh ? 'Re-analysing Logic Strategy...' : 'Analysing Logic Structure...', 15, "Extracting Semantic Domains");
          
          const config = { seed: appState.globalSeed };
          if (appState.authorWorkflow.clarityData.analysisDepth === 'standard') config.thinkingConfig = { thinkingBudget: 2048 };
          
          const contextLogic = await GeminiAPI.callContextLogicEngineAPI(q);
          showProgressGauge(dashboardContainer, 'Deconstructing Linguistic Syntax...', 50, "Scanning Context");
          const prelim = await GeminiAPI.callDomainIdentifierAPI(q, contextLogic);
          showProgressGauge(dashboardContainer, 'Mapping Matrix Intersections...', 75, "Verification Phase");
          const pecoResponse = await GeminiAPI.callSpecialistPecoExtractorAPI(prelim.domain, prelim, q, appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General', contextLogic);
          const peco = pecoResponse.extracted_data;
          appState.authorWorkflow.clarityData.extractionMetadata = pecoResponse.extraction_metadata;
          const analysis = await GeminiAPI.callQuestionQualityAPI(q, peco, dashboardContainer, config);
          showProgressGauge(dashboardContainer, 'Finalising Advisory Feed...', 100, "Synthesis Complete");

          if (!appState.authorWorkflow.liveCoAuthorData.peco || !Object.values(appState.authorWorkflow.liveCoAuthorData.peco).some(v => !!v)) {
            appState.authorWorkflow.liveCoAuthorData.peco = peco;
          }
          appState.authorWorkflow.clarityData.analysis = analysis;
          setTimeout(() => renderResults(), 800);
      }
    } catch(e) { 
        console.error("Analysis / Quality Engine Error:", e);
        showError(dashboardContainer, e.message); 
    }
    finally {
        scoreBtn.disabled = false;
        scoreBtn.innerHTML = '<i class="fa-solid fa-play"></i> Re-Analyse';
        const scoreBtnBottom = footerContainer.querySelector('#score-clarity-btn-bottom');
        if (scoreBtnBottom) {
            scoreBtnBottom.disabled = false;
            scoreBtnBottom.innerHTML = '<i class="fa-solid fa-play"></i> Re-Analyse';
        }
    }
  };

  const syncAllProtocol = async () => {
    try {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center';
        loadingOverlay.innerHTML = '<div class="loader"></div>';
        questionDisplay.style.position = 'relative';
        questionDisplay.appendChild(loadingOverlay);

        const currentQuestion = appState.authorWorkflow.clarityData.researchQuestion.trim() !== '' ? appState.authorWorkflow.clarityData.researchQuestion : null;
        const synth = await GeminiAPI.callPecoSynthesizerAPI(appState.authorWorkflow.liveCoAuthorData.peco, currentQuestion);
        appState.authorWorkflow.clarityData.researchQuestion = synth.semantic_statement;
        appState.authorWorkflow.pecoWorkshopData = { peco: synth.naturalised_peco };
        
        refreshDisplay();
        ToastService.show("Protocol statement synthesized. Click 'Analyse' to refresh advisory.", "success");
    } catch (err) { 
        console.error("Synthesizer API Error:", err);
        ToastService.show("Update failed: " + err.message, "error"); 
    } finally {
        const overlay = questionDisplay.querySelector('.loader')?.parentElement;
        if(overlay) overlay.remove();
    }
  };

  const renderResults = () => {
    const { analysis, isAnalysisCollapsed, researchQuestion } = appState.authorWorkflow.clarityData;
    const peco = appState.authorWorkflow.liveCoAuthorData.peco || {};
    const frozenComponents = appState.authorWorkflow.clarityData.frozenComponents || {};
    
    questionDisplay.innerHTML = `"${styleMatrices(researchQuestion, 'display')}"`;

    dashboardContainer.innerHTML = `
      <div class="bg-white p-8 md:p-14 rounded-[3.5rem] border shadow-sm">
        <div class="flex justify-between items-center mb-10 px-4">
          <div class="flex flex-col gap-1">
            <h4 class="text-sm font-extrabold uppercase text-slate-400 tracking-widest">Suggested Refinement</h4>
            <div class="flex flex-wrap gap-2 mt-2">
                <button id="refresh-audit-btn" class="text-[10px] font-extrabold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-teal-100 uppercase tracking-widest hover:bg-teal-100 transition-colors shadow-sm">
                    <i class="fa-solid fa-wand-sparkles mr-2"></i> Refresh Advisory
                </button>
                <button id="view-extraction-log-btn" class="text-[10px] font-extrabold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm">
                    <i class="fa-solid fa-list-check mr-2"></i> View Parser Log
                </button>
            </div>
          </div>
          <button id="toggle-gauge-btn" class="text-xs font-bold text-teal-600 underline">${isAnalysisCollapsed ? 'View Cards' : 'Minimise'}</button>
        </div>

        <div class="analysis-collapsible ${isAnalysisCollapsed ? 'collapsed' : ''}">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                ${Object.keys(PECO_MAP).map(key => {
                    const isFrozen = frozenComponents[key];
                    const componentFeedback = (analysis?.feedback || []).find(f => f.component.toLowerCase().includes(key));
                    const suggestions = componentFeedback?.suggestions || [];
                    const currentValue = peco[key] || '';
                    
                    return `
                    <div class="peco-dashboard-card bg-slate-50/50 rounded-3xl border border-slate-100 p-8 hover:border-teal-500 transition-all flex flex-col gap-8 relative overflow-hidden" data-key="${key}">
                        <div class="flex justify-between items-center">
                            <span class="text-[12px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-lg text-white" style="background-color:${PECO_MAP[key].color}">${PECO_MAP[key].label}</span>
                            <div class="flex gap-2">
                                <button class="freeze-component-btn px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all shadow-sm ${isFrozen ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}" title="I am happy with this">
                                    ${isFrozen ? '<i class="fa-solid fa-lock mr-1"></i> Locked' : '<i class="fa-regular fa-thumbs-up mr-1"></i> Happy'}
                                </button>
                                <button class="edit-peco-toggle-btn bg-white border border-slate-200 px-6 py-2 rounded-xl text-[10px] font-extrabold uppercase text-slate-500 hover:bg-slate-100 shadow-sm">
                                    <i class="fa-solid fa-pen-to-square mr-1"></i> Edit
                                </button>
                            </div>
                        </div>
                        
                        <div class="peco-display-mode text-base text-slate-700 font-bold leading-relaxed min-h-[50px] break-words">
                            ${formatPecoForDisplay(currentValue, false)}
                        </div>

                        <div class="peco-edit-mode animate-fade-in" style="display:none">
                            <div class="p-6 bg-white border rounded-2xl mb-4 min-h-[80px] flex flex-wrap gap-2 peco-pill-container shadow-inner">
                                ${formatPecoForDisplay(currentValue, true)}
                            </div>
                            <div class="flex gap-2">
                                <input type="text" placeholder="Add term..." class="flex-grow text-sm p-3 border rounded-xl outline-none pill-manual-input">
                                <button class="add-manual-pill-btn bg-slate-800 text-white px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">Add</button>
                            </div>
                            <div class="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-circle-info"></i> Use & for AND logic, ; for OR logic
                            </div>
                            <button class="save-peco-btn w-full bg-teal-600 text-white text-[10px] py-4 rounded-xl mt-4 font-extrabold uppercase shadow-lg hover:bg-teal-700">Apply Changes</button>
                        </div>

                        <div class="peco-feedback-hub border-t border-slate-100 pt-8 mt-auto overflow-hidden">
                            ${isFrozen ? 
                                `<div class="p-6 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-center">
                                    <i class="fa-solid fa-check-circle text-2xl mb-2"></i>
                                    <p class="text-xs font-bold uppercase tracking-widest">Component Finalised</p>
                                    <p class="text-[10px] opacity-70 mt-1">AI suggestions disabled for this section.</p>
                                 </div>` 
                            : 
                                (suggestions.length > 0 ? `
                                <div class="suggestion-carousel" data-component="${key}">
                                    <div class="suggestion-slides">
                                        ${suggestions.map((s, sIdx) => `
                                            <div class="suggestion-slide ${sIdx === 0 ? 'active' : ''}" data-index="${sIdx}">
                                                <div class="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm mb-4 min-h-[220px] flex flex-col relative">
                                                    <div class="mb-4 flex justify-between items-start">
                                                        <div>
                                                            <span class="text-[9px] font-extrabold uppercase tracking-widest text-teal-600 block mb-1">Proposed Resolution</span>
                                                            <div class="bg-teal-50 px-4 py-2 rounded-xl border border-teal-100 inline-block text-teal-800 font-bold text-[12px] shadow-sm">${styleMatrices(s.refined_term, 'display')}</div>
                                                        </div>
                                                    </div>
                                                    <p class="text-[12px] text-slate-700 leading-relaxed font-semibold mb-4 break-words">${s.advisory_message}</p>
                                                    
                                                    ${s.counter_consideration ? `
                                                    <div class="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6">
                                                        <p class="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1"><i class="fa-solid fa-scale-unbalanced mr-1"></i> Counter-Consideration</p>
                                                        <p class="text-[10px] text-amber-900 leading-relaxed font-medium">${s.counter_consideration}</p>
                                                    </div>` : ''}

                                                    <div class="mt-auto grid grid-cols-2 gap-3">
                                                        <button class="suggestion-switch-btn bg-slate-800 text-white text-[10px] font-extrabold py-3 rounded-2xl shadow-md hover:bg-slate-900 transition-all" data-term="${escapeHtml(s.refined_term)}">Replace Current</button>
                                                        <button class="suggestion-adapt-btn bg-teal-600 text-white text-[10px] font-extrabold py-3 rounded-2xl shadow-md hover:bg-teal-700 transition-all" data-term="${escapeHtml(s.refined_term)}">Add as Option</button>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    ${suggestions.length > 1 ? `
                                    <div class="flex justify-between items-center mt-2 px-2">
                                        <button class="carousel-prev flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition-colors" data-component="${key}">
                                            <i class="fa-solid fa-chevron-left"></i> Previous
                                        </button>
                                        <div class="text-xs font-bold text-slate-400 tracking-widest">
                                            <span class="carousel-current-page">1</span> of ${suggestions.length}
                                        </div>
                                        <button class="carousel-next flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition-colors" data-component="${key}">
                                            Next <i class="fa-solid fa-chevron-right"></i>
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                                ` : `<p class="text-xs text-slate-400 font-bold text-center italic py-4">No suggestions.</p>`)
                            }
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
      </div>
    `;

    footerContainer.innerHTML = `
        <div class="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
            <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <button id="sync-all-btn" class="bg-slate-50 border border-teal-100 hover:bg-teal-100 text-teal-600 px-8 py-5 rounded-3xl font-extrabold uppercase tracking-widest text-[11px] shadow-sm transition-all flex items-center justify-center gap-3">
                    <i class="fa-solid fa-arrows-rotate"></i> Update Research Question
                </button>
                <button id="score-clarity-btn-bottom" class="bg-slate-800 hover:bg-slate-900 text-white px-8 py-5 rounded-3xl font-extrabold uppercase tracking-widest text-[11px] shadow-lg transition-all flex items-center justify-center gap-3">
                    <i class="fa-solid fa-play"></i> Re-Analyse
                </button>
            </div>
            <button id="finalise-btn" class="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-12 py-5 rounded-3xl font-extrabold uppercase tracking-widest text-[11px] shadow-2xl transition-all">Review Final Output &raquo;</button>
        </div>
    `;

    const finaliseBtn = footerContainer.querySelector('#finalise-btn');
    if (finaliseBtn) finaliseBtn.onclick = () => jumpToStep('step-peco-workshop');

    const syncAllBtn = footerContainer.querySelector('#sync-all-btn');
    if (syncAllBtn) syncAllBtn.onclick = syncAllProtocol;

    const scoreBtnBottom = footerContainer.querySelector('#score-clarity-btn-bottom');
    if (scoreBtnBottom) scoreBtnBottom.onclick = () => runAnalysis(true);

    const refreshAuditBtn = dashboardContainer.querySelector('#refresh-audit-btn');
    if (refreshAuditBtn) refreshAuditBtn.onclick = () => runAnalysis(true);

    const viewExtractionLogBtn = dashboardContainer.querySelector('#view-extraction-log-btn');
    if (viewExtractionLogBtn) {
        viewExtractionLogBtn.onclick = () => {
            const metadata = appState.authorWorkflow.clarityData.extractionMetadata;
            if (!metadata) {
                ToastService.show("No parser log found. Run analysis first.", "info");
                return;
            }
            const content = `
                <div class="modal-body space-y-4">
                    <div>
                        <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Chain of Thought</h4>
                        <p class="text-sm text-slate-700 leading-relaxed break-words">${escapeHtml(metadata.chain_of_thought_reasoning || 'N/A')}</p>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Verbatim Source Quotes</h4>
                        <ul class="list-disc list-inside text-sm text-slate-700 break-words">
                            ${(metadata.verbatim_source_quotes || []).map(q => `<li class="break-words">${escapeHtml(q)}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Drift Detected</h4>
                        <p class="text-sm text-slate-700 break-words">${metadata.semantic_drift_detected ? '<span class="text-rose-600 font-bold">YES</span>' : '<span class="text-emerald-600 font-bold">NO</span>'}</p>
                    </div>
                    ${metadata.semantic_drift_detected ? `
                    <div>
                        <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Drift Reasoning</h4>
                        <p class="text-sm text-slate-700 leading-relaxed break-words">${escapeHtml(metadata.drift_reasoning || 'N/A')}</p>
                    </div>` : ''}
                </div>
            `;
            showModal('Zero-Shot Extraction Log', content, false);
        };
    }

    dashboardContainer.querySelectorAll('.carousel-prev').forEach(btn => {
        btn.onclick = () => {
            const comp = btn.dataset.component;
            const carousel = dashboardContainer.querySelector(`.suggestion-carousel[data-component="${comp}"]`);
            const slides = carousel.querySelectorAll('.suggestion-slide');
            let activeIdx = Array.from(slides).findIndex(s => s.classList.contains('active'));
            slides[activeIdx].classList.remove('active');
            activeIdx = (activeIdx - 1 + slides.length) % slides.length;
            slides[activeIdx].classList.add('active');
            const pageIndicator = carousel.querySelector('.carousel-current-page');
            if (pageIndicator) pageIndicator.textContent = activeIdx + 1;
        };
    });

    dashboardContainer.querySelectorAll('.carousel-next').forEach(btn => {
        btn.onclick = () => {
            const comp = btn.dataset.component;
            const carousel = dashboardContainer.querySelector(`.suggestion-carousel[data-component="${comp}"]`);
            const slides = carousel.querySelectorAll('.suggestion-slide');
            let activeIdx = Array.from(slides).findIndex(s => s.classList.contains('active'));
            slides[activeIdx].classList.remove('active');
            activeIdx = (activeIdx + 1) % slides.length;
            slides[activeIdx].classList.add('active');
            const pageIndicator = carousel.querySelector('.carousel-current-page');
            if (pageIndicator) pageIndicator.textContent = activeIdx + 1;
        };
    });

    dashboardContainer.querySelectorAll('.peco-dashboard-card').forEach(card => {
      const key = card.dataset.key;
      const editToggle = card.querySelector('.edit-peco-toggle-btn');
      const freezeBtn = card.querySelector('.freeze-component-btn');
      const editMode = card.querySelector('.peco-edit-mode');
      const displayMode = card.querySelector('.peco-display-mode');
      const pillContainer = card.querySelector('.peco-pill-container');
      const manualInput = card.querySelector('.pill-manual-input');
      const addManualBtn = card.querySelector('.add-manual-pill-btn');
      const saveBtn = card.querySelector('.save-peco-btn');

      let currentVal = peco[key] || '';

      const syncStateAndUI = () => {
        appState.authorWorkflow.liveCoAuthorData.peco[key] = currentVal;
        displayMode.innerHTML = formatPecoForDisplay(currentVal, false);
        pillContainer.innerHTML = formatPecoForDisplay(currentVal, true);
      };

      if (freezeBtn) {
          freezeBtn.onclick = () => {
              const currentState = appState.authorWorkflow.clarityData.frozenComponents[key];
              appState.authorWorkflow.clarityData.frozenComponents[key] = !currentState;
              renderResults(); // Re-render to update UI state
              if (!currentState) {
                  ToastService.show(`${PECO_MAP[key].label} component locked. Suggestions paused.`, 'success');
              }
          };
      }

      if (editToggle) {
          editToggle.onclick = (e) => {
              e.stopPropagation();
              const isNowEditing = card.classList.toggle('is-editing');
              editMode.style.display = isNowEditing ? 'block' : 'none';
              displayMode.style.display = isNowEditing ? 'none' : 'block';
              editToggle.innerHTML = isNowEditing ? 'View' : 'Edit';
          };
      }

      if (addManualBtn && manualInput) {
          addManualBtn.onclick = () => {
              let val = manualInput.value.trim();
              if (val) {
                  currentVal = currentVal ? `${currentVal} & ${val}` : val;
                  manualInput.value = '';
                  syncStateAndUI();
              }
          };
      }

      pillContainer.addEventListener('click', (e) => {
          if (e.target.classList.contains('peco-pill-remove')) {
              const andIdx = parseInt(e.target.dataset.and);
              const orIdx = parseInt(e.target.dataset.or);
              
              const andGroups = currentVal.split('&').map(s => s.trim()).filter(Boolean);
              if (andGroups[andIdx]) {
                  const orTerms = andGroups[andIdx].split(';').map(s => s.trim()).filter(Boolean);
                  orTerms.splice(orIdx, 1);
                  
                  if (orTerms.length === 0) {
                      andGroups.splice(andIdx, 1);
                  } else {
                      andGroups[andIdx] = orTerms.join(' ; ');
                  }
                  currentVal = andGroups.join(' & ');
                  syncStateAndUI();
              }
          }
      });

      card.querySelectorAll('.suggestion-switch-btn').forEach(btn => {
          btn.onclick = () => { currentVal = btn.dataset.term; syncStateAndUI(); };
      });

      card.querySelectorAll('.suggestion-adapt-btn').forEach(btn => {
          btn.onclick = () => { currentVal = smartAdaptTerm(currentVal, btn.dataset.term); syncStateAndUI(); };
      });

      if (saveBtn) {
          saveBtn.onclick = () => {
              appState.authorWorkflow.liveCoAuthorData.peco[key] = currentVal;
              editToggle.click(); 
          };
      }
    });

    dashboardContainer.querySelector('#toggle-gauge-btn').onclick = () => {
      appState.authorWorkflow.clarityData.isAnalysisCollapsed = !appState.authorWorkflow.clarityData.isAnalysisCollapsed;
      renderResults();
    };
  };

  scoreBtn.onclick = () => runAnalysis(true);
  
  // Auto-run analysis if there is a research question and no analysis yet
  if (appState.authorWorkflow.clarityData.researchQuestion && !appState.authorWorkflow.clarityData.analysis) {
      runAnalysis(false);
  } else if (appState.authorWorkflow.clarityData.analysis) {
      renderResults();
  }
}

/**
 * Global Export logic
 */
const downloadPecoJson = () => {
    const pecoSource = appState.authorWorkflow.pecoWorkshopData?.peco || appState.authorWorkflow.liveCoAuthorData.peco || {};
    const payload = {
        metadata: {
            tool: "PECO-Buddy",
            version: "Public Beta 0.1.1",
            timestamp: new Date().toISOString(),
            study_type: appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General'
        },
        protocol: {
            statement: appState.authorWorkflow.clarityData.researchQuestion,
            peco: pecoSource
        }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peco-protocol-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ToastService.show("Nanopublication JSON exported.", "success");
};

/**
 * Report Modal Generator
 */
const showNanopubReportModal = () => {
    const pecoSource = appState.authorWorkflow.pecoWorkshopData?.peco || appState.authorWorkflow.liveCoAuthorData.peco || {};
    const q = appState.authorWorkflow.clarityData.researchQuestion;
    
    const content = `
        <div class="modal-body p-8 space-y-8">
            <div id="report-content-area" class="bg-teal-50 p-6 rounded-2xl border border-teal-100">
                <h5 class="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 mb-4">Final Research Question</h5>
                <div class="bg-white p-6 rounded-xl border mb-6 shadow-sm">
                    <p class="text-sm font-bold text-slate-800 leading-relaxed italic">"${q}"</p>
                </div>
                
                <h5 class="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 mb-4">Final PECO Components</h5>
                <table id="report-peco-table" class="w-full text-xs bg-white rounded-xl border border-collapse overflow-hidden shadow-sm">
                    ${Object.keys(PECO_MAP).map(k => `
                        <tr class="border-b last:border-0">
                            <td class="p-4 font-extrabold uppercase text-teal-700 w-1/3 bg-slate-50/50">${PECO_MAP[k].label}</td>
                            <td class="p-4 text-slate-800 font-bold">${styleMatrices(pecoSource[k] || 'N/A', 'display')}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            
            <div class="space-y-4">
                <h5 class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Metadata & Verification Trace</h5>
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 border rounded-xl bg-slate-50">
                        <p class="text-[9px] font-bold text-slate-400 uppercase">Engine</p>
                        <p class="text-xs font-bold text-slate-700">PECO-Buddy Public Beta 0.1.1</p>
                    </div>
                    <div class="p-4 border rounded-xl bg-slate-50">
                        <p class="text-[9px] font-bold text-slate-400 uppercase">Timestamp</p>
                        <p class="text-xs font-bold text-slate-700">${new Date().toLocaleString('en-GB')}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    showModal('Final Transparency Report & Exports', content, null, (modal, close) => {
        const container = modal.querySelector('.modal-container, .report-modal-container');
        const footer = document.createElement('div');
        footer.className = 'modal-footer p-6 border-t flex flex-wrap justify-between items-center gap-4 bg-slate-50';
        footer.innerHTML = `
            <div class="flex gap-2">
                <button id="modal-copy-btn" class="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg border-none cursor-pointer hover:bg-teal-700 transition-all flex items-center gap-2">
                    <i class="fa-solid fa-copy"></i> Copy Table
                </button>
                <button id="modal-json-btn" class="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg border-none cursor-pointer hover:bg-slate-900 transition-all flex items-center gap-2">
                    <i class="fa-solid fa-file-code"></i> Export JSON
                </button>
            </div>
            <div class="flex gap-2">
                <button id="modal-pdf-btn" class="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border-none cursor-pointer">
                    <i class="fa-solid fa-file-pdf mr-1"></i> Save PDF
                </button>
                <button class="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-300 border-none cursor-pointer close-trigger">Close</button>
            </div>
        `;
        
        footer.querySelector('.close-trigger').onclick = close;
        footer.querySelector('#modal-copy-btn').onclick = () => copyTableToClipboard('#report-peco-table');
        footer.querySelector('#modal-json-btn').onclick = () => downloadPecoJson();
        footer.querySelector('#modal-pdf-btn').onclick = () => handleExport('.report-modal-container', 'pdf', 'peco-final-report.pdf');
        
        container.appendChild(footer);
    }, true);
};

function initPecoWorkshopView(container) {
  if (!container) return;
  const pecoSource = appState.authorWorkflow.pecoWorkshopData?.peco || appState.authorWorkflow.liveCoAuthorData.peco || {};
  const q = appState.authorWorkflow.clarityData.researchQuestion;
  const qDisplay = container.querySelector('#final-question-display');
  const pecoDisplay = container.querySelector('#final-peco-display');
  
  if (qDisplay) qDisplay.innerHTML = q ? `"${styleMatrices(q, 'display')}"` : 'N/A';
  if (pecoDisplay) {
      pecoDisplay.innerHTML = `
        <table class="w-full text-sm border-collapse rounded-[2rem] overflow-hidden border shadow-sm">
            ${Object.keys(PECO_MAP).map(key => `
                <tr class="border-b last:border-0">
                    <th class="p-6 bg-slate-50 text-left w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-3 py-1 rounded" style="background-color:${PECO_MAP[key].color}">${PECO_MAP[key].label}</span></th>
                    <td class="p-6 bg-white font-bold text-slate-800 text-lg">${styleMatrices(pecoSource[key] || '', 'display')}</td>
                </tr>
            `).join('')}
        </table>`;
  }

  const reportBtn = container.querySelector('#view-transparency-report-btn');
  if (reportBtn) reportBtn.onclick = () => showNanopubReportModal();

  const traceBtn = container.querySelector('#show-transparency-log-workshop-btn');
  if (traceBtn) traceBtn.onclick = () => showTransparencyLogModal();
}