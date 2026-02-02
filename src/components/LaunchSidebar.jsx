import { useLocation, useNavigate } from "react-router";
import {
  MessageSquare,
  PieChart,
  TrendingUp,
  Coins,
  History as HistoryIcon,
} from "lucide-react";

const tabs = [
  { id: "chat", label: "Chat", path: "/", Icon: MessageSquare },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", Icon: PieChart },
  { id: "trading", label: "Trading", path: "/trading", Icon: TrendingUp },
  { id: "staking", label: "Staking", path: "/staking", Icon: Coins },
  { id: "history", label: "History", path: "/history", Icon: HistoryIcon },
];

const isActivePath = (pathname, tabPath) => {
  if (tabPath === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(tabPath);
};

export function LaunchSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      <aside className="hidden md:block pt-20 h-full fixed top-20 bottom-0 left-0 w-[276px] border-r border-gray-200/50 bg-pattern/95">
        <div className="p-6 space-y-2">
          {tabs.map(({ id, label, path, Icon }) => {
            const isActive = isActivePath(pathname, path);
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-700 hover:bg-black/5 hover:shadow-sm"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} />
                {label}
              </button>
            );
          })}
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 bg-pattern/95 backdrop-blur-lg border-t border-gray-200/50">
        <div className="glass-card px-2 py-3">
          <div className="flex items-center justify-around">
            {tabs.map(({ id, label, path, Icon }) => {
              const isActive = isActivePath(pathname, path);
              return (
                <button
                  key={id}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-600 hover:bg-black/5"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
