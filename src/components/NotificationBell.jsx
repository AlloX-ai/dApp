import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, TrendingDown, TrendingUp } from "lucide-react";
import OutsideClickHandler from "react-outside-click-handler";
import { notificationsApi } from "../utils/alertsApi";
import { useAuth } from "../hooks/useAuth";

const POLL_MS = 60000;

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ isConnected }) {
  const { ensureAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    setErrorMessage("");
    try {
      await ensureAuthenticated();
      const data = await notificationsApi.getNotifications({
        limit: 20,
        offset: 0,
        unreadOnly: true,
      });
      setNotifications(
        Array.isArray(data?.notifications) ? data.notifications : [],
      );
      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (error) {
      if (error?.status === 401) logout();
      setErrorMessage(error?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [ensureAuthenticated, isConnected, logout]);

  useEffect(() => {
    loadNotifications();
    if (!isConnected) return;
    const id = setInterval(loadNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [isConnected, loadNotifications]);

  const handleRead = async (id) => {
    try {
      await ensureAuthenticated();
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.filter((n) => n?._id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      if (error?.status === 401) logout();
    }
  };

  const handleMarkAll = async () => {
    try {
      await ensureAuthenticated();
      await notificationsApi.markAllRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      if (error?.status === 401) logout();
    }
  };

  const badgeCount = useMemo(() => Math.max(0, unreadCount), [unreadCount]);

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="bg-white rounded-full px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors"
        aria-label="Open notifications"
      >
        <Bell className="size-4 text-gray-700" />
        {badgeCount > 0 && (
          <span className="min-w-5 h-5 px-1 text-xs rounded-full bg-red-500 text-white font-semibold inline-flex items-center justify-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
      <OutsideClickHandler onOutsideClick={() => setOpen(false)}>
        {open && (
          <div className="absolute -right-50 top-10 mt-2 w-[360px] max-w-[90vw] bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-50">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={notifications.length === 0}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-2">
              {loading && (
                <div className="text-sm text-gray-500 px-2 py-3">
                  Loading...
                </div>
              )}
              {!loading && errorMessage && (
                <div className="text-sm text-red-600 px-2 py-3">
                  {errorMessage}
                </div>
              )}
              {!loading && !errorMessage && notifications.length === 0 && (
                <div className="text-sm text-gray-500 px-2 py-3">
                  No unread notifications.
                </div>
              )}

              {!loading &&
                notifications.map((item) => {
                  const positive =
                    String(item?.direction || "").toUpperCase() !== "DOWN";
                  return (
                    <button
                      key={item?._id}
                      type="button"
                      onClick={() => handleRead(item?._id)}
                      className="w-full text-left px-2 py-2 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100"
                    >
                      <div className="flex items-start gap-2">
                        {positive ? (
                          <TrendingUp className="size-4 mt-0.5 text-green-600 shrink-0" />
                        ) : (
                          <TrendingDown className="size-4 mt-0.5 text-red-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            {item?.message || "Portfolio update"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(item?.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </OutsideClickHandler>
    </div>
  );
}
