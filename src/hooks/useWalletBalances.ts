import { useBalance, useReadContract } from "wagmi";

// BEP-20 USDT Contract Address on BSC
const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as const;

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useBNBBalance(address: `0x${string}` | undefined) {
  return useBalance({
    address,
    query: { enabled: !!address },
  });
}

export function useUSDTBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: USDT_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// BEP-20 FBMX Token Contract Address on BSC
const FBMX_CONTRACT_ADDRESS = "0x5951F937ff590239D38c10e871F9982359E56C36" as const;

export function useFBMXBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: FBMX_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}