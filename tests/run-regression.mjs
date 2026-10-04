/**
 * Regression runner for the deterministic rigor layer and the rendering
 * utilities it guards. Every case in regression.json documents a defect that
 * previously reached a user. Run: npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  validateQuestion, validateComponents, validateAdvisoryAnalysis, validateSynthesis,
  attachFlags, resolveIdeationRepair, resolveComponentRepair, resolveSynthesisRepair,
  ESTIMAND_FRAMING_VALUES
} from '../validation.js';
import {
  normaliseTerm, isAnchorableTerm, parseMeshLookup, selectAnchor, createMeshClient,
  createAnchorRegistry, anchorTerms, setUserOverride, anchorChipHtml, getTerminologyLink,
  buildExportAnchors, attachAnchor, splitPecoTerms
} from '../terminology.js';
import { buildDraft, parseDraftPayload, applyDraft } from '../session.js';
import { safeStorage } from '../state.js';
import { attachFlags as attachFlagsForSession } from '../validation.js';
import { styleMatrices, stripMatrixTags, escapeHtml, extractJsonFromString, formatPecoForDisplay } from '../utils.js';
import { appState } from '../state.js';
import { normalizeAdvisoryAnalysis, findComponentFeedback } from '../views/pecoToolkit.js';

const here = dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(readFileSync(join(here, 'regression.json'), 'utf8'));

let passed = 0;
const failures = [];

const fail = (id, reason) => failures.push({ id, reason });

for (const c of suite.cases) {
  let ok = true;
  let reason = '';
  try {
    switch (c.kind) {
      case 'matrix': {
        appState.matrixTagging = c.taggingOn ? true : false;
        const rendered = styleMatrices(c.input, 'display');
        for (const needle of c.mustContain || []) if (!rendered.includes(needle)) { ok = false; reason = `missing "${needle}" in: ${rendered}`; }
        for (const needle of c.mustNotContain || []) if (rendered.includes(needle)) { ok = false; reason = `forbidden "${needle}" in: ${rendered}`; }
        appState.matrixTagging = true; // restore default
        break;
      }
      case 'strip': {
        const out = stripMatrixTags(c.input);
        if (out !== c.mustEqual) { ok = false; reason = `got "${out}", expected "${c.mustEqual}"`; }
        break;
      }
      case 'advisory-strings': {
        const n = normalizeAdvisoryAnalysis(JSON.parse(JSON.stringify(c.input)));
        const count = n?.feedback?.[0]?.suggestions?.length ?? 0;
        if (count !== c.expectSuggestions) { ok = false; reason = `coerced ${count} suggestions, expected ${c.expectSuggestions}`; }
        break;
      }
      case 'advisory-merge':
      case 'advisory-keyed': {
        const n = normalizeAdvisoryAnalysis(JSON.parse(JSON.stringify(c.input)));
        const merged = findComponentFeedback(n.feedback, 'population');
        const terms = (merged?.suggestions || []).map(s => s.refined_term);
        const same = JSON.stringify(terms) === JSON.stringify(c.expectTerms);
        if (!same) { ok = false; reason = `merged [${terms}], expected [${c.expectTerms}]`; }
        break;
      }
      case 'validate-question': {
        const flags = validateQuestion(c.input.question, c.input.studyType);
        const codes = flags.map(f => f.code);
        if (c.expectCodes.length === 0) {
          if (flags.length > 0) { ok = false; reason = `clean case flagged: [${codes}]`; }
        } else {
          for (const code of c.expectCodes) if (!codes.includes(code)) { ok = false; reason = `missing flag "${code}", got [${codes}]`; }
        }
        break;
      }
      case 'validate-components': {
        const flags = validateComponents(c.input.peco, c.input.question, c.input.studyType, c.input.framing ?? null);
        const codes = flags.map(f => f.code);
        if (c.expectCodes.length === 0) {
          if (flags.length > 0) { ok = false; reason = `clean case flagged: [${codes}]`; }
        } else {
          for (const code of c.expectCodes) if (!codes.includes(code)) { ok = false; reason = `missing flag "${code}", got [${codes}]`; }
        }
        break;
      }
      case 'validate-advisory': {
        const flags = validateAdvisoryAnalysis(JSON.parse(JSON.stringify(c.input)));
        const codes = flags.map(f => f.code);
        for (const code of c.expectCodes) if (!codes.includes(code)) { ok = false; reason = `missing flag "${code}", got [${codes}]`; }
        if (c.expectCodes.length === 0 && flags.length > 0) { ok = false; reason = `clean case flagged: [${codes}]`; }
        break;
      }
      case 'validate-synthesis': {
        const flags = validateSynthesis(JSON.parse(JSON.stringify(c.input)));
        const codes = flags.map(f => f.code);
        for (const code of c.expectCodes) if (!codes.includes(code)) { ok = false; reason = `missing flag "${code}", got [${codes}]`; }
        if (c.expectCodes.length === 0 && flags.length > 0) { ok = false; reason = `clean case flagged: [${codes}]`; }
        break;
      }
      case 'framing-enum': {
        if (JSON.stringify(ESTIMAND_FRAMING_VALUES) !== JSON.stringify(c.expectValues)) {
          ok = false; reason = `enum [${ESTIMAND_FRAMING_VALUES}] != [${c.expectValues}]`;
        }
        break;
      }
      case 'attach-flags': {
        const obj = JSON.parse(JSON.stringify(c.input));
        attachFlags(obj, c.flags);
        if (!Array.isArray(obj.validationFlags) || obj.validationFlags.length !== c.flags.length) {
          ok = false; reason = 'flags not readable on the payload';
        }
        const serialised = JSON.stringify(obj);
        if (serialised.includes('validationFlags')) {
          ok = false; reason = `flags persisted through serialisation: ${serialised}`;
        }
        if (Object.keys(obj).includes('validationFlags')) {
          ok = false; reason = 'flags attached as an ENUMERABLE property';
        }
        break;
      }
      case 'resolve-repair': {
        const input = JSON.parse(JSON.stringify(c.input));
        let result;
        if (c.mode === 'ideation') {
          result = resolveIdeationRepair(input.original, input.repaired, input.studyType);
        } else if (c.mode === 'components') {
          result = resolveComponentRepair(input.original, input.repaired, input.question, input.studyType, input.framing ?? null);
        } else if (c.mode === 'synthesis') {
          result = resolveSynthesisRepair(input.original, input.repaired);
        } else {
          ok = false; reason = `unknown repair mode "${c.mode}"`; break;
        }
        if (result.applied !== c.expectApplied) {
          ok = false; reason = `applied=${result.applied}, expected ${c.expectApplied}`;
        }
        break;
      }
      case 'escape': {
        const out = escapeHtml(c.input);
        if (out !== c.mustEqual) { ok = false; reason = `got "${out}", expected "${c.mustEqual}"`; }
        break;
      }
      case 'json-extract': {
        const jsonStr = extractJsonFromString(c.input);
        let parsed = null;
        try { parsed = jsonStr ? JSON.parse(jsonStr) : null; } catch (_) {}
        if (JSON.stringify(parsed) !== JSON.stringify(c.expectObject)) {
          ok = false; reason = `extracted ${JSON.stringify(parsed)}`;
        }
        break;
      }
      case 'peco-display': {
        const rendered = formatPecoForDisplay(c.input, false);
        for (const needle of c.mustContain) if (!rendered.includes(needle)) { ok = false; reason = `missing "${needle}" in: ${rendered}`; }
        break;
      }
      case 'anchor-normalise': {
        const out = normaliseTerm(c.input);
        if (out !== c.mustEqual) { ok = false; reason = `normalised to "${out}", expected "${c.mustEqual}"`; }
        for (const [term, expected] of c.anchorable || []) {
          if (isAnchorableTerm(term) !== expected) { ok = false; reason = `isAnchorableTerm("${term}") = ${!expected ? 'false' : 'true'}, expected ${expected}`; }
        }
        break;
      }
      case 'anchor-parse': {
        const candidates = parseMeshLookup(JSON.parse(JSON.stringify(c.input)));
        const codes = candidates.map(x => x.code);
        const systems = candidates.map(x => x.system);
        const displays = candidates.map(x => x.display);
        if (JSON.stringify(codes) !== JSON.stringify(c.expectCodes)) { ok = false; reason = `codes [${codes}]`; }
        if (JSON.stringify(systems) !== JSON.stringify(c.expectSystems)) { ok = false; reason = `systems [${systems}]`; }
        if (JSON.stringify(displays) !== JSON.stringify(c.expectDisplays)) { ok = false; reason = `displays [${displays}]`; }
        break;
      }
      case 'anchor-select': {
        const entry = selectAnchor(c.input.term, c.input.candidates);
        if (entry.state !== c.expectState) { ok = false; reason = `state ${entry.state}, expected ${c.expectState}`; }
        if (c.expectCode && entry.anchor?.code !== c.expectCode) { ok = false; reason = `anchor ${entry.anchor?.code}, expected ${c.expectCode}`; }
        if (c.expectTopCode && entry.candidates?.[0]?.code !== c.expectTopCode) { ok = false; reason = `top candidate ${entry.candidates?.[0]?.code}, expected ${c.expectTopCode}`; }
        break;
      }
      case 'anchor-resolve': {
        const fetchCalls = [];
        const fetchImpl = c.input.fail
          ? async () => { fetchCalls.push(1); throw new Error('network down'); }
          : async (url) => {
              fetchCalls.push(1);
              const label = decodeURIComponent(String(url).match(/label=([^&]*)/)?.[1] || '');
              const payload = label === 'children'
                ? [{ resource: 'http://id.nlm.nih.gov/mesh/D007223', label: 'children' }]
                : [];
              return { ok: true, json: async () => payload };
            };
        const client = createMeshClient({ fetchImpl, timeoutMs: 1000 });
        const registry = createAnchorRegistry();
        const uniqueTerms = [...new Set(c.input.terms)];
        await anchorTerms(uniqueTerms, { client, registry });
        if (c.input.callTwice) await anchorTerms(uniqueTerms, { client, registry });
        const countAfterFirst = fetchCalls.length;
        if (c.input.callTwice && fetchCalls.length !== c.expectFetchCount) {
          ok = false; reason = `${fetchCalls.length} fetch calls after second resolve, expected ${c.expectFetchCount}`;
        }
        for (const [term, expected] of Object.entries(c.expectStates || {})) {
          const entry = registry.get(term);
          if (entry?.state !== expected) { ok = false; reason = `registry["${term}"].state = ${entry?.state}, expected ${expected}`; }
        }
        if (!c.input.callTwice && countAfterFirst === undefined) { /* no-op */ }
        break;
      }
      case 'anchor-override': {
        const registry = createAnchorRegistry();
        setUserOverride(registry, c.input.term);
        const entry = registry.get(c.input.term);
        if (entry?.state !== c.expectState) { ok = false; reason = `state ${entry?.state}, expected ${c.expectState}`; }
        if (c.mustPersist) {
          const serialised = JSON.stringify(entry);
          if (!serialised.includes('"user_defined"')) { ok = false; reason = `override did not persist through serialisation: ${serialised}`; }
        }
        break;
      }
      case 'anchor-link': {
        const out = getTerminologyLink(c.input.system, c.input.code);
        if (out !== c.mustEqual) { ok = false; reason = `got "${out}", expected "${c.mustEqual}"`; }
        break;
      }
      case 'anchor-chip': {
        const anchoredHtml = anchorChipHtml(c.input.anchored);
        for (const needle of c.anchoredMustContain) if (!anchoredHtml.includes(needle)) { ok = false; reason = `anchored chip missing "${needle}": ${anchoredHtml}`; }
        const unanchoredHtml = anchorChipHtml(c.input.unanchored);
        for (const needle of c.unanchoredMustContain) if (!unanchoredHtml.includes(needle)) { ok = false; reason = `unanchored chip missing "${needle}": ${unanchoredHtml}`; }
        const userHtml = anchorChipHtml(c.input.userDefined);
        for (const needle of c.userDefinedMustContain) if (!userHtml.includes(needle)) { ok = false; reason = `user-defined chip missing "${needle}": ${userHtml}`; }
        if (anchorChipHtml(undefined) !== '') { ok = false; reason = 'unknown entry must render no chip'; }
        break;
      }
      case 'anchor-export': {
        const registry = createAnchorRegistry();
        for (const entry of c.input.registry) registry.set(entry);
        const exported = buildExportAnchors(c.input.terms, registry);
        if (JSON.stringify(exported) !== JSON.stringify(c.expectExport)) { ok = false; reason = `got ${JSON.stringify(exported)}`; }
        break;
      }
      case 'anchor-split': {
        const out = splitPecoTerms(c.input);
        if (JSON.stringify(out) !== JSON.stringify(c.mustEqual)) { ok = false; reason = `got ${JSON.stringify(out)}`; }
        break;
      }
      case 'anchor-plural': {
        const requested = [];
        const fetchImpl = async (url) => {
          const label = decodeURIComponent(String(url).match(/label=([^&]*)/)?.[1] || '');
          requested.push(label);
          return { ok: true, json: async () => c.input.fetches[label] || [] };
        };
        const client = createMeshClient({ fetchImpl, timeoutMs: 1000 });
        const candidates = await client.lookup(c.input.term);
        if (JSON.stringify(requested) !== JSON.stringify(c.expectRequested)) {
          ok = false; reason = `requested [${requested}], expected [${c.expectRequested}]`;
        }
        const entry = selectAnchor(c.input.term, candidates);
        if (entry.state !== c.expectState) { ok = false; reason = `state ${entry.state}, expected ${c.expectState}`; }
        const code = c.expectTopCode ? entry.candidates?.[0]?.code : entry.anchor?.code;
        if (c.expectTopCode && entry.candidates?.[0]?.code !== c.expectTopCode) { ok = false; reason = `top candidate ${entry.candidates?.[0]?.code}`; }
        if (c.expectCode && entry.anchor?.code !== c.expectCode) { ok = false; reason = `anchor ${entry.anchor?.code}, expected ${c.expectCode}`; }
        break;
      }
      case 'attach-anchor': {
        const obj = JSON.parse(JSON.stringify(c.input));
        attachAnchor(obj, c.anchor);
        const serialised = JSON.stringify(obj);
        if (!serialised.includes('D007223')) { ok = false; reason = `anchor not serialised: ${serialised}`; }
        if (obj.ontology_anchor?.code !== 'D007223') { ok = false; reason = 'anchor not readable on the payload'; }
        break;
      }
      case 'safe-storage': {
        // In Node, window.localStorage is absent — safeStorage must be the
        // in-memory fallback and behave like storage, never throw.
        safeStorage.setItem(c.input.key, c.input.value);
        if (safeStorage.getItem(c.input.key) !== c.input.value) { ok = false; reason = 'fallback getItem returned ' + safeStorage.getItem(c.input.key); }
        safeStorage.removeItem(c.input.key);
        if (safeStorage.getItem(c.input.key) !== null) { ok = false; reason = 'fallback removeItem failed'; }
        break;
      }
      case 'session-draft': {
        if (c.mustReject) {
          for (const raw of c.mustReject) {
            const parsed = parseDraftPayload(raw);
            if (parsed !== null) { ok = false; reason = `corrupt payload accepted: ${raw}`; break; }
          }
          if (ok) {
            const res = applyDraft({}, null);
            if (res.applied !== false) { ok = false; reason = 'null draft applied'; }
          }
          break;
        }
        const input = JSON.parse(JSON.stringify(c.input));
        const wf = {
          currentStep: input.currentStep,
          completedSteps: input.completedSteps,
          ideationData: { scopeText: input.scopeText, selectedStudyType: input.studyType, generatedSuggestions: input.suggestions },
          clarityData: {
            researchQuestion: input.researchQuestion, framing: input.framing,
            analysisDepth: 'standard', isAnalysisCollapsed: false,
            frozenComponents: input.frozen, analysis: null, validationFlags: []
          },
          liveCoAuthorData: { peco: input.peco },
          pecoWorkshopData: null
        };
        const draft = buildDraft(wf, '2026-10-03T12:00:00.000Z');
        const restored = parseDraftPayload(JSON.stringify(draft));
        if (!restored) { ok = false; reason = 'round-tripped draft failed validation'; break; }
        const target = { ideationData: {}, clarityData: {}, liveCoAuthorData: {} };
        const res = applyDraft(target, restored);
        if (!res.applied) { ok = false; reason = `draft not applied: ${res.reason}`; break; }
        if (target.currentStep !== c.expectStep) { ok = false; reason = `step ${target.currentStep}`; }
        if (target.clarityData.researchQuestion !== c.expectQuestion) { ok = false; reason = `question "${target.clarityData.researchQuestion}"`; }
        if (JSON.stringify(target.clarityData.frozenComponents) !== JSON.stringify(c.expectFrozen)) { ok = false; reason = `frozen ${JSON.stringify(target.clarityData.frozenComponents)}`; }
        if (target.ideationData.generatedSuggestions.length !== input.suggestions.length) { ok = false; reason = 'suggestions lost'; }
        break;
      }
      case 'session-flags': {
        const wf = {
          currentStep: 'step-clarity',
          ideationData: { scopeText: '', generatedSuggestions: [] },
          clarityData: { researchQuestion: c.input.researchQuestion },
          liveCoAuthorData: { peco: JSON.parse(JSON.stringify(c.input.peco)) }
        };
        attachFlagsForSession(wf.liveCoAuthorData.peco, [{ code: 'framing_conflict', detail: 'transient diagnostic' }]);
        const draft = buildDraft(wf);
        const serialised = JSON.stringify(draft);
        if (serialised.includes('framing_conflict') || serialised.includes('transient diagnostic')) {
          ok = false; reason = `transient flags persisted into the draft: ${serialised}`;
        }
        if (draft.peco && draft.peco.validationFlags) { ok = false; reason = 'flags readable on the draft peco'; }
        break;
      }
      default:
        ok = false;
        reason = `unknown kind "${c.kind}"`;
    }
  } catch (e) {
    ok = false;
    reason = `threw: ${e.message}`;
  }
  if (ok) { passed++; console.log(`PASS  ${c.id}`); }
  else { fail(c.id, reason); console.log(`FAIL  ${c.id} — ${reason}`); }
}

console.log(`\n${passed}/${suite.cases.length} regression cases passed.`);
if (failures.length > 0) {
  console.log('\nThese checks protect against defects that previously reached users.');
  process.exit(1);
}
