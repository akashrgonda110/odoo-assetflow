import type { Metadata } from "next";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssetFlow – Enterprise Asset & Resource Management",
  description:
    "Track, allocate, and maintain physical assets and shared resources across your organization.",
  keywords: "asset management, resource tracking, enterprise, allocation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
