import { GoogleGenAI, Type } from "@google/genai";
import { appState } from '../state.js';
import { extractJsonFromString, escapeHtml, stripMatrixTags } from '../utils.js';
import { showModal } from '../components/modal.js';
import { ActivityBus } from '../components/activity.js';
import { ESTIMAND_FRAMING_VALUES } from '../validation.js';

const FRAMING_VALUES = ESTIMAND_FRAMING_VALUES;

/**
 * When Matrix Tagging is off, providers are instructed to write plain text —
 * but models do not always comply. Enforce the setting at the response
 * boundary: strip any {matrix:...} tags from strings anywhere in the
 * (possibly nested) response so they never reach stored state or exports.
 */
const sanitizeMatrixTagsDeep = (value) => {
    if (typeof value === 'string') return stripMatrixTags(value);
    if (Array.isArray(value)) return value.map(sanitizeMatrixTagsDeep);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeMatrixTagsDeep(v)]));
    }
    return value;
};

const displayErrorModal = (error, statusContainer) => {
    if (statusContainer) {
        statusContainer.innerHTML = `<div class="p-4 text-rose-600 text-sm font-bold text-center">Error occurred. Check popup for details.</div>`;
    }
    const message = (error.message || "").toLowerCase();
    
    let tip = "Unknown error occurred.";
    if (message.includes("output truncated")) {
        tip = "The model's response hit the token limit before the JSON could complete. The retry engine escalates the token budget automatically; if it still fails, use a model with a larger output capacity or reduce the input length.";
    } else if (message.includes("did not respond") || message.includes("could not reach")) {
        tip = "The local AI endpoint did not answer. Ensure Ollama or LM Studio is running, the model is pulled/loaded, and the Base URL in Settings points at it.";
    } else if (message.includes("failed to parse") || message.includes("failed to extract json")) {
        tip = "The AI generated response text with conversational wrappers or invalid syntax. The 0.1.0 multi-pass deserializer automatically retries.";
    } else if (message.includes("safety") || message.includes("blocked") || message.includes("recitation") || message.includes("other")) {
        tip = "A cloud safety railguard triggered on standard toxicological/hazard terminology (e.g., lethal dose, acute hazard). To prevent false-positive censorship on hazard descriptors, configure Local/Sovereign AI (Ollama or LM Studio) in Settings.";
    } else if (message.includes("429") || message.includes("quota") || message.includes("rate limit") || message.includes("throttled")) {
        tip = "Upstream provider rate limiting or botnet mitigation encountered. Wait a few moments or switch to Local/Sovereign AI (Ollama) in Settings for zero-throttle private execution.";
    } else if (message.includes("4xx") || message.includes("401") || message.includes("403") || message.includes("api key") || message.includes("api-key")) {
        tip = "There seems to be an issue with your API key or permissions (Client error - 4xx). Check your settings and try again.";
    } else if (message.includes("5xx") || message.includes("500") || message.includes("502") || message.includes("503")) {
        tip = "The AI provider's server is currently failing (Server fault - 5xx). Try again in a few moments.";
    } else if (message.includes("empty response")) {
        tip = "The AI returned an empty response. Try running the function again or check provider status.";
    }

    const content = `
        <div class="modal-body space-y-4">
            <div class="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex flex-col items-center text-center">
                <i class="fa-solid fa-triangle-exclamation text-4xl text-rose-500 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-800 mb-2">Operation Failed</h3>
                <p class="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">${escapeHtml(error.message)}</p>
                <div class="w-full bg-white p-4 rounded-xl border border-rose-100 shadow-sm text-slate-700 text-sm font-medium">
                    <span class="font-bold text-rose-700 block mb-1">Diagnostic Tip:</span>
                    ${tip}
                </div>
            </div>
        </div>
    `;
    showModal('System Exception', content, false);
};

/**
 * Serialises the requested response schema into the prompt for providers
 * without native schema enforcement (Mistral, OpenAI, Perplexity, Anthropic,
 * local endpoints). Ported from the stand-alone cohort-criteria-analyzer:
 * without it these providers never learn the required JSON shape and freely
 * guess the structure, which breaks downstream rendering.
 */
const describeSchema = (schema) => {
    if (!schema) return "";
    try {
        return `\n\nCRITICAL JSON SCHEMA SPECIFICATION:
You MUST respond with a valid JSON object strictly complying with the following schema:
${JSON.stringify(schema, null, 2)}
Output ONLY the raw valid JSON object. Do not include markdown code block tags, conversational preface, or trailing commentary.`;
    } catch (_) {
        return "";
    }
};

/**
 * Matrix tagging is a user-controllable semantic formatting layer (Settings).
 * When the toggle is off, providers are told to write plain descriptive text
 * instead of {matrix:...} tags.
 */
const matrixSyntaxLine = () => appState.matrixTagging === false
    ? 'CRITICAL SYNTAX: Write plain descriptive text. Do NOT use any {matrix:...} tagging syntax.'
    : 'CRITICAL SYNTAX: Identify measurement sites/matrices and tag them like {matrix:in:maternal blood}.';

/**
 * Study-type-specific workflow adaptation. A systematic review question must
 * support pooled comparative effect estimation, while a case series is
 * descriptive and has no comparator at all — so ideation, extraction, and
 * the advisory audit all consult the profile for the selected study type.
 */
const GENERIC_STUDY_PROFILE = {
    ideation: '- METHODOLOGY ALIGNMENT: Align precision with typical standards for this design and map variables strictly to the PECO framework (Population, Exposure, Comparator, Outcome) wherever logically applicable.\n- SPECIFICITY FLOOR: Start from the level of specificity the user\'s scope provides. Do NOT add doses, timeframes, strains, or other parameters the scope does not state — questions should be only as specific as the input.',
    examples: 'e.g. "What is the effect of prenatal lead exposure on...?", "Does X cause Y?"',
    extraction: '',
    audit: '',
    precisionRule: '- PREFER specific parameters (doses, concentrations, timeframes, specific strains) over broad categories.'
};

