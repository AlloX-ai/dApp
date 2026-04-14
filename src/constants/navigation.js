import {
  MessageSquare,
  PieChart,
  Flame,
  TrendingUp,
  Coins,
  History as HistoryIcon,
  TrendingDown,
  Users,
  Trophy,
  Eye,
  Briefcase,
} from "lucide-react";

export const navigationTabs = [
  { id: "build-portfolio", label: "Build Portfolio", path: "/", Icon: MessageSquare },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", Icon: PieChart },
  { id: "campaigns", label: "Campaigns", path: "/campaigns", Icon: Flame },
  { id: "watchlist", label: "Watchlist", path: "/watchlist", Icon: Eye },
  { id: "rewards", label: "Rewards", path: "/rewards", Icon: Coins },
  { id: "referrals", label: "Referrals", path: "/referrals", Icon: Users },

  { id: "trading", label: "Trending", path: "/trending", Icon: TrendingUp },
  { id: "topportfolio", label: "Top Portfolios", path: "/top-portfolios", Icon: Trophy },

  { id: "staking", label: "Staking", path: "/staking", Icon: TrendingDown },
  { id: "history", label: "History", path: "/history", Icon: HistoryIcon },
];

/** Sidebar: "Portfolios" trigger + sub-routes (see LaunchSidebar). */
export const portfolioSidebarNav = {
  label: "Portfolios",
  Icon: Briefcase,
  items: [
    {
      id: "portfolio",
      label: "My Portfolio",
      path: "/portfolio",
      Icon: PieChart,
    },
    {
      id: "topportfolio",
      label: "Top Portfolios",
      path: "/top-portfolios",
      Icon: Trophy,
    },
    {
      id: "watchlist",
      label: "Watchlist",
      path: "/watchlist",
      Icon: Eye,
    },
  ],
};

export const portfolioSidebarNavIds = new Set([
  "portfolio",
  "watchlist",
  "topportfolio",
]);

export const isActivePath = (pathname, tabPath) => {
  if (tabPath === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(tabPath);
};

export const isPortfolioSidebarNavActive = (pathname) =>
  portfolioSidebarNav.items.some((i) => isActivePath(pathname, i.path));
