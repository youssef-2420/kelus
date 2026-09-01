import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { VerifiedNotice } from "@/components/VerifiedNotice";
import { SearchLauncher } from "@/components/SearchLauncher";
import { TrustRow } from "@/components/TrustRow";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

export const metadata: Metadata = {
  title: "Kelus — Find the offer worth buying",
  description: "Search popular electronics and see which validated eBay offer Kelus recommends after checking exact configuration, known shipping, seller evidence, returns, and price anomalies.",
};

function HeroDevices() {
  return <div className="hero-devices" aria-hidden="true">
    <div className="device-tablet"><i/><b/></div><div className="device-watch"><i/></div>
    <div className="device-laptop"><i/></div><div className="device-headphones"><i/><i/></div>
    <div className="device-controller"><i/><i/><i/></div>
  </div>;
}

export default function Home() {
  return <main><LandingAnalytics/><KelusHeader /><VerifiedNotice />
    <section className="hero hero-figma"><HeroDevices /><div className="hero-line line-a"/><div className="hero-line line-b"/>
      <SearchLauncher />
      <div className="hero-content"><p className="eyebrow">Independent shopping intelligence</p><h1>Shop smarter.<br/>Know before you buy.</h1><p className="hero-copy">A cheaper listing can still lose when shipping raises the total, the configuration is wrong, or seller evidence is weak. Kelus checks before it recommends.</p></div><TrustRow />
    </section>
    <section className="how-brief section" aria-label="Learn about Kelus">
      <article>
        <span className="how-brief-icon"><Icon name="grid" size={24}/></span>
        <h2>How Kelus works</h2>
        <p>See how a search becomes a clear comparison of matching offers.</p>
        <Link className="text-link" href="/how-it-works">See the process <Icon name="arrow" size={15}/></Link>
      </article>
      <article>
        <span className="how-brief-icon"><Icon name="shield" size={24}/></span>
        <h2>How Kelus picks</h2>
        <p>See the evidence Kelus uses before recommending an offer.</p>
        <Link className="text-link" href="/methodology">See our methodology <Icon name="arrow" size={15}/></Link>
      </article>
    </section>
    <section className="demo-note"><Icon name="lock" size={17}/>Live eBay offers are labeled clearly. Price history appears only when enough real data exists.</section>
  </main>;
}