const STUDY_TYPE_PROFILES = [
    {
        match: ['systematic review'],
        ideation: `- SYSTEMATIC REVIEW RULE: Questions MUST be broad enough for a literature search — LESS SPECIFIED IS BETTER. Avoid overly specific doses, timeframes, strains, or assay panels unless the scope itself states them.
- BROAD OUTCOME MEASURES: PREFER standardisable, well-established outcome measures over specific biomarkers (e.g., "longevity in years", "IQ scores", "lung function decline" — NOT a specific assay analyte). Never narrow an outcome the user stated broadly.
- COMPARATIVE EFFECT SIZE COVERAGE: The 3 questions MUST cover comparative effect estimation. At least one must be framed around an explicit effect measure (risk ratio, odds ratio, hazard ratio, mean difference, standardized mean difference, or a pooled estimate) and at least one around the contrast between exposed and unexposed groups or exposure levels. Use the explicit comparator from the scope; if the scope only defines exposure levels (e.g., highest versus lowest category), frame the contrast between those levels.
- ASSOCIATION SCOPE: If the scope is purely associational and offers no contrast of any kind, frame the question as an association question and do NOT invent a comparator. Quantile categories may serve as the comparison axis but are never part of the exposure itself.`,
        examples: 'e.g. "What is the effect of prenatal lead exposure compared with undetectable exposure on IQ in childhood, expressed as a mean difference?", "To what extent does exposure X increase the risk of outcome Y relative to unexposed referents (pooled risk ratio)?"',
        extraction: `- SYSTEMATIC REVIEW EXTRACTION: The components define the synthesis frame — keep them BROAD; do not narrow them beyond the text. Capture an implied comparison (exposed versus unexposed, highest versus lowest exposure category) explicitly in "comparison" rather than dropping it. Quantile or category splits belong to the comparison axis, never inside the exposure. Outcomes should be standardisable across primary studies.`,
        audit: `- SYSTEMATIC REVIEW AUDIT FOCUS: Critique whether the question supports a pooled comparative effect estimate AND whether it is appropriately BROAD.
- OVER-SPECIFICATION: Flag refinements that narrow the review beyond the source — specific biomarkers or assay analytes where a standardisable broad measure exists (prefer e.g. longevity in years, IQ scores), doses or timeframes the source never states, single strains. Suggest the broadest standardisable alternative instead.
- COHERENCE: Flag quantile or category language folded inside the exposure component — quantiles define the comparison axis, they are not part of the exposure.
- COMPARATOR APPROPRIATENESS: A comparative effect question needs an explicit contrast; an association question should NOT carry an invented comparator. Flag comparators the design or scope does not support.`,
        precisionRule: '- SPECIFICATION LEVEL (SYSTEMATIC REVIEW): LESS specified is better. PREFER broad, standardisable measures (e.g., longevity in years, IQ scores) over specific biomarkers; only keep doses, timeframes, or strains that the source text itself states.'
    },
    {
        match: ['rct', 'randomi'],
        ideation: '- RCT RULE: Questions must be comparative efficacy questions: a clearly defined intervention (Exposure) versus a named control (placebo, vehicle, or standard of care) in a defined population, with an estimable treatment effect on the outcome.',
        examples: 'e.g. "What is the effect of intervention A versus placebo on outcome Y in population Z, measured as a risk difference?"',
        extraction: '- RCT EXTRACTION: Exposure is the intervention arm; comparison is the control arm. Capture regimen, dose frequency, and duration verbatim; "Not Specified" only if absent from the text.',
        audit: '- RCT AUDIT FOCUS: Critique comparator definition, co-intervention leakage, and whether the outcome supports an estimable between-group effect (absolute and/or relative measure).'
    },
    {
        match: ['case-control'],
        ideation: '- CASE-CONTROL RULE: The design is outcome-first (cases versus controls sampled from the same source population). Questions must ask about exposure odds or differences in exposure history between cases and controls — NOT about incidence or the risk of developing the outcome.',
        examples: 'e.g. "How do maternal exposure odds differ between children with outcome Y and matched controls (odds ratio)?"',
        extraction: '- CASE-CONTROL EXTRACTION: Population is the source population from which cases and controls are drawn; exposure is the hypothesised antecedent. Do not populate "comparison" with an incidence framing.',
        audit: '- CASE-CONTROL AUDIT FOCUS: Critique case and control definitions, source-population symmetry, and recall or selection bias wording. Do NOT demand incidence or prospective framing.'
    },
    {
        match: ['cohort'],
        ideation: '- COHORT RULE: Questions must be prospective exposure-outcome questions: a defined exposure versus an unexposed/reference group followed over time, with an estimable relative or absolute risk (risk ratio, rate ratio, or hazard ratio).',
        examples: 'e.g. "How does exposure X compare with no exposure in terms of incident outcome Y over 10 years of follow-up (hazard ratio)?"',
        extraction: '- COHORT EXTRACTION: Capture temporality (follow-up duration, life-stage at exposure) and the reference or unexposed group in "comparison".',
        audit: '- COHORT AUDIT FOCUS: Critique temporality, attrition, and confounder language; verify the contrast groups are explicitly defined.'
    },
    {
        match: ['animal'],
        ideation: '- EXPERIMENTAL (ANIMAL) RULE: Questions must strictly adhere to the PECO framework to prevent "wild-west" variables: exact species/strain/sex/age (Population), precise chemical and dosing regimen (Exposure), the negative or vehicle group (Comparator), and apical plus mechanistic endpoints (Outcome). Precision means keeping exactly what the scope states — do NOT add strains, doses, or endpoints the scope does not mention.',
        extraction: '- ANIMAL EXPERIMENT EXTRACTION: Capture strain, sex, route of administration, dose, frequency, and duration verbatim; separate doses into quantifiers.',
        audit: '- ANIMAL STUDY AUDIT FOCUS: Critique strain/sex/dose specificity, vehicle-control definition, and endpoint measurability.'
    },
    {
        match: ['in vitro'],
        ideation: '- EXPERIMENTAL (IN VITRO) RULE: Questions must strictly adhere to the PECO framework: cell line/tissue/assay (Population), exact chemical with concentration and exposure duration (Exposure), vehicle control (Comparator), and measured biomarkers (Outcome). Precision means keeping exactly what the scope states — do NOT add cell lines, concentrations, or biomarkers the scope does not mention.',
        extraction: '- IN VITRO EXTRACTION: Capture cell line, concentration, exposure duration, and vehicle verbatim; separate concentrations into quantifiers.',
        audit: '- IN VITRO AUDIT FOCUS: Critique cell-line identity, concentration and duration specificity, vehicle control, and assay validity language.'
    },
    {
        match: ['cross-sectional'],
        ideation: '- CROSS-SECTIONAL RULE: Questions must be point-in-time prevalence or association questions. There is no follow-up: avoid prospective or causal-incidence framing. The comparator, if any, is typically internal (e.g., high versus low exposure categories).',
        extraction: '- CROSS-SECTIONAL EXTRACTION: Capture the snapshot population and measured factor; "comparison" is often "Not Required" unless the text defines exposure categories.',
        audit: '- CROSS-SECTIONAL AUDIT FOCUS: Critique temporality claims (no causal incidence language), representativeness, and measurement-timepoint clarity.'
    },
    {
        match: ['case series', 'case report'],
        ideation: '- CASE SERIES/REPORT RULE: The design is descriptive and hypothesis-generating. Questions must describe the case(s): precise patient characteristics (Population) and the precipitating factor (Exposure). A comparator is NOT required — do not invent one.',
        extraction: '- CASE SERIES EXTRACTION: "comparison" is "Not Required" for this design unless the text explicitly mentions one.',
        audit: '- CASE SERIES AUDIT FOCUS: Critique case-description completeness. Do NOT criticise the absence of a comparator or demand comparative effect language.'
    }
];

const getStudyTypeProfile = (studyType) => {
    const label = String(studyType || '').toLowerCase();
    return STUDY_TYPE_PROFILES.find(p => p.match.some(m => label.includes(m))) || GENERIC_STUDY_PROFILE;
};

/**
 * Contrastive worked example: one real observed failure and its repairs.
 * Models copy patterns far more reliably than they follow abstract rules,
 * so the failure modes that produced past bugs are shown, not just described.
 */
const RIGOR_CONTRASTIVE_EXAMPLE = `WORKED CONTRASTIVE EXAMPLE (defect -> repair):
DEFECT: "Does elevated bisphenol A concentration correlate with higher oxidative stress indicators in HepG2 cell cultures compared with baseline conditions?" — it mixes association language ("correlate") with comparison language ("compared with"), and "baseline conditions" is a measurement time point, not a control group.
REPAIRED (group contrast): "Does treatment of HepG2 cells with bisphenol A increase oxidative stress biomarkers compared with vehicle control?" (exposure: bisphenol A treatment; comparison: vehicle control; the degree qualifier "elevated" stays in the exposure or quantifiers).
REPAIRED (association): "Is bisphenol A concentration associated with oxidative stress biomarkers in HepG2 cell cultures?" (comparison: Not Required).`;


