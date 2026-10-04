/**
 * Deterministic rigor layer. Pure functions — no DOM, no provider calls, no
 * side effects — so they run identically in the browser and in the Node
 * regression suite. Every check corresponds to a real, previously observed
 * agent failure:
 *   - framing_conflict ......... association + comparison language in one question
 *   - comparator_timepoint ..... "baseline conditions" is a time point, not a group
 *   - comparator_vague ......... experimental design without a named control group
 *   - quantifier_leakage ....... degree words lost from all components
 *   - quantile_in_exposure ..... quartile language folded into the exposure
 *   - matrix_placeholder_echo .. the model echoing prompt placeholders ("connector")
 *   - comparator_threshold ....... "< 2 µg/dL" named as the control group
 *   - comparator_quantile ....... "lower quartiles" as comparator (non dose_response)
 *   - dose_in_entity ............ dosing value left inside a core entity field
 *   - advisory_unroutable ....... feedback entry whose component label routes nowhere
 */

export const DEGREE_WORDS = ['elevated', 'higher', 'lower', 'increased', 'decreased', 'reduced', 'greater', 'enhanced', 'highest', 'lowest', 'high', 'low'];
export const MATRIX_PLACEHOLDER_WORDS = ['connector', 'preposition', 'term'];
export const EXPERIMENTAL_DESIGNS = ['rct', 'randomi', 'animal', 'in vitro'];

/**
 * Layer 2 commitment: the single source of truth for the estimand framing
 * enum. Every estimand schema (ideation, extraction, synthesis, repairs)
 * consumes exactly this list.
 */
export const ESTIMAND_FRAMING_VALUES = ['group_contrast', 'dose_response', 'association', 'descriptive'];

const CONTROL_TERMS = ['control', 'vehicle', 'placebo', 'unexposed', 'untreated', 'sham', 'saline', 'standard of care', 'referent'];
const TIMEPOINT_TERMS = ['baseline', 'pre-treatment', 'pretreatment', 'pre-exposure'];
const QUANTILE_TERMS = ['quartile', 'quintile', 'tertile', 'percentile'];
const MISSING_SENTINELS = ['not specified', 'not required', 'n/a'];

// "< 2 µg/dL", "less than 5 ppm", or any numeric value with a dose/mass unit.
const THRESHOLD_PATTERN = /(?:<|>|≤|≥)\s*\d|\b(?:less than|greater than|below|above|at least|at most|exceed(?:ing|s)?)\s+\d|\d+(?:\.\d+)?\s*(?:µg|μg|ug|mg|kg|µl|ul|ml|ppm|ppb)\b/i;
// "measured at 24 months", "at 6 weeks of age", "follow-up at 12 months".
const TEMPORAL_POINT_PATTERN = /\bat\s+\d+(?:\.\d+)?\s*(?:h|hr|hour|day|week|month|year)s?\b/i;
// "Deltamethrin 5mg/kg/day" — a dosing value left inside a core entity field.
const DOSE_PATTERN = /\d+(?:\.\d+)?\s*(?:mg|µg|μg|ug|kg)\b/i;

/**
 * Field-expectation routing: maps a provider's component label to one of the
 * four PECO keys, or null when the label matches none. Pure; the advisory
 * normaliser and the unroutable-label validator both consume it so the
 * tolerated variants ("Comparator", "P", "endpoint") stay consistent.
 */
export const pecoKeyForLabel = (label) => {
    const c = String(label ?? '').toLowerCase().trim();
    if (!c) return null;
    if (c.includes('population') || c.includes('pop') || c.includes('subject') || c.includes('patient')) return 'population';
    if (c.includes('exposure') || c.includes('intervention')) return 'exposure';
    if (c.includes('compar') || c.includes('control')) return 'comparison';
    if (c.includes('outcome') || c.includes('endpoint') || c.includes('result')) return 'outcome';
    return ({ p: 'population', e: 'exposure', c: 'comparison', o: 'outcome' })[c] || null;
};

const isMissing = (value) => {
    const v = String(value ?? '').toLowerCase().trim();
    return !v || MISSING_SENTINELS.includes(v);
};

/**
 * Detects association vs comparison language in a question. A question that
 * carries both has no single estimand and is flagged as a conflict.
 */
export const detectFraming = (text) => {
    const t = String(text ?? '').toLowerCase();
    const hasAssociation = /\b(correlat\w*|associat\w*|relationship|related to)\b/.test(t);
    const hasContrast = /\b(compared (?:with|to)|versus|vs\.?|relative to)\b/.test(t);
    return { hasAssociation, hasContrast, conflict: hasAssociation && hasContrast };
};

/**
 * Degree qualifiers ("elevated", "higher") present in the question but absent
 * from every component and quantifier silently change the study's meaning.
 */
export const checkQuantifierLeakage = (question, componentStrings) => {
    const haystack = ' ' + componentStrings.filter(Boolean).map(s => String(s).toLowerCase()).join(' ') + ' ';
    const qTokens = new Set(String(question ?? '').toLowerCase().match(/[a-z]+/g) || []);
    const lost = DEGREE_WORDS.filter(w => qTokens.has(w) && !haystack.includes(` ${w} `));
    if (!lost.length) return [];
    return [{
        code: 'quantifier_leakage',
        detail: `Degree qualifiers from the question are missing from all components and quantifiers: ${lost.map(w => `"${w}"`).join(', ')}.`
    }];
};

/**
 * "Baseline" is a measurement time point, not a comparator group, and an
 * experimental design needs a named control.
 */
export const checkComparator = (comparison, studyType, framing = null) => {
    if (isMissing(comparison)) return [];
    const c = String(comparison).toLowerCase();
    const flags = [];
    const hasControl = CONTROL_TERMS.some(t => c.includes(t));
    const hasTimepoint = TIMEPOINT_TERMS.some(t => c.includes(t)) || TEMPORAL_POINT_PATTERN.test(c);
    const label = String(studyType ?? '').toLowerCase();
    const isExperimental = EXPERIMENTAL_DESIGNS.some(m => label.includes(m));
    if (hasTimepoint && !hasControl) {
        flags.push({
            code: 'comparator_timepoint',
            component: 'comparison',
            detail: `"${comparison}" describes a measurement time point, not a comparator group.`
        });
    }
    // A measurement threshold ("< 2 µg/dL") names a level, not a group — unless
    // it qualifies a real control ("unexposed controls (BLL < 5 µg/dL)").
    if (!hasControl && THRESHOLD_PATTERN.test(c)) {
        flags.push({
            code: 'comparator_threshold',
            component: 'comparison',
            detail: `"${comparison}" is a measurement threshold, not a comparator group. Name the group the threshold defines (e.g. "children with BLL < 2 µg/dL") or a real control.`
        });
    }
    // Degree qualifiers ("lower quartiles") are not control groups. A
    // dose_response framing legitimately contrasts exposure-level quantiles,
    // so the quantile axis is allowed there (and only there).
    if (String(framing ?? '').toLowerCase() !== 'dose_response' && QUANTILE_TERMS.some(t => new RegExp(`\\b${t}`).test(c)) && !hasControl) {
        flags.push({
            code: 'comparator_quantile',
            component: 'comparison',
            detail: `"${comparison}" is a degree qualifier, not a comparator group. For a between-group framing, name a real control; quantile contrasts belong to a dose_response framing.`
        });
    }
    if (isExperimental && !hasControl) {
        flags.push({
            code: 'comparator_vague',
            component: 'comparison',
            detail: `For ${studyType} designs the comparator must name a control group (e.g. vehicle control, untreated). Got: "${comparison}".`
        });
    }
    return flags;
};

/**
 * Doses belong in the quantifier field. A dosing value left embedded in a
 * core entity field ("Deltamethrin 5mg/kg/day") silently splits the estimand
 * between the entity and its quantifier. A threshold qualifying a real
 * control group is legitimate and not flagged.
 */
export const checkDoseInEntity = (comps) => {
    const flags = [];
    for (const [key, value] of Object.entries(comps || {})) {
        if (isMissing(value)) continue;
        if (key === 'comparison' && CONTROL_TERMS.some(t => String(value).toLowerCase().includes(t))) continue;
        if (DOSE_PATTERN.test(String(value))) {
            flags.push({
                code: 'dose_in_entity',
                component: key,
                detail: `"${value}" embeds a dosing value in the core entity field. Move the dose into "quantifiers_and_modifiers" and keep only the entity (e.g. "Deltamethrin").`
            });
        }
    }
    return flags;
};

