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
    this.updatePresaleBanner();
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
      if (b) {
        // Mostra ETH con abbastanza decimali + CPRED se presente
        var ethVal  = WALLET.ethBalance || 0;
        var ethStr  = ethVal.toFixed(4) + ' ETH';
        var cpred   = WALLET.cpredBalance || 0;
        var cpredFmt = cpred >= 1000000 ? (cpred/1000000).toFixed(1)+'M'
                     : cpred >= 1000    ? (cpred/1000).toFixed(1)+'K'
                     : cpred.toFixed(0);
        var cpredStr = cpred > 0 ? ' · ' + cpredFmt + ' CPRED' : '';
        b.textContent = ethStr + cpredStr;
        b.style.display = 'block';
      }
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
          ⏱ Ends in ${daysLeft}g · ${m.participant_count||0} partecipanti
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
    if (ethAmt > WALLET.ethBalance) { alert('Insufficient ETH balance'); return; }

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


  // ── PRESALE BANNER — dati live dal contratto ─────────────────
  async updatePresaleBanner() {
    try {
      if (!window.W3) return;
      const info = await W3.getPresaleInfo();
      if (!info) return;
      const liveEl  = document.querySelector('.pb-live');
      const priceEl = document.querySelector('.pb-price');
      if (liveEl)  liveEl.innerHTML  = `<span class="tick-dot"></span>PRESALE LIVE — STAGE ${info.currentStage} · ${info.pctSold}% VENDUTO`;
      if (priceEl) priceEl.textContent = `· $${info.priceUsd.toFixed(3)} · ${info.totalRaisedEth.toFixed(3)} ETH raccolti`;
      // Countdown dal contratto
      const endsAt = info.presaleEndsAt * 1000;
      const el = document.getElementById('pb-countdown');
      if (el && endsAt > Date.now()) {
        const tick = () => {
          const diff = endsAt - Date.now();
          if (diff <= 0) { el.textContent = 'PRESALE TERMINATA'; return; }
          const dd = Math.floor(diff/864e5);
          const hh = Math.floor(diff%864e5/36e5);
          const mm = Math.floor(diff%36e5/6e4);
          const ss = Math.floor(diff%6e4/1e3);
          el.textContent = `CHIUDE TRA ${dd}G ${hh}H ${mm}M ${String(ss).padStart(2,'0')}S`;
        };
        tick(); setInterval(tick, 1000);
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
          <div style="font-size:1.1rem;font-weight:800;color:#f0ecff;margin-bottom:6px">Connect wallet</div>
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

/* ── AI ADVISOR FLOATING WIDGET ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  // Inject styles
  var style = document.createElement('style');
  style.textContent = `
    @keyframes ai-pop{from{opacity:0;transform:scale(.8) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes ai-dot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
    #ai-fab{
      position:fixed;bottom:28px;right:28px;z-index:9000;
      width:52px;height:52px;border-radius:50%;
      background:linear-gradient(135deg,#7c3aed,#a855f7);
      border:none;cursor:pointer;
      box-shadow:0 4px 24px rgba(124,58,237,.45);
      display:flex;align-items:center;justify-content:center;
      font-size:22px;transition:transform .2s,box-shadow .2s;
      color:#fff;
    }
    #ai-fab:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(124,58,237,.6)}
    #ai-fab .ai-badge{
      position:absolute;top:-3px;right:-3px;
      width:16px;height:16px;border-radius:50%;
      background:#10b981;border:2px solid #080810;
      animation:pulse 2s infinite;
    }
    #ai-drawer{
      position:fixed;bottom:90px;right:28px;z-index:9001;
      width:340px;max-width:calc(100vw - 40px);
      background:#0f0f1a;
      border:1px solid rgba(124,58,237,.3);
      border-radius:16px;overflow:hidden;
      box-shadow:0 8px 48px rgba(124,58,237,.2),0 2px 16px rgba(0,0,0,.6);
      display:none;flex-direction:column;
      animation:ai-pop .2s ease;
    }
    #ai-drawer.open{display:flex}
    #ai-drawer-head{
      padding:12px 14px;
      background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(124,58,237,.06));
      border-bottom:1px solid rgba(124,58,237,.2);
      display:flex;align-items:center;gap:10px;
    }
    #ai-drawer-msgs{
      padding:12px 14px;
      height:240px;overflow-y:auto;
      display:flex;flex-direction:column;gap:10px;
      scrollbar-width:thin;scrollbar-color:rgba(124,58,237,.3) transparent;
    }
    #ai-drawer-msgs::-webkit-scrollbar{width:4px}
    #ai-drawer-msgs::-webkit-scrollbar-thumb{background:rgba(124,58,237,.3);border-radius:2px}
    .ai-msg-user{
      align-self:flex-end;
      background:rgba(124,58,237,.2);border:1px solid rgba(124,58,237,.3);
      border-radius:12px 2px 12px 12px;
      padding:8px 12px;font-size:.78rem;color:#e2e8f0;
      line-height:1.5;max-width:85%;
    }
    .ai-msg-bot{
      align-self:flex-start;display:flex;gap:8px;align-items:flex-start;max-width:90%;
    }
    .ai-msg-bot-bubble{
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
      border-radius:2px 12px 12px 12px;
      padding:8px 12px;font-size:.78rem;color:#e2e8f0;line-height:1.5;
    }
    .ai-avatar-sm{
      width:24px;height:24px;border-radius:50%;flex-shrink:0;
      background:linear-gradient(135deg,#7c3aed,#a855f7);
      display:flex;align-items:center;justify-content:center;font-size:11px;
    }
    .ai-typing-dot{
      width:5px;height:5px;border-radius:50%;background:#a855f7;
      animation:ai-dot .6s ease infinite;display:inline-block;margin:0 1px;
    }
    #ai-drawer-sugg{
      padding:0 14px 8px;display:flex;gap:5px;flex-wrap:wrap;
    }
    .ai-sugg-btn{
      padding:3px 10px;background:rgba(124,58,237,.08);
      border:1px solid rgba(124,58,237,.25);border-radius:20px;
      font-size:.62rem;color:#c4b5fd;cursor:pointer;
      font-family:'DM Mono',monospace;transition:background .15s;
    }
    .ai-sugg-btn:hover{background:rgba(124,58,237,.2)}
    #ai-drawer-inp-row{
      padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);
      display:flex;gap:8px;
    }
    #ai-drawer-inp{
      flex:1;background:rgba(255,255,255,.05);
      border:1px solid rgba(124,58,237,.2);border-radius:8px;
      padding:7px 10px;font-size:.75rem;color:#e2e8f0;
      outline:none;font-family:'DM Mono',monospace;
      transition:border-color .2s;
    }
    #ai-drawer-inp:focus{border-color:rgba(124,58,237,.5)}
    #ai-drawer-inp::placeholder{color:rgba(255,255,255,.3)}
    #ai-drawer-send{
      padding:7px 12px;background:linear-gradient(135deg,#7c3aed,#a855f7);
      border:none;border-radius:8px;color:#fff;
      font-weight:700;font-size:.72rem;cursor:pointer;
      font-family:'Syne',sans-serif;white-space:nowrap;
      transition:opacity .2s;
    }
    #ai-drawer-send:hover{opacity:.85}
    #ai-drawer-send:disabled{opacity:.5;cursor:default}
  `;
  document.head.appendChild(style);

  // FAB Button
  var fab = document.createElement('button');
  fab.id = 'ai-fab';
  fab.title = 'AI Advisor';
  fab.innerHTML = '🔮<span class="ai-badge"></span>';
  document.body.appendChild(fab);

  // Drawer
  var drawer = document.createElement('div');
  drawer.id = 'ai-drawer';
  drawer.innerHTML = `
    <div id="ai-drawer-head">
      <div class="ai-avatar-sm">🔮</div>
      <div style="flex:1">
        <div style="font-size:.78rem;font-weight:700;color:#e2e8f0">CryptoPredict AI</div>
        <div style="font-size:.6rem;color:#a855f7;font-family:'DM Mono',monospace">Powered by Claude</div>
      </div>
      <button onclick="document.getElementById('ai-drawer').classList.remove('open')"
        style="background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:18px;line-height:1">✕</button>
    </div>
    <div id="ai-drawer-msgs"></div>
    <div id="ai-drawer-sugg">
      <button class="ai-sugg-btn" onclick="aiWidget.ask('How does yield work?')">Yield?</button>
      <button class="ai-sugg-btn" onclick="aiWidget.ask('How to buy CPRED?')">Buy CPRED?</button>
      <button class="ai-sugg-btn" onclick="aiWidget.ask('What staking APY can I earn?')">Staking APY?</button>
      <button class="ai-sugg-btn" onclick="aiWidget.ask('How does governance work?')">Governance?</button>
    </div>
    <div id="ai-drawer-inp-row">
      <input id="ai-drawer-inp" placeholder="Ask anything..." type="text">
      <button id="ai-drawer-send" onclick="aiWidget.send()">Send ↗</button>
    </div>
  `;
  document.body.appendChild(drawer);

  // Initial bot message
  var msgs = document.getElementById('ai-drawer-msgs');
  aiWidget.addBot("Hi! I'm the CryptoPredict AI. Ask me anything about prediction markets, $CPRED, staking, or governance! 🚀");

  // Input enter key
  document.getElementById('ai-drawer-inp').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') aiWidget.send();
  });

  // Toggle
  fab.addEventListener('click', function() {
    var d = document.getElementById('ai-drawer');
    d.classList.toggle('open');
    if (d.classList.contains('open')) {
      setTimeout(function(){ document.getElementById('ai-drawer-inp').focus(); }, 100);
    }
  });
});

/* ── AI WIDGET LOGIC ── */
var aiWidget = (function() {
  var history = [];
  var SYSTEM = 'You are the CryptoPredict AI advisor. CryptoPredict is a 100% crypto-native prediction market on Base Sepolia. Key facts: Token $CPRED (100M supply), presale Stage 1 $0.050, listing target $0.150. Markets: bet YES/NO on events using ETH, USDC, USDT or CPRED. Yield: 4.8% APY automatic on pools (simulated testnet, real DeFi on mainnet via Aave). Staking: Flexible 12%, 30-day 20%, 90-day 28% APY in CPRED + ETH from protocol fees. Fees: 2% on payout (1% creator + 1% stakers), 0% CPRED markets. Need 1,000 CPRED to create markets. Governance: 1 CPRED = 1 vote, launches mainnet Q4 2025. Secondary market: sell positions before expiry, 0.5% fee. Be concise and helpful. Answer in the same language the user writes in.';

  function addBot(text) {
    var msgs = document.getElementById('ai-drawer-msgs');
    if (!msgs) return;
    var row = document.createElement('div');
    row.className = 'ai-msg-bot';
    row.innerHTML = '<div class="ai-avatar-sm">🔮</div><div class="ai-msg-bot-bubble">' + escHtml(text) + '</div>';
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addUser(text) {
    var msgs = document.getElementById('ai-drawer-msgs');
    if (!msgs) return;
    var el = document.createElement('div');
    el.className = 'ai-msg-user';
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addTyping() {
    var msgs = document.getElementById('ai-drawer-msgs');
    var el = document.createElement('div');
    el.id = 'ai-typing-indicator';
    el.className = 'ai-msg-bot';
    el.innerHTML = '<div class="ai-avatar-sm">🔮</div><div class="ai-msg-bot-bubble"><span class="ai-typing-dot"></span><span class="ai-typing-dot" style="animation-delay:.15s"></span><span class="ai-typing-dot" style="animation-delay:.3s"></span></div>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById('ai-typing-indicator');
    if (el) el.remove();
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  function hideSugg() {
    var s = document.getElementById('ai-drawer-sugg');
    if (s) s.style.display = 'none';
  }

  // FAQ knowledge base
  var FAQ = [
    { k:['yield','apy','interest','return','earn','capital'],
      a:'Every pool generates automatic 4.8% APY yield on deposited capital while waiting for market resolution. On testnet this is simulated; on mainnet it will come from real DeFi protocols like Aave. 50% boosts winners, 30% goes to CPRED stakers, 20% to the treasury.' },
    { k:['buy cpred','purchase cpred','get cpred','cpred presale','presale'],
      a:'Buy $CPRED in presale at $0.050 (Stage 1). Go to /presale.html, connect MetaMask on Base Sepolia, enter the ETH amount and confirm. The listing target is $0.150 — that's +200% from Stage 1 price.' },
    { k:['stake','staking','pool','lock','apy','12%','20%','28%'],
      a:'3 staking pools: Flexible (12% APY, unstake anytime), 30-day lock (20% APY), 90-day lock (28% APY). You earn CPRED rewards + ETH from protocol fees. Staked CPRED also counts for market creation requirements.' },
    { k:['fee','fees','cost','charge','2%','1%'],
      a:'2% fee on winning payouts only (1% to market creator + 1% to CPRED stakers). Losers pay nothing. CPRED markets: 0% fee. If you hold CPRED in your wallet: only 1% fee.' },
    { k:['polymarket','kalshi','compare','vs','difference','better'],
      a:'Unlike Polymarket and Kalshi, CryptoPredict: (1) generates automatic yield on idle capital, (2) supports 4 currencies (ETH/USDC/USDT/CPRED), (3) has permissionless market creation, (4) shares protocol revenue with CPRED stakers, (5) is available in Europe.' },
    { k:['create market','make market','new market','start market'],
      a:'To create a market you need 1,000 CPRED (wallet + staking combined). Go to /crea.html, write your YES/NO question, choose category, currency, expiry date and deposit initial liquidity. You earn 1% of every payout from your market automatically.' },
    { k:['governance','vote','dao','proposal','voting'],
      a:'1 CPRED = 1 vote. Staked CPRED counts as 2× voting power. Governance launches with mainnet (Q4 2025). You can vote on fee rates, market categories, treasury allocation, and protocol parameters. Buy CPRED now to secure your voting power.' },
    { k:['sell','secondary','vendi','position','exit early','cash out'],
      a:'You can sell your open position to other users before market resolution via the Sell Shares page (/vendi.html). The PositionMarket contract (deploying next redeploy) handles this on-chain. Fee: 0.5% on the sale price.' },
    { k:['trading','chart','price','orderbook','limit order'],
      a:'The Trading page (/trading.html) shows a real-time price chart built from on-chain BetPlaced events — the implied YES probability (0-1) per bet. You can also place limit orders that execute automatically when the price reaches your target.' },
    { k:['faucet','testnet','free','usdc','usdt','test token'],
      a:'Get free testnet tokens at /faucet.html — claim 10,000 USDC and 10,000 USDT for free. For testnet ETH, use QuickNode or Coinbase faucet (you need a small account there).' },
    { k:['mainnet','launch','when','roadmap','audit'],
      a:'Current status: Base Sepolia testnet. Roadmap: Smart contract audit (Q3 2025) → Mainnet launch (Q4 2025) → DAO Governance live (Q4 2025) → AMM v2.0 (2026). Testnet tokens have no real value.' },
    { k:['cpred','token','supply','tokenomics','100m'],
      a:'$CPRED: 100M total supply. Presale 45% (3 stages: $0.050/$0.080/$0.100), Liquidity 30%, Team 15% (12-month lock), Ecosystem 10%. Listing target: $0.150 (+200% from Stage 1). Utility: fee discount, staking, governance, market creation.' },
    { k:['how','what is','explain','works','tell me'],
      a:'CryptoPredict is a 100% crypto-native prediction market on Base Sepolia. You bet YES or NO on future events (crypto, macro, sport, politics). Your capital generates 4.8% APY while waiting. Winners receive proportional payouts. Check /docs.html for the full documentation.' },
    { k:['wallet','metamask','connect','network','base sepolia'],
      a:'Connect MetaMask and switch to Base Sepolia (chainId 84532). Add it at chainlist.org or it will be added automatically. For testnet ETH, use the QuickNode faucet. The 🔮 button in the nav connects your wallet.' },
    { k:['reward','eth reward','claim','protocol fee'],
      a:'CPRED stakers receive ETH rewards: 1% of every winning payout goes to the ETH reward pool. The more market volume, the more ETH stakers earn. Claim anytime from /staking.html.' },
  ];

  function faqAnswer(q) {
    var ql = q.toLowerCase();
    var best = null, bestScore = 0;
    for (var i = 0; i < FAQ.length; i++) {
      var score = 0;
      for (var j = 0; j < FAQ[i].k.length; j++) {
        if (ql.indexOf(FAQ[i].k[j]) !== -1) score++;
      }
      if (score > bestScore) { bestScore = score; best = FAQ[i]; }
    }
    if (best && bestScore > 0) return best.a;
    return 'Great question! I'm best at answering questions about CryptoPredict markets, $CPRED token, yield, staking, fees, governance, and how to get started. Try asking something specific, or check our full docs at /docs.html 📖';
  }

  async function send() {
    var inp = document.getElementById('ai-drawer-inp');
    var btn = document.getElementById('ai-drawer-send');
    if (!inp) return;
    var q = inp.value.trim();
    if (!q) return;
    inp.value = '';
    hideSugg();
    addUser(q);
    addTyping();
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    // Simulate thinking delay
    setTimeout(function() {
      removeTyping();
      addBot(faqAnswer(q));
      if (btn) { btn.disabled = false; btn.textContent = 'Send ↗'; }
    }, 600 + Math.random() * 400);
  }

  async function ask(q) {
    document.getElementById('ai-drawer').classList.add('open');
    document.getElementById('ai-drawer-inp').value = q;
    await send();
  }

  return { addBot:addBot, send:send, ask:ask };
})();

