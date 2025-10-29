import axios from "axios";

export const refreshAccessToken = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );

    return true;
  } catch (err) {
    console.error("Refresh token failed:", err);
    return null;
  }
};