const FRAMING_RULE = `- FRAMING (MANDATORY): Set "framing" on every question to exactly one of: "group_contrast" (a between-group comparison — use comparison language), "dose_response" (an exposure-level gradient — the contrast is between exposure levels), "association" (no comparator — "comparison" is "Not Required"), "descriptive" (case description, no comparator). The question's language MUST match its framing: NEVER mix association words ("correlate", "associated with") with comparison words ("compared with", "versus") in one question.`;

/**
 * Tiered request timeouts (AbortController on every provider fetch):
 * ideation 30s, large audit/synthesis generations 120s, everything else 60s.
 * A timeout is a retryable condition; a persistent stall ends in a visible
 * error, never an infinite spinner.
 */
const TASK_TIMEOUT_MS = { ideation: 30000, audit: 120000, synthesis: 120000 };
const taskTimeoutMs = (config) => config.timeoutMs || TASK_TIMEOUT_MS[config.task] || 60000;

/**
 * Arms an AbortController for one provider request. `finish()` disarms it —
 * callers may only call it AFTER the response body has fully downloaded, so
 * the timer stays armed through body download and a stalled stream aborts.
 */
const armTimeout = (config) => {
    const timeoutMs = taskTimeoutMs(config);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return {
        signal: controller.signal,
        finish: () => clearTimeout(timer),
        message: `Provider did not respond within ${Math.round(timeoutMs / 1000)}s (${config.task || 'request'}) — request timed out.`
    };
};

const isAbortError = (error) => !!error && (error.name === 'AbortError' || /aborted/i.test(error.message || ''));

const providerLabel = () => {
    const p = appState.aiProvider || 'gemini';
    const model = {
        gemini: () => appState.geminiModel || 'gemini-3.1-flash-lite',
        openai: () => appState.openaiModel || 'gpt-4o',
        perplexity: () => appState.perplexityModel || 'sonar-pro',
        anthropic: () => appState.anthropicModel || 'claude-3-7-sonnet',
        mistral: () => appState.mistralModel || 'mistral-large-latest'
    }[p];
    const m = model ? model() : (appState.aiModel || 'local');
    return `${p} ${m}`;
};

/**
 * Core API Wrapper supporting multi-provider dispatch with exponential backoff.
 */
export const callGeminiAPI = async (prompt, schema, statusContainer = null, config = {}) => {
  const provider = appState.aiProvider || 'gemini';
  // Rigor repair passes run with maxRetries: 0 — fail fast, keep the original
  // response, and surface the residual flags. Every other call gets 2.
  const MAX_RETRIES = config.maxRetries ?? 2;
  const taskLabel = config.task || 'request';
  let activeConfig = { ...config, timeoutMs: taskTimeoutMs(config) };
  const originalBudget = activeConfig.maxTokens || appState.maxTokens || 4096;

  const invokeProvider = async () => {
      if (provider === 'gemini') {
          return await callGoogleGemini(prompt, schema, statusContainer, activeConfig);
      } else if (provider === 'openai') {
          return await callOpenAIAndPerplexity(prompt, schema, statusContainer, activeConfig, 'openai');
      } else if (provider === 'perplexity') {
          return await callOpenAIAndPerplexity(prompt, schema, statusContainer, activeConfig, 'perplexity');
      } else if (provider === 'anthropic') {
          return await callAnthropic(prompt, schema, statusContainer, activeConfig);
      } else if (provider === 'mistral') {
          return await callMistral(prompt, schema, statusContainer, activeConfig);
      } else {
          return await callOpenAICompatible(prompt, schema, statusContainer, activeConfig);
      }
  };

  ActivityBus.emit({ type: 'phase', label: config.phaseLabel || `AI: ${taskLabel} (${providerLabel()})…` });

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
          const result = await invokeProvider();
          ActivityBus.emit({ type: 'done' });
          return appState.matrixTagging === false ? sanitizeMatrixTagsDeep(result) : result;
      } catch (error) {
          const errMsg = (error.message || "").toLowerCase();
          const isParseError = errMsg.includes('parse') || errMsg.includes('extract json');
          const isRateLimit = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate limit');
          const isTruncation = errMsg.includes('output truncated');
          const isTimeout = errMsg.includes('timed out');

          if (((schema && isParseError) || isTruncation || isRateLimit || isTimeout) && attempt <= MAX_RETRIES) {
              const backoff = attempt * 800;
              // Replaying an identical request after a truncation or parse
              // failure fails identically; escalate the token budget so the
              // retry has room to finish the structured JSON — capped at 2x
              // the original budget.
              let escalationNote = '';
              if ((isParseError || isTruncation) && !isTimeout) {
                  const currentMax = activeConfig.maxTokens || appState.maxTokens || 4096;
                  activeConfig = { ...activeConfig, maxTokens: Math.min(currentMax * 2, originalBudget * 2) };
                  escalationNote = ` (maxTokens escalated to ${activeConfig.maxTokens})`;
              }
              const retryReason = isRateLimit ? 'rate limit' : isTimeout ? 'timeout' : isTruncation ? 'truncated output' : 'unparseable JSON';
              ActivityBus.emit({ type: 'note', label: `retrying: ${retryReason} (attempt ${attempt + 1}/${MAX_RETRIES + 1})${escalationNote}` });
              console.warn(`[Attempt ${attempt}/${MAX_RETRIES + 1}] Retrying in ${backoff}ms${escalationNote}...`, error);
              await new Promise(res => setTimeout(res, backoff));
              continue;
          }

          ActivityBus.emit({ type: 'error', label: error.message || 'unknown error' });
          displayErrorModal(error, statusContainer);
          throw error;
      }
  }
};

/**
 * Implementation for Google Gemini (Official SDK) with Permissive Safety and Version Pinning
 */
