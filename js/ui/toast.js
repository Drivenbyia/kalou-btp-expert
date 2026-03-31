export function showToast(msg, err = false) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = [
        'fixed bottom-28 left-1/2 -translate-x-1/2 z-[60]',
        'px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm text-white',
        'border-b-2 transition-all duration-300',
        err ? 'bg-red-600 border-red-800' : 'bg-kalou-dark border-kalou-orange'
    ].join(' ');
    t.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none'), 2500);
}
