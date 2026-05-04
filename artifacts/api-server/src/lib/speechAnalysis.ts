import { openai } from "@workspace/integrations-openai-ai-server";

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  isFillerWord: boolean;
  fillerType?: string;
  confidenceScore: number;
  isGoldenMoment: boolean;
}

export interface WaveformPoint {
  time: number;
  energy: number;
  clarity: number;
  pitch: number;
}

export interface PersuasionAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp?: number;
}

export interface PersuasionAnalysis {
  pasScore: number;
  hasProblemStatement: boolean;
  hasAgitation: boolean;
  hasSolution: boolean;
  ruleOfThreeCount: number;
  ruleOfThreeExamples: string[];
  hasStorytelling: boolean;
  storytellingSegments: string[];
  persuasionAlerts: PersuasionAlert[];
}

export interface PersonaFeedback {
  timestamp: number;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface AudiencePersona {
  id: string;
  name: string;
  role: "skeptic" | "busy_exec" | "novice" | "expert" | "investor";
  avatarSeed: string;
  overallReaction: "engaged" | "neutral" | "skeptical" | "lost" | "impressed";
  feedbackItems: PersonaFeedback[];
  retentionScore: number;
}

export interface ImpactPoint {
  time: number;
  impactScore: number;
  isPhoneCheckMoment: boolean;
  isGoldenMoment: boolean;
  label?: string;
}

export interface MetricDetail {
  metric: string;
  score: number;
  rating: "excellent" | "good" | "fair" | "poor";
  reason: string;
  tip: string;
}

export interface FillerBreakdownItem {
  word: string;
  count: number;
  impact: string;
}

export interface DetailedAnalysis {
  metrics: MetricDetail[];
  fillerBreakdown: FillerBreakdownItem[];
  pacingAnalysis: string;
  openingStrength: string;
  closingStrength: string;
  keyThemes: string[];
  vocabularyComplexity: "simple" | "moderate" | "advanced";
  callToActionPresent: boolean;
  callToActionStrength: string;
  overallVerdict: string;
}

export interface AnalysisData {
  overallScore: number;
  eyeContactScore: number;
  confidenceScore: number;
  fillerWordCount: number;
  speechPaceWpm: number;
  volumeConsistency: number;
  structureScore: number;
  goldenMomentCount: number;
  topStrengths: string[];
  topImprovements: string[];
  energyLevel: "low" | "medium" | "high" | "electric";
  duration: number;
  persuasion: PersuasionAnalysis;
  audience: AudiencePersona[];
  impactTimeline: ImpactPoint[];
  detailedBreakdown?: DetailedAnalysis;
}

// ─── Filler word detection ────────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  "um", "uh", "ah", "er", "like", "basically", "literally",
  "actually", "so", "right", "okay", "well",
]);

function detectFillerType(word: string): string | undefined {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (["um", "ums"].includes(w)) return "um";
  if (["uh", "uhs"].includes(w)) return "uh";
  if (["ah", "ahh"].includes(w)) return "ah";
  if (w === "like") return "like";
  if (w === "basically") return "basically";
  if (w === "so") return "so";
  return undefined;
}

function isFillerWord(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z]/g, "").trim();
  return FILLER_WORDS.has(w);
}

// ─── Transcription ────────────────────────────────────────────────────────────

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<{
  text: string;
  words: TranscriptWord[];
  duration: number;
}> {
  const ext = mimeType.includes("mp4") || mimeType.includes("video") ? "mp4"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("ogg") ? "ogg"
    : "mp3";

  const file = new File([new Blob([audioBuffer], { type: mimeType })], `audio.${ext}`, { type: mimeType });

  // gpt-4o-mini-transcribe only supports "json" or "text" — no verbose_json / word timestamps
  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    response_format: "json",
  } as Parameters<typeof openai.audio.transcriptions.create>[0]);

  const text: string = typeof response === "string"
    ? response
    : (response as { text: string }).text ?? "";

  // Synthesize word-level timing from plain text.
  // Assumed pace of 130 WPM — consistent with conversational speech.
  const rawWords = text.split(/\s+/).filter(Boolean);
  const secPerWord = 60 / 130;

  const words: TranscriptWord[] = rawWords.map((word, i) => ({
    word,
    start: Math.round(i * secPerWord * 100) / 100,
    end: Math.round((i + 1) * secPerWord * 100) / 100,
    probability: 0.9,
  }));

  const duration = Math.round(rawWords.length * secPerWord * 10) / 10;

  return { text, words, duration };
}