/**
 * Quantile splits define the comparison axis (PW feedback: "the quartile is
 * not part of the exposure") and never belong inside the exposure component.
 */
export const checkQuantileInExposure = (exposure) => {
    if (isMissing(exposure)) return [];
    const e = String(exposure).toLowerCase();
    if (!QUANTILE_TERMS.some(t => new RegExp(`\\b${t}\\b`).test(e))) return [];
    return [{
        code: 'quantile_in_exposure',
        component: 'exposure',
        detail: `Quantile language ("${QUANTILE_TERMS.find(t => e.includes(t))}") defines the comparison axis — it is not part of the exposure.`
    }];
};

/**
 * Models occasionally echo the prompt's syntax placeholders verbatim
 * ({matrix:connector:term} → the literal word "connector" in output).
 */
export const checkEcho = (fields) => {
    const flags = [];
    for (const [key, value] of Object.entries(fields || {})) {
        const s = String(value ?? '');
        if (/\{matrix:(connector|preposition|term)[:}]/i.test(s)) {
            flags.push({
                code: 'matrix_placeholder_echo',
                component: key,
                detail: `Prompt placeholder echoed in "${key}" instead of real content.`
            });
        } else if (MATRIX_PLACEHOLDER_WORDS.includes(s.trim().toLowerCase())) {
            flags.push({
                code: 'matrix_placeholder_echo',
                component: key,
                detail: `"${key}" contains only the placeholder word "${s.trim()}".`
            });
        }
    }
    return flags;
};

/**
 * An association-framed question must not carry a comparator (PW feedback:
 * "This should not have a comparator (it is an association question)").
 */
export const checkAssociationComparator = (framing, comparison) => {
    if (String(framing ?? '').toLowerCase() !== 'association' || isMissing(comparison)) return [];
    return [{
        code: 'comparator_unexpected_association',
        component: 'comparison',
        detail: 'An association-framed question must not carry a comparator; comparison should be "Not Required".'
    }];
};

const componentFields = (obj) => ({
    population: obj?.population,
    exposure: obj?.exposure,
    comparison: obj?.comparison,
    outcome: obj?.outcome
});

/**
 * Validates one ideated question (full_statement + components) against all
 * deterministic checks. Returns an array of flags; empty means clean.
 */
export const validateQuestion = (question, studyType) => {
    if (!question) return [];
    const flags = [];
    if (detectFraming(question.full_statement).conflict) {
        flags.push({
            code: 'framing_conflict',
            detail: 'The question mixes association language ("correlate", "associated with") with comparison language ("compared with", "versus"). It must commit to one framing.'
        });
    }
    const comps = componentFields(question);
    flags.push(...checkComparator(comps.comparison, studyType, question.framing));
    flags.push(...checkAssociationComparator(question.framing, comps.comparison));
    flags.push(...checkEcho(comps));
    flags.push(...checkQuantileInExposure(comps.exposure));
    flags.push(...checkQuantifierLeakage(question.full_statement, Object.values(comps)));
    return flags;
};

/**
 * Validates extracted PECO components against the source question and the
 * design expectations for the study type.
 */
export const validateComponents = (peco, question, studyType, framing = null) => {
    if (!peco) return [];
    const effectiveFraming = framing || peco.framing || null;
    const flags = [];
    if (detectFraming(question).conflict) {
        flags.push({
            code: 'framing_conflict',
            detail: 'The question mixes association language with comparison language — the components cannot express a single estimand.'
        });
    }
    const comps = componentFields(peco);
    flags.push(...checkComparator(comps.comparison, studyType, effectiveFraming));
    flags.push(...checkAssociationComparator(effectiveFraming, comps.comparison));
    flags.push(...checkEcho(comps));
    flags.push(...checkQuantileInExposure(comps.exposure));
    // The quantifier field exists on extracted components: doses embedded in
    // the core entities are leakage from it (ideation output has no quantifier
    // field, so the check is extraction-only).
    flags.push(...checkDoseInEntity(comps));
    const quantifierStrings = Object.values(peco.quantifiers_and_modifiers || {});
    flags.push(...checkQuantifierLeakage(question, [...Object.values(comps), ...quantifierStrings]));
    return flags;
};