async function callGoogleGemini(prompt, schema, statusContainer, config) {
  const userModel = appState.geminiModel || 'gemini-3.1-flash-lite';
  const modelsToAttempt = [userModel, 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  const uniqueModels = [...new Set(modelsToAttempt)];

  const h = appState.heuristics;
  const isAudit = config.task === 'audit';
  const isExtraction = config.task === 'extraction';
  const isSynthesis = config.task === 'synthesis';
  const isIdeation = config.task === 'ideation';

  const matrixRuleBlock = appState.matrixTagging === false
      ? 'LINGUISTIC SYNTAX: Write plain descriptive text. Do NOT use any {matrix:...} tagging syntax.'
      : `CRITICAL: LINGUISTIC SYNTAX RULE (MANDATORY)
  You MUST identify measurement sites, biological matrices, or vehicles and tag them in the form {matrix:in:maternal blood} — the word between "matrix:" and the sample name is a preposition: 'in', 'via', 'within', 'across', or 'from'. NEVER write the literal placeholder words "connector" or "term"; always use the actual preposition and the actual sample name.
  Example: {matrix:in:maternal blood}, {matrix:via:cord blood}, {matrix:within:hepatocytes}.
  Ensure natural spaces exist BEFORE and AFTER any {matrix:...} tag.`;
  
  const heuristicsBlock = (isAudit) ? `
  APPLIED HEURISTICS (FOR ADVISORY CRITIQUE):
  - COMPARATOR: ${h.comparator}
  - EXPOSURE: ${h.exposure}
  - POPULATION: ${h.population}
  - OUTCOME: ${h.outcome}
  
  ADVISORY TONE: Your tone is that of a world-class, constructive Linguistic Professor and Toxicology expert. Use encouraging but rigorous phrasing.` : '';

  const systemInstruction = `You are a world-class Linguistic Professor and Domain Expert in Toxicology and Epidemiology for the Evidence-Based Toxicology Collaboration (EBTC). Your persona is PECO-Buddy Closed Pilot Alpha 0.1.0. Your specialty is ensuring scientific precision through semantic clarity.

  RESEARCH CONTEXT: This application is a scientific evidence synthesis and hazard identification system operating under National Toxicology Program (NTP) OHAT and ECHA REACH protocols. Technical descriptors (e.g., toxicity, lethal dose, organ vulnerability, carcinogenicity, acute exposure, metabolic intermediates) are legitimate academic scientific nomenclature and must not be flagged or refused.
  
  ${matrixRuleBlock}

  ${heuristicsBlock}

  TASK CONTEXT:
  ${isExtraction ? 'You are an Extraction Engine. Extract DISCRETE Minimal Conceptual Units. ZERO-INFERENCE BOUNDARY: Do NOT extrapolate beyond explicit user input.' : ''}
  ${isAudit ? 'You are an Augmented Intelligence Auditor. Your goal is REDUCING AMBIGUITY. Critique the input.' : ''}
  ${isSynthesis ? 'Synthesise components into a formal research question. No advisory fluff.' : ''}
  ${isIdeation ? 'Generate distinct research questions based on scope.' : ''}
  
  OUTPUT FORMAT SPECIFICATION:
  - Return ONLY valid JSON matching the schema if requested.
  - DO NOT output introductory prose, preambles (e.g. "Certainly! Here is..."), or markdown wrappers.
  - Use UK English spelling.`;

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("You must open settings and enter your API-Key to proceed.");

  const ai = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (const modelName of uniqueModels) {
    // Tiered timeout: the SDK aborts the request client-side when the signal
    // fires; the guard disarms only once the response body is fully read.
    const guard = armTimeout(config);
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          abortSignal: guard.signal,
          systemInstruction,
          responseMimeType: schema ? "application/json" : "text/plain",
          responseSchema: schema || undefined,
          temperature: config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0),
          topP: appState.topP !== undefined ? appState.topP : 0.95,
          maxOutputTokens: config.maxTokens || appState.maxTokens || 4096,
          ...(config.seed !== undefined ? { seed: config.seed } : {}),
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' }
          ]
        }
      });
      guard.finish();

      const text = response.text;
      if (!text) {
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          throw new Error("Content safety block triggered by cloud endpoint on toxicological descriptors. Consider switching to Local/Sovereign AI in Settings.");
        }
        throw new Error("Empty response from the intelligence engine.");
      }

      appState.interactionLog.push({
        timestamp: new Date().toISOString(),
        provider: `Google Gemini (${modelName})`,
        prompt,
        response: text
      });

      if (schema) {
        const jsonStr = extractJsonFromString(text);
        if (!jsonStr) throw new Error("Failed to parse structural response into valid JSON.");
        return JSON.parse(jsonStr);
      }
      return text;
    } catch (error) {
      guard.finish();
      // A timeout is a retryable transport condition, not a model fault —
      // propagate it immediately so the retry engine (not the model cycle)
      // owns it.
      if (isAbortError(error)) throw new Error(guard.message);
      lastError = error;
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("api key") || msg.includes("401") || msg.includes("403")) {
        throw error; // Don't cycle models for bad API keys
      }
      console.warn(`Gemini attempt with model ${modelName} failed:`, error.message);
    } finally {
      guard.finish();
    }
  }

  throw lastError || new Error("Failed to obtain response from Gemini models.");
}

/**
 * Implementation for OpenAI-Compatible Endpoints (Ollama, LM Studio, OpenAI, etc.)
 */

async function callOpenAICompatible(prompt, schema, statusContainer, config) {
    const h = appState.heuristics;
    const isAudit = config.task === 'audit';
    
    const baseUrl = appState.aiBaseUrl ? appState.aiBaseUrl.replace(/\/+$/, '') : 'http://localhost:11434/v1';
    const model = appState.aiModel || 'llama3';
    const apiKey = getApiKey() || 'lm-studio'; // Some endpoints need a dummy key

    // Construct System Prompt manually since OpenAI API passes it as a message
    const heuristicsBlock = (isAudit) ? `\nAPPLIED HEURISTICS:\n- COMPARATOR: ${h.comparator}\n- EXPOSURE: ${h.exposure}\n- POPULATION: ${h.population}\n- OUTCOME: ${h.outcome}` : '';
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Closed Pilot Alpha 0.1.0).
    ${matrixSyntaxLine()}
    ${heuristicsBlock}`;

    // Append JSON instruction strongly if schema is present, as generic endpoints might not support response_format strictness
    if (schema) {
        systemPrompt += `\n\nIMPORTANT: You must output ONLY valid JSON. No markdown, no preambles.`;
    }

    try {
        const temperature = config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0);
        const payload = {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt + describeSchema(schema) }
            ],
            temperature: temperature,
            max_tokens: config.maxTokens || appState.maxTokens || 4096
        };

        if (temperature > 0 && appState.topP !== undefined) {
            payload.top_p = appState.topP;
        }
        // Ollama and LM Studio honour seed for reproducible sampling; other
        // compatible endpoints ignore or reject it harmlessly.
        if (config.seed !== undefined) {
            payload.seed = config.seed;
        }
        // Try to force JSON mode if supported by the provider, but many local models ignore this param or fail if unknown
        // response_format: schema ? { type: "json_object" } : undefined

        // Tiered timeout, armed through body download (finish() only in the
        // finally AFTER the JSON body has been fully read).
        const guard = armTimeout(config);
        let response, data;
        try {
            response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload),
                signal: guard.signal
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Provider Error (${response.status}): ${errText}`);
            }

            data = await response.json();
        } catch (fetchError) {
            if (isAbortError(fetchError)) {
                throw new Error(`Local AI endpoint at ${baseUrl} ${guard.message} The server may be down, still loading the model, or stalled.`);
            }
            throw new Error(`Could not reach local AI endpoint at ${baseUrl}. Ensure Ollama/LM Studio is running and the Base URL in Settings is correct. (${fetchError.message})`);
        } finally {
            guard.finish();
        }

        const choice = data.choices?.[0];
        const content = choice?.message?.content;

        if (!content) throw new Error("Empty response from AI Provider.");

        appState.interactionLog.push({
            timestamp: new Date().toISOString(),
            provider: `OpenAI Compatible (${model})`,
            prompt,
            response: content
        });

        if (schema && choice?.finish_reason === 'length') {
            throw new Error(`Output truncated at max_tokens (${payload.max_tokens}). The response was cut off before the JSON could complete.`);
        }

        if (schema) {
            const jsonStr = extractJsonFromString(content);
            if (!jsonStr) throw new Error("Failed to extract JSON from provider response. Ensure the model is capable of JSON output.");
            return JSON.parse(jsonStr);
        }
        return content;

    } catch (error) {
        console.error("Provider Error:", error);
        throw error;
    }
}

/**
 * Implementation for OpenAI Native and Perplexity
 */
