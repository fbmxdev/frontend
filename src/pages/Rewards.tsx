import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAccount, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { usePassiveReward, useCollectPassive, useAffiliateData, useBinaryData, usePassivesMapping, useWalletsMapping, useChildren, useCollectBinaryRewards } from "@/hooks/useContract";
import { formatUSDT, formatCooldown, CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { Gift, Users, GitBranch, Wallet, Clock } from "lucide-react";

import { toast } from "sonner";
import { bsc } from "wagmi/chains";

const LEVEL_DEPOSITS: Record<number, number> = {
  1: 5, 2: 10, 3: 20, 4: 40, 5: 80, 6: 160, 7: 320, 8: 640,
  9: 1280, 10: 2560, 11: 5120, 12: 10240, 13: 20480, 14: 40960, 15: 81920,
};

export default function Rewards() {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { data: passiveReward, isLoading: passiveLoading, refetch: refetchPassiveReward } = usePassiveReward(address);
  const pendingPassive = passiveReward || BigInt(0);
  const passiveClaimable = Number(pendingPassive) / 10 ** 18;
  const { data: affiliateData, refetch: refetchAffiliate } = useAffiliateData(address);
  const { data: binaryData, refetch: refetchBinary } = useBinaryData(address);
  const { data: passivesData, refetch: refetchPassives } = usePassivesMapping(address);
  const { data: walletsData, refetch: refetchWallets } = useWalletsMapping(address);
  const { collectPassive, isPending, isConfirming, isSuccess, error } = useCollectPassive();
  const { collectBinaryRewards, isPending: binaryPending, isConfirming: binaryConfirming, isSuccess: binarySuccess, error: binaryError } = useCollectBinaryRewards();

  const { data: childrenData } = useChildren(address, 0, 200);
  const childrenCount = childrenData 
    ? childrenData.filter((addr: string) => addr !== "0x0000000000000000000000000000000000000000").length 
    : 0;
  const totalDirectRaw = affiliateData ? affiliateData[2] : BigInt(0);
  const referralIncomeFromContract = Number(totalDirectRaw) / 1e18;
  const binaryLeftVolume = binaryData ? binaryData[3] : BigInt(0);
  const binaryRightVolume = binaryData ? binaryData[4] : BigInt(0);
  const binaryCooldown = binaryData ? Number(binaryData[5]) : 0;
  
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);
  const binaryCooldownActive = binaryCooldown > currentTime;
  const binaryCooldownRemaining = binaryCooldownActive ? binaryCooldown - currentTime : 0;
  const weakerLeg = binaryLeftVolume < binaryRightVolume ? binaryLeftVolume : binaryRightVolume;
  const binaryRewardValue = Number(weakerLeg) / 1e18;
  
  const passiveCooldown = passivesData ? Number(passivesData[2]) : 0;
  const passiveEquity = passivesData ? passivesData[1] : BigInt(0);
  const totalIncome = walletsData ? walletsData[2] : BigInt(0);
  
  const { data: percentage } = useReadContract({
    address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'getPercentage',
    args: [passiveEquity, BigInt(0)], chainId: bsc.id,
    query: { enabled: passiveEquity > BigInt(0) }
  });
  
  const { data: getEquity } = useReadContract({
    address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'getEquity',
    args: [passiveEquity, totalIncome], chainId: bsc.id,
    query: { enabled: passiveEquity > BigInt(0) }
  });
  
  const startTimestamp = parseInt(String(passiveCooldown));
  
  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const [elapsedTime, setElapsedTime] = useState(() => Math.floor(Date.now() / 1000) - startTimestamp);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setElapsedTime(now - startTimestamp);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTimestamp]);
  
  const cooldownDuration = 86400;
  const isReady = elapsedTime >= cooldownDuration;
  const canCollect = isReady;
  
  const passivePending = (percentage && getEquity) 
    ? parseFloat(((parseInt(String(percentage))/10000) * (elapsedTime/86400) * (parseInt(String(getEquity))/1e18)).toFixed(2))
    : 0;
  
  const cooldownDisplay = startTimestamp ? formatTime(elapsedTime) : "—";
  

  useEffect(() => {
    if (isSuccess) {
      toast.success("Passive rewards collected successfully!");
      refetchPassiveReward();
      refetchPassives();
      queryClient.invalidateQueries({ queryKey: ['getPassiveReward'] });
      queryClient.invalidateQueries({ queryKey: ['passives'] });
    }
    if (error) {
      toast.error("Collection failed: " + (error as Error).message);
    }
  }, [isSuccess, error, queryClient, refetchPassiveReward, refetchPassives]);

  useEffect(() => {
    if (binarySuccess) {
      toast.success("Binary rewards collected successfully!");
      refetchBinary();
      queryClient.invalidateQueries({ queryKey: ['binaries'] });
    }
    if (binaryError) {
      toast.error("Binary collection failed: " + (binaryError as Error).message);
    }
  }, [binarySuccess, binaryError, queryClient, refetchBinary]);

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-title text-[1.5rem]">Rewards</h1>
          <p className="label-text mt-1">View and collect your earnings</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Passive Rewards */}
          <div className="glass-card p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="section-title mb-1">Passive Rewards</h2>
                <p className="label-text">Daily earnings based on your level</p>
              </div>
              <div className="p-3 rounded-2xl bg-primary/10">
                <Gift className="h-6 w-6 text-primary" />
              </div>
            </div>

            {passiveLoading ? (
              <LoadingSpinner size="md" text="Loading rewards..." />
            ) : (
              <>
                <div className="subcard mb-3">
                  <p className="label-text mb-1">Pending Amount</p>
                  <p className="amount-value text-gradient-gold">
                    ${passiveClaimable.toFixed(2)}
                  </p>
                </div>

                {/* Cooldown Timer */}
                <div className="subcard mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="label-text">
                      {canCollect ? "Ready to Collect" : "Cooldown Active"}
                    </span>
                  </div>
                  {!canCollect && (
                    <p className="amount-value text-foreground">
                      {passivePending}
                    </p>
                  )}
                  <p className="label-text mt-1.5">{cooldownDisplay}</p>
                </div>

                <Button
                  onClick={() => collectPassive()}
                  disabled={isPending || isConfirming || !passiveReward || passiveReward === BigInt(0) || !canCollect}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display text-sm"
                >
                  {isPending || isConfirming ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Collect Rewards
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Direct Referral */}
          <div className="glass-card p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="section-title mb-1">Direct Referral</h2>
                <p className="label-text">10% commission on direct referrals (including upgrades)</p>
              </div>
              <div className="p-3 rounded-2xl bg-secondary">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="subcard flex items-center justify-between">
                <span className="label-text">Direct Referrals</span>
                <span className="amount-value text-foreground">{childrenCount}</span>
              </div>
              <div className="subcard flex items-center justify-between">
                <span className="label-text">Referral Income Earned</span>
                <span className="amount-value text-primary">${referralIncomeFromContract.toFixed(2)}</span>
              </div>
              <div className="subcard flex items-center justify-between">
                <span className="label-text">Commission Rate</span>
                <span className="amount-value text-primary">10%</span>
              </div>
            </div>

            <p className="label-text mt-4">
              Referral commissions are automatically credited to your wallet balance.
            </p>
          </div>

          {/* Binary/Pairing Bonus */}
          <div className="glass-card p-5 lg:col-span-2">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="section-title mb-1">Pairing Bonus</h2>
                <p className="label-text">10% of weaker leg volume. Unlimited per day, capped at 300% per deposit.</p>
              </div>
              <div className="p-3 rounded-2xl bg-secondary">
                <GitBranch className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="subcard text-center">
                <p className="label-text mb-1">Left Volume</p>
                <p className="amount-value text-foreground">
                  ${formatUSDT(binaryLeftVolume)}
                </p>
              </div>
              <div className="subcard text-center">
                <p className="label-text mb-1">Right Volume</p>
                <p className="amount-value text-foreground">
                  ${formatUSDT(binaryRightVolume)}
                </p>
              </div>
            </div>

            <div className="subcard text-center mb-3">
              <p className="label-text mb-1">Available Pairing Bonus</p>
              <p className="amount-value text-primary">
                ${binaryRewardValue.toFixed(2)}
              </p>
            </div>

            {binaryCooldownActive && (
              <div className="subcard mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="label-text">Cooldown Active</span>
                </div>
                <p className="amount-value text-foreground">
                  {formatTime(binaryCooldownRemaining)}
                </p>
              </div>
            )}

            <Button
              onClick={() => collectBinaryRewards()}
              disabled={binaryPending || binaryConfirming || binaryRewardValue <= 0 || binaryCooldownActive}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display text-sm"
            >
              {binaryPending || binaryConfirming ? (
                <LoadingSpinner size="sm" />
              ) : binaryCooldownActive ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Cooldown Active
                </>
              ) : (
                <>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Collect Rewards
                </>
              )}
            </Button>

            <p className="label-text mt-4">
              Bonus Rate: 10%, unlimited per day, capped at 300% per deposit.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
