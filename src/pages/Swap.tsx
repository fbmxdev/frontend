import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownUp, Settings2, Loader2, AlertTriangle } from "lucide-react";
import { useAccount, useConnect, useChainId } from "wagmi";
import { ensureBscChain } from "@/config/wagmi";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";

// ─── Token Config ───────────────────────────────────────────
const TOKENS: Record<string, { address: string; symbol: string; decimals: number; isNative?: boolean }> = {
  FBMX: { address: "0x5951F937ff590239D38c10e871F9982359E56C36", symbol: "FBMX", decimals: 18 },
  USDT: { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", decimals: 18 },
  BNB: { address: "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "BNB", decimals: 18, isNative: true },
};

const WBNB = "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BSC_RPC = "https://bsc-dataseed1.binance.org/";

// ─── PancakeSwap V3 Contracts (BSC) ────────────────────────
const V3_SWAP_ROUTER = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";
const V3_QUOTER = "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997";

const FEE_TIERS: number[] = [500, 2500, 3000, 10000];

// ─── ABIs ───────────────────────────────────────────────────
const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
  "function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient) external payable",
  "function refundETH() external payable",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

// ─── Providers ──────────────────────────────────────────────
function getReadProvider() {
  return new ethers.JsonRpcProvider(BSC_RPC);
}

function getWalletProvider() {
  if (!(window as any).ethereum) return null;
  return new ethers.BrowserProvider((window as any).ethereum);
}

function resolveAddress(token: string): string {
  const info = TOKENS[token];
  return info.isNative ? WBNB : info.address;
}

// ─── Quote Types ────────────────────────────────────────────
interface QuoteResult {
  amountOut: bigint;
  fee: number;
  path: "direct" | "multi-hop";
  routeLabel: string;
}

// ─── Component ──────────────────────────────────────────────
export default function Swap() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const chainId = useChainId();
  const { toast } = useToast();

  const [fromToken, setFromToken] = useState("USDT");
  const [toToken, setToToken] = useState("FBMX");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [showSlippage, setShowSlippage] = useState(false);

  const [estimatedOutput, setEstimatedOutput] = useState("0");
  const [minimumReceived, setMinimumReceived] = useState("0");
  const [priceImpact, setPriceImpact] = useState("0");
  const [routeLabel, setRouteLabel] = useState("");

  const [allowance, setAllowance] = useState(BigInt(0));
  const [fromBalance, setFromBalance] = useState("0");
  const [toBalance, setToBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [noLiquidity, setNoLiquidity] = useState(false);
  const [highImpact, setHighImpact] = useState(false);
  const [bestQuote, setBestQuote] = useState<QuoteResult | null>(null);

  const isBSC = chainId === 56;
  const fromInfo = TOKENS[fromToken];
  const toInfo = TOKENS[toToken];

  // ─── Helpers ────────────────────────────────────────────
  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
    setEstimatedOutput("0");
    setMinimumReceived("0");
    setPriceImpact("0");
    setRouteLabel("");
    setBestQuote(null);
  };

  const handleFromChange = (val: string) => {
    if (val === toToken) setToToken(fromToken);
    setFromToken(val);
    setAmount("");
    setEstimatedOutput("0");
    setBestQuote(null);
  };

  const handleToChange = (val: string) => {
    if (val === fromToken) setFromToken(toToken);
    setToToken(val);
    setEstimatedOutput("0");
    setBestQuote(null);
  };

  // ─── Fetch Balances ─────────────────────────────────────
  useEffect(() => {
    const fetchBalances = async () => {
      const provider = getReadProvider();
      const addr = address;
      if (!addr) { setFromBalance("0"); setToBalance("0"); return; }
      try {
        if (fromInfo.isNative) {
          const bal = await provider.getBalance(addr);
          setFromBalance(ethers.formatUnits(bal, 18));
        } else {
          const token = new ethers.Contract(fromInfo.address, ERC20_ABI, provider);
          const bal = await token.balanceOf(addr);
          setFromBalance(ethers.formatUnits(bal, fromInfo.decimals));
        }
        if (toInfo.isNative) {
          const bal = await provider.getBalance(addr);
          setToBalance(ethers.formatUnits(bal, 18));
        } else {
          const token = new ethers.Contract(toInfo.address, ERC20_ABI, provider);
          const bal = await token.balanceOf(addr);
          setToBalance(ethers.formatUnits(bal, toInfo.decimals));
        }
      } catch {
        setFromBalance("0");
        setToBalance("0");
      }
    };
    fetchBalances();
  }, [address, fromToken, toToken, fromInfo, toInfo]);

  // ─── Fetch Allowance ────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !address || fromInfo.isNative) { setAllowance(BigInt(0)); return; }
    const fetchAllowance = async () => {
      try {
        const provider = getReadProvider();
        const token = new ethers.Contract(fromInfo.address, ERC20_ABI, provider);
        const a = await token.allowance(address, V3_SWAP_ROUTER);
        setAllowance(BigInt(a.toString()));
      } catch { setAllowance(BigInt(0)); }
    };
    fetchAllowance();
  }, [isConnected, address, fromToken, fromInfo]);

  // ─── V3 Quote Logic ────────────────────────────────────
  const getV3Quote = useCallback(async (amountIn: bigint): Promise<QuoteResult | null> => {
    const provider = getReadProvider();
    const quoter = new ethers.Contract(V3_QUOTER, QUOTER_ABI, provider);
    const tokenIn = resolveAddress(fromToken);
    const tokenOut = resolveAddress(toToken);

    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) return null;

    let bestOut = BigInt(0);
    let bestFee = 0;

    // 1. Try direct single-hop across all fee tiers
    for (const fee of FEE_TIERS) {
      try {
        const result = await quoter.quoteExactInputSingle.staticCall({
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimitX96: BigInt(0),
        });
        const out = BigInt(result.amountOut.toString());
        if (out > bestOut) {
          bestOut = out;
          bestFee = fee;
        }
      } catch {
        // No pool for this fee tier
      }
    }

    if (bestOut > BigInt(0)) {
      const fromSym = fromInfo.isNative ? "BNB" : fromToken;
      const toSym = toInfo.isNative ? "BNB" : toToken;
      return {
        amountOut: bestOut,
        fee: bestFee,
        path: "direct",
        routeLabel: `${fromSym} → ${toSym} (${bestFee / 10000}%)`,
      };
    }

    // 2. Try multi-hop via WBNB if neither token is WBNB
    if (tokenIn.toLowerCase() !== WBNB.toLowerCase() && tokenOut.toLowerCase() !== WBNB.toLowerCase()) {
      for (const fee1 of FEE_TIERS) {
        for (const fee2 of FEE_TIERS) {
          try {
            const path = ethers.solidityPacked(
              ["address", "uint24", "address", "uint24", "address"],
              [tokenIn, fee1, WBNB, fee2, tokenOut]
            );
            const result = await quoter.quoteExactInput.staticCall(path, amountIn);
            const out = BigInt(result.amountOut.toString());
            if (out > bestOut) {
              bestOut = out;
              bestFee = fee1; // store first leg fee
              return {
                amountOut: out,
                fee: fee1,
                path: "multi-hop",
                routeLabel: `${fromToken} → WBNB → ${toToken} (${fee1 / 10000}% + ${fee2 / 10000}%)`,
              };
            }
          } catch {
            // No pool for this combo
          }
        }
      }
    }

    return null;
  }, [fromToken, toToken, fromInfo, toInfo]);

  // ─── Get Quote on Input Change ──────────────────────────
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedOutput("0");
      setMinimumReceived("0");
      setPriceImpact("0");
      setRouteLabel("");
      setNoLiquidity(false);
      setHighImpact(false);
      setBestQuote(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setQuoteLoading(true);
      setNoLiquidity(false);
      setHighImpact(false);
      try {
        const amountIn = ethers.parseUnits(amount, fromInfo.decimals);
        const quote = await getV3Quote(amountIn);

        if (!quote) {
          setNoLiquidity(true);
          setEstimatedOutput("0");
          setMinimumReceived("0");
          setPriceImpact("0");
          setRouteLabel("");
          setBestQuote(null);
          return;
        }

        setBestQuote(quote);
        const outFormatted = ethers.formatUnits(quote.amountOut, toInfo.decimals);
        setEstimatedOutput(parseFloat(outFormatted).toFixed(6));
        setRouteLabel(quote.routeLabel);

        const slip = parseFloat(slippage) / 100;
        const minOut = parseFloat(outFormatted) * (1 - slip);
        setMinimumReceived(minOut.toFixed(6));

        // Price impact estimate (simple: compare input value vs output value)
        const inVal = parseFloat(amount);
        const outVal = parseFloat(outFormatted);
        if (inVal > 0 && outVal > 0) {
          // For same-decimal tokens, rough impact
          const ratio = outVal / inVal;
          // Get a 1-unit quote to establish "spot rate"
          try {
            const oneUnit = ethers.parseUnits("1", fromInfo.decimals);
            const spotQuote = await getV3Quote(oneUnit);
            if (spotQuote) {
              const spotRate = parseFloat(ethers.formatUnits(spotQuote.amountOut, toInfo.decimals));
              const expectedOut = inVal * spotRate;
              const impact = expectedOut > 0 ? ((expectedOut - outVal) / expectedOut) * 100 : 0;
              const impactAbs = Math.abs(impact);
              setPriceImpact(impactAbs < 0.01 ? "<0.01" : impactAbs.toFixed(2));
              setHighImpact(impactAbs > 3);
            } else {
              setPriceImpact(ratio < 1 ? ((1 - ratio) * 100).toFixed(2) : "<0.01");
            }
          } catch {
            setPriceImpact("~");
          }
        }
      } catch (err) {
        console.error("Quote error:", err);
        setNoLiquidity(true);
        setEstimatedOutput("0");
        setMinimumReceived("0");
        setPriceImpact("0");
        setBestQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [amount, fromToken, toToken, slippage, fromInfo, toInfo, getV3Quote]);

  // ─── Approval & Swap ───────────────────────────────────
  const amountBN = amount && parseFloat(amount) > 0 ? ethers.parseUnits(amount, fromInfo.decimals) : BigInt(0);
  const needsApproval = !fromInfo.isNative && amountBN > 0 && allowance < amountBN;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const provider = getWalletProvider();
      if (!provider) throw new Error("No wallet found");
      const signer = await provider.getSigner();
      const token = new ethers.Contract(fromInfo.address, ERC20_ABI, signer);
      const tx = await token.approve(V3_SWAP_ROUTER, ethers.MaxUint256);
      toast({ title: "Approving...", description: "Waiting for confirmation." });
      await tx.wait();
      setAllowance(ethers.MaxUint256);
      toast({ title: "Approved!", description: `${fromToken} approved for swap.` });
    } catch (e: any) {
      console.error("Approval failed:", e);
      toast({ title: "Approval Failed", description: e?.shortMessage || e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0 || !bestQuote) return;
    setLoading(true);
    try {
      const provider = getWalletProvider();
      if (!provider) throw new Error("No wallet found");
      const signer = await provider.getSigner();
      const router = new ethers.Contract(V3_SWAP_ROUTER, ROUTER_ABI, signer);

      const amountIn = ethers.parseUnits(amount, fromInfo.decimals);
      const slip = parseFloat(slippage) / 100;
      const minOut = (bestQuote.amountOut * BigInt(Math.floor((1 - slip) * 10000))) / BigInt(10000);
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const tokenIn = resolveAddress(fromToken);
      const tokenOut = resolveAddress(toToken);

      toast({ title: "Swapping...", description: "Please confirm the transaction." });

      let tx;

      if (bestQuote.path === "direct") {
        if (fromInfo.isNative) {
          // BNB → Token: send value
          tx = await router.exactInputSingle(
            { tokenIn, tokenOut, fee: bestQuote.fee, recipient: address, deadline, amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: BigInt(0) },
            { value: amountIn, gasLimit: 500000 }
          );
        } else if (toInfo.isNative) {
          // Token → BNB: swap to WBNB then unwrap via multicall
          const iface = new ethers.Interface(ROUTER_ABI);
          const swapData = iface.encodeFunctionData("exactInputSingle", [
            { tokenIn, tokenOut: WBNB, fee: bestQuote.fee, recipient: V3_SWAP_ROUTER, deadline, amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: BigInt(0) },
          ]);
          const unwrapData = iface.encodeFunctionData("unwrapWETH9", [minOut, address]);
          tx = await router.multicall([swapData, unwrapData], { gasLimit: 500000 });
        } else {
          // Token → Token
          tx = await router.exactInputSingle(
            { tokenIn, tokenOut, fee: bestQuote.fee, recipient: address, deadline, amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: BigInt(0) },
            { gasLimit: 500000 }
          );
        }
      } else {
        // Multi-hop via WBNB
        // Re-find best fee combo by re-quoting (we stored first leg fee but need both)
        // For simplicity, use the same fee for both legs as found during quoting
        const pathBytes = ethers.solidityPacked(
          ["address", "uint24", "address", "uint24", "address"],
          [tokenIn, bestQuote.fee, WBNB, bestQuote.fee, tokenOut]
        );

        if (fromInfo.isNative) {
          tx = await router.exactInput(
            { path: pathBytes, recipient: address, deadline, amountIn, amountOutMinimum: minOut },
            { value: amountIn, gasLimit: 500000 }
          );
        } else if (toInfo.isNative) {
          const iface = new ethers.Interface(ROUTER_ABI);
          const swapData = iface.encodeFunctionData("exactInput", [
            { path: pathBytes, recipient: V3_SWAP_ROUTER, deadline, amountIn, amountOutMinimum: minOut },
          ]);
          const unwrapData = iface.encodeFunctionData("unwrapWETH9", [minOut, address]);
          tx = await router.multicall([swapData, unwrapData], { gasLimit: 500000 });
        } else {
          tx = await router.exactInput(
            { path: pathBytes, recipient: address, deadline, amountIn, amountOutMinimum: minOut },
            { gasLimit: 500000 }
          );
        }
      }

      await tx.wait();
      toast({ title: "Swap Successful!", description: `Swapped ${amount} ${fromToken} → ${estimatedOutput} ${toToken}` });
      setAmount("");
      setEstimatedOutput("0");
      setMinimumReceived("0");
      setBestQuote(null);

      // Refresh balances
      const rp = getReadProvider();
      if (fromInfo.isNative) {
        const bal = await rp.getBalance(address!);
        setFromBalance(ethers.formatUnits(bal, 18));
      } else {
        const t = new ethers.Contract(fromInfo.address, ERC20_ABI, rp);
        const bal = await t.balanceOf(address);
        setFromBalance(ethers.formatUnits(bal, fromInfo.decimals));
        const a = await t.allowance(address, V3_SWAP_ROUTER);
        setAllowance(BigInt(a.toString()));
      }
      if (toInfo.isNative) {
        const bal = await rp.getBalance(address!);
        setToBalance(ethers.formatUnits(bal, 18));
      } else {
        const t = new ethers.Contract(toInfo.address, ERC20_ABI, rp);
        const bal = await t.balanceOf(address);
        setToBalance(ethers.formatUnits(bal, toInfo.decimals));
      }
    } catch (e: any) {
      console.error("Swap failed:", e);
      toast({ title: "Swap Failed", description: e?.shortMessage || e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    await ensureBscChain();
    const connector = connectors.find((c) => c.id === "injected" || c.id === "io.metamask")
      ?? connectors.find((c) => c.id === "walletConnect")
      ?? connectors[0];
    if (connector) connect({ connector });
  };

  const swapDisabled = loading || !amount || parseFloat(amount) <= 0 || estimatedOutput === "0" || noLiquidity;

  // ─── Render ─────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md border-border/40 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-bold">Buy & Sell</CardTitle>
            <button
              onClick={() => setShowSlippage(!showSlippage)}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* BSC warning */}
            {isConnected && !isBSC && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Please switch to BSC Mainnet
              </div>
            )}

            {/* Slippage */}
            {showSlippage && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 space-y-2">
                <Label className="text-xs text-muted-foreground">Slippage Tolerance</Label>
                <div className="flex items-center gap-2">
                  {["0.1", "0.5", "1.0"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        slippage === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      type="number"
                      value={slippage}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0.1 && v <= 5) setSlippage(e.target.value);
                        else if (e.target.value === "") setSlippage("");
                      }}
                      onBlur={() => { if (!slippage || parseFloat(slippage) < 0.1) setSlippage("0.5"); }}
                      className="h-8 text-xs text-center bg-secondary/50 border-border/30"
                      min={0.1}
                      max={5}
                      step={0.1}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* FROM */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">From</Label>
                <span className="text-xs text-muted-foreground">
                  Balance: {parseFloat(fromBalance).toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Select value={fromToken} onValueChange={handleFromChange}>
                  <SelectTrigger className="w-[120px] h-10 bg-secondary/50 border-border/30 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BNB">BNB</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="FBMX">FBMX</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 text-right text-lg font-semibold bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {address && parseFloat(fromBalance) > 0 && (
                <button onClick={() => setAmount(fromBalance)} className="text-xs text-primary hover:underline">
                  Max
                </button>
              )}
            </div>

            {/* Flip */}
            <div className="flex justify-center -my-1">
              <button
                onClick={handleFlip}
                className="p-2 rounded-full bg-secondary/50 border border-border/30 hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* TO */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">To</Label>
                {address && (
                  <span className="text-xs text-muted-foreground">
                    Balance: {parseFloat(toBalance).toFixed(4)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Select value={toToken} onValueChange={handleToChange}>
                  <SelectTrigger className="w-[120px] h-10 bg-secondary/50 border-border/30 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BNB">BNB</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="FBMX">FBMX</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 text-right text-lg font-semibold text-foreground pr-3 tabular-nums">
                  {quoteLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin ml-auto text-muted-foreground" />
                  ) : (
                    estimatedOutput
                  )}
                </div>
              </div>
            </div>

            {/* Insufficient liquidity */}
            {noLiquidity && amount && parseFloat(amount) > 0 && !quoteLoading && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Insufficient Liquidity for this trade
              </div>
            )}

            {/* High price impact warning */}
            {highImpact && !noLiquidity && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                High price impact! Consider a smaller amount.
              </div>
            )}

            {/* Route info */}
            {routeLabel && estimatedOutput !== "0" && !noLiquidity && (
              <div className="text-xs text-muted-foreground text-center">
                Route: {routeLabel}
              </div>
            )}

            {/* Trade info */}
            {amount && parseFloat(amount) > 0 && estimatedOutput !== "0" && !noLiquidity && (
              <div className="space-y-1.5 p-3 rounded-lg bg-secondary/20 border border-border/20 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Estimated Output</span>
                  <span className="text-foreground font-medium">{estimatedOutput} {toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Received</span>
                  <span className="text-foreground font-medium">{minimumReceived} {toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price Impact</span>
                  <span className={`font-medium ${parseFloat(priceImpact) > 5 ? "text-destructive" : parseFloat(priceImpact) > 3 ? "text-yellow-500" : "text-foreground"}`}>
                    {priceImpact}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage</span>
                  <span className="text-foreground font-medium">{slippage}%</span>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            ) : !isBSC ? (
              <Button disabled className="w-full h-12 text-base font-semibold opacity-50">
                Switch to BSC Mainnet
              </Button>
            ) : needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Approving...</>
                ) : (
                  `Approve ${fromToken}`
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSwap}
                disabled={swapDisabled}
                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Swapping...</>
                ) : noLiquidity ? (
                  "Insufficient Liquidity"
                ) : (
                  "Swap"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
