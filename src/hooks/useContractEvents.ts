import { useEffect, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDT_ADDRESS, USDT_ABI, formatAddress } from '@/config/contract';

export interface TransactionEvent {
  id: string;
  type: 'register' | 'approve' | 'deposit' | 'withdraw' | 'passive';
  address: string;
  message: string;
  timestamp: number;
}

const MAX_EVENTS = 50;

export function useContractEvents() {
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const publicClient = usePublicClient();

  const addEvent = useCallback((event: Omit<TransactionEvent, 'id' | 'timestamp'>) => {
    const newEvent: TransactionEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    setEvents(prev => {
      const updated = [newEvent, ...prev].slice(0, MAX_EVENTS);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!publicClient) return;

    const unwatchFns: (() => void)[] = [];

    // Watch AccountRegistered (new registration)
    const unwatchRegistered = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      eventName: 'AccountRegistered',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const user = (log as any).args?.user as string;
          if (user) {
            addEvent({
              type: 'register',
              address: user,
              message: `${formatAddress(user)} registered account`,
            });
          }
        });
      },
    });
    unwatchFns.push(unwatchRegistered);

    // Watch AccountActivated (level up)
    const unwatchActivated = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      eventName: 'AccountActivated',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const user = (log as any).args?.user as string;
          if (user) {
            addEvent({
              type: 'deposit',
              address: user,
              message: `${formatAddress(user)} activated a new level`,
            });
          }
        });
      },
    });
    unwatchFns.push(unwatchActivated);

    // Watch DepositBalance
    const unwatchDeposit = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      eventName: 'DepositBalance',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const from = (log as any).args?.from as string;
          if (from) {
            addEvent({
              type: 'deposit',
              address: from,
              message: `${formatAddress(from)} completed a deposit`,
            });
          }
        });
      },
    });
    unwatchFns.push(unwatchDeposit);

    // Watch WithdrawBalance
    const unwatchWithdraw = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      eventName: 'WithdrawBalance',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const from = (log as any).args?.from as string;
          if (from) {
            addEvent({
              type: 'withdraw',
              address: from,
              message: `${formatAddress(from)} completed a withdrawal`,
            });
          }
        });
      },
    });
    unwatchFns.push(unwatchWithdraw);

    // Watch Rewards (Passive collection)
    const unwatchRewards = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      eventName: 'Rewards',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const to = (log as any).args?.to as string;
          const rewardsName = (log as any).args?.rewardsName as string;
          if (to && rewardsName?.toLowerCase().includes('passive')) {
            addEvent({
              type: 'passive',
              address: to,
              message: `${formatAddress(to)} collected passive rewards`,
            });
          }
        });
      },
    });
    unwatchFns.push(unwatchRewards);

    // Watch USDT Approval
    const unwatchApproval = publicClient.watchContractEvent({
      address: USDT_ADDRESS as `0x${string}`,
      abi: USDT_ABI,
      eventName: 'Approval',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const owner = (log as any).args?.owner as string;
          const spender = (log as any).args?.spender as string;
          // Only show approvals to our contract
          if (owner && spender?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            addEvent({
              type: 'approve',
              address: owner,
              message: `${formatAddress(owner)} approved USDT`,
            });
          }
        });
      },
    });
    unwatchFns.push(unwatchApproval);

    return () => {
      unwatchFns.forEach(fn => fn());
    };
  }, [publicClient, addEvent]);

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { events, removeEvent };
}
