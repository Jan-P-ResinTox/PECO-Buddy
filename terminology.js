/**
 * Deterministic ontology anchoring layer.
 *
 * Every AI-suggested term is resolved against a real terminology (MeSH
 * descriptor lookup by default) so suggestions carry verified ontology codes
 * instead of plausible-looking guesses. Resolution is deterministic and
 * never blocks: an unreachable terminology server degrades to "unanchored",
 * and the HUMAN decides — any term can be consciously overridden to
 * user-defined free text.
 *
 * Anchors are DURABLE protocol metadata (the deliberate opposite of the
 * ephemeral, non-enumerable validation flags): they attach as enumerable
 * properties and persist into saves and exports.
 *
 * Pure core, thin injectable network adapter — the module imports cleanly
 * in the Node regression runner (browser globals guarded at module scope).
 */
import { escapeHtml, stripMatrixTags } from './utils.js';
import { appState, safeStorage } from './state.js';
import { ActivityBus } from './components/activity.js';

export const ANCHOR_STATES = {
    ANCHORED: 'anchored',       // deterministically matched a descriptor
    PARTIAL: 'partial',         // candidates exist — the human picks
    UNANCHORED: 'unanchored',   // no match (or lookup failed) — human accepts or overrides
    USER_DEFINED: 'user_defined' // human explicitly chose unverified free text
};

export const MESH_LOOKUP_BASE = 'https://id.nlm.nih.gov/mesh/lookup/descriptor';
const MISSING_SENTINELS = ['not specified', 'not required', 'n/a'];

/**
 * The canonical lookup key: matrix tags become prose, casing and whitespace
 * collapse — a term rendered two ways resolves once.
 */
export const normaliseTerm = (term) =>
    stripMatrixTags(String(term ?? '')).toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * A term is worth an ontology lookup when it carries real content: missing
 * sentinels and bare dosing values are never anchorable.
 */
export const isAnchorableTerm = (term) => {
    const v = normaliseTerm(term);
    if (!v || MISSING_SENTINELS.includes(v)) return false;
    // Bare dosing values ("5mg/kg") carry no anchorable concept.
    return /[a-z]{3,}/.test(v);
};

/**
 * Parses an NLM MeSH descriptor lookup payload into canonical candidates.
 * The code is the descriptor URI's last segment (e.g. D007223).
 */
export const parseMeshLookup = (payload) =>
    (Array.isArray(payload) ? payload : [])
        .map(item => ({
            system: 'MeSH',
            code: String(item?.resource || '').split('/').pop() || '',
            display: String(item?.label || '').trim()
        }))
        .filter(c => c.code && c.display);

/**
 * Deterministic candidate ranking. Exact (normalised) match outranks a
 * prefix match, which outranks word overlap; ties break alphabetically so
 * the ordering is stable across runs.
 */
export const rankCandidates = (term, candidates) => {
    const t = normaliseTerm(term);
    const tWords = new Set(t.split(/[^a-z0-9]+/).filter(w => w.length > 2));
    return (candidates || [])
        .map(c => {
            const d = normaliseTerm(c.display);
            let score = 0;
            if (d === t) score = 100;
            else if (d.startsWith(t) || t.startsWith(d)) score = 60;
            else score = 10 * d.split(/[^a-z0-9]+/).filter(w => w.length > 2 && tWords.has(w)).length;
            return { ...c, score };
        })
        .sort((a, b) => (b.score - a.score) || a.display.localeCompare(b.display));
};

/**
 * Pure anchor decision from candidates. Exact match anchors on its own;
 * anything else is surfaced for the human. No silent guessing.
 */
export const selectAnchor = (term, candidates) => {
    const ranked = rankCandidates(term, candidates).slice(0, 8);
    const base = { term: String(term ?? ''), resolvedAt: new Date().toISOString() };
    if (!ranked.length) {
        return { ...base, state: ANCHOR_STATES.UNANCHORED, anchor: null, candidates: [], source: 'mesh' };
    }
    if (ranked[0].score >= 100) {
        const { score, ...anchor } = ranked[0];
        return { ...base, state: ANCHOR_STATES.ANCHORED, anchor, candidates: ranked, source: 'mesh' };
    }
    return { ...base, state: ANCHOR_STATES.PARTIAL, anchor: null, candidates: ranked, source: 'mesh' };
};