// ─── Transcript segments ──────────────────────────────────────────────────────

export function buildTranscriptSegments(words: TranscriptWord[]): TranscriptSegment[] {
  if (words.length === 0) return [];
  const segments: TranscriptSegment[] = [];
  let buffer: TranscriptWord[] = [];
  let segId = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.map((w) => w.word).join(" ").trim();
    const avgConf = buffer.reduce((s, w) => s + w.probability, 0) / buffer.length;
    const filler = buffer.length === 1 && isFillerWord(buffer[0].word);
    segments.push({
      id: `seg-${segId++}`,
      startTime: Math.round(buffer[0].start * 100) / 100,
      endTime: Math.round(buffer[buffer.length - 1].end * 100) / 100,
      text,
      isFillerWord: filler,
      fillerType: filler ? detectFillerType(buffer[0].word) : undefined,
      confidenceScore: Math.round(avgConf * 100) / 100,
      isGoldenMoment: false,
    });
    buffer = [];
  };

  for (const word of words) {
    if (isFillerWord(word.word)) {
      flush();
      buffer.push(word);
      flush();
    } else {
      buffer.push(word);
      const endsWithPunct = /[.!?]$/.test(word.word.trim());
      if (endsWithPunct || buffer.length >= 15) flush();
    }
  }
  flush();
  return segments;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

export function generateWaveformFromWords(words: TranscriptWord[], duration: number): WaveformPoint[] {
  if (duration <= 0) return [];
  const intervalSec = Math.max(1, Math.floor(duration / 80));
  const points: WaveformPoint[] = [];

  for (let t = 0; t <= duration; t += intervalSec) {
    const windowEnd = t + intervalSec;
    const ww = words.filter((w) => w.start >= t && w.start < windowEnd);
    const maxPossibleWpm = (intervalSec / 60) * 200;
    const energy = Math.min(1, Math.max(0, ww.length / Math.max(1, maxPossibleWpm)));
    const avgProb = ww.length > 0
      ? ww.reduce((s, w) => s + w.probability, 0) / ww.length
      : 0.5;
    points.push({
      time: Math.round(t * 10) / 10,
      energy: Math.round(energy * 100) / 100,
      clarity: Math.round(avgProb * 100) / 100,
      pitch: Math.round(Math.min(1, Math.max(0, 0.3 + energy * 0.4 + (avgProb - 0.5) * 0.3)) * 100) / 100,
    });
  }
  return points;
}

// ─── Parallel AI analysis ─────────────────────────────────────────────────────

type ScoringResult = {
  overallScore: number;
  eyeContactScore: number;
  confidenceScore: number;
  volumeConsistency: number;
  structureScore: number;
  energyLevel: string;
  topStrengths: string[];
  topImprovements: string[];
};

type PersuasionResult = {
  pasScore: number;
  hasProblemStatement: boolean;
  hasAgitation: boolean;
  hasSolution: boolean;
  ruleOfThreeCount: number;
  ruleOfThreeExamples: string[];
  hasStorytelling: boolean;
  storytellingSegments: string[];
  persuasionAlerts: PersuasionAlert[];
};

type AudienceResult = AudiencePersona[];

type ImpactResult = ImpactPoint[];

function clamp(n: number, lo = 0, hi = 100) { return Math.min(hi, Math.max(lo, n)); }
function safeNum(v: unknown, fallback: number) { const n = Number(v); return isNaN(n) ? fallback : n; }

async function callScoring(transcript: string, wpm: number, fillerCount: number, speakerName: string): Promise<ScoringResult> {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 600,
    messages: [{
      role: "user",
      content: `You are an elite speech coach. Score this speech by ${speakerName} (${wpm} WPM, ${fillerCount} filler words detected).

TRANSCRIPT (excerpt, max 800 chars):
${transcript.slice(0, 800)}

Return JSON only:
{"overallScore":<0-100>,"eyeContactScore":<0-100 estimate>,"confidenceScore":<0-100>,"volumeConsistency":<0-100>,"structureScore":<0-100>,"energyLevel":"low"|"medium"|"high"|"electric","topStrengths":[<2-3 specific strings>],"topImprovements":[<2-3 specific strings>]}`
    }],
    response_format: { type: "json_object" },
  });
  const p = JSON.parse(r.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  return {
    overallScore: clamp(safeNum(p.overallScore, 65)),
    eyeContactScore: clamp(safeNum(p.eyeContactScore, 65)),
    confidenceScore: clamp(safeNum(p.confidenceScore, 65)),
    volumeConsistency: clamp(safeNum(p.volumeConsistency, 70)),
    structureScore: clamp(safeNum(p.structureScore, 70)),
    energyLevel: (["low","medium","high","electric"].includes(String(p.energyLevel)) ? p.energyLevel : "medium") as string,
    topStrengths: (p.topStrengths as string[] | undefined) ?? [],
    topImprovements: (p.topImprovements as string[] | undefined) ?? [],
  };
}

