import { appState, dom } from '../state.js';
import { templates } from './templates.js';
import { ToastService } from '../components/toast.js';
import { PECO_MAP } from '../config.js';
import * as GeminiAPI from '../api/gemini.js';
import { runLocalNlpAnalysis } from './localNlp.js';
import { showModal } from '../components/modal.js';
import { formatPecoForDisplay, styleMatrices, showLoading, showError, copyTableToClipboard, escapeHtml, stripMetadataFromText, handleExport } from '../utils.js';
import { showTransparencyLogModal } from './transparencyLog.js';
import {
    validateIdeation, validateComponents, validateAdvisoryAnalysis, validateSynthesis,
    attachFlags, resolveIdeationRepair, resolveComponentRepair, resolveSynthesisRepair
} from '../validation.js';
import {
    anchorTermsLive, ontologyAnchors, anchorChipHtml, setUserOverride, selectCandidate,
    buildExportAnchors, splitPecoTerms, isAnchorableTerm, ANCHOR_STATES
} from '../terminology.js';
import { saveDraft } from '../session.js';

/**
 * Workflow progress states: a step is marked completed only by the human's
 * actual forward action (developing a question, finalising the protocol) —
 * orientation feedback, never automated steering. Progress autosaves with
 * the session draft.
 */
const markStepCompleted = (stepId) => {
    const cs = appState.authorWorkflow.completedSteps;
    if (!cs.includes(stepId)) {
        cs.push(stepId);
        document.querySelectorAll('.workflow-step').forEach(el => {
            el.classList.toggle('completed', cs.includes(el.id));
        });
        saveDraft();
    }
};

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
    stepEl.classList.toggle('completed', (appState.authorWorkflow.completedSteps || []).includes(stepId));

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
    // A disabled button always states WHY — no dead ends.
    const hint = container.querySelector('#generate-hint');
    if (hint) {
        hint.textContent = !hasText
            ? 'Type your research scope above to enable generation.'
            : (!appState.authorWorkflow.ideationData.selectedStudyType ? 'Pick a study methodology above to enable generation.' : '');
    }
  };

  scopeInput.value = appState.authorWorkflow.ideationData.scopeText || '';
  renderStudyTypes();
  updateUI();

  // Cmd/Ctrl+Enter generates — the author's hands never leave the keyboard.
  scopeInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !generateBtn.disabled) {
          generateBtn.click();
      }
  });

  scopeInput.oninput = () => {
    appState.authorWorkflow.ideationData.scopeText = scopeInput.value;
    updateUI();
  };

  container.querySelectorAll('.ideation-example-chip').forEach(chip => {
    chip.onclick = () => {
      scopeInput.value = chip.dataset.scope;
      appState.authorWorkflow.ideationData.scopeText = chip.dataset.scope;
      updateUI();
      scopeInput.focus();
    };
  });

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
    if (generateBtn.disabled) return; // re-entry guard: no racing generations
    generateBtn.disabled = true;
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
          // Rigor layer: deterministic checks, one targeted repair pass, then
          // surface whatever survives to the user instead of hiding it.
          let questions = result.questions;
          // Anchor FIRST: the repair pass (when needed) is grounded in the
          // verified descriptors instead of free drift.
          const ideationTerms = questions.flatMap(q => [q.population, q.exposure, q.comparison, q.outcome]).flatMap(splitPecoTerms);
          await anchorTermsLive(ideationTerms);
          const flagged = validateIdeation(questions, appState.authorWorkflow.ideationData.selectedStudyType.name);
          if (flagged.length > 0) {
              try {
                  const repaired = await GeminiAPI.callIdeationRepairAPI(
                      appState.authorWorkflow.ideationData.scopeText,
                      appState.authorWorkflow.ideationData.selectedStudyType.name,
                      questions,
                      flagged,
                      resultsContainer,
                      ontologyGroundingLine(questions.flatMap(q => [q.population, q.exposure, q.comparison, q.outcome]))
                  );
                  // Apply the repair ONLY if it re-validates clean; otherwise
                  // the ORIGINAL questions survive with their flags.
                  questions = resolveIdeationRepair(questions, repaired?.questions, appState.authorWorkflow.ideationData.selectedStudyType.name).questions;
              } catch (repairErr) {
                  console.warn('[Rigor] Ideation repair pass failed; keeping original questions.', repairErr);
              }
          }
          const residual = validateIdeation(questions, appState.authorWorkflow.ideationData.selectedStudyType.name);
          // Flags ride as a NON-ENUMERABLE property: visible to the UI, never
          // persisted by project saves or exports.
          residual.forEach(entry => { attachFlags(questions[entry.index], entry.flags); });
          if (residual.length > 0) {
              ToastService.show(`Rigor checks: ${residual.reduce((n, e) => n + e.flags.length, 0)} unresolved issue(s) flagged on the suggestions.`, 'info');
          }
          // Ontology anchoring happened before the repair pass; suggestions
          // render anchored by default, and the human overrides deliberately
          // where the ontology does not fit.
          appState.authorWorkflow.ideationData.generatedSuggestions = questions;
          saveDraft();
          setTimeout(() => renderSuggestions(), 500);
      }
    } catch(e) { 
        console.error("Ideation Generate Error:", e);
        showError(resultsContainer, e.message);
    } finally {
      updateUI(); // re-entry guard: restore the button's state from current inputs
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
        ${(q.validationFlags || []).length ? `
        <div class="flex flex-wrap gap-2 mb-6">
            ${q.validationFlags.map(f => `<span class="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg" title="${escapeHtml(f.detail)}"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${escapeHtml(f.code.replace(/_/g, ' '))}</span>`).join('')}
        </div>` : ''}
        
        <div class="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden mb-6">
            <table class="w-full text-xs text-left">
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.population.color}">Population</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.population || 'N/A', 'display')}${anchorChipsForField(q.population) ? `<div class="mt-1 flex flex-wrap gap-1">${anchorChipsForField(q.population)}</div>` : ''}</td>
                </tr>
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.exposure.color}">Exposure</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.exposure || 'N/A', 'display')}${anchorChipsForField(q.exposure) ? `<div class="mt-1 flex flex-wrap gap-1">${anchorChipsForField(q.exposure)}</div>` : ''}</td>
                </tr>
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.comparison.color}">Comparator</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.comparison || 'N/A', 'display')}${anchorChipsForField(q.comparison) ? `<div class="mt-1 flex flex-wrap gap-1">${anchorChipsForField(q.comparison)}</div>` : ''}</td>
                </tr>
                <tr class="border-b border-slate-100 last:border-0">
                    <td class="p-3 w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-1 rounded" style="background-color:${PECO_MAP.outcome.color}">Outcome</span></td>
                    <td class="p-3 font-bold text-slate-700">${styleMatrices(q.outcome || 'N/A', 'display')}${anchorChipsForField(q.outcome) ? `<div class="mt-1 flex flex-wrap gap-1">${anchorChipsForField(q.outcome)}</div>` : ''}</td>
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
        appState.authorWorkflow.clarityData.framing = q.framing || null;
        appState.authorWorkflow.clarityData.validationFlags = [];
        appState.authorWorkflow.clarityData.analysis = null; // Clear previous analysis to trigger auto-run
        appState.authorWorkflow.liveCoAuthorData.peco = { population: q.population || '', exposure: q.exposure || '', comparison: q.comparison || '', outcome: q.outcome || '' };
        markStepCompleted('step-ideation');
        saveDraft();
        jumpToStep('step-clarity');
      };
    });
    bindAnchorHandlers(resultsContainer, renderSuggestions);
  };

  if (appState.authorWorkflow.ideationData.generatedSuggestions.length > 0) {
      renderSuggestions();
  } else {
      // Empty state: a first-run screen that says where results will land,
      // not a silently blank container.
      resultsContainer.innerHTML = `
        <div class="bg-white/60 border border-dashed border-slate-200 rounded-[2rem] p-14 text-center">
            <i class="fa-solid fa-lightbulb text-3xl text-slate-300 mb-4"></i>
            <p class="text-sm font-bold text-slate-500">Your three suggested questions will appear here.</p>
            <p class="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Describe a scope, pick a methodology, generate</p>
        </div>
      `;
  }
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

