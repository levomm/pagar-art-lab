import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  BookOpen,
  Eraser,
  Sparkles,
  Undo2,
  Settings2,
  X,
  Upload,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: PagarsArtLab,
  head: () => ({
    meta: [
      { title: "Pagar's Art Lab — Sketch & Bomb your tag" },
      {
        name: "description",
        content:
          "Pagar's Art Lab — sketch your graffiti tag, pick a style, and let AI bomb it into a finished piece.",
      },
    ],
  }),
});

// ─── Marker palette ───────────────────────────────────────────────────────────
const MARKERS = [
  { name: "Ink Black", color: "#0a0a0a" },
  { name: "Bone White", color: "#f5f1e6" },
  { name: "Blood Red", color: "#d4271f" },
  { name: "Acid Green", color: "#3ddb6a" },
  { name: "Subway Blue", color: "#1e6cff" },
  { name: "Hot Pink", color: "#ff3aa3" },
  { name: "Toxic Yellow", color: "#ffd400" },
  { name: "Royal Purple", color: "#7d2cff" },
  { name: "Steel Silver", color: "#c2c8d0" },
] as const;

// ─── Background variants ──────────────────────────────────────────────────────
const BACKGROUNDS = [
  { name: "Paper", color: "#ffffff", label: "WHT" },
  { name: "Cream", color: "#f3ead4", label: "CRM" },
  { name: "Concrete", color: "#a4a8ad", label: "CON" },
  { name: "Brick", color: "#7a3a2a", label: "BRK" },
  { name: "Subway", color: "#1a1a1a", label: "SUB" },
] as const;

// ─── Style catalog ────────────────────────────────────────────────────────────
type StyleId =
  | "bomber"
  | "throwup"
  | "wildstyle"
  | "blockbuster"
  | "handstyle"
  | "brush";

const STYLES: { id: StyleId; name: string; tag: string; desc: string }[] = [
  {
    id: "bomber",
    name: "Bomber",
    tag: "NYC",
    desc: "Fat-marker handstyle with dramatic drips and whips. The classic.",
  },
  {
    id: "throwup",
    name: "Throw-Up",
    tag: "2-TONE",
    desc: "Quick bubble piece — bold outline, flat fill, subway speed.",
  },
  {
    id: "wildstyle",
    name: "Wildstyle",
    tag: "PRO",
    desc: "Interlocking arrows, layered outlines, king-level construction.",
  },
  {
    id: "blockbuster",
    name: "Blockbuster",
    tag: "BIG",
    desc: "Massive geometric block letters. Freight-train monumentality.",
  },
  {
    id: "handstyle",
    name: "Handstyle",
    tag: "TAG",
    desc: "Pure one-shot signature gesture. Veteran writer flow.",
  },
  {
    id: "brush",
    name: "Brush",
    tag: "INK",
    desc: "Heavy ink-loaded brush calligraphy. Wabi-sabi expressive.",
  },
];

