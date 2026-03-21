// ═══ CRYPTOPREDICT SHARED JS ═══
const API_BASE = '/api/v1';

// ── WALLET STATE ──────────────────────────────────────────────────
const WALLET = {
  address: null,
  shortAddress: null,
  provider: null,
  balance: 0,
  userId: null,

  async connect(type) {
    try {
      if (type === 'metamask') {
        if (!window.ethereum) {
          alert('MetaMask non trovato. Installalo da metamask.io');
          return false;
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.address = accounts[0];
        this.provider = window.ethereum;
        window.ethereum.on('accountsChanged', (accs) => {
          if (accs.length === 0) WALLET.disconnect();
          else { WALLET.address = accs[0]; WALLET.shortAddress = shortAddr(accs[0]); CP.updateNav(); }
        });
      } else if (type === 'walletconnect') {
        // WalletConnect via QR
        const wc = await initWalletConnect();
        if (!wc) return false;
        this.address = wc.address;
        this.provider = wc.provider;
      }
      if (!this.address) return false;
      this.shortAddress = shortAddr(this.address);
      // Registra utente sul backend
      await this.registerUser();
      localStorage.setItem('cp_wallet', this.address);
      localStorage.setItem('cp_wallet_type', type);
      return true;
    } catch(e) {
      console.error('Wallet connect error:', e);
      return false;
    }
  },

  disconnect() {
    this.address = null;
    this.shortAddress = null;
    this.provider = null;
    this.userId = null;
    localStorage.removeItem('cp_wallet');
    localStorage.removeItem('cp_wallet_type');
    localStorage.removeItem('cp_user_id');
    CP.connected = false;
    CP.updateNav();
    closeModal('wallet-modal');
  },

  async registerUser() {
    try {
      // Cerca utente esistente
      let res = await fetch(`${API_BASE}/users/wallet/${this.address}`);
      if (res.ok) {
        const u = await res.json();
        this.userId = u.id;
        CP.balance = parseFloat(u.usdc_balance) || 0;
        CP.cpred = parseFloat(u.cpred_balance) || 0;
        localStorage.setItem('cp_user_id', u.id);
        return;
      }
      // Crea nuovo utente
      res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: this.address, display_name: shortAddr(this.address) })
      });
      if (res.ok) {
        const u = await res.json();
        this.userId = u.id;
        CP.balance = parseFloat(u.usdc_balance) || 0;
        CP.cpred = parseFloat(u.cpred_balance) || 0;
        localStorage.setItem('cp_user_id', u.id);
      }
    } catch(e) {
      console.warn('Backend non raggiungibile:', e);
      // Continua con dati locali
      this.userId = 'local-' + this.address.slice(2, 10);
    }
  },

  async autoReconnect() {
    const saved = localStorage.getItem('cp_wallet');
    const type = localStorage.getItem('cp_wallet_type');
    if (!saved || !type) return false;
    // Solo MetaMask — riconnessione silenziosa
    if (type === 'metamask' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length && accounts[0].toLowerCase() === saved.toLowerCase()) {
          this.address = accounts[0];
          this.shortAddress = shortAddr(accounts[0]);
          this.provider = window.ethereum;
          await this.registerUser();
          return true;
        }
      } catch(e) {}
    }
    return false;
  }
};

// ── HELPERS ───────────────────────────────────────────────────────
function shortAddr(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
}

async function initWalletConnect() {
  // Usa il QR code di WalletConnect v2 via window.ethereum se disponibile
  // Fallback: mostra istruzioni per mobile
  alert('Per mobile: usa MetaMask Mobile e apri questo sito nel browser integrato di MetaMask.');
  return null;
}

