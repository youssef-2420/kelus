import { KelusHeader } from "@/components/KelusHeader";
export default function NotFound() { return <main className="app-page"><KelusHeader/><section className="empty-state section"><h1>That page is not here.</h1><p>Try searching for a product instead.</p><a className="button button-primary" href="/">Go home</a></section></main>; }
