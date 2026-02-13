import { useLocation, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { navigationTabs, isActivePath } from "../constants/navigation";
import {
  setCurrentMessages,
  setViewingHistorySessionId,
} from "../redux/slices/chatSlice";

export function LaunchSidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const currentMessages = useSelector((state) => state.chat.currentMessages);
  const hasChatContent = currentMessages?.length > 0;

  const handleNewChat = (e) => {
    e.stopPropagation();
    dispatch(setViewingHistorySessionId(null));
    dispatch(setCurrentMessages([]));
    navigate("/");
  };

  return (
    <>
      <aside className="hidden md:block h-full fixed top-20 bottom-0 left-0 w-[276px] border-r border-gray-200/50 bg-pattern/95">
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
      </aside>
    </>
  );
}
