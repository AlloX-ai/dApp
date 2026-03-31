import {
  MessageSquare,
  PieChart,
  Flame,
  TrendingUp,
  Coins,
  History as HistoryIcon,
  TrendingDown,
  Users,
} from "lucide-react";

export const navigationTabs = [
  { id: "chat", label: "Chat", path: "/", Icon: MessageSquare },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", Icon: PieChart },
  { id: "season1", label: "Spring Series S3", path: "/spring-series", Icon: Flame },
  { id: "rewards", label: "Rewards", path: "/rewards", Icon: Coins },
  { id: "referrals", label: "Referrals", path: "/referrals", Icon: Users },

  { id: "trading", label: "Trending", path: "/trending", Icon: TrendingUp },
  { id: "staking", label: "Staking", path: "/staking", Icon: TrendingDown },
  { id: "history", label: "History", path: "/history", Icon: HistoryIcon },
];

export const isActivePath = (pathname, tabPath) => {
  if (tabPath === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(tabPath);
};
