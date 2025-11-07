


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."activities_encrypted_encrypt_secret_location"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
		BEGIN
		        new.location = CASE WHEN new.location IS NULL THEN NULL ELSE
			CASE WHEN new.user_id IS NULL THEN NULL ELSE pg_catalog.encode(
			  pgsodium.crypto_aead_det_encrypt(
				pg_catalog.convert_to(new.location, 'utf8'),
				pg_catalog.convert_to(('')::text, 'utf8'),
				new.user_id::uuid,
				NULL
			  ),
				'base64') END END;
		RETURN new;
		END;
		$$;


ALTER FUNCTION "public"."activities_encrypted_encrypt_secret_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activities_encrypted_encrypt_secret_title"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
		BEGIN
		        new.title = CASE WHEN new.title IS NULL THEN NULL ELSE
			CASE WHEN new.user_id IS NULL THEN NULL ELSE pg_catalog.encode(
			  pgsodium.crypto_aead_det_encrypt(
				pg_catalog.convert_to(new.title, 'utf8'),
				pg_catalog.convert_to(('')::text, 'utf8'),
				new.user_id::uuid,
				NULL
			  ),
				'base64') END END;
		RETURN new;
		END;
		$$;


ALTER FUNCTION "public"."activities_encrypted_encrypt_secret_title"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activities_encrypted" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" bigint NOT NULL,
    "title" "text",
    "location" "text",
    "category" "text",
    "color" "text",
    "icon" "text",
    "duration" integer,
    "min_pomo" integer,
    "max_pomo" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activities_encrypted" OWNER TO "postgres";


SECURITY LABEL FOR "pgsodium" ON COLUMN "public"."activities_encrypted"."title" IS 'ENCRYPT WITH KEY COLUMN user_id';
SECURITY LABEL FOR "pgsodium" ON COLUMN "public"."activities_encrypted"."location" IS 'ENCRYPT WITH KEY COLUMN user_id';



CREATE OR REPLACE VIEW "public"."activities" WITH ("security_invoker"='true') AS
 SELECT "id",
    "client_id",
    "user_id",
    "title",
    "location",
    "category",
    "color",
    "icon",
    "duration",
    "min_pomo",
    "max_pomo",
    "created_at",
    "updated_at"
   FROM "public"."activities_encrypted";


ALTER VIEW "public"."activities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."decrypted_activities_encrypted" AS
 SELECT "id",
    "user_id",
    "client_id",
    "title",
        CASE
            WHEN ("title" IS NULL) THEN NULL::"text"
            ELSE
            CASE
                WHEN ("user_id" IS NULL) THEN NULL::"text"
                ELSE "convert_from"("pgsodium"."crypto_aead_det_decrypt"("decode"("title", 'base64'::"text"), "convert_to"(''::"text", 'utf8'::"name"), "user_id", NULL::"bytea"), 'utf8'::"name")
            END
        END AS "decrypted_title",
    "location",
        CASE
            WHEN ("location" IS NULL) THEN NULL::"text"
            ELSE
            CASE
                WHEN ("user_id" IS NULL) THEN NULL::"text"
                ELSE "convert_from"("pgsodium"."crypto_aead_det_decrypt"("decode"("location", 'base64'::"text"), "convert_to"(''::"text", 'utf8'::"name"), "user_id", NULL::"bytea"), 'utf8'::"name")
            END
        END AS "decrypted_location",
    "category",
    "color",
    "icon",
    "duration",
    "min_pomo",
    "max_pomo",
    "created_at",
    "updated_at"
   FROM "public"."activities_encrypted";


ALTER VIEW "public"."decrypted_activities_encrypted" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities_encrypted"
    ADD CONSTRAINT "activities_encrypted_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activities_client_id" ON "public"."activities_encrypted" USING "btree" ("client_id");



CREATE INDEX "idx_activities_user_id" ON "public"."activities_encrypted" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "activities_encrypted_encrypt_secret_trigger_location" BEFORE INSERT OR UPDATE OF "location" ON "public"."activities_encrypted" FOR EACH ROW EXECUTE FUNCTION "public"."activities_encrypted_encrypt_secret_location"();



CREATE OR REPLACE TRIGGER "activities_encrypted_encrypt_secret_trigger_title" BEFORE INSERT OR UPDATE OF "title" ON "public"."activities_encrypted" FOR EACH ROW EXECUTE FUNCTION "public"."activities_encrypted_encrypt_secret_title"();



ALTER TABLE ONLY "public"."activities_encrypted"
    ADD CONSTRAINT "activities_encrypted_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can delete own activities" ON "public"."activities_encrypted" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own activities" ON "public"."activities_encrypted" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own activities" ON "public"."activities_encrypted" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own activities" ON "public"."activities_encrypted" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


































































































































































GRANT ALL ON FUNCTION "public"."activities_encrypted_encrypt_secret_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."activities_encrypted_encrypt_secret_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."activities_encrypted_encrypt_secret_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."activities_encrypted_encrypt_secret_title"() TO "anon";
GRANT ALL ON FUNCTION "public"."activities_encrypted_encrypt_secret_title"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."activities_encrypted_encrypt_secret_title"() TO "service_role";



























GRANT ALL ON TABLE "public"."activities_encrypted" TO "anon";
GRANT ALL ON TABLE "public"."activities_encrypted" TO "authenticated";
GRANT ALL ON TABLE "public"."activities_encrypted" TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."decrypted_activities_encrypted" TO "anon";
GRANT ALL ON TABLE "public"."decrypted_activities_encrypted" TO "authenticated";
GRANT ALL ON TABLE "public"."decrypted_activities_encrypted" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


