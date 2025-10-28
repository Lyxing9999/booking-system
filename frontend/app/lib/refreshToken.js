import axios from "axios";

export const refreshAccessToken = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
    const { accessToken } = res.data;
    if (accessToken) localStorage.setItem("token", accessToken);
    return accessToken;
  } catch (err) {
    console.error("Refresh token failed:", err);
    return null;
  }
};
