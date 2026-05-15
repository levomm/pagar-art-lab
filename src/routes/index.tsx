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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import sceneBusstop from "@/assets/scene-busstop.jpg";
import sceneMetro from "@/assets/scene-metro.jpg";
import sceneBrickwall from "@/assets/scene-brickwall.jpg";
import logoPagars from "@/assets/logo-pagars.png";

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
type Bg =
  | { name: string; label: string; type: "color"; color: string }
  | { name: string; label: string; type: "image"; src: string; fallback: string };

const BACKGROUNDS: Bg[] = [
  { name: "Paper", label: "WHT", type: "color", color: "#ffffff" },
  { name: "Cream", label: "CRM", type: "color", color: "#f3ead4" },
  { name: "Concrete", label: "CON", type: "color", color: "#a4a8ad" },
  { name: "Subway", label: "SUB", type: "color", color: "#1a1a1a" },
  { name: "Bus Stop", label: "BUS", type: "image", src: sceneBusstop, fallback: "#2a2e36" },
  { name: "Metro Cab", label: "MET", type: "image", src: sceneMetro, fallback: "#cfc7b6" },
  { name: "Brick Wall", label: "BRK", type: "image", src: sceneBrickwall, fallback: "#7a3a2a" },
];

// ─── Brush variants ───────────────────────────────────────────────────────────
type BrushId = "marker" | "fineliner" | "spray" | "drip" | "chalk";
const BRUSHES: { id: BrushId; name: string; tag: string }[] = [
  { id: "marker", name: "Fat Marker", tag: "MKR" },
  { id: "fineliner", name: "Fineliner", tag: "FNE" },
  { id: "spray", name: "Spray Can", tag: "SPR" },
  { id: "drip", name: "Drip Marker", tag: "DRP" },
  { id: "chalk", name: "Chalk", tag: "CHK" },
];

// ─── Style catalog ────────────────────────────────────────────────────────────
type StyleId =
  | "bomber"
  | "throwup"
  | "wildstyle"
  | "blockbuster"
  | "handstyle"
  | "brush"
  | "chrome"
  | "sticker"
  | "neon"
  | "threed"
  | "oldschool"
  | "stencil"
  | "anime"
  | "calligraphy"
  | "bubble"
  | "tribal"
  | "halftone"
  | "script";

const STYLES: { id: StyleId; name: string; tag: string; desc: string; sample: string }[] = [
  { id: "bomber", name: "Bomber", tag: "NYC", desc: "Fat-marker, drips, whips.", sample: "TAG" },
  { id: "throwup", name: "Throw-Up", tag: "2T", desc: "Quick bubble piece.", sample: "TUP" },
  { id: "wildstyle", name: "Wildstyle", tag: "PRO", desc: "Interlocking arrows.", sample: "WLD" },
  { id: "blockbuster", name: "Blockbuster", tag: "BIG", desc: "Massive block letters.", sample: "BIG" },
  { id: "handstyle", name: "Handstyle", tag: "TAG", desc: "One-shot signature.", sample: "Sig" },
  { id: "brush", name: "Brush", tag: "INK", desc: "Heavy ink calligraphy.", sample: "墨" },
  { id: "chrome", name: "Chrome", tag: "SLV", desc: "Polished silver fill.", sample: "CHR" },
  { id: "sticker", name: "Sticker", tag: "SLP", desc: "Marker on slap label.", sample: "SLP" },
  { id: "neon", name: "Neon", tag: "GLW", desc: "Glowing tubes, halo.", sample: "GLW" },
  { id: "threed", name: "3D Pop", tag: "3D", desc: "Extruded blocks.", sample: "3D" },
  { id: "oldschool", name: "Old School", tag: "80s", desc: "Soft-serve, fade.", sample: "80s" },
  { id: "stencil", name: "Stencil", tag: "BNK", desc: "Sharp cut edges.", sample: "STN" },
  { id: "anime", name: "Anime", tag: "JPN", desc: "Cel-shaded manga.", sample: "アニ" },
  { id: "calligraphy", name: "Calligraphy", tag: "CAL", desc: "Sharp gothic strokes.", sample: "Cal" },
  { id: "bubble", name: "Bubble", tag: "BBL", desc: "Soft round, candy fill.", sample: "Bub" },
  { id: "tribal", name: "Tribal", tag: "TRB", desc: "Sharp angular flow.", sample: "TRB" },
  { id: "halftone", name: "Halftone", tag: "DOT", desc: "Comic dots, pop print.", sample: "DOT" },
  { id: "script", name: "Script", tag: "SCR", desc: "Flowing cursive script.", sample: "Scr" },
];

function StylePreview({ id, sample }: { id: StyleId; sample: string }) {
  const base = "flex h-10 w-10 shrink-0 items-center justify-center rounded-md overflow-hidden text-[13px] leading-none";
  switch (id) {
    case "bomber":
      return <div className={cn(base, "bg-white text-black font-tag -skew-x-6")}>{sample}</div>;
    case "throwup":
      return <div className={cn(base, "bg-zinc-200 text-zinc-900 font-tag")} style={{ WebkitTextStroke: "1.2px black" }}>{sample}</div>;
    case "wildstyle":
      return <div className={cn(base, "bg-black text-white font-shout text-[10px]")}>{sample}</div>;
    case "blockbuster":
      return <div className={cn(base, "bg-zinc-900 text-yellow-300 font-display font-black tracking-tighter")}>{sample}</div>;
    case "handstyle":
      return <div className={cn(base, "bg-stone-100 text-black font-tag italic")}>{sample}</div>;
    case "brush":
      return <div className={cn(base, "bg-stone-50 text-black")} style={{ fontFamily: "serif", fontWeight: 900 }}>{sample}</div>;
    case "chrome":
      return <div className={cn(base, "font-display font-black tracking-tight bg-zinc-800")} style={{ background: "linear-gradient(180deg,#e5e7eb,#6b7280 50%,#1f2937)", color: "transparent", WebkitBackgroundClip: "text" }}>{sample}</div>;
    case "sticker":
      return <div className={cn(base, "bg-white text-black font-tag border-2 border-dashed border-black/40")}>{sample}</div>;
    case "neon":
      return <div className={cn(base, "bg-black font-tag")} style={{ color: "#ff5cf0", textShadow: "0 0 6px #ff5cf0, 0 0 12px #ff5cf0" }}>{sample}</div>;
    case "threed":
      return <div className={cn(base, "bg-zinc-900 text-white font-display font-black")} style={{ textShadow: "2px 2px 0 #d4271f, 3px 3px 0 #000" }}>{sample}</div>;
    case "oldschool":
      return <div className={cn(base, "bg-amber-50 text-fuchsia-700 font-tag")}>{sample}</div>;
    case "stencil":
      return <div className={cn(base, "bg-stone-300 text-black font-display font-black tracking-tighter")}>{sample}</div>;
    case "anime":
      return <div className={cn(base, "bg-rose-100 text-rose-700 font-display font-black text-[11px]")} style={{ WebkitTextStroke: "0.8px black" }}>{sample}</div>;
    case "calligraphy":
      return <div className={cn(base, "bg-stone-900 text-amber-100")} style={{ fontFamily: "serif", fontWeight: 900, fontStyle: "italic" }}>{sample}</div>;
    case "bubble":
      return <div className={cn(base, "bg-pink-100 text-pink-600 font-tag")} style={{ WebkitTextStroke: "1px #be185d" }}>{sample}</div>;
    case "tribal":
      return <div className={cn(base, "bg-black text-white font-shout text-[9px]")}>{sample}</div>;
    case "halftone":
      return <div className={cn(base, "text-black font-display font-black")} style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1.4px)", backgroundSize: "4px 4px", backgroundColor: "#fef08a" }}>{sample}</div>;
    case "script":
      return <div className={cn(base, "bg-zinc-100 text-black italic")} style={{ fontFamily: "cursive", fontWeight: 700 }}>{sample}</div>;
  }
}

function PagarsArtLab() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const activePointers = useRef<Set<number>>(new Set());
  const drawingPointerId = useRef<number | null>(null);

  const [markerIdx, setMarkerIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [styleId, setStyleId] = useState<StyleId>("bomber");
  const [brushType, setBrushType] = useState<BrushId>("marker");
  const [brush, setBrush] = useState(12);
  const [fidelity, setFidelity] = useState(0.7);
  const [influence, setInfluence] = useState(8);
  const [busy, setBusy] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(1);

  const bg = BACKGROUNDS[bgIdx];
  const bgFill = bg.type === "color" ? bg.color : bg.fallback;
  const markerColor = MARKERS[markerIdx].color;

  // Paint background (color or scene image) into the canvas
  const paintBackground = useCallback((b: Bg) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (b.type === "color") {
      ctx.fillStyle = b.color;
      ctx.fillRect(0, 0, c.width, c.height);
      return;
    }
    // Image scene — fill fallback first, then cover-fit the photo
    ctx.fillStyle = b.fallback;
    ctx.fillRect(0, 0, c.width, c.height);
    const img = new Image();
    img.onload = () => {
      const cw = c.width;
      const ch = c.height;
      const r = Math.max(cw / img.width, ch / img.height);
      const w = img.width * r;
      const h = img.height * r;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };
    img.src = b.src;
  }, []);

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
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (prev) {
        const tmp = document.createElement("canvas");
        tmp.width = prev.width;
        tmp.height = prev.height;
        tmp.getContext("2d")!.putImageData(prev, 0, 0);
        ctx.drawImage(tmp, 0, 0, w, h);
      } else {
        // First mount — paint initial background scene if any
        paintBackground(BACKGROUNDS[bgIdx]);
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

  // Per-brush stroke between two points
  const strokeSegment = (
    ctx: CanvasRenderingContext2D,
    a: { x: number; y: number },
    b: { x: number; y: number },
    sizePx: number,
  ) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (brushType === "marker") {
      ctx.globalAlpha = 1;
      ctx.lineWidth = sizePx;
      ctx.strokeStyle = markerColor;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      return;
    }
    if (brushType === "fineliner") {
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(1, sizePx * 0.35);
      ctx.strokeStyle = markerColor;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      return;
    }
    if (brushType === "drip") {
      ctx.globalAlpha = 1;
      ctx.lineWidth = sizePx;
      ctx.strokeStyle = markerColor;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // Occasional drip
      if (Math.random() < 0.04) {
        const dripLen = sizePx * (3 + Math.random() * 6);
        ctx.lineWidth = sizePx * 0.55;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + (Math.random() - 0.5) * sizePx, b.y + dripLen);
        ctx.stroke();
      }
      return;
    }
    if (brushType === "spray") {
      // Soft semi-transparent core + scattered dots
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = sizePx;
      ctx.strokeStyle = markerColor;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = markerColor;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const steps = Math.ceil(dist / 2);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const cx = a.x + dx * t;
        const cy = a.y + dy * t;
        for (let s = 0; s < 6; s++) {
          const r = sizePx * (0.4 + Math.random() * 1.2);
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * sizePx * 0.6;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (brushType === "chalk") {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = sizePx * 0.9;
      ctx.strokeStyle = markerColor;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const steps = Math.ceil(dist / 2);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const cx = a.x + dx * t + (Math.random() - 0.5) * sizePx * 0.4;
        const cy = a.y + dy * t + (Math.random() - 0.5) * sizePx * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, sizePx * 0.45 * Math.random(), 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    snapshot();
    drawing.current = true;
    lastPt.current = getPos(e);
    // Make a tiny dot on tap
    const ctx = canvasRef.current!.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const p = lastPt.current;
    strokeSegment(ctx, p, p, brush * dpr);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    const last = lastPt.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    strokeSegment(ctx, last, p, brush * dpr);
    lastPt.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    lastPt.current = null;
  };

  const clearCanvas = () => {
    snapshot();
    paintBackground(BACKGROUNDS[bgIdx]);
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
    snapshot();
    paintBackground(BACKGROUNDS[i]);
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
              className="h-4 w-4 rounded-sm border border-black/30 bg-cover bg-center"
              style={{
                background:
                  b.type === "color"
                    ? b.color
                    : `url(${b.src}) center/cover`,
              }}
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

  const BrushTypeRow = (
    <div>
      <PanelLabel>Brush</PanelLabel>
      <div className="grid grid-cols-5 gap-1.5">
        {BRUSHES.map((b) => {
          const active = brushType === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setBrushType(b.id)}
              title={b.name}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 transition-colors",
                active
                  ? "border-[oklch(0.78_0.19_75)] bg-[oklch(0.78_0.19_75)]/10 text-white"
                  : "border-white/10 text-white/60 hover:border-white/30 hover:text-white/90",
              )}
            >
              <span className="font-mono text-[9px] tracking-wider">{b.tag}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
        {BRUSHES.find((b) => b.id === brushType)!.name}
      </div>
    </div>
  );

  const SlidersBlock = (
    <div className="space-y-3">
      <ControlSlider
        label="Size"
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
    <div className="relative flex h-screen flex-col bg-background text-foreground md:flex-row">
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
      <aside
        className={cn(
          "hidden md:flex md:h-full md:shrink-0 md:flex-col md:border-r md:border-white/10 md:transition-all md:duration-200",
          sidebarOpen ? "md:w-[300px]" : "md:w-0 md:overflow-hidden md:border-r-0",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex items-center gap-1">
            {TutorialButton}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white/60 hover:bg-white/5 hover:text-white"
              onClick={() => setSidebarOpen(false)}
              title="Hide toolbar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {MarkerRow}
          {BrushTypeRow}
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

      {/* Floating reopen button — desktop only, when sidebar hidden */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Show toolbar"
          className="absolute left-3 top-3 z-20 hidden h-10 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 text-xs font-mono uppercase tracking-wider text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-black/85 md:flex"
        >
          <PanelLeftOpen className="h-4 w-4" />
          Tools
        </button>
      )}

      {/* ───────── Mobile header ───────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 md:hidden">
        <Logo compact />
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/80 hover:bg-white/5 hover:text-white"
            onClick={triggerUpload}
            title="Upload tag"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/80 hover:bg-white/5 hover:text-white"
            onClick={exportPng}
            title="Export PNG"
          >
            <Download className="h-4 w-4" />
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
              onClick={triggerUpload}
              className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={exportPng}
              className="h-7 gap-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" /> PNG
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
          style={{ background: bgFill }}
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
          {/* Floating Undo FAB — top-right of canvas */}
          <button
            onClick={undo}
            title="Undo last stroke"
            className="absolute right-3 top-3 z-10 flex h-12 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 text-sm font-mono uppercase tracking-wider text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-black/85 active:scale-95"
          >
            <Undo2 className="h-5 w-5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
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
              {BrushTypeRow}
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
    <div className="flex items-center gap-2 select-none">
      <img
        src={logoPagars}
        alt="Pagar's Art Lab"
        draggable={false}
        className={cn(
          "object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]",
          compact ? "h-12 w-auto" : "h-16 w-auto",
        )}
      />
      <div className="hidden text-[9px] font-mono uppercase tracking-[0.25em] text-white/40 sm:block">
        EST · 2026
        <br />
        BOMB SQUAD
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
        {/* ── Mis see äpp on ── */}
        <div className="rounded-lg border border-[oklch(0.85_0.19_75)]/30 bg-[oklch(0.85_0.19_75)]/5 p-4">
          <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[oklch(0.85_0.19_75)]">
            Mis see on
          </div>
          <h3 className="font-display text-lg font-bold tracking-tight">
            Pagar's Art Lab — AI graffiti tag generaator
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-white/70">
            Joonista oma tag käsitsi (või laadi üles foto seinast / paberist),
            vali stiil ja taust ning AI muudab su visandi puhtaks
            professionaalse writeri tag'iks. Lae tulemus alla PNG-na ja kasuta
            edasi kus iganes.
          </p>
        </div>

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

        {/* ── Install as app ── */}
        <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
          <div>
            <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[oklch(0.85_0.19_75)]">
              Install as app
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              Lisa avalehele nagu päris äpp
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Lovable veebileht töötab ka offline-ikoonina sinu telefonis — täisekraan, ilma brauseri ribata.
            </p>
          </div>

          <InstallStep
            badge="iOS"
            title="iPhone / iPad — Safari"
            steps={[
              "Ava see leht Safaris (mitte Chrome'is — Apple lubab installida ainult Safarist).",
              "Vajuta all keskel Share-nuppu (ruut, millest nool üles).",
              "Keri alla ja vali „Add to Home Screen“ / „Lisa avakuvale“.",
              "Kinnita „Add“ — ikoon ilmub avakuvale ja avaneb täisekraanil.",
            ]}
          />

          <InstallStep
            badge="Android"
            title="Android — Chrome"
            steps={[
              "Ava leht Chrome'is.",
              "Vajuta paremal üleval kolme täpiga menüüd.",
              "Vali „Install app“ / „Add to Home screen“ / „Lisa avakuvale“.",
              "Kinnita „Install“ — ikoon ilmub avakuvale ja töötab nagu eraldi äpp.",
            ]}
          />

          <p className="text-[11px] leading-relaxed text-white/40">
            Märkus: AI-tagi tegemiseks on alati vaja internetti — see pole päris offline-äpp,
            küll aga kiirem ja puhtam kui brauseri vahekaart.
          </p>
        </div>

        {/* ── Kasuta tag'i mujal ── */}
        <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
          <div>
            <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.25em] text-[oklch(0.85_0.19_75)]">
              Kasuta mujal
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              Mida valmis tag'iga peale hakata
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Iga "Bomb it" tulemuse saab alla laadida PNG-failina (läbipaistva
              või valge taustaga, sõltuvalt valitud taustast) ja kasutada
              kõikjal kus pilte vaja.
            </p>
          </div>

          <UseCase
            title="Sotsiaalmeedia & profiilipilt"
            body="Lae PNG alla → kasuta Instagrami / TikToki / Discordi avatarina, story stickeritena või postituse pildina. Valge taust sobib feedi, must taust profiilipildiks."
          />
          <UseCase
            title="Prindi: särk, kleeps, plakat"
            body="Saada PNG printerisse või üles DTF / vinüül-kleepsude tegijale (nt Printful, Redbubble, kohalik trükikoda). Resolutsioon on piisav A4 / särgiprindi jaoks."
          />
          <UseCase
            title="Foto peale (Photoshop / Canva / CapCut)"
            body={`Ava oma foto (sein, vagun, peatus) Photoshopis või Canvas → lisa tag PNG kihina peale → sea blend mode "Multiply" (valgel taustal) või lihtsalt "Normal" (läbipaistval). Saad fotorealistliku graffiti.`}
          />
          <UseCase
            title="Video & montaaž"
            body="CapCut, Premiere või DaVinci — lisa PNG overlay'na klipi peale, animeeri sisse-välja. Sobib hästi music video / vlog intro jaoks."
          />
          <UseCase
            title="Logo, märgid, mängud"
            body="Kasuta tag'i bändi logona, Twitchi overlay'na, Minecrafti / Robloxi tekstuurina või oma veebilehe pealkirjana. PNG töötab kõikjal kus pilte toetatakse."
          />

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[oklch(0.85_0.19_75)]">
              Pro tip
            </div>
            <p className="text-xs leading-relaxed text-white/70">
              Kui tahad tag'i foto peale panna ilma valge ristkülikuta:
              vali joonistades must taust („Subway") — siis on AI tulemus juba
              valmis kontrastse pildina, mille saab Photoshopis "Screen" blend
              mode'iga otse seina peale lisada.
            </p>
          </div>
        </div>
      </div>
    </SheetContent>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <h4 className="font-display text-sm font-bold tracking-tight text-white/90">
        {title}
      </h4>
      <p className="mt-1 text-[12px] leading-relaxed text-white/65">{body}</p>
    </div>
  );
}

function _CloseTutorialContent() {
  return null;
}

function InstallStep({
  badge,
  title,
  steps,
}: {
  badge: string;
  title: string;
  steps: string[];
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.2em] text-white/80">
          {badge}
        </span>
        <h4 className="font-display text-sm font-bold tracking-tight">{title}</h4>
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-white/70">
            <span className="font-mono text-[oklch(0.85_0.19_75)]">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
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
