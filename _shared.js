// ═══ CRYPTOPREDICT SHARED JS ═══
// API proxata da Vercel → VPS (no mixed content)
const API_BASE = '/api/v1';

const CP = {
  connected: false,
  balance: 4280,
  wallet: '0x7f3b...9e6c',
  cpred: 12500,
  userId: null,

  init() {
    const page = document.body.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.dataset.page === page) l.classList.add('active');
    });
    this.startCountdown();
    this.connected = true;
    this.updateNav();
    if (page === 'mercati') this.loadMarkets();
    if (page === 'home') this.loadHomeStats();
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
    const target = new Date(Date.now() + 21 * 24 * 3600 * 1000);
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'SCADUTO'; return; }
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      el.textContent = `CHIUDE TRA ${d}G ${h}H ${m}M`;
    };
    tick();
    setInterval(tick, 30000);
  },

  async loadMarkets() {
    try {
      const res = await fetch(`${API_BASE}/markets?status=open&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const grid = document.getElementById('markets-grid');
      if (!grid || !data.markets?.length) return;

      grid.innerHTML = '';
      data.markets.forEach(m => {
        const card = document.createElement('div');
        card.className = 'cp-card';
        card.style.cursor = 'pointer';
        const daysLeft = Math.max(0, Math.ceil((new Date(m.expires_at) - Date.now()) / 864e5));
        const yieldDay = m.yield_info?.daily_yield?.toFixed(2) || '0.00';
        const yieldTot = m.yield_info?.total_yield_estimated?.toFixed(2) || '0.00';
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-weight:700;font-size:.82rem">${m.asset_symbol || m.category}</div>
            <span class="tag tag-${m.yes_pct >= 50 ? 'green' : 'red'}">${m.yes_pct >= 50 ? 'YES' : 'NO'} ${m.yes_pct}%</span>
          </div>
          <div style="font-size:.9rem;font-weight:700;margin-bottom:10px;line-height:1.4">${m.title}</div>
          <div class="cp-bar"><div class="cp-bar-fill up" style="width:${m.yes_pct}%"></div></div>
          <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:.62rem;margin-bottom:12px">
            <span style="color:var(--green2)">YES ${m.yes_pct}%</span>
            <span style="color:var(--red2)">NO ${m.no_pct}%</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-family:'DM Mono',monospace;font-size:.72rem;color:var(--gold2);font-weight:700">Pool: $${Number(m.pool_size).toLocaleString()}</div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-up" style="font-size:.72rem;padding:5px 10px">▲ YES</button>
              <button class="btn btn-dn" style="font-size:.72rem;padding:5px 10px">▼ NO</button>
            </div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:.62rem;color:var(--text3);margin-top:6px">
            ⏱ Scade tra ${daysLeft}g · ${m.participant_count} partecipanti
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:7px 10px;border-radius:7px;background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.18)">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:5px;height:5px;border-radius:50%;background:#00e87a;animation:pulse 2s infinite"></div>
              <span style="font-family:'DM Mono',monospace;font-size:.6rem;color:#00e87a;font-weight:700;letter-spacing:.06em">POOL YIELD</span>
            </div>
            <span style="font-family:'DM Mono',monospace;font-size:.6rem;color:#00e87a;font-weight:700">+$${yieldDay}/giorno</span>
            <span style="font-family:'DM Mono',monospace;font-size:.58rem;color:var(--text3)">· Tot. ~$${yieldTot} · 4.8% APY</span>
          </div>`;
        grid.appendChild(card);
      });
    } catch(e) {
      console.warn('API non raggiungibile, usando dati statici', e);
    }
  },

  async loadHomeStats() {
    try {
      const res = await fetch(`${API_BASE}/yield/stats`);
      if (!res.ok) return;
      const data = await res.json();
      const els = {
        capital: document.querySelector('[data-stat="capital"]'),
        yield_today: document.querySelector('[data-stat="yield_today"]'),
        markets: document.querySelector('[data-stat="markets"]'),
      };
      if (els.capital) els.capital.textContent = '$' + Number(data.total_capital_locked).toLocaleString();
      if (els.yield_today) els.yield_today.textContent = '+$' + data.yield_today.toFixed(2);
      if (els.markets) els.markets.textContent = data.active_markets;
    } catch(e) {}
  }
};

function connectWallet() {
  CP.connected = true;
  CP.updateNav();
}

document.addEventListener('DOMContentLoaded', () => CP.init());
