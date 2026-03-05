import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Globe, CreditCard, Coins, TrendingUp, Users, Trophy, Wallet, Shield, Earth, Scale, Wrench, Rocket, AlertTriangle } from "lucide-react";

const helpSections = [
  {
    id: "general", icon: Globe, title: "General Information",
    content: [
      { q: "What is Fortress International?", a: "A decentralized financial ecosystem on Binance Smart Chain with fully automated smart contracts and transparent earning opportunities." },
      { q: "Who created Fortress?", a: "An anonymous collective of blockchain developers; no individual or organization controls the platform." },
      { q: "How does Fortress operate?", a: "Through fully renounced smart contracts — immutable, automatic, and transparent." },
      { q: "Is there an owner?", a: "No central operator. Community governance via DAO." },
      { q: "Why are founders anonymous?", a: "To emphasize code-based governance, not personalities." },
      { q: "Where is Fortress based?", a: "No physical office — global access via internet and crypto wallet." },
      { q: "Blockchain used:", a: "Binance Smart Chain (BEP-20) for speed, low fees, and ecosystem support." },
      { q: "Unique features:", a: "Fully renounced contracts, locked deposits, max 300% earnings, anonymous team." },
    ],
  },
  {
    id: "account", icon: CreditCard, title: "Account & Registration",
    content: [
      { q: "How to create an account?", a: "Connect any BSC wallet (MetaMask, Trust Wallet, TokenPocket, SafePal, Math Wallet). No email/password required." },
      { q: "Is KYC required?", a: "No KYC needed. Wallet connection serves as your ID." },
      { q: "Age requirement?", a: "Users must be of legal age in their jurisdiction." },
    ],
  },
  {
    id: "deposits", icon: Coins, title: "Liquidity Deposits & Levels",
    content: [
      { q: "How many levels are there?", a: "15 levels: 5 USDT → 81,920 USDT. Max earnings = 300% per level." },
      { q: "Level breakdown:", a: "Level 1: 5 USDT (Max 15 USDT), Level 2: 10 USDT (Max 30 USDT), Level 3: 20 USDT (Max 60 USDT)... up to Level 15: 81,920 USDT (Max 245,760 USDT)" },
      { q: "Can I withdraw my deposit?", a: "Deposits are permanently locked; only earnings can be withdrawn." },
      { q: "Can I have multiple deposits?", a: "Multiple deposits and upgrades allowed anytime." },
      { q: "What currency is accepted?", a: "Only USDT (BEP-20) accepted." },
    ],
  },
  {
    id: "earning", icon: TrendingUp, title: "Earning System",
    content: [
      { q: "What are the income streams?", a: "Three income streams: Daily Passive Income (1-5% per day), Direct Referral Bonus (10% instantly), Pairing Bonus (10% to qualified uplines)." },
      { q: "What is the maximum earning?", a: "Max earning: 300% per level." },
      { q: "How do I track earnings?", a: "Earnings are visible in real-time on the Dashboard." },
    ],
  },
  {
    id: "referral", icon: Users, title: "Referral System",
    content: [
      { q: "How does the referral bonus work?", a: "Direct Referral Bonus: 10% instantly when someone registers using your wallet." },
      { q: "Is there a limit?", a: "No limit to referrals; bonuses repeat on upgrades." },
      { q: "What is my referral ID?", a: "Your wallet address = referral ID." },
    ],
  },
  {
    id: "binary", icon: Trophy, title: "Binary / Pairing Bonus",
    content: [
      { q: "What is the pairing bonus?", a: "10% bonus distributed to uplines when a member activates or upgrades in their weak leg." },
      { q: "Who can generate pairing bonus?", a: "All members can generate pairing bonus." },
      { q: "Who can receive pairing bonus?", a: "Only Level 2+ uplines receive pairing bonus. Top 3 qualified uplines get credit." },
      { q: "What about Level 1?", a: "Level 1 members can generate but not receive bonuses." },
      { q: "Does volume reset?", a: "Volume accumulates permanently; no reset." },
    ],
  },
  {
    id: "withdrawals", icon: Wallet, title: "Withdrawals",
    content: [
      { q: "What denominations are available?", a: "Withdrawable denominations: $15, $50, $100, $500, $1,000 USDT (depending on level)" },
      { q: "How often can I withdraw?", a: "Frequency: once per 24 hours; instant on BSC." },
      { q: "Are there any fees?", a: "No fees except BSC gas." },
      { q: "What happens after 300%?", a: "After 300% earnings, start new cycle or upgrade." },
    ],
  },
  {
    id: "security", icon: Shield, title: "Security",
    content: [
      { q: "Is the contract secure?", a: "Smart contracts fully renounced & immutable." },
      { q: "Do you hold my keys?", a: "Non-custodial — we never hold your keys." },
      { q: "Can I verify the contract?", a: "Open-source and verifiable on BscScan." },
      { q: "Are there admin functions?", a: "No admin functions or backdoors." },
    ],
  },
  {
    id: "accessibility", icon: Earth, title: "Accessibility",
    content: [
      { q: "Where is Fortress available?", a: "Global access wherever BSC is available." },
      { q: "What languages are supported?", a: "Currently English only." },
      { q: "Is it mobile friendly?", a: "Fully mobile-responsive." },
    ],
  },
  {
    id: "legal", icon: Scale, title: "Legal & Compliance",
    content: [
      { q: "Is Fortress legal?", a: "Legal status varies by jurisdiction." },
      { q: "Are earnings taxable?", a: "Crypto earnings may be taxable; consult local laws." },
      { q: "How is compliance handled?", a: "Compliance based on transparency, user education, and DAO governance." },
    ],
  },
  {
    id: "support", icon: Wrench, title: "Technical Support",
    content: [
      { q: "Where can I get support?", a: "Support via: Community Telegram, Documentation portal, BscScan transaction verification." },
      { q: "Is there an official support team?", a: "No official support team — decentralized system." },
      { q: "What if I get an error?", a: "Errors? Check BNB for gas, BSC network, browser cache, wallet, BscScan verification." },
    ],
  },
  {
    id: "future", icon: Rocket, title: "Future Development",
    content: [
      { q: "How is development decided?", a: "Community-driven via DAO voting." },
      { q: "What features are planned?", a: "Planned features: native token, multi-chain, governance tools, more earning streams." },
    ],
  },
  {
    id: "risk", icon: AlertTriangle, title: "Risk Disclaimer",
    content: [
      { q: "Important risks:", a: "No guarantees — past performance ≠ future results. Deposits are locked. Smart contract risk exists. Crypto market volatility. Regulatory uncertainty. Personal responsibility — invest only what you can afford to lose." },
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState("");

  const filteredSections = helpSections.filter((section) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.content.some(
        (item) =>
          item.q.toLowerCase().includes(searchLower) ||
          item.a.toLowerCase().includes(searchLower)
      )
    );
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="section-title text-[1.5rem]">Help Center</h1>
          <p className="label-text mt-1">Find answers to frequently asked questions</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search Help..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border/40 focus:border-primary"
          />
        </div>

        {/* Accordion FAQ */}
        <div className="space-y-3">
          {filteredSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <div key={section.id} className="glass-card overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value={section.id} className="border-none">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-[10px] bg-primary/10">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <span className="section-title text-base">
                          {section.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                      <div className="space-y-3 pt-2">
                        {section.content.map((item, idx) => (
                          <div key={idx} className="subcard">
                            <p className="text-sm font-medium text-foreground mb-1">{item.q}</p>
                            <p className="label-text">{item.a}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          })}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="label-text">No results found for "{search}"</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