/**
 * Matches advisory feedback entries to a PECO key. Providers label the
 * "component" field inconsistently ("Comparator", "Intervention", "P", etc.),
 * so match on key containment, single letters, and common stems.
 */
const PECO_COMPONENT_STEMS = {
    population: ['population', 'pop', 'subject', 'patient'],
    exposure: ['exposure', 'intervention', 'exp'],
    comparison: ['compar', 'control'],
    outcome: ['outcome', 'endpoint', 'result']
};
const PECO_SINGLE_LETTERS = { p: 'population', e: 'exposure', c: 'comparison', o: 'outcome' };

export const findComponentFeedback = (feedback, key) => {
    const norm = (s) => String(s || '').toLowerCase().trim();
    const stems = PECO_COMPONENT_STEMS[key] || [key];
    const list = Array.isArray(feedback) ? feedback : [];
    const matches = list.filter(f => {
        const c = norm(f.component);
        if (!c) return false;
        if (c.includes(key)) return true;
        if (PECO_SINGLE_LETTERS[c] === key) return true;
        return stems.some(stem => c.includes(stem));
    });
    if (matches.length === 0) return undefined;
    // Providers sometimes emit one feedback entry per advisory card with the
    // same component label; merge every matching entry so all cards reach
    // the carousel instead of only the first entry's suggestions.
    return matches.reduce((acc, f) => {
        const suggestions = Array.isArray(f.suggestions) ? f.suggestions : [];
        return { ...acc, suggestions: [...(acc.suggestions || []), ...suggestions] };
    }, { component: matches[0].component, suggestions: [] });
};

/**
 * Coerces provider advisory responses into the shape the dashboard expects.
 * Non-Gemini providers occasionally return "feedback" or "suggestions" as an
 * object keyed by component instead of an array; this normalises both so a
 * structurally loose reply still renders instead of crashing renderResults.
 */
/**
 * Terminology anchoring was an optional Advanced Functions layer. This
 * stripped PECO-only build ships without Advanced Functions, so the layer
 * is permanently inactive and the toolkit stays purely semantic text.
 */
const isAnchoringActive = () => false;

export const normalizeAdvisoryAnalysis = (analysis) => {    if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) return null;
    const toArray = (v) => {
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'object') return Object.values(v).flat().filter(Boolean);
        return [];
    };
    // Suggestions occasionally arrive as plain strings; keep them as cards
    // instead of filtering them out, which rendered as "No suggestions."
    const toSuggestion = (s) => {
        if (s && typeof s === 'object') return s;
        if (typeof s === 'string' && s.trim()) return { refined_term: s.trim(), advisory_message: '', counter_consideration: '' };
        return null;
    };
    // Feedback keyed by component ({ population: [...] }) carries no
    // "component" field after flattening; re-attach the key so the
    // component matcher can route the cards.
    let feedback = analysis.feedback;
    if (feedback && !Array.isArray(feedback) && typeof feedback === 'object') {
        feedback = Object.entries(feedback)
            .filter(([, v]) => v)
            .map(([component, suggestions]) => ({ component, suggestions }));
    }
    analysis.feedback = toArray(feedback)
        .filter(f => f && typeof f === 'object' && f.component)
        .map(f => ({ ...f, suggestions: toArray(f.suggestions).map(toSuggestion).filter(Boolean) }));
    analysis.strengths = toArray(analysis.strengths).filter(s => typeof s === 'string');
    analysis.missing_components = toArray(analysis.missing_components).filter(s => typeof s === 'string');
    return analysis;
};

