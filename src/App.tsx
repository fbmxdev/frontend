import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Deposit from "./pages/Deposit";
import Rewards from "./pages/Rewards";
import Withdraw from "./pages/Withdraw";
import Network from "./pages/Network";
import Help from "./pages/Help";
import Swap from "./pages/Swap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/network" element={<Network />} />
            <Route path="/help" element={<Help />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