async function callPersuasion(transcript: string): Promise<PersuasionResult> {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 800,
    messages: [{
      role: "user",
      content: `Analyze persuasion techniques in this speech transcript (max 1200 chars shown):
${transcript.slice(0, 1200)}

Return JSON only:
{"pasScore":<0-100>,"hasProblemStatement":<bool>,"hasAgitation":<bool>,"hasSolution":<bool>,"ruleOfThreeCount":<int>,"ruleOfThreeExamples":[<exact quotes, max 2>],"hasStorytelling":<bool>,"storytellingSegments":[<brief desc, max 2>],"persuasionAlerts":[{"id":"a1","severity":"info"|"warning"|"critical","message":<specific string>,"timestamp":<seconds or null>}]}`
    }],
    response_format: { type: "json_object" },
  });
  const p = JSON.parse(r.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  return {
    pasScore: clamp(safeNum(p.pasScore, 50)),
    hasProblemStatement: !!(p.hasProblemStatement),
    hasAgitation: !!(p.hasAgitation),
    hasSolution: !!(p.hasSolution),
    ruleOfThreeCount: safeNum(p.ruleOfThreeCount, 0),
    ruleOfThreeExamples: (p.ruleOfThreeExamples as string[] | undefined) ?? [],
    hasStorytelling: !!(p.hasStorytelling),
    storytellingSegments: (p.storytellingSegments as string[] | undefined) ?? [],
    persuasionAlerts: ((p.persuasionAlerts as PersuasionAlert[] | undefined) ?? []).map((a, i) => ({
      id: a.id ?? `alert-${i}`,
      severity: (["info","warning","critical"].includes(a.severity) ? a.severity : "info") as "info"|"warning"|"critical",
      message: a.message ?? "",
      timestamp: a.timestamp,
    })),
  };
}

async function callAudience(transcript: string, speakerName: string): Promise<AudienceResult> {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 900,
    messages: [{
      role: "user",
      content: `Simulate 3 audience persona reactions to this speech by ${speakerName} (max 1000 chars shown):
${transcript.slice(0, 1000)}

Return JSON only — array of 3 personas:
[{"id":"persona-skeptic","name":"The Skeptic","role":"skeptic","avatarSeed":"skeptic","overallReaction":"engaged"|"neutral"|"skeptical"|"lost"|"impressed","retentionScore":<0-100>,"feedbackItems":[{"timestamp":<sec>,"comment":<specific comment>,"sentiment":"positive"|"negative"|"neutral"}]},{"id":"persona-exec","name":"The Busy Exec","role":"busy_exec","avatarSeed":"exec","overallReaction":"engaged"|"neutral"|"skeptical"|"lost"|"impressed","retentionScore":<0-100>,"feedbackItems":[{"timestamp":<sec>,"comment":<specific>,"sentiment":"positive"|"negative"|"neutral"}]},{"id":"persona-novice","name":"The Novice","role":"novice","avatarSeed":"novice","overallReaction":"engaged"|"neutral"|"skeptical"|"lost"|"impressed","retentionScore":<0-100>,"feedbackItems":[{"timestamp":<sec>,"comment":<specific>,"sentiment":"positive"|"negative"|"neutral"}]}]`
    }],
    response_format: { type: "json_object" },
  });
  const raw = r.choices[0]?.message?.content ?? "{}";
  // Response may be wrapped in an object
  let parsed: unknown;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    parsed = Array.isArray(obj) ? obj : (obj.personas ?? obj.audience ?? Object.values(obj)[0] ?? []);
  } catch {
    parsed = [];
  }
  const arr = Array.isArray(parsed) ? parsed as AudiencePersona[] : [];
  return arr.map((p) => ({
    id: p.id ?? `persona-${p.role}`,
    name: p.name ?? String(p.role),
    role: p.role,
    avatarSeed: p.avatarSeed ?? String(p.role),
    overallReaction: (["engaged","neutral","skeptical","lost","impressed"].includes(p.overallReaction)
      ? p.overallReaction : "neutral") as AudiencePersona["overallReaction"],
    retentionScore: clamp(safeNum(p.retentionScore, 65)),
    feedbackItems: (p.feedbackItems ?? []).map((f) => ({
      timestamp: safeNum(f.timestamp, 0),
      comment: f.comment ?? "",
      sentiment: (["positive","negative","neutral"].includes(f.sentiment) ? f.sentiment : "neutral") as PersonaFeedback["sentiment"],
    })),
  }));
}

async function callImpactTimeline(transcript: string, duration: number): Promise<ImpactResult> {
  const stepSec = Math.max(10, Math.floor(duration / 20)); // max ~20 data points
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 600,
    messages: [{
      role: "user",
      content: `Score audience impact every ${stepSec} seconds for this ${Math.round(duration)}s speech:
${transcript.slice(0, 900)}

Return JSON array covering 0 to ${Math.round(duration)} seconds in steps of ${stepSec}:
[{"time":<sec>,"impactScore":<0-100>,"isPhoneCheckMoment":<bool, true if score<35>,"isGoldenMoment":<bool, true if score>80>,"label":<string or null>}]`
    }],
    response_format: { type: "json_object" },
  });
  const raw = r.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    parsed = Array.isArray(obj) ? obj : (obj.timeline ?? obj.impactTimeline ?? Object.values(obj)[0] ?? []);
  } catch {
    parsed = [];
  }
  const arr = Array.isArray(parsed) ? parsed as ImpactPoint[] : [];
  if (arr.length === 0) {
    // Fallback: flat line at 65
    const pts: ImpactPoint[] = [];
    for (let t = 0; t <= duration; t += stepSec) pts.push({ time: t, impactScore: 65, isPhoneCheckMoment: false, isGoldenMoment: false });
    return pts;
  }
  return arr.map((p) => ({
    time: safeNum(p.time, 0),
    impactScore: clamp(safeNum(p.impactScore, 65)),
    isPhoneCheckMoment: !!(p.isPhoneCheckMoment),
    isGoldenMoment: !!(p.isGoldenMoment),
    label: p.label ?? undefined,
  }));
}

async function callDetailedAnalysis(
  transcript: string,
  wpm: number,
  fillerWords: TranscriptWord[],
): Promise<DetailedAnalysis> {
  const fillerCounts: Record<string, number> = {};
  for (const fw of fillerWords) {
    const w = fw.word.toLowerCase().replace(/[^a-z]/g, "");
    if (w) fillerCounts[w] = (fillerCounts[w] ?? 0) + 1;
  }
  const fillerSummary = Object.entries(fillerCounts).map(([w, c]) => `${w}×${c}`).join(", ") || "none detected";

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 1400,
    messages: [{
      role: "user",
      content: `You are an elite speech coach. Deeply analyze this speech (${wpm} WPM, fillers: ${fillerSummary}).

TRANSCRIPT (first 1800 chars):
${transcript.slice(0, 1800)}

Return JSON only:
{"metrics":[{"metric":"Overall Delivery","score":<0-100>,"rating":"excellent"|"good"|"fair"|"poor","reason":"<2-3 sentences explaining the score>","tip":"<one specific actionable drill or technique>"},{"metric":"Confidence & Authority","score":<0-100>,"rating":"excellent"|"good"|"fair"|"poor","reason":"<2-3 sentences>","tip":"<specific advice>"},{"metric":"Speech Structure","score":<0-100>,"rating":"excellent"|"good"|"fair"|"poor","reason":"<2-3 sentences>","tip":"<specific advice>"},{"metric":"Pacing & Rhythm","score":<0-100>,"rating":"excellent"|"good"|"fair"|"poor","reason":"<2-3 sentences — note ideal is 120-160 WPM>","tip":"<specific advice>"},{"metric":"Vocabulary & Clarity","score":<0-100>,"rating":"excellent"|"good"|"fair"|"poor","reason":"<2-3 sentences>","tip":"<specific advice>"},{"metric":"Engagement Factor","score":<0-100>,"rating":"excellent"|"good"|"fair"|"poor","reason":"<2-3 sentences>","tip":"<specific advice>"}],"fillerBreakdown":[<for each unique filler word: {"word":<word>,"count":<n>,"impact":"<one sentence on how it affects listeners and perceived authority>"}>],"pacingAnalysis":"<3-4 sentences on rhythm, use of pauses, speed variation, and how it affects comprehension>","openingStrength":"<3-4 sentences assessing the first 20% of the speech — hook, attention, clarity of intent>","closingStrength":"<3-4 sentences assessing the final 20% — memorability, call to action, lasting impression>","keyThemes":[<3-6 main themes or topics detected>],"vocabularyComplexity":"simple"|"moderate"|"advanced","callToActionPresent":<bool>,"callToActionStrength":"<assessment of the CTA or 'No clear call to action was detected'>","overallVerdict":"<4-5 sentence holistic coaching verdict — what this speaker does well, what to work on most urgently, and one motivating forward-looking statement>"}`
    }],
    response_format: { type: "json_object" },
  });

  const p = JSON.parse(r.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const toRating = (v: unknown): MetricDetail["rating"] =>
    (["excellent", "good", "fair", "poor"].includes(String(v)) ? v : "fair") as MetricDetail["rating"];

  return {
    metrics: ((p.metrics as MetricDetail[] | undefined) ?? []).map((m) => ({
      metric: String(m.metric ?? ""),
      score: clamp(safeNum(m.score, 50)),
      rating: toRating(m.rating),
      reason: String(m.reason ?? ""),
      tip: String(m.tip ?? ""),
    })),
    fillerBreakdown: ((p.fillerBreakdown as FillerBreakdownItem[] | undefined) ?? []).map((f) => ({
      word: String(f.word ?? ""),
      count: Math.round(safeNum(f.count, 0)),
      impact: String(f.impact ?? ""),
    })),
    pacingAnalysis: String(p.pacingAnalysis ?? ""),
    openingStrength: String(p.openingStrength ?? ""),
    closingStrength: String(p.closingStrength ?? ""),
    keyThemes: ((p.keyThemes as string[] | undefined) ?? []).map(String),
    vocabularyComplexity: (["simple", "moderate", "advanced"].includes(String(p.vocabularyComplexity))
      ? p.vocabularyComplexity : "moderate") as DetailedAnalysis["vocabularyComplexity"],
    callToActionPresent: !!(p.callToActionPresent),
    callToActionStrength: String(p.callToActionStrength ?? ""),
    overallVerdict: String(p.overallVerdict ?? ""),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeTranscriptWithAI(
  transcript: string,
  words: TranscriptWord[],
  duration: number,
  speakerName: string,
): Promise<AnalysisData> {
  const fillerWords = words.filter((w) => isFillerWord(w.word));
  const wpm = duration > 0 ? Math.round((words.length / duration) * 60) : 0;

  // Fire all 5 analysis calls in parallel — total latency = slowest call (not sum)
  const [scoring, persuasion, audience, impactTimeline, detailedBreakdown] = await Promise.all([
    callScoring(transcript, wpm, fillerWords.length, speakerName),
    callPersuasion(transcript),
    callAudience(transcript, speakerName),
    callImpactTimeline(transcript, duration),
    callDetailedAnalysis(transcript, wpm, fillerWords),
  ]);

  const goldenMomentCount = impactTimeline.filter((p) => p.isGoldenMoment).length;

  return {
    overallScore: scoring.overallScore,
    eyeContactScore: scoring.eyeContactScore,
    confidenceScore: scoring.confidenceScore,
    fillerWordCount: fillerWords.length,
    speechPaceWpm: wpm,
    volumeConsistency: scoring.volumeConsistency,
    structureScore: scoring.structureScore,
    energyLevel: scoring.energyLevel as AnalysisData["energyLevel"],
    goldenMomentCount,
    topStrengths: scoring.topStrengths,
    topImprovements: scoring.topImprovements,
    duration,
    persuasion,
    audience,
    impactTimeline,
    detailedBreakdown,
  };
}

export function markGoldenMomentsInSegments(
  segments: TranscriptSegment[],
  analysis: AnalysisData,
): TranscriptSegment[] {
  const goldenTimes = analysis.impactTimeline.filter((p) => p.isGoldenMoment).map((p) => p.time);
  return segments.map((seg) => ({
    ...seg,
    isGoldenMoment: goldenTimes.some((t) => t >= seg.startTime - 3 && t <= seg.endTime + 3),
  }));
}
