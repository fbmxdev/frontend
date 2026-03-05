import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAccount } from "wagmi";
import { useAffiliateData, useWalletsMapping, usePassivesMapping, usePassiveReward, useBinaryData } from "@/hooks/useContract";
import { useBNBBalance, useUSDTBalance, useFBMXBalance } from "@/hooks/useWalletBalances";
import { LEVEL_COSTS, formatCooldown } from "@/config/contract";
import { Wallet, TrendingUp, Gift, Shield, Coins, GitBranch, CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { data: affiliateData, isLoading: affiliateLoading } = useAffiliateData(address);
  const { data: walletsData, isLoading: walletLoading } = useWalletsMapping(address);
  const { data: passivesData } = usePassivesMapping(address);
  const { data: passiveReward } = usePassiveReward(address);
  const { data: binaryData } = useBinaryData(address);
  const passiveEquity = passivesData ? passivesData[1] : BigInt(0);
  const totalDirectRaw = affiliateData ? affiliateData[2] : BigInt(0);
  const { data: bnbBalance } = useBNBBalance(address);
  const { data: usdtBalance } = useUSDTBalance(address);
  const { data: fbmxBalance } = useFBMXBalance(address);

  const totalDirectIncome = Number(totalDirectRaw) / 1e18;
  const totalEquityNum = Number(passiveEquity) / 1e18;

  // Daily rate in BPS: integer math on raw bigints, then convert
  const MIN_BPS = BigInt(100); // 1%
  const MAX_BPS = BigInt(800); // 8%
  let rateBps = BigInt(0);
  if (passiveEquity > BigInt(0)) {
    rateBps = totalDirectRaw === BigInt(0)
      ? MIN_BPS
      : (totalDirectRaw * BigInt(1000)) / passiveEquity;
    if (rateBps < MIN_BPS) rateBps = MIN_BPS;
    if (rateBps > MAX_BPS) rateBps = MAX_BPS;
  }
  const dailyRate = Number(rateBps) / 100;
  const level = affiliateData ? Number(affiliateData[3]) : 0;
  const currentEquity = level > 0 ? LEVEL_COSTS[level - 1] : 0;
  const totalEquity = level > 0 ? LEVEL_COSTS.slice(0, level).reduce((sum, cost) => sum + cost, 0) : 0;

  const walletBalance = walletsData ? walletsData[0] : BigInt(0);
  const capping = walletsData ? walletsData[1] : BigInt(0);
  const totalIncome = walletsData ? walletsData[2] : BigInt(0);
  const walletCooldown = walletsData ? Number(walletsData[3]) : 0;

  const referralIncome = BigInt(0);
  const passiveCooldown = passivesData ? Number(passivesData[2]) : 0;
  const pendingPassive = passiveReward || BigInt(0);

  const cooldownDuration = 86400;
  const startTimestamp = Math.max(walletCooldown, passiveCooldown);

  const [timeLeft, setTimeLeft] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const initialLeft = Math.max(cooldownDuration - (now - startTimestamp), 0);
    setTimeLeft(initialLeft);
    setIsReady(initialLeft <= 0);

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(cooldownDuration - (now - startTimestamp), 0);
      setTimeLeft(remaining);
      setIsReady(remaining <= 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimestamp]);

  const canWithdraw = isReady;

  const walletBalanceNum = Number(walletBalance) / 10 ** 18;
  const passiveClaimable = Number(pendingPassive) / 10 ** 18;
  const referralIncomeNum = Number(referralIncome) / 10 ** 18;
  const availableWalletBalance = walletBalanceNum;

  const totalIncomeNum = Number(totalIncome) / 10 ** 18;
  const maxIncome = totalEquity * 3; // 300% cap
  const cappingProgress = maxIncome > 0 ? (totalIncomeNum / maxIncome) * 100 : 0;
  const availableCapping = Math.max(0, maxIncome - totalIncomeNum);

  const bnbFormatted = bnbBalance ? Number(bnbBalance.value) / 10 ** 18 : 0;
  const usdtFormatted = usdtBalance ? Number(usdtBalance) / 10 ** 18 : 0;
  const fbmxFormatted = fbmxBalance ? Number(fbmxBalance) / 10 ** 18 : 0;

  // Binary volumes
  const leftVolume = binaryData ? Number(binaryData[3]) / 1e18 : 0;
  const rightVolume = binaryData ? Number(binaryData[4]) / 1e18 : 0;
  const totalVolume = leftVolume + rightVolume;
  const leftPercent = totalVolume > 0 ? (leftVolume / totalVolume) * 100 : 50;
  const rightPercent = totalVolume > 0 ? (rightVolume / totalVolume) * 100 : 50;

  if (!isConnected) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center glass-card p-8">
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6">Please connect your wallet to access the dashboard.</p>
            <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Go to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (affiliateLoading || walletLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" text="Loading dashboard..." />
          </div>
        </div>
      </Layout>
    );
  }

  if (level === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center glass-card p-8">
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">Not Registered</h1>
            <p className="text-muted-foreground mb-6">You need to register first to access the dashboard.</p>
            <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Register Now
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* Page Header */}
        <div className="mb-1">
          <h1 className="section-title text-[1.5rem]">Dashboard</h1>
          <p className="label-text mt-1">Your account overview & earnings</p>
        </div>

        {/* SECTION 1 — Account Overview */}
        <div className="glass-card p-5 gold-glow">
          <h2 className="section-title mb-4">Account Overview</h2>
          <div className="space-y-3">
            {/* Subcard — Level */}
            <div className="subcard text-center">
              <p className="label-text mb-1">Current Level</p>
              <p className="hero-level">Level {level}</p>
            </div>

            {/* Subcard — Daily Rate */}
            <div className="subcard text-center">
              <p className="label-text mb-1">Daily Rate</p>
              <p className="amount-value text-foreground">
                {affiliateLoading ? "Loading rate..." : `${dailyRate.toFixed(2)}%`}
              </p>
            </div>

            {/* Subcard — Equity Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="subcard">
                <p className="label-text mb-1">Equity</p>
                <p className="amount-value text-foreground">${currentEquity.toLocaleString()}</p>
              </div>
              <div className="subcard">
                <p className="label-text mb-1">Total Equity</p>
                <p className="amount-value text-foreground">${totalEquity.toLocaleString()}</p>
              </div>
            </div>

            {/* Subcard — Capping Progress */}
            <div className="subcard">
              <div className="flex items-center justify-between mb-2">
                <p className="label-text">Capping Progress</p>
                <p className="font-display text-sm font-bold text-primary">{cappingProgress.toFixed(2)}%</p>
              </div>
              <Progress value={Math.min(cappingProgress, 100)} className="h-2" />
              <div className="flex items-center justify-between mt-2">
                <p className="label-text">${totalIncomeNum.toFixed(2)} / ${maxIncome.toFixed(2)}</p>
                <p className="label-text">Available: ${availableCapping.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 — Earnings */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">Earnings</h2>
          <div className="space-y-3">
            <div className="subcard flex items-center justify-between">
              <p className="label-text">Total Earned</p>
              <p className="amount-value text-gradient-gold">${totalIncomeNum.toFixed(2)}</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <p className="label-text">Passive Pending</p>
              <p className="amount-value text-gradient-gold">${passiveClaimable.toFixed(2)}</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <p className="label-text">Available Balance</p>
              <p className="amount-value text-foreground">${availableWalletBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* SECTION 3 — Binary Tree */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-[14px] bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <h2 className="section-title">Binary Tree</h2>
          </div>
          <div className="space-y-3">
            <div className="subcard flex items-center justify-between">
              <p className="label-text">Left Volume</p>
              <p className="amount-value text-foreground">${leftVolume.toFixed(2)}</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <p className="label-text">Right Volume</p>
              <p className="amount-value text-foreground">${rightVolume.toFixed(2)}</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <p className="label-text font-semibold">Total Volume</p>
              <p className="amount-value text-gradient-gold">${totalVolume.toFixed(2)}</p>
            </div>
            {/* Left Leg Progress */}
            <div className="subcard">
              <div className="flex items-center justify-between mb-2">
                <p className="label-text flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  Left Leg
                </p>
                <p className="label-text">{leftPercent.toFixed(0)}%</p>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${leftPercent}%` }}
                />
              </div>
            </div>
            {/* Right Leg Progress */}
            <div className="subcard">
              <div className="flex items-center justify-between mb-2">
                <p className="label-text flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                  Right Leg
                </p>
                <p className="label-text">{rightPercent.toFixed(0)}%</p>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-secondary">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{ width: `${rightPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4 — My Deposit Summary */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-[14px] bg-primary/10">
              <CircleDollarSign className="h-5 w-5 text-primary" />
            </div>
            <h2 className="section-title">My Available Deposit</h2>
          </div>
          <div className="space-y-3">
            <div className="subcard flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded px-1.5 py-0.5">USDT</span>
                <p className="label-text">USDT Balance</p>
              </div>
              <p className="amount-value text-gradient-gold">${usdtFormatted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 py-0.5">FBMX</span>
                <p className="label-text" title="FBMX received from your deposit">FBMX Balance</p>
              </div>
              <p className="amount-value text-foreground">{fbmxFormatted.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} FBMX</p>
            </div>
            {fbmxFormatted === 0 && (
              <p className="text-xs text-yellow-400 mt-1 px-1">⚠️ No FBMX received yet.</p>
            )}
          </div>
        </div>

        {/* SECTION 5 — Wallet Balances */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">Wallet Balances</h2>
          <div className="space-y-3">
            <div className="subcard flex items-center justify-between">
              <p className="label-text">BNB Balance</p>
              <p className="amount-value text-foreground">{bnbFormatted.toFixed(4)} BNB</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <p className="label-text">USDT Balance</p>
              <p className="amount-value text-foreground">${usdtFormatted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="subcard flex items-center justify-between">
              <p className="label-text">FBMX Balance</p>
              <p className="amount-value text-foreground">{fbmxFormatted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FBMX</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={() => navigate("/deposit")}
            className="h-auto py-4 bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col items-center gap-2"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="font-display text-xs">Level Up</span>
          </Button>
          <Button
            onClick={() => navigate("/rewards")}
            variant="outline"
            className="h-auto py-4 border-border/40 hover:bg-secondary/50 flex flex-col items-center gap-2"
          >
            <Gift className="h-5 w-5" />
            <span className="font-display text-xs">Collect Rewards</span>
          </Button>
          <Button
            onClick={() => navigate("/withdraw")}
            variant="outline"
            className="h-auto py-4 border-border/40 hover:bg-secondary/50 flex flex-col items-center gap-2"
          >
            <Wallet className="h-5 w-5" />
            <span className="font-display text-xs">Withdraw</span>
          </Button>
          <Button
            onClick={() => navigate("/network")}
            variant="outline"
            className="h-auto py-4 border-border/40 hover:bg-secondary/50 flex flex-col items-center gap-2"
          >
            <Shield className="h-5 w-5" />
            <span className="font-display text-xs">My Network</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
