// app/layout.js (Server Component)
import "./globals.css";
import "antd/dist/reset.css";
import { Geist, Geist_Mono } from "next/font/google";
import ClientWrapper from "./ClientWrapper"; // client-only component

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Admin Dashboard",
  description: "Next.js Admin Dashboard with AntD",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
