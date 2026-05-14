import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Eraser, Sparkles, Undo2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: MetroBomber,
  head: () => ({
    meta: [
      { title: "Metro Bomber — Draw your tag" },
      {
        name: "description",
        content: "Sketch your graffiti tag fullscreen and let AI bomb it.",
      },
    ],
  }),
});

function MetroBomber() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);

  const [brush, setBrush] = useState(10);
  const [fidelity, setFidelity] = useState(0.7);
  const [influence, setInfluence] = useState(8);
  const [busy, setBusy] = useState(false);

  // Resize canvas to fill its container, preserving drawing
  useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;

    const initOrResize = () => {
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const prev = c.width && c.height ? ctx.getImageData(0, 0, c.width, c.height) : null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(wrap.clientWidth * dpr);
      const h = Math.floor(wrap.clientHeight * dpr);
      if (w === c.width && h === c.height) return;
      c.width = w;
      c.height = h;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000000";
      if (prev) {
        // Best-effort restore
        const tmp = document.createElement("canvas");
        tmp.width = prev.width;
        tmp.height = prev.height;
        tmp.getContext("2d")!.putImageData(prev, 0, 0);
        ctx.drawImage(tmp, 0, 0, w, h);
      }
    };

    initOrResize();
    const ro = new ResizeObserver(initOrResize);
    ro.observe(wrap);
    return () => ro.disconnect();
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.lineWidth = brush * dpr;
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
    try {
      sessionStorage.setItem("mb:input", dataUrl);
      sessionStorage.setItem("mb:fidelity", String(fidelity));
      sessionStorage.setItem("mb:influence", String(influence));
      navigate({ to: "/preview" });
    } catch (e) {
      console.error(e);
      toast.error("Could not open preview");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toaster theme="dark" />

      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.72_0.18_280)]" />
          <h1 className="text-sm font-medium tracking-tight">Metro Bomber</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
            onClick={undo}
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
            onClick={clearCanvas}
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </header>

      {/* Canvas — fills available space */}
      <div ref={wrapRef} className="relative flex-1 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: "crosshair" }}
        />
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-white/50">Brush</span>
              <span className="font-mono text-white/70">{brush}px</span>
            </div>
            <Slider
              value={[brush]}
              onValueChange={(v) => setBrush(v[0])}
              min={2}
              max={40}
              step={1}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-white/50">Fidelity</span>
              <span className="font-mono text-white/70">{fidelity.toFixed(2)}</span>
            </div>
            <Slider
              value={[fidelity]}
              onValueChange={(v) => setFidelity(v[0])}
              min={0.3}
              max={0.5}
              step={0.01}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-white/50">Influence</span>
              <span className="font-mono text-white/70">{influence.toFixed(1)}</span>
            </div>
            <Slider
              value={[influence]}
              onValueChange={(v) => setInfluence(v[0])}
              min={7}
              max={9}
              step={0.1}
            />
          </div>
        </div>
        <Button
          onClick={handleEnhance}
          disabled={busy}
          className="mt-3 h-11 w-full gap-2 bg-[oklch(0.66_0.18_280)] text-white hover:bg-[oklch(0.72_0.18_280)]"
        >
          <Sparkles className="h-4 w-4" />
          Enhance Tag
        </Button>
      </div>
    </div>
  );
}
