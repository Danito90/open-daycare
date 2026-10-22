import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { FeedProvider } from "./components/feed-provider";
import { UserProvider } from "./components/user-provider";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenDayCare",
  description: "Gestión y comunicación para guarderías.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UserProvider profile={profile}>
          <FeedProvider>{children}</FeedProvider>
        </UserProvider>
      </body>
    </html>
  );
}
