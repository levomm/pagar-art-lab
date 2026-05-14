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
      ? "Preserve exact letter shapes and composition. Refine the lines: smooth out wobble, unify stroke transitions, add subtle flow."
      : fidelity < 0.7
      ? "Keep letter identity and reading order, but completely RESTYLE every stroke as a confident professional handstyle. Replace every shaky pixel with smooth, flowing calligraphic ink."
      : "Aggressively restyle with master-level bomber energy. Keep only the letter recognition and overall composition — redraw every line as if a veteran writer hit it in one fluid motion.";

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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { image: null as string | null, error: "LOVABLE_API_KEY is not configured." };
    }

    const prompt = buildPrompt(data.fidelity, data.influence);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: data.imageDataUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return { image: null, error: "Rate limit reached. Please wait a moment and try again." };
        }
        if (response.status === 402) {
          return { image: null, error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." };
        }
        const text = await response.text();
        console.error("AI gateway error", response.status, text);
        return { image: null, error: `AI gateway error (${response.status}).` };
      }

      const json = await response.json();
      const image: string | undefined =
        json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!image) {
        console.error("No image in response", JSON.stringify(json).slice(0, 500));
        return { image: null, error: "AI did not return an image. Try again." };
      }

      return { image, error: null as string | null };
    } catch (err) {
      console.error("enhanceTag failed", err);
      return { image: null, error: "Request failed. Check your connection and try again." };
    }
  });
