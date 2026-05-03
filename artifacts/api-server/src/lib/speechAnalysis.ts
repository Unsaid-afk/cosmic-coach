import { openai } from "@workspace/integrations-openai-ai-server";
import { Readable } from "stream";

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
}

const FILLER_WORDS = new Set([
  "um", "uh", "ah", "er", "like", "basically", "literally",
  "actually", "you know", "so", "right", "okay", "well", "i mean"
]);

function detectFillerType(word: string): string | undefined {
  const w = word.toLowerCase().replace(/[^a-z\s]/g, "");
  if (["um", "ums"].includes(w)) return "um";
  if (["uh", "uhs"].includes(w)) return "uh";
  if (["ah", "ahh"].includes(w)) return "ah";
  if (w === "like") return "like";
  if (["basically"].includes(w)) return "basically";
  if (["so"].includes(w)) return "so";
  return undefined;
}

function isFillerWord(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return FILLER_WORDS.has(w) || !!detectFillerType(word);
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<{
  text: string;
  words: TranscriptWord[];
  duration: number;
}> {
  // Convert buffer to a File-like object that the OpenAI SDK accepts
  const blob = new Blob([audioBuffer], { type: mimeType });
  const ext = mimeType.includes("mp4") || mimeType.includes("video") ? "mp4"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("ogg") ? "ogg"
    : "mp3";
  const file = new File([blob], `audio.${ext}`, { type: mimeType });

  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  } as Parameters<typeof openai.audio.transcriptions.create>[0]);

  const result = response as unknown as {
    text: string;
    duration: number;
    words?: Array<{ word: string; start: number; end: number; probability?: number }>;
  };

  const words: TranscriptWord[] = (result.words ?? []).map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    probability: w.probability ?? 0.9,
  }));

  return {
    text: result.text,
    words,
    duration: result.duration ?? 0,
  };
}

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
    const fillerType = filler ? detectFillerType(buffer[0].word) : undefined;

    segments.push({
      id: `seg-${segId++}`,
      startTime: Math.round(buffer[0].start * 100) / 100,
      endTime: Math.round(buffer[buffer.length - 1].end * 100) / 100,
      text,
      isFillerWord: filler,
      fillerType,
      confidenceScore: Math.round(avgConf * 100) / 100,
      isGoldenMoment: false, // set after GPT analysis
    });
    buffer = [];
  };

  for (const word of words) {
    const isFiller = isFillerWord(word.word);
    if (isFiller) {
      flush();
      buffer.push(word);
      flush();
    } else {
      buffer.push(word);
      // break into sentences every ~15 words or at punctuation
      const lastWord = word.word.trim();
      const endsWithPunct = /[.!?]$/.test(lastWord);
      if (endsWithPunct || buffer.length >= 15) {
        flush();
      }
    }
  }
  flush();
  return segments;
}

export function generateWaveformFromWords(words: TranscriptWord[], duration: number): WaveformPoint[] {
  const intervalSec = Math.max(1, Math.floor(duration / 100));
  const points: WaveformPoint[] = [];

  for (let t = 0; t <= duration; t += intervalSec) {
    // Count words in this interval window
    const windowEnd = t + intervalSec;
    const wordsInWindow = words.filter((w) => w.start >= t && w.start < windowEnd);
    const maxPossibleWpm = (intervalSec / 60) * 200; // 200 wpm max
    const rawEnergy = wordsInWindow.length / maxPossibleWpm;
    const energy = Math.min(1, Math.max(0, rawEnergy));

    // Clarity from avg probability
    const avgProb = wordsInWindow.length > 0
      ? wordsInWindow.reduce((s, w) => s + w.probability, 0) / wordsInWindow.length
      : 0.5;

    // Pitch: varies based on word confidence and energy
    const pitch = 0.3 + energy * 0.4 + (avgProb - 0.5) * 0.3;

    points.push({
      time: Math.round(t * 10) / 10,
      energy: Math.round(energy * 100) / 100,
      clarity: Math.round(avgProb * 100) / 100,
      pitch: Math.round(Math.min(1, Math.max(0, pitch)) * 100) / 100,
    });
  }
  return points;
}

