// app/user/slots/page.jsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import DashboardLayout from "../../components/DashboardLayout";
import JWTClientSlots from "./clientSlots";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function UserSlotsPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  const token = tokenCookie?.value;
if (!tokenCookie) redirect("/auth/login");

  const { payload } = await jwtVerify(token, JWT_SECRET);


  return (
    <DashboardLayout role="user">
      <JWTClientSlots user={payload} />
    </DashboardLayout>
  );
}