import { showToast } from './ui/toast.js';

const STORAGE_KEY = 'kalou_btp_v3';

export function saveHistory(name, cat, data) {
    const h = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    h.unshift({
        id:   Date.now(),
        name, cat, data,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 50)));
    showToast('Chantier sauvegardé !');
}

export function deleteHistory(id) {
    const h = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h.filter(i => i.id !== id)));
    renderHistory();
}

export function clearHistory() {
    if (confirm('Supprimer tous les chantiers ?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
    }
}

export function renderHistory() {
    const h = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const container = document.getElementById('history-container');

    if (h.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-gray-200">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <p class="text-gray-600 font-black text-lg mb-1">Aucun chantier sauvegardé</p>
                <p class="text-gray-400 text-sm mb-4">Lance un calcul et appuie sur l'icône de sauvegarde</p>
                <button onclick="window.switchTab('gros-oeuvre')"
                        class="text-kalou-orange font-black text-sm uppercase tracking-widest">
                    Commencer un calcul →
                </button>
            </div>`;
        return;
    }

    container.innerHTML = h.map(item => `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-[9px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">${item.cat}</span>
                    <h4 class="text-lg font-black mt-1">${item.name}</h4>
                    <p class="text-[10px] text-gray-400 font-bold">${item.date}</p>
                </div>
                <button onclick="window.deleteHistory(${item.id})"
                        class="text-red-300 hover:text-red-500 p-2"
                        aria-label="Supprimer">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                    </svg>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-4">
                ${item.data.map(d => `
                    <div class="bg-gray-50 p-2.5 rounded-2xl text-center">
                        <p class="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">${d.l}</p>
                        <p class="text-base font-black">${d.v} <small class="text-[8px] opacity-40">${d.u}</small></p>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}
