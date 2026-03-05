import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useAffiliateData, useWalletsMapping, usePassivesMapping, usePassiveReward, useWithdrawBalance } from "@/hooks/useContract";
import { formatCooldown, WITHDRAW_DENOMINATIONS } from "@/config/contract";
import { Wallet, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { parseEther } from "viem";

export default function Withdraw() {
  const { address, isConnected } = useAccount();
  const { data: affiliateData, isLoading: affiliateLoading } = useAffiliateData(address);
  const { data: walletsData, isLoading: walletLoading } = useWalletsMapping(address);
  const { data: passivesData } = usePassivesMapping(address);
  const { data: passiveReward } = usePassiveReward(address);
  const { withdrawBalance, isPending, isConfirming, isSuccess, error } = useWithdrawBalance();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const level = affiliateData ? Number(affiliateData[3]) : 0;
  const walletBalance = walletsData ? walletsData[0] : BigInt(0);
  const walletCooldown = walletsData ? Number(walletsData[3]) : 0;
  const referralIncome = passivesData ? passivesData[1] : BigInt(0);
  const pendingPassive = passiveReward || BigInt(0);

  const cooldownDuration = 86400;
  const startTimestamp = walletCooldown;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const calculateElapsed = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - startTimestamp;
      return Math.min(elapsed, cooldownDuration);
    };
    const initialElapsed = calculateElapsed();
    setElapsedTime(initialElapsed);
    setIsReady(initialElapsed >= cooldownDuration);
    const interval = setInterval(() => {
      const elapsed = calculateElapsed();
      setElapsedTime(elapsed);
      setIsReady(elapsed >= cooldownDuration);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTimestamp]);

  const canWithdraw = isReady;
  const availableWalletBalance = Number(walletBalance) / 10 ** 18;
  const availableDenominations = level > 0 ? WITHDRAW_DENOMINATIONS[level] || [15] : [15];

  useEffect(() => {
    if (isSuccess) { toast.success("Withdrawal successful!"); setSelectedAmount(null); }
    if (error) { toast.error("Withdrawal failed: " + (error as Error).message); }
  }, [isSuccess, error]);

  const handleWithdraw = () => {
    if (!selectedAmount) { toast.error("Please select a withdrawal amount"); return; }
    if (!canWithdraw) { toast.error("Cooldown period not complete"); return; }
    if (selectedAmount > availableWalletBalance) { toast.error("Insufficient balance"); return; }
    withdrawBalance(parseEther(selectedAmount.toString()));
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center glass-card p-8">
            <Wallet className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground">Please connect your wallet to access this page.</p>
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
            <LoadingSpinner size="lg" text="Loading..." />
          </div>
        </div>
      </Layout>
    );
  }

  const hasActiveLevel = level > 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-title text-[1.5rem]">Withdraw</h1>
          <p className="label-text mt-1">Withdraw your earnings to your wallet</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {!hasActiveLevel ? (
            <div className="glass-card p-8 text-center">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="p-4 rounded-full bg-secondary">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="section-title">No Active Level</h3>
                  <p className="label-text max-w-sm mx-auto">
                    You currently have no active level. Activate a level to withdraw funds.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 border-primary/40 hover:bg-primary/10"
                  onClick={() => window.location.href = '/deposit'}
                >
                  Activate Level
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Card */}
              <div className="glass-card p-5 mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="label-text mb-1">Available to Withdraw</p>
                    <p className="amount-value text-gradient-gold text-[1.5rem]">
                      ${availableWalletBalance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="label-text mb-1">Cooldown Status</p>
                    {canWithdraw ? (
                      <p className="amount-value text-success">Ready</p>
                    ) : (
                      <p className="amount-value text-foreground">{formatCooldown(elapsedTime)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Level Info */}
              <div className="glass-card p-4 mb-4 flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="label-text">
                  Your current level ({level}) allows withdrawals of:{" "}
                  <span className="text-foreground font-medium">
                    {availableDenominations.map((d) => `$${d}`).join(", ")}
                  </span>
                </p>
              </div>

              {/* Denomination Selection */}
              <div className="glass-card p-5 mb-4">
                <h2 className="section-title mb-4">Select Amount</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableDenominations.map((amount) => {
                    const isSelected = selectedAmount === amount;
                    const isDisabledAmount = amount > availableWalletBalance || !canWithdraw;

                    return (
                      <button
                        key={amount}
                        onClick={() => !isDisabledAmount && setSelectedAmount(amount)}
                        disabled={isDisabledAmount}
                        className={`relative subcard text-center transition-all duration-200 border-2 ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : isDisabledAmount
                            ? "border-transparent opacity-50 cursor-not-allowed"
                            : "border-transparent hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <p className={`amount-value ${isSelected ? "text-primary" : "text-foreground"}`}>
                          ${amount}
                        </p>
                        {isDisabledAmount && (
                          <p className="label-text mt-1">
                            {!canWithdraw ? "Cooldown" : "Insufficient"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Withdraw Button */}
              <Button
                onClick={handleWithdraw}
                disabled={!selectedAmount || !canWithdraw || isPending || isConfirming}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-display text-sm"
              >
                {isPending || isConfirming ? (
                  <LoadingSpinner size="sm" />
                ) : !canWithdraw ? (
                  "Cooldown Active"
                ) : (
                  <>
                    <Wallet className="mr-2 h-5 w-5" />
                    Withdraw {selectedAmount ? `$${selectedAmount}` : ""}
                  </>
                )}
              </Button>

              <p className="label-text text-center mt-4">
                A 24-hour cooldown period applies between withdrawals. Withdrawal fees may vary by level.
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
