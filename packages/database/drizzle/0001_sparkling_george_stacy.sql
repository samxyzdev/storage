ALTER TABLE "session" ALTER COLUMN "token" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");