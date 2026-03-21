// ═══ CRYPTOPREDICT SHARED JS ═══
const API_BASE = '/api/v1';

// ── WALLET STATE ──────────────────────────────────────────────────
const WALLET = {
  address: null,
  shortAddress: null,
  ethBalance: 0,
  cpredBalance: 0,
  cpredStaked: 0,
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
        window.ethereum.on('accountsChanged', (accs) => {
          if (!accs.length) WALLET.disconnect();
          else { WALLET.address = accs[0]; WALLET.shortAddress = shortAddr(accs[0]); CP.refreshWalletData(); }
        });
        window.ethereum.on('chainChanged', () => location.reload());
      } else if (type === 'demo') {
        this.address = '0x' + [...Array(40)].map(() => Math.floor(Math.random()*16).toString(16)).join('');
      }
      if (!this.address) return false;
      this.shortAddress = shortAddr(this.address);
      localStorage.setItem('cp_wallet', this.address);
      localStorage.setItem('cp_wallet_type', type);
      await CP.refreshWalletData();
      return true;
    } catch(e) { console.error('Connect error:', e); return false; }
  },

  disconnect() {
    this.address = null; this.shortAddress = null;
    this.ethBalance = 0; this.cpredBalance = 0;
    localStorage.removeItem('cp_wallet');
    localStorage.removeItem('cp_wallet_type');
    CP.connected = false;
    CP.updateNav();
    closeModal('wallet-modal');
  },

  async autoReconnect() {
    const saved = localStorage.getItem('cp_wallet');
    const type  = localStorage.getItem('cp_wallet_type');
    if (!saved) return false;
    if (type === 'metamask' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length && accounts[0].toLowerCase() === saved.toLowerCase()) {
          this.address = accounts[0];
          this.shortAddress = shortAddr(accounts[0]);
          return true;
        }
      } catch(e) {}
    } else if (type === 'demo') {
      this.address = saved;
      this.shortAddress = shortAddr(saved);
      return true;
    }
    return false;
  }
};

// ── HELPERS ───────────────────────────────────────────────────────
function shortAddr(a) { return a.slice(0,6)+'...'+a.slice(-4); }
function openModal(id) { const m=document.getElementById(id); if(m){m.style.display='flex';document.body.style.overflow='hidden';} }
function closeModal(id) { const m=document.getElementById(id); if(m){m.style.display='none';document.body.style.overflow='';} }
function fmtEth(v, d=4) { return parseFloat(v).toFixed(d) + ' ETH'; }