/**
 * The NLM descriptor lookup matches label words only — inflections miss
 * ("children" finds nothing, "child" does). Deterministic singular fallback
 * ladder: try the term, then its plausible singular forms. A fallback hit is
 * a NEAR match, surfaced for the human to confirm (partial), never silently
 * anchored.
 */
const IRREGULAR_SINGULARS = { children: 'child', mice: 'mouse', men: 'man', women: 'woman', teeth: 'tooth', feet: 'foot', rats: 'rat' };

export const pluralFallbacks = (term) => {
    const t = normaliseTerm(term);
    const out = [];
    if (IRREGULAR_SINGULARS[t]) out.push(IRREGULAR_SINGULARS[t]);
    if (/ies$/.test(t)) out.push(t.slice(0, -3) + 'y');
    if (/es$/.test(t) && !/ss$/.test(t) && !out.includes(t.slice(0, -2))) out.push(t.slice(0, -2));
    if (/s$/.test(t) && !/ss$/.test(t) && !out.includes(t.slice(0, -1))) out.push(t.slice(0, -1));
    return out;
};

/**
 * Terminology client with an injectable fetch (fixtures in the regression
 * suite, global fetch in the browser) and an AbortController timeout —
 * a stalled terminology server can never stall the pipeline.
 */
export const createMeshClient = ({ fetchImpl = null, baseUrl = null, timeoutMs = 8000 } = {}) => {
    const doFetch = fetchImpl || ((typeof fetch !== 'undefined') ? fetch : null);
    const base = (baseUrl || MESH_LOOKUP_BASE).replace(/\/+$/, '');
    const fetchLabel = async (label) => {
        if (!doFetch) throw new Error('No fetch implementation available.');
        const url = `${base}?label=${encodeURIComponent(label)}&matchType=word&limit=10&format=json`;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
            const res = await doFetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: controller ? controller.signal : undefined
            });
            if (!res.ok) throw new Error(`terminology server returned HTTP ${res.status}`);
            const payload = await res.json();
            return parseMeshLookup(payload);
        } finally {
            if (timer) clearTimeout(timer);
        }
    };
    return {
        async lookup(term) {
            const attempts = [normaliseTerm(term), ...pluralFallbacks(term)];
            for (const label of attempts) {
                const candidates = await fetchLabel(label);
                if (candidates.length) return candidates;
            }
            return [];
        }
    };
};

/**
 * Anchor registry: term -> anchor state. Enumerable and JSON-serialisable by
 * design (anchors are protocol metadata). `load`/`persist` adapters keep the
 * registry across sessions in the browser; both are optional.
 */
export const createAnchorRegistry = ({ load = null, persist = null } = {}) => {
    const entries = new Map();
    const key = (term) => normaliseTerm(term);
    const loadEntry = (entry) => {
        if (entry && typeof entry === 'object' && entry.term) entries.set(key(entry.term), entry);
    };
    if (load) {
        try {
            const saved = JSON.parse(load() || '[]');
            if (Array.isArray(saved)) saved.forEach(loadEntry);
        } catch (_) { /* a corrupt cache never blocks anchoring */ }
    }
    const flush = () => {
        if (!persist) return;
        try { persist(JSON.stringify([...entries.values()])); } catch (_) { /* storage full/offline */ }
    };
    return {
        get: (term) => entries.get(key(term)),
        has: (term) => entries.has(key(term)),
        set: (entry) => { entries.set(key(entry.term), entry); flush(); },
        all: () => [...entries.values()],
        size: () => entries.size
    };
};

/**
 * Splits a PECO component value into its individual terms: " & " separates
 * AND collectives, " ; " separates OR alternatives. Each term anchors (and
 * chips) independently — the compound string is never a lookup key.
 */
export const splitPecoTerms = (fieldValue) =>
    String(fieldValue ?? '')
        .split(/[&;]/)
        .map(t => t.trim())
        .filter(Boolean);

