const API_URL = "https://api2.allox.ai";
const WS_URL = "wss://api2.allox.ai/ws";

const getAuthToken = () => localStorage.getItem("authToken");

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
    console.log(error)
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.error || data.message || "Request failed",
      data,
    };
  }

  return data;
};

export const getApiUrl = () => API_URL;
export const getWsUrl = () => WS_URL;
