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
  token:          "0xEc937bF3123874115EDcBBE1b3802C95f572e8E5",
  market:         "0x775267160f3F7fb7908A7f2a4a2b0AFe22CD9e66",  // v2
  presale:        "0xC881FF7f99a666372DD0B9d50A9244E6564ea2B7",
  stakingPresale: "0x6e9FE398C06E479Cd69663737415375e095c3454",
  mockUsdc:       "0x8A54f0e841CFCA5fA654912AF33cCD121D182311",
  mockUsdt:       "0xaBB48e1693Df04fb894843e52B239D5C5d0ab871",
  ammPool:        "0xaa645dca8a82764db9a725ab3ac9e2caab1440d0",
  positionMarket: "",  // deployato nel prossimo redeploy
};


// ── AMM Pool ABI ─────────────────────────────────────────────────
const AMM_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"lp","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"FeeClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"lp","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpTokens","type":"uint256"}],"name":"LiquidityAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"lp","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpTokens","type":"uint256"}],"name":"LiquidityRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"currency","type":"address"},{"indexed":false,"internalType":"string","name":"marketQuestion","type":"string"}],"name":"PoolCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"trader","type":"address"},{"indexed":false,"internalType":"bool","name":"isYes","type":"bool"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"fee","type":"uint256"}],"name":"Swap","type":"event"},{"inputs":[],"name":"FEE_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FEE_DENOM","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"LP_SCALE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"accFeePerLP","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"addLiquidity","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"}],"name":"claimFees","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"address","name":"currency","type":"address"},{"internalType":"string","name":"question","type":"string"}],"name":"createPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"address","name":"currency","type":"address"},{"internalType":"string","name":"question","type":"string"}],"name":"createPoolOpen","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"currency","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"feeDebt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllMarketIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"address","name":"lp","type":"address"}],"name":"getLPBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"address","name":"lp","type":"address"}],"name":"getPendingFees","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"}],"name":"getPool","outputs":[{"internalType":"address","name":"currency","type":"address"},{"internalType":"uint256","name":"yesReserve","type":"uint256"},{"internalType":"uint256","name":"noReserve","type":"uint256"},{"internalType":"uint256","name":"totalLPSupply","type":"uint256"},{"internalType":"uint256","name":"feeAccumulator","type":"uint256"},{"internalType":"string","name":"question","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"bool","name":"isYes","type":"bool"}],"name":"getSwapQuote","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"fee","type":"uint256"},{"internalType":"uint256","name":"priceImpact","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"}],"name":"getYesPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"lpBalances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"marketIds","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"pools","outputs":[{"internalType":"address","name":"currency","type":"address"},{"internalType":"uint256","name":"yesReserve","type":"uint256"},{"internalType":"uint256","name":"noReserve","type":"uint256"},{"internalType":"uint256","name":"totalLPSupply","type":"uint256"},{"internalType":"uint256","name":"feeAccumulator","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"string","name":"question","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"uint256","name":"lpAmount","type":"uint256"}],"name":"removeLiquidity","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"bool","name":"isYes","type":"bool"},{"internalType":"uint256","name":"minOut","type":"uint256"}],"name":"swap","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];

// ABI minimali (solo le funzioni usate dal frontend)
const MARKET_ABI = [
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 id) view returns (tuple(uint256 id, address creator, string question, string category, string assetSymbol, uint256 targetPrice, bool targetAbove, uint256 expiresAt, uint256 yesPool, uint256 noPool, uint256 yieldAccrued, uint8 status, uint8 outcome, address resolver, uint8 currency))",
  "function getActiveMarkets(uint256 limit) view returns (tuple(uint256 id, address creator, string question, string category, string assetSymbol, uint256 targetPrice, bool targetAbove, uint256 expiresAt, uint256 yesPool, uint256 noPool, uint256 yieldAccrued, uint8 status, uint8 outcome, address resolver, uint8 currency)[])",
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
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function stakedBalance(address) view returns (uint256)",
  "function pendingReward(address) view returns (uint256)",
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claimRewards()",
];

