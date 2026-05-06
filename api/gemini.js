import { GoogleGenAI, Type } from "@google/genai";
import { appState } from '../state.js';
import { extractJsonFromString } from '../utils.js';
import { showModal } from '../components/modal.js';

const displayErrorModal = (error, statusContainer) => {
    if (statusContainer) {
        statusContainer.innerHTML = `<div class="p-4 text-rose-600 text-sm font-bold text-center">Error occurred. Check popup for details.</div>`;
    }
    const message = error.message.toLowerCase();
    
    let tip = "Unknown error occurred.";
    if (message.includes("failed to parse") || message.includes("failed to extract json")) {
        tip = "The AI generated text but not in the required JSON format. Usually trying again fixes this immediately.";
    } else if (message.includes("4xx") || message.includes("401") || message.includes("403") || message.includes("api key")) {
        tip = "There seems to be an issue with your API key or permissions (Client error - 4xx). Check your settings and try again.";
    } else if (message.includes("5xx") || message.includes("500") || message.includes("502") || message.includes("503")) {
        tip = "The AI provider's server is currently failing (Server fault - 5xx). Try again in a few moments.";
    } else if (message.includes("empty response")) {
        tip = "The AI returned an empty response. Try running the function again.";
    }

    const content = `
        <div class="modal-body space-y-4">
            <div class="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex flex-col items-center text-center">
                <i class="fa-solid fa-triangle-exclamation text-4xl text-rose-500 mb-4"></i>
                <h3 class="text-xl font-bold text-slate-800 mb-2">Operation Failed</h3>
                <p class="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">${error.message}</p>
                <div class="w-full bg-white p-4 rounded-xl border border-rose-100 shadow-sm text-slate-700 text-sm font-medium">
                    <span class="font-bold text-rose-700 block mb-1">Tip:</span>
                    ${tip}
                </div>
            </div>
        </div>
    `;
    showModal('System Exception', content, false);
};

/**
 * Core API Wrapper supporting multi-provider dispatch.
 */
export const callGeminiAPI = async (prompt, schema, statusContainer = null, config = {}) => {
  const provider = appState.aiProvider || 'gemini';
  const MAX_RETRIES = 2; // Up to 3 total attempts
  
  const invokeProvider = async () => {
      if (provider === 'gemini') {
          return await callGoogleGemini(prompt, schema, statusContainer, config);
      } else if (provider === 'openai') {
          return await callOpenAIAndPerplexity(prompt, schema, statusContainer, config, 'openai');
      } else if (provider === 'perplexity') {
          return await callOpenAIAndPerplexity(prompt, schema, statusContainer, config, 'perplexity');
      } else if (provider === 'anthropic') {
          return await callAnthropic(prompt, schema, statusContainer, config);
      } else {
          return await callOpenAICompatible(prompt, schema, statusContainer, config);
      }
  };

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
          return await invokeProvider();
      } catch (error) {
          const isParseError = error.message && error.message.toLowerCase().includes('parse');
          const isExtractError = error.message && error.message.toLowerCase().includes('extract json');
          
          if (schema && (isParseError || isExtractError) && attempt <= MAX_RETRIES) {
              console.warn(`[Attempt ${attempt}/${MAX_RETRIES + 1}] Failed to parse JSON. Retrying...`, error);
              // Small delay before retrying
              await new Promise(res => setTimeout(res, 500));
              continue;
          }
          
          displayErrorModal(error, statusContainer);
          throw error;
      }
  }
};

/**
 * Implementation for Google Gemini (Official SDK)
 */
