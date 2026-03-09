
export const templates = {
    pecoToolkit: `
        <div class="w-full">
            <div id="step-ideation" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">Step 1</div>
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Ideation</h3>
                        <p class="text-[12px] text-slate-500 uppercase font-bold tracking-widest">Define research scope and methodology</p>
                    </div>
                </div>
                <div class="step-content"></div>
            </div>
            <div id="step-clarity" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">Step 2</div>
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Analysis</h3>
                        <p class="text-[12px] text-slate-500 uppercase font-bold tracking-widest">Extraction, logic audit & advisory</p>
                    </div>
                </div>
                <div class="step-content"></div>
            </div>
            <div id="step-peco-workshop" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">Step 3</div>
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Outputs</h3>
                        <p class="text-[12px] text-slate-500 uppercase font-bold tracking-widest">Protocol validation and transparency report</p>
                    </div>
                </div>
                <div class="step-content"></div>
            </div>
        </div>
    `,
    reviewerToolkit: `
        <div id="reviewer-toolkit-container" class="space-y-12">
            <div class="bg-white p-10 rounded-[3rem] border shadow-sm">
                <h4 class="text-[12px] font-extrabold uppercase text-slate-400 tracking-widest mb-10 flex items-center gap-3">
                    <i class="fa-solid fa-file-shield text-teal-600"></i> Consistency Auditor
                </h4>
                <div class="flex flex-col sm:flex-row items-center gap-8">
                    <div class="flex-grow w-full">
                        <label for="audit-file-upload" class="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-200 border-dashed rounded-[2rem] cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                <i class="fa-solid fa-cloud-arrow-up text-slate-400 text-3xl mb-3"></i>
                                <p class="text-sm text-slate-500 font-bold mb-1">Upload Manuscript</p>
                                <p class="text-[10px] text-slate-400 uppercase font-bold">PDF or DOCX</p>
                            </div>
                            <input id="audit-file-upload" type="file" class="hidden" accept=".pdf,.docx" />
                        </label>
                        <p id="audit-file-name" class="mt-4 text-center text-xs font-bold text-teal-600"></p>
                    </div>
                    <button id="run-audit-btn" class="w-full sm:w-auto bg-teal-600 text-white px-12 py-6 rounded-[2rem] font-extrabold uppercase text-xs tracking-widest shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-3">
                        <i class="fa-solid fa-magnifying-glass-chart"></i> Start Global Audit
                    </button>
                </div>
            </div>
            <div id="audit-report-container"></div>
        </div>
    `,
    nlpToolkit: `
        <div id="nlp-toolkit-container" class="space-y-12">
            <div class="bg-white p-10 rounded-[3rem] border shadow-sm">
                <h4 class="text-[12px] font-extrabold uppercase text-slate-400 tracking-widest mb-10">Local Vocabulary Manager</h4>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div class="md:col-span-2">
                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Terms (separate with ;)</label>
                        <input type="text" id="nlp-term-input" class="w-full p-4 bg-slate-50 border rounded-xl text-sm outline-none focus:border-teal-500 shadow-inner" placeholder="e.g., Lead; Pb; Heavy Metals">
                    </div>
                    <div>
                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Category</label>
                        <select id="nlp-category-select" class="w-full p-4 bg-slate-50 border rounded-xl text-sm outline-none focus:border-teal-500 shadow-inner">
                            <option value="population">Population</option>
                            <option value="exposure">Exposure</option>
                            <option value="comparison">Comparison</option>
                            <option value="outcome">Outcome</option>
                        </select>
                    </div>
                    <button id="add-nlp-term-btn" class="bg-slate-800 text-white py-4 rounded-xl font-extrabold uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all">Add Rules</button>
                </div>
            </div>
            <div class="bg-white p-10 rounded-[3rem] border shadow-sm">
                <div class="flex justify-between items-center mb-8">
                    <div class="flex items-center gap-6">
                        <h4 class="text-[12px] font-extrabold uppercase text-slate-400 tracking-widest">Ruleset Index</h4>
                        <div class="relative">
                            <input type="text" id="nlp-search-input" class="pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-xs outline-none focus:border-teal-500" placeholder="Search terms...">
                            <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button id="import-nlp-rules-btn" class="px-6 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"><i class="fa-solid fa-file-import mr-2"></i> Import JSON</button>
                        <button id="export-nlp-rules-btn" class="px-6 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"><i class="fa-solid fa-file-export mr-2"></i> Export JSON</button>
                        <input type="file" id="import-nlp-rules-input" class="hidden" accept=".json">
                    </div>
                </div>
                <div id="nlp-table-container" class="overflow-hidden border rounded-2xl"></div>
                <div id="nlp-pagination-controls" class="mt-8 flex justify-between items-center"></div>
            </div>
        </div>
    `,
    ideationView: `
        <div class="space-y-12">
            <div class="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 shadow-inner">
                <label class="block text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-6">Broad Research Scope</label>
                <textarea id="ideation-scope-input" class="w-full p-8 text-xl font-bold border-none rounded-[2rem] bg-white shadow-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all min-h-[160px]" placeholder="e.g., Effect of prenatal lead exposure on IQ in children..."></textarea>
            </div>
            <div id="ideation-phase-study-type" class="animate-fade-in space-y-10">
                <div class="flex justify-between items-center">
                    <label class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest">Study Methodology</label>
                    <div class="flex gap-4">
                        <button id="toggle-basic-types" class="px-6 py-2 text-[12px] font-extrabold uppercase tracking-wider rounded-xl transition-all bg-white text-teal-600 shadow-sm">Core Types</button>
                        <button id="toggle-extended-types" class="px-6 py-2 text-[12px] font-extrabold uppercase tracking-wider rounded-xl transition-all text-slate-500 hover:text-slate-800">Extended</button>
                    </div>
                </div>
                <div id="study-type-selector"></div>
            </div>
            <div class="flex flex-col gap-4">
                <button id="generate-ideation-btn" class="w-full bg-teal-600 text-white py-6 rounded-[2.5rem] font-extrabold uppercase text-sm tracking-widest shadow-xl hover:bg-teal-700 transition-all">Generate Suggestions</button>
                <button id="continue-own-question-btn" class="w-full bg-white text-slate-500 border border-slate-200 py-4 rounded-[2.5rem] font-extrabold uppercase text-xs tracking-widest hover:bg-slate-50 hover:text-slate-700 transition-all" disabled>Continue with my own question</button>
            </div>
            <div id="ideation-results-container" class="space-y-6"></div>
        </div>
    `,
    clarityView: `
        <div class="w-full space-y-12">
            <div id="analysis-control-hub" class="bg-white p-12 rounded-[3rem] border shadow-sm">
                <div class="flex justify-between items-center mb-10">
                   <h4 class="text-[12px] font-extrabold uppercase text-slate-400 tracking-widest flex items-center gap-3">
                        <i class="fa-solid fa-brain text-teal-600"></i> Audit Logic Control
                    </h4>
                    <div class="depth-selector" id="depth-selector-group">
                        <button class="depth-btn active" data-depth="standard">Standard</button>
                        <button class="depth-btn" data-depth="thorough">Thorough</button>
                    </div>
                    <p class="text-[10px] text-slate-400 font-bold mt-3 text-right uppercase tracking-widest">Thorough = Standard + Reasoning</p>
                </div>
                <div class="flex flex-col gap-8">
                    <button id="score-clarity-btn" class="w-full bg-teal-600 text-white py-6 rounded-[2.5rem] font-extrabold uppercase text-xs tracking-widest shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-4">
                        <i class="fa-solid fa-play"></i> Analyse
                    </button>
                </div>
            </div>
            <div id="clarity-dashboard-container"></div>
            <div id="clarity-statement-section" class="bg-white p-12 rounded-[3rem] border shadow-sm">
                <label class="block text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Research Question (Read Only)</label>
                <div id="research-question-display" class="w-full text-xl font-bold p-10 rounded-[2rem] border bg-slate-50/50 italic leading-relaxed shadow-inner min-h-[140px]"></div>
            </div>
            <div id="clarity-footer-container"></div>
        </div>
    `,
    pecoWorkshopView: `
        <div class="w-full space-y-12">
            <div class="bg-white p-14 rounded-[3.5rem] border shadow-card text-center space-y-10">
                <div class="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                    <i class="fa-solid fa-award fa-4x"></i>
                </div>
                <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">Final Protocol Summary</h2>
                <div id="final-question-display" class="text-2xl font-bold italic text-slate-700 leading-relaxed bg-slate-50 p-12 rounded-[2.5rem] border border-slate-100 shadow-inner"></div>
            </div>
            <div id="final-peco-display"></div>
            <div class="flex flex-col sm:flex-row gap-6">
                <button id="show-transparency-log-workshop-btn" class="flex-1 bg-white border border-slate-200 text-slate-600 py-6 rounded-[2rem] font-extrabold uppercase text-[12px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-4">
                    <i class="fa-solid fa-scroll"></i> View Interaction Trace
                </button>
                <button id="view-transparency-report-btn" class="flex-1 bg-teal-600 text-white py-6 rounded-[2rem] font-extrabold uppercase text-[12px] tracking-widest shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-4">
                    <i class="fa-solid fa-file-contract"></i> Full Transparency Report
                </button>
            </div>
        </div>
    `,
    settingsView: `
        <div class="p-4 space-y-12">
            <div class="flex border-b border-slate-200">
                <button class="settings-tab-btn active px-8 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-500" data-tab="general">General</button>
                <button class="settings-tab-btn px-8 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-500" data-tab="heuristics">Heuristics & Controls</button>
            </div>

            <div id="settings-tab-general" class="settings-tab-content space-y-12 pt-6">
                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Typography & Display Scale</h4>
                    <div class="grid grid-cols-3 gap-6">
                        <button class="font-size-btn border-2 rounded-2xl transition-all" data-size="sm">
                            <span class="btn-preview font-bold text-slate-800">Abc</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Small</span>
                        </button>
                        <button class="font-size-btn border-2 rounded-2xl transition-all" data-size="md">
                            <span class="btn-preview font-bold text-slate-800">Abc</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Medium</span>
                        </button>
                        <button class="font-size-btn border-2 rounded-2xl transition-all" data-size="lg">
                            <span class="btn-preview font-bold text-slate-800">Abc</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Large</span>
                        </button>
                    </div>
                </section>

                <!-- Data Privacy Section Hidden for Beta (Reviewer Toolkit Not Active) -->
                <!--
                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Data Privacy</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                        <div>
                            <label class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Strip Metadata</label>
                            <p class="text-[10px] text-slate-400 mt-1">Automatically remove author, date, and email metadata from uploaded files before analysis.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="settings-strip-metadata-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                </section>
                -->

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Co-Author Assistance Level</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div class="flex justify-between items-end mb-4">
                            <label for="settings-assistance-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Logic Depth & Rigor</label>
                            <span id="assistance-level-display" class="text-sm font-bold text-teal-600">Standard</span>
                        </div>
                        <input type="range" id="settings-assistance-slider" min="1" max="5" step="1" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2">
                        <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Minimal</span>
                            <span>Standard</span>
                            <span>Intense</span>
                        </div>
                    </div>
                </section>
                
                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Generation Variance</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div class="flex justify-between items-center mb-4">
                            <label for="settings-seed-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Variance Seed</label>
                            <span id="settings-seed-display" class="text-[12px] font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded border border-teal-100">42</span>
                        </div>
                        <input type="range" id="settings-seed-slider" min="0" max="1000" value="42" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600">
                        <div class="flex items-center gap-4 mt-4">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Manual Input:</span>
                            <input type="number" id="settings-seed-input" value="42" class="w-24 p-2 border rounded-lg text-xs">
                        </div>
                        <p class="text-[10px] text-slate-400 mt-2">Adjusting the seed changes the randomization of AI suggestions. Keep constant for reproducible results.</p>
                    </div>
                </section>

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Scientific Engine Selection</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <button id="modal-engine-ai-btn" class="p-10 border rounded-[2.5rem] text-left transition-all hover:shadow-lg relative group bg-white">
                            <div class="active-check absolute top-8 right-8 text-teal-600 transition-opacity"><i class="fa-solid fa-circle-check fa-xl"></i></div>
                            <i class="fa-solid fa-brain text-teal-600 text-5xl mb-8"></i>
                            <p class="font-extrabold text-slate-800 uppercase text-[13px] tracking-widest mb-3">AI Co-Author</p>
                            <p class="text-[14px] text-slate-500 leading-relaxed">Advanced logic deconstruction and advisory engine.</p>
                        </button>
                        <button id="modal-engine-nlp-btn" class="p-10 border rounded-[2.5rem] text-left transition-all hover:shadow-lg relative group bg-white">
                            <div class="active-check absolute top-8 right-8 text-teal-600 transition-opacity opacity-0"><i class="fa-solid fa-circle-check fa-xl"></i></div>
                            <i class="fa-solid fa-sliders text-teal-600 text-5xl mb-8"></i>
                            <p class="font-extrabold text-slate-800 uppercase text-[13px] tracking-widest mb-3">NLP Vocabulary</p>
                            <p class="text-[14px] text-slate-500 leading-relaxed">Local dictionary matching for strict parameter control.</p>
                        </button>
                    </div>
                </section>

                <section class="space-y-10 pt-12 border-t">
                    <div class="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
                        <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                            <i class="fa-solid fa-network-wired text-teal-600"></i> AI Provider Configuration
                        </h4>
                        
                        <div class="mb-6">
                            <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Select Provider</label>
                            <select id="settings-provider-select" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:border-teal-500 shadow-sm">
                                <option value="gemini">Google Gemini (Official)</option>
                                <option value="openai">OpenAI Compatible (ChatGPT / Perplexity)</option>
                                <option value="local">Local LLM (Ollama / LM Studio)</option>
                            </select>
                        </div>

                        <div id="settings-config-fields" class="space-y-4">
                            <!-- Gemini Fields -->
                            <div id="field-group-gemini" class="provider-field-group">
                                <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Gemini API Key</label>
                                <input type="password" id="input-gemini-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Paste Google API Key...">
                            </div>

                            <!-- Custom/Local Fields -->
                            <div id="field-group-custom" class="provider-field-group hidden space-y-4">
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Base URL</label>
                                    <input type="text" id="input-custom-url" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. http://localhost:11434/v1">
                                    <p class="text-[10px] text-slate-400 mt-2 ml-2">Default Ollama: http://localhost:11434/v1 | LM Studio: http://localhost:1234/v1</p>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input type="text" id="input-custom-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. llama3, gpt-4, mistral">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">API Key (Optional for Local)</label>
                                    <input type="password" id="input-custom-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Bearer Token / API Key">
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-4 mt-8">
                             <button id="save-provider-config-btn" class="flex-grow py-4 bg-slate-800 text-white rounded-[1.5rem] text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg">Save Configuration</button>
                             <button id="reset-provider-config-btn" class="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-50 transition-all">Reset</button>
                        </div>
                        
                        <div id="provider-status-display" class="hidden mt-6 p-4 rounded-2xl text-center bg-emerald-50 border border-emerald-100">
                             <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Settings Saved</p>
                        </div>
                    </div>
                </section>
            </div>

            <div id="settings-tab-heuristics" class="settings-tab-content space-y-8 pt-6 hidden">
                <header class="mb-10">
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Scientific Heuristics Control</h4>
                    <p class="text-sm text-slate-500 leading-relaxed">Modify the expert rules used for critiques. Changes here directly influence the Co-Author's advisory logic.</p>
                </header>
                
                <div class="space-y-8" id="heuristics-editor-container">
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Comparator Logic</label>
                        <textarea id="heuristic-comparator" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Exposure Specificity</label>
                        <textarea id="heuristic-exposure" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Population Standards</label>
                        <textarea id="heuristic-population" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Outcome Definitions</label>
                        <textarea id="heuristic-outcome" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                </div>

                <button id="save-heuristics-btn" class="w-full bg-teal-600 text-white py-6 rounded-[2.5rem] font-extrabold uppercase text-xs tracking-widest shadow-xl hover:bg-teal-700 transition-all">Apply Rules to Engine</button>
            </div>
        </div>
    `,
    userManualView: `
        <div class="manual-container space-y-12 pb-12">
            <header class="p-8 bg-slate-50 border-b">
                <h4 class="text-xl font-extrabold text-slate-800 mb-4">How to use PECO-Buddy</h4>
                <div class="relative">
                    <input type="text" id="manual-search-input" class="w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm" placeholder="Search the manual...">
                    <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                </div>
            </header>
            <div class="px-8 space-y-8">
                <section class="manual-section">
                    <h5 class="text-sm font-extrabold text-teal-600 uppercase tracking-widest mb-4">Step 1: Ideation</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">Enter your broad research interest and select a study methodology. PECO-Buddy will generate structured research question candidates that identify Population, Exposure, Comparator, and Outcome.</p>
                </section>
                <section class="manual-section">
                    <h5 class="text-sm font-extrabold text-teal-600 uppercase tracking-widest mb-4">Step 2: Logic Audit</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">Once a question is developed, run the logic audit. The AI Co-Author evaluates the protocol for scientific rigor and linguistic precision, suggesting improvements using matrix tags for biological sites.</p>
                </section>
                <section class="manual-section">
                    <h5 class="text-sm font-extrabold text-teal-600 uppercase tracking-widest mb-4">Step 3: Outputs</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">Finalise your PECO table and synthesise the final research statement. You can export the transparency log to see exactly how the AI reached its conclusions.</p>
                </section>
            </div>
        </div>
    `,
    versionRationaleView: `
        <div class="p-8 space-y-6">
            <h4 class="text-xl font-extrabold text-slate-800">Version 8.1.3 Rationale</h4>
            <p class="text-sm text-slate-600 leading-relaxed">Version 8.1.3 focuses on **Augmented Intelligence** - the principle that the machine should guide, not replace, human scientific judgement. Key architectural changes include:</p>
            <ul class="list-disc pl-6 text-sm text-slate-600 space-y-4">
                <li><strong>Linguistic Matrix Syntax:</strong> Explicit deconstruction of measurement sites using the {matrix:connector:term} pattern ensures standardisation.</li>
                <li><strong>Traceable Reasoning:</strong> Every AI interaction is logged and downloadable, meeting EBTC transparency requirements.</li>
                <li><strong>Heuristic Integration:</strong> Expert domain knowledge is injected directly into the prompt context for higher-fidelity critiques.</li>
                <li><strong>Assistance Control:</strong> Adjustable rigor levels to suit expert vs novice workflows.</li>
                <li><strong>Open Engine Architecture:</strong> Support for Local LLMs (Ollama/LM Studio) and custom OpenAI-compatible endpoints.</li>
            </ul>
        </div>
    `,
    copyrightView: `
        <div class="p-8 space-y-6">
            <h4 class="text-xl font-extrabold text-slate-800">Copyright & Licence</h4>
            <p class="text-sm text-slate-600 leading-relaxed font-bold">Copyright (c) 2025 Evidence-Based Toxicology Collaboration</p>

            <div class="space-y-2">
                <h5 class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Concept and Development</h5>
                <p class="text-sm text-slate-700">Joel Chan, Jan-Peter Nilsson, Paul Whaley, et al.</p>
            </div>
            
            <div class="space-y-2">
                 <h5 class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Toolkit Development & Code</h5>
                 <p class="text-sm text-slate-700">Jan-Peter Nilsson</p>
            </div>

            <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm leading-relaxed text-slate-600 space-y-4">
                 <h5 class="font-bold text-emerald-700 uppercase text-xs tracking-widest">Permissions</h5>
                 <p class="text-emerald-700 font-medium">Permission is hereby granted, to any person obtaining a copy of this software and associated documentation files (the "Software"), to use the Software for its intended purpose, subject to the following conditions:</p>
                 <ul class="list-disc pl-5 space-y-2 text-emerald-700">
                    <li>You are free to use the Beta version of this Software in its original, unmodified form, for trial purposes only. The software may only be used at the server where it is hosted, or as a stand-alone application that has this copyright statement is present, and that it is downloaded from the developers site, or an authorised host.</li>
                    <li>The above copyright notice and this permission notice is included in the version of the Software, approved website or server you use.</li>
                    <li>You acknowledge that using this software, effectively means you are accepting a conditional NDA.</li>
                 </ul>

                 <h5 class="font-bold text-rose-700 uppercase text-xs tracking-widest mt-6">Prohibitions</h5>
                 <p class="text-rose-700 font-medium">Without permission granted from the author of the software, the following actions are expressly forbidden:</p>
                 <ul class="list-disc pl-5 space-y-2 text-rose-700">
                    <li>You may NOT, outside the EBTC-Workgroups - or as an invited party - disclose, take screenshots, hand out website address, translate, or in any digital or analogue media or form, record any of the core processes or functions that you may gain knowledge of.</li>
                    <li>You may NOT distribute, modify, adapt, translate, or create derivative works based on the Software's source code.</li>
                    <li>You may NOT decompile, reverse engineer, disassemble, or otherwise attempt to derive the source code for the Software.</li>
                    <li>You may NOT merge or incorporate the Software or its source code into any other software.</li>
                 </ul>

                 <p class="text-xs font-bold text-slate-400 mt-6 uppercase">THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
            </div>
        </div>
    `
};
