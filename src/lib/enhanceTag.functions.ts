import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string().min(20),
  fidelity: z.number().min(0.2).max(0.6),
  influence: z.number().min(5).max(10),
});

const NEGATIVE = "3D, bubble letters, shadows, colorful, messy, blurry, low resolution, bevel, emboss, cartoon, glow, gradients, soft edges, watercolor";

function buildPrompt(fidelity: number, influence: number) {
  // Translate slider knobs into prompt strength words
  const fidelityHint =
    fidelity < 0.35
      ? "Preserve every stroke and letter shape exactly as drawn — only refine and clean the existing line."
      : fidelity < 0.45
      ? "Keep the original letter shapes and composition intact while enhancing flow and pressure."
      : "Honor the original letter shapes but boldly transform line quality with bomber-style energy.";

  const influenceHint =
    influence >= 8.5
      ? "Strictly follow the bomber handstyle aesthetic, no deviations."
      : "Follow the bomber handstyle aesthetic with minor interpretive freedom.";

  return `Transform this hand-drawn graffiti tag into a professional street art handstyle "bomber" tag.

${fidelityHint}
${influenceHint}

Style requirements:
- Authentic urban bomber aesthetic, raw street calligraphy
- High-velocity fluid strokes with perfect flow and rhythm
- Sharp, clean ink marker lines with dynamic pressure: thick downstrokes, thin connectors, tapered ends
- Natural gravity-defying ink drips at the bottom of vertical strokes
- Aggressive rhythmic composition, high contrast
- Solid black ink on pure white background
- Minimalist, bold, no decoration
- Pure 2D silhouette — no 3D, no shadows, no glow, no color, no bubble letters, no bevel

Avoid: ${NEGATIVE}

Output: a clean high-resolution image of the enhanced tag on a solid white background.`;
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
