// app/layout.js (Server Component)
import "./globals.css";
import "antd/dist/reset.css";
import ClientWrapper from "./ClientWrapper";

export const metadata = {
  title: "Admin Dashboard",
  description: "Next.js Admin Dashboard with AntD",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