/**
 * Ontology anchoring UI helpers. Chips render from the live anchor registry
 * (registry lookups are synchronous); interactions are bound after render.
 * The human decides: partial matches open a candidate picker, unanchored
 * terms offer a deliberate "use as free text" override.
 */
const anchorChipsForField = (fieldValue) => splitPecoTerms(fieldValue)
    .map(t => anchorChipHtml(ontologyAnchors.get(t)))
    .filter(Boolean)
    .join('');

const openAnchorCandidatePicker = (term) => {
    const entry = ontologyAnchors.get(term);
    const candidates = entry?.candidates || [];
    if (!candidates.length) return;
    const content = `
        <div class="modal-body p-8 space-y-4">
            <p class="text-sm text-slate-600">Ranked MeSH descriptor candidates for <span class="font-bold text-slate-800">"${escapeHtml(term)}"</span>. Pick the one this term means — or close and keep it unanchored.</p>
            <div class="space-y-2">
                ${candidates.map(c => `
                <button class="anchor-candidate-btn w-full text-left p-4 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-2xl transition-all flex items-center justify-between gap-4" data-code="${escapeHtml(c.code)}">
                    <span class="font-bold text-slate-700 text-sm">${escapeHtml(c.display)}</span>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 shrink-0">MeSH ${escapeHtml(c.code)}</span>
                </button>`).join('')}
            </div>
        </div>
    `;
    showModal('Pick an Ontology Anchor', content, false, (modal, closeModal) => {
        modal.querySelectorAll('.anchor-candidate-btn').forEach(b => {
            b.onclick = () => {
                const candidate = candidates.find(c => c.code === b.dataset.code);
                if (candidate) {
                    selectCandidate(ontologyAnchors, term, candidate);
                    ToastService.show(`"${term}" anchored to ${candidate.system} ${candidate.code}.`, 'success');
                }
                closeModal();
            };
        });
    });
};

const bindAnchorHandlers = (root, rerender = null) => {
    if (!root) return;
    root.querySelectorAll('.anchor-pick').forEach(btn => {
        btn.onclick = (e) => { e.preventDefault(); openAnchorCandidatePicker(btn.dataset.term); };
    });
    root.querySelectorAll('.anchor-override').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            setUserOverride(ontologyAnchors, btn.dataset.term);
            ToastService.show(`"${btn.dataset.term}" accepted as user-defined free text — provenance will show on exports.`, 'info');
            if (rerender) rerender();
        };
    });
};

/**
 * The anchor review queue: every term needing a decision (partial match,
 * unanchored) in ONE scannable modal. The human still acts on every item —
 * pick a descriptor or accept free text — the queue only removes the
 * navigation between decisions.
 */
const openAnchorReviewModal = (terms, onDone = null) => {
    const pending = [...new Set((terms || []).flatMap(splitPecoTerms))]
        .map(term => ({ term, entry: ontologyAnchors.get(term) }))
        .filter(({ entry }) => entry && (entry.state === ANCHOR_STATES.PARTIAL || entry.state === ANCHOR_STATES.UNANCHORED));
    if (!pending.length) return;

    const itemHtml = pending.map(({ term, entry }) => `
        <div class="p-5 bg-white border border-slate-200 rounded-2xl space-y-3" data-review-term="${escapeHtml(term)}">
            <div class="flex items-center justify-between gap-4">
                <span class="font-bold text-slate-800 text-sm">${escapeHtml(term)}</span>
                <span class="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-50 border-indigo-200 border px-2 py-1 rounded-lg">${entry.state === ANCHOR_STATES.PARTIAL ? 'candidates' : 'no match'}</span>
            </div>
            ${entry.note ? `<p class="text-[10px] text-slate-400 font-medium">${escapeHtml(entry.note)}</p>` : ''}
            ${(entry.candidates || []).map(c => `
                <button class="review-anchor-pick w-full text-left p-3 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl transition-all flex items-center justify-between gap-3" data-term="${escapeHtml(term)}" data-code="${escapeHtml(c.code)}" data-display="${escapeHtml(c.display)}" data-system="${escapeHtml(c.system)}" type="button">
                    <span class="text-xs font-bold text-slate-700">${escapeHtml(c.display)}</span>
                    <span class="text-[9px] font-extrabold uppercase tracking-widest text-teal-600 shrink-0">${escapeHtml(c.system)} ${escapeHtml(c.code)}</span>
                </button>`).join('')}
            <button class="review-anchor-override text-[10px] font-extrabold uppercase tracking-widest text-slate-500 border border-slate-200 rounded-xl px-4 py-2 hover:text-teal-600 hover:border-teal-300 transition-all" data-term="${escapeHtml(term)}" type="button"><i class="fa-solid fa-user-pen mr-1"></i>Keep as free text</button>
        </div>
    `).join('');

    showModal('Ontology Review — your call per term', `
        <div class="modal-body p-8 space-y-6">
            <p class="text-sm text-slate-600 leading-relaxed">${pending.length} term(s) need your decision: pick the descriptor each term means, or keep it as user-defined free text. Nothing is auto-anchored.</p>
            <div class="space-y-4">${itemHtml}</div>
        </div>
    `, null, (modal, closeModal) => {
        modal.querySelectorAll('.review-anchor-pick').forEach(btn => {
            btn.onclick = () => {
                selectCandidate(ontologyAnchors, btn.dataset.term, { system: btn.dataset.system, code: btn.dataset.code, display: btn.dataset.display });
                btn.closest('[data-review-term]').style.opacity = '0.45';
                btn.closest('[data-review-term]').querySelectorAll('button').forEach(b => { if (b !== btn) b.disabled = true; });
                ToastService.show(`"${btn.dataset.term}" anchored to ${btn.dataset.system} ${btn.dataset.code}.`, 'success');
            };
        });
        modal.querySelectorAll('.review-anchor-override').forEach(btn => {
            btn.onclick = () => {
                setUserOverride(ontologyAnchors, btn.dataset.term);
                btn.closest('[data-review-term]').style.opacity = '0.45';
                btn.closest('[data-review-term]').querySelectorAll('button').forEach(b => { if (b !== btn) b.disabled = true; });
                ToastService.show(`"${btn.dataset.term}" accepted as user-defined free text.`, 'info');
            };
        });
        const doneBtn = document.createElement('div');
        doneBtn.className = 'modal-footer p-6 border-t flex justify-end bg-slate-50';
        doneBtn.innerHTML = '<button class="px-6 py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm close-trigger" type="button">Done</button>';
        modal.querySelector('.modal-container')?.appendChild(doneBtn);
        doneBtn.querySelector('.close-trigger').onclick = () => {
            closeModal();
            if (onDone) onDone();
        };
    });
};

