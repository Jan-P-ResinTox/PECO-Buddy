/**
 * Activity bus: a tiny publish/subscribe channel between the provider layer
 * (api/gemini.js), the workflow layer (views/pecoToolkit.js), and the single
 * status chip. No DOM and no timers at module scope — the module imports
 * cleanly in the Node regression runner.
 *
 * Event shapes:
 *   { type: 'phase',  label }   — a phase started; the chip starts its clock
 *   { type: 'note',   label }   — a sub-event (retry reason); clock keeps running
 *   { type: 'done',   label? }   — the phase finished; "done in Xs"
 *   { type: 'error',  label }   — the phase failed; visible error, never a spinner
 */
const listeners = new Set();

export const ActivityBus = {
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    emit(event) {
        for (const fn of [...listeners]) {
            try { fn(event); } catch (_) { /* a broken listener never stalls the pipeline */ }
        }
    }
};

/**
 * Status chip controller: ONE chip live-rendering every phase — running label
 * with elapsed seconds, retry reasons ("rate limit", "timeout", "truncated
 * output"), repair activity, and the terminal "done in Xs" / error state.
 */
export const ActivityChip = {
    el: null,
    textEl: null,
    timer: null,
    hideTimer: null,
    startedAt: null,
    baseLabel: '',
    unsubscribe: null,

    bind(element) {
        if (!element || this.el === element) return;
        this.unsubscribe?.();
        this.el = element;
        this.textEl = element.querySelector('[data-activity-text]') || element;
        this.unsubscribe = ActivityBus.subscribe((event) => this.handle(event));
    },

    handle(event) {
        if (!this.el) return;
        if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
        switch (event.type) {
            case 'phase':
                this.baseLabel = event.label;
                this.startedAt = Date.now();
                this.el.className = 'activity-chip activity-running';
                this.startClock();
                this.render();
                break;
            case 'note':
                this.baseLabel = this.baseLabel || event.label;
                if (this.startedAt === null) this.startedAt = Date.now();
                this.el.className = 'activity-chip activity-running';
                this.render(event.label);
                break;
            case 'done': {
                const seconds = this.elapsedSeconds();
                this.stopClock();
                this.el.className = 'activity-chip activity-done';
                this.render(`${event.label || this.baseLabel} — done in ${seconds}s`);
                this.hideTimer = setTimeout(() => this.hide(), 6000);
                break;
            }
            case 'error': {
                const seconds = this.elapsedSeconds();
                this.stopClock();
                this.el.className = 'activity-chip activity-error';
                this.render(`failed after ${seconds}s: ${event.label}`);
                this.hideTimer = setTimeout(() => this.hide(), 12000);
                break;
            }
        }
    },

    elapsedSeconds() {
        return this.startedAt === null ? 0 : Math.max(0, Math.round((Date.now() - this.startedAt) / 1000));
    },

    render(overrideLabel) {
        if (!this.textEl) return;
        const seconds = this.elapsedSeconds();
        const label = overrideLabel || this.baseLabel;
        const clock = this.timer ? ` ${seconds}s` : '';
        this.textEl.textContent = `${label}${clock}`;
    },

    startClock() {
        this.stopClock();
        this.timer = setInterval(() => this.render(), 1000);
    },

    stopClock() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        this.startedAt = null;
    },

    hide() {
        if (this.el) this.el.className = 'activity-chip activity-hidden';
        this.baseLabel = '';
        if (this.el) delete this.el.dataset.note;
    }
};
