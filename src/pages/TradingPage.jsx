import { useSelector } from "react-redux";

export function TradingPage() {
  const completedActions = useSelector(
    (state) => state.chat.completedActions,
  );

  return (
    <div className="flex-1 px-6 py-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Trading</h2>

      {completedActions.length > 0 ? (
        <div className="space-y-4">
          {completedActions.map((action) => (
            <div
              key={action.id}
              className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        action.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : action.status === "pending"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {action.status === "completed"
                        ? "✓ Completed"
                        : action.status === "pending"
                        ? "Pending"
                        : "Failed"}
                    </div>
                    <span className="text-xs text-gray-500">
                      {action.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-600 mb-4">No completed actions yet.</p>
          <p className="text-sm text-gray-500">
            Use the Chat to initiate trades and they'll show up here.
          </p>
        </div>
      )}
    </div>
  );
}
