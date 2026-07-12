import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./components/ui/Toast";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AssetFlow – Enterprise Asset & Resource Management",
  description:
    "Track, allocate, and maintain physical assets and shared resources.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
