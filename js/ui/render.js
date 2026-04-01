import { showToast } from './toast.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Copier / Partager ────────────────────────────────────────────────────────

function copyResults(name, data) {
    const text = `${name}\n${'─'.repeat(32)}\n` +
        data.map(d => `${d.l}: ${d.v} ${d.u}`).join('\n');

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copié dans le presse-papier !'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copié !');
}

export function shareResults(name, data) {
    const text = `${name}\n` + data.map(d => `${d.l}: ${d.v} ${d.u}`).join('\n');
    if (navigator.share) {
        navigator.share({ title: `Kalou BTP – ${name}`, text });
    } else {
        copyResults(name, data);
    }
}

// ─── Rendu des résultats ──────────────────────────────────────────────────────

export function renderResults(containerId, data, name, category) {
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <div class="bg-kalou-dark text-white p-6 rounded-[2rem] shadow-2xl result-card relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-kalou-orange/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

            <div class="flex justify-between items-start relative z-10 mb-6">
                <div>
                    <span class="text-[10px] font-black uppercase text-kalou-orange tracking-widest">${esc(category)}</span>
                    <h3 class="text-2xl font-black leading-tight">${esc(name)}</h3>
                </div>
                <div class="flex gap-2">
                    <button class="btn-share bg-white/10 p-3 rounded-2xl active:bg-white/20 transition-all" title="Partager / Copier">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="btn-save bg-white/10 p-3 rounded-2xl active:bg-white/20 transition-all" title="Sauvegarder">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="space-y-3 relative z-10">
                ${data.map(r => `
                    <div class="flex justify-between items-center ${r.h ? 'bg-white/10 p-4 rounded-2xl border border-white/10' : 'px-1'}">
                        <span class="${r.h ? 'font-bold' : 'text-gray-400 text-sm'}">${esc(r.l)}</span>
                        <span class="${r.h ? 'text-2xl font-black text-kalou-orange' : 'font-bold text-lg'}">
                            ${esc(r.v)} <small class="text-[10px] uppercase opacity-50">${esc(r.u)}</small>
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.classList.remove('hidden');

    // Attacher les listeners (évite les inline onclick avec JSON)
    container.querySelector('.btn-share').addEventListener('click', () => shareResults(name, data));
    container.querySelector('.btn-save').addEventListener('click', () => window.saveHistory(name, category, data));

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