async function callOpenAIAndPerplexity(prompt, schema, statusContainer, config, providerType) {
    const isPerplexity = providerType === 'perplexity';
    const baseUrl = isPerplexity ? 'https://api.perplexity.ai' : 'https://api.openai.com/v1';
    const model = isPerplexity ? (appState.perplexityModel || 'sonar-pro') : (appState.openaiModel || 'gpt-4o');
    const apiKey = isPerplexity ? appState.perplexityKey : appState.openaiKey;

    if (!apiKey) throw new Error(`You must enter your ${isPerplexity ? 'Perplexity' : 'OpenAI'} API Key in settings.`);

    const h = appState.heuristics;
    const isAudit = config.task === 'audit';
    
    const heuristicsBlock = (isAudit) ? `\nAPPLIED HEURISTICS:\n- COMPARATOR: ${h.comparator}\n- EXPOSURE: ${h.exposure}\n- POPULATION: ${h.population}\n- OUTCOME: ${h.outcome}` : '';
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Closed Pilot Alpha 0.1.0).
    ${matrixSyntaxLine()}
    ${heuristicsBlock}`;

    if (schema) {
        systemPrompt += `\n\nIMPORTANT: You must output ONLY valid JSON. No markdown, no preambles.`;
    }

    try {
        const temperature = config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0);
        const payload = {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt + describeSchema(schema) }
            ],
            temperature: temperature,
            max_tokens: config.maxTokens || appState.maxTokens || 4096
        };

        if (temperature > 0 && appState.topP !== undefined) {
            payload.top_p = appState.topP;
        }

        // OpenAI supports response_format: { type: "json_object" } (mostly)
        if (schema && !isPerplexity) {
            payload.response_format = { type: "json_object" };
        }

        // OpenAI honours seed for reproducible sampling; Perplexity does not accept it.
        if (!isPerplexity && config.seed !== undefined) {
            payload.seed = config.seed;
        }

        const guard = armTimeout(config);
        let response, data;
        try {
            response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload),
                signal: guard.signal
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`${isPerplexity ? 'Perplexity' : 'OpenAI'} Error (${response.status}): ${errText}`);
            }

            data = await response.json();
        } catch (fetchError) {
            if (isAbortError(fetchError)) throw new Error(`${isPerplexity ? 'Perplexity' : 'OpenAI'} ${guard.message}`);
            throw fetchError;
        } finally {
            guard.finish();
        }
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error(`Empty response from ${isPerplexity ? 'Perplexity' : 'OpenAI'}.`);

        appState.interactionLog.push({
            timestamp: new Date().toISOString(),
            provider: `${isPerplexity ? 'Perplexity' : 'OpenAI'} (${model})`,
            prompt,
            response: content
        });

        if (schema) {
            const jsonStr = extractJsonFromString(content);
            if (!jsonStr) throw new Error("Failed to extract JSON from provider response.");
            return JSON.parse(jsonStr);
        }
        return content;

    } catch (error) {
        console.error(`${providerType} Error:`, error);
        throw error;
    }
}

/**
 * Implementation for Anthropic API
 */
async function callAnthropic(prompt, schema, statusContainer, config) {
    const model = appState.anthropicModel || 'claude-3-7-sonnet-20250219';
    const apiKey = appState.anthropicKey;

    if (!apiKey) throw new Error("You must enter your Anthropic API Key in settings.");

    const h = appState.heuristics;
    const isAudit = config.task === 'audit';
    
    let heuristicsBlock = (isAudit) ? `\nAPPLIED HEURISTICS:\n- COMPARATOR: ${h.comparator}\n- EXPOSURE: ${h.exposure}\n- POPULATION: ${h.population}\n- OUTCOME: ${h.outcome}` : '';
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Closed Pilot Alpha 0.1.0).
    ${matrixSyntaxLine()}
    ${heuristicsBlock}`;

    if (schema) {
        systemPrompt += `\n\nIMPORTANT: You must return ONLY raw JSON matching the requested structure. No conversational filler, no markdown blocks.`;
        // Claude performs best when given a prefill of "{"
    }

    try {
        const temperature = config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0);
        const payload = {
            model: model,
            system: systemPrompt,
            messages: [
                { role: "user", content: prompt + describeSchema(schema) }
            ],
            max_tokens: config.maxTokens || appState.maxTokens || 4096,
            temperature: temperature,
        };

        if (temperature > 0 && appState.topP !== undefined) {
            payload.top_p = appState.topP;
        }

        if (schema) {
            payload.messages.push({ role: "assistant", content: "{" });
        }

        // We use a CORS proxy or rely on anthropic's direct web SDK integration if possible.
        // NOTE: Anthropic's API does not support direct browser calls without headers bypassing CORS securely.
        // We use anthropic's official 'anthropic-version' header, and if they have CORS enabled on it, we use it directly:
        const guard = armTimeout(config);
        let response, data;
        try {
            response = await fetch("https://api.anthropic.com/v1/messages", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify(payload),
                signal: guard.signal
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Anthropic Error (${response.status}): ${errText}`);
            }

            data = await response.json();
        } catch (fetchError) {
            if (isAbortError(fetchError)) throw new Error(`Anthropic ${guard.message}`);
            throw fetchError;
        } finally {
            guard.finish();
        }
        let content = data.content?.[0]?.text;

        if (!content) throw new Error("Empty response from Anthropic.");

        if (schema) {
            content = "{" + content; // Refix the { we prefilled
        }

        appState.interactionLog.push({
            timestamp: new Date().toISOString(),
            provider: `Anthropic (${model})`,
            prompt,
            response: content
        });

        if (schema) {
            const jsonStr = extractJsonFromString(content);
            if (!jsonStr) throw new Error("Failed to extract JSON from Anthropic response.");
            return JSON.parse(jsonStr);
        }
        return content;

    } catch (error) {
        console.error("Anthropic Error:", error);
        throw error;
    }
}

/**
 * Implementation for Mistral AI (Native)
 */
async function callMistral(prompt, schema, statusContainer, config) {
    const apiKey = appState.mistralKey;
    const model = appState.mistralModel || 'mistral-large-latest';

    if (!apiKey) throw new Error("You must enter your Mistral API Key in settings.");

    const h = appState.heuristics;
    const isAudit = config.task === 'audit';

    const heuristicsBlock = (isAudit) ? `\nAPPLIED HEURISTICS:\n- COMPARATOR: ${h.comparator}\n- EXPOSURE: ${h.exposure}\n- POPULATION: ${h.population}\n- OUTCOME: ${h.outcome}` : '';

    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Closed Pilot Alpha 0.1.0).
    ${matrixSyntaxLine()}
    ${heuristicsBlock}`;

    if (schema) {
        systemPrompt += `\n\nCRITICAL: Output strictly valid JSON conforming to the requested schema. No markdown, no preambles.`;
    }

    try {
        const temperature = config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0);
        const payload = {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt + describeSchema(schema) }
            ],
            temperature: temperature,
            max_tokens: config.maxTokens || appState.maxTokens || 4096
        };

        // Mistral requires top_p = 1 during greedy sampling (temperature 0).
        // The user's nucleus value is only applied alongside non-zero temperature.
        if (temperature > 0 && appState.topP !== undefined) {
            payload.top_p = appState.topP;
        } else {
            payload.top_p = 1; // explicit greedy-compliant value
        }

        // Mistral supports OpenAI-style JSON mode; only enforce it when structured output is requested
        if (schema) {
            payload.response_format = { type: "json_object" };
        }

        // Mistral exposes reproducible sampling via random_seed.
        if (config.seed !== undefined) {
            payload.random_seed = config.seed;
        }

        const guard = armTimeout(config);
        let response, data;
        try {
            response = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload),
                signal: guard.signal
            });

            if (!response.ok) {
                let errDetail = `Mistral API returned status ${response.status}`;
                try {
                    const errJson = await response.json();
                    if (errJson.message) errDetail = errJson.message;
                    else if (errJson.error?.message) errDetail = errJson.error.message;
                } catch (_) {}
                throw new Error(`Mistral Error: ${errDetail}`);
            }

            data = await response.json();
        } catch (fetchError) {
            if (isAbortError(fetchError)) throw new Error(`Mistral ${guard.message}`);
            throw fetchError;
        } finally {
            guard.finish();
        }
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("Empty response from Mistral.");

        appState.interactionLog.push({
            timestamp: new Date().toISOString(),
            provider: `Mistral (${model})`,
            prompt,
            response: content
        });

        if (schema) {
            const jsonStr = extractJsonFromString(content);
            if (!jsonStr) throw new Error("Failed to extract JSON from Mistral response.");
            return JSON.parse(jsonStr);
        }
        return content;

    } catch (error) {
        console.error("Mistral Error:", error);
        throw error;
    }
}

