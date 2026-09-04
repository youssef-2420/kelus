import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { LearnerProvider } from "@/components/LearnerProvider";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Kelus — Know what to study next",
  description: "Kelus looks at what you know, what’s fading, and the time you have — then gives you today’s exam plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <a className="skip" href="#main">Skip to content</a>
        <LearnerProvider>{children}</LearnerProvider>
      </body>
    </html>
  );
}
