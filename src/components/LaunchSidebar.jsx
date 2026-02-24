import { useLocation, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { navigationTabs, isActivePath } from "../constants/navigation";
import { useCheckin } from "../hooks/useCheckin";
import { openCheckinModal } from "../redux/slices/walletSlice";
import {
  setCurrentMessages,
  setViewingHistorySessionId,
} from "../redux/slices/chatSlice";

export function LaunchSidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isConnected = useSelector((state) => state.wallet.isConnected);
  const currentMessages = useSelector((state) => state.chat.currentMessages);
  const hasChatContent = currentMessages?.length > 0;

  const { checkedInToday } = useCheckin();

  const handleNewChat = (e) => {
    e.stopPropagation();
    dispatch(setViewingHistorySessionId(null));
    dispatch(setCurrentMessages([]));
    navigate("/");
  };

  return (
    <>
      <aside className="hidden md:block h-full fixed top-20 bottom-0 left-0 w-69 border-r border-gray-200/50 bg-pattern/95">
        <div className="p-6 space-y-2">
          {navigationTabs.map(({ id, label, path, Icon }) => {
            const isActive = isActivePath(pathname, path);
            const isChat = id === "chat";
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
                <Icon size={20} className="shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {isChat && hasChatContent && (
                  <div
                    type="button"
                    onClick={handleNewChat}
                    className={`p-1 rounded-md shrink-0 transition-colors ${
                      isActive
                        ? "hover:bg-white/20 text-white"
                        : "hover:bg-black/10 text-gray-600"
                    }`}
                    title="Start new chat"
                    aria-label="Start new chat"
                  >
                    <Plus size={18} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {isConnected && (
          <div className="px-4 pb-4 mt-auto space-y-3">
            {/* <div className="glass-card px-4 py-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-600">
                Total points
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-amber-600">
                <Gem className="size-4 text-amber-500" />
                {totalPoints.toLocaleString()}
              </span>
            </div> */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl p-4 shadow-lg">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>

              <div className="relative z-10">
                <div className="text-white/90 text-xs font-semibold mb-1">
                  Daily Bonus
                </div>
                <div className="text-white font-bold text-sm mb-3">
                  Get up to 5,000 points
                </div>
                <button
                  onClick={() => dispatch(openCheckinModal())}
                  disabled={!isConnected}
                  className="w-full bg-white text-purple-600 font-semibold text-sm py-2 px-4 rounded-xl hover:bg-white/90 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkedInToday ? "Already Claimed" : "Claim"}
                  {/* Coming Soon */}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
