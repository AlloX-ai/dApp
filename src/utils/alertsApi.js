import { apiCall } from "./api";

export const watchlistApi = {
  getWatchlist: () => apiCall("/watchlist"),
  addToken: (payload) =>
    apiCall("/watchlist/add", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  removeToken: (symbol) =>
    apiCall(`/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" }),
  updateThreshold: (symbol, alertThreshold) =>
    apiCall(`/watchlist/${encodeURIComponent(symbol)}`, {
      method: "PATCH",
      body: JSON.stringify({ alertThreshold }),
    }),
  getAlerts: () => apiCall("/watchlist/alerts"),
};

export const notificationsApi = {
  getNotifications: ({ limit = 20, offset = 0, unreadOnly = true } = {}) =>
    apiCall(
      `/notifications?limit=${limit}&offset=${offset}&unreadOnly=${unreadOnly}`,
    ),
  markRead: (id) =>
    apiCall(`/notifications/${id}/read`, {
      method: "PATCH",
    }),
  markAllRead: () =>
    apiCall("/notifications/read-all", {
      method: "POST",
    }),
  getConfig: (portfolioId) =>
    apiCall(`/notifications/config/${encodeURIComponent(portfolioId)}`),
  updateConfig: (portfolioId, payload) =>
    apiCall(`/notifications/config/${encodeURIComponent(portfolioId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  addCustomThreshold: (portfolioId, payload) =>
    apiCall(`/notifications/config/${encodeURIComponent(portfolioId)}/custom`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  removeCustomThreshold: (portfolioId, thresholdId) =>
    apiCall(
      `/notifications/config/${encodeURIComponent(portfolioId)}/custom/${encodeURIComponent(thresholdId)}`,
      { method: "DELETE" },
    ),
};
