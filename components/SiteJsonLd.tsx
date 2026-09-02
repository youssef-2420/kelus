export function SiteJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Kelus",
        url: "https://kelus.me/",
        logo: "https://kelus.me/kelus-icon.png",
        description: "Kelus compares exact electronics configurations and validated eBay offers so shoppers know before they buy.",
      },
      {
        "@type": "WebSite",
        name: "Kelus",
        url: "https://kelus.me/",
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />;
}
