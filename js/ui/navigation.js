import { GROS_CONFIG } from '../config.js';

// ─── État actif ───────────────────────────────────────────────────────────────
let _activeGros = 'dalle';
export const getActiveGros = () => _activeGros;

// ─── Sous-navigation Gros Œuvre ───────────────────────────────────────────────
export function renderGrosSubNav() {
    const nav = document.getElementById('gros-sub-nav');
    nav.innerHTML = Object.keys(GROS_CONFIG).map(key => `
        <button onclick="window.setGrosType('${key}')"
                class="px-5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all
                       ${_activeGros === key ? 'sub-nav-active' : 'bg-white text-gray-500 border border-gray-100'}">
            ${GROS_CONFIG[key].name}
        </button>
    `).join('');

    // Scroll le bouton actif au centre
    const activeBtn = nav.querySelector('.sub-nav-active');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

// ─── Sélection du type de calcul ─────────────────────────────────────────────
export function setGrosType(type) {
    _activeGros = type;
    renderGrosSubNav();

    const cfg = GROS_CONFIG[type];
    const container = document.getElementById('gros-fields');

    container.innerHTML = cfg.fields.map(f => {
        const optional = f.optional === true;
        const required = !optional;

        if (f.type === 'select') {
            return `
            <div class="field-wrapper">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">
                    ${f.label}${required ? ' <span class="text-red-400">*</span>' : ''}
                </label>
                <select id="g-${f.id}"
                        class="w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 font-bold focus:border-kalou-orange transition-all">
                    ${f.opt.map(o => `<option value="${o.v}" ${o.s ? 'selected' : ''}>${o.t}</option>`).join('')}
                </select>
                <p class="field-error-msg">Valeur requise</p>
            </div>`;
        }

        const hasUnit = !!f.unit;
        return `
        <div class="field-wrapper">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">
                ${f.label}${required ? ' <span class="text-red-400">*</span>' : ''}
            </label>
            <div class="relative">
                <input type="number"
                       id="g-${f.id}"
                       inputmode="decimal"
                       min="${optional ? '0' : '0.01'}"
                       step="any"
                       value="${f.default !== undefined ? f.default : ''}"
                       placeholder="0"
                       class="w-full h-12 px-4 ${hasUnit ? 'pr-16' : 'pr-4'} border-2 border-gray-100 rounded-xl focus:border-kalou-orange bg-gray-50 font-bold transition-all">
                ${hasUnit ? `<span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">${f.unit}</span>` : ''}
            </div>
            <p class="field-error-msg">Valeur requise</p>
        </div>`;
    }).join('');

    document.getElementById('gros-results').classList.add('hidden');
}

// ─── Navigation entre onglets ─────────────────────────────────────────────────
export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById('tab-' + tabId).classList.add('active');
    const navMap = { 'gros-oeuvre': 'gros', 'second-oeuvre': 'second', 'historique': 'history' };
    document.getElementById('nav-' + navMap[tabId]).classList.add('active');

    if (tabId === 'historique') window.renderHistory();
}

// ─── Toggle Placo / Sols ──────────────────────────────────────────────────────
export function setSecondType(type) {
    const isPlaco = type === 'placo';
    document.getElementById('form-placo').classList.toggle('hidden', !isPlaco);
    document.getElementById('form-sols').classList.toggle('hidden', isPlaco);

    const activeClass = 'flex-1 py-3 rounded-xl font-bold transition-all sub-nav-active';
    const inactiveClass = 'flex-1 py-3 rounded-xl font-bold transition-all text-gray-500';
    document.getElementById('btn-sec-placo').className = isPlaco ? activeClass : inactiveClass;
    document.getElementById('btn-sec-sols').className = !isPlaco ? activeClass : inactiveClass;

    document.getElementById('second-results').classList.add('hidden');
}