function getApiKey() {
    if (appState.globalApiKey && appState.globalApiKey.length > 0) return appState.globalApiKey;
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) {}
    return null;
}

/**
 * Connectivity self-test for the currently configured AI provider.
 * Resolves with a short excerpt of the reply, rejects with the provider error.
 */
export const testProviderConnection = async () => {
    const reply = await callGeminiAPI('This is a connectivity self-test. Reply with exactly the single word: OK', null, null, {});
    const text = typeof reply === 'string' ? reply.trim() : '';
    if (!text) throw new Error('Provider returned an empty response.');
    return text.slice(0, 60);
};

/**
 * Quick Suggestion Engine (Ideation)
 */
export const callAdvancedIdeationAPI = async (scope, studyType, statusContainer, config = {}) => {
  const profile = getStudyTypeProfile(studyType);
  const depthInstructions = profile.ideation;

  const prompt = `Generate 3 DISTINCT research questions for a ${studyType} based strictly on: "${scope}". 
  CRITICAL IDEATION RULES:
  - ZERO HALLUCINATION: DO NOT invent or add new scientific components (like a new exposure or outcome variable) if they are not present in the user's scope.
  - HIGH VARIATION VIA SYNONYMS: You MUST produce 3 questions that feel distinct from each other. Actively use scientifically valid synonyms (e.g., "elevated prenatal exposure" -> "high maternal levels", "intelligence" -> "cognitive development") and vary the sentence structure. The core scientific parameters must remain faithful to the original text without introducing unrelated concepts.
  - If the user's scope lacks a comparator, the generated "full_statement" MUST NOT contain one.
  - MISSING COMPONENTS: For the structured output (population, exposure, comparison, outcome): If a component is missing, output "Not Specified" (if the study type typically requires it) or "Not Required" (if the study design inherently lacks it, e.g., descriptive or associative studies). DO NOT invent terms like "lower quartiles" unless the user explicitly provided them.
  - Each "full_statement" MUST be a direct research question ending with a question mark (${profile.examples}).
  - DO NOT use conversational or advisory phrasing like "Have you considered", "One thought is", or "Could it be useful to".
  ${appState.matrixTagging === false ? '- Write plain descriptive text; do NOT use any {matrix:...} tagging syntax.' : '- Tag biological samples like {matrix:in:maternal blood} — actual preposition and actual sample name, never the placeholder words "connector" or "term".'}
  ${depthInstructions}
  ${FRAMING_RULE}
  ${RIGOR_CONTRASTIVE_EXAMPLE}
  Return JSON with a "questions" array containing: full_statement, framing, population, exposure, comparison, outcome.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            full_statement: { type: Type.STRING },
            framing: { type: Type.STRING, enum: FRAMING_VALUES },
            population: { type: Type.STRING },
            exposure: { type: Type.STRING },
            comparison: { type: Type.STRING },
            outcome: { type: Type.STRING }
          },
          required: ["full_statement", "framing", "population", "exposure", "comparison", "outcome"]
        }
      }
    },
    required: ["questions"]
  };

  return await callGeminiAPI(prompt, schema, statusContainer, { ...config, task: 'ideation', temperature: 0.7 });
};

/**
 * Logic Audit Engine (Advisory Mode)
 */
export const callQuestionQualityAPI = async (question, peco, statusContainer, config = {}, studyType = 'General') => {
  const profile = getStudyTypeProfile(studyType);

  // Assistance Level Mapping
  const level = appState.assistanceLevel || 3;
  let guidanceInstruction = "";
  if (level === 1) guidanceInstruction = "ASSISTANCE LEVEL: MINIMAL. Only flag critical scientific errors. Be brief.";
  else if (level === 2) guidanceInstruction = "ASSISTANCE LEVEL: LIGHT. Offer only high-value suggestions for clarity.";
  else if (level === 3) guidanceInstruction = "ASSISTANCE LEVEL: STANDARD. Provide helpful alternatives and moderate critique.";
  else if (level === 4) guidanceInstruction = "ASSISTANCE LEVEL: DETAILED. Deeply analyse terms for precision.";
  else if (level === 5) guidanceInstruction = "ASSISTANCE LEVEL: INTENSE/RUTHLESS. Critique every potential ambiguity with rigorous detail.";

  // Frozen Components Logic
  const frozen = appState.authorWorkflow.clarityData.frozenComponents || {};
  const frozenKeys = Object.keys(frozen).filter(k => frozen[k]);
  
  let frozenInstruction = "";
  if (frozenKeys.length > 0) {
      frozenInstruction = `CRITICAL: The following components are FINALISED by the user: ${JSON.stringify(frozenKeys)}. DO NOT generate any advisory cards or suggestions for these components. Focus your energy on the remaining components.`;
  }

  // Depth Logic
  const isFast = appState.authorWorkflow.clarityData.analysisDepth === 'fast';
  const depthInstruction = isFast 
      ? "FAST MODE: Provide concise advisory messages without deep reasoning or counter-considerations. Focus on direct, actionable refinements."
      : "STANDARD MODE: Provide a detailed, elaborate scientific justification (3-5 sentences). Explain exactly how the refined term reduces ambiguity and why the current term is linguistically or scientifically unresolved. Include counter-considerations.";

  const prompt = `Review protocol: "${question}" using components: ${JSON.stringify(peco)}. 
  The protocol is intended as a ${studyType}. Apply the study-design expectations below.
  Generate 5 to 6 distinct advisory cards per PECO component.
  
  ${guidanceInstruction}
  ${frozenInstruction}
  ${depthInstruction}
  ${profile.audit}

  CRITICAL ADVISORY RULES FOR AMBIGUITY REDUCTION:
  - "refined_term": Must be a single Minimal Conceptual Unit (e.g. "Sprague-Dawley Rats", "Lead acetate 10mg/kg", "IQ scores at 24 months"). 
  ${profile.precisionRule}
  - "advisory_message": ${isFast ? "Briefly state why this refinement is better." : "Provide a detailed, elaborate scientific justification (3-5 sentences). Explain exactly how the refined term reduces ambiguity and why the current term is linguistically or scientifically unresolved."}
  - "counter_consideration": ${isFast ? "Leave this empty or provide a very brief 1-sentence note." : "Explain why this suggestion might NOT be appropriate in certain contexts or how it might inadvertently limit the scope or quality if applied incorrectly."}
  - Tone: Humble and advisory. Use phrases like "Could it be better if...", "Have you considered...", "If you are looking for [x], then [y] could improve [z]". Avoid deterministic or commanding language.
  - COMPONENT LABELS: The "component" field MUST be exactly one of the lowercase strings: "population", "exposure", "comparison", "outcome".
  - Return JSON.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      missing_components: { type: Type.ARRAY, items: { type: Type.STRING } },
      feedback: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            component: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                    advisory_message: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    refined_term: { type: Type.STRING },
                    counter_consideration: { type: Type.STRING }
                },
                required: ["advisory_message", "rationale", "refined_term", "counter_consideration"]
              }
            }
          },
          required: ["component", "suggestions"]
        }
      }
    },
    required: ["strengths", "missing_components", "feedback"]
  };

  // The advisory audit is a large structured output (4 components x 5-6 cards with
  // elaborated justifications); the global token budget can truncate it, which
  // breaks JSON parsing and silently destroys the advisory cards. Guarantee a floor.
  const requestConfig = { ...config, task: 'audit', maxTokens: Math.max(appState.maxTokens || 4096, 8192) };
  return await callGeminiAPI(prompt, schema, statusContainer, requestConfig);
};