export async function analyzeTranscriptWithAI(
  transcript: string,
  words: TranscriptWord[],
  duration: number,
  speakerName: string
): Promise<AnalysisData> {
  const durationMin = Math.floor(duration / 60);
  const durationSec = Math.floor(duration % 60);
  const wordCount = words.length;
  const fillerWords = words.filter((w) => isFillerWord(w.word));
  const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

  const systemPrompt = `You are an elite speech coaching AI. Analyze the following presentation transcript and provide detailed, honest feedback. Be specific and reference actual content from the transcript. Return valid JSON only.`;

  const userPrompt = `
Analyze this speech by ${speakerName} (${durationMin}m ${durationSec}s, ${wordCount} words, ${wpm} WPM):

TRANSCRIPT:
${transcript}

FILLER WORDS DETECTED (${fillerWords.length} total):
${fillerWords.slice(0, 10).map((w) => `"${w.word}" at ${w.start.toFixed(1)}s`).join(", ")}${fillerWords.length > 10 ? `... and ${fillerWords.length - 10} more` : ""}

Return a JSON object with EXACTLY this structure:
{
  "overallScore": <0-100 integer, honest coaching score>,
  "eyeContactScore": <0-100 estimate based on delivery patterns in transcript>,
  "confidenceScore": <0-100 based on language certainty, filler words, hedging>,
  "speechPaceWpm": ${wpm},
  "volumeConsistency": <0-100>,
  "structureScore": <0-100 based on how well organized the speech is>,
  "energyLevel": <"low"|"medium"|"high"|"electric" based on language energy>,
  "topStrengths": [<2-4 specific strengths referencing actual content>],
  "topImprovements": [<2-4 specific actionable improvements referencing actual content>],
  "goldenMoments": [<list of exact quotes that were particularly impactful, max 3>],
  "persuasion": {
    "pasScore": <0-100, how well did they use Problem-Agitation-Solution structure>,
    "hasProblemStatement": <true/false>,
    "hasAgitation": <true/false, did they emphasize the pain/urgency>,
    "hasSolution": <true/false>,
    "ruleOfThreeCount": <integer, how many times did they use groups of three>,
    "ruleOfThreeExamples": [<exact quotes of rule-of-three instances found>],
    "hasStorytelling": <true/false>,
    "storytellingSegments": [<brief descriptions of stories told>],
    "persuasionAlerts": [
      {
        "id": "alert-1",
        "severity": <"info"|"warning"|"critical">,
        "message": <specific actionable message referencing the transcript>,
        "timestamp": <approximate second in speech where this occurs, or null>
      }
    ]
  },
  "audience": [
    {
      "id": "persona-skeptic",
      "name": "The Skeptic",
      "role": "skeptic",
      "avatarSeed": "skeptic",
      "overallReaction": <"engaged"|"neutral"|"skeptical"|"lost"|"impressed">,
      "retentionScore": <0-100>,
      "feedbackItems": [
        {
          "timestamp": <approximate second>,
          "comment": <specific comment referencing the actual content, as if they were watching>,
          "sentiment": <"positive"|"negative"|"neutral">
        }
      ]
    },
    {
      "id": "persona-exec",
      "name": "The Busy Exec",
      "role": "busy_exec",
      "avatarSeed": "exec",
      "overallReaction": <"engaged"|"neutral"|"skeptical"|"lost"|"impressed">,
      "retentionScore": <0-100>,
      "feedbackItems": [
        {
          "timestamp": <approximate second>,
          "comment": <specific comment as busy executive>,
          "sentiment": <"positive"|"negative"|"neutral">
        }
      ]
    },
    {
      "id": "persona-novice",
      "name": "The Novice",
      "role": "novice",
      "avatarSeed": "novice",
      "overallReaction": <"engaged"|"neutral"|"skeptical"|"lost"|"impressed">,
      "retentionScore": <0-100>,
      "feedbackItems": [
        {
          "timestamp": <approximate second>,
          "comment": <specific comment as newcomer to topic>,
          "sentiment": <"positive"|"negative"|"neutral">
        }
      ]
    }
  ],
  "impactTimeline": [
    <array of objects covering every 15 seconds of the speech: { "time": <seconds>, "impactScore": <0-100>, "isPhoneCheckMoment": <true/false>, "isGoldenMoment": <true/false>, "label": <string or null> }>
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const rawText = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  // Build impact timeline with sensible defaults if not provided
  const impactTimeline: ImpactPoint[] = (() => {
    const raw = parsed.impactTimeline;
    if (Array.isArray(raw) && raw.length > 0) {
      return (raw as Array<{ time: number; impactScore: number; isPhoneCheckMoment?: boolean; isGoldenMoment?: boolean; label?: string }>).map((p) => ({
        time: Number(p.time) || 0,
        impactScore: Math.min(100, Math.max(0, Number(p.impactScore) || 50)),
        isPhoneCheckMoment: !!p.isPhoneCheckMoment,
        isGoldenMoment: !!p.isGoldenMoment,
        label: p.label ?? undefined,
      }));
    }
    // Fallback: generate based on overall score
    const pts: ImpactPoint[] = [];
    for (let t = 0; t <= duration; t += 15) {
      pts.push({ time: t, impactScore: Number(parsed.overallScore) || 65, isPhoneCheckMoment: false, isGoldenMoment: false });
    }
    return pts;
  })();

  const persuasion = parsed.persuasion as Record<string, unknown> | undefined;
  const audience = parsed.audience as AudiencePersona[] | undefined;
  const goldenMoments = (parsed.goldenMoments as string[] | undefined) ?? [];

  return {
    overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 65)),
    eyeContactScore: Math.min(100, Math.max(0, Number(parsed.eyeContactScore) || 65)),
    confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 65)),
    fillerWordCount: fillerWords.length,
    speechPaceWpm: wpm,
    volumeConsistency: Math.min(100, Math.max(0, Number(parsed.volumeConsistency) || 70)),
    structureScore: Math.min(100, Math.max(0, Number(parsed.structureScore) || 70)),
    energyLevel: (["low", "medium", "high", "electric"].includes(String(parsed.energyLevel)) ? parsed.energyLevel : "medium") as "low" | "medium" | "high" | "electric",
    goldenMomentCount: goldenMoments.length,
    topStrengths: (parsed.topStrengths as string[] | undefined) ?? [],
    topImprovements: (parsed.topImprovements as string[] | undefined) ?? [],
    duration,
    persuasion: {
      pasScore: Math.min(100, Math.max(0, Number(persuasion?.pasScore) || 50)),
      hasProblemStatement: !!(persuasion?.hasProblemStatement),
      hasAgitation: !!(persuasion?.hasAgitation),
      hasSolution: !!(persuasion?.hasSolution),
      ruleOfThreeCount: Number(persuasion?.ruleOfThreeCount) || 0,
      ruleOfThreeExamples: (persuasion?.ruleOfThreeExamples as string[] | undefined) ?? [],
      hasStorytelling: !!(persuasion?.hasStorytelling),
      storytellingSegments: (persuasion?.storytellingSegments as string[] | undefined) ?? [],
      persuasionAlerts: ((persuasion?.persuasionAlerts as PersuasionAlert[] | undefined) ?? []).map((a, i) => ({
        id: a.id ?? `alert-${i}`,
        severity: (["info", "warning", "critical"].includes(a.severity) ? a.severity : "info") as "info" | "warning" | "critical",
        message: a.message ?? "",
        timestamp: a.timestamp,
      })),
    },
    audience: (audience ?? []).map((p) => ({
      id: p.id ?? `persona-${p.role}`,
      name: p.name ?? p.role,
      role: p.role,
      avatarSeed: p.avatarSeed ?? p.role,
      overallReaction: (["engaged", "neutral", "skeptical", "lost", "impressed"].includes(p.overallReaction) ? p.overallReaction : "neutral") as AudiencePersona["overallReaction"],
      retentionScore: Math.min(100, Math.max(0, Number(p.retentionScore) || 65)),
      feedbackItems: (p.feedbackItems ?? []).map((f) => ({
        timestamp: Number(f.timestamp) || 0,
        comment: f.comment ?? "",
        sentiment: (["positive", "negative", "neutral"].includes(f.sentiment) ? f.sentiment : "neutral") as PersonaFeedback["sentiment"],
      })),
    })),
    impactTimeline,
  };
}

export function markGoldenMomentsInSegments(
  segments: TranscriptSegment[],
  analysis: AnalysisData
): TranscriptSegment[] {
  const goldenTimestamps = analysis.impactTimeline
    .filter((p) => p.isGoldenMoment)
    .map((p) => p.time);

  return segments.map((seg) => ({
    ...seg,
    isGoldenMoment: goldenTimestamps.some(
      (t) => t >= seg.startTime - 2 && t <= seg.endTime + 2
    ),
  }));
}
