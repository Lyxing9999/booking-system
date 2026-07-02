// app/layout.js (Server Component)
import "./globals.css";
import ClientWrapper from "./ClientWrapper";
import ThemeInitScript from "./ThemeInitScript";

export const metadata = {
  title: "PS5 Game Booking",
  description: "Book PS5 game slots and manage your play sessions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="ps5-default" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeInitScript />
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