/**
 * Resolves a batch of terms against the terminology client, all in parallel,
 * never throwing: a term whose lookup fails becomes unanchored with a note,
 * and the rest still resolve. Already-resolved terms skip the network (cache).
 */
export const anchorTerms = async (terms, { client, registry, enabled = true } = {}) => {
    if (!enabled || !client || !registry) return { resolved: 0, failed: 0, skipped: terms?.length || 0 };
    const unique = [...new Set((terms || []).filter(isAnchorableTerm))];
    const pending = unique.filter(t => {
        const existing = registry.get(t);
        return !existing || existing.state === undefined;
    });
    if (pending.length === 0) return { resolved: 0, failed: 0, skipped: unique.length };

    const results = await Promise.allSettled(pending.map(async (term) => {
        const candidates = await client.lookup(term);
        registry.set(selectAnchor(term, candidates));
        return term;
    }));

    let failed = 0;
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            failed++;
            const term = pending[i];
            registry.set({
                term,
                state: ANCHOR_STATES.UNANCHORED,
                anchor: null,
                candidates: [],
                source: 'mesh',
                note: `Lookup failed: ${String(r.reason?.message || r.reason || 'network error').slice(0, 120)}`,
                resolvedAt: new Date().toISOString()
            });
        }
    });
    return { resolved: results.length - failed, failed, skipped: unique.length - pending.length };
};

/**
 * The human override: a term deliberately accepted as unverified free text.
 * Provenance stays visible in the UI and the export.
 */
export const setUserOverride = (registry, term) => {
    const entry = {
        term: String(term ?? ''),
        state: ANCHOR_STATES.USER_DEFINED,
        anchor: null,
        candidates: [],
        source: 'user',
        note: 'Deliberately accepted by the user without an ontology anchor.',
        resolvedAt: new Date().toISOString()
    };
    registry.set(entry);
    return entry;
};

/** Selects a specific candidate after the human reviews the ranked list. */
export const selectCandidate = (registry, term, candidate) => {
    const entry = {
        term: String(term ?? ''),
        state: ANCHOR_STATES.ANCHORED,
        anchor: { system: candidate.system, code: candidate.code, display: candidate.display },
        candidates: [],
        source: 'user-pick',
        resolvedAt: new Date().toISOString()
    };
    registry.set(entry);
    return entry;
};

/**
 * Official authority-browser links for anchored codes (ported from the
 * cohort-criteria-analyzer's terminologyLinks and extended with MeSH).
 */
export const getTerminologyLink = (system, code) => {
    if (!code || !system) return null;
    const sys = String(system).toLowerCase().trim();
    const c = encodeURIComponent(String(code).trim());
    if (sys.includes('mesh')) return `https://id.nlm.nih.gov/mesh/${c}`;
    if (sys.includes('loinc')) return `https://loinc.org/${c}/`;
    if (sys.includes('snomed')) return `https://browser.ihtsdotools.org/?perspective=full&conceptId1=${c}`;
    if (sys.includes('rxnorm') || sys.includes('rx-norm')) return `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${c}`;
    return null;
};

/**
 * The visible per-term chip. States:
 *   anchored ......... blue, code visible, links to the authority browser
 *   partial ........... amber, "N candidates — pick" affordance
 *   unanchored ......... amber, explicit "use as free text" override affordance
 *   user_defined ...... slate, explicit provenance
 */
