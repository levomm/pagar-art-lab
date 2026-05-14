import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { enhanceTag } from "@/lib/enhanceTag.functions";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Download, Eraser, Sparkles, Undo2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: MetroBomber,
  head: () => ({
    meta: [
      { title: "Metro Bomber — AI Tag Enhancer" },
      {
        name: "description",
        content:
          "Draw your graffiti tag and let AI transform it into an authentic street-style bomber handstyle.",
      },
    ],
  }),
});

const CANVAS_W = 900;
const CANVAS_H = 360;

function MetroBomber() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);

  const [brush, setBrush] = useState(8);
  const [fidelity, setFidelity] = useState(0.4);
  const [influence, setInfluence] = useState(8);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const enhance = useServerFn(enhanceTag);

  // Init white canvas
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
  }, []);

  const snapshot = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    history.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (history.current.length > 30) history.current.shift();
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    snapshot();
    drawing.current = true;
    lastPt.current = getPos(e);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    const last = lastPt.current!;
    ctx.lineWidth = brush;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPt.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    lastPt.current = null;
  };

  const clearCanvas = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    snapshot();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.putImageData(prev, 0, 0);
  };

  const handleEnhance = async () => {
    const c = canvasRef.current!;
    const dataUrl = c.toDataURL("image/png");
    setBusy(true);
    setResult(null);
    try {
      const res = await enhance({ data: { imageDataUrl: dataUrl, fidelity, influence } });
      if (res.error || !res.image) {
        toast.error(res.error ?? "Something went wrong");
      } else {
        setResult(res.image);
        toast.success("Tag enhanced");
      }
    } catch (e) {
      console.error(e);
      toast.error("Request failed");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `metro-bomber-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" />
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.72_0.18_280)]" />
            <h1 className="text-sm font-medium tracking-tight">Metro Bomber</h1>
            <span className="text-xs text-white/40">/ AI Tag Enhancer</span>
          </div>
          <span className="text-xs text-white/40">draw → enhance → download</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Draw your tag. AI makes it bomber.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Sketch your handstyle on the canvas — AI keeps your letters and adds high-velocity
            flow, dynamic pressure and authentic ink drips.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Canvas panel */}
          <section className="rounded-xl border border-white/10 bg-[oklch(0.20_0.018_265)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/40">Your sketch</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                  onClick={undo}
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                  onClick={clearCanvas}
                >
                  <Eraser className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerLeave={onUp}
                className="block w-full touch-none"
                style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, cursor: "crosshair" }}
              />
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/50">Brush size</span>
                <span className="font-mono text-white/70">{brush}px</span>
              </div>
              <Slider
                value={[brush]}
                onValueChange={(v) => setBrush(v[0])}
                min={2}
                max={24}
                step={1}
              />
            </div>
          </section>

          {/* Result panel */}
          <section className="rounded-xl border border-white/10 bg-[oklch(0.20_0.018_265)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/40">
                AI bomber output
              </span>
              {result && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                  onClick={download}
                >
                  <Download className="h-3.5 w-3.5" /> PNG
                </Button>
              )}
            </div>
            <div
              className="flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white"
              style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
            >
              {busy ? (
                <div className="flex flex-col items-center gap-2 text-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                  <span className="text-xs">Bombing…</span>
                </div>
              ) : result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result} alt="Enhanced bomber tag" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-black/30">Result appears here</span>
              )}
            </div>

            <Button
              onClick={handleEnhance}
              disabled={busy}
              className="mt-4 h-10 w-full gap-2 bg-[oklch(0.66_0.18_280)] text-white hover:bg-[oklch(0.72_0.18_280)]"
            >
              <Sparkles className="h-4 w-4" />
              {busy ? "Enhancing…" : "Enhance Tag"}
            </Button>
          </section>
        </div>

        {/* Advanced controls */}
        <section className="mt-6 rounded-xl border border-white/10 bg-[oklch(0.18_0.015_265)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-white/40">
              Advanced controls
            </span>
            <span className="text-xs text-white/30">— how much AI may transform your line</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/60">Image fidelity</span>
                <span className="font-mono text-white/80">{fidelity.toFixed(2)}</span>
              </div>
              <Slider
                value={[fidelity]}
                onValueChange={(v) => setFidelity(v[0])}
                min={0.3}
                max={0.5}
                step={0.01}
              />
              <p className="mt-1.5 text-[11px] text-white/40">
                Lower = stays close to your drawing. Higher = AI takes more freedom.
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/60">Prompt influence</span>
                <span className="font-mono text-white/80">{influence.toFixed(1)}</span>
              </div>
              <Slider
                value={[influence]}
                onValueChange={(v) => setInfluence(v[0])}
                min={7}
                max={9}
                step={0.1}
              />
              <p className="mt-1.5 text-[11px] text-white/40">
                Higher = AI sticks rigidly to the bomber-style prompt.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
