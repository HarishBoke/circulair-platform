export const ENV = {
  // ── Auth & Session ──────────────────────────────────────────────────────────
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",

  // ── Owner identity (used for admin notifications) ────────────────────────────
  ownerEmail: process.env.OWNER_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "",
  ownerName: process.env.OWNER_NAME ?? "Platform Owner",

  // ── OpenAI (LLM + Image generation + Voice transcription) ────────────────────
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3",

  // ── AWS S3 (file storage) ─────────────────────────────────────────────────────
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",

  // ── Google Maps ───────────────────────────────────────────────────────────────
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",

  // ── Email (ZeptoMail) ─────────────────────────────────────────────────────────
  zeptomailToken: process.env.ZEPTOMAIL_TOKEN ?? "",
  fromEmail: process.env.FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "noreply@circulair.energy",

  // ── Email (Resend — kept for backward compat, no longer used) ────────────────
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "noreply@circulair.energy",

  // ── Stripe ────────────────────────────────────────────────────────────────────
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",

  // ── Runtime ───────────────────────────────────────────────────────────────────
  isProduction: process.env.NODE_ENV === "production",

};