export const anchorChipHtml = (entry) => {
    if (!entry || !isAnchorableTerm(entry.term)) return '';
    const term = escapeHtml(entry.term);
    const stamp = `data-term="${term}"`;
    switch (entry.state) {
        case ANCHOR_STATES.ANCHORED: {
            if (!entry.anchor) return '';
            const link = getTerminologyLink(entry.anchor.system, entry.anchor.code);
            return `<span class="anchor-chip anchor-chip-anchored" ${stamp} title="${escapeHtml(entry.anchor.display)}${entry.source === 'user-pick' ? ' — picked by user' : ''}"><i class="fa-solid fa-link"></i>${escapeHtml(entry.anchor.system)} ${escapeHtml(entry.anchor.code)}${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="anchor-chip-link" aria-label="Open in authority browser"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}</span>`;
        }
        case ANCHOR_STATES.PARTIAL:
            return `<span class="anchor-chip anchor-chip-partial" ${stamp} title="Multiple ontology candidates — pick one"><i class="fa-solid fa-circle-half-stroke"></i>${entry.candidates.length} candidate(s)<button class="anchor-chip-btn anchor-pick" ${stamp} type="button">pick</button></span>`;
        case ANCHOR_STATES.UNANCHORED:
            return `<span class="anchor-chip anchor-chip-unanchored" ${stamp} title="${escapeHtml(entry.note || 'No ontology match — the human decides')}"><i class="fa-solid fa-circle-question"></i>unanchored<button class="anchor-chip-btn anchor-override" ${stamp} type="button">use as free text</button></span>`;
        case ANCHOR_STATES.USER_DEFINED:
            return `<span class="anchor-chip anchor-chip-user" ${stamp} title="${escapeHtml(entry.note || 'User-defined term without an ontology anchor')}"><i class="fa-solid fa-user-pen"></i>user-defined</span>`;
        default:
            return '';
    }
};

/**
 * Durable counterpart of attachFlags: the anchor attaches as an ENUMERABLE
 * property so saves and exports persist it. This is deliberate — anchors are
 * protocol metadata, not transient quality flags.
 */
export const attachAnchor = (target, anchor) => {
    if (!target || typeof target !== 'object' || !anchor) return target;
    target.ontology_anchor = { ...anchor };
    return target;
};

/**
 * Export view of the anchors for a protocol's terms: survives serialisation,
 * candidates omitted, provenance included.
 */
export const buildExportAnchors = (terms, registry) => {
    const out = {};
    for (const term of (terms || [])) {
        if (!isAnchorableTerm(term)) continue;
        const entry = registry.get(term);
        if (!entry) continue;
        out[term] = entry.anchor
            ? { state: entry.state, system: entry.anchor.system, code: entry.anchor.code, display: entry.anchor.display, source: entry.source || 'mesh' }
            : { state: entry.state, source: entry.source || 'mesh' };
    }
    return out;
};

/**
 * Live app registry, persisted across sessions (guarded for Node).
 */
const anchorStore = safeStorage; // probed in state.js; memory fallback on file:// Safari / Node
const safeRead = (key) => { try { return anchorStore.getItem(key); } catch (e) { return null; } };
const safeWrite = (key, value) => { try { anchorStore.setItem(key, value); } catch (e) { /* full or unavailable */ } };

export const ontologyAnchors = createAnchorRegistry({
    load: () => safeRead('peco_buddy_ontology_anchors'),
    persist: (v) => safeWrite('peco_buddy_ontology_anchors', v)
});

/**
 * App-level anchoring entry point: resolves the given terms against the
 * configured terminology endpoint (Settings), emits activity-chip phases so
 * there is never silent waiting, and never throws.
 */
export const anchorTermsLive = async (terms, phaseLabel = null) => {
    if (appState.terminologyAnchoring === false) return { resolved: 0, failed: 0, skipped: terms?.length || 0, disabled: true };
    const client = createMeshClient({
        baseUrl: appState.terminologyMeshBase || MESH_LOOKUP_BASE,
        timeoutMs: appState.terminologyTimeoutMs || 8000
    });
    const unique = [...new Set((terms || []).filter(isAnchorableTerm))];
    if (unique.length === 0) return { resolved: 0, failed: 0, skipped: 0 };
    ActivityBus.emit({ type: 'note', label: phaseLabel || `anchoring ${unique.length} term(s) in MeSH…` });
    try {
        const summary = await anchorTerms(unique, { client, registry: ontologyAnchors, enabled: true });
        ActivityBus.emit({ type: 'done', label: `anchoring done (${summary.resolved} resolved, ${summary.failed} unanchored)` });
        return summary;
    } catch (e) {
        // anchorTerms never throws, but a broken adapter must not stall the UI.
        ActivityBus.emit({ type: 'done', label: 'anchoring skipped (terminology layer error)' });
        return { resolved: 0, failed: unique.length, skipped: 0 };
    }
};
