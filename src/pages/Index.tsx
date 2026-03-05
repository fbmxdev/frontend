import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowRight, Wallet, Users, TrendingUp, ExternalLink, Copy, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { useAccount, useConnect } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useAffiliateData, useRegister } from "@/hooks/useContract";
import { CONTRACT_ADDRESS } from "@/config/contract";
import { toast } from "sonner";
import { isAddress } from "viem";
import { useBNBBalance, useUSDTBalance } from "@/hooks/useWalletBalances";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ensureBscChain } from "@/config/wagmi";

type RegistrationState = "idle" | "pending" | "success" | "error";

export default function Home() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { data: affiliateData, refetch: refetchAffiliate } = useAffiliateData(address);
  const { register, isPending, isConfirming, isSuccess, error, hash } = useRegister();
  const [referrer, setReferrer] = useState("");
  const [placement, setPlacement] = useState<number>(0); // 0=Auto, 1=Left, 2=Right
  const [registrationState, setRegistrationState] = useState<RegistrationState>("idle");

  // Wallet balance checks
  const { data: bnbBalance } = useBNBBalance(address);
  const { data: usdtBalance } = useUSDTBalance(address);
  
  // Calculate balance amounts
  const usdtAmount = usdtBalance ? Number(usdtBalance) / 10 ** 18 : 0;
  const bnbAmount = bnbBalance?.value ? Number(bnbBalance.value) / 10 ** 18 : 0;
  
  // Visual highlight only - does NOT block registration
  const hasEnoughUSDT = usdtAmount >= 5;
  // Low BNB warning threshold (0.000055 BNB)
  const hasLowBNB = bnbBalance?.value !== undefined && bnbAmount < 0.000055;

  // affiliates: [parent, agent, totalDirect, level]
  const isRegistered = affiliateData && affiliateData[3] > 0;

  // Handle transaction state changes
  useEffect(() => {
    if (isPending) {
      setRegistrationState("pending");
    }
  }, [isPending]);

  // Handle error from wagmi
  useEffect(() => {
    if (error) {
      setRegistrationState("error");
      toast.error("Registration failed or cancelled");
    }
  }, [error]);

  // Handle successful transaction - verify registration
  useEffect(() => {
    const verifyRegistration = async () => {
      if (isSuccess && hash) {
        // Refetch affiliate data to verify registration
        const result = await refetchAffiliate();
        const data = result.data;
        
        // Check if registration is confirmed:
        // affiliates: [parent, agent, totalDirect, level]
        const level = data ? Number(data[3]) : 0;
        const parent = data ? data[0] : "0x0000000000000000000000000000000000000000";
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        
        if (level > 0 || (parent && parent !== zeroAddress)) {
          setRegistrationState("success");
          toast.success("🎉 Successfully Registered! Welcome to Fortress International");
          
          // Auto-redirect to Deposit page after 2.5 seconds
          setTimeout(() => {
            navigate("/deposit");
          }, 2500);
        } else {
          // Fallback: still mark as success if tx was confirmed
          setRegistrationState("success");
          toast.success("🎉 Successfully Registered! Welcome to Fortress International");
          
          setTimeout(() => {
            navigate("/deposit");
          }, 2500);
        }
      }
    };

    if (isSuccess) {
      verifyRegistration();
    }
  }, [isSuccess, hash, refetchAffiliate, navigate]);

  const handleConnect = async () => {
    await ensureBscChain();
    const connector = connectors.find((c) => c.id === "injected" || c.id === "io.metamask")
      ?? connectors.find((c) => c.id === "walletConnect")
      ?? connectors[0];
    if (connector) connect({ connector });
  };

  const handleRegister = () => {
    if (!referrer || !isAddress(referrer)) {
      toast.error("Please enter a valid referrer address");
      return;
    }
    if (referrer.toLowerCase() === address?.toLowerCase()) {
      toast.error("You cannot use your own address as referrer");
      return;
    }
    setRegistrationState("pending");
    register(referrer as `0x${string}`, placement);
  };

  const copyContract = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    toast.success("Contract address copied!");
  };

  const copyWalletAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Wallet address copied!");
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isProcessing = registrationState === "pending" || isPending || isConfirming;
  const showSuccess = registrationState === "success";

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-28">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-slide-in">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">BNB Smart Chain</span>
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-in-delay-1">
              <span className="text-foreground">Welcome to</span>
              <br />
              <span className="text-gradient-gold">FORTRESS INTERNATIONAL</span>
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-in-delay-2">
              A decentralized affiliate platform built on the BNB Smart Chain. 
              Join our network and earn rewards through referrals and passive income.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-delay-3">
              {!isConnected ? (
                <Button
                  size="lg"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wide gold-glow"
                >
                  <Wallet className="mr-2 h-5 w-5" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : isRegistered ? (
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wide gold-glow"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : showSuccess ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="flex flex-col items-center gap-4 bg-green-500/10 border border-green-500/30 px-6 py-8 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <div className="text-center">
                      <h3 className="text-xl font-display font-bold text-green-500 mb-2">
                        🎉 Successfully Registered!
                      </h3>
                      <p className="text-muted-foreground">
                        Welcome to Fortress International
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Redirecting to Deposit page...
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-4">
                  {/* Connected Wallet Display */}
                  <div className="flex items-center justify-between bg-secondary/50 border border-border/50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Your Wallet:</span>
                      <span className="text-sm font-mono text-foreground font-medium">
                        {shortenAddress(address || "")}
                      </span>
                    </div>
                    <button
                      onClick={copyWalletAddress}
                      className="p-1.5 rounded-md hover:bg-primary/10 transition-colors"
                      title="Copy wallet address"
                    >
                      <Copy className="h-4 w-4 text-primary" />
                    </button>
                  </div>

                  {/* Highlighted Referrer Input */}
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/30 rounded-lg blur-sm" />
                    <Input
                      placeholder="Enter Referrer Wallet Address (0x...)"
                      value={referrer}
                      onChange={(e) => setReferrer(e.target.value)}
                      disabled={isProcessing}
                      className="relative bg-secondary border-2 border-primary/40 focus:border-primary text-foreground placeholder:text-muted-foreground/70"
                    />
                  </div>

                  {/* Placement Selection */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Placement</label>
                    <Select value={String(placement)} onValueChange={(v) => setPlacement(Number(v))}>
                      <SelectTrigger className="bg-secondary border-border/50 text-foreground">
                        <SelectValue placeholder="Select placement" />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border/50">
                        <SelectItem value="0">Auto</SelectItem>
                        <SelectItem value="1">Extreme Left</SelectItem>
                        <SelectItem value="2">Extreme Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Wallet Balance Display */}
                  <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground bg-secondary/30 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">USDT:</span>
                      <span className={hasEnoughUSDT ? "text-green-500" : "text-muted-foreground"}>
                        {usdtAmount.toFixed(2)} USDT
                      </span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">BNB:</span>
                      <span className={hasLowBNB ? "text-amber-500" : "text-green-500"}>
                        {bnbAmount.toFixed(4)} BNB
                      </span>
                    </div>
                  </div>
                  
                  {/* Low BNB Warning (non-blocking) */}
                  {hasLowBNB && (
                    <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>⚠ Low BNB balance. Transaction may fail due to gas.</span>
                    </div>
                  )}

                  {/* Processing State Message */}
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Registering… Please confirm in your wallet</span>
                    </div>
                  )}

                  {/* Error State Message */}
                  {registrationState === "error" && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Registration failed or cancelled</span>
                    </div>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Button
                          size="lg"
                          onClick={handleRegister}
                          disabled={!hasEnoughUSDT || isProcessing || showSuccess}
                          className={`w-full font-display tracking-wide transition-all duration-300 ${
                            hasEnoughUSDT 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 gold-glow" 
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Register Now
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!hasEnoughUSDT && (
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>At least 5 USDT required to enable this button</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  
                  {/* Helper text - UI detection only */}
                  <p className="text-xs text-center text-muted-foreground">
                    UI detection only. Registration does NOT require 5 USDT in wallet.
                  </p>
                </div>
              )}
              
              <a
                href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-border/50 text-foreground hover:bg-secondary/50">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  View Contract
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 border-t border-border/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title text-[1.5rem] sm:text-[1.75rem] mb-3">
              Platform Features
            </h2>
            <p className="label-text max-w-2xl mx-auto">
              Built on blockchain technology for transparency and security
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Referral Network",
                description: "Build your network and earn 10% direct referral commission on all your referrals' deposits.",
              },
              {
                icon: TrendingUp,
                title: "Passive Income",
                description: "Earn daily passive rewards based on your level. Higher levels unlock greater earning potential.",
              },
              {
                icon: Shield,
                title: "Binary Bonus",
                description: "Earn up to 10% pairing bonus from your binary network volume, with 3 pairs per day.",
              },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-6 group hover:border-primary/20 transition-all duration-300">
                <div className="p-3 rounded-[14px] bg-primary/10 w-fit mb-5 group-hover:scale-105 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="section-title mb-2">{feature.title}</h3>
                <p className="label-text leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-border/20">
        <div className="container mx-auto px-4">
          <div className="glass-card p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-primary/3" />
            <div className="relative z-10">
              <h2 className="section-title text-[1.5rem] sm:text-[1.75rem] mb-3">
                Ready to Start Earning?
              </h2>
              <p className="label-text mb-6 max-w-xl mx-auto">
                Connect your wallet and join our growing community of earners today.
              </p>
              <Button
                onClick={copyContract}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Contract Address
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
