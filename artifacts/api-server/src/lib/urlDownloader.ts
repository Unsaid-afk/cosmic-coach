import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { readFile, rm } from "fs/promises";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const YTDLP_SITES = [
  /youtube\.com/, /youtu\.be/,
  /vimeo\.com/,
  /loom\.com/,
  /dailymotion\.com/,
  /twitch\.tv/,
  /facebook\.com\/.*\/video/,
  /twitter\.com\/.*\/status/,
  /tiktok\.com/,
  /instagram\.com\/reel/,
  /linkedin\.com\/posts/,
];

const DIRECT_MEDIA_EXTENSIONS = /\.(mp3|mp4|wav|ogg|webm|m4a|aac|flac|mov|avi|mkv)(\?.*)?$/i;
const DIRECT_MEDIA_TYPES = ["audio/", "video/"];

export type DownloadResult = {
  buffer: Buffer;
  mimeType: string;
  title?: string;
};

function isYtdlpSite(url: string): boolean {
  return YTDLP_SITES.some((re) => re.test(url));
}

function isDirectMedia(url: string): boolean {
  return DIRECT_MEDIA_EXTENSIONS.test(url.split("?")[0]);
}

async function downloadWithYtdlp(url: string): Promise<DownloadResult> {
  const id = randomUUID();
  const outPath = join(tmpdir(), `cosmic-${id}.%(ext)s`);
  const mp3Path = join(tmpdir(), `cosmic-${id}.mp3`);

  // Get title first (fast)
  let title: string | undefined;
  try {
    const { stdout } = await execFileAsync("yt-dlp", ["--get-title", "--no-playlist", url], { timeout: 15000 });
    title = stdout.trim().slice(0, 120) || undefined;
  } catch {
    // ignore
  }

  // Download audio only as mp3 (much faster than downloading video)
  await execFileAsync(
    "yt-dlp",
    [
      "--no-playlist",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "5",        // medium quality, faster
      "--max-filesize", "80m",
      "--output", outPath,
      url,
    ],
    { timeout: 120000 },
  );

  const buffer = await readFile(mp3Path);
  // Clean up in background
  rm(mp3Path, { force: true }).catch(() => {});

  return { buffer, mimeType: "audio/mpeg", title };
}

async function downloadDirect(url: string): Promise<DownloadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CosmicCoach/1.0)" },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const mimeType = contentType.split(";")[0].trim();

    if (!DIRECT_MEDIA_TYPES.some((t) => mimeType.startsWith(t))) {
      throw new Error(`Not a media file (content-type: ${mimeType})`);
    }

    // Check size limit
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > 80 * 1024 * 1024) {
      throw new Error("File exceeds 80MB limit");
    }

    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  } finally {
    clearTimeout(timer);
  }
}

export async function downloadMediaFromUrl(url: string): Promise<DownloadResult> {
  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs are supported");
  }

  if (isYtdlpSite(url)) {
    return downloadWithYtdlp(url);
  }

  if (isDirectMedia(url)) {
    return downloadDirect(url);
  }

  // Try yt-dlp first for unknown sites, fall back to direct download
  try {
    return await downloadWithYtdlp(url);
  } catch {
    return downloadDirect(url);
  }
}
