import { useLocation, useNavigate } from "react-router";
import { navigationTabs, isActivePath } from "../constants/navigation";

export function LaunchSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      <aside className="hidden md:block h-full fixed top-20 bottom-0 left-0 w-[276px] border-r border-gray-200/50 bg-pattern/95">
        <div className="p-6 space-y-2">
          {navigationTabs.map(({ id, label, path, Icon }) => {
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
    </>
  );
}
