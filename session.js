/**
 * Session autosave/resume: the working draft (scope, suggestions, question,
 * components, frozen flags, progress) survives a page refresh by persisting
 * to localStorage at every significant human decision point.
 *
 * Pure core (buildDraft / parseDraftPayload / applyDraft) with a thin guarded
 * storage adapter — the regression suite round-trips drafts in Node without
 * touching the browser.
 *
 * Transient diagnostics ride as non-enumerable properties, so a saved draft
 * serialises the work WITHOUT its validation flags — a resumed session
 * re-analyses rather than inheriting stale diagnostics.
 */
import { appState, safeStorage } from './state.js';

const DRAFT_KEY = 'peco_buddy_session_draft';

/**
 * Extracts the resumable draft from an authorWorkflow-shaped object.
 * Pure: JSON-serialisable output, no storage access.
 */
export const buildDraft = (workflow, nowIso = new Date().toISOString()) => {
    const clarity = workflow?.clarityData || {};
    const ideation = workflow?.ideationData || {};
    return {
        savedAt: nowIso,
        currentStep: workflow?.currentStep || 'step-ideation',
        completedSteps: [...(workflow?.completedSteps || [])],
        ideation: {
            scopeText: ideation.scopeText || '',
            selectedStudyType: ideation.selectedStudyType || null,
            generatedSuggestions: Array.isArray(ideation.generatedSuggestions) ? ideation.generatedSuggestions : []
        },
        clarity: {
            researchQuestion: clarity.researchQuestion || '',
            framing: clarity.framing || null,
            analysisDepth: clarity.analysisDepth || 'standard',
            isAnalysisCollapsed: !!clarity.isAnalysisCollapsed,
            frozenComponents: { ...(clarity.frozenComponents || {}) },
            analysis: clarity.analysis || null,
            validationFlags: clarity.validationFlags || []
        },
        peco: { ...(workflow?.liveCoAuthorData?.peco || {}) },
        workshopPeco: workflow?.pecoWorkshopData?.peco || null
    };
};

/**
 * Validates a raw persisted payload. Returns the draft object or null —
 * a corrupt or truncated draft NEVER restores garbage.
 */
export const parseDraftPayload = (raw) => {
    let parsed;
    try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {
        return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (!parsed.clarity || typeof parsed.clarity !== 'object') return null;
    if (typeof parsed.clarity.researchQuestion !== 'string') return null;
    if (!parsed.ideation || typeof parsed.ideation !== 'object') return null;
    if (typeof parsed.ideation.scopeText !== 'string') return null;
    return parsed;
};

/**
 * Applies a validated draft onto an authorWorkflow-shaped target. Defensive:
 * only known fields are copied, and nothing outside them. Never throws.
 */
export const applyDraft = (target, draft) => {
    const validated = parseDraftPayload(draft);
    if (!target || typeof target !== 'object' || !validated) {
        return { applied: false, reason: 'corrupt or missing draft' };
    }
    target.currentStep = typeof validated.currentStep === 'string' ? validated.currentStep : 'step-ideation';
    if (Array.isArray(validated.completedSteps)) target.completedSteps = validated.completedSteps.filter(s => typeof s === 'string');
    target.ideationData = target.ideationData || {};
    target.ideationData.scopeText = validated.ideation.scopeText || '';
    target.ideationData.selectedStudyType = validated.ideation.selectedStudyType || null;
    target.ideationData.generatedSuggestions = Array.isArray(validated.ideation.generatedSuggestions) ? validated.ideation.generatedSuggestions : [];
    target.clarityData = target.clarityData || {};
    target.clarityData.researchQuestion = validated.clarity.researchQuestion || '';
    target.clarityData.framing = validated.clarity.framing || null;
    target.clarityData.analysisDepth = validated.clarity.analysisDepth || 'standard';
    target.clarityData.isAnalysisCollapsed = !!validated.clarity.isAnalysisCollapsed;
    target.clarityData.frozenComponents = { ...(validated.clarity.frozenComponents || {}) };
    target.clarityData.analysis = validated.clarity.analysis || null;
    target.clarityData.validationFlags = validated.clarity.validationFlags || [];
    target.liveCoAuthorData = target.liveCoAuthorData || {};
    target.liveCoAuthorData.peco = { ...(validated.peco || {}) };
    target.pecoWorkshopData = validated.workshopPeco ? { peco: validated.workshopPeco } : null;
    return { applied: true, savedAt: validated.savedAt || null };
};

// Guarded storage — imports cleanly in Node (the regression runner).
const draftStore = safeStorage; // probed in state.js; memory fallback on file:// Safari / Node
const safeGet = () => { try { return draftStore.getItem(DRAFT_KEY); } catch (e) { return null; } };
const safeSet = (v) => { try { draftStore.setItem(DRAFT_KEY, v); } catch (e) { /* full or unavailable */ } };
const safeRemove = () => { try { draftStore.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } };

/** Live autosave: snapshot the current workflow state. */
export const saveDraft = () => {
    safeSet(JSON.stringify(buildDraft(appState.authorWorkflow)));
};

/** Live load: the validated draft, or null when none/corrupt. */
export const loadDraft = () => parseDraftPayload(safeGet());

/** Live resume: apply the persisted draft onto the live state. */
export const resumeDraft = () => applyDraft(appState.authorWorkflow, safeGet());

/** A fresh session discards the persisted draft. */
export const clearDraft = () => safeRemove();
