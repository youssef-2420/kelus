"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CourseMaterial } from "@/domain/types";
import { useAuth } from "@/components/AuthProvider";
import { readMaterialPdf } from "@/lib/material-sync";

type Props = {
  material: CourseMaterial | null;
  initialPage?: number;
  concealed?: boolean;
  onShowSource?: () => void;
};

/** The original course page, not a generated facsimile. */
export function CourseSourceReader({ material, initialPage = 1, concealed = false, onShowSource }: Props) {
  const auth = useAuth();
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(initialPage);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [accessibleText, setAccessibleText] = useState("");
  const displayPage = Math.min(page, pages || page);

  useEffect(() => {
    if (!material || material.storage !== "local" || concealed) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let document: { destroy: () => Promise<void> } | null = null;
    let observer: ResizeObserver | null = null;

    async function open() {
      setStatus("loading");
      try {
        const blob = await readMaterialPdf(material!.id, auth.user?.id);
        if (cancelled) return;
        if (!blob) { setStatus("missing"); return; }
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url,
        ).toString();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        document = pdf;
        if (cancelled) return;
        setPages(pdf.numPages);
        const pdfPage = await pdf.getPage(Math.min(Math.max(page, 1), pdf.numPages));
        if (cancelled) return;
        const textContent = await pdfPage.getTextContent();
        if (!cancelled) setAccessibleText(textContent.items.flatMap((item) => "str" in item ? [item.str] : []).join(" "));
        async function draw() {
          if (!canvas.current || !viewport.current || cancelled) return;
          renderTask?.cancel();
          const element = canvas.current;
          const context = element.getContext("2d");
          if (!context) return;
          const natural = pdfPage.getViewport({ scale: 1 });
          const scale = Math.min(1.8, Math.max(0.45, (viewport.current.clientWidth - 32) / natural.width));
          const view = pdfPage.getViewport({ scale });
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          element.width = Math.floor(view.width * pixelRatio);
          element.height = Math.floor(view.height * pixelRatio);
          element.style.width = `${view.width}px`;
          element.style.height = `${view.height}px`;
          renderTask = pdfPage.render({ canvas: element, canvasContext: context, viewport: view, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
          try {
            await renderTask.promise;
            if (!cancelled) setStatus("ready");
          } catch (error) {
            if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) setStatus("error");
          }
        }
        await draw();
        if (!cancelled && viewport.current) {
          observer = new ResizeObserver(() => { void draw(); });
          observer.observe(viewport.current);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void open();
    return () => {
      cancelled = true;
      observer?.disconnect();
      renderTask?.cancel();
      if (document) void document.destroy();
    };
  }, [material, page, concealed, auth.user?.id]);

  return (
    <section className="core-source-reader" aria-label="Course source">
      <header className="core-source-toolbar">
        <div className="core-source-title"><span>COURSE SOURCE</span><strong title={material?.title}>{material?.title ?? "Your material"}</strong></div>
        {material?.storage === "local" && pages > 0 && !concealed ? (
          <div className="core-page-controls" aria-label="PDF pages">
            <button type="button" onClick={() => setPage(Math.max(1, displayPage - 1))} disabled={displayPage <= 1} aria-label="Previous page">←</button>
            <span>{displayPage} / {pages}</span>
            <button type="button" onClick={() => setPage(Math.min(pages, displayPage + 1))} disabled={displayPage >= pages} aria-label="Next page">→</button>
          </div>
        ) : null}
      </header>
      <div className="core-source-stage" ref={viewport}>
        {concealed ? (
          <div className="core-source-state is-concealed"><span aria-hidden="true">◌</span><strong>Source closed for recall</strong><p>Try the question from memory. You can reopen the original page if you need it.</p>{onShowSource ? <button type="button" onClick={onShowSource}>Show source</button> : null}</div>
        ) : !material ? (
          <div className="core-source-state"><span aria-hidden="true">↗</span><strong>Your course, beside your route.</strong><p>Add a PDF and Kelus will keep the original page within reach while you revise.</p><Link href="/today?section=materials">Add a source →</Link></div>
        ) : material.id.startsWith("material-demo-") ? (
          <div className="core-source-state"><strong>Course source unavailable</strong><p>Add your course PDF to read the original pages beside your route.</p><Link href="/today?section=materials">Add a source →</Link></div>
        ) : material.storage === "url" ? (
          <div className="core-source-state"><span aria-hidden="true">↗</span><strong>{material.title}</strong><p>This source was saved as a link. Open the original in a new tab.</p>{material.sourceUrl ? <a href={material.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a> : null}</div>
        ) : (
          <>
            {status === "loading" ? <p className="core-source-loading" role="status">Opening original page…</p> : null}
            {status === "missing" ? <div className="core-source-state"><strong>PDF not available here</strong><p>The source is saved, but its file could not be opened on this device.</p><Link href="/today?section=materials">Add the PDF again →</Link></div> : null}
            {status === "error" ? <div className="core-source-state"><strong>Couldn’t show this page</strong><p>Your source and study route are still saved. Try the PDF from Materials.</p><Link href="/today?section=materials">Open Materials →</Link></div> : null}
            <canvas ref={canvas} role="img" aria-label={`Page ${displayPage} of ${material.title}`} hidden={status !== "ready"} />
            {status === "ready" && accessibleText ? <p className="sr-only">Page {displayPage} text: {accessibleText}</p> : null}
          </>
        )}
      </div>
    </section>
  );
}