function PagarsArtLab() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);

  const [markerIdx, setMarkerIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [styleId, setStyleId] = useState<StyleId>("bomber");
  const [brush, setBrush] = useState(12);
  const [fidelity, setFidelity] = useState(0.7);
  const [influence, setInfluence] = useState(8);
  const [busy, setBusy] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const bgColor = BACKGROUNDS[bgIdx].color;
  const markerColor = MARKERS[markerIdx].color;

  // Init / resize canvas
  useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;

    const initOrResize = () => {
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const prev =
        c.width && c.height ? ctx.getImageData(0, 0, c.width, c.height) : null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(wrap.clientWidth * dpr);
      const h = Math.floor(wrap.clientHeight * dpr);
      if (w === c.width && h === c.height) return;
      c.width = w;
      c.height = h;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (prev) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ctx.strokeStyle = markerColor;
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

  const fillBackground = (color: string) => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    snapshot();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const clearCanvas = () => {
    fillBackground(bgColor);
    toast("Canvas cleared", { duration: 1200 });
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) {
      toast("Nothing to undo", { duration: 1000 });
      return;
    }
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.putImageData(prev, 0, 0);
  };

  const onBgChange = (i: number) => {
    setBgIdx(i);
    fillBackground(BACKGROUNDS[i].color);
  };

  const exportPng = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const url = c.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `pagars-art-lab-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("PNG exported");
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    }
  };

  const onUploadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      snapshot();
      const margin = 0.08;
      const maxW = c.width * (1 - margin * 2);
      const maxH = c.height * (1 - margin * 2);
      const r = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * r;
      const h = img.height * r;
      ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      URL.revokeObjectURL(objUrl);
      toast.success("Tag pasted");
    };
    img.onerror = () => {
      toast.error("Could not load image");
      URL.revokeObjectURL(objUrl);
    };
    img.src = objUrl;
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const handleEnhance = async () => {
    const c = canvasRef.current!;
    const dataUrl = c.toDataURL("image/png");
    setBusy(true);
    try {
      sessionStorage.setItem("mb:input", dataUrl);
      sessionStorage.setItem("mb:fidelity", String(fidelity));
      sessionStorage.setItem("mb:influence", String(influence));
      sessionStorage.setItem("mb:style", styleId);
      navigate({ to: "/preview" });
    } catch (e) {
      console.error(e);
      toast.error("Could not open preview");
      setBusy(false);
    }
  };

  // ─── Reusable control panels ────────────────────────────────────────────────
  const MarkerRow = (
    <div>
      <PanelLabel>Marker</PanelLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {MARKERS.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setMarkerIdx(i)}
            title={m.name}
            className={cn(
              "relative h-9 w-9 shrink-0 rounded-full border-2 transition-transform",
              markerIdx === i
                ? "border-white scale-110 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]"
                : "border-white/15 hover:border-white/40",
            )}
            style={{ background: m.color }}
          />
        ))}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
        {MARKERS[markerIdx].name}
      </div>
    </div>
  );

  const BgRow = (
    <div>
      <PanelLabel>Background</PanelLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {BACKGROUNDS.map((b, i) => (
          <button
            key={b.name}
            onClick={() => onBgChange(i)}
            title={b.name}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-md border px-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
              bgIdx === i
                ? "border-white/60 text-white"
                : "border-white/10 text-white/60 hover:border-white/30 hover:text-white/90",
            )}
          >
            <span
              className="h-4 w-4 rounded-sm border border-black/30"
              style={{ background: b.color }}
            />
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );

  const StyleRow = (
    <div>
      <PanelLabel>Style</PanelLabel>
      <div className="grid grid-cols-2 gap-2">
        {STYLES.map((s) => {
          const active = styleId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStyleId(s.id)}
              className={cn(
                "group relative rounded-lg border p-2.5 text-left transition-all",
                active
                  ? "border-[oklch(0.78_0.19_75)] bg-[oklch(0.78_0.19_75)]/10"
                  : "border-white/10 hover:border-white/30 hover:bg-white/[0.02]",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-display text-[15px] font-bold leading-none tracking-tight",
                    active ? "text-white" : "text-white/85",
                  )}
                >
                  {s.name}
                </span>
                <span
                  className={cn(
                    "rounded-sm border px-1 py-0.5 text-[8px] font-mono tracking-wider",
                    active
                      ? "border-[oklch(0.85_0.19_75)] text-[oklch(0.92_0.15_75)]"
                      : "border-white/15 text-white/40",
                  )}
                >
                  {s.tag}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-white/50">
                {s.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const SlidersBlock = (
    <div className="space-y-3">
      <ControlSlider
        label="Brush"
        value={`${brush}px`}
        v={brush}
        min={2}
        max={48}
        step={1}
        onChange={setBrush}
      />
      <ControlSlider
        label="Fidelity"
        value={fidelity.toFixed(2)}
        v={fidelity}
        min={0.3}
        max={0.95}
        step={0.01}
        onChange={setFidelity}
      />
      <ControlSlider
        label="Influence"
        value={influence.toFixed(1)}
        v={influence}
        min={7}
        max={9}
        step={0.1}
        onChange={setInfluence}
      />
    </div>
  );

  const TutorialButton = (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Tutorial
        </Button>
      </SheetTrigger>
      <TutorialContent />
    </Sheet>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-background text-foreground md:flex-row">
      <Toaster theme="dark" position="top-center" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
          e.target.value = "";
        }}
      />

      {/* ───────── Sidebar (md+) ───────── */}
      <aside className="hidden md:flex md:h-full md:w-[300px] md:shrink-0 md:flex-col md:border-r md:border-white/10">
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          {TutorialButton}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {MarkerRow}
          {BgRow}
          {StyleRow}
          {SlidersBlock}
        </div>

        <div className="border-t border-white/10 p-3">
          <Button
            onClick={handleEnhance}
            disabled={busy}
            className="h-12 w-full gap-2 bg-[oklch(0.78_0.19_75)] text-black hover:bg-[oklch(0.85_0.19_75)] font-display text-base font-bold tracking-wide"
          >
            <Sparkles className="h-4 w-4" />
            BOMB IT
          </Button>
        </div>
      </aside>

      {/* ───────── Mobile header ───────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 md:hidden">
        <Logo compact />
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/80 hover:bg-white/5 hover:text-white"
            onClick={undo}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/80 hover:bg-white/5 hover:text-white"
            onClick={clearCanvas}
            title="Clear"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white/80 hover:bg-white/5 hover:text-white"
                title="Tutorial"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <TutorialContent />
          </Sheet>
        </div>
      </header>

      {/* ───────── Canvas ───────── */}
      <div className="relative flex flex-1 flex-col">
        {/* Top action bar — desktop only */}
        <div className="hidden h-11 shrink-0 items-center justify-between border-b border-white/10 px-4 md:flex">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: markerColor }}
            />
            {MARKERS[markerIdx].name}
            <span className="text-white/20">·</span>
            {STYLES.find((s) => s.id === styleId)!.name}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearCanvas}
              className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>

        <div
          ref={wrapRef}
          className="relative flex-1"
          style={{ background: bgColor }}
        >
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

        {/* ───────── Mobile bottom panel ───────── */}
        <div className="shrink-0 border-t border-white/10 bg-background md:hidden">
          {/* Always-visible quick row */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Active marker chip */}
            <button
              onClick={() => setMobilePanelOpen((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wider text-white/80"
            >
              <span
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ background: markerColor }}
              />
              {MARKERS[markerIdx].name}
            </button>
            {/* Active style chip */}
            <button
              onClick={() => setMobilePanelOpen((v) => !v)}
              className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wider text-white/80"
            >
              {STYLES.find((s) => s.id === styleId)!.name}
            </button>
            <div className="flex-1" />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white/70 hover:bg-white/5 hover:text-white"
              onClick={() => setMobilePanelOpen((v) => !v)}
              title="Tools"
            >
              {mobilePanelOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Settings2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Expandable tools */}
          {mobilePanelOpen && (
            <div className="max-h-[58vh] space-y-4 overflow-y-auto border-t border-white/10 px-3 py-3">
              {MarkerRow}
              {BgRow}
              {StyleRow}
              {SlidersBlock}
            </div>
          )}

          {/* Enhance CTA */}
          <div className="border-t border-white/10 p-3">
            <Button
              onClick={handleEnhance}
              disabled={busy}
              className="h-12 w-full gap-2 bg-[oklch(0.78_0.19_75)] text-black hover:bg-[oklch(0.85_0.19_75)] font-display text-base font-bold tracking-wide"
            >
              <Sparkles className="h-4 w-4" />
              BOMB IT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="leading-none select-none">
      <div
        className={cn(
          "logo-tag text-white",
          compact ? "text-[26px]" : "text-[30px]",
        )}
      >
        Pagar's
        <span className="ml-1 text-[oklch(0.85_0.19_75)]">Art Lab</span>
      </div>
      <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.25em] text-white/40">
        EST · 2026 · BOMB SQUAD
      </div>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
      <span className="h-px flex-1 bg-white/10" />
      {children}
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function ControlSlider({
  label,
  value,
  v,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: string;
  v: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-mono uppercase tracking-wider text-white/60">
          {label}
        </span>
        <span className="font-mono text-white">{value}</span>
      </div>
      <Slider
        value={[v]}
        onValueChange={(arr) => onChange(arr[0])}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function TutorialContent() {
  return (
    <SheetContent
      side="right"
      className="w-full max-w-md border-l border-white/10 bg-background text-foreground sm:max-w-md"
    >
      <SheetHeader className="space-y-2">
        <SheetTitle className="font-display text-2xl font-bold tracking-tight">
          How to bomb a tag
        </SheetTitle>
        <SheetDescription className="text-white/60">
          Five steps from blank wall to finished piece.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-5 px-4 pb-8">
        <Step
          n={1}
          title="Pick your weapon"
          body="Choose a marker color and brush size. Fat markers feel like real subway tools — try 14–24px for bombers."
        />
        <Step
          n={2}
          title="Set the wall"
          body="Pick a background — Subway black, Concrete grey or classic Paper. The AI sees this as your surface, so choose what fits the vibe."
        />
        <Step
          n={3}
          title="Sketch your tag"
          body="Draw your letters fast and loose. The AI uses your sketch as a CONCEPT — perfection isn't required. Use Undo or Clear if you mess up."
        />
        <Step
          n={4}
          title="Choose a style"
          body="Bomber for handstyle drips, Throw-up for bubbles, Wildstyle for arrows, Blockbuster for monumentals, Brush for ink calligraphy."
        />
        <Step
          n={5}
          title="Bomb it"
          body="Hit BOMB IT. Fidelity controls how much the AI keeps your strokes vs restyles them. Influence locks the chosen style harder."
        />

        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[oklch(0.85_0.19_75)]">
            Pro tip
          </div>
          <p className="text-xs leading-relaxed text-white/70">
            For first attempts, leave Fidelity around 0.6–0.7. Push it lower to
            let the AI fully reinterpret your sketch as a master writer would.
          </p>
        </div>
      </div>
    </SheetContent>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[oklch(0.85_0.19_75)]/40 bg-[oklch(0.85_0.19_75)]/10 font-display text-sm font-bold text-[oklch(0.92_0.15_75)]">
        {n}
      </div>
      <div className="flex-1">
        <div className="font-display text-base font-bold leading-tight tracking-tight">
          {title}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-white/65">{body}</p>
      </div>
    </div>
  );
}
