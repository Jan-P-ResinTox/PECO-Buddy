import { GoogleGenAI, Type } from "@google/genai";
import { extractJsonFromString, showError } from '../utils.js';

// Initialization using the mandatory SDK pattern
const getAI = () => {
  // Always check for a custom manually entered key first
  const customKey = window.localStorage.getItem('PECO_BUDDY_CUSTOM_KEY');
  const apiKey = customKey || process.env.API_KEY;
  return new GoogleGenAI({ apiKey });
};

export const callGeminiAPI = async (prompt, schema, statusContainer = null, config = {}) => {
  const ai = getAI();
  const modelName = 'gemini-3-flash-preview';

  const systemInstruction = `You are an expert scientific co-author for the Evidence-Based Toxicology Collaboration (EBTC).
  Your task is to facilitate rigorous research design using the PECO framework.
  
  LOGICAL GRAMMAR RULES:
  1. Use '&' to denote 'AND' / Co-existence.
  2. Use ';' to denote 'OR' / Alternatives.
  
  CONTEXTUAL RIGOR RULES:
  - DISTINGUISH AGENT FROM MATRIX: "Lead" is the exposure. "Cord blood" is the measurement matrix. 
  - PROHIBITED POPULATION: NEVER list a biological matrix (Blood, Urine, Cord, Serum, Tissues) as the 'Population' or 'Subject'.
  - Measurement matrices must be noted in parentheses within the Exposure or Outcome field if relevant, e.g., "Lead (measured in: cord blood)".
  - If multiple measurement matrices are alternatives, preserve the "OR" logic using ';'.
  
  RESPONSE RULES:
  - ALWAYS respond in valid JSON matching the provided schema.
  - Focus strictly on scientific validity and methodological rigour. Use UK English spelling throughout (e.g., analyse, synthesise, authorised, organisation, colour).`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema || undefined,
        temperature: 0.1, 
        seed: 42,
        ...config
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from AI.');
    
    if (schema) {
      return JSON.parse(extractJsonFromString(text));
    }
    return text;
  } catch (error) {
    if (statusContainer) showError(statusContainer, error.message);
    throw error;
  }
};

export const callAdvancedIdeationAPI = async (scope, studyType, statusContainer) => {
  const prompt = `Generate 3 research questions for a ${studyType} based on: "${scope}".
  Ensure high precision. Distinguish between the exposure agent and the method of measurement (matrix).
  Return JSON with questions array containing full_statement, population, exposure, comparison, outcome. Use UK English spelling for all output.`;

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

  return await callGeminiAPI(prompt, schema, statusContainer);
};

export const callDomainIdentifierAPI = async (text, statusContainer) => {
  const prompt = `Identify scientific domain and raw PECO concepts: "${text}".`;
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
  return await callGeminiAPI(prompt, schema, statusContainer);
};

export const callSpecialistPecoExtractorAPI = async (domain, prelim, fullText, studyType, statusContainer) => {
  const prompt = `Refine PECO components for a ${studyType} in ${domain}. 
  Context: "${fullText}". 
  AGENT vs MATRIX: Identify the chemical/agent (e.g. Lead) as the exposure. Identify the matrix (e.g. Cord blood) only as a descriptor of where it is measured.
  NEVER put a measurement matrix in the population field.
  Use ';' for alternative measurement options. Use UK English spelling.`;
  
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
  return await callGeminiAPI(prompt, schema, statusContainer);
};

export const callQuestionQualityAPI = async (question, peco, statusContainer) => {
  const prompt = `Peer review this research question: "${question}" using its PECO components: ${JSON.stringify(peco)}.
  
  AUDIT RULES:
  1. LOGICAL OPERATORS: Do NOT flag ';' (OR) or '&' (AND) as ambiguity. They are signs of scientific precision.
  2. AGENT CHECK: If the exposure field ONLY contains a matrix (e.g. "Umbilical cord blood") without an agent (e.g. "Lead"), flag it as a missing exposure agent.
  3. COMPONENT CHECK: If a component has text, it is NOT missing. Only return a component in 'missing_components' if it is truly empty.
  
  Return JSON with strengths, missing_components, and ambiguities. Use UK English spelling.`;

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
  return await callGeminiAPI(prompt, schema, statusContainer);
};

export const callPecoSynthesizerAPI = async (peco) => {
  const prompt = `Synthesise one formal scientific research question using strictly: ${JSON.stringify(peco)}.
  RULES: 
  - Convert '&' into the word "and".
  - Convert ';' into the word "or".
  - Ensure the distinction between measurement matrices and agents is preserved (e.g., "...measured via umbilical cord blood or maternal blood...").
  - Use formal EBTC publication style with UK English spelling.
  Example: "Exposure: Lead (measured in: cord blood ; maternal blood)" should become "...exposure to lead, measured via maternal blood or umbilical cord blood..."`;
  
  const schema = {
    type: Type.OBJECT,
    properties: { semantic_statement: { type: Type.STRING } },
    required: ["semantic_statement"]
  };
  return await callGeminiAPI(prompt, schema);
};