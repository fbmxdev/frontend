import { Shield, ExternalLink, Copy } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/config/contract";
import { toast } from "sonner";

export function Footer() {
  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    toast.success("Contract address copied!");
  };

  return (
    <footer className="border-t border-border/30 bg-card/50 backdrop-blur-xl mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-xs font-semibold tracking-wider text-foreground">
              FORTRESS INTERNATIONAL
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <button onClick={copyAddress} className="flex items-center gap-2 hover:text-primary transition-colors text-xs">
              <Copy className="h-3.5 w-3.5" /> Copy Contract
            </button>
            <a href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> View on BscScan
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2025 Fortress International. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
