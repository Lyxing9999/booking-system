import axios from "axios";

export const tryRefreshToken = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
    const { accessToken } = res.data.data;
    if (accessToken) {
      localStorage.setItem("token", accessToken);
      return accessToken;
    }
  } catch (err) {
    console.error("Failed to refresh token:", err);
  }
  return null;
};
