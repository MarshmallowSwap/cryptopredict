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
          alert('MetaMask not found. Install it from metamask.io');
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
    // Resolve CP.ready promise — pages wait for this
    _cpReadyResolve({ address: WALLET.address, connected: !!WALLET.address });
    // Also emit event for compatibility
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
        // Show ETH with enough decimals + CPRED if present
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
      if (c) { c.style.display='flex'; c.onclick=function(){ if(typeof openModal==='function') openModal('wallet-modal'); }; }
    }
  },

  startCountdown() {
    const el = document.getElementById('pb-countdown');
    if (!el) return;
    const target = new Date(Date.now() + 21*24*3600*1000);
    const tick = () => {
      const diff = target - Date.now();
      if (diff<=0){el.textContent='EXPIRED';return;}
      const d=Math.floor(diff/864e5),h=Math.floor(diff%864e5/36e5),m=Math.floor(diff%36e5/6e4);
      el.textContent=`CLOSES IN ${d}d ${h}h ${m}m`;
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
          ⏱ ${daysLeft}d left · ${m.participant_count||0} participants
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
    if (!window.W3) { alert('Web3 not available'); return; }

    const ethAmt = parseFloat(prompt(`Importo ETH da scommettere su ${side?'YES ▲':'NO ▼'}:\n(min 0.0001 ETH)`)||'0');
    if (!ethAmt || ethAmt < 0.0001) return;
    if (ethAmt > WALLET.ethBalance) { alert('Insufficient ETH balance'); return; }

    btn.disabled = true;
    btn.textContent = '...';
    try {
      const result = await W3.placeBetOnChain(marketId, side, ethAmt);
      await this.refreshWalletData();
      alert(`✅ Bet placed on-chain!\n${side?'YES ▲':'NO ▼'} · ${ethAmt} ETH\nEst. payout: ${result.potentialPayout.toFixed(4)} ETH\n\nTx: ${result.explorerUrl}`);
      this.loadMarkets();
    } catch(e) {
      alert(`Error: ${e.message||'Transaction failed'}`);
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
      if (liveEl)  liveEl.innerHTML  = `<span class="tick-dot"></span>PRESALE LIVE — STAGE ${info.currentStage} · ${info.pctSold}% SOLD`;
      if (priceEl) priceEl.textContent = `· $${info.priceUsd.toFixed(3)} · $${(info.totalRaisedEth * 2000).toFixed(0)} raised`;
      // Countdown dal contratto
      const endsAt = info.presaleEndsAt * 1000;
      const el = document.getElementById('pb-countdown');
      if (el && endsAt > Date.now()) {
        const tick = () => {
          const diff = endsAt - Date.now();
          if (diff <= 0) { el.textContent = 'PRESALE ENDED'; return; }
          const dd = Math.floor(diff/864e5);
          const hh = Math.floor(diff%864e5/36e5);
          const mm = Math.floor(diff%36e5/6e4);
          const ss = Math.floor(diff%6e4/1e3);
          el.textContent = `CLOSES IN ${dd}d ${hh}h ${mm}m ${String(ss).padStart(2,'0')}S`;
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
          <div style="font-size:1.1rem;font-weight:800;color:#f0ecff;margin-bottom:6px">Connect Wallet</div>
          <div style="font-size:.8rem;color:#7a738f;margin-bottom:6px">Network: <strong style="color:#00d4ff">Base Sepolia</strong> (testnet)</div>
          <div style="font-size:.73rem;color:#7a738f;margin-bottom:22px;padding:8px 10px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:8px">
            🔗 Contracts are live on Base Sepolia. You'll need free testnet ETH from <a href="https://faucet.quicknode.com/base/sepolia" target="_blank" style="color:#00d4ff">faucet.quicknode.com</a>
          </div>

          <button onclick="CP.connectWallet('metamask')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;margin-bottom:10px;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(124,58,237,.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)'">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f6851b,#e2761b);display:flex;align-items:center;justify-content:center;font-size:20px">🦊</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">MetaMask</div><div style="font-size:.75rem;color:#7a738f">Browser extension · Base Sepolia</div></div>
            <span style="margin-left:auto;color:#7a738f">→</span>
          </button>

          <button onclick="CP.connectWallet('demo')" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;color:#f0ecff;" onmouseover="this.style.borderColor='rgba(0,232,122,.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)'">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(0,232,122,.15);border:1px solid rgba(0,232,122,.3);display:flex;align-items:center;justify-content:center;font-size:20px">🧪</div>
            <div style="text-align:left"><div style="font-weight:700;font-size:.9rem">Demo mode</div><div style="font-size:.75rem;color:#7a738f">Explore without wallet</div></div>
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
            <a href="https://sepolia.basescan.org/address/" id="wm-explorer" target="_blank" style="color:#7a738f">View on BaseScan →</a>
          </div>
          <div style="display:flex;gap:8px">
            <a href="portfolio.html" style="flex:1;padding:10px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:10px;color:#c4b5fd;font-size:.82rem;font-weight:700;text-decoration:none;text-align:center">Portfolio</a>
            <button onclick="WALLET.disconnect();document.getElementById('wm-connect-view').style.display='block';document.getElementById('wm-connected-view').style.display='none';" style="flex:1;padding:10px;background:rgba(255,58,92,.08);border:1px solid rgba(255,58,92,.2);border-radius:10px;color:#f87171;font-size:.82rem;font-weight:700;cursor:pointer">Disconnect</button>
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

/* ── AI ADVISOR ─────────────────────────────────────────────────── */

var aiWidget = (function() {
  var FAQ = [
    { k:['yield','apy','return','earn','capital','interest'],
      a:'Every pool generates 4.8% APY automatic yield on deposited capital. On testnet it is simulated; on mainnet it comes from real DeFi (Aave). 50% boosts winners, 30% goes to CPRED stakers, 20% to treasury.' },
    { k:['buy cpred','purchase cpred','get cpred','presale','token price','stage 1'],
      a:'Buy $CPRED in presale at $0.050 (Stage 1). Go to /presale.html, connect MetaMask on Base Sepolia and confirm. Listing target is $0.150 — that\'s +200% from Stage 1 price.' },
    { k:['stake','staking','pool','lock','28%','20%','12%'],
      a:'3 staking pools: Flexible (12% APY, unstake anytime), 30-day lock (20% APY), 90-day lock (28% APY). Earn CPRED rewards + ETH from protocol fees. Go to /staking.html.' },
    { k:['fee','fees','cost','2%','1%','0%'],
      a:'2% fee on winning payouts only — 1% to market creator, 1% to CPRED stakers. Losers pay nothing. CPRED markets: 0% fee. Hold CPRED in wallet: only 1% fee.' },
    { k:['polymarket','kalshi','compare','vs','difference'],
      a:'Unlike Polymarket/Kalshi: CryptoPredict generates automatic yield on idle capital, supports 4 currencies, has permissionless markets, shares revenue with CPRED stakers, and is available in Europe.' },
    { k:['create market','make market','new market','how to create'],
      a:'Need 1,000 CPRED (wallet + staking combined). Go to /crea.html, write your YES/NO question, choose category and currency. You earn 1% of every payout automatically.' },
    { k:['governance','vote','dao','proposal','voting'],
      a:'1 CPRED = 1 vote. Staked CPRED = 2x voting power. Governance launches with mainnet Q4 2025. Vote on fees, categories, treasury. See /governance.html.' },
    { k:['sell','secondary','position','exit','cash out'],
      a:'Sell open positions before resolution via /vendi.html. PositionMarket contract handles it on-chain. Fee: 0.5% on the sale price.' },
    { k:['trading','chart','price','orderbook','limit order'],
      a:'Trading page (/trading.html) shows a real-time price chart from on-chain events. Place limit orders that auto-execute when the price hits your target.' },
    { k:['faucet','testnet','free token','usdc','usdt','get eth'],
      a:'Get free testnet tokens at /faucet.html — claim 10,000 USDC and USDT. For testnet ETH use the QuickNode faucet at faucet.quicknode.com/base/sepolia.' },
    { k:['mainnet','launch','when','roadmap','audit'],
      a:'Testnet now → Audit Q3 2025 → Mainnet Q4 2025 → DAO Governance Q4 2025 → AMM v2 2026. Current testnet tokens have no real value.' },
    { k:['cpred','tokenomics','supply','100m'],
      a:'$CPRED: 100M supply. Presale 45% ($0.050 / $0.080 / $0.100), Liquidity 30%, Team 15% (12-month lock), Ecosystem 10%. Listing target $0.150.' },
    { k:['wallet','metamask','connect','network','base sepolia'],
      a:'Connect MetaMask and switch to Base Sepolia (chainId 84532). Add it at chainlist.org. Click Connect Wallet in the nav bar.' },
    { k:['reward','eth reward','claim','payout'],
      a:'CPRED stakers receive ETH: 1% of every winning payout goes to the reward pool. More volume = more ETH for stakers. Claim from /staking.html anytime.' },
    { k:['how','what is','explain','works','start','begin'],
      a:'CryptoPredict is a crypto-native prediction market on Base Sepolia. Bet YES or NO on future events, earn 4.8% APY while waiting, and collect your payout if you are right. Read /docs.html for the full guide.' },
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
    return "I can answer questions about CryptoPredict markets, $CPRED, staking, yield, fees and governance. Try something more specific, or check /docs.html for full documentation!";
  }

  function getMsgs() { return document.getElementById('ai-drawer-msgs'); }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function addBot(text) {
    var msgs = getMsgs(); if (!msgs) return;
    var row = document.createElement('div');
    row.className = 'ai-msg-bot';
    var av = document.createElement('div'); av.className = 'ai-avatar-sm'; av.textContent = '🔮';
    var bub = document.createElement('div'); bub.className = 'ai-msg-bot-bubble'; bub.innerHTML = escHtml(text);
    row.appendChild(av); row.appendChild(bub);
    msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
  }

  function addUser(text) {
    var msgs = getMsgs(); if (!msgs) return;
    var el = document.createElement('div');
    el.className = 'ai-msg-user'; el.textContent = text;
    msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight;
  }

  function addTyping() {
    var msgs = getMsgs(); if (!msgs) return;
    var row = document.createElement('div');
    row.id = 'ai-typing-indicator'; row.className = 'ai-msg-bot';
    var av = document.createElement('div'); av.className = 'ai-avatar-sm'; av.textContent = '🔮';
    var bub = document.createElement('div'); bub.className = 'ai-msg-bot-bubble';
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('span'); dot.className = 'ai-typing-dot';
      if (i > 0) dot.style.animationDelay = (i * 0.15) + 's';
      bub.appendChild(dot);
    }
    row.appendChild(av); row.appendChild(bub);
    msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById('ai-typing-indicator'); if (el) el.remove();
  }

  function send() {
    var inp = document.getElementById('ai-drawer-inp');
    var btn = document.getElementById('ai-drawer-send');
    if (!inp) return;
    var q = inp.value.trim(); if (!q) return;
    inp.value = '';
    var sugg = document.getElementById('ai-drawer-sugg'); if (sugg) sugg.style.display = 'none';
    addUser(q); addTyping();
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    setTimeout(function() {
      removeTyping(); addBot(faqAnswer(q));
      if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
    }, 500 + Math.random() * 400);
  }

  function ask(q) {
    var d = document.getElementById('ai-drawer'); if (d) d.classList.add('open');
    var inp = document.getElementById('ai-drawer-inp'); if (inp) inp.value = q;
    send();
  }

  return { addBot: addBot, send: send, ask: ask };
})();

document.addEventListener('DOMContentLoaded', function() {
  /* styles */
  var css = document.createElement('style');
  css.textContent =
    '@keyframes ai-pop{from{opacity:0;transform:scale(.85) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}' +
    '@keyframes ai-dot{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-4px);opacity:1}}' +
    '#ai-fab{position:fixed;bottom:28px;right:28px;z-index:9000;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(124,58,237,.5);display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform .2s,box-shadow .2s;}' +
    '#ai-fab:hover{transform:scale(1.1);box-shadow:0 6px 32px rgba(124,58,237,.7)}' +
    '.ai-badge{position:absolute;top:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid #080810;animation:pulse 2s infinite;}' +
    '#ai-drawer{position:fixed;bottom:90px;right:28px;z-index:9001;width:340px;max-width:calc(100vw - 40px);background:#0f0f1a;border:1px solid rgba(124,58,237,.35);border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(124,58,237,.2),0 2px 16px rgba(0,0,0,.6);flex-direction:column;display:none;}' +
    '#ai-drawer.open{display:flex;animation:ai-pop .2s ease;}' +
    '#ai-dh{padding:12px 14px;background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(124,58,237,.06));border-bottom:1px solid rgba(124,58,237,.2);display:flex;align-items:center;gap:10px;}' +
    '#ai-dm{padding:12px 14px;height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(124,58,237,.3) transparent;}' +
    '#ai-dm::-webkit-scrollbar{width:4px}#ai-dm::-webkit-scrollbar-thumb{background:rgba(124,58,237,.3);border-radius:2px}' +
    '.ai-msg-user{align-self:flex-end;background:rgba(124,58,237,.2);border:1px solid rgba(124,58,237,.3);border-radius:12px 2px 12px 12px;padding:8px 12px;font-size:.78rem;color:#e2e8f0;line-height:1.5;max-width:85%;}' +
    '.ai-msg-bot{align-self:flex-start;display:flex;gap:8px;align-items:flex-start;max-width:92%;}' +
    '.ai-msg-bot-bubble{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:2px 12px 12px 12px;padding:8px 12px;font-size:.78rem;color:#e2e8f0;line-height:1.55;}' +
    '.ai-avatar-sm{width:24px;height:24px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;font-size:11px;}' +
    '.ai-typing-dot{width:5px;height:5px;border-radius:50%;background:#a855f7;animation:ai-dot .6s ease infinite;display:inline-block;margin:0 2px;}' +
    '#ai-ds{padding:0 14px 8px;display:flex;gap:5px;flex-wrap:wrap;}' +
    '.ai-sb{padding:3px 10px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:20px;font-size:.62rem;color:#c4b5fd;cursor:pointer;font-family:monospace;transition:background .15s;}' +
    '.ai-sb:hover{background:rgba(124,58,237,.2)}' +
    '#ai-di{padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;}' +
    '#ai-inp{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(124,58,237,.2);border-radius:8px;padding:7px 10px;font-size:.75rem;color:#e2e8f0;outline:none;font-family:monospace;transition:border-color .2s;}' +
    '#ai-inp:focus{border-color:rgba(124,58,237,.5)}' +
    '#ai-inp::placeholder{color:rgba(255,255,255,.3)}' +
    '#ai-snd{padding:7px 14px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:.72rem;cursor:pointer;white-space:nowrap;transition:opacity .2s;}' +
    '#ai-snd:hover{opacity:.85}#ai-snd:disabled{opacity:.5;cursor:default}';
  document.head.appendChild(css);

  /* FAB */
  var fab = document.createElement('button');
  fab.id = 'ai-fab'; fab.title = 'AI Advisor';
  var badge = document.createElement('span'); badge.className = 'ai-badge';
  fab.textContent = '🔮'; fab.appendChild(badge);
  document.body.appendChild(fab);

  /* Drawer — built with DOM, zero quote conflicts */
  var drawer = document.createElement('div');
  drawer.id = 'ai-drawer';

  /* header */
  var head = document.createElement('div'); head.id = 'ai-dh';
  var hAv = document.createElement('div'); hAv.className = 'ai-avatar-sm'; hAv.textContent = '🔮';
  var hTxt = document.createElement('div'); hTxt.style.flex = '1';
  var hT1 = document.createElement('div'); hT1.style.cssText = 'font-size:.78rem;font-weight:700;color:#e2e8f0'; hT1.textContent = 'CryptoPredict AI';
  var hT2 = document.createElement('div'); hT2.style.cssText = 'font-size:.6rem;color:#a855f7;font-family:monospace'; hT2.textContent = 'Ask me anything';
  hTxt.appendChild(hT1); hTxt.appendChild(hT2);
  var hClose = document.createElement('button'); hClose.id = 'ai-close-btn';
  hClose.style.cssText = 'background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:18px;line-height:1;padding:0';
  hClose.textContent = '✕';
  head.appendChild(hAv); head.appendChild(hTxt); head.appendChild(hClose);

  /* messages */
  var msgs = document.createElement('div'); msgs.id = 'ai-dm'; msgs.id = 'ai-drawer-msgs';

  /* suggestions */
  var sugg = document.createElement('div'); sugg.id = 'ai-drawer-sugg'; sugg.id = 'ai-ds';
  sugg.id = 'ai-drawer-sugg';
  var suggItems = [
    ['How does yield work?', 'Yield?'],
    ['How to buy CPRED?', 'Buy CPRED?'],
    ['What staking APY can I earn?', 'Staking APY?'],
    ['How does governance work?', 'Governance?'],
  ];
  suggItems.forEach(function(item) {
    var btn = document.createElement('button');
    btn.className = 'ai-sb';
    btn.textContent = item[1];
    btn.setAttribute('data-q', item[0]);
    btn.addEventListener('click', function() { aiWidget.ask(this.getAttribute('data-q')); });
    sugg.appendChild(btn);
  });

  /* input row */
  var inpRow = document.createElement('div'); inpRow.id = 'ai-di';
  var inp = document.createElement('input'); inp.id = 'ai-drawer-inp'; inp.id = 'ai-inp';
  inp.id = 'ai-drawer-inp';
  inp.type = 'text'; inp.placeholder = 'Ask anything...';
  var snd = document.createElement('button'); snd.id = 'ai-drawer-send'; snd.id = 'ai-snd';
  snd.id = 'ai-drawer-send';
  snd.textContent = 'Send';
  inpRow.appendChild(inp); inpRow.appendChild(snd);

  drawer.appendChild(head); drawer.appendChild(msgs); drawer.appendChild(sugg); drawer.appendChild(inpRow);
  document.body.appendChild(drawer);

  /* welcome */
  aiWidget.addBot("Hi! I'm the CryptoPredict AI. Ask me about prediction markets, $CPRED, staking, yield or governance!");

  /* events */
  fab.addEventListener('click', function() {
    var d = document.getElementById('ai-drawer');
    d.classList.toggle('open');
    if (d.classList.contains('open')) {
      setTimeout(function() { document.getElementById('ai-drawer-inp').focus(); }, 120);
    }
  });
  hClose.addEventListener('click', function() {
    document.getElementById('ai-drawer').classList.remove('open');
  });
  snd.addEventListener('click', function() { aiWidget.send(); });
  inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') aiWidget.send(); });
});