async function callGoogleGemini(prompt, schema, statusContainer, config) {
  const modelName = 'gemini-3-flash-preview';
  const h = appState.heuristics;
  const isAudit = config.task === 'audit';
  const isExtraction = config.task === 'extraction';
  const isSynthesis = config.task === 'synthesis';
  const isIdeation = config.task === 'ideation';
  
  const heuristicsBlock = (isAudit) ? `
  APPLIED HEURISTICS (FOR ADVISORY CRITIQUE):
  - COMPARATOR: ${h.comparator}
  - EXPOSURE: ${h.exposure}
  - POPULATION: ${h.population}
  - OUTCOME: ${h.outcome}
  
  ADVISORY TONE: Your tone is that of a world-class, constructive Linguistic Professor and Toxicology expert. Use encouraging but rigorous phrasing.` : '';

  const systemInstruction = `You are a world-class Linguistic Professor and Domain Expert in Toxicology and Epidemiology for the EBTC. Your persona is the PECO-Buddy Public Beta 0.1.1. Your specialty is ensuring scientific precision through semantic clarity.
  
  CRITICAL: LINGUISTIC SYNTAX RULE (MANDATORY)
  You MUST identify measurement sites, biological matrices, or vehicles and tag them using the {matrix:connector:term} syntax.
  Connectors: 'in', 'via', 'within', 'across', 'from'.
  Example: {matrix:in:maternal blood}, {matrix:via:cord blood}, {matrix:within:hepatocytes}.
  Ensure natural spaces exist BEFORE and AFTER any {matrix:...} tag.

  ${heuristicsBlock}

  TASK CONTEXT:
  ${isExtraction ? 'You are an Extraction Engine. Extract DISCRETE Minimal Conceptual Units. CRITICAL: Include specific parameters if present.' : ''}
  ${isAudit ? 'You are an Augmented Intelligence Auditor. Your goal is REDUCING AMBIGUITY. Critique the input.' : ''}
  ${isSynthesis ? 'Synthesise components into a formal research question. No advisory fluff.' : ''}
  ${isIdeation ? 'Generate distinct research questions based on scope.' : ''}
  
  OUTPUT:
  - Return ONLY valid JSON matching the schema if requested.
  - Use UK English spelling.`;

  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("You must open settings and enter your API-Key to proceed.");

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema || undefined,
        temperature: config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0),
        ...(config.seed ? { seed: config.seed } : {}),
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from the intelligence engine.");

    appState.interactionLog.push({
      timestamp: new Date().toISOString(),
      provider: 'Google Gemini',
      prompt,
      response: text
    });

    if (schema) {
      const jsonStr = extractJsonFromString(text);
      if (!jsonStr) throw new Error("Failed to parse structural response.");
      return JSON.parse(jsonStr);
    }
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
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
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Public Beta 0.1.1).
    CRITICAL SYNTAX: Identify measurement sites/matrices and tag them like {matrix:in:maternal blood}.
    ${heuristicsBlock}`;

    // Append JSON instruction strongly if schema is present, as generic endpoints might not support response_format strictness
    if (schema) {
        systemPrompt += `\n\nIMPORTANT: You must output ONLY valid JSON. No markdown, no preambles.`;
    }

    try {
        const payload = {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0),
            // Try to force JSON mode if supported by the provider, but many local models ignore this param or fail if unknown
            // response_format: schema ? { type: "json_object" } : undefined 
        };

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Provider Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("Empty response from AI Provider.");

        appState.interactionLog.push({
            timestamp: new Date().toISOString(),
            provider: `OpenAI Compatible (${model})`,
            prompt,
            response: content
        });

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
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Public Beta 0.1.1).
    CRITICAL SYNTAX: Identify measurement sites/matrices and tag them like {matrix:in:maternal blood}.
    ${heuristicsBlock}`;

    if (schema) {
        systemPrompt += `\n\nIMPORTANT: You must output ONLY valid JSON. No markdown, no preambles.`;
    }

    try {
        const payload = {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0),
        };

        // OpenAI supports response_format: { type: "json_object" } (mostly)
        if (schema && !isPerplexity) {
            payload.response_format = { type: "json_object" };
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`${isPerplexity ? 'Perplexity' : 'OpenAI'} Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
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
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Public Beta 0.1.1).
    CRITICAL SYNTAX: Identify measurement sites/matrices and tag them like {matrix:in:maternal blood}.
    ${heuristicsBlock}`;

    if (schema) {
        systemPrompt += `\n\nIMPORTANT: You must return ONLY raw JSON matching the requested structure. No conversational filler, no markdown blocks.`;
        // Claude performs best when given a prefill of "{"
    }

    try {
        const payload = {
            model: model,
            system: systemPrompt,
            messages: [
                { role: "user", content: prompt }
            ],
            max_tokens: 4096,
            temperature: config.temperature !== undefined ? config.temperature : (appState.autonomyLevel || 0.0),
        };

        if (schema) {
            payload.messages.push({ role: "assistant", content: "{" });
        }

        // We use a CORS proxy or rely on anthropic's direct web SDK integration if possible.
        // NOTE: Anthropic's API does not support direct browser calls without headers bypassing CORS securely.
        // We use anthropic's official 'anthropic-version' header, and if they have CORS enabled on it, we use it directly:
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Anthropic Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
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
 * Quick Suggestion Engine (Ideation)
 */
export const callAdvancedIdeationAPI = async (scope, studyType, statusContainer, config = {}) => {
  let depthInstructions = "";
  if (studyType.toLowerCase().includes("systematic review")) {
      depthInstructions = "- SYSTEMATIC REVIEW RULE: Questions MUST be broad, synthesizing associations or overarching comparative effectiveness across multiple contexts. Avoid overly specific doses, times, or single-strain models which restrict a literature search.";
  } else if (studyType.toLowerCase().includes("animal") || studyType.toLowerCase().includes("in vitro")) {
      depthInstructions = `- EXPERIMENTAL (PRIMARY) RULE: For ${studyType}, the questions must strictly adhere to the PECO framework to prevent "wild-west" variables. Be highly precise regarding intended populations (models/strains/cells), exposures (doses/chemicals), comparators (vehicles/controls), and mechanistic outcomes.`;
  } else {
      depthInstructions = `- METHODOLOGY ALIGNMENT (PRIMARY STUDY): For ${studyType}, align the precision with typical epidemiological or clinical observational standards, mapping variables strictly to the PECO framework (Population, Exposure, Comparator, Outcome) wherever logically applicable to reduce reporting variability.`;
  }

  const prompt = `Generate 3 DISTINCT research questions for a ${studyType} based strictly on: "${scope}". 
  CRITICAL IDEATION RULES:
  - ZERO HALLUCINATION: DO NOT invent or add new scientific components (like a new exposure or outcome variable) if they are not present in the user's scope.
  - HIGH VARIATION VIA SYNONYMS: You MUST produce 3 questions that feel distinct from each other. Actively use scientifically valid synonyms (e.g., "elevated prenatal exposure" -> "high maternal levels", "intelligence" -> "cognitive development") and vary the sentence structure. The core scientific parameters must remain faithful to the original text without introducing unrelated concepts.
  - If the user's scope lacks a comparator, the generated "full_statement" MUST NOT contain one.
  - MISSING COMPONENTS: For the structured output (population, exposure, comparison, outcome): If a component is missing, output "Not Specified" (if the study type typically requires it) or "Not Required" (if the study design inherently lacks it, e.g., descriptive or associative studies). DO NOT invent terms like "lower quartiles" unless the user explicitly provided them.
  - Each "full_statement" MUST be a direct research question ending with a question mark (e.g. "What is the effect of prenatal lead exposure on...?", "Does X cause Y?").
  - DO NOT use conversational or advisory phrasing like "Have you considered", "One thought is", or "Could it be useful to".
  - Use linguistic matrix tags {matrix:connector:term} for biological samples.
  ${depthInstructions}
  Return JSON with a "questions" array containing: full_statement, population, exposure, comparison, outcome.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            full_statement: { type: Type.STRING },
            population: { type: Type.STRING },
            exposure: { type: Type.STRING },
            comparison: { type: Type.STRING },
            outcome: { type: Type.STRING }
          },
          required: ["full_statement", "population", "exposure", "comparison", "outcome"]
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
export const callQuestionQualityAPI = async (question, peco, statusContainer, config = {}) => {
  
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
  Generate 5 to 6 distinct advisory cards per PECO component.
  
  ${guidanceInstruction}
  ${frozenInstruction}
  ${depthInstruction}

  CRITICAL ADVISORY RULES FOR AMBIGUITY REDUCTION:
  - "refined_term": Must be a single Minimal Conceptual Unit (e.g. "Sprague-Dawley Rats", "Lead acetate 10mg/kg", "IQ scores at 24 months"). 
  - PREFER specific parameters (doses, concentrations, timeframes, specific strains) over broad categories.
  - "advisory_message": ${isFast ? "Briefly state why this refinement is better." : "Provide a detailed, elaborate scientific justification (3-5 sentences). Explain exactly how the refined term reduces ambiguity and why the current term is linguistically or scientifically unresolved."}
  - "counter_consideration": ${isFast ? "Leave this empty or provide a very brief 1-sentence note." : "Explain why this suggestion might NOT be appropriate in certain contexts or how it might inadvertently limit the scope or quality if applied incorrectly."}
  - Tone: Humble and advisory. Use phrases like "Could it be better if...", "Have you considered...", "If you are looking for [x], then [y] could improve [z]". Avoid deterministic or commanding language.
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
  return await callGeminiAPI(prompt, schema, statusContainer, { ...config, task: 'audit' });
};

export const callContextLogicEngineAPI = async (question) => {
  const prompt = `Perform logic deconstruction for: "${question}". Return JSON with unit_of_observation, exposure_vehicle, species_context, preferred_population_term, causal_logic. Suggest matrix tags.`;
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

export const callSpecialistPecoExtractorAPI = async (domain, prelim, fullText, studyType, contextLogic = null, truthAnchor = null) => {
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
  - Use matrix tags {matrix:connector:term} for biological samples.
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
  return await callGeminiAPI(prompt, schema, null, { task: 'extraction', temperature: 0.0 });
};

export const callPecoSynthesizerAPI = async (peco, currentQuestion = null) => {
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

  No advisory fluff. Return JSON.`;

  const schema = {
    type: Type.OBJECT,
    properties: { 
      semantic_statement: { type: Type.STRING },
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
    required: ["semantic_statement", "naturalised_peco"]
  };
  return await callGeminiAPI(prompt, schema, null, { task: 'synthesis' });
};

export const callEligibilitySuggesterAPI = async (peco, statusContainer) => {
  const prompt = `Based on the following PECO components, generate a list of 5 inclusion criteria and 5 exclusion criteria for a systematic review protocol.
  Population: ${peco.population}
  Exposure: ${peco.exposure}
  Comparison: ${peco.comparison}
  Outcome: ${peco.outcome}
  
  Return JSON with "inclusion_criteria" (array of strings) and "exclusion_criteria" (array of strings).`;
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      inclusion_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
      exclusion_criteria: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["inclusion_criteria", "exclusion_criteria"]
  };
  
  return await callGeminiAPI(prompt, schema, statusContainer, { task: 'ideation' });
};