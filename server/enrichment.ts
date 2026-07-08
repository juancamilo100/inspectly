import type OpenAI from "openai";
import { getDocumentProxy, extractText, extractImages } from "unpdf";

// Two-stage image enrichment for inspection-report analysis.
//
// Stage 1: extract per-page text + embedded photos from the PDF (unpdf — pure
//   JS, serverless-safe), filter decorative images, prioritize photos on
//   defect-flagged pages, cap the count, and encode to small JPEGs (sharp).
// Stage 2: describe photos in batches with gpt-4o-mini at LOW detail. Mini has
//   its own (much larger) rate-limit pool, so this never competes with the
//   gpt-4o battlecard call. The prompt asks for defect-relevant observations
//   ONLY — including issues the caption/inspector did not mention — so the
//   enriched text stays small enough for the final call's token budget.
//
// The result is the report text with [PHOTO OBSERVATIONS — page N] blocks
// woven in per page, ready for the existing text-analysis battlecard call.

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
const MAX_PHOTOS = 150;
const BATCH_SIZE = 12;
const CONCURRENT_BATCHES = 3;
const JPEG_MAX_DIM = 512;
const JPEG_QUALITY = 72;
const MAX_RETRIES = 4;

const DEFECT_KEYWORDS =
  /defic|repair|replace|damag|leak|crack|safety|hazard|recommend|moisture|rot\b|corro|improper|missing|fail|worn|deterior|infest|termite|insect|mold|stain/i;

interface ExtractedPhoto {
  page: number;
  width: number;
  height: number;
  raw: { data: Uint8ClampedArray; width: number; height: number; channels: number };
}

interface EncodedPhoto {
  page: number;
  jpegBase64: string;
  pageContext: string;
}

export interface EnrichmentStats {
  pages: number;
  photosFound: number;
  photosDescribed: number;
  observations: number;
  batches: number;
  retries: number;
  promptTokens: number;
  completionTokens: number;
  ms: number;
}

