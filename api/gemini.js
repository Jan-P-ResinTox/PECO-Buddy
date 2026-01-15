import { GoogleGenAI, Type } from "@google/genai";
import { appState } from '../state.js';
import { extractJsonFromString, showError } from '../utils.js';

/**
 * Initialization of the Google GenAI SDK.
 */
const getAI = () => {
  const customKey = window.localStorage.getItem('PECO_BUDDY_CUSTOM_KEY');
  const apiKey = customKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key required. Please connect in Settings.");
  return new GoogleGenAI({ apiKey });
};

/**
 * Core API Wrapper with Deterministic Anchoring
 * seed: 42 - The global scientific constant for this application.
 * temperature: 0.1 - Low variance for high-precision extraction.
 */
export const callGeminiAPI = async (prompt, schema, statusContainer = null, config = {}) => {
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `You are a high-level Linguistic Professor and Domain Expert in Toxicology and Epidemiology, serving as a scientific co-author for the EBTC.
  
  PECO RULES:
  - Identify Population, Exposure, Comparison, and Outcome.
  - If a measurement site/matrix is mentioned (e.g. cord blood), wrap it in curly braces: {matrix:maternal blood}.
  - Use '&' for AND, ';' for OR within fields.
  - NEVER use HTML or CSS in the JSON strings.
  
  OUTPUT:
  - Return ONLY valid JSON matching the schema.
  - Use UK English spelling (e.g., 'fetal', 'haemoglobin').`;

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema || undefined,
        temperature: 0.1,
        seed: 42,
        ...config
      }
    });

    const text = result.text;
    if (!text) throw new Error("Empty response.");

    appState.interactionLog.push({
      timestamp: new Date().toISOString(),
      prompt,
      response: text
    });

    if (schema) {
      const jsonStr = extractJsonFromString(text);
      return JSON.parse(jsonStr);
    }
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    if (statusContainer) showError(statusContainer, error.message);
    throw error;
  }
};

/**
 * ENHANCED: Context Logic Engine
 * Performs high-level semantic deconstruction and terminology anchoring.
 */
export const callContextLogicEngineAPI = async (question) => {
  const prompt = `Perform a high-level scientific logic deconstruction of this research question: "${question}".
  
  Identify:
  1. The "Unit of Observation": The specific entity whose biology/status is measured for the outcome.
  2. The "Exposure Vehicle": The route/entity through which the exposure happens (e.g., mother in prenatal studies).
  3. "Species Context": Identify species (Human, Rat, Mouse, Zebrafish, etc.).
  4. "Term Anchors": Define the preferred, contextually appropriate term for the Unit of Observation based on Species and Life Stage.
     - Human + Prenatal/Birth -> Use 'Infants' or 'Children'.
     - Rodent + Prenatal/Birth -> Use 'Pups'.
     - Human + Pregnancy -> Use 'Pregnant Women'.
     - Zebrafish + Early Stage -> Use 'Larvae' or 'Embryos'.
  
  Return JSON with "unit_of_observation", "exposure_vehicle", "species_context", "preferred_population_term", "causal_logic".`;

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

export const callAdvancedIdeationAPI = async (scope, studyType, statusContainer, config = {}) => {
  const prompt = `Generate 3 distinct research questions for a ${studyType} based on: "${scope}". 
  Tag measurement sites as {matrix:...}. 
  Return JSON with "questions" array containing full_statement, population, exposure, comparison, outcome.`;

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

  return await callGeminiAPI(prompt, schema, statusContainer, config);
};

export const callDomainIdentifierAPI = async (text, contextLogic = null) => {
  const prompt = `Identify scientific domain and PECO concepts for: "${text}". 
  ${contextLogic ? `CRITICAL LOGIC FRAME: The study concerns ${contextLogic.species_context}. The unit of observation is ${contextLogic.unit_of_observation}. The exposure is mediated via ${contextLogic.exposure_vehicle}.` : ''}
  Tag matrices as {matrix:...}.`;
  
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
  const prompt = `Extract precise PECO for ${studyType} in ${domain}. 
  Text: "${fullText}". 
  ${contextLogic ? `
  MANDATORY CONSTRAINTS from Context Logic Engine:
  - SPECIES: ${contextLogic.species_context}
  - POPULATION TERM: You MUST use the term "${contextLogic.preferred_population_term}" for the Population field.
  - UNIT OF OBSERVATION: Only include the "${contextLogic.unit_of_observation}" in the population, NOT the exposure vehicle (${contextLogic.exposure_vehicle}).
  ` : ''}
  Tag matrices as {matrix:...}.`;
  
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
  return await callGeminiAPI(prompt, schema);
};

export const callQuestionQualityAPI = async (question, peco) => {
  const prompt = `Audit question: "${question}" with PECO components: ${JSON.stringify(peco)}.`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      missing_components: { type: Type.ARRAY, items: { type: Type.STRING } },
      ambiguities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            component: { type: Type.STRING },
            term: { type: Type.STRING },
            severity: { type: Type.STRING },
            reason: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["component", "term", "severity", "reason", "suggestions"]
        }
      }
    },
    required: ["strengths", "missing_components", "ambiguities"]
  };
  return await callGeminiAPI(prompt, schema);
};

export const callPecoSynthesizerAPI = async (peco) => {
  const prompt = `Synthesise a formal research question from: ${JSON.stringify(peco)}. Keep {matrix:...} tags.`;
  const schema = {
    type: Type.OBJECT,
    properties: { semantic_statement: { type: Type.STRING } },
    required: ["semantic_statement"]
  };
  return await callGeminiAPI(prompt, schema);
};