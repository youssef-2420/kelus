import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { LearnerProvider } from "@/components/LearnerProvider";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Kelus — Know what to learn next",
  description: "Kelus maps the best route from what you know today to your exam — and reroutes as you improve.",
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
