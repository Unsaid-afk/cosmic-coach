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
import { Loader2, Upload, FileVideo, FileAudio, X, Zap, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getListSessionsQueryKey } from "@workspace/api-client-react";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  speakerName: z.string().min(2, "Speaker name is required"),
});

type FormValues = z.infer<typeof formSchema>;

const ACCEPTED_TYPES = [
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg",
  "audio/x-m4a", "audio/aac",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewSession() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "processing">("idle");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", speakerName: "" },
  });

  const validateAndSetFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: "Unsupported format", description: "Please upload an audio or video file (MP4, MP3, WAV, WebM, etc.)", variant: "destructive" });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: `Maximum file size is 100MB. Your file is ${formatBytes(f.size)}.`, variant: "destructive" });
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

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  }, [validateAndSetFile]);

  const onSubmit = async (data: FormValues) => {
    if (!file) {
      toast({ title: "No file selected", description: "Please upload an audio or video recording.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setUploadStage("uploading");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("speakerName", data.speakerName);
      formData.append("media", file);

      // Use XMLHttpRequest to track upload progress
      const sessionData = await new Promise<{ id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/sessions/upload");

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 202 || xhr.status === 201 || xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.send(formData);
      });

      setUploadProgress(100);
      setUploadStage("processing");

      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });

      toast({
        title: "Upload complete",
        description: "AI analysis is running. You will see results appear as they complete.",
      });

      setLocation(`/sessions/${sessionData.id}`);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      setUploadStage("idle");
    }
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card/60 border-primary/20 shadow-[0_0_30px_rgba(0,102,255,0.05)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <CardHeader>
            <CardTitle className="text-2xl font-mono uppercase tracking-wider text-primary flex items-center gap-2">
              <Zap className="w-5 h-5" />
              New Analysis Session
            </CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
              Upload your recording for AI-powered speech analysis
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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

                {/* File Upload Zone */}
                <div className="space-y-2">
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recording File</div>

                  <AnimatePresence mode="wait">
                    {!file ? (
                      <motion.div
                        key="dropzone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ACCEPTED_TYPES.join(",")}
                          onChange={onFileChange}
                          className="hidden"
                        />
                        <Upload className={`mx-auto mb-3 w-10 h-10 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-sm font-semibold text-foreground mb-1">
                          {isDragging ? "Release to upload" : "Drag & drop your recording here"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          MP4, MP3, WAV, WebM, M4A, AAC — up to 100MB
                        </div>
                        <div className="mt-4">
                          <span className="inline-block px-4 py-1.5 rounded border border-primary/30 text-primary text-xs font-mono uppercase tracking-wider hover:bg-primary/10 transition-colors">
                            Browse Files
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="file-preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          {isVideo
                            ? <FileVideo className="w-6 h-6 text-primary" />
                            : <FileAudio className="w-6 h-6 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {formatBytes(file.size)} · {file.type.split("/")[1]?.toUpperCase()}
                          </div>
                        </div>
                        {!isSubmitting && (
                          <button
                            type="button"
                            onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Upload Progress */}
                <AnimatePresence>
                  {isSubmitting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex justify-between text-xs font-mono text-muted-foreground">
                        <span>{uploadStage === "uploading" ? "Uploading recording..." : "AI analysis in progress..."}</span>
                        {uploadStage === "uploading" && <span>{uploadProgress}%</span>}
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${uploadStage === "processing" ? "bg-secondary" : "bg-primary"}`}
                          initial={{ width: "0%" }}
                          animate={{ width: uploadStage === "processing" ? "100%" : `${uploadProgress}%` }}
                          transition={{ duration: uploadStage === "processing" ? 2 : 0.3, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs font-mono">
                        <span className={`flex items-center gap-1.5 ${uploadProgress >= 100 ? "text-primary" : "text-muted-foreground"}`}>
                          {uploadProgress >= 100 ? <CheckCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                          Uploaded
                        </span>
                        <span className={`flex items-center gap-1.5 ${uploadStage === "processing" ? "text-secondary" : "text-muted-foreground"}`}>
                          {uploadStage === "processing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                          Transcribing with Whisper
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <div className="w-3 h-3 rounded-full border border-current" />
                          GPT Analysis
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Supported formats note */}
                {!isSubmitting && (
                  <div className="text-xs text-muted-foreground/60 font-mono border-t border-border/30 pt-4">
                    Powered by OpenAI Whisper transcription + GPT-5 coaching analysis
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !file}
                    className="font-mono uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all disabled:opacity-40"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploadStage === "uploading" ? "Uploading..." : "Redirecting..."}</>
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