/**
 * Validates an ideation result; returns [{ index, flags }] for the questions
 * that carry at least one flag.
 */
export const validateIdeation = (questions, studyType) =>
    (questions || []).map((q, index) => ({ index, flags: validateQuestion(q, studyType) }))
        .filter(entry => entry.flags.length > 0);

/**
 * Validates an advisory (audit) response. Field expectations: every feedback
 * entry's "component" label must route to exactly one of
 * population|exposure|comparison|outcome — anything else was previously
 * dropped silently by the card router and never reached the user.
 */
export const validateAdvisoryAnalysis = (analysis) => {
    const feedback = Array.isArray(analysis?.feedback) ? analysis.feedback : [];
    const flags = [];
    feedback.forEach((entry, i) => {
        const key = pecoKeyForLabel(entry?.component);
        if (!key) {
            flags.push({
                code: 'advisory_unroutable_component',
                component: null,
                detail: `Advisory entry ${i + 1} carries the component label "${entry?.component ?? ''}", which matches none of population|exposure|comparison|outcome. Its suggestions cannot be displayed on a card.`
            });
        }
    });
    return flags;
};

/**
 * Validates a synthesis result (the rewritten protocol statement). The
 * synthesiser is an estimand-producing call: its statement can reintroduce a
 * framing conflict or echo a prompt placeholder straight into the stored
 * research question.
 */
export const validateSynthesis = (synth) => {
    if (!synth || typeof synth !== 'object') return [];
    const flags = [];
    if (detectFraming(synth.semantic_statement).conflict) {
        flags.push({
            code: 'framing_conflict',
            component: 'statement',
            detail: 'The synthesised statement mixes association language with comparison language — it must commit to one framing.'
        });
    }
    flags.push(...checkEcho({ statement: synth.semantic_statement, ...(synth.naturalised_peco || {}) }));
    return flags;
};

/**
 * Layer 6: flags ride on the payload as a NON-ENUMERABLE property so project
 * saves/exports (JSON.stringify) never persist them, while the UI reads them
 * directly off the affected object.
 */
export const attachFlags = (target, flags) => {
    if (!target || typeof target !== 'object') return target;
    Object.defineProperty(target, 'validationFlags', {
        value: Array.isArray(flags) ? flags : [],
        enumerable: false,
        configurable: true,
        writable: true
    });
    return target;
};

/**
 * Layer 3 hard bound: a repair is applied ONLY if the repaired payload
 * re-validates clean; otherwise the ORIGINAL survives with its flags.
 * Pure resolvers keep that decision testable in the regression suite.
 */
export const resolveIdeationRepair = (originalQuestions, repairedQuestions, studyType) => {
    if (!Array.isArray(repairedQuestions) || repairedQuestions.length !== (originalQuestions || []).length) {
        return { questions: originalQuestions, applied: false };
    }
    if (validateIdeation(repairedQuestions, studyType).length > 0) {
        return { questions: originalQuestions, applied: false };
    }
    return { questions: repairedQuestions, applied: true };
};

export const resolveComponentRepair = (originalPeco, repairedPeco, question, studyType, framing = null) => {
    if (!repairedPeco || typeof repairedPeco !== 'object' || Array.isArray(repairedPeco)) {
        return { peco: originalPeco, applied: false };
    }
    if (validateComponents(repairedPeco, question, studyType, framing).length > 0) {
        return { peco: originalPeco, applied: false };
    }
    return { peco: repairedPeco, applied: true };
};

export const resolveSynthesisRepair = (originalSynth, repairedSynth) => {
    if (!repairedSynth || typeof repairedSynth !== 'object'
        || typeof repairedSynth.semantic_statement !== 'string'
        || !repairedSynth.naturalised_peco || typeof repairedSynth.naturalised_peco !== 'object') {
        return { synth: originalSynth, applied: false };
    }
    if (validateSynthesis(repairedSynth).length > 0) {
        return { synth: originalSynth, applied: false };
    }
    return { synth: repairedSynth, applied: true };
};
