export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-8 md:p-16 text-foreground font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold border-b border-border/50 pb-4">Terms of Service</h1>
        <p className="text-muted-foreground">Effective Date: June 2026</p>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">1. Commercial Purpose & Platform Scope</h2>
          <p className="text-sm text-foreground/80">
            Closing Clarity provides an automated, artificial intelligence-driven analysis tool that processes audio, video, 
            and transcription data from sales interactions to deliver performance insights, metrics, and quality audits. 
            This platform is strictly designed and licensed for commercial B2B use. Standard consumer protection regulations 
            do not apply to transactions or usage under these terms.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Data Ownership, Authority & Indemnification</h2>
          <p className="text-sm text-foreground/80">
            The User retains absolute ownership over all raw multimedia assets (audio and video recordings) uploaded to 
            the platform. By uploading content, you represent and warrant that you have obtained all necessary consents, 
            licenses, and permissions from all recorded individuals under applicable state and federal laws (including 
            all one-party and two-party consent recording statutes).
          </p>

          <h2 className="text-xl font-semibold mt-8">3. Intellectual Property Rights & Model Training Restrictions</h2>
          <p className="text-sm text-foreground/80">
            Closing Clarity acknowledges that all User Content is confidential B2B data. We explicitly warrant that 
            your proprietary sales collateral, conversational data, and derived transcriptions will NOT be used to 
            train, fine-tune, or develop any foundational generative AI models.
          </p>
        </div>
      </div>
    </div>
  );
}
