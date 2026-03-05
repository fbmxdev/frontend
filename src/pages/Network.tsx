import { useState } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useAffiliateData, useBinaryData, useChildren } from "@/hooks/useContract";
import { formatAddress } from "@/config/contract";
import { Users, GitBranch, ChevronRight, ChevronDown, Wallet, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface TreeNodeProps {
  address: `0x${string}`;
  isAffiliate: boolean;
  depth?: number;
}

function TreeNode({ address, isAffiliate, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: affiliateData } = useAffiliateData(address);
  const { data: binaryData } = useBinaryData(address);
  const { data: children, isLoading } = useChildren(address, 0, 10);

  const level = affiliateData ? Number(affiliateData[3]) : 0;
  const childrenCount = affiliateData ? Number(affiliateData[2]) : 0;
  const leftVolume = binaryData ? binaryData[3] : BigInt(0);
  const rightVolume = binaryData ? binaryData[4] : BigInt(0);

  const hasChildren = isAffiliate ? childrenCount > 0 : (binaryData && (binaryData[1] !== "0x0000000000000000000000000000000000000000" || binaryData[2] !== "0x0000000000000000000000000000000000000000"));

  if (depth > 5) return null;

  return (
    <div className="pl-4 border-l border-border/30">
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex items-center gap-3 p-3 rounded-[14px] transition-colors ${
          hasChildren ? "cursor-pointer hover:bg-secondary" : ""
        } ${expanded ? "bg-secondary/60" : ""}`}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <div className="w-4" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">{formatAddress(address)}</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
              L{level}
            </span>
          </div>
          <div className="flex items-center gap-4 label-text mt-1 flex-wrap">
            {isAffiliate && <span>{childrenCount} referrals</span>}
            {!isAffiliate && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  L: ${(Number(leftVolume) / 10 ** 18).toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                  R: ${(Number(rightVolume) / 10 ** 18).toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2">
          {isLoading ? (
            <div className="pl-8 py-2"><LoadingSpinner size="sm" /></div>
          ) : isAffiliate ? (
            children?.map((child: `0x${string}`) => (
              child !== "0x0000000000000000000000000000000000000000" && (
                <TreeNode key={child} address={child} isAffiliate={isAffiliate} depth={depth + 1} />
              )
            ))
          ) : (
            <>
              {binaryData && binaryData[1] !== "0x0000000000000000000000000000000000000000" && (
                <div className="mb-2">
                  <p className="label-text pl-8 mb-1">Left Leg</p>
                  <TreeNode address={binaryData[1]} isAffiliate={false} depth={depth + 1} />
                </div>
              )}
              {binaryData && binaryData[2] !== "0x0000000000000000000000000000000000000000" && (
                <div>
                  <p className="label-text pl-8 mb-1">Right Leg</p>
                  <TreeNode address={binaryData[2]} isAffiliate={false} depth={depth + 1} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Network() {
  const { address, isConnected } = useAccount();
  const { data: affiliateData, isLoading } = useAffiliateData(address);
  const { data: binaryData } = useBinaryData(address);
  const [copied, setCopied] = useState(false);

  const totalDirectBonus = affiliateData ? Number(affiliateData[2]) / 10 ** 18 : 0;
  const hasLeft = binaryData && binaryData[1] !== "0x0000000000000000000000000000000000000000";
  const hasRight = binaryData && binaryData[2] !== "0x0000000000000000000000000000000000000000";

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        toast.success("Referral address copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch { toast.error("Failed to copy address"); }
    }
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

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" text="Loading network..." />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-title text-[1.5rem]">My Network</h1>
          <p className="label-text mt-1">View your referral and binary network structure</p>
        </div>

        {/* Referral Card */}
        <div className="glass-card p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-[14px] bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="section-title">Your Referral Address</h2>
              <p className="label-text">Share this address to invite others</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 subcard font-mono text-sm text-foreground break-all">
              {address}
            </div>
            <Button
              onClick={handleCopyAddress}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-sm"
            >
              {copied ? (
                <><Check className="h-4 w-4" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy Address</>
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="referral" className="w-full">
          <TabsList className="w-full max-w-md mx-auto mb-6 bg-secondary">
            <TabsTrigger value="referral" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
              <Users className="mr-2 h-4 w-4" />
              Referral Network
            </TabsTrigger>
            <TabsTrigger value="binary" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
              <GitBranch className="mr-2 h-4 w-4" />
              Binary Network
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referral">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-[14px] bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="section-title">Referral Tree</h2>
                  <p className="label-text">Direct Referral Bonus: ${totalDirectBonus.toFixed(2)} USDT</p>
                </div>
              </div>

              {totalDirectBonus === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="label-text">No referrals yet. Share your referral link to grow your network!</p>
                </div>
              ) : (
                <div className="border-l-2 border-primary/30 ml-4">
                  {address && <TreeNode address={address} isAffiliate={true} />}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="binary">
            {/* Volume Summary Card */}
            {binaryData && (
              (() => {
                const leftVol = Number(binaryData[3]) / 10 ** 18;
                const rightVol = Number(binaryData[4]) / 10 ** 18;
                const totalVol = leftVol + rightVol;
                const leftPct = totalVol > 0 ? (leftVol / totalVol) * 100 : 0;
                const rightPct = totalVol > 0 ? (rightVol / totalVol) * 100 : 0;
                return (
                  <div className="glass-card p-5 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-[14px] bg-primary/10">
                        <GitBranch className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="section-title">Binary Volume</h2>
                        <p className="label-text">Your leg volume overview</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="subcard">
                        <div className="flex items-center justify-between mb-2">
                          <p className="label-text flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                            Left Volume
                          </p>
                          <p className="amount-value">${leftVol.toFixed(2)}</p>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden bg-secondary">
                          <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${leftPct}%` }} />
                        </div>
                      </div>
                      <div className="subcard">
                        <div className="flex items-center justify-between mb-2">
                          <p className="label-text flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                            Right Volume
                          </p>
                          <p className="amount-value">${rightVol.toFixed(2)}</p>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden bg-secondary">
                          <div className="h-full bg-accent transition-all duration-500 rounded-full" style={{ width: `${rightPct}%` }} />
                        </div>
                      </div>
                      <div className="subcard flex items-center justify-between">
                        <p className="label-text font-semibold">Total Volume</p>
                        <p className="amount-value text-gradient-gold">${totalVol.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-[14px] bg-primary/10">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="section-title">Binary Tree</h2>
                  <p className="label-text">Left and right leg structure</p>
                </div>
              </div>

              {!hasLeft && !hasRight ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="label-text">No binary placements yet.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="label-text mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Left Leg
                    </h3>
                    {hasLeft ? (
                      <TreeNode address={binaryData![1]} isAffiliate={false} />
                    ) : (
                      <p className="label-text italic">Empty</p>
                    )}
                  </div>
                  <div>
                    <h3 className="label-text mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      Right Leg
                    </h3>
                    {hasRight ? (
                      <TreeNode address={binaryData![2]} isAffiliate={false} />
                    ) : (
                      <p className="label-text italic">Empty</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
