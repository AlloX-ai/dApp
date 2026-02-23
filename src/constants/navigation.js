import {
  MessageSquare,
  PieChart,
  Flame,
  TrendingUp,
  Coins,
  History as HistoryIcon,
  TrendingDown
} from "lucide-react";

export const navigationTabs = [
  { id: "chat", label: "Chat", path: "/", Icon: MessageSquare },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", Icon: PieChart },
  { id: "season1", label: "Season 1", path: "/season1", Icon: Flame },
  { id: "points", label: "Points", path: "/points", Icon: Coins },
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
