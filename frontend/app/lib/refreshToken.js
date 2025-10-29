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
        const { accessToken } = res.data;

        if (accessToken) {
          localStorage.setItem("token", accessToken);
          refreshingToken = null;
          return accessToken;
        } else {
          window.location.href = "/auth/login";
          refreshingToken = null;
          return null;
        }
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
