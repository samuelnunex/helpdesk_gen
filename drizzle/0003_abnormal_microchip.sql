-- ============================================================
-- Migration: Helpdesk Module - Part 1: Enum and Table Creation
-- Note: ALTER TYPE ADD VALUE cannot be used with the new values
-- in the same transaction. Data migration runs in 0004.
-- ============================================================

-- 1. Add new values to tipo_conta enum
DO $$ BEGIN
  ALTER TYPE "public"."tipo_conta" ADD VALUE 'usuario_final';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."tipo_conta" ADD VALUE 'gestor_setor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."tipo_conta" ADD VALUE 'diretor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."tipo_conta" ADD VALUE 'ti';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."tipo_conta" ADD VALUE 'desenvolvedor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
