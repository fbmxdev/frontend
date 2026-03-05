import { http, createConfig } from "wagmi";
import { bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = "3fbb6bba6f1de962d911bb5b5c9dba88";

export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId, showQrModal: true }),
  ],
  transports: {
    [bsc.id]: http("https://bsc-dataseed.binance.org/"),
  },
});

/**
 * Attempts to switch the user's wallet to BSC (chainId 0x38).
 * Adds the chain if it's not yet configured in the wallet.
 */
export async function ensureBscChain() {
  const ethereum = (window as any).ethereum;
  if (!ethereum) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }],
    });
  } catch (switchError: any) {
    // 4902 = chain not added yet
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x38",
              chainName: "BNB Smart Chain",
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              blockExplorerUrls: ["https://bscscan.com"],
            },
          ],
        });
      } catch {
        console.error("Failed to add BSC chain");
      }
    }
  }
}
