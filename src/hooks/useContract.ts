import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { parseEther } from "viem";
import { bsc } from "wagmi/chains";

export function useContractStats() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getContractStats",
  });
}

// affiliates mapping: (parent, agent, totalDirect, level)
export function useAffiliateData(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "affiliates",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// wallets mapping: (balance, capping, totalIncome, coolDown)
export function useWalletsMapping(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "wallets",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// passives mapping: (totalPassive, totalEquity, coolDown)
export function usePassivesMapping(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "passives",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function usePassiveReward(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getPassiveReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useUpgradeAmount(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getUpgradeAmount",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// getEquity now takes (totalEquity, totalIncome) as uint256
export function useEquity(totalEquity: bigint, totalIncome: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getEquity",
    args: [totalEquity, totalIncome],
    query: { enabled: totalEquity > BigInt(0) },
  });
}

// getPercentage now takes (passiveEquity, referralIncome) as uint256
export function usePercentage(passiveEquity: bigint, referralIncome: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getPercentage",
    args: [passiveEquity, referralIncome],
    query: { enabled: passiveEquity > BigInt(0) },
  });
}

// binaries mapping: (parent, leftAddress, rightAddress, leftVolume, rightVolume, coolDown)
export function useBinaryData(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "binaries",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// getChildren: (address, startIndex, count) - no bool param
export function useChildren(address: `0x${string}` | undefined, startIndex: number, count: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getChildren",
    args: address ? [address, BigInt(startIndex), BigInt(count)] : undefined,
    query: { enabled: !!address },
  });
}

export function useWithdrawAmount(level: number, amount: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getWithdrawAmount",
    args: [level, parseEther(amount.toString())],
    query: { enabled: level > 0 && amount > 0 },
  });
}

// register now takes (referrer, group)
export function useRegister() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (referrer: `0x${string}`, group: number = 0) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "register",
      args: [referrer, group],
      chain: bsc,
      account: address,
    });
  };

  return { register, isPending, isConfirming, isSuccess, error, hash };
}

export function useActivateRank() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const activateRank = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "activateRank",
      chain: bsc,
      account: address,
    });
  };

  return { activateRank, isPending, isConfirming, isSuccess, error, hash };
}

// depositBalance → depositUSDT in new contract
export function useDepositBalance() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const depositBalance = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "depositUSDT",
      chain: bsc,
      account: address,
    });
  };

  return { depositBalance, isPending, isConfirming, isSuccess, error, hash };
}

// collectPassive → collectPassiveRewards in new contract
export function useCollectPassive() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const collectPassive = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "collectPassiveRewards",
      chain: bsc,
      account: address,
    });
  };

  return { collectPassive, isPending, isConfirming, isSuccess, error, hash };
}

export function useWithdrawBalance() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdrawBalance = (amount: bigint) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdrawBalance",
      args: [amount],
      chain: bsc,
      account: address,
    });
  };

  return { withdrawBalance, isPending, isConfirming, isSuccess, error, hash };
}

export function useCollectBinaryRewards() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const collectBinaryRewards = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "collectBinaryRewards",
      chain: bsc,
      account: address,
    });
  };

  return { collectBinaryRewards, isPending, isConfirming, isSuccess, error, hash };
}

export function useDepositFBMX() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const depositFBMX = (amount: bigint) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "depositFBMX",
      args: [amount],
      chain: bsc,
      account: address,
    });
  };

  return { depositFBMX, isPending, isConfirming, isSuccess, error, hash };
}
