import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string().min(20),
  fidelity: z.number().min(0.2).max(1.0),
  influence: z.number().min(5).max(10),
});

const NEGATIVE =
  "3D, bubble letters, shadows, colorful, messy, blurry, low resolution, bevel, emboss, cartoon, glow, gradients, soft edges, watercolor, jagged edges, shaky lines, child drawing, amateur, pencil sketch, rough pixels, anti-aliasing artifacts";

function buildPrompt(fidelity: number, influence: number) {
  // Higher fidelity = more aggressive restyling/smoothing.
  const fidelityHint =
    fidelity < 0.4
      ? "Keep letter identity and reading order, but completely RESTYLE every stroke as a confident professional handstyle. Replace every shaky pixel with smooth, flowing calligraphic ink."
      : fidelity < 0.7
      ? "AGGRESSIVELY restyle with master-level bomber energy. Keep only the letter recognition — redraw every line as one fluid motion by a veteran writer. Add bold whips, hooks, ligatures, and dramatic drips."
      : "MAXIMUM bomber transformation. Use the input ONLY as a letter-recognition reference — completely re-imagine the tag as if a world-famous NYC subway king redrew it. Add aggressive lean, dramatic whips and tails, hanging drips, and explosive bomber flow. The result must look NOTHING like a sketch — it must look like a finished masterpiece.";

  const influenceHint =
    influence >= 8.5
      ? "Strictly follow the bomber handstyle aesthetic — no deviations, no ornamentation."
      : "Follow the bomber handstyle aesthetic with minor interpretive freedom.";

  return `You are a master graffiti writer cleaning up and restyling a fellow writer's hand-drawn tag.

${fidelityHint}
${influenceHint}

Treat the input as a CONCEPT SKETCH, not a final drawing. The output must look like it was hit in ONE confident motion by a 20-year veteran with a fat marker — never like the sketch was simply traced.

ESSENTIAL STYLE:
- Buttery-smooth, perfectly fluid ink lines — zero wobble, zero jaggedness, zero pixelation
- High-velocity calligraphic flow: every curve feels like a single fast wrist movement
- Aggressive dynamic pressure: bold thick downstrokes, hairline thin connectors, sharp tapered tips and tails
- Confident hooks, whips, and ligatures connecting letters where the original implies them
- Long dramatic gravity-defying ink drips hanging from the bottom of vertical strokes
- Compact, leaning, rhythmic composition with attitude — NYC subway / Parisian metro bomber energy
- Solid jet-black ink on pure flat white — no grey, no texture, no halftones
- Pure 2D silhouette — no 3D, no shadow, no glow, no color, no bubble letters, no outline, no bevel
- Vector-clean edges at maximum resolution

NEVER do: ${NEGATIVE}

Output: a single clean high-resolution image of the restyled tag on a solid white background with comfortable margin.`;
}

export const enhanceTag = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { image: null as string | null, error: "GEMINI_API_KEY is not configured." };
    }

    const prompt = buildPrompt(data.fidelity, data.influence);

    // Strip data URL prefix → raw base64 + mime
    const match = data.imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return { image: null, error: "Invalid image data." };
    }
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
