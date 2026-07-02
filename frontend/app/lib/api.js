import axios from "axios";
import { refreshAccessToken } from "./refreshToken";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshed = await refreshAccessToken();
        if (refreshed) return api(originalRequest);
        // refresh failed — redirect once (avoid redundant reload if already on login)
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/auth/login"
        ) {
          window.location.href = "/auth/login";
        }
      } catch (e) {
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/auth/login"
        ) {
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;
