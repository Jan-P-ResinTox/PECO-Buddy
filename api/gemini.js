import { GoogleGenAI, Type } from "@google/genai";
import { appState } from '../state.js';
import { extractJsonFromString, showError } from '../utils.js';

/**
 * Core API Wrapper supporting multi-provider dispatch.
 */
export const callGeminiAPI = async (prompt, schema, statusContainer = null, config = {}) => {
  // Use settings-defined provider or default to Gemini
  const provider = appState.aiProvider || 'gemini';

  if (provider === 'gemini') {
      return await callGoogleGemini(prompt, schema, statusContainer, config);
  } else {
      return await callOpenAICompatible(prompt, schema, statusContainer, config);
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

  const systemInstruction = `You are a world-class Linguistic Professor and Domain Expert in Toxicology and Epidemiology for the EBTC. Your persona is the PECO-Buddy Public Beta 0.1. Your specialty is ensuring scientific precision through semantic clarity.
  
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
        temperature: config.temperature || 0.1,
        seed: config.seed || 42,
        ...config
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
    if (statusContainer) showError(statusContainer, error.message);
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
    
    let systemPrompt = `You are a world-class Linguistic Professor and Domain Expert in Toxicology for the EBTC (PECO-Buddy Public Beta 0.1).
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
            temperature: config.temperature || 0.1,
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
        if (statusContainer) showError(statusContainer, `AI Provider Error: ${error.message}`);
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
  const prompt = `Generate 3 research questions for a ${studyType} based on: "${scope}". 
  CRITICAL:
  - Each "full_statement" MUST be a direct research question ending with a question mark (e.g. "What is the effect of prenatal lead exposure on...?", "Does X cause Y?").
  - DO NOT use conversational or advisory phrasing like "Have you considered", "One thought is", or "Could it be useful to".
  - Use linguistic matrix tags {matrix:connector:term} for biological samples.
  - IMPORTANT: Keep the research questions broad and slightly less specific. They should serve as a starting point for ideation, not a fully refined and highly sophisticated protocol. Leave room for the researcher to specify the exact population, exposure levels, and specific outcomes later.
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

export const callSpecialistPecoExtractorAPI = async (domain, prelim, fullText, studyType, contextLogic = null) => {
  const prompt = `Identify and extract DISCRETE Minimal Conceptual Units for each PECO component from: "${fullText}".
  
  CRITICAL EXTRACTION RULES (AMBIGUITY REDUCTION):
  - Extract parameters if available (doses, concentrations, specific age ranges, durations).
  - Example Population: "Pregnant Wistar Rats" instead of "Rats".
  - Example Exposure: "Deltamethrin 5mg/kg/day" instead of "Pesticide".
  - Align with ontology standards (MeSH, EBI).
  - Use matrix tags {matrix:connector:term} for biological samples.
  - Return JSON.`;

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
  return await callGeminiAPI(prompt, schema, null, { task: 'extraction' });
};

export const callPecoSynthesizerAPI = async (peco) => {
  const prompt = `Synthesise a formal research question from these minimal components: ${JSON.stringify(peco)}.
  
  CRITICAL LOGIC RULE: DELIMITERS. 
  - Terms separated by " & " indicate collective inclusion (logical AND). The statement must use "and", "in combination with", or "concurrently".
  - Terms separated by " ; " indicate alternatives (logical OR). The statement must use "or", "either", or "alternatively".
  
  INTELLECTUAL SYNTHESIS RULES:
  1. Produce a "semantic_statement" (the full protocol statement). Ensure the grammar strictly follows the AND (&) vs OR (;) logic.
  2. Produce a "naturalised_peco" object where each field is rewritten as a fluid scientific phrase reflecting the chosen delimiters.
  
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