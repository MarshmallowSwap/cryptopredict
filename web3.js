// ═══ CRYPTOPREDICT — WEB3 / ON-CHAIN ═══
// Base Sepolia (chainId: 84532)

const CHAIN = {
  id:       84532,
  name:     "Base Sepolia",
  rpc:      "https://sepolia.base.org",
  explorer: "https://sepolia.basescan.org",
  currency: { name: "ETH", symbol: "ETH", decimals: 18 },
};

const CONTRACTS = {
  token:   "0x699304A362E41539d918E44188E1033999202cA0",
  market:  "0x160842b6b4b253F9c9EfA17FC0EfBB3c4B2c6c45",
  presale: "0xC9173e1C16Bc82D67f41Ffd025a89CC4f6C4Ac17",
};

// ABI minimali (solo le funzioni usate dal frontend)
const MARKET_ABI = [
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 id) view returns (tuple(uint256 id, address creator, string question, string category, string assetSymbol, uint256 targetPrice, bool targetAbove, uint256 expiresAt, uint256 yesPool, uint256 noPool, uint256 yieldAccrued, uint8 status, uint8 outcome, address resolver))",
  "function getActiveMarkets(uint256 limit) view returns (tuple(uint256 id, address creator, string question, string category, string assetSymbol, uint256 targetPrice, bool targetAbove, uint256 expiresAt, uint256 yesPool, uint256 noPool, uint256 yieldAccrued, uint8 status, uint8 outcome, address resolver)[])",
  "function getYesPct(uint256 marketId) view returns (uint256)",
  "function getPotentialPayout(uint256 marketId, bool side, uint256 amount) view returns (uint256 gross, uint256 net)",
  "function getPosition(uint256 marketId, address user) view returns (tuple(uint256 marketId, bool side, uint256 amount, bool claimed))",
  "function placeBet(uint256 marketId, bool side) payable",
  "function claimPayout(uint256 marketId)",
  "function claimRefund(uint256 marketId)",
  "event BetPlaced(uint256 indexed marketId, address indexed user, bool side, uint256 amount)",
  "event PayoutClaimed(uint256 indexed marketId, address indexed user, uint256 amount)",
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function stakedBalance(address) view returns (uint256)",
  "function pendingReward(address) view returns (uint256)",
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claimRewards()",
];

const PRESALE_ABI = [
  "function currentStage() view returns (uint256)",
  "function stages(uint256) view returns (uint256 priceUsdCents, uint256 allocation, uint256 sold, bool active)",
  "function purchased(address) view returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function presaleActive() view returns (bool)",
  "function getCpredForEth(uint256 ethAmount) view returns (uint256)",
  "function buyTokens() payable",
];

// ── Provider / Signer ─────────────────────────────────────────────
let _provider = null;
let _signer   = null;

async function getProvider() {
  if (_provider) return _provider;
  if (typeof ethers === "undefined") {
    throw new Error("ethers.js non caricato");
  }
  if (window.ethereum) {
    _provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    _provider = new ethers.JsonRpcProvider(CHAIN.rpc);
  }
  return _provider;
}

async function getSigner() {
  if (_signer) return _signer;
  const p = await getProvider();
  _signer = await p.getSigner();
  return _signer;
}

async function getContract(name, withSigner = false) {
  const abis = { market: MARKET_ABI, token: TOKEN_ABI, presale: PRESALE_ABI };
  const runner = withSigner ? await getSigner() : await getProvider();
  return new ethers.Contract(CONTRACTS[name], abis[name], runner);
}

// ── Ensure correct network ────────────────────────────────────────
async function ensureNetwork() {
  if (!window.ethereum) return false;
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (parseInt(chainId, 16) === CHAIN.id) return true;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + CHAIN.id.toString(16) }],
    });
    return true;
  } catch (e) {
    if (e.code === 4902) {
      // Aggiungi la rete
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x" + CHAIN.id.toString(16),
          chainName: CHAIN.name,
          nativeCurrency: CHAIN.currency,
          rpcUrls: [CHAIN.rpc],
          blockExplorerUrls: [CHAIN.explorer],
        }],
      });
      return true;
    }
    return false;
  }
}

// ── Markets ───────────────────────────────────────────────────────
async function loadMarketsOnChain() {
  try {
    const c = await getContract("market");
    const markets = await c.getActiveMarkets(20);

    return markets.map(m => {
      const yesPool = parseFloat(ethers.formatEther(m.yesPool));
      const noPool  = parseFloat(ethers.formatEther(m.noPool));
      const total   = yesPool + noPool;
      const yesPct  = total > 0 ? Math.round((yesPool / total) * 100) : 50;
      const yieldA  = parseFloat(ethers.formatEther(m.yieldAccrued));
      const daysLeft = Math.max(0, Math.ceil((Number(m.expiresAt) - Date.now() / 1000) / 86400));

      return {
        id:           Number(m.id),
        title:        m.question,
        category:     m.category,
        asset_symbol: m.assetSymbol,
        yes_pct:      yesPct,
        no_pct:       100 - yesPct,
        pool_size:    total,
        yes_pool_eth: yesPool,
        no_pool_eth:  noPool,
        expires_at:   new Date(Number(m.expiresAt) * 1000).toISOString(),
        days_left:    daysLeft,
        status:       ["open","closed","resolved","cancelled"][m.status] || "open",
        outcome:      ["unresolved","YES","NO"][m.outcome],
        yield_info: {
          daily_yield:             (total * 0.048 / 365).toFixed(4),
          total_yield_estimated:   (total * 0.048 / 365 * daysLeft).toFixed(4),
          apy: "4.8%",
        },
      };
    });
  } catch(e) {
    console.warn("On-chain markets fallback:", e.message);
    return null;
  }
}

async function placeBetOnChain(marketId, side, ethAmount) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error("Cambia rete a Base Sepolia");

  const c = await getContract("market", true);
  const value = ethers.parseEther(ethAmount.toString());

  // Calcola payout potenziale
  let potentialNet = 0n;
  try {
    const [, net] = await c.getPotentialPayout(marketId, side, value);
    potentialNet = net;
  } catch(e) {}

  const tx = await c.placeBet(marketId, side, { value });
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    potentialPayout: parseFloat(ethers.formatEther(potentialNet)),
    explorerUrl: `${CHAIN.explorer}/tx/${receipt.hash}`,
  };
}

async function claimPayoutOnChain(marketId) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error("Cambia rete a Base Sepolia");
  const c = await getContract("market", true);
  const tx = await c.claimPayout(marketId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, explorerUrl: `${CHAIN.explorer}/tx/${receipt.hash}` };
}

// ── Token / Staking ───────────────────────────────────────────────
async function getCpredBalance(address) {
  try {
    const c = await getContract("token");
    const [bal, staked, reward] = await Promise.all([
      c.balanceOf(address),
      c.stakedBalance(address),
      c.pendingReward(address),
    ]);
    return {
      balance: parseFloat(ethers.formatEther(bal)),
      staked:  parseFloat(ethers.formatEther(staked)),
      reward:  parseFloat(ethers.formatEther(reward)),
    };
  } catch(e) {
    return { balance: 0, staked: 0, reward: 0 };
  }
}

async function stakeCpred(amount) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error("Cambia rete a Base Sepolia");
  const c = await getContract("token", true);
  const tx = await c.stake(ethers.parseEther(amount.toString()));
  return tx.wait();
}

// ── Presale ───────────────────────────────────────────────────────
async function getPresaleInfo() {
  try {
    const c = await getContract("presale");
    const [stage, active, raised] = await Promise.all([
      c.currentStage(),
      c.presaleActive(),
      c.totalRaised(),
    ]);
    const s = await c.stages(stage);
    const pctSold = Number(s.allocation) > 0
      ? Math.round(Number(s.sold) * 100 / Number(s.allocation))
      : 0;
    return {
      active,
      currentStage:   Number(stage) + 1,
      priceUsdCents:  Number(s.priceUsdCents),
      priceUsd:       Number(s.priceUsdCents) / 100,
      sold:           parseFloat(ethers.formatEther(s.sold)),
      allocation:     parseFloat(ethers.formatEther(s.allocation)),
      pctSold,
      totalRaisedEth: parseFloat(ethers.formatEther(raised)),
    };
  } catch(e) {
    return null;
  }
}

async function buyPresaleTokens(ethAmount) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error("Cambia rete a Base Sepolia");
  const c = await getContract("presale", true);
  const value = ethers.parseEther(ethAmount.toString());

  // Calcola preview CPRED
  let cpredPreview = 0n;
  try { cpredPreview = await c.getCpredForEth(value); } catch(e) {}

  const tx = await c.buyTokens({ value });
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    cpredAmount: parseFloat(ethers.formatEther(cpredPreview)),
    explorerUrl: `${CHAIN.explorer}/tx/${receipt.hash}`,
  };
}

// ── Eth balance ───────────────────────────────────────────────────
async function getEthBalance(address) {
  try {
    const p = await getProvider();
    const bal = await p.getBalance(address);
    return parseFloat(ethers.formatEther(bal));
  } catch(e) { return 0; }
}

// Export globale
window.W3 = {
  CHAIN, CONTRACTS,
  getProvider, getSigner, ensureNetwork,
  loadMarketsOnChain, placeBetOnChain, claimPayoutOnChain,
  getCpredBalance, stakeCpred,
  getPresaleInfo, buyPresaleTokens,
  getEthBalance,
};