export const callContextLogicEngineAPI = async (question) => {
  const prompt = `Perform logic deconstruction for: "${question}". Return JSON with unit_of_observation, exposure_vehicle, species_context, preferred_population_term, causal_logic.${appState.matrixTagging === false ? '' : ' Suggest matrix tags.'}`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      unit_of_observation: { type: Type.STRING },
      exposure_vehicle: { type: Type.STRING },
      species_context: { type: Type.STRING },
      preferred_population_term: { type: Type.STRING },
      causal_logic: { type: Type.STRING }
    },
    required: ["unit_of_observation", "exposure_vehicle", "species_context", "preferred_population_term", "causal_logic"]
  };
  return await callGeminiAPI(prompt, schema);
};

export const callDomainIdentifierAPI = async (text, contextLogic = null) => {
  const prompt = `Identify domain for: "${text}". Context: ${JSON.stringify(contextLogic)}`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      domain: { type: Type.STRING },
      raw_subject_population: { type: Type.STRING },
      raw_intervention_exposure: { type: Type.STRING },
      raw_comparison: { type: Type.STRING },
      raw_outcome: { type: Type.STRING }
    },
    required: ["domain", "raw_subject_population", "raw_intervention_exposure", "raw_comparison", "raw_outcome"]
  };
  return await callGeminiAPI(prompt, schema);
};

export const callSpecialistPecoExtractorAPI = async (domain, prelim, fullText, studyType, contextLogic = null, truthAnchor = null, ontologyGrounding = '') => {
  const prohibitionRule = `
  *** RULE: ZERO-SHOT PROHIBITION IS IN EFFECT ***
  1. NO INFERENCE: You are strictly forbidden from guessing, inferring, or synthesizing information based on your pre-trained knowledge.
  2. VERBATIM ONLY: All extracted data must match the text exactly if present (do not paraphrase).
  3. MISSING COMPONENTS: If a specific piece of data (such as Comparator/Comparison) is physically missing from the text, you MUST output "Not Specified" (if the study type typically requires it) or "Not Required" (if the study design inherently lacks a comparator, e.g., descriptive studies). Do not attempt to fill in the blanks.
  4. CORE ENTITY ISOLATION: The main PECO fields (population, exposure, comparison, outcome) MUST represent the core biological, conceptual, or physical entity only.
  5. QUANTIFIER EXTRACTION: Any dosage, threshold, quantile, magnitude, frequency, or severity (e.g., "Top quartile", "5mg/kg", "High levels", "Lower quartiles") MUST be separated and placed into the 'quantifiers_and_modifiers' field. Do not leave them in the main PECO fields.
  
  *** CHAIN OF THOUGHT (CoT) ANCHORING ***
  Before populating the 'extracted_data' fields, you must populate the 'extraction_metadata' object:
  1. Write out your reasoning for finding the data.
  2. Extract the exact sentence/paragraph (verbatim quote) where the data resides.
  3. Only after securing the quote, map the data into the 'extracted_data' object.`;

  let anchorRule = truthAnchor ? `\n\nTRUTH ANCHOR IN EFFECT: The user's explicitly stated intent/objective is: "${truthAnchor}". Assess if the extracted text drifts from this anchor.` : '';
  const profile = getStudyTypeProfile(studyType);

  const prompt = `Identify and extract DISCRETE PECO components from the following text:
  -----------------------
  ${fullText}
  -----------------------
  
  CONTEXT: 
  - Intended Study Type: ${studyType}${anchorRule}
  
  CRITICAL EXTRACTION RULES:
  ${prohibitionRule}
  - Distinguish between Associations (correlation without explicit control) and Comparative designs (where an exposed/intervention group is strictly compared to an unexposed/placebo group).
  - Extract parameters if available (doses, concentrations, specific age ranges, durations).
  - Example Population: "Pregnant Wistar Rats" instead of "Rats".
  - Example Exposure: "Deltamethrin" instead of "Deltamethrin 5mg/kg/day" (the dosage goes into quantifiers).
  ${appState.matrixTagging === false ? '- Write plain descriptive text; do NOT use any {matrix:...} tagging syntax.' : '- Tag biological samples like {matrix:in:maternal blood} — actual preposition and actual sample name, never the placeholder words "connector" or "term".'}
  ${profile.extraction}
  ${ontologyGrounding}
  ${FRAMING_RULE}
  - FRAMING CONSISTENCY: If the question uses association language ("correlate", "associated with"), "comparison" must be "Not Required"; if it names an explicit comparison, keep the group framing. Never output a comparator for an association question.
  - COMPARATOR DISCIPLINE: For experimental designs the comparator must name a real control group (vehicle control, untreated, placebo). "Baseline" is a measurement time point, never a comparator group.
  ${RIGOR_CONTRASTIVE_EXAMPLE}
  - Return ONLY valid JSON matching the schema.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      extraction_metadata: {
        type: Type.OBJECT,
        properties: {
          chain_of_thought_reasoning: { type: Type.STRING },
          verbatim_source_quotes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          semantic_drift_detected: { type: Type.BOOLEAN },
          drift_reasoning: { type: Type.STRING }
        },
        required: ["chain_of_thought_reasoning", "verbatim_source_quotes"]
      },
      extracted_data: {
        type: Type.OBJECT,
        properties: {
          framing: { type: Type.STRING, enum: FRAMING_VALUES },
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
        required: ["framing", "population", "exposure", "comparison", "outcome", "quantifiers_and_modifiers"]
      }
    },
    required: ["extraction_metadata", "extracted_data"]
  };
  return await callGeminiAPI(prompt, schema, null, { task: 'extraction', temperature: 0.0 });
};

/**
 * Rigor repair pass (ideation). Receives only the flagged questions and the
 * deterministic check failures — never an open "review your work" — and
 * returns the full corrected questions list (untouched questions verbatim).
 * Hard bound: maxRetries 0 — a repair that cannot complete fails fast and
 * the ORIGINAL survives with its flags.
 */
export const callIdeationRepairAPI = async (scope, studyType, questions, flagged, statusContainer = null, ontologyGrounding = '') => {
  const defectReport = flagged.map(entry => {
    const q = questions[entry.index];
    return `Question ${entry.index + 1} ("${q?.full_statement}"): ${entry.flags.map(f => `${f.code} — ${f.detail}`).join('; ')}`;
  }).join('\n');
  const flaggedCount = flagged.reduce((n, e) => n + e.flags.length, 0);

  const prompt = `You previously generated research questions for a ${studyType} based on: "${scope}".
Automated deterministic rigor checks flagged defects:
${defectReport}

Repair ONLY the flagged questions so every check passes; return the COMPLETE list (unflagged questions verbatim, flagged questions corrected).
${ontologyGrounding}
REPAIR RULES:
- ZERO HALLUCINATION still applies: never introduce exposures, outcomes, or comparators absent from the scope.
- Commit to exactly one framing per question ("group_contrast", "dose_response", "association", or "descriptive") and make the language consistent with it.
- For experimental designs, name a real control group in "comparison" (vehicle control, untreated, placebo); an association question gets comparison "Not Required".
- Keep degree qualifiers ("elevated", "higher") in the components or mention them so they are not lost.
- Quantile language belongs in the comparison axis, never inside the exposure.
${RIGOR_CONTRASTIVE_EXAMPLE}
Return JSON with a "questions" array containing: full_statement, framing, population, exposure, comparison, outcome.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            full_statement: { type: Type.STRING },
            framing: { type: Type.STRING, enum: FRAMING_VALUES },
            population: { type: Type.STRING },
            exposure: { type: Type.STRING },
            comparison: { type: Type.STRING },
            outcome: { type: Type.STRING }
          },
          required: ["full_statement", "framing", "population", "exposure", "comparison", "outcome"]
        }
      }
    },
    required: ["questions"]
  };

  return await callGeminiAPI(prompt, schema, statusContainer, {
    task: 'ideation',
    temperature: 0.3,
    maxRetries: 0,
    phaseLabel: `repairing ${flaggedCount} flagged item(s)…`
  });
};

