import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { LearnerProvider } from "@/components/LearnerProvider";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Kelus — Know what to study today",
  description: "A persistent model of what you know, what you’re forgetting, and what to study next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <LearnerProvider>{children}</LearnerProvider>
      </body>
    </html>
  );
}
