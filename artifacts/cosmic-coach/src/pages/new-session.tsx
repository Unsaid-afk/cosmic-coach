import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Upload, FileVideo, FileAudio, X, Zap, CheckCircle, Link2, Youtube, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getListSessionsQueryKey } from "@workspace/api-client-react";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  speakerName: z.string().min(2, "Speaker name is required"),
});

const ACCEPTED_TYPES = [
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg",
  "audio/x-m4a", "audio/aac",
];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Tab = "upload" | "url";

const SUPPORTED_PLATFORMS = [
  { icon: Youtube, label: "YouTube", color: "text-red-400" },
  { icon: Globe, label: "Loom", color: "text-violet-400" },
  { icon: Globe, label: "Vimeo", color: "text-blue-400" },
  { icon: Globe, label: "Direct MP4/MP3 URL", color: "text-primary" },
];

function detectPlatform(url: string): { label: string; color: string } {
  if (/youtube\.com|youtu\.be/.test(url)) return { label: "YouTube", color: "text-red-400" };
  if (/loom\.com/.test(url)) return { label: "Loom", color: "text-violet-400" };
  if (/vimeo\.com/.test(url)) return { label: "Vimeo", color: "text-blue-400" };
  if (/twitter\.com|x\.com/.test(url)) return { label: "X / Twitter", color: "text-sky-400" };
  if (/tiktok\.com/.test(url)) return { label: "TikTok", color: "text-pink-400" };
  if (/dailymotion\.com/.test(url)) return { label: "Dailymotion", color: "text-orange-400" };
  if (/\.(mp4|webm|mp3|wav|m4a|ogg|aac)(\?|$)/i.test(url)) return { label: "Direct Media File", color: "text-primary" };
  return { label: "Video URL", color: "text-muted-foreground" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewSession() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading" | "downloading" | "processing">("idle");

  const form = useForm({ resolver: zodResolver(baseSchema), defaultValues: { title: "", speakerName: "" } });

  const validateAndSetFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: "Unsupported format", description: "Upload an audio or video file (MP4, MP3, WAV, WebM, etc.)", variant: "destructive" });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: `Max 100 MB. Your file is ${formatBytes(f.size)}.`, variant: "destructive" });
      return;
    }
    setFile(f);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, [validateAndSetFile]);

  const onSubmit = async (data: z.infer<typeof baseSchema>) => {
    if (tab === "upload" && !file) {
      toast({ title: "No file selected", description: "Upload an audio or video recording.", variant: "destructive" });
      return;
    }
    if (tab === "url" && !videoUrl.trim()) {
      toast({ title: "No URL entered", description: "Paste a video or audio URL.", variant: "destructive" });
      return;
    }
    if (tab === "url") {
      try { new URL(videoUrl); } catch {
        toast({ title: "Invalid URL", description: "Enter a valid HTTP/HTTPS URL.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let sessionData: { id: string };

      if (tab === "upload") {
        // ── File upload path ──────────────────────────────────────────────────
        setStage("uploading");
        setUploadProgress(0);
        const formData = new FormData();
        formData.append("title", data.title);
        formData.append("speakerName", data.speakerName);
        formData.append("media", file!);

        sessionData = await new Promise<{ id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/sessions/upload");
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(JSON.parse(xhr.responseText)?.error ?? "Upload failed"));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.send(formData);
        });

        setStage("processing");
      } else {
        // ── URL path ──────────────────────────────────────────────────────────
        setStage("downloading");
        const resp = await fetch("/api/sessions/from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title, speakerName: data.speakerName, url: videoUrl.trim() }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({})) as Record<string, string>;
          throw new Error(body.error ?? "Failed to start analysis");
        }
        sessionData = await resp.json() as { id: string };
        setStage("processing");
      }

      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      toast({ title: "Analysis started", description: "AI is processing your recording. Results appear automatically." });
      setLocation(`/sessions/${sessionData.id}`);
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
      setIsSubmitting(false);
      setStage("idle");
    }
  };

  const urlPlatform = videoUrl ? detectPlatform(videoUrl) : null;
  const isVideo = file?.type.startsWith("video/");

  const stageSteps = tab === "upload"
    ? [
        { label: "Upload complete", done: uploadProgress >= 100 },
        { label: "Transcribing with Whisper", done: false },
        { label: "GPT-4o analysis (4 parallel calls)", done: false },
      ]
    : [
        { label: "Downloading media", done: stage === "processing" },
        { label: "Transcribing with Whisper", done: false },
        { label: "GPT-4o analysis (4 parallel calls)", done: false },
      ];

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card/60 border-primary/20 shadow-[0_0_30px_rgba(0,102,255,0.05)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <CardHeader>
            <CardTitle className="text-2xl font-mono uppercase tracking-wider text-primary flex items-center gap-2">
              <Zap className="w-5 h-5" /> New Analysis Session
            </CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
              Upload a file or paste a video link for AI speech analysis
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Title & Speaker */}
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Session Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Q3 Earnings Pitch" className="bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="speakerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Speaker Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sarah Chen" className="bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── Tab switcher ───────────────────────────────────────── */}
                <div className="space-y-3">
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recording Source</div>
                  <div className="flex rounded-lg border border-border/50 overflow-hidden bg-background/40 p-1 gap-1">
                    {([
                      { id: "upload" as Tab, icon: Upload, label: "Upload File" },
                      { id: "url" as Tab, icon: Link2, label: "Paste Video Link" },
                    ] as const).map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { if (!isSubmitting) setTab(id); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded text-sm font-mono transition-all ${
                          tab === id
                            ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(0,102,255,0.15)]"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Tab content ────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                  {tab === "upload" ? (
                    <motion.div key="upload-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                      <AnimatePresence mode="wait">
                        {!file ? (
                          <motion.div
                            key="dropzone"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-all duration-300 ${
                              isDragging
                                ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,102,255,0.2)]"
                                : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(",")}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); }}
                              className="hidden" />
                            <Upload className={`mx-auto mb-3 w-10 h-10 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="text-sm font-semibold text-foreground mb-1">
                              {isDragging ? "Release to upload" : "Drag & drop your recording here"}
                            </div>
                            <div className="text-xs text-muted-foreground">MP4, MP3, WAV, WebM, M4A, AAC — up to 100 MB</div>
                            <div className="mt-4">
                              <span className="inline-block px-4 py-1.5 rounded border border-primary/30 text-primary text-xs font-mono uppercase tracking-wider hover:bg-primary/10 transition-colors">
                                Browse Files
                              </span>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="file-preview"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-4"
                          >
                            <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              {isVideo ? <FileVideo className="w-6 h-6 text-primary" /> : <FileAudio className="w-6 h-6 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">{file.name}</div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                {formatBytes(file.size)} · {file.type.split("/")[1]?.toUpperCase()}
                              </div>
                            </div>
                            {!isSubmitting && (
                              <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div key="url-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                      {/* URL input */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=... or direct media URL"
                            className="pl-10 bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono text-sm"
                            disabled={isSubmitting}
                          />
                        </div>
                        {/* Detected platform badge */}
                        <AnimatePresence>
                          {urlPlatform && videoUrl.length > 10 && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className={`flex items-center gap-1.5 text-xs font-mono ${urlPlatform.color}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              {urlPlatform.label} detected
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Supported platforms */}
                      <div className="p-4 rounded-lg border border-border/30 bg-background/30 space-y-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Supported Platforms</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { icon: Youtube, label: "YouTube", color: "text-red-400" },
                            { icon: Globe, label: "Loom", color: "text-violet-400" },
                            { icon: Globe, label: "Vimeo", color: "text-blue-400" },
                            { icon: Globe, label: "Twitter / X", color: "text-sky-400" },
                            { icon: Globe, label: "TikTok", color: "text-pink-400" },
                            { icon: Link2, label: "Direct MP4 / MP3", color: "text-primary" },
                          ].map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Icon className={`w-3.5 h-3.5 ${color}`} />
                              <span>{label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 font-mono pt-1 border-t border-border/20">
                          Audio is extracted and analysed — no video data is stored
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Progress indicator ─────────────────────────────────── */}
                <AnimatePresence>
                  {isSubmitting && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                      <div className="flex justify-between text-xs font-mono text-muted-foreground">
                        <span>{
                          stage === "uploading" ? "Uploading file..." :
                          stage === "downloading" ? "Fetching video from URL..." :
                          "Redirecting to analysis..."
                        }</span>
                        {stage === "uploading" && <span>{uploadProgress}%</span>}
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${stage === "processing" || stage === "downloading" ? "bg-secondary" : "bg-primary"}`}
                          initial={{ width: "0%" }}
                          animate={{ width: (stage === "processing" || stage === "downloading") ? "100%" : `${uploadProgress}%` }}
                          transition={{ duration: stage === "processing" ? 1.5 : stage === "downloading" ? 3 : 0.3, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex gap-4 text-[11px] font-mono flex-wrap">
                        {stageSteps.map(({ label, done }, i) => {
                          const isActive = !done && i === stageSteps.findIndex((s) => !s.done);
                          return (
                            <span key={label} className={`flex items-center gap-1.5 ${done ? "text-primary" : isActive ? "text-secondary" : "text-muted-foreground"}`}>
                              {done ? <CheckCircle className="w-3 h-3" /> : isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded-full border border-current opacity-40" />}
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Footer ─────────────────────────────────────────────── */}
                {!isSubmitting && (
                  <div className="text-xs text-muted-foreground/50 font-mono border-t border-border/30 pt-4">
                    Powered by OpenAI Whisper · GPT-4o-mini analysis · 4 parallel AI calls
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || (tab === "upload" && !file) || (tab === "url" && !videoUrl.trim())}
                    className="font-mono uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all disabled:opacity-40"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {stage === "uploading" ? "Uploading..." : stage === "downloading" ? "Fetching..." : "Redirecting..."}</>
                    ) : (
                      <><Zap className="mr-2 h-4 w-4" /> Begin Analysis</>
                    )}
                  </Button>
                </div>

              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
