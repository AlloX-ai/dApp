const API_URL = "https://api.allox.ai";
const WS_URL = "wss://api.allox.ai/ws";

const getAuthToken = () => localStorage.getItem("authToken");

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiCall = async (endpoint, options = {}, apiType) => {
  const { returnRawResponse = false, ...fetchOptions } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...fetchOptions.headers,
    },
  });

  if (returnRawResponse) {
    if (!response.ok) {
      throw {
        status: response.status,
        message: `Request failed (${response.status})`,
        data: null,
      };
    }
    return response;
  }

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
