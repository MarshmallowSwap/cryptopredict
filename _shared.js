// ═══ CRYPTOPREDICT SHARED JS ═══
const CP = {
  // Simulated state
  connected: false,
  balance: 4280,
  wallet: '0x7f3b...9e6c',
  cpred: 12500,

  init() {
    // Set active nav link
    const page = document.body.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.dataset.page === page) l.classList.add('active');
    });

    // Presale countdown
    this.startCountdown();

    // Demo: auto-connect
    this.connected = true;
    this.updateNav();
  },

  updateNav() {
    if (this.connected) {
      const b = document.getElementById('nav-balance');
      const w = document.getElementById('nav-wallet');
      const a = document.getElementById('nav-avatar');
      const c = document.getElementById('nav-connect-btn');
      if (b) { b.textContent = '$' + this.balance.toLocaleString() + ' USDC'; b.style.display = 'block'; }
      if (w) { w.textContent = this.wallet; w.style.display = 'block'; }
      if (a) a.style.display = 'flex';
      if (c) c.style.display = 'none';
    }
  },

  startCountdown() {
    const el = document.getElementById('pb-countdown');
    if (!el) return;
    // Target: 21 days from now
    const target = new Date(Date.now() + 21 * 24 * 3600 * 1000);
    setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'SCADUTO'; return; }
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      el.textContent = `CHIUDE TRA ${d}G ${h}H ${m}M`;
    }, 30000);
  }
};

function connectWallet() {
  CP.connected = true;
  CP.updateNav();
}

document.addEventListener('DOMContentLoaded', () => CP.init());
