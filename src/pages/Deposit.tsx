import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAccount, useReadContract } from "wagmi";
import { useAffiliateData, useUpgradeAmount, useActivateRank, useWalletsMapping, useDepositBalance, useDepositFBMX } from "@/hooks/useContract";
import { LEVEL_COSTS, USDT_ADDRESS, FBMX_ADDRESS, ERC20_ABI, CONTRACT_ADDRESS } from "@/config/contract";
import { TrendingUp, Check, Lock, ArrowUp, Wallet, Shield, CheckCircle2, AlertCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { bsc } from "wagmi/chains";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { useFBMXBalance } from "@/hooks/useWalletBalances";

const USDT_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }
] as const;

export default function Deposit() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { data: affiliateData, isLoading, refetch: refetchAffiliate } = useAffiliateData(address);
  const { data: upgradeAmount, refetch: refetchUpgradeAmount } = useUpgradeAmount(address);
  const { data: walletsData, refetch: refetchWallets } = useWalletsMapping(address);
  
  const currentLevel = affiliateData ? Number(affiliateData[3]) : 0;
  const nextLevel = currentLevel + 1;
  const upgradeAmountBigInt = upgradeAmount ? BigInt(upgradeAmount.toString()) : BigInt(0);
  const nextUpgradeCost = Number(upgradeAmountBigInt) / 10 ** 18;
  
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS, abi: USDT_ABI, functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdtBalanceData, refetch: refetchUsdtBalance } = useReadContract({
    address: USDT_ADDRESS, abi: USDT_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  
  const currentAllowance = allowanceData ? BigInt(allowanceData.toString()) : BigInt(0);
  const hasEnoughAllowance = currentAllowance >= upgradeAmountBigInt && upgradeAmountBigInt > BigInt(0);
  const userUsdtBalance = usdtBalanceData ? BigInt(usdtBalanceData.toString()) : BigInt(0);
  const userUsdtBalanceNum = Number(userUsdtBalance) / 10 ** 18;
  const hasEnoughUsdtBalance = userUsdtBalance >= upgradeAmountBigInt && upgradeAmountBigInt > BigInt(0);

  const walletBalance = walletsData ? walletsData[0] : BigInt(0);
  const walletBalanceNum = Number(walletBalance) / 10 ** 18;
  const availableBalance = walletBalanceNum;
  const canUpgrade = availableBalance >= nextUpgradeCost && nextUpgradeCost > 0;

  const { writeContract: writeApprove, data: approveHash, isPending: approving, error: approveError } = useWriteContract();
  const { isLoading: confirmingApprove, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { depositBalance, isPending: depositing, isConfirming: confirmingDeposit, isSuccess: depositSuccess, error: depositError } = useDepositBalance();
  const { activateRank, isPending: upgrading, isConfirming: confirmingUpgrade, isSuccess: upgradeSuccess, error: upgradeError } = useActivateRank();

  const [fbmxAmount, setFbmxAmount] = useState("");
  const { data: fbmxBalance, refetch: refetchFbmxBalance } = useFBMXBalance(address);
  const { data: fbmxAllowanceData, refetch: refetchFbmxAllowance } = useReadContract({
    address: FBMX_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });
  const { writeContract: writeFbmxApprove, data: fbmxApproveHash, isPending: fbmxApproving, error: fbmxApproveError } = useWriteContract();
  const { isLoading: confirmingFbmxApprove, isSuccess: fbmxApproveSuccess } = useWaitForTransactionReceipt({ hash: fbmxApproveHash });
  const { depositFBMX, isPending: fbmxDepositing, isConfirming: confirmingFbmxDeposit, isSuccess: fbmxDepositSuccess, error: fbmxDepositError } = useDepositFBMX();

  const fbmxBalanceRaw = fbmxBalance ? BigInt(fbmxBalance.toString()) : BigInt(0);
  const fbmxBalanceNum = Number(fbmxBalanceRaw) / 10 ** 18;
  const fbmxAmountBigInt = fbmxAmount ? parseUnits(fbmxAmount, 18) : BigInt(0);
  const fbmxCurrentAllowance = fbmxAllowanceData ? BigInt(fbmxAllowanceData.toString()) : BigInt(0);
  const fbmxHasAllowance = fbmxCurrentAllowance >= fbmxAmountBigInt && fbmxAmountBigInt > BigInt(0);
  const fbmxHasBalance = fbmxBalanceRaw >= fbmxAmountBigInt && fbmxAmountBigInt > BigInt(0);
  const isFbmxApproving = fbmxApproving || confirmingFbmxApprove;
  const isFbmxDepositing = fbmxDepositing || confirmingFbmxDeposit;

  useEffect(() => {
    if (approveSuccess) { toast.success("USDT approved successfully! You can now deposit."); refetchAllowance(); }
    if (depositSuccess) {
      toast.success("Deposit successful! Wallet balance updated.");
      refetchAffiliate(); refetchUpgradeAmount(); refetchWallets(); refetchAllowance(); refetchUsdtBalance();
      queryClient.invalidateQueries({ queryKey: ['affiliateData'] });
      queryClient.invalidateQueries({ queryKey: ['walletData'] });
      queryClient.invalidateQueries({ queryKey: ['walletsMapping'] });
    }
    if (upgradeSuccess) {
      toast.success("Level upgrade successful!");
      refetchAffiliate(); refetchUpgradeAmount(); refetchWallets(); refetchAllowance();
      queryClient.invalidateQueries({ queryKey: ['affiliateData'] });
      queryClient.invalidateQueries({ queryKey: ['walletData'] });
    }
    if (approveError) toast.error("Approval failed: " + (approveError as Error).message);
    if (depositError) toast.error("Deposit failed: " + (depositError as Error).message);
    if (upgradeError) toast.error("Upgrade failed: " + (upgradeError as Error).message);
  }, [approveSuccess, depositSuccess, upgradeSuccess, approveError, depositError, upgradeError]);

  useEffect(() => {
    if (fbmxApproveSuccess) { toast.success("FBMX approved successfully! You can now deposit."); refetchFbmxAllowance(); }
    if (fbmxDepositSuccess) {
      toast.success("FBMX deposit successful!");
      refetchFbmxBalance(); refetchFbmxAllowance(); refetchWallets();
      setFbmxAmount("");
      queryClient.invalidateQueries({ queryKey: ['walletData'] });
    }
    if (fbmxApproveError) toast.error("FBMX approval failed: " + (fbmxApproveError as Error).message);
    if (fbmxDepositError) toast.error("FBMX deposit failed: " + (fbmxDepositError as Error).message);
  }, [fbmxApproveSuccess, fbmxDepositSuccess, fbmxApproveError, fbmxDepositError]);

  const handleApprove = () => {
    if (!address || upgradeAmountBigInt <= BigInt(0)) return;
    writeApprove({ address: USDT_ADDRESS, abi: USDT_ABI, functionName: "approve", args: [CONTRACT_ADDRESS, upgradeAmountBigInt], chain: bsc, account: address });
  };
  const handleDeposit = () => { if (!hasEnoughAllowance || !hasEnoughUsdtBalance) return; depositBalance(); };
  const handleFbmxApprove = () => {
    if (!address || fbmxAmountBigInt <= BigInt(0)) return;
    writeFbmxApprove({ address: FBMX_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [CONTRACT_ADDRESS, fbmxAmountBigInt], chain: bsc, account: address });
  };
  const handleFbmxDeposit = () => { if (!fbmxHasAllowance || !fbmxHasBalance) return; depositFBMX(fbmxAmountBigInt); };

  const isApproving = approving || confirmingApprove;
  const isDepositing = depositing || confirmingDeposit;
  const isUpgrading = upgrading || confirmingUpgrade;
  const canDeposit = hasEnoughAllowance && hasEnoughUsdtBalance && upgradeAmountBigInt > BigInt(0);

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

  if (isLoading) {
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-title text-[1.5rem]">Deposit & Level Up</h1>
          <p className="label-text mt-1">Fund your account and upgrade your level</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Left column: Tabbed Deposit Cards */}
          <Tabs defaultValue="usdt" className="w-full">
            <TabsList className="w-full mb-4 bg-secondary">
              <TabsTrigger value="usdt" className="flex-1 text-sm">Deposit USDT</TabsTrigger>
              <TabsTrigger value="fbmx" className="flex-1 text-sm">Deposit FBMX</TabsTrigger>
            </TabsList>

            {/* USDT Tab */}
            <TabsContent value="usdt">
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-[14px] bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="section-title">Deposit USDT</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="subcard">
                    <p className="label-text">Current Level</p>
                    <p className="amount-value text-foreground mt-1">Level {currentLevel}</p>
                  </div>
                  <div className="subcard border border-primary/20">
                    <p className="label-text">Next Upgrade Level</p>
                    <p className="amount-value text-primary mt-1">Level {nextLevel}</p>
                  </div>
                </div>

                <div className="subcard mb-3">
                  <p className="label-text mb-1">Your USDT Balance</p>
                  <p className="amount-value text-foreground">
                    {userUsdtBalanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </p>
                </div>

                <div className="subcard mb-4">
                  <p className="label-text mb-1">Deposit Amount (USDT)</p>
                  <p className="amount-value text-primary text-[1.3rem]">
                    {nextUpgradeCost.toLocaleString()} USDT
                  </p>
                  <p className="label-text mt-1">Auto-calculated for Level {nextLevel}</p>
                </div>

                {!hasEnoughUsdtBalance && upgradeAmountBigInt > BigInt(0) && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-[14px] p-3 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Insufficient USDT balance. You need {(nextUpgradeCost - userUsdtBalanceNum).toFixed(2)} more USDT.</span>
                  </div>
                )}

                {hasEnoughAllowance && hasEnoughUsdtBalance && (
                  <div className="flex items-center gap-2 text-success bg-success/10 rounded-[14px] p-3 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">USDT approved for Level {nextLevel}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {!hasEnoughAllowance ? (
                    <Button onClick={handleApprove} disabled={isApproving || upgradeAmountBigInt <= BigInt(0) || !hasEnoughUsdtBalance} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                      {isApproving ? <LoadingSpinner size="sm" /> : <><Shield className="mr-2 h-4 w-4" />Approve USDT for Level {nextLevel}</>}
                    </Button>
                  ) : (
                    <Button onClick={handleDeposit} disabled={isDepositing || !canDeposit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                      {isDepositing ? <LoadingSpinner size="sm" /> : <><ArrowUp className="mr-2 h-4 w-4" />Deposit {nextUpgradeCost.toLocaleString()} USDT</>}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* FBMX Tab */}
            <TabsContent value="fbmx">
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-[14px] bg-primary/10">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="section-title">Deposit FBMX</h2>
                </div>

                <div className="subcard mb-3">
                  <p className="label-text mb-1">Your FBMX Balance</p>
                  <p className="amount-value text-foreground">
                    {fbmxBalanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FBMX
                  </p>
                </div>

                <div className="mb-4">
                  <label className="label-text mb-2 block">Deposit Amount (FBMX)</label>
                  <Input type="number" placeholder="Enter FBMX amount" value={fbmxAmount} onChange={(e) => setFbmxAmount(e.target.value)} min="0" step="any" className="text-base" />
                  {fbmxBalanceNum > 0 && (
                    <button type="button" className="text-xs text-primary mt-1 hover:underline" onClick={() => setFbmxAmount(fbmxBalanceNum.toString())}>
                      Max: {fbmxBalanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FBMX
                    </button>
                  )}
                </div>

                {!fbmxHasBalance && fbmxAmountBigInt > BigInt(0) && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-[14px] p-3 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Insufficient FBMX balance.</span>
                  </div>
                )}

                {fbmxHasAllowance && fbmxHasBalance && (
                  <div className="flex items-center gap-2 text-success bg-success/10 rounded-[14px] p-3 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">FBMX approved. Ready to deposit.</span>
                  </div>
                )}

                <div className="space-y-3">
                  {!fbmxHasAllowance ? (
                    <Button onClick={handleFbmxApprove} disabled={isFbmxApproving || fbmxAmountBigInt <= BigInt(0) || !fbmxHasBalance} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                      {isFbmxApproving ? <LoadingSpinner size="sm" /> : <><Shield className="mr-2 h-4 w-4" />Approve FBMX</>}
                    </Button>
                  ) : (
                    <Button onClick={handleFbmxDeposit} disabled={isFbmxDepositing || !fbmxHasAllowance || !fbmxHasBalance} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                      {isFbmxDepositing ? <LoadingSpinner size="sm" /> : <><ArrowUp className="mr-2 h-4 w-4" />Deposit FBMX</>}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Level Upgrade Card */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-[14px] bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="section-title">Level Upgrade</h2>
            </div>

            <div className="space-y-3 mb-5">
              <div className="subcard flex justify-between items-center">
                <span className="label-text">Current Level</span>
                <span className="amount-value text-foreground">Level {currentLevel}</span>
              </div>
              
              {currentLevel < 15 && (
                <>
                  <div className="subcard flex justify-between items-center">
                    <span className="label-text">Next Level</span>
                    <span className="amount-value text-primary">Level {currentLevel + 1}</span>
                  </div>
                  <div className="subcard flex justify-between items-center">
                    <span className="label-text">Upgrade Cost</span>
                    <span className="amount-value text-foreground">${nextUpgradeCost.toFixed(2)} USDT</span>
                  </div>
                </>
              )}
              
              <div className="subcard flex justify-between items-center">
                <span className="label-text">Available Wallet Balance</span>
                <span className="amount-value text-gradient-gold">${availableBalance.toFixed(2)} USDT</span>
              </div>
            </div>

            {currentLevel < 15 ? (
              <>
                {!canUpgrade && availableBalance < nextUpgradeCost && (
                  <div className="mb-4 p-3 rounded-[14px] bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Insufficient balance. You need ${(nextUpgradeCost - availableBalance).toFixed(2)} more USDT.
                    </p>
                  </div>
                )}
                
                <Button onClick={() => activateRank()} disabled={isUpgrading || !canUpgrade} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                  {isUpgrading ? <LoadingSpinner size="sm" /> : <><ArrowUp className="mr-2 h-4 w-4" />Upgrade to Level {currentLevel + 1}</>}
                </Button>
              </>
            ) : (
              <div className="subcard text-center border border-success/20">
                <Check className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-success font-semibold text-sm">Maximum Level Reached!</p>
              </div>
            )}
          </div>
        </div>

        {/* Level Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border/40">
            <h2 className="section-title">Level Structure</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/40">
                <tr>
                  <th className="px-5 py-3 text-left label-text">Level</th>
                  <th className="px-5 py-3 text-left label-text">Entry Cost</th>
                  <th className="px-5 py-3 text-left label-text">Max Earning</th>
                  <th className="px-5 py-3 text-left label-text">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {LEVEL_COSTS.map((cost, index) => {
                  const level = index + 1;
                  const isCurrentLevel = level === currentLevel;
                  const isUnlocked = level <= currentLevel;
                  const isNextLevel = level === currentLevel + 1;

                  return (
                    <tr key={level} className={`transition-colors ${isCurrentLevel ? "bg-primary/10" : isNextLevel ? "bg-secondary/20" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                            isCurrentLevel ? "bg-primary text-primary-foreground" : isUnlocked ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"
                          }`}>
                            {level}
                          </div>
                          <span className={`text-sm font-medium ${isCurrentLevel ? "text-primary" : "text-foreground"}`}>
                            Level {level}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><span className="text-sm text-foreground font-medium">${cost}</span></td>
                      <td className="px-5 py-3"><span className="text-sm text-foreground font-medium">${cost * 3}</span></td>
                      <td className="px-5 py-3">
                        {isCurrentLevel ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                            <TrendingUp className="h-3 w-3" /> Current
                          </span>
                        ) : isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                            <Check className="h-3 w-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