/**
 * Provenance summary for the final output: one quiet line stating where every
 * term in the protocol stands — the overview the human signs off on.
 */
const anchorProvenanceSummary = (fieldValues) => {
    const terms = [...new Set((fieldValues || []).flatMap(splitPecoTerms))].filter(isAnchorableTerm);
    if (!terms.length) return '';
    const states = terms.map(t => ontologyAnchors.get(t)?.state);
    const anchored = states.filter(s => s === ANCHOR_STATES.ANCHORED).length;
    const userDefined = states.filter(s => s === ANCHOR_STATES.USER_DEFINED).length;
    const needDecision = states.filter(s => s === ANCHOR_STATES.PARTIAL || s === ANCHOR_STATES.UNANCHORED).length;
    const unresolved = states.filter(s => !s).length;
    const parts = [];
    if (anchored) parts.push(`${anchored} anchored in MeSH`);
    if (userDefined) parts.push(`${userDefined} user-defined`);
    if (needDecision) parts.push(`${needDecision} awaiting your decision`);
    if (unresolved) parts.push(`${unresolved} not yet resolved`);
    if (!parts.length) return '';
    const cls = needDecision ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    return `<div class="flex"><span class="text-[10px] font-extrabold uppercase tracking-widest ${cls} border px-4 py-2 rounded-xl"><i class="fa-solid fa-fingerprint mr-2"></i>Provenance: ${parts.join(' · ')}</span></div>`;
};

/**
 * Grounding line for prompts: the verified descriptors already resolved for
 * the protocol's terms. The model picks from real descriptors instead of
 * inventing ontology terms.
 */
const ontologyGroundingLine = (terms) => {
    const descriptors = [...new Set((terms || []).flatMap(splitPecoTerms))]
        .map(t => ontologyAnchors.get(t))
        .filter(e => e && e.state === ANCHOR_STATES.ANCHORED && e.anchor)
        .map(e => `${e.anchor.display} [${e.anchor.system} ${e.anchor.code}]`);
    if (!descriptors.length) return '';
    return `- ONTOLOGY GROUNDING: The protocol's terms resolve to these verified descriptors: ${descriptors.join('; ')}. Prefer these descriptors where applicable; do NOT invent ontology terms that are not listed or stated in the text.`;
};

/**
 * Layer 6: statement-level rigor flags render as visible badges on the
 * affected element (the protocol statement display). The human decides.
 */
const statementFlagBadges = (flags) => {
    const stmtFlags = (flags || []).filter(f => f.component === 'statement');
    if (!stmtFlags.length) return '';
    return `
      <div class="flex flex-wrap gap-2 mt-3">
        ${stmtFlags.map(f => `<span class="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg" title="${escapeHtml(f.detail)}"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${escapeHtml(f.code.replace(/_/g, ' '))}</span>`).join('')}
      </div>`;
};

