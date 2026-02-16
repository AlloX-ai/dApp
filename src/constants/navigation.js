import {
  MessageSquare,
  PieChart,
  TrendingUp,
  Coins,
  History as HistoryIcon,
} from "lucide-react";

export const navigationTabs = [
  { id: "chat", label: "Chat", path: "/", Icon: MessageSquare },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", Icon: PieChart },
  { id: "trading", label: "Trending", path: "/trending", Icon: TrendingUp },
  { id: "staking", label: "Staking", path: "/staking", Icon: Coins },
  { id: "history", label: "History", path: "/history", Icon: HistoryIcon },
];

export const isActivePath = (pathname, tabPath) => {
  if (tabPath === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(tabPath);
};