// ── MAIN APP STATE ────────────────────────────────────────────────
const CP = {
  connected: false,
  balance: 0,
  cpred: 0,

  async init() {
    const page = document.body.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.dataset.page === page) l.classList.add('active');
    });

    this.startCountdown();
    this.injectWalletModal();

    // Auto-reconnect
    const reconnected = await WALLET.autoReconnect();
    if (reconnected) {
      this.connected = true;
      this.updateNav();
    }

    if (page === 'mercati') this.loadMarkets();
    if (page === 'home') this.loadHomeStats();
    if (page === 'portfolio' && WALLET.userId) this.loadPortfolio();
  },

  updateNav() {
    const b = document.getElementById('nav-balance');
    const w = document.getElementById('nav-wallet');
    const a = document.getElementById('nav-avatar');
    const c = document.getElementById('nav-connect-btn');

    if (WALLET.address) {
      if (b) { b.textContent = '$' + this.balance.toLocaleString(undefined, {maximumFractionDigits:2}) + ' USDC'; b.style.display = 'block'; }
      if (w) { w.textContent = WALLET.shortAddress; w.style.display = 'block'; }
      if (a) { a.style.display = 'flex'; a.onclick = () => openModal('wallet-modal'); }
      if (c) c.style.display = 'none';
    } else {
      if (b) b.style.display = 'none';
      if (w) w.style.display = 'none';
      if (a) a.style.display = 'none';
      if (c) { c.style.display = 'flex'; c.onclick = () => openModal('wallet-modal'); }
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
    tick(); setInterval(tick, 30000);
  },

  injectWalletModal() {
    if (document.getElementById('wallet-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'wallet-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#0d0b1c;border:1px solid rgba(124,58,237,.3);border-radius:20px;padding:32px;width:100%;max-width:400px;position:relative;box-shadow:0 0 60px rgba(124,58,237,.15)">
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#a855f7,transparent);border-radius:20px 20px 0 0"></div>
        <button onclick="closeModal('wallet-modal')" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;width:32px;height:32px;cursor:pointer;color:#7a738f;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>

        <div id="wm-connect-view">
          <div style="font-size:1.1rem;font-weight:800;color:#f0ecff;margin-bottom:6px">Connetti il wallet</div>
          <div style="font-size:.8rem;color:#7a738f;margin-bottom:24px">Scegli come connetterti alla piattaforma</div>

          <button onclick="CP.connectWallet('metamask')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;margin-bottom:10px;transition:all .2s;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(124,58,237,.4)';this.style.background='rgba(124,58,237,.08)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)';this.style.background='rgba(255,255,255,.04)'">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f6851b,#e2761b);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🦊</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">MetaMask</div><div style="font-size:.75rem;color:#7a738f">Browser extension</div></div>
            <div style="margin-left:auto;font-size:.7rem;color:#7a738f">→</div>
          </button>

          <button onclick="CP.connectWallet('walletconnect')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;margin-bottom:10px;transition:all .2s;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(59,153,252,.4)';this.style.background='rgba(59,153,252,.08)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)';this.style.background='rgba(255,255,255,.04)'">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#3b99fc,#0059b3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🔗</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">WalletConnect</div><div style="font-size:.75rem;color:#7a738f">Mobile wallet via QR</div></div>
            <div style="margin-left:auto;font-size:.7rem;color:#7a738f">→</div>
          </button>

          <button onclick="CP.connectWallet('demo')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;margin-bottom:0;transition:all .2s;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(0,232,122,.3)';this.style.background='rgba(0,232,122,.06)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)';this.style.background='rgba(255,255,255,.04)'">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(0,232,122,.15);border:1px solid rgba(0,232,122,.3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🧪</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">Demo mode</div><div style="font-size:.75rem;color:#7a738f">Esplora senza wallet</div></div>
            <div style="margin-left:auto;font-size:.7rem;color:#7a738f">→</div>
          </button>

          <div style="margin-top:20px;text-align:center;font-size:.72rem;color:#3d3856">
            Connettendoti accetti i <span style="color:#a855f7;cursor:pointer">Termini di Servizio</span>
          </div>
        </div>

        <div id="wm-connected-view" style="display:none">
          <div style="text-align:center;margin-bottom:20px">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 12px">👤</div>
            <div style="font-weight:800;color:#f0ecff;margin-bottom:4px" id="wm-addr">—</div>
            <div style="font-size:.78rem;color:#7a738f">Wallet connesso</div>
          </div>
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
              <span style="font-size:.8rem;color:#7a738f">Saldo USDC</span>
              <span style="font-family:'DM Mono',monospace;font-size:.85rem;color:#34d399;font-weight:700" id="wm-balance">$0</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:.8rem;color:#7a738f">CPRED</span>
              <span style="font-family:'DM Mono',monospace;font-size:.85rem;color:#fbbf24;font-weight:700" id="wm-cpred">0</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <a href="portfolio.html" style="flex:1;padding:10px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:10px;color:#c4b5fd;font-size:.82rem;font-weight:700;text-decoration:none;text-align:center">Portfolio</a>
            <button onclick="WALLET.disconnect();document.getElementById('wm-connect-view').style.display='block';document.getElementById('wm-connected-view').style.display='none';" style="flex:1;padding:10px;background:rgba(255,58,92,.08);border:1px solid rgba(255,58,92,.2);border-radius:10px;color:#f87171;font-size:.82rem;font-weight:700;cursor:pointer">Disconnetti</button>
          </div>
        </div>
      </div>`;

    // Chiudi cliccando fuori
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal('wallet-modal'); });
    document.body.appendChild(modal);
  },

  async connectWallet(type) {
    const btn = event.currentTarget;
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<div style="margin:0 auto;width:20px;height:20px;border:2px solid #7a738f;border-top-color:#a855f7;border-radius:50%;animation:cp-spin .8s linear infinite"></div>';
    btn.disabled = true;

    let success = false;
    if (type === 'demo') {
      WALLET.address = '0x7f3a' + Math.random().toString(16).slice(2, 10) + '9e2b';
      WALLET.shortAddress = shortAddr(WALLET.address);
      WALLET.userId = 'demo-' + Date.now();
      this.balance = 4280;
      this.cpred = 12500;
      success = true;
    } else {
      success = await WALLET.connect(type);
    }

    btn.innerHTML = origHTML;
    btn.disabled = false;

    if (success) {
      this.connected = true;
      this.updateNav();
      // Mostra vista "connected"
      document.getElementById('wm-connect-view').style.display = 'none';
      document.getElementById('wm-connected-view').style.display = 'block';
      document.getElementById('wm-addr').textContent = WALLET.shortAddress;
      document.getElementById('wm-balance').textContent = '$' + this.balance.toLocaleString(undefined, {maximumFractionDigits:2});
      document.getElementById('wm-cpred').textContent = this.cpred.toLocaleString();
      // Chiudi dopo 1.5s
      setTimeout(() => closeModal('wallet-modal'), 1500);
    }
  },

  // ── LOAD DATA ────────────────────────────────────────────────────
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
        const isYes = m.yes_pct >= 50;
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-weight:700;font-size:.82rem">${m.asset_symbol || m.category}</div>
            <span class="tag tag-${isYes ? 'green' : 'red'}">${isYes ? 'YES' : 'NO'} ${m.yes_pct}%</span>
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
              <button class="btn btn-up" style="font-size:.72rem;padding:5px 10px" onclick="event.stopPropagation();CP.placeBet('${m.id}', true, this)">▲ YES</button>
              <button class="btn btn-dn" style="font-size:.72rem;padding:5px 10px" onclick="event.stopPropagation();CP.placeBet('${m.id}', false, this)">▼ NO</button>
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
            <span style="font-family:'DM Mono',monospace;font-size:.58rem;color:var(--text3)">· Tot. ~$${yieldTot}</span>
          </div>`;
        grid.appendChild(card);
      });
    } catch(e) {
      console.warn('API non raggiungibile, usando dati statici', e);
    }
  },

  async placeBet(marketId, side, btn) {
    if (!WALLET.address) {
      openModal('wallet-modal');
      return;
    }
    const amount = parseFloat(prompt(`Importo USDC da scommettere (${side ? 'YES ▲' : 'NO ▼'}):`) || '0');
    if (!amount || amount <= 0) return;
    if (amount > this.balance) { alert('Saldo insufficiente'); return; }

    btn.disabled = true;
    btn.textContent = '...';
    try {
      const res = await fetch(`${API_BASE}/markets/${marketId}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: WALLET.userId, side, amount })
      });
      if (res.ok) {
        const d = await res.json();
        this.balance -= amount;
        this.updateNav();
        alert(`✅ Scommessa piazzata!\n${side ? 'YES ▲' : 'NO ▼'} · $${amount} USDC\nVincita potenziale: $${d.potential_payout?.toFixed(2)}`);
        this.loadMarkets();
      } else {
        const err = await res.json();
        alert(`Errore: ${err.detail || 'Scommessa non riuscita'}`);
      }
    } catch(e) {
      alert('Errore di rete. Riprova.');
    } finally {
      btn.disabled = false;
      btn.textContent = side ? '▲ YES' : '▼ NO';
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
  },

  async loadPortfolio() {
    if (!WALLET.userId) return;
    try {
      const res = await fetch(`${API_BASE}/users/${WALLET.userId}/stats`);
      if (!res.ok) return;
      const d = await res.json();
      this.balance = parseFloat(d.usdc_balance) || 0;
      this.updateNav();
    } catch(e) {}
  }
};

// ── CSS INJECTION ─────────────────────────────────────────────────
(function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes cp-spin { to { transform: rotate(360deg); } }
    #wallet-modal { font-family: 'Syne', sans-serif; }
    .nav-connect { cursor: pointer; }
  `;
  document.head.appendChild(s);
})();

// ── INIT ──────────────────────────────────────────────────────────
function connectWallet() { openModal('wallet-modal'); }
document.addEventListener('DOMContentLoaded', () => CP.init());
