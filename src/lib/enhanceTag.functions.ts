import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const STYLES = [
  "bomber",
  "throwup",
  "wildstyle",
  "blockbuster",
  "handstyle",
  "brush",
  "chrome",
  "sticker",
  "neon",
  "threed",
  "oldschool",
  "stencil",
  "anime",
  "calligraphy",
  "bubble",
  "tribal",
  "halftone",
  "script",
] as const;
type Style = (typeof STYLES)[number];

const inputSchema = z.object({
  imageDataUrl: z.string().min(20),
  fidelity: z.number().min(0.2).max(1.0),
  influence: z.number().min(5).max(10),
  style: z.enum(STYLES).default("bomber"),
});

const NEGATIVE =
  "amateur, child drawing, pencil sketch, wobbly lines, jagged edges, anti-aliasing artifacts, blurry, low resolution, watermark, text caption, frame, border";

const STYLE_BRIEFS: Record<Style, string> = {
  bomber:
    "NYC subway / Parisian metro BOMBER handstyle. Solid black fat-marker ink. Aggressive lean, dramatic whips and tails, hanging gravity drips, compact rhythmic flow. Pure 2D silhouette on flat white background.",
  throwup:
    "Classic THROW-UP / bubble piece. Bold rounded outline with a flat fill color and a 2-tone outline accent. Quick subway-style execution, slight lean, simple but punchy. Keep colors from the input if present, otherwise default to black outline + silver fill.",
  wildstyle:
    "WILDSTYLE piece. Interlocking arrows, bars and tags. Sharp angular construction, complex letter connections, layered outlines (inline + outline + 3D shadow). High craft, NYC king-level execution.",
  blockbuster:
    "BLOCKBUSTER style. Massive bold geometric block letters, perfectly straight edges, flat solid fill with a single contrasting outline. Wide stance, monumental presence, freight-train energy.",
  handstyle:
    "Pure HANDSTYLE / signature tag. One-shot fluid calligraphic gesture with a fat marker. Dramatic ligatures, long tails, hanging drips. Confident veteran writer flow.",
  brush:
    "BRUSH calligraphy / Eastern-influenced graffiti. Heavy ink-loaded brush strokes, dramatic pressure variation, sharp tapered tips, expressive wabi-sabi energy on a clean background.",
  chrome:
    "CHROME / SILVER piece. Polished metallic silver fill with sharp black outline and bold black drop-shadow. Crisp highlights and reflections that read as brushed steel. Classic NYC subway chrome panel energy.",
  sticker:
    "STICKER / SLAP style tag. Bold marker drawing on a white slap label with a die-cut border. Loose handstyle with a small character or arrow. Skater / writer slap-tag culture, photo-real label texture.",
  neon:
    "NEON SIGN tag. Letters rendered as glowing glass neon tubes — saturated electric color, soft outer halo bloom, dark background, visible tube terminations. Cinematic late-night street feel.",
  threed:
    "3D POP / dimensional piece. Heavy block letters extruded into deep 3D with strong perspective, dramatic side-shadow, hard inline highlight, bold outline. Looks carved out of the wall.",
  oldschool:
    "OLD SCHOOL 80s subway piece. Rounded soft-serve letters, cloud-fill drips, bubble outline, two-tone fade, classic old-school NYC train color combos. Style Wars era authenticity.",
  stencil:
    "STENCIL street-art tag. Sharp clean edges as if cut from cardboard, slight overspray haze around letters, single flat color on aged surface, Banksy-era urban stencil energy.",
  anime:
    "ANIME / MANGA style graffiti tag. Bold cel-shaded letters with crisp ink outlines, flat vibrant cel colors and a single sharp highlight. Dynamic speedlines or sparkle accents, screentone/halftone fills, slight glow. Reads as a Shonen action-title logo painted as a graffiti piece.",
  calligraphy:
    "CALLIGRAPHY graffiti tag. Sharp gothic blackletter strokes with dramatic pressure variation, hairline-to-thick contrast, ornate flourishes and serifs. Inked feel, deep black on warm parchment-tone background.",
  bubble:
    "BUBBLE letter tag. Soft round inflated letterforms with thick clean outline and a glossy candy-color fill plus a single highlight. Playful 70s-80s NYC throw-up energy, cheerful and bouncy.",
  tribal:
    "TRIBAL graffiti tag. Sharp angular blade-like letterforms with interlocking pointed flourishes, jagged flame tips, high-contrast black silhouette with thin red accent lines. Polynesian / tribal-tattoo aesthetic fused with handstyle.",
  halftone:
    "HALFTONE COMIC POP tag. Bold display letters filled with classic CMYK Ben-Day halftone dots, thick black outline, comic-book Lichtenstein pop-art energy on a flat color background.",
  script:
    "SCRIPT cursive tag. Flowing connected cursive handwriting, elegant loops and tails, fluid pen-pressure variation, signature-style elegance. Reads like a tattoo-shop hand-lettering piece.",
};

