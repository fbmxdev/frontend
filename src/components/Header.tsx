import { Shield, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { formatAddress } from "@/config/contract";
import { useState } from "react";
import { ensureBscChain } from "@/config/wagmi";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deposit", label: "Deposit" },
  { href: "/rewards", label: "Rewards" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/network", label: "Network" },
  { href: "/swap", label: "Buy & Sell" },
  { href: "/help", label: "Help" },
];

export function Header() {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleConnect = async () => {
    await ensureBscChain();
    // Prefer injected (MetaMask, Trust Wallet, etc.), fall back to WalletConnect
    const connector = connectors.find((c) => c.id === "injected" || c.id === "io.metamask") 
      ?? connectors.find((c) => c.id === "walletConnect")
      ?? connectors[0];
    if (connector) connect({ connector });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="font-display text-base font-bold tracking-wider text-foreground">
              FORTRESS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
                  location.pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Button */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Button
                variant="outline"
                onClick={() => disconnect()}
                className="hidden sm:flex border-primary/30 text-primary hover:bg-primary/10 text-sm h-9"
              >
                {formatAddress(address || "")}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isPending}
                className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90 text-sm h-9"
              >
                {isPending ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-foreground">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-3 border-t border-border/30">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${
                    location.pathname === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isConnected ? (
                <Button variant="outline" onClick={() => { disconnect(); setMobileMenuOpen(false); }} className="mt-2 border-primary/30 text-primary hover:bg-primary/10 text-sm">
                  {formatAddress(address || "")}
                </Button>
              ) : (
                <Button onClick={() => { handleConnect(); setMobileMenuOpen(false); }} disabled={isPending} className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                  {isPending ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
