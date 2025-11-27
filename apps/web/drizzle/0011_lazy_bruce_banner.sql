CREATE TABLE "data_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "data_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"suggested_changes" jsonb NOT NULL,
	"justification" text NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"admin_note" text,
	"reporter_user_id" integer NOT NULL,
	"resolved_by_user_id" integer,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "data_reports" ADD CONSTRAINT "fk_data_reports_users_reporter_user_id" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_reports" ADD CONSTRAINT "fk_data_reports_users_resolved_by_user_id" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_data_reports_entity_type_entity_id" ON "data_reports" USING btree ("entity_type" int4_ops,"entity_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_data_reports_status" ON "data_reports" USING btree ("status" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_data_reports_reporter_user_id" ON "data_reports" USING btree ("reporter_user_id" int4_ops);