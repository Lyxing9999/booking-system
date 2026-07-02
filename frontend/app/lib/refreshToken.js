import axios from "axios";

let refreshingToken = null;

export const refreshAccessToken = async () => {
  try {
    if (refreshingToken) return await refreshingToken;

    refreshingToken = (async () => {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      refreshingToken = null;

      // Return access token if backend sends it
      return res.data?.accessToken || true;
    })();

    return await refreshingToken;
  } catch (err) {
    console.error("Refresh token failed:", err);
    refreshingToken = null;
    // Let callers handle navigation on failure; return null to indicate failure
    return null;
  }
};
