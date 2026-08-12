import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { enhanceTag } from "@/lib/enhanceTag.functions";
import type { Style } from "@/lib/enhanceTag.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Download, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/preview")({
  component: PreviewPage,
  head: () => ({
    meta: [
      { title: "RAW TAG — Preview" },
      { name: "description", content: "Your AI-bombed tag preview." },
    ],
  }),
});

function PreviewPage() {
  const navigate = useNavigate();
  const enhance = useServerFn(enhanceTag);
  const [input, setInput] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    const dataUrl = sessionStorage.getItem("mb:input");
    if (!dataUrl) {
      navigate({ to: "/" });
      return;
    }
    setInput(dataUrl);

    if (ranRef.current) return;
    ranRef.current = true;

    const fidelity = Number(sessionStorage.getItem("mb:fidelity") ?? "0.4");
    const influence = Number(sessionStorage.getItem("mb:influence") ?? "8");
    const style = (sessionStorage.getItem("mb:style") ?? "bomber") as Style;
    const apiKey =
      (typeof localStorage !== "undefined" && localStorage.getItem("mb:geminiKey")) || undefined;

    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await enhance({
          data: { imageDataUrl: dataUrl, fidelity, influence, style, apiKey },
        });
        if (res.error || !res.image) {
          setError(res.error ?? "Something went wrong");
          toast.error(res.error ?? "Something went wrong");
        } else {
          setResult(res.image);
        }
      } catch (e) {
        console.error(e);
        setError("Request failed");
        toast.error("Request failed");
      } finally {
        setBusy(false);
      }
    })();
  }, [enhance, navigate]);

  const retry = async () => {
    if (!input) return;
    ranRef.current = true;
    setBusy(true);
    setError(null);
    setResult(null);
    const fidelity = Number(sessionStorage.getItem("mb:fidelity") ?? "0.4");
    const influence = Number(sessionStorage.getItem("mb:influence") ?? "8");
    const style = (sessionStorage.getItem("mb:style") ?? "bomber") as Style;
    const apiKey =
      (typeof localStorage !== "undefined" && localStorage.getItem("mb:geminiKey")) || undefined;
    try {
      const res = await enhance({
        data: { imageDataUrl: input, fidelity, influence, style, apiKey },
      });
      if (res.error || !res.image) {
        setError(res.error ?? "Something went wrong");
        toast.error(res.error ?? "Something went wrong");
      } else {
        setResult(res.image);
      }
    } catch (e) {
      console.error(e);
      setError("Request failed");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `raw-tag-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toaster theme="dark" />

      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs text-white hover:bg-white/5 hover:text-white"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.85_0.19_75)]" />
          <h1 className="text-sm font-medium tracking-tight">Preview</h1>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={!result}
          className="h-8 gap-1 text-xs text-white hover:bg-white/5 hover:text-white disabled:opacity-30"
          onClick={download}
        >
          <Download className="h-3.5 w-3.5" /> PNG
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center bg-white p-4">
        {busy && (
          <div className="flex flex-col items-center gap-3 text-black/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
            <span className="text-sm">Bombing your tag…</span>
          </div>
        )}
        {!busy && result && (
          <img
            src={result}
            alt="Enhanced bomber tag"
            className="max-h-full max-w-full object-contain"
          />
        )}
        {!busy && !result && error && (
          <div className="flex flex-col items-center gap-3 text-black/60">
            <span className="text-sm">{error}</span>
            {input && (
              <img src={input} alt="Your sketch" className="max-h-[40vh] max-w-full opacity-50" />
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="h-11 flex-1 gap-2 border border-white/10 text-white/80 hover:bg-white/5 hover:text-white"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="h-4 w-4" /> Edit sketch
          </Button>
          <Button
            disabled={busy}
            className="h-11 flex-1 gap-2 bg-[oklch(0.78_0.19_75)] text-white hover:bg-[oklch(0.85_0.19_75)]"
            onClick={retry}
          >
            {busy ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Re-enhance
          </Button>
        </div>
      </div>
    </div>
  );
}