// ── MAIN APP ──────────────────────────────────────────────────────
let _cpReadyResolve;
const CP = {
  connected: false,
  ready: new Promise(r => { _cpReadyResolve = r; }),

  async init() {
    const page = document.body.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.dataset.page === page) l.classList.add('active');
    });
    this.startCountdown();
    this.injectWalletModal();

    const reconnected = await WALLET.autoReconnect();
    if (reconnected) {
      this.connected = true;
      await this.refreshWalletData();
    }
    this.updateNav();
    // Risolvi la promise CP.ready — le pagine aspettano questa
    _cpReadyResolve({ address: WALLET.address, connected: !!WALLET.address });
    // Emetti anche evento per compatibilità
    window.dispatchEvent(new CustomEvent('cp:wallet-ready', {
      detail: { address: WALLET.address, connected: !!WALLET.address }
    }));

    if (page === 'mercati')  this.loadMarkets();
    if (page === 'home')     this.loadHomeStats();
    if (page === 'presale')  this.loadPresaleStats();
    if (page === 'staking')  this.loadStakingStats();
  },

  async refreshWalletData() {
    if (!WALLET.address || !window.W3) return;
    try {
      const [eth, cpred] = await Promise.all([
        W3.getEthBalance(WALLET.address),
        W3.getCpredBalance(WALLET.address),
      ]);
      WALLET.ethBalance   = eth;
      WALLET.cpredBalance = cpred.balance;
      WALLET.cpredStaked  = cpred.staked;
    } catch(e) {}
    this.updateNav();
  },

  updateNav() {
    const b = document.getElementById('nav-balance');
    const w = document.getElementById('nav-wallet');
    const a = document.getElementById('nav-avatar');
    const c = document.getElementById('nav-connect-btn');
    if (WALLET.address) {
      if (b) { b.textContent = fmtEth(WALLET.ethBalance, 3); b.style.display='block'; }
      if (w) { w.textContent = WALLET.shortAddress; w.style.display='block'; }
      if (a) { a.style.display='flex'; a.onclick=()=>openModal('wallet-modal'); }
      if (c) c.style.display='none';
    } else {
      if (b) b.style.display='none';
      if (w) w.style.display='none';
      if (a) a.style.display='none';
      if (c) { c.style.display='flex'; c.onclick=()=>openModal('wallet-modal'); }
    }
  },

  startCountdown() {
    const el = document.getElementById('pb-countdown');
    if (!el) return;
    const target = new Date(Date.now() + 21*24*3600*1000);
    const tick = () => {
      const diff = target - Date.now();
      if (diff<=0){el.textContent='SCADUTO';return;}
      const d=Math.floor(diff/864e5),h=Math.floor(diff%864e5/36e5),m=Math.floor(diff%36e5/6e4);
      el.textContent=`CHIUDE TRA ${d}G ${h}H ${m}M`;
    };
    tick(); setInterval(tick,30000);
  },

  // ── Markets ─────────────────────────────────────────────────────
  async loadMarkets() {
    const grid = document.getElementById('markets-grid');
    if (!grid) return;

    // Prova on-chain prima, fallback API
    let markets = null;
    if (window.W3) {
      markets = await W3.loadMarketsOnChain();
    }
    if (!markets) {
      try {
        const res = await fetch(`${API_BASE}/markets?status=open&limit=20`);
        if (res.ok) { const d=await res.json(); markets=d.markets; }
      } catch(e) {}
    }
    if (!markets?.length) return;

    grid.innerHTML = '';
    markets.forEach(m => {
      const card = document.createElement('div');
      card.className = 'cp-card';
      card.style.cursor = 'pointer';
      const daysLeft = m.days_left ?? Math.max(0,Math.ceil((new Date(m.expires_at)-Date.now())/864e5));
      const yieldDay = parseFloat(m.yield_info?.daily_yield||0).toFixed(4);
      const poolDisplay = m.pool_size > 0
        ? (m.pool_size < 1 ? m.pool_size.toFixed(4)+' ETH' : m.pool_size.toFixed(3)+' ETH')
        : '0 ETH';
      const isYes = m.yes_pct >= 50;
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-weight:700;font-size:.82rem">${m.asset_symbol||m.category}</div>
          <span class="tag tag-${isYes?'green':'red'}">${isYes?'YES':'NO'} ${m.yes_pct}%</span>
        </div>
        <div style="font-size:.9rem;font-weight:700;margin-bottom:10px;line-height:1.4">${m.title}</div>
        <div class="cp-bar"><div class="cp-bar-fill up" style="width:${m.yes_pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:.62rem;margin-bottom:12px">
          <span style="color:var(--green2)">YES ${m.yes_pct}%</span>
          <span style="color:var(--red2)">NO ${m.no_pct}%</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-family:'DM Mono',monospace;font-size:.72rem;color:var(--gold2);font-weight:700">Pool: ${poolDisplay}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-up" style="font-size:.72rem;padding:5px 10px"
              onclick="event.stopPropagation();CP.placeBet(${m.id??m.id},true,this)">▲ YES</button>
            <button class="btn btn-dn" style="font-size:.72rem;padding:5px 10px"
              onclick="event.stopPropagation();CP.placeBet(${m.id??m.id},false,this)">▼ NO</button>
          </div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:.62rem;color:var(--text3);margin-top:6px">
          ⏱ Scade tra ${daysLeft}g · ${m.participant_count||0} partecipanti
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:7px 10px;border-radius:7px;background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.18)">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:5px;height:5px;border-radius:50%;background:#00e87a;animation:pulse 2s infinite"></div>
            <span style="font-family:'DM Mono',monospace;font-size:.6rem;color:#00e87a;font-weight:700">ON-CHAIN YIELD</span>
          </div>
          <span style="font-family:'DM Mono',monospace;font-size:.6rem;color:#00e87a;font-weight:700">+${yieldDay} ETH/g</span>
          <span style="font-family:'DM Mono',monospace;font-size:.58rem;color:var(--text3)">4.8% APY</span>
        </div>`;
      grid.appendChild(card);
    });
  },

  async placeBet(marketId, side, btn) {
    if (!WALLET.address) { openModal('wallet-modal'); return; }
    if (!window.W3) { alert('Web3 non disponibile'); return; }

    const ethAmt = parseFloat(prompt(`Importo ETH da scommettere su ${side?'YES ▲':'NO ▼'}:\n(min 0.0001 ETH)`)||'0');
    if (!ethAmt || ethAmt < 0.0001) return;
    if (ethAmt > WALLET.ethBalance) { alert('Saldo ETH insufficiente'); return; }

    btn.disabled = true;
    btn.textContent = '...';
    try {
      const result = await W3.placeBetOnChain(marketId, side, ethAmt);
      await this.refreshWalletData();
      alert(`✅ Scommessa on-chain!\n${side?'YES ▲':'NO ▼'} · ${ethAmt} ETH\nVincita est: ${result.potentialPayout.toFixed(4)} ETH\n\nTx: ${result.explorerUrl}`);
      this.loadMarkets();
    } catch(e) {
      alert(`Errore: ${e.message||'Transazione fallita'}`);
    } finally {
      btn.disabled = false;
      btn.textContent = side ? '▲ YES' : '▼ NO';
    }
  },

  async loadPresaleStats() {
    if (!window.W3) return;
    const info = await W3.getPresaleInfo();
    if (!info) return;
    // Aggiorna elementi con data-presale se presenti
    const els = {
      stage:   document.querySelector('[data-presale="stage"]'),
      pct:     document.querySelector('[data-presale="pct"]'),
      price:   document.querySelector('[data-presale="price"]'),
      raised:  document.querySelector('[data-presale="raised"]'),
    };
    if (els.stage)  els.stage.textContent  = `Stage ${info.currentStage}`;
    if (els.pct)    els.pct.textContent    = `${info.pctSold}%`;
    if (els.price)  els.price.textContent  = `$${info.priceUsd.toFixed(3)}`;
    if (els.raised) els.raised.textContent = `${info.totalRaisedEth.toFixed(3)} ETH`;
  },

  async loadStakingStats() {
    if (!WALLET.address || !window.W3) return;
    const cpred = await W3.getCpredBalance(WALLET.address);
    const els = {
      staked:  document.querySelector('[data-staking="staked"]'),
      reward:  document.querySelector('[data-staking="reward"]'),
      balance: document.querySelector('[data-staking="balance"]'),
    };
    if (els.staked)  els.staked.textContent  = cpred.staked.toLocaleString() + ' CPRED';
    if (els.reward)  els.reward.textContent  = cpred.reward.toFixed(6) + ' ETH';
    if (els.balance) els.balance.textContent = cpred.balance.toLocaleString() + ' CPRED';
  },

  async loadHomeStats() {
    try {
      const res = await fetch(`${API_BASE}/yield/stats`);
      if (res.ok) {
        const d = await res.json();
        const c = document.querySelector('[data-stat="capital"]');
        const y = document.querySelector('[data-stat="yield_today"]');
        const m = document.querySelector('[data-stat="markets"]');
        if (c) c.textContent = '$'+Number(d.total_capital_locked).toLocaleString();
        if (y) y.textContent = '+$'+d.yield_today.toFixed(2);
        if (m) m.textContent = d.active_markets;
      }
    } catch(e) {}
  },

  // ── Wallet Modal ─────────────────────────────────────────────────
  injectWalletModal() {
    if (document.getElementById('wallet-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'wallet-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#0d0b1c;border:1px solid rgba(124,58,237,.3);border-radius:20px;padding:32px;width:100%;max-width:400px;position:relative;box-shadow:0 0 60px rgba(124,58,237,.15)">
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#a855f7,transparent);border-radius:20px 20px 0 0"></div>
        <button onclick="closeModal('wallet-modal')" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;width:32px;height:32px;cursor:pointer;color:#7a738f;font-size:16px;">✕</button>

        <div id="wm-connect-view">
          <div style="font-size:1.1rem;font-weight:800;color:#f0ecff;margin-bottom:6px">Connetti il wallet</div>
          <div style="font-size:.8rem;color:#7a738f;margin-bottom:6px">Rete: <strong style="color:#00d4ff">Base Sepolia</strong> (testnet)</div>
          <div style="font-size:.73rem;color:#7a738f;margin-bottom:22px;padding:8px 10px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:8px">
            🔗 I contratti sono live su Base Sepolia. Ti servirà ETH testnet gratuito da <a href="https://faucet.quicknode.com/base/sepolia" target="_blank" style="color:#00d4ff">faucet.quicknode.com</a>
          </div>

          <button onclick="CP.connectWallet('metamask')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;margin-bottom:10px;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(124,58,237,.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)'">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f6851b,#e2761b);display:flex;align-items:center;justify-content:center;font-size:20px">🦊</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">MetaMask</div><div style="font-size:.75rem;color:#7a738f">Browser extension · Base Sepolia</div></div>
            <span style="margin-left:auto;color:#7a738f">→</span>
          </button>

          <button onclick="CP.connectWallet('demo')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(0,232,122,.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)'">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(0,232,122,.15);border:1px solid rgba(0,232,122,.3);display:flex;align-items:center;justify-content:center;font-size:20px">🧪</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">Demo mode</div><div style="font-size:.75rem;color:#7a738f">Esplora senza wallet</div></div>
            <span style="margin-left:auto;color:#7a738f">→</span>
          </button>
        </div>

        <div id="wm-connected-view" style="display:none">
          <div style="text-align:center;margin-bottom:20px">
            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 10px">👤</div>
            <div style="font-weight:800;color:#f0ecff;margin-bottom:2px" id="wm-addr">—</div>
            <div style="font-size:.72rem;color:#00d4ff">Base Sepolia</div>
          </div>
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:.8rem;color:#7a738f">ETH Balance</span>
              <span style="font-family:'DM Mono',monospace;font-size:.85rem;color:#34d399;font-weight:700" id="wm-eth">0 ETH</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:.8rem;color:#7a738f">CPRED</span>
              <span style="font-family:'DM Mono',monospace;font-size:.85rem;color:#fbbf24;font-weight:700" id="wm-cpred">0</span>
            </div>
          </div>
          <div style="font-size:.7rem;color:#3d3856;margin-bottom:14px;text-align:center">
            <a href="https://sepolia.basescan.org/address/" id="wm-explorer" target="_blank" style="color:#7a738f">Vedi su BaseScan →</a>
          </div>
          <div style="display:flex;gap:8px">
            <a href="portfolio.html" style="flex:1;padding:10px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:10px;color:#c4b5fd;font-size:.82rem;font-weight:700;text-decoration:none;text-align:center">Portfolio</a>
            <button onclick="WALLET.disconnect();document.getElementById('wm-connect-view').style.display='block';document.getElementById('wm-connected-view').style.display='none';" style="flex:1;padding:10px;background:rgba(255,58,92,.08);border:1px solid rgba(255,58,92,.2);border-radius:10px;color:#f87171;font-size:.82rem;font-weight:700;cursor:pointer">Disconnetti</button>
          </div>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) closeModal('wallet-modal'); });
    document.body.appendChild(modal);
  },

  async connectWallet(type) {
    const success = await WALLET.connect(type);
    if (success) {
      this.connected = true;
      this.updateNav();
      document.getElementById('wm-connect-view').style.display = 'none';
      document.getElementById('wm-connected-view').style.display = 'block';
      document.getElementById('wm-addr').textContent = WALLET.shortAddress;
      document.getElementById('wm-eth').textContent = fmtEth(WALLET.ethBalance, 4);
      document.getElementById('wm-cpred').textContent = WALLET.cpredBalance.toLocaleString();
      const expEl = document.getElementById('wm-explorer');
      if (expEl) expEl.href = `https://sepolia.basescan.org/address/${WALLET.address}`;
      setTimeout(() => closeModal('wallet-modal'), 1500);
    }
  }
};

function connectWallet() { openModal('wallet-modal'); }
document.addEventListener('DOMContentLoaded', () => CP.init());
