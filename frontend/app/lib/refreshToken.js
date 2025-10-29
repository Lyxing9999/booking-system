import axios from "axios";

let refreshingToken = null;

export const refreshAccessToken = async () => {
  try {
    if (refreshingToken) return await refreshingToken;

    refreshingToken = axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then((res) => {
        refreshingToken = null;
        return res.data.success ? true : (window.location.href = "/auth/login");
      })
      .catch((err) => {
        console.error("Refresh token failed:", err);
        window.location.href = "/auth/login";
        refreshingToken = null;
        return null;
      });

    return await refreshingToken;
  } catch (err) {
    console.error("Unexpected refresh error:", err);
    window.location.href = "/auth/login";
    refreshingToken = null;
    return null;
  }
};