export interface EnrichmentResult {
  enrichedText: string;
  stats: EnrichmentStats;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function retryDelayMs(err: unknown, attempt: number): number | null {
  const status = (err as { status?: number } | null)?.status;
  // Retry only rate limits and transient server errors.
  if (status !== 429 && status !== 500 && status !== 502 && status !== 503) return null;
  const headers = (err as { headers?: Record<string, string> } | null)?.headers;
  const retryAfter = Number(headers?.["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 30000);
  return Math.min(4000 * 2 ** (attempt - 1), 30000) + Math.floor(Math.random() * 1000);
}

/**
 * Build enriched report text (page text + photo observations) from a PDF.
 * Throws on unrecoverable failure — the caller falls back to plain text.
 */
export async function buildEnrichedReportText(
  openai: OpenAI,
  pdfBuffer: Buffer,
  fileName: string,
  deadlineMs = 165000,
): Promise<EnrichmentResult> {
  const start = Date.now();
  // sharp is a native module: import dynamically so a missing/broken binary
  // degrades this feature to plain-text analysis instead of crashing the app
  // at module load (the pdf-parse lesson).
  const sharp = (await import("sharp")).default;

  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const { text: pageTexts } = await extractText(pdf, { mergePages: false });
  const pages = pdf.numPages;

  // ── Stage 1a: collect + filter photos ────────────────────────────────────
  const photos: ExtractedPhoto[] = [];
  const seenKeys = new Set<string>();
  for (let p = 1; p <= pages; p++) {
    const imgs = await extractImages(pdf, p).catch(() => [] as never[]);
    for (const im of imgs as ExtractedPhoto["raw"][] & { key?: string }[]) {
      const w = im.width || 0;
      const h = im.height || 0;
      if (w < MIN_WIDTH || h < MIN_HEIGHT) continue; // logos, icons, severity badges
      const key = (im as { key?: string }).key;
      if (key) {
        if (seenKeys.has(key)) continue; // repeated asset
        seenKeys.add(key);
      }
      photos.push({ page: p, width: w, height: h, raw: im as ExtractedPhoto["raw"] });
    }
  }
  const photosFound = photos.length;

  // ── Stage 1b: prioritize photos on defect-flagged pages, cap the count ───
  const pageScores = new Map<number, boolean>();
  for (let p = 1; p <= pages; p++) {
    pageScores.set(p, DEFECT_KEYWORDS.test(pageTexts[p - 1] || ""));
  }
  const prioritized = [
    ...photos.filter((ph) => pageScores.get(ph.page)),
    ...photos.filter((ph) => !pageScores.get(ph.page)),
  ].slice(0, MAX_PHOTOS);

  // ── Stage 1c: encode to small JPEGs ──────────────────────────────────────
  const encoded: EncodedPhoto[] = [];
  for (const ph of prioritized) {
    try {
      const channels = (ph.raw.channels || 3) as 3 | 4;
      const input = Buffer.from(ph.raw.data.buffer, ph.raw.data.byteOffset, ph.raw.data.byteLength);
      const jpeg = await sharp(input, {
        raw: { width: ph.raw.width, height: ph.raw.height, channels },
      })
        .resize(JPEG_MAX_DIM, JPEG_MAX_DIM, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      const pageContext = (pageTexts[ph.page - 1] || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      encoded.push({ page: ph.page, jpegBase64: jpeg.toString("base64"), pageContext });
    } catch {
      // Skip photos sharp can't encode (unusual colorspaces); keep going.
    }
  }

  // ── Stage 2: describe in batches on gpt-4o-mini (its own rate pool) ──────
  const batches: EncodedPhoto[][] = [];
  for (let i = 0; i < encoded.length; i += BATCH_SIZE) {
    batches.push(encoded.slice(i, i + BATCH_SIZE));
  }

  const observationsByPage = new Map<number, string[]>();
  let observations = 0;
  let retries = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let batchesRun = 0;

  const describeBatch = async (batch: EncodedPhoto[]): Promise<void> => {
    const header =
      `You are a licensed home inspector reviewing photos from a property inspection report. ` +
      `For EACH numbered photo, report any visible, defect-relevant observations — including issues ` +
      `NOT mentioned in the page context (water staining, roof wear, rust/corrosion, cracks, rot, ` +
      `mold-like staining, pest damage, improper wiring/plumbing, missing flashing/handrails, etc.). ` +
      `Be terse (max 35 words per photo) and concrete. If a photo shows nothing defect-relevant, use null. ` +
      `Do not repeat the page context back; only add what the PHOTO shows.\n\n` +
      batch
        .map((ph, i) => `Photo ${i + 1} (report page ${ph.page}) — page context: "${ph.pageContext}"`)
        .join("\n") +
      `\n\nReturn JSON: {"observations":[{"photo":1,"issues":"..." or null}, ...]} — one entry per photo, in order.`;

    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: header },
      ...batch.map(
        (ph): OpenAI.Chat.Completions.ChatCompletionContentPart => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${ph.jpegBase64}`, detail: "low" },
        }),
      ),
    ];

    for (let attempt = 1; ; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
          max_completion_tokens: 1400,
          temperature: 0.2,
        });
        promptTokens += response.usage?.prompt_tokens || 0;
        completionTokens += response.usage?.completion_tokens || 0;
        const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
        const list = Array.isArray(parsed.observations) ? parsed.observations : [];
        for (const o of list) {
          const idx = Number(o?.photo) - 1;
          const issues = typeof o?.issues === "string" ? o.issues.trim() : "";
          if (!issues || issues.toLowerCase() === "null" || idx < 0 || idx >= batch.length) continue;
          const page = batch[idx].page;
          if (!observationsByPage.has(page)) observationsByPage.set(page, []);
          observationsByPage.get(page)!.push(issues);
          observations++;
        }
        return;
      } catch (err) {
        const delay = attempt <= MAX_RETRIES ? retryDelayMs(err, attempt) : null;
        if (delay == null) {
          console.error("Photo batch failed (skipping batch):", (err as Error)?.message);
          return; // drop this batch's observations; the pipeline continues
        }
        retries++;
        await sleep(delay);
      }
    }
  };

  // Waves of concurrent batches; stop scheduling when the deadline nears so
  // the surrounding serverless request never blows its duration cap.
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    if (Date.now() - start > deadlineMs) {
      console.warn(
        `Enrichment deadline reached after ${batchesRun}/${batches.length} batches; proceeding with partial observations.`,
      );
      break;
    }
    const wave = batches.slice(i, i + CONCURRENT_BATCHES);
    await Promise.all(wave.map(describeBatch));
    batchesRun += wave.length;
  }

  // ── Stage 3: weave enriched text ─────────────────────────────────────────
  const parts: string[] = [];
  for (let p = 1; p <= pages; p++) {
    parts.push(`--- PAGE ${p} ---`);
    parts.push((pageTexts[p - 1] || "").trim());
    const obs = observationsByPage.get(p);
    if (obs && obs.length) {
      parts.push(`[PHOTO OBSERVATIONS — page ${p}]`);
      for (const o of obs) parts.push(`- ${o}`);
    }
  }

  return {
    enrichedText: parts.join("\n"),
    stats: {
      pages,
      photosFound,
      photosDescribed: encoded.length,
      observations,
      batches: batchesRun,
      retries,
      promptTokens,
      completionTokens,
      ms: Date.now() - start,
    },
  };
}
