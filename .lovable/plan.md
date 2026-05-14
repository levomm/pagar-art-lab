# Metro Bomber – AI Tag Enhancer

Veebiäpp, kus joonistad oma graffiti tag'i lõuendile (canvas) ja AI muudab selle elavamaks, voolavamaks ja autentse street-bomber stiiliga — säilitades su algse tähekuju.

## Mida ehitan

**Üks leht, must taust (Linear-laadne dark UI):**
- Vasakul: joonistuslõuend (canvas, valge taust, must marker)
  - Pintsli paksuse slider (2–20px)
  - "Clear" ja "Undo" nupud
- Paremal: tulemuse paneel (AI-genereeritud bomber tag)
  - "Enhance"-nupp (saadab joonistuse AI-le)
  - "Download PNG" nupp
- All: täpsemad sätted (collapsible)
  - **Image Fidelity** slider (0.30–0.50, vaikimisi 0.40) — kui palju AI sinu joont muuta tohib
  - **Prompt Influence** slider (7.0–9.0, vaikimisi 8.0)
  - Prompt ja negative prompt on koodis fikseeritud (sinu Metro Bomber spec), kasutaja neid ei näe

## Kuidas AI töötab

Kasutan **Lovable AI Gateway** (Lovable Cloud) mudeliga `google/gemini-2.5-flash-image` (Nano Banana) image-editing režiimis:

- Saadan kasutaja canvas joonistuse (base64 PNG) + sinu Metro Bomber prompti
- Mudel saab pildi sisendiks ja teeb image-to-image — säilitab kompositsiooni, lisab dünaamilise pressuuri, drippsid, tapered ends
- Negative prompt lisatakse prompti teksti sisse ("avoid: 3D, bubble letters, shadows, colorful…")

**Märkus mudeli kohta:** Nano Banana ei toeta otseseid CFG/denoising arvulisi parameetreid nagu Stable Diffusion. Selle asemel "tõlgin" sinu sliderite väärtused prompti tugevuseks (nt madal fidelity → "subtly enhance, preserve every stroke exactly"; kõrgem → "transform with bold bomber styling while keeping letter shapes"). See annab praktikas sama kontrolli.

## Tehniline pool

- **Stack:** TanStack Start (olemasolev), React, Tailwind, dark teema
- **Canvas:** HTML5 `<canvas>` pointer-eventidega (toetab hiir + puutetundlik ekraan)
- **Backend:** üks server function `enhanceTag.functions.ts`, mis kutsub AI Gateway'd
- **Cloud:** Lülitan sisse Lovable Cloud (vajalik `LOVABLE_API_KEY` jaoks) — andmebaasi pole vaja, ainult AI gateway

## Failistruktuur

```
src/routes/index.tsx              # põhileht (canvas + tulemus)
src/components/DrawCanvas.tsx     # joonistuslõuend
src/components/ResultPanel.tsx    # AI tulemuse kuvamine + download
src/components/Controls.tsx       # sliderid + nupud
src/lib/enhanceTag.functions.ts   # server fn → Lovable AI Gateway
src/styles.css                    # dark bomber-teema tokens
```

## Mida ei tee
- Pole login'i, andmebaasi ega salvestamist (ainult download)
- Pole galleriid varasematest tag'idest (saame lisada hiljem soovi korral)
- Pole värvivalikut — must marker valgel taustal (autentne bomber)