function initClarityView(container) {
  const dashboardContainer = container.querySelector('#clarity-dashboard-container');
  const footerContainer = container.querySelector('#clarity-footer-container');
  const questionDisplay = container.querySelector('#research-question-display');
  const scoreBtn = container.querySelector('#score-clarity-btn');
  const depthGroup = container.querySelector('#depth-selector-group');

  if (!dashboardContainer || !footerContainer || !questionDisplay || !scoreBtn) return;

  const refreshDisplay = () => {
      const q = appState.authorWorkflow.clarityData.researchQuestion;
      const badges = statementFlagBadges(appState.authorWorkflow.clarityData.validationFlags);
      questionDisplay.innerHTML = (q ? `"${styleMatrices(q, 'display')}"` : '<span class="text-slate-300 font-medium">Awaiting selection from Step 1...</span>') + badges;
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

          const result = runLocalNlpAnalysis(textToAnalyze);
          
          showProgressGauge(dashboardContainer, 'Finalising Advisory Feed...', 100, "Synthesis Complete");

          if (!appState.authorWorkflow.liveCoAuthorData.peco || !Object.values(appState.authorWorkflow.liveCoAuthorData.peco).some(v => !!v)) {
            appState.authorWorkflow.liveCoAuthorData.peco = result.peco;
          }
          const nlpAnalysis = normalizeAdvisoryAnalysis(result.analysis);
          if (!nlpAnalysis) { throw new Error("Advisory engine returned an unparseable structure."); }
          appState.authorWorkflow.clarityData.analysis = nlpAnalysis;

          // Rigor parity: the deterministic layer runs on BOTH engines. NLP
          // mode gets validation, anchoring, and surfacing — but no AI repair
          // pass (a repair is an AI call; sovereign mode stays sovereign).
          const nlpStudyType = appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General';
          const nlpFlags = validateComponents(result.peco, q, nlpStudyType, appState.authorWorkflow.clarityData.framing);
          attachFlags(result.peco, nlpFlags);
          appState.authorWorkflow.clarityData.validationFlags = nlpFlags;
          await anchorTermsLive([
              ...['population', 'exposure', 'comparison', 'outcome'].map(k => result.peco?.[k] || '').flatMap(splitPecoTerms),
              ...(nlpAnalysis.feedback || []).flatMap(f => (f.suggestions || []).map(s => s.refined_term))
          ]);
          if (nlpFlags.length > 0) {
              ToastService.show(`Rigor checks: ${nlpFlags.length} unresolved issue(s) flagged on the components.`, 'info');
          }
          renderResults();
          saveDraft();

      } else {
          // AI Engine (Gemini)
          showProgressGauge(dashboardContainer, isRefresh ? 'Re-analysing Logic Strategy...' : 'Analysing Logic Structure...', 15, "Extracting Semantic Domains");
          
          const config = { seed: appState.globalSeed };
          if (appState.authorWorkflow.clarityData.analysisDepth === 'standard') config.thinkingConfig = { thinkingBudget: 2048 };
          
          const contextLogic = await GeminiAPI.callContextLogicEngineAPI(q);
          showProgressGauge(dashboardContainer, 'Deconstructing Linguistic Syntax...', 50, "Scanning Context");
          const prelim = await GeminiAPI.callDomainIdentifierAPI(q, contextLogic);
          showProgressGauge(dashboardContainer, appState.matrixTagging === false ? 'Cross-Verifying Components...' : 'Mapping Matrix Intersections...', 75, "Verification Phase");
          // Ontology grounding: anchor the hand-over component terms first,
          // then constrain the extractor to the verified descriptors it can
          // actually see — the model picks from real descriptors instead of
          // inventing ontology terms.
          const handoverTerms = Object.values(appState.authorWorkflow.liveCoAuthorData.peco || {}).flatMap(splitPecoTerms);
          await anchorTermsLive(handoverTerms);
          const groundingLine = ontologyGroundingLine(Object.values(appState.authorWorkflow.liveCoAuthorData.peco || {}));
          const pecoResponse = await GeminiAPI.callSpecialistPecoExtractorAPI(prelim.domain, prelim, q, appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General', contextLogic, null, groundingLine);
          let peco = pecoResponse.extracted_data;
          appState.authorWorkflow.clarityData.extractionMetadata = pecoResponse.extraction_metadata;

          // Anchor the extracted components BEFORE the repair pass so the
          // repair is grounded in verified descriptors (cached terms cost
          // nothing; delimited terms anchor individually).
          await anchorTermsLive(['population', 'exposure', 'comparison', 'outcome'].map(k => peco[k] || '').flatMap(splitPecoTerms));

          // Rigor layer: deterministic component checks, ONE targeted repair
          // pass on the flagged fields, then surface residual flags to the UI.
          const studyTypeName = appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General';
          // The framing enum travels on the extracted payload (Layer 2);
          // the ideation-era framing is only a fallback.
          if (peco.framing) appState.authorWorkflow.clarityData.framing = peco.framing;
          const framing = peco.framing || appState.authorWorkflow.clarityData.framing;
          let rigorFlags = validateComponents(peco, q, studyTypeName, framing);
          if (rigorFlags.length > 0) {
              try {
                  showProgressGauge(dashboardContainer, 'Repairing Component Defects...', 90, "Rigor Layer");
                  const repaired = await GeminiAPI.callExtractionRepairAPI(q, studyTypeName, peco, rigorFlags, dashboardContainer, ontologyGroundingLine(['population', 'exposure', 'comparison', 'outcome'].map(k => peco[k] || '')));
                  // Apply the repair ONLY if it re-validates clean; otherwise
                  // the ORIGINAL components survive with their flags.
                  peco = resolveComponentRepair(peco, repaired, q, studyTypeName, framing).peco;
              } catch (repairErr) {
                  console.warn('[Rigor] Extraction repair pass failed; keeping original components.', repairErr);
              }
          }
          rigorFlags = validateComponents(peco, q, studyTypeName, peco.framing || framing);
          // Flags ride on the payload NON-ENUMERABLY: visible to the UI, never
          // persisted into liveCoAuthorData exports or project saves.
          attachFlags(peco, rigorFlags);
          appState.authorWorkflow.clarityData.validationFlags = rigorFlags;
          if (rigorFlags.length > 0) {
              ToastService.show(`Rigor checks: ${rigorFlags.length} unresolved issue(s) flagged on the components.`, 'info');
          }

          const analysis = await GeminiAPI.callQuestionQualityAPI(q, peco, dashboardContainer, config, studyTypeName);
          showProgressGauge(dashboardContainer, 'Finalising Advisory Feed...', 100, "Synthesis Complete");

          if (!appState.authorWorkflow.liveCoAuthorData.peco || !Object.values(appState.authorWorkflow.liveCoAuthorData.peco).some(v => !!v)) {
            appState.authorWorkflow.liveCoAuthorData.peco = peco;
          }
          const normalized = normalizeAdvisoryAnalysis(analysis);
          if (!normalized) { throw new Error("Advisory engine returned an unparseable structure."); }
          appState.authorWorkflow.clarityData.analysis = normalized;
          // Field expectations: feedback entries whose component label routes
          // to none of the four PECO keys cannot be displayed on a card —
          // surface them instead of silently dropping the suggestions.
          const advisoryFlags = validateAdvisoryAnalysis(normalized);
          if (advisoryFlags.length > 0) {
              appState.authorWorkflow.clarityData.validationFlags = [...rigorFlags, ...advisoryFlags];
              ToastService.show(`Rigor checks: ${advisoryFlags.length} advisory item(s) could not be matched to a component card.`, 'info');
          }
          // Ontology anchoring of every advisory refined term — suggestions
          // arrive anchored in a real descriptor or visibly unanchored.
          const refinedTerms = (normalized.feedback || []).flatMap(f => (f.suggestions || []).map(s => s.refined_term));
          await anchorTermsLive(refinedTerms);
          saveDraft();
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

  let protocolSynthesisRunning = false; // re-entry guard for the synthesiser

  const syncAllProtocol = async () => {
    if (protocolSynthesisRunning) return;
    protocolSynthesisRunning = true;
    try {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center';
        loadingOverlay.innerHTML = '<div class="loader"></div>';
        questionDisplay.style.position = 'relative';
        questionDisplay.appendChild(loadingOverlay);

        const currentQuestion = appState.authorWorkflow.clarityData.researchQuestion.trim() !== '' ? appState.authorWorkflow.clarityData.researchQuestion : null;
        // The user may have edited components since the last analysis — re-anchor
        // (cached terms cost nothing) so the synthesized protocol and its
        // export carry fresh anchors.
        const preTerms = Object.values(appState.authorWorkflow.liveCoAuthorData.peco || {}).flatMap(splitPecoTerms);
        await anchorTermsLive(preTerms);
        let synth = await GeminiAPI.callPecoSynthesizerAPI(appState.authorWorkflow.liveCoAuthorData.peco, currentQuestion, appState.authorWorkflow.clarityData.framing);
        await anchorTermsLive(Object.values(synth.naturalised_peco || {}).flatMap(splitPecoTerms));

        // Rigor layer: the synthesiser is an estimand-producing call — its
        // statement is validated deterministically, repaired ONCE, and any
        // residual flag is surfaced on the statement, never silently fixed.
        let synthFlags = validateSynthesis(synth);
        if (synthFlags.length > 0) {
            try {
                attachFlags(synth, synthFlags); // the repair prompt reads the flags
                const repaired = await GeminiAPI.callSynthesisRepairAPI(synth, currentQuestion, null, ontologyGroundingLine(Object.values(synth.naturalised_peco || {})));
                // Apply the repair ONLY if it re-validates clean; otherwise
                // the ORIGINAL statement survives with its flags.
                const resolution = resolveSynthesisRepair(synth, repaired);
                if (resolution.applied) synth = resolution.synth;
            } catch (repairErr) {
                console.warn('[Rigor] Synthesis repair pass failed; keeping the original statement.', repairErr);
            }
        }
        synthFlags = validateSynthesis(synth);
        // Flags ride as a NON-ENUMERABLE property: exports never persist them.
        attachFlags(synth, synthFlags);

        appState.authorWorkflow.clarityData.researchQuestion = synth.semantic_statement;
        if (synth.framing) appState.authorWorkflow.clarityData.framing = synth.framing;
        appState.authorWorkflow.pecoWorkshopData = { peco: synth.naturalised_peco };
        appState.authorWorkflow.clarityData.validationFlags = [
            ...(appState.authorWorkflow.clarityData.validationFlags || []).filter(f => f.component !== 'statement'),
            ...synthFlags
        ];

        refreshDisplay();
        saveDraft();
        if (synthFlags.length > 0) {
            ToastService.show(`Rigor checks: ${synthFlags.length} unresolved issue(s) flagged on the protocol statement.`, 'info');
        } else {
            ToastService.show("Protocol statement synthesized. Click 'Analyse' to refresh advisory.", "success");
        }
    } catch (err) {
        console.error("Synthesizer API Error:", err);
        ToastService.show("Update failed: " + err.message, "error");
    } finally {
        protocolSynthesisRunning = false;
        const overlay = questionDisplay.querySelector('.loader')?.parentElement;
        if(overlay) overlay.remove();
    }
  };


  const renderResults = () => {
    const { analysis, isAnalysisCollapsed, researchQuestion } = appState.authorWorkflow.clarityData;
    const peco = appState.authorWorkflow.liveCoAuthorData.peco || {};
    const frozenComponents = appState.authorWorkflow.clarityData.frozenComponents || {};
    const rigorFlags = appState.authorWorkflow.clarityData.validationFlags || [];
    const globalFlags = rigorFlags.filter(f => !f.component);

    // Anchor overview: the human sees at a glance how many terms await their
    // decision — one queue, one deliberate act per term.
    const allDashboardTerms = [
        ...Object.values(peco),
        ...(analysis?.feedback || []).flatMap(f => (f.suggestions || []).map(s => s.refined_term))
    ];
    const needsDecision = [...new Set(allDashboardTerms.flatMap(splitPecoTerms))]
        .filter(t => {
            const entry = ontologyAnchors.get(t);
            return entry && (entry.state === ANCHOR_STATES.PARTIAL || entry.state === ANCHOR_STATES.UNANCHORED);
        }).length;
    
    questionDisplay.innerHTML = `"${styleMatrices(researchQuestion, 'display')}"` + statementFlagBadges(rigorFlags);

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
                ${needsDecision > 0 ? `
                <button id="anchor-review-btn" class="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-200 uppercase tracking-widest hover:bg-indigo-100 transition-colors shadow-sm">
                    <i class="fa-solid fa-shuffle mr-2"></i> ${needsDecision} term(s) need your decision
                </button>` : ''}
            </div>
          </div>
          <button id="toggle-gauge-btn" class="text-xs font-bold text-teal-600 underline">${isAnalysisCollapsed ? 'View Cards' : 'Minimise'}</button>
        </div>

        <div class="analysis-collapsible ${isAnalysisCollapsed ? 'collapsed' : ''}">
            ${globalFlags.length ? `
            <div class="p-5 mb-10 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <i class="fa-solid fa-triangle-exclamation text-amber-600 mt-1"></i>
                <div class="space-y-2">
                    <p class="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">Rigor Checks</p>
                    ${globalFlags.map(f => `<p class="text-xs text-amber-900 leading-relaxed font-medium">${escapeHtml(f.detail)}</p>`).join('')}
                </div>
            </div>` : ''}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                ${Object.keys(PECO_MAP).map(key => {
                    const isFrozen = frozenComponents[key];
                    const componentFeedback = findComponentFeedback(analysis?.feedback, key);
                    const suggestions = Array.isArray(componentFeedback?.suggestions) ? componentFeedback.suggestions : [];
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

                        ${(() => {
                            const compFlags = rigorFlags.filter(f => f.component === key);
                            if (!compFlags.length) return '';
                            return `<div class="flex flex-wrap gap-2">${compFlags.map(f => `<span class="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg" title="${escapeHtml(f.detail)}"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${escapeHtml(f.code.replace(/_/g, ' '))}</span>`).join('')}</div>`;
                        })()}

                        <div class="peco-display-mode text-base text-slate-700 font-bold leading-relaxed min-h-[50px] break-words">
                            ${formatPecoForDisplay(currentValue, false)}
                            ${anchorChipsForField(currentValue) ? `<div class="mt-2 flex flex-wrap gap-1">${anchorChipsForField(currentValue)}</div>` : ''}
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
                                <div class="suggestion-stack space-y-4" data-component="${key}">
                                        ${suggestions.map((s, sIdx) => `
                                            <div class="suggestion-card p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col relative" data-index="${sIdx}">
                                                    <div class="mb-3 flex justify-between items-start">
                                                        <div>
                                                            <span class="text-[9px] font-extrabold uppercase tracking-widest text-teal-600 block mb-1">Suggested Refinement</span>
                                                            <div class="bg-teal-50 px-4 py-2 rounded-xl border border-teal-100 inline-block text-teal-800 font-bold text-[12px] shadow-sm">${styleMatrices(s.refined_term, 'display')}</div>
                                                            ${anchorChipsForField(s.refined_term) ? `<div class="mt-2 flex flex-wrap gap-1">${anchorChipsForField(s.refined_term)}</div>` : ''}
                                                        </div>
                                                    </div>
                                                    <p class="text-[12px] text-slate-700 leading-relaxed font-semibold mb-4 break-words">${s.advisory_message}</p>

                                                    ${s.counter_consideration ? `
                                                    <div class="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
                                                        <p class="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1"><i class="fa-solid fa-scale-unbalanced mr-1"></i> Counter-Consideration</p>
                                                        <p class="text-[10px] text-amber-900 leading-relaxed font-medium">${s.counter_consideration}</p>
                                                    </div>` : ''}

                                                    <div class="mt-auto grid grid-cols-2 gap-3">
                                                        <button class="suggestion-switch-btn bg-slate-800 text-white text-[10px] font-extrabold py-3 rounded-2xl shadow-md hover:bg-slate-900 transition-all" data-term="${escapeHtml(s.refined_term)}">Replace Current</button>
                                                        <button class="suggestion-adapt-btn bg-teal-600 text-white text-[10px] font-extrabold py-3 rounded-2xl shadow-md hover:bg-teal-700 transition-all" data-term="${escapeHtml(s.refined_term)}">Add as Option</button>
                                                    </div>
                                            </div>
                                        `).join('')}
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
    if (finaliseBtn) finaliseBtn.onclick = () => {
        markStepCompleted('step-clarity');
        jumpToStep('step-peco-workshop');
    };

    const syncAllBtn = footerContainer.querySelector('#sync-all-btn');
    if (syncAllBtn) syncAllBtn.onclick = syncAllProtocol;

    const scoreBtnBottom = footerContainer.querySelector('#score-clarity-btn-bottom');
    if (scoreBtnBottom) scoreBtnBottom.onclick = () => runAnalysis(true);

    const refreshAuditBtn = dashboardContainer.querySelector('#refresh-audit-btn');
    if (refreshAuditBtn) refreshAuditBtn.onclick = () => runAnalysis(true);

    const anchorReviewBtn = dashboardContainer.querySelector('#anchor-review-btn');
    if (anchorReviewBtn) {
        anchorReviewBtn.onclick = () => {
            const currentAnalysis = appState.authorWorkflow.clarityData.analysis;
            const terms = [
                ...Object.values(appState.authorWorkflow.liveCoAuthorData.peco || {}),
                ...((currentAnalysis?.feedback || []).flatMap(f => (f.suggestions || []).map(s => s.refined_term)))
            ];
            openAnchorReviewModal(terms, () => renderResults());
        };
    }

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

    // Advisory stack: every suggestion stays visible for scanning and
    // comparing — the human decides per card, no paging between them.
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
      // The human's judgment is reversible: the value before the last
      // Replace/Add/remove stays one click away until the change is saved.
      let undoValue = null;

      const syncStateAndUI = () => {
        appState.authorWorkflow.liveCoAuthorData.peco[key] = currentVal;
        const chips = anchorChipsForField(currentVal) ? `<div class="mt-2 flex flex-wrap gap-1">${anchorChipsForField(currentVal)}</div>` : '';
        const undoBtn = undoValue !== null
            ? `<button class="peco-undo-btn mt-3 text-[9px] font-extrabold uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 hover:border-teal-300 transition-all" type="button"><i class="fa-solid fa-rotate-left mr-1"></i>Undo last change</button>`
            : '';
        displayMode.innerHTML = `${formatPecoForDisplay(currentVal, false)}${chips}${undoBtn}`;
        pillContainer.innerHTML = formatPecoForDisplay(currentVal, true);
      };

      displayMode.addEventListener('click', (e) => {
          if (e.target.closest('.peco-undo-btn') && undoValue !== null) {
              currentVal = undoValue;
              undoValue = null;
              syncStateAndUI();
          }
      });

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
                  undoValue = currentVal;
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
                  undoValue = currentVal;
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
          btn.onclick = () => { undoValue = currentVal; currentVal = btn.dataset.term; syncStateAndUI(); };
      });

      card.querySelectorAll('.suggestion-adapt-btn').forEach(btn => {
          btn.onclick = () => { undoValue = currentVal; currentVal = smartAdaptTerm(currentVal, btn.dataset.term); syncStateAndUI(); };
      });

      if (saveBtn) {
          saveBtn.onclick = () => {
              appState.authorWorkflow.liveCoAuthorData.peco[key] = currentVal;
              undoValue = null; // committed — the change is now the baseline
              saveDraft();
              editToggle.click();
          };
      }

    });

    dashboardContainer.querySelector('#toggle-gauge-btn').onclick = () => {
      appState.authorWorkflow.clarityData.isAnalysisCollapsed = !appState.authorWorkflow.clarityData.isAnalysisCollapsed;
      renderResults();
    };

    bindAnchorHandlers(dashboardContainer, renderResults);
  };

  scoreBtn.onclick = () => runAnalysis(true);

  // Always render the dashboard skeleton and the action footer when there is
  // data (a question or PECO components), even when no advisory analysis has
  // run yet. Previously the footer (Update Research Question / Re-Analyse /
  // Review Final Output) only rendered after a SUCCESSFUL analysis, so a
  // failed auto-run (e.g. provider error after importing from Eligibility)
  // left Step 2 without any action buttons.
  const livePeco = appState.authorWorkflow.liveCoAuthorData.peco || {};
  const hasData = appState.authorWorkflow.clarityData.researchQuestion || Object.values(livePeco).some(v => !!v);

  if (hasData) {
      renderResults();
      if (appState.authorWorkflow.clarityData.analysis) {
          // Advisory already exists; do not re-run provider calls on re-entry.
      } else if (appState.authorWorkflow.clarityData.skipAutoAnalysis) {
          appState.authorWorkflow.clarityData.skipAutoAnalysis = false;
      } else if (appState.authorWorkflow.clarityData.researchQuestion) {
          runAnalysis(false);
      }
  }
}

/**
 * Global Export logic
 */
const downloadPecoJson = () => {
    const pecoSource = appState.authorWorkflow.pecoWorkshopData?.peco || appState.authorWorkflow.liveCoAuthorData.peco || {};
    // Anchors are durable protocol metadata: the export carries each term's
    // ontology resolution (or its explicit user-defined provenance).
    const exportTerms = ['population', 'exposure', 'comparison', 'outcome']
        .map(k => pecoSource[k] || '')
        .flatMap(splitPecoTerms);
    const payload = {
        metadata: {
            tool: "PECO-Buddy",
            version: "PECO-Buddy Closed Pilot Alpha 0.1.0",
            timestamp: new Date().toISOString(),
            study_type: appState.authorWorkflow.ideationData.selectedStudyType?.name || 'General'
        },
        protocol: {
            statement: appState.authorWorkflow.clarityData.researchQuestion,
            peco: pecoSource
        },
        ontology_anchors: buildExportAnchors(exportTerms, ontologyAnchors)
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
                        <p class="text-xs font-bold text-slate-700">PECO-Buddy Closed Pilot Alpha 0.1.0</p>
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
      const fieldValues = Object.keys(PECO_MAP).map(key => pecoSource[key] || '');
      pecoDisplay.innerHTML = `
        ${anchorProvenanceSummary(fieldValues) ? `<div class="mb-4">${anchorProvenanceSummary(fieldValues)}</div>` : ''}
        <table class="w-full text-sm border-collapse rounded-[2rem] overflow-hidden border shadow-sm">
            ${Object.keys(PECO_MAP).map(key => {
                const value = pecoSource[key] || '';
                const chips = anchorChipsForField(value);
                return `
                <tr class="border-b last:border-0">
                    <th class="p-6 bg-slate-50 text-left w-1/4"><span class="text-[10px] font-extrabold uppercase tracking-widest text-white px-3 py-1 rounded" style="background-color:${PECO_MAP[key].color}">${PECO_MAP[key].label}</span></th>
                    <td class="p-6 bg-white font-bold text-slate-800 text-lg">${styleMatrices(value, 'display')}${chips ? `<div class="mt-2 flex flex-wrap gap-1">${chips}</div>` : ''}</td>
                </tr>`;
            }).join('')}
        </table>`;
      // Provenance interactions stay live on the final output.
      bindAnchorHandlers(pecoDisplay, () => initPecoWorkshopView(container));
  }

  const reportBtn = container.querySelector('#view-transparency-report-btn');
  if (reportBtn) reportBtn.onclick = () => showNanopubReportModal();

  const traceBtn = container.querySelector('#show-transparency-log-workshop-btn');
  if (traceBtn) traceBtn.onclick = () => showTransparencyLogModal();
}