function buildPrompt(style: Style, fidelity: number, influence: number) {
  const fidelityHint =
    fidelity < 0.4
      ? "Keep letter identity and reading order, but RESTYLE every stroke as professional graffiti. Replace shaky pixels with smooth confident lines."
      : fidelity < 0.7
      ? "AGGRESSIVELY restyle. Keep letter recognition only — redraw every line with master-level confidence and flow."
      : "MAXIMUM transformation. Use the input ONLY as a letter-recognition reference — re-imagine the tag as a finished masterpiece by a world-famous writer.";

  const influenceHint =
    influence >= 8.5
      ? "Strictly follow the chosen style — no deviations."
      : "Follow the chosen style with minor interpretive freedom.";

  return `You are a master graffiti writer cleaning up and restyling a fellow writer's hand-drawn tag.

STYLE: ${STYLE_BRIEFS[style]}

${fidelityHint}
${influenceHint}

Treat the input as a CONCEPT SKETCH. The output must look like a finished piece by a 20-year veteran — never like a traced sketch.

ESSENTIAL QUALITY:
- Buttery-smooth professional lines, zero wobble, zero pixelation
- High-velocity confident execution
- Aggressive dynamic pressure and weight where appropriate to the style
- Vector-clean edges at maximum resolution
- Output should be a single high-resolution image with comfortable margin

If the input uses colors, RESPECT and RESTYLE them. If the input is monochrome, keep it monochrome.

NEVER do: ${NEGATIVE}`;
}

export const enhanceTag = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { image: null as string | null, error: "GEMINI_API_KEY is not configured." };
    }

    const prompt = buildPrompt(data.style, data.fidelity, data.influence);

    const match = data.imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) return { image: null, error: "Invalid image data." };
    const mimeType = match[1];
    const b64 = match[2];

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: b64 } },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Gemini API error", response.status, text);
        if (response.status === 429) {
          return { image: null, error: "Rate limit reached. Wait a moment and try again." };
        }
        if (response.status === 401 || response.status === 403) {
          return { image: null, error: "Invalid Gemini API key." };
        }
        return { image: null, error: `Gemini API error (${response.status}).` };
      }

      const json = await response.json();
      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p?.inline_data?.data || p?.inlineData?.data);
      const inline = imgPart?.inline_data ?? imgPart?.inlineData;

      if (!inline?.data) {
        console.error("No image in Gemini response", JSON.stringify(json).slice(0, 500));
        return { image: null, error: "AI did not return an image. Try again." };
      }

      const outMime = inline.mime_type ?? inline.mimeType ?? "image/png";
      return { image: `data:${outMime};base64,${inline.data}`, error: null as string | null };
    } catch (err) {
      console.error("enhanceTag failed", err);
      return { image: null, error: "Request failed. Check your connection and try again." };
    }
  });