const PRESALE_ABI = [
  "function currentStage() view returns (uint256)",
  "function stages(uint256) view returns (uint256 priceUsdCents, uint256 allocation, uint256 sold, uint256 startTime, bool active)",
  "function purchased(address) view returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function presaleActive() view returns (bool)",
  "function getCpredForEth(uint256 ethAmount) view returns (uint256)",
  "function buyTokens() payable",
];

// ── Provider / Signer ─────────────────────────────────────────────
let _provider = null;
let _signer   = null;


const PRESALE_STAKING_ABI = [
  "function stake(uint256 poolId, uint256 amount)",
  "function unstake(uint256 poolId)",
  "function claimReward(uint256 poolId)",
  "function claimAllRewards()",
  "function pendingReward(address user, uint256 poolId) view returns (uint256)",
  "function pendingRewardAll(address user) view returns (uint256)",
  "function getPosition(address user, uint256 poolId) view returns (uint256 amount, uint256 stakedAt, uint256 lockedUntil, uint256 pending, bool locked)",
  "function getPoolInfo(uint256 poolId) view returns (uint256 apyBps, uint256 lockDays, uint256 maxCapacity, uint256 totalStaked, uint256 available)",
  "function getAllPoolsInfo() view returns (uint256[3] apys, uint256[3] locks, uint256[3] totals, uint256[3] caps)",
  "function getUserPositions(address user) view returns (uint256[3] amounts, uint256[3] pendings, uint256[3] lockedUntils, bool[3] locked)",
  "function timeUntilUnlock(address user, uint256 poolId) view returns (uint256)",
  "function rewardPoolBalance() view returns (uint256)",
  "function presaleActive() view returns (bool)",
  "function presaleEndsAt() view returns (uint256)",
  "event Staked(address indexed user, uint256 poolId, uint256 amount)",
  "event Unstaked(address indexed user, uint256 poolId, uint256 amount, uint256 reward)",
  "event RewardClaimed(address indexed user, uint256 poolId, uint256 reward)",
];

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
  const abis = { market: MARKET_ABI, token: TOKEN_ABI, presale: PRESALE_ABI, stakingPresale: PRESALE_STAKING_ABI };
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
      // Decimali corretti per valuta: USDC/USDT=6, ETH/CPRED=18
      const curIdx = Number(m.currency || 0);
      const decimals = (curIdx === 1 || curIdx === 2) ? 6 : 18;
      const yesPool = parseFloat(ethers.formatUnits(m.yesPool, decimals));
      const noPool  = parseFloat(ethers.formatUnits(m.noPool,  decimals));
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
        currency:     ["ETH","USDC","USDT","CPRED"][Number(m.currency)] || "ETH",
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

// ── Presale Staking ──────────────────────────────────────────────
async function getPresaleStakingInfo() {
  try {
    const c = await getContract('stakingPresale');
    const [pools, rewardBal, active, endsAt] = await Promise.all([
      c.getAllPoolsInfo(),
      c.rewardPoolBalance(),
      c.presaleActive(),
      c.presaleEndsAt(),
    ]);
    return {
      pools: [0,1,2].map(i => ({
        id: i,
        apyBps:     Number(pools.apys[i]),
        apy:        Number(pools.apys[i]) / 100,
        lockDays:   Number(pools.locks[i]),
        totalStaked: parseFloat(ethers.formatEther(pools.totals[i])),
        maxCapacity: parseFloat(ethers.formatEther(pools.caps[i])),
        available:   parseFloat(ethers.formatEther(pools.caps[i] - pools.totals[i])),
        pctFull:     Number(pools.totals[i]) * 100 / Number(pools.caps[i]),
      })),
      rewardPoolBalance: parseFloat(ethers.formatEther(rewardBal)),
      presaleActive: active,
      presaleEndsAt: Number(endsAt),
      daysLeft: Math.max(0, Math.ceil((Number(endsAt) - Date.now()/1000) / 86400)),
    };
  } catch(e) { console.warn('PresaleStaking info error:', e); return null; }
}

