import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MessageSquare, Trash2, Pencil, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  setChatSessions,
  setChatSessionTitle,
  setCurrentMessages,
  setViewingHistorySessionId,
} from "../redux/slices/chatSlice";
import { apiCall } from "../utils/api";

function formatSessionDate(createdAt) {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday)
    return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (isYesterday)
    return `Yesterday, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const chatSessions = useSelector((state) => state.chat.chatSessions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall("/chat/history");
      const sessions = Array.isArray(data) ? data : (data?.sessions ?? []);
      dispatch(
        setChatSessions(
          sessions.map((s) => ({
            id: s.id,
            title: s.title ?? "Untitled",
            date: formatSessionDate(s.createdAt ?? s.updatedAt ?? s.date),
            createdAt: s.createdAt,
          })),
        ),
      );
    } catch (err) {
      setError(err?.message ?? "Failed to load chat history");
      if (err?.status === 401) dispatch(setChatSessions([]));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleLoadChat = useCallback(
    async (session) => {
      try {
        const data = await apiCall(`/chat/history/${session.id}`);
        const messages = data?.messages ?? [];
        dispatch(setCurrentMessages(Array.isArray(messages) ? messages : []));
        dispatch(setViewingHistorySessionId(session.id));
        navigate("/");
      } catch (err) {
        setError(err?.message ?? "Failed to load chat");
      }
    },
    [dispatch, navigate],
  );

  const handleStartRename = (session, e) => {
    e?.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = useCallback(
    async (sessionId) => {
      if (editTitle.trim() === "") {
        setEditingId(null);
        return;
      }
      try {
        await apiCall(`/chat/history/${sessionId}/title`, {
          method: "PATCH",
          body: JSON.stringify({ title: editTitle.trim() }),
        });
        dispatch(
          setChatSessionTitle({ id: sessionId, title: editTitle.trim() }),
        );
        setEditingId(null);
        setEditTitle("");
      } catch (err) {
        setError(err?.message ?? "Failed to rename");
      }
    },
    [editTitle, dispatch],
  );

  const handleDeleteChat = useCallback(
    async (sessionId, event) => {
      event?.stopPropagation();
      setDeletingId(sessionId);
      try {
        await apiCall(`/chat/history/${sessionId}`, { method: "DELETE" });
        dispatch(
          setChatSessions(chatSessions.filter((s) => s.id !== sessionId)),
        );
      } catch (err) {
        setError(err?.message ?? "Failed to delete chat");
      } finally {
        setDeletingId(null);
      }
    },
    [chatSessions, dispatch],
  );

  const handleDeleteAll = useCallback(async () => {
    setDeletingAll(true);
    setError(null);
    try {
      await apiCall("/chat/history", { method: "DELETE" });
      dispatch(setChatSessions([]));
      setDeleteAllConfirm(false);
    } catch (err) {
      setError(err?.message ?? "Failed to delete all chats");
    } finally {
      setDeletingAll(false);
    }
  }, [dispatch]);

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Chat History</h2>
        {chatSessions.length > 0 && (
          <button
            type="button"
            onClick={() => setDeleteAllConfirm(true)}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete all
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {deleteAllConfirm && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <span className="text-sm text-amber-800">
            Delete all chat sessions? This cannot be undone.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDeleteAllConfirm(false)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-amber-200 hover:bg-amber-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
            >
              {deletingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Delete all
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : chatSessions.length === 0 ? (
        <p className="text-gray-500 py-8">No chat history yet.</p>
      ) : (
        <div className="space-y-3">
          {chatSessions.map((session) => (
            <div
              key={session.id}
              className="glass-card p-6 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 transition-all duration-200 group relative"
            >
              <button
                type="button"
                onClick={() => !editingId && handleLoadChat(session)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4 min-w-0">
                    {editingId === session.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(session.id);
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditTitle(session.title);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/10 text-base font-bold"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-bold mb-1 truncate">
                        {session.title}
                      </h3>
                    )}
                    <p className="text-sm text-gray-600">{session.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageSquare
                      size={20}
                      className="text-gray-400 shrink-0"
                    />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        type="button"
                        onClick={(e) => handleStartRename(session, e)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Rename"
                      >
                        <Pencil size={16} className="text-gray-500" />
                      </div>
                      <div
                        type="button"
                        onClick={(e) => handleDeleteChat(session.id, e)}
                        disabled={deletingId === session.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === session.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin text-red-600"
                          />
                        ) : (
                          <Trash2 size={18} className="text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
