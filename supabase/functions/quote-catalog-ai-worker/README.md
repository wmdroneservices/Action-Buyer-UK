// GearCashOut AI web research worker.
// Deployed Supabase Edge Function: quote-catalog-ai-worker
//
// Workflow:
// queued catalogue products -> OpenAI web research -> exact-match filtering
// -> automatic source discovery -> pending manual evidence review.
// OPENAI_API_KEY is intentionally stored only as a Supabase Edge Function secret.