async function getUserPresaleStaking(address) {
  try {
    const c = await getContract('stakingPresale');
    const [positions, totalReward] = await Promise.all([
      c.getUserPositions(address),
      c.pendingRewardAll(address),
    ]);
    return {
      positions: [0,1,2].map(i => ({
        poolId: i,
        amount:      parseFloat(ethers.formatEther(positions.amounts[i])),
        pending:     parseFloat(ethers.formatEther(positions.pendings[i])),
        lockedUntil: Number(positions.lockedUntils[i]),
        locked:      positions.locked[i],
        daysUntilUnlock: positions.locked[i]
          ? Math.ceil((Number(positions.lockedUntils[i]) - Date.now()/1000) / 86400)
          : 0,
      })),
      totalPending: parseFloat(ethers.formatEther(totalReward)),
    };
  } catch(e) { console.warn('User staking error:', e); return null; }
}

async function stakePresale(poolId, amount) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error('Cambia rete a Base Sepolia');
  const token = await getContract('token', true);
  const staking = await getContract('stakingPresale', true);
  const amt = ethers.parseEther(amount.toString());
  // Approva token
  const approveTx = await token.approve(CONTRACTS.stakingPresale, amt);
  await approveTx.wait();
  // Staka
  const tx = await staking.stake(poolId, amt);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, explorerUrl: `${CHAIN.explorer}/tx/${receipt.hash}` };
}

async function unstakePresale(poolId) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error('Cambia rete a Base Sepolia');
  const c = await getContract('stakingPresale', true);
  const tx = await c.unstake(poolId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, explorerUrl: `${CHAIN.explorer}/tx/${receipt.hash}` };
}

async function claimPresaleRewards(poolId) {
  const ok = await ensureNetwork();
  if (!ok) throw new Error('Cambia rete a Base Sepolia');
  const c = await getContract('stakingPresale', true);
  const tx = poolId !== undefined ? await c.claimReward(poolId) : await c.claimAllRewards();
  const receipt = await tx.wait();
  return { txHash: receipt.hash, explorerUrl: `${CHAIN.explorer}/tx/${receipt.hash}` };
}

// Export globale
window.W3 = {
  CHAIN, CONTRACTS,
  getProvider, getSigner, ensureNetwork,
  loadMarketsOnChain, placeBetOnChain, claimPayoutOnChain,
  getCpredBalance, stakeCpred,
  getPresaleInfo, buyPresaleTokens,
  getEthBalance,
  getContract,
  getPresaleStakingInfo, getUserPresaleStaking,
  stakePresale, unstakePresale, claimPresaleRewards,

  // ── AMM Pool helpers ──────────────────────────────────────────────
  getAMMContract: async function(withSigner) {
    if (withSigner) {
      const signer = await getSigner();
      return new ethers.Contract(CONTRACTS.ammPool, AMM_ABI, signer);
    }
    return new ethers.Contract(CONTRACTS.ammPool, AMM_ABI, await getProvider());
  },

  getAMMPool: async function(marketId) {
    const c = await W3.getAMMContract(false);
    const r = await c.getPool(marketId);
    const total = r[1] + r[2];
    return {
      marketId, currency: r[0], question: r[5],
      yesReserve: parseFloat(ethers.formatUnits(r[1], 6)),
      noReserve:  parseFloat(ethers.formatUnits(r[2], 6)),
      totalLPSupply: parseFloat(ethers.formatEther(r[3])),
      feeAccumulator: parseFloat(ethers.formatUnits(r[4], 6)),
      yesPrice: total > 0n ? Number(r[2] * 10000n / total) / 10000 : 0.5,
      noPrice:  total > 0n ? Number(r[1] * 10000n / total) / 10000 : 0.5,
    };
  },

  getAllAMMPools: async function() {
    const c   = await W3.getAMMContract(false);
    const ids = await c.getAllMarketIds();
    return Promise.all(ids.map(id => W3.getAMMPool(Number(id))));
  },

  getAMMLPBalance: async function(marketId, address) {
    const c = await W3.getAMMContract(false);
    return parseFloat(ethers.formatEther(await c.getLPBalance(marketId, address)));
  },

  getAMMPendingFees: async function(marketId, address) {
    const c = await W3.getAMMContract(false);
    return parseFloat(ethers.formatUnits(await c.getPendingFees(marketId, address), 6));
  },

  getAMMSwapQuote: async function(marketId, amountIn, isYes, decimals) {
    decimals = decimals || 6;
    const c  = await W3.getAMMContract(false);
    const r  = await c.getSwapQuote(marketId, ethers.parseUnits(amountIn.toString(), decimals), isYes);
    return {
      amountOut:   parseFloat(ethers.formatUnits(r[0], decimals)),
      fee:         parseFloat(ethers.formatUnits(r[1], decimals)),
      priceImpact: Number(r[2]) / 100,
    };
  },

  ammApproveAndAddLiquidity: async function(marketId, amount, currency, decimals) {
    decimals    = decimals || 6;
    const signer = await getSigner();
    const amtWei = ethers.parseUnits(amount.toString(), decimals);
    const token  = new ethers.Contract(currency, [
      'function approve(address,uint256) returns(bool)',
      'function allowance(address,address) view returns(uint256)'
    ], signer);
    const allowance = await token.allowance(await signer.getAddress(), CONTRACTS.ammPool);
    if (allowance < amtWei) { await (await token.approve(CONTRACTS.ammPool, amtWei * 10n)).wait(); }
    const c  = await W3.getAMMContract(true);
    const r  = await (await c.addLiquidity(marketId, amtWei, { gasLimit: 350000 })).wait();
    return { txHash: r.hash, explorerUrl: CHAIN.explorer + '/tx/' + r.hash };
  },

  ammRemoveLiquidity: async function(marketId, lpAmount) {
    const c = await W3.getAMMContract(true);
    const r = await (await c.removeLiquidity(marketId, ethers.parseEther(lpAmount.toString()), { gasLimit: 300000 })).wait();
    return { txHash: r.hash, explorerUrl: CHAIN.explorer + '/tx/' + r.hash };
  },

  ammSwap: async function(marketId, amountIn, isYes, minOut, currency, decimals) {
    decimals    = decimals || 6;
    const signer = await getSigner();
    const amtWei = ethers.parseUnits(amountIn.toString(), decimals);
    const minWei = ethers.parseUnits(Math.max(0, minOut * 0.98).toFixed(decimals), decimals);
    const token  = new ethers.Contract(currency, [
      'function approve(address,uint256) returns(bool)',
      'function allowance(address,address) view returns(uint256)'
    ], signer);
    const allowance = await token.allowance(await signer.getAddress(), CONTRACTS.ammPool);
    if (allowance < amtWei) { await (await token.approve(CONTRACTS.ammPool, amtWei * 10n)).wait(); }
    const c = await W3.getAMMContract(true);
    const r = await (await c.swap(marketId, amtWei, isYes, minWei, { gasLimit: 400000 })).wait();
    return { txHash: r.hash, explorerUrl: CHAIN.explorer + '/tx/' + r.hash };
  },

  ammClaimFees: async function(marketId) {
    const c = await W3.getAMMContract(true);
    const r = await (await c.claimFees(marketId, { gasLimit: 200000 })).wait();
    return { txHash: r.hash, explorerUrl: CHAIN.explorer + '/tx/' + r.hash };
  },

  createAMMPool: async function(marketId, currency, question) {
    const c = await W3.getAMMContract(true);
    const r = await (await c.createPoolOpen(marketId, currency, question, { gasLimit: 200000 })).wait();
    return { txHash: r.hash, explorerUrl: CHAIN.explorer + '/tx/' + r.hash };
  },
};
