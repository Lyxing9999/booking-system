import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

let JWT_SECRET;
if (process.env.JWT_SECRET) {
  JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
} else {
  console.error(
    "JWT_SECRET is NOT set in Middleware environment. Token verification will fail."
  );
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value;
  let role = request.cookies.get("role")?.value;

  if (token && JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      role = payload.role;
    } catch (err) {
      role = null;
    }
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (pathname.startsWith("/user") && role !== "user") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname === "/" && role) {
    return NextResponse.redirect(
      new URL(role === "admin" ? "/admin/slots" : "/user/slots", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/admin/:path*", "/user/:path*"],
};
