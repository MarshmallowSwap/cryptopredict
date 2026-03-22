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
  token:          "0xB82c8678462F575d6A9B93C2Db2Ffa4042807684",
  market:         "0x8BF7AE476381e2931BF45cb76bf578Bf9D925A5C",  // v2
  presale:        "0x626155b3Ce409b596CA686c22c4C780b07Be94c5",
  stakingPresale: "0x2eEb98e75DAcF12f8599ae51e9B26c0FAE63732b",
  mockUsdc:       "0xE4C1caD0E89559AAA7AF9A480C2F1edB8e2DbE34",
  mockUsdt:       "0xBB460754deC2C6e0ba15fe00707a72F65C50d171",
};

// ABI minimali (solo le funzioni usate dal frontend)
const MARKET_ABI = [
  "function marketCount() view returns (uint256)",
  "function getMarket(uint256 id) view returns (tuple(uint256 id, address creator, string question, string category, string assetSymbol, uint256 targetPrice, bool targetAbove, uint256 expiresAt, uint256 yesPool, uint256 noPool, uint256 yieldAccrued, uint8 status, uint8 outcome, address resolver, uint8 currency))",
  "function getActiveMarkets(uint256 limit) view returns (tuple(uint256 id, address creator, string question, string category, string assetSymbol, uint256 targetPrice, bool targetAbove, uint256 expiresAt, uint256 yesPool, uint256 noPool, uint256 yieldAccrued, uint8 status, uint8 outcome, address resolver, uint8 currency)[])","
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
};
