-- AI worker failure reporting improvements.
-- API quota failures are fatal for the batch and must be surfaced clearly.

-- The deployed Edge Function increments errors_count and stops a batch on
-- insufficient OpenAI API credits. This migration documents the database-side
-- reporting contract for repository history.