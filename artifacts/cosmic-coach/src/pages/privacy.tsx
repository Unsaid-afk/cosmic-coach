export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-8 md:p-16 text-foreground font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold border-b border-border/50 pb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">Effective Date: June 2026</p>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p className="text-sm text-foreground/80">
            We collect information you provide directly to us, such as when you create or modify your account, 
            request customer support, or otherwise communicate with us. This information may include: name, email address, 
            payment method, and any other information you choose to provide.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Media & Data Handling</h2>
          <p className="text-sm text-foreground/80">
            Audio and video files uploaded to Closing Clarity are strictly processed for the purpose of generating 
            analytical reports and transcriptions. We do not use your media for any other purpose. Once a session 
            is deleted by the user, the associated media and transcription data are permanently expunged from our systems.
          </p>

          <h2 className="text-xl font-semibold mt-8">3. Third-Party Subprocessors</h2>
          <p className="text-sm text-foreground/80">
            We use trusted third-party service providers (such as OpenAI for transcript generation and Stripe for 
            payment processing). These providers are bound by strict confidentiality and data protection agreements 
            that align with our B2B commercial standards.
          </p>
        </div>
      </div>
    </div>
  );
}
