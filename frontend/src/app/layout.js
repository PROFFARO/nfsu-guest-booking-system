import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import GoogleTranslateFix from "@/components/layout/GoogleTranslateFix";
import ClientProviders from "@/components/layout/ClientProviders";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "NFSU-Guest House Booking Portal",
  description: "guest house booking system for the National Forensic Sciences University. Browse rooms, make reservations, and manage your stay with ease.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${notoSans.variable} antialiased min-h-screen flex flex-col overflow-x-hidden`}>
        <GoogleTranslateFix />
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <SocketProvider>
                <TooltipProvider>
                  <ClientProviders>
                    {children}
                  </ClientProviders>
                </TooltipProvider>
              </SocketProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