/**
 * Rigor repair pass (extraction). Receives the extracted components and the
 * deterministic check failures; returns the corrected components object.
 */
export const callExtractionRepairAPI = async (question, studyType, peco, flags, statusContainer = null, ontologyGrounding = '') => {
  const defectReport = flags.map(f => `${f.code}${f.component ? ` (component: ${f.component})` : ''} — ${f.detail}`).join('\n');

  const prompt = `The PECO components extracted from the following question failed automated rigor checks.
Question: "${question}"
Intended study type: ${studyType}
Extracted components:
${JSON.stringify(peco, null, 2)}

Defects:
${defectReport}

Repair the flagged components ONLY. RULES:
${ontologyGrounding}
- ZERO HALLUCINATION: never introduce entities the question does not state; if a component cannot be repaired from the question, return "Not Specified" (or "Not Required" when the design lacks it).
- Commit to exactly one framing ("group_contrast", "dose_response", "association", or "descriptive") and keep the components consistent with it.
- An association question gets comparison "Not Required"; a comparative question needs a real control group (for experimental designs: vehicle control, untreated, placebo — "baseline" is a time point, not a group).
- Keep degree qualifiers from the question inside the components or the quantifiers so they are not lost.
- Quantile language belongs in the comparison axis, never inside the exposure.
- Doses belong in "quantifiers_and_modifiers", never embedded in the core entity fields.
${RIGOR_CONTRASTIVE_EXAMPLE}
Return ONLY valid JSON matching the schema.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      framing: { type: Type.STRING, enum: FRAMING_VALUES },
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
    required: ["framing", "population", "exposure", "comparison", "outcome", "quantifiers_and_modifiers"]
  };

  return await callGeminiAPI(prompt, schema, statusContainer, {
    task: 'extraction',
    temperature: 0.0,
    maxRetries: 0,
    phaseLabel: `repairing ${flags.length} flagged item(s)…`
  });
};

/**
 * Protocol Synthesiser (estimand-producing): rewrites the stored research
 * question from the components. Carries the framing commitment like every
 * estimand schema.
 */
export const callPecoSynthesizerAPI = async (peco, currentQuestion = null, framing = null) => {
  let instruction = `Synthesise a formal research question from these minimal components: ${JSON.stringify(peco)}.`;
  
  if (currentQuestion) {
      instruction = `UPDATE the following research question:\n"${currentQuestion}"\nUsing these updated structural components:\n${JSON.stringify(peco)}\nCRITICAL: You are UPDATING the question, not replacing it. Retain any nuanced context from the original question that does not conflict with the new components.`;
  }

  const prompt = `${instruction}
  
  CRITICAL LOGIC RULE: DELIMITERS. 
  - Terms separated by " & " indicate collective inclusion (logical AND). The statement must use "and", "in combination with", or "concurrently".
  - Terms separated by " ; " indicate alternatives (logical OR). The statement must use "or", "either", or "alternatively".
  
  INTELLECTUAL SYNTHESIS RULES:
  1. Produce a "semantic_statement" (the full protocol statement). Ensure the grammar strictly follows the AND (&) vs OR (;) logic.
  2. Produce a "naturalised_peco" object where each field is rewritten as a fluid scientific phrase reflecting the chosen delimiters.
  3. VERBATIM FIDELITY: You must retain the exact scientific wording provided in the components. DO NOT invent words or change scientific meanings (e.g., if a component is "expression", do not synthesize it as "concentration").
  ${FRAMING_RULE}
  ${framing ? `The intended framing is "${framing}" — the statement's language must be consistent with it.` : ''}
  ${RIGOR_CONTRASTIVE_EXAMPLE}

  No advisory fluff. Return JSON.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      semantic_statement: { type: Type.STRING },
      framing: { type: Type.STRING, enum: FRAMING_VALUES },
      naturalised_peco: {
        type: Type.OBJECT,
        properties: {
          population: { type: Type.STRING },
          exposure: { type: Type.STRING },
          comparison: { type: Type.STRING },
          outcome: { type: Type.STRING }
        },
        required: ["population", "exposure", "comparison", "outcome"]
      }
    },
    required: ["semantic_statement", "framing", "naturalised_peco"]
  };
  return await callGeminiAPI(prompt, schema, null, { task: 'synthesis' });
};

/**
 * Rigor repair pass (synthesis). Receives the synthesised statement and the
 * deterministic check failures; returns the corrected statement payload.
 * maxRetries 0 — fail fast, keep the original, surface the flags.
 */
export const callSynthesisRepairAPI = async (synth, currentQuestion = null, statusContainer = null, ontologyGrounding = '') => {
  const defectReport = (synth.validationFlags || []).map(f => `${f.code}${f.component ? ` (field: ${f.component})` : ''} — ${f.detail}`).join('\n');

  const prompt = `The research question you synthesised failed automated rigor checks.
${currentQuestion ? `Original question being updated:\n"${currentQuestion}"\n` : ''}
Synthesised output:
${JSON.stringify(synth, null, 2)}

Defects:
${defectReport}

Repair the flagged defects ONLY. RULES:
${ontologyGrounding}
- ZERO HALLUCINATION: never introduce entities the components do not state; if a field cannot be repaired from the components, return "Not Specified" (or "Not Required" when the framing lacks it).
- Commit to exactly one framing ("group_contrast", "dose_response", "association", or "descriptive") and make the statement's language consistent with it.
${RIGOR_CONTRASTIVE_EXAMPLE}
Return ONLY valid JSON matching the schema.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      semantic_statement: { type: Type.STRING },
      framing: { type: Type.STRING, enum: FRAMING_VALUES },
      naturalised_peco: {
        type: Type.OBJECT,
        properties: {
          population: { type: Type.STRING },
          exposure: { type: Type.STRING },
          comparison: { type: Type.STRING },
          outcome: { type: Type.STRING }
        },
        required: ["population", "exposure", "comparison", "outcome"]
      }
    },
    required: ["semantic_statement", "framing", "naturalised_peco"]
  };

  return await callGeminiAPI(prompt, schema, statusContainer, {
    task: 'synthesis',
    maxRetries: 0,
    phaseLabel: `repairing ${(synth.validationFlags || []).length} flagged item(s)…`
  });
};
