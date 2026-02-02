import { MessageSquare, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  setChatSessions,
  setCurrentMessages,
} from "../redux/slices/chatSlice";

export function HistoryPage() {
  const dispatch = useDispatch();
  const chatSessions = useSelector((state) => state.chat.chatSessions);

  const handleDeleteChat = (sessionId, event) => {
    event.stopPropagation();
    dispatch(
      setChatSessions(
        chatSessions.filter((session) => session.id !== sessionId),
      ),
    );
  };

  const handleLoadChat = (session) => {
    dispatch(setCurrentMessages(session.messages));
  };

  return (
    <div className="flex-1 px-6 py-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Chat History</h2>
      <div className="space-y-3">
        {chatSessions.map((session) => (
          <div
            key={session.id}
            className="glass-card p-6 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 transition-all duration-200 group relative"
          >
            <button
              onClick={() => handleLoadChat(session)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="font-bold mb-1">{session.title}</h3>
                  <p className="text-sm text-gray-600">{session.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare size={20} className="text-gray-400" />
                  <button
                    onClick={(event) => handleDeleteChat(session.id, event)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
