SET local check_function_bodies = off;

CREATE EXTENSION "moddatetime" SCHEMA "extensions";

CREATE EXTENSION "pg_cron";

CREATE EXTENSION "pgjwt" SCHEMA "extensions";

CREATE TABLE "public"."auth_otp_log" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"          uuid                     NOT NULL,
  "email"            text                     NOT NULL,
  "otp"              text                     NOT NULL,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "used_at"          timestamp with time zone,
  "sent_by_admin_at" timestamp with time zone,
  "sent_by_admin_id" uuid,
  CONSTRAINT "auth_otp_log_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."auth_otp_log"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."auth_user" (
  "auth_user_id"   uuid                     NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "is_super_admin" boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "auth_user_pkey" PRIMARY KEY (auth_user_id),
  "created_by"     uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."auth_user"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."av_assignment" (
  "participant_id"  uuid NOT NULL,
  "assignment_id"   text NOT NULL,
  "congregation_id" uuid NOT NULL,
  "week_id"         date NOT NULL,
  CONSTRAINT "av_assignment_pkey" PRIMARY KEY (assignment_id, congregation_id, week_id)
);

CREATE TABLE "public"."av_overseer_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "av_overseer_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

CREATE TABLE "public"."av_participation" (
  "participant_id"   uuid NOT NULL,
  "participation_id" text NOT NULL,
  CONSTRAINT "av_participation_pkey" PRIMARY KEY (participant_id, participation_id)
);

CREATE TABLE "public"."clam_overseer_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "clam_overseer_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

CREATE TABLE "public"."clean_major" (
  "week_id"         date NOT NULL,
  "congregation_id" uuid NOT NULL,
  "group_id"        uuid NOT NULL,
  CONSTRAINT "clean_major_pkey" PRIMARY KEY (week_id, congregation_id)
);

CREATE TABLE "public"."clean_minor" (
  "week_id"         date NOT NULL,
  "congregation_id" uuid NOT NULL,
  "group_id"        uuid NOT NULL,
  CONSTRAINT "clean_minor_pkey" PRIMARY KEY (week_id, congregation_id)
);

ALTER TABLE "public"."clean_minor"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."clean_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "clean_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."clean_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cobe_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "cobe_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

CREATE TABLE "public"."congregation_admin" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "created_at"      timestamp with time zone DEFAULT now(),
  "created_by"      uuid,
  CONSTRAINT "congregation_admin_auth_user_id_congregation_id_key" UNIQUE (auth_user_id, congregation_id),
  CONSTRAINT "congregation_admin_pkey" PRIMARY KEY (auth_user_id)
);

ALTER TABLE "public"."congregation_admin"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."congregation" (
  "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
  "name"            text NOT NULL,
  "congregation_id" uuid,
  "password"        text,
  CONSTRAINT "congregation_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."data_share_session_participant" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id" uuid                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "device_id"  uuid                     NOT NULL,
  "joined_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "data_share_session_participant_pkey" PRIMARY KEY (id),
  CONSTRAINT "data_share_session_participant_session_id_user_id_device_id_key" UNIQUE (session_id, user_id, device_id)
);

ALTER TABLE "public"."data_share_session_participant"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."data_share_session" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "share_code"           text                     NOT NULL,
  "created_by"           uuid                     NOT NULL,
  "created_by_device_id" uuid                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'active'::text,
  "expires_at"           timestamp with time zone NOT NULL DEFAULT (now() + '01:00:00'::interval),
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "data_share_session_pkey" PRIMARY KEY (id),
  CONSTRAINT "data_share_session_share_code_key" UNIQUE (share_code)
);

ALTER TABLE "public"."data_share_session"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."device_trust" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"          uuid                     NOT NULL,
  "trusted_user_id"   uuid,
  "trusted_device_id" uuid,
  "device_name"       text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "device_trust_owner_id_trusted_user_id_trusted_device_id_key" UNIQUE (owner_id, trusted_user_id, trusted_device_id),
  CONSTRAINT "device_trust_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."device_trust"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."device" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid                     NOT NULL,
  "device_name"  text                     NOT NULL,
  "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "device_pkey" PRIMARY KEY (id),
  CONSTRAINT "device_user_id_device_name_key" UNIQUE (user_id, device_name)
);

ALTER TABLE "public"."device"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."do_not_call" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "coordinates"     double precision[]       NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "suburb_id"       uuid                     NOT NULL,
  "street_id"       uuid                     NOT NULL,
  "house_number"    text                     NOT NULL,
  "unit_number"     text                     DEFAULT ''::text,
  "notes"           text,
  "match_data"      jsonb                    NOT NULL,
  "updated_at"      timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT "do_not_call_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."elder_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "elder_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

CREATE TABLE "public"."event_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "event_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."event_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event" (
  "id"              uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid                   NOT NULL,
  "name"            text                   NOT NULL DEFAULT ''::text,
  "description"     text                   NOT NULL DEFAULT ''::text,
  "type"            text                   DEFAULT ''::text,
  "address"         text                   NOT NULL DEFAULT ''::text,
  "start_time"      time without time zone,
  "end_time"        time without time zone,
  "all_day"         boolean                NOT NULL,
  "coordinates"     double precision[],
  "end_date"        date,
  "start_date"      date                   NOT NULL,
  "details"         jsonb,
  CONSTRAINT "event_details_shape"
    CHECK
    (((details IS NULL) OR ((type = 'circuit_visit'::text) AND (jsonb_typeof(details) = 'object'::text) AND ((details - ARRAY['midweek_theme'::text, 'weekend_theme'::text,
    'pioneer_meeting_time'::text]) = '{}'::jsonb) AND ((details ? 'midweek_theme'::text) IS
    NOT FALSE) AND (jsonb_typeof(COALESCE((details -> 'midweek_theme'::text), '""'::jsonb)) = 'string'::text) AND
    (jsonb_typeof(COALESCE((details -> 'weekend_theme'::text), '""'::jsonb)) = 'string'::text) AND
    (jsonb_typeof(COALESCE((details -> 'pioneer_meeting_time'::text), 'null'::jsonb)) = ANY (ARRAY['string'::text, 'null'::text]))))),
  CONSTRAINT "event_pkey" PRIMARY KEY (id, congregation_id)
);

CREATE TABLE "public"."group" (
  "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name"            text NOT NULL,
  "overseer_id"     uuid,
  "assistant_id"    uuid,
  CONSTRAINT "group_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."map_checkout_map" (
  "id"                        uuid NOT NULL DEFAULT gen_random_uuid(),
  "map_checkout_publisher_id" uuid NOT NULL,
  "map_id"                    uuid NOT NULL,
  CONSTRAINT "map_checkout_map_map_checkout_publisher_id_map_id_key" UNIQUE (map_checkout_publisher_id, map_id),
  CONSTRAINT "map_checkout_map_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."map_checkout_map"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."map_checkout_publisher" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "publisher_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "max_maps"        integer                  NOT NULL DEFAULT 1,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "map_checkout_publisher_pkey" PRIMARY KEY (id),
  CONSTRAINT "map_checkout_publisher_publisher_id_congregation_id_key" UNIQUE (publisher_id, congregation_id)
);

ALTER TABLE "public"."map_checkout_publisher"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."map_log" (
  "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
  "map_id"         uuid NOT NULL,
  "publisher_id"   uuid NOT NULL,
  "checked_out_at" date NOT NULL DEFAULT CURRENT_DATE,
  "checked_in_at"  date,
  "notes"          text,
  CONSTRAINT "map_log_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."map_master" (
  "congregation_id" uuid  NOT NULL,
  "boundary"        jsonb NOT NULL,
  "details"         text,
  CONSTRAINT "map_master_pkey" PRIMARY KEY (congregation_id)
);

CREATE TABLE "public"."map_tag_assignment" (
  "id"     uuid NOT NULL DEFAULT gen_random_uuid(),
  "map_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "map_tag_assignment_map_id_tag_id_key" UNIQUE (map_id, tag_id),
  CONSTRAINT "map_tag_assignment_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."map_tag" (
  "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid NOT NULL,
  "name"            text NOT NULL,
  CONSTRAINT "map_tag_congregation_id_name_key" UNIQUE (congregation_id, name),
  CONSTRAINT "map_tag_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."map" (
  "id"              uuid  NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid  NOT NULL,
  "name"            text  NOT NULL,
  "details"         text,
  "boundary"        jsonb,
  "blocks"          jsonb,
  "url"             text,
  CONSTRAINT "map_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."meeting_attendance_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "can_read"        boolean                  NOT NULL DEFAULT false,
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "meeting_attendance_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."meeting_attendance_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meeting_attendance" (
  "week_id"                 date    NOT NULL,
  "congregation_id"         uuid    NOT NULL,
  "weekend_in_person_count" integer,
  "weekend_remote_count"    integer,
  "midweek_in_person_count" integer,
  "midweek_remote_count"    integer,
  CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY (week_id, congregation_id)
);

ALTER TABLE "public"."meeting_attendance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."midweek_assignment" (
  "participant_id"  uuid NOT NULL,
  "assignment_id"   text NOT NULL,
  "congregation_id" uuid NOT NULL,
  "week_id"         date NOT NULL,
  CONSTRAINT "midweek_assignment_pkey" PRIMARY KEY (assignment_id, congregation_id, week_id)
);

CREATE TABLE "public"."midweek_meeting_data" (
  "week_id"                  date    NOT NULL,
  "mwb_week_date_locale"     text,
  "mwb_weekly_bible_reading" text    NOT NULL,
  "mwb_song_first"           integer NOT NULL,
  "mwb_tgw_talk"             text    NOT NULL,
  "mwb_tgw_talk_title"       text,
  "mwb_tgw_gems_title"       text,
  "mwb_tgw_bread"            text    NOT NULL,
  "mwb_tgw_bread_title"      text,
  "mwb_ayf_count"            integer NOT NULL,
  "mwb_ayf_part1"            text    NOT NULL,
  "mwb_ayf_part1_time"       integer,
  "mwb_ayf_part1_type"       text,
  "mwb_ayf_part1_title"      text,
  "mwb_ayf_part2"            text    NOT NULL,
  "mwb_ayf_part2_time"       integer,
  "mwb_ayf_part2_type"       text,
  "mwb_ayf_part2_title"      text,
  "mwb_ayf_part3"            text    NOT NULL,
  "mwb_ayf_part3_time"       integer,
  "mwb_ayf_part3_type"       text,
  "mwb_ayf_part3_title"      text,
  "mwb_ayf_part4"            text,
  "mwb_ayf_part4_time"       integer,
  "mwb_ayf_part4_type"       text,
  "mwb_ayf_part4_title"      text,
  "mwb_song_middle"          text,
  "mwb_lc_count"             integer NOT NULL,
  "mwb_lc_part1"             text    NOT NULL,
  "mwb_lc_part1_time"        integer,
  "mwb_lc_part1_content"     text,
  "mwb_lc_part1_title"       text,
  "mwb_lc_part2"             text,
  "mwb_lc_part2_time"        integer,
  "mwb_lc_part2_content"     text,
  "mwb_lc_part2_title"       text,
  "mwb_lc_cbs"               text    NOT NULL,
  "mwb_lc_cbs_title"         text,
  "mwb_song_conclude"        text,
  CONSTRAINT "midweek_meeting_data_pkey" PRIMARY KEY (week_id)
);

CREATE TABLE "public"."midweek_participation" (
  "participant_id"   uuid    NOT NULL,
  "participation_id" text    NOT NULL,
  "is_participant"   boolean NOT NULL DEFAULT true,
  CONSTRAINT "midweek_particpation_pkey" PRIMARY KEY (participant_id, participation_id)
);

CREATE TABLE "public"."ministerial_servant_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "ministerial_servant_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."ministerial_servant_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ministry_schedule" (
  "id"              uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid                   NOT NULL,
  "day_of_week"     smallint               NOT NULL,
  "start_time"      time without time zone NOT NULL,
  "location"        text                   NOT NULL DEFAULT ''::text,
  "conductor"       text                   NOT NULL DEFAULT ''::text,
  "sort_order"      smallint               NOT NULL DEFAULT 0,
  "details"         text                   NOT NULL DEFAULT ''::text,
  CONSTRAINT "ministry_schedule_day_of_week_check" CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
  CONSTRAINT "ministry_schedule_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."not_at_home" (
  "id"              uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "created_at"      timestamp with time zone   NOT NULL DEFAULT now(),
  "coordinates"     double precision[]         NOT NULL,
  "congregation_id" uuid                       NOT NULL,
  "suburb_id"       uuid                       NOT NULL,
  "street_id"       uuid                       NOT NULL,
  "house_number"    text                       NOT NULL,
  "unit_number"     text                       DEFAULT ''::text,
  "visit_log"       timestamp with time zone[] NOT NULL,
  "write"           boolean                    NOT NULL,
  "match_data"      jsonb                      NOT NULL,
  CONSTRAINT "not_at_home_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."outline" (
  "id"    text NOT NULL,
  "theme" text NOT NULL,
  CONSTRAINT "outline_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."publisher" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "first_name"      text                     NOT NULL,
  "middle_name"     text,
  "last_name"       text                     NOT NULL,
  "display_name"    text,
  "congregation_id" uuid                     NOT NULL,
  "standing"        text                     NOT NULL,
  "type"            text                     NOT NULL,
  "gender"          text                     NOT NULL,
  "family_id"       uuid,
  "group_id"        uuid,
  "auth_id"         uuid,
  "archived_at"     timestamp with time zone,
  CONSTRAINT "publisher_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."regular_pioneer" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "publisher_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "start_month"     date                     NOT NULL,
  "end_month"       date,
  "created_by"      uuid,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "regular_pioneer_end_first_of_month" CHECK (((end_month IS NULL) OR (end_month = (date_trunc('month'::text, (end_month)::timestamp without time zone))::date))),
  CONSTRAINT "regular_pioneer_end_on_or_after_start" CHECK (((end_month IS NULL) OR (end_month >= start_month))),
  CONSTRAINT "regular_pioneer_no_future_end" CHECK (((end_month IS NULL) OR (end_month <= (date_trunc('month'::text, now()))::date))),
  CONSTRAINT "regular_pioneer_no_future_start" CHECK ((start_month <= (date_trunc('month'::text, now()))::date)),
  CONSTRAINT "regular_pioneer_pkey" PRIMARY KEY (id),
  CONSTRAINT "regular_pioneer_start_first_of_month" CHECK ((start_month = (date_trunc('month'::text, (start_month)::timestamp without time zone))::date))
);

ALTER TABLE "public"."regular_pioneer"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reminder_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "reminder_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."reminder_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."report_permission" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "auth_user_id" uuid                     NOT NULL,
  "group_id"     uuid                     NOT NULL,
  "can_read"     boolean                  NOT NULL DEFAULT false,
  "can_edit"     boolean                  NOT NULL DEFAULT false,
  "granted_by"   uuid,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "report_permission_auth_user_id_group_id_key" UNIQUE (auth_user_id, group_id),
  CONSTRAINT "report_permission_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."report_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."report" (
  "confidential_id"    uuid     NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id"    uuid     NOT NULL DEFAULT gen_random_uuid(),
  "date"               date     NOT NULL,
  "active"             boolean  NOT NULL,
  "hours"              smallint,
  "bible_studies"      smallint,
  "comments"           text,
  "group_id"           uuid,
  "credit_hours"       jsonb    DEFAULT '{}'::jsonb,
  "aux_pio"            boolean  NOT NULL DEFAULT false,
  "reported_elsewhere" boolean  NOT NULL DEFAULT false,
  "reg_pio"            boolean  NOT NULL DEFAULT false,
  "spe_pio"            boolean  NOT NULL DEFAULT false,
  CONSTRAINT "report_pkey" PRIMARY KEY (confidential_id, congregation_id, date)
);

ALTER TABLE "public"."report"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."secretary_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "secretary_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."secretary_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."service_overseer_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "service_overseer_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

CREATE TABLE "public"."speaker_assignment" (
  "week_id"         date NOT NULL,
  "speaker_id"      uuid NOT NULL,
  "congregation_id" uuid NOT NULL,
  "outline_id"      text,
  CONSTRAINT "speaker_assignment_pkey" PRIMARY KEY (week_id, congregation_id),
  CONSTRAINT "unique_week_speaker" UNIQUE (week_id, speaker_id)
);

CREATE TABLE "public"."speaker_availability" (
  "speaker_id"   uuid     NOT NULL,
  "availability" smallint NOT NULL,
  CONSTRAINT "speaker_availability_pkey" PRIMARY KEY (speaker_id)
);

CREATE TABLE "public"."speaker_outline" (
  "speaker_id" uuid NOT NULL,
  "outline_id" text NOT NULL DEFAULT ''::text,
  CONSTRAINT "speaker_outline_pkey" PRIMARY KEY (speaker_id, outline_id)
);

CREATE TABLE "public"."speaker_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "speaker_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."speaker_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."street" (
  "id"              uuid               NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid               NOT NULL,
  "suburb_id"       uuid               NOT NULL,
  "name"            text               NOT NULL,
  "coordinates"     double precision[] NOT NULL,
  CONSTRAINT "street_congregation_id_name_suburb_id_key" UNIQUE (congregation_id, name, suburb_id),
  CONSTRAINT "street_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."suburb" (
  "id"              uuid               NOT NULL DEFAULT gen_random_uuid(),
  "congregation_id" uuid               NOT NULL,
  "name"            text               NOT NULL,
  "bbox"            double precision[] NOT NULL,
  CONSTRAINT "suburb_congregation_id_name_key" UNIQUE (congregation_id, name),
  CONSTRAINT "suburb_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."territory_servant_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "territory_servant_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

CREATE TABLE "public"."watchtower_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "watchtower_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."watchtower_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."weekend_assignment" (
  "participant_id"  uuid NOT NULL,
  "assignment_id"   text NOT NULL,
  "congregation_id" uuid NOT NULL,
  "week_id"         date NOT NULL,
  CONSTRAINT "weekend_assignment_pkey" PRIMARY KEY (assignment_id, congregation_id, week_id)
);

ALTER TABLE "public"."weekend_assignment"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."weekend_participation" (
  "participant_id"   uuid NOT NULL,
  "participation_id" text NOT NULL,
  CONSTRAINT "weekend_particpation_pkey" PRIMARY KEY (participant_id, participation_id)
);

CREATE TABLE "public"."weekend_permission" (
  "auth_user_id"    uuid                     NOT NULL,
  "congregation_id" uuid                     NOT NULL,
  "granted_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "can_edit"        boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "weekend_permission_pkey" PRIMARY KEY (auth_user_id, congregation_id)
);

ALTER TABLE "public"."weekend_permission"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_edit_clean_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        -- Super admins can always edit
        "public"."is_super_admin"("auth"."uid"())
        OR 
        -- Congregation admins can edit for their congregation
        EXISTS (
            SELECT 1 
            FROM "public"."congregation_admin" "ca"
            WHERE "ca"."auth_user_id" = "auth"."uid"() 
            AND "ca"."congregation_id" = "check_congregation_id"
        )
        OR
        -- Users with clean_permission can_edit for their congregation
        EXISTS (
            SELECT 1 
            FROM "public"."clean_permission" "cp"
            WHERE "cp"."auth_user_id" = "auth"."uid"() 
            AND "cp"."congregation_id" = "check_congregation_id"
            AND "cp"."can_edit" = true
        )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_meeting_attendance_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (SELECT 1 FROM "public"."congregation_admin" "ca"
                   WHERE "ca"."auth_user_id" = "auth"."uid"()
                   AND "ca"."congregation_id" = "check_congregation_id")
        OR EXISTS (SELECT 1 FROM "public"."meeting_attendance_permission" "map"
                   WHERE "map"."auth_user_id" = "auth"."uid"()
                   AND "map"."congregation_id" = "check_congregation_id"
                   AND "map"."can_edit" = true)
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.can_edit_ministry_schedule_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (
            SELECT 1 FROM "public"."congregation_admin" "ca"
            WHERE "ca"."auth_user_id" = "auth"."uid"()
            AND "ca"."congregation_id" = "check_congregation_id"
        )
        OR EXISTS (
            SELECT 1 FROM "public"."service_overseer_permission" "sop"
            WHERE "sop"."auth_user_id" = "auth"."uid"()
            AND "sop"."congregation_id" = "check_congregation_id"
            AND "sop"."can_edit" = true
        )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_speaker_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (SELECT 1 FROM "public"."congregation_admin" "ca"
                   WHERE "ca"."auth_user_id" = "auth"."uid"()
                   AND "ca"."congregation_id" = "check_congregation_id")
        OR EXISTS (SELECT 1 FROM "public"."speaker_permission" "sp"
                   WHERE "sp"."auth_user_id" = "auth"."uid"()
                   AND "sp"."congregation_id" = "check_congregation_id"
                   AND "sp"."can_edit" = true)
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.can_edit_weekend_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (SELECT 1 FROM "public"."congregation_admin" "ca"
                   WHERE "ca"."auth_user_id" = "auth"."uid"()
                   AND "ca"."congregation_id" = "check_congregation_id")
        OR EXISTS (SELECT 1 FROM "public"."weekend_permission" "wp"
                   WHERE "wp"."auth_user_id" = "auth"."uid"()
                   AND "wp"."congregation_id" = "check_congregation_id"
                   AND "wp"."can_edit" = true)
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.can_read_clean_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        -- Super admins can always read
        "public"."is_super_admin"("auth"."uid"())
        OR 
        -- Congregation admins can read for their congregation
        EXISTS (
            SELECT 1 
            FROM "public"."congregation_admin" "ca"
            WHERE "ca"."auth_user_id" = "auth"."uid"() 
            AND "ca"."congregation_id" = "check_congregation_id"
        )
        OR
        -- Users with clean_permission can read for their congregation
        EXISTS (
            SELECT 1 
            FROM "public"."clean_permission" "cp"
            WHERE "cp"."auth_user_id" = "auth"."uid"() 
            AND "cp"."congregation_id" = "check_congregation_id"
            AND "cp"."can_edit" = true
        )
        OR
        -- Any congregation member can read
        EXISTS (
            SELECT 1 
            FROM "public"."publisher" "p"
            WHERE "p"."auth_id" = "auth"."uid"() 
            AND "p"."congregation_id" = "check_congregation_id"
        )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_read_meeting_attendance_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (SELECT 1 FROM "public"."congregation_admin" "ca"
                   WHERE "ca"."auth_user_id" = "auth"."uid"()
                   AND "ca"."congregation_id" = "check_congregation_id")
        OR EXISTS (SELECT 1 FROM "public"."meeting_attendance_permission" "map"
                   WHERE "map"."auth_user_id" = "auth"."uid"()
                   AND "map"."congregation_id" = "check_congregation_id"
                   AND ("map"."can_read" = true OR "map"."can_edit" = true))
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.can_read_ministry_schedule_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (
            SELECT 1 FROM "public"."congregation_admin" "ca"
            WHERE "ca"."auth_user_id" = "auth"."uid"()
            AND "ca"."congregation_id" = "check_congregation_id"
        )
        OR EXISTS (
            SELECT 1 FROM "public"."service_overseer_permission" "sop"
            WHERE "sop"."auth_user_id" = "auth"."uid"()
            AND "sop"."congregation_id" = "check_congregation_id"
            AND "sop"."can_edit" = true
        )
        OR EXISTS (
            SELECT 1 FROM "public"."publisher" "p"
            WHERE "p"."auth_id" = "auth"."uid"()
            AND "p"."congregation_id" = "check_congregation_id"
        )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_read_speaker_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (SELECT 1 FROM "public"."congregation_admin" "ca"
                   WHERE "ca"."auth_user_id" = "auth"."uid"()
                   AND "ca"."congregation_id" = "check_congregation_id")
        OR EXISTS (SELECT 1 FROM "public"."speaker_permission" "sp"
                   WHERE "sp"."auth_user_id" = "auth"."uid"()
                   AND "sp"."congregation_id" = "check_congregation_id"
                   AND "sp"."can_edit" = true)
        OR EXISTS (SELECT 1 FROM "public"."publisher" "p"
                   WHERE "p"."auth_id" = "auth"."uid"()
                   AND "p"."congregation_id" = "check_congregation_id")
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.can_read_weekend_tables (
  check_congregation_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        "public"."is_super_admin"("auth"."uid"())
        OR EXISTS (SELECT 1 FROM "public"."congregation_admin" "ca"
                   WHERE "ca"."auth_user_id" = "auth"."uid"()
                   AND "ca"."congregation_id" = "check_congregation_id")
        OR EXISTS (SELECT 1 FROM "public"."weekend_permission" "wp"
                   WHERE "wp"."auth_user_id" = "auth"."uid"()
                   AND "wp"."congregation_id" = "check_congregation_id"
                   AND "wp"."can_edit" = true)
        OR EXISTS (SELECT 1 FROM "public"."publisher" "p"
                   WHERE "p"."auth_id" = "auth"."uid"()
                   AND "p"."congregation_id" = "check_congregation_id")
    );
END; $function$;

CREATE OR REPLACE FUNCTION public.create_publisher_auth_user (
  p_publisher_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_new_id uuid := gen_random_uuid();
  v_email  text := p_publisher_id::text || '@proclaimer.app';
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.publisher WHERE id = p_publisher_id) THEN
    RAISE EXCEPTION 'Publisher not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.publisher
    WHERE id = p_publisher_id AND auth_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Publisher already has an auth user';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    is_anonymous, is_sso_user,
    -- Token columns must be '' (not NULL) or GoTrue blows up with
    -- "Database error finding user".
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change,
    phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    '',
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    '{}'::jsonb,
    now(), now(),
    false, false,
    '', '',
    '', '', '',
    '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data,
    provider, created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    v_new_id,
    v_email,
    jsonb_build_object(
      'sub', v_new_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  INSERT INTO public.auth_user (auth_user_id, is_super_admin, created_by)
  VALUES (v_new_id, false, v_caller);

  UPDATE public.publisher SET auth_id = v_new_id WHERE id = p_publisher_id;
  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_congregation_id (
  check_user_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN (
        SELECT congregation_id 
        FROM publisher 
        WHERE auth_id = check_user_id 
        LIMIT 1
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_congregation_admin (
  check_user_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM congregation_admin 
        WHERE auth_user_id = check_user_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_congregation_admin_for_group (
  check_user_id  uuid,
  check_group_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM congregation_admin ca
        JOIN "group" g ON g.congregation_id = ca.congregation_id
        WHERE ca.auth_user_id = check_user_id
        AND g.id = check_group_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_secretary()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM "public"."secretary_permission"
    WHERE "auth_user_id" = "auth"."uid"()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_session_created_by_user (
  p_session_id uuid,
  p_user_id    uuid
)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.data_share_session
    WHERE id = p_session_id AND created_by = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.auth_user WHERE auth_user_id = auth.uid()),
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin (
  check_user_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM auth_user 
        WHERE auth_user_id = check_user_id 
        AND is_super_admin = true
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_user_session_participant (
  p_session_id uuid,
  p_user_id    uuid
)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.data_share_session_participant
    WHERE session_id = p_session_id AND user_id = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.regular_pioneer_check_overlap()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.regular_pioneer rp
        WHERE rp.publisher_id = NEW.publisher_id
          AND rp.id IS DISTINCT FROM NEW.id
          AND rp.start_month <= COALESCE(NEW.end_month, 'infinity'::date)
          AND COALESCE(rp.end_month, 'infinity'::date) >= NEW.start_month
    ) THEN
        RAISE EXCEPTION 'Overlapping regular pioneer period';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regular_pioneer_set_congregation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_congregation_id uuid;
BEGIN
    SELECT congregation_id INTO v_congregation_id
    FROM public.publisher
    WHERE id = NEW.publisher_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Publisher not found';
    END IF;

    NEW.congregation_id := v_congregation_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regular_pioneer_sync_type()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.sync_publisher_regular_pioneer_type(OLD.publisher_id);
        RETURN OLD;
    END IF;

    PERFORM public.sync_publisher_regular_pioneer_type(NEW.publisher_id);

    IF TG_OP = 'UPDATE' AND NEW.publisher_id IS DISTINCT FROM OLD.publisher_id THEN
        PERFORM public.sync_publisher_regular_pioneer_type(OLD.publisher_id);
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_email_hook (
  event jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id uuid;
  v_email   text;
  v_otp     text;
BEGIN
  v_user_id := NULLIF(event->'user'->>'id', '')::uuid;
  v_email   := event->'user'->>'email';
  v_otp     := COALESCE(event->'email_data'->>'token',
                        event->'email_data'->>'otp');

  IF v_otp IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO public.auth_otp_log (user_id, email, otp)
    VALUES (v_user_id, v_email, v_otp);
  END IF;

  RETURN '{}'::jsonb;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_publisher_regular_pioneer_type (
  p_publisher_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_first_of_month date := date_trunc('month', now())::date;
    v_is_active boolean;
    v_current_type text;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.regular_pioneer
        WHERE publisher_id = p_publisher_id
          AND start_month <= v_first_of_month
          AND (end_month IS NULL OR end_month >= v_first_of_month)
    ) INTO v_is_active;

    SELECT type INTO v_current_type
    FROM public.publisher
    WHERE id = p_publisher_id;

    IF v_is_active AND v_current_type IN ('publisher', 'continuous_auxiliary') THEN
        UPDATE public.publisher SET type = 'regular_pioneer' WHERE id = p_publisher_id;
    ELSIF NOT v_is_active AND v_current_type = 'regular_pioneer' THEN
        UPDATE public.publisher SET type = 'publisher' WHERE id = p_publisher_id;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_share_code (
  p_share_code text
)
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT id
  FROM public.data_share_session
  WHERE share_code = upper(p_share_code)
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1;
$function$;

ALTER TABLE "public"."auth_user"
  ADD CONSTRAINT "auth_user_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."av_overseer_permission"
  ADD CONSTRAINT "av_overseer_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."av_overseer_permission"
  ADD CONSTRAINT "av_overseer_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."clam_overseer_permission"
  ADD CONSTRAINT "clam_overseer_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."clam_overseer_permission"
  ADD CONSTRAINT "clam_overseer_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."clean_permission"
  ADD CONSTRAINT "clean_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."clean_permission"
  ADD CONSTRAINT "clean_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."cobe_permission"
  ADD CONSTRAINT "cobe_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."cobe_permission"
  ADD CONSTRAINT "cobe_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."av_assignment"
  ADD CONSTRAINT "av_assignment_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."av_overseer_permission"
  ADD CONSTRAINT "av_overseer_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."clam_overseer_permission"
  ADD CONSTRAINT "clam_overseer_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."clean_major"
  ADD CONSTRAINT "clean_major_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id);

ALTER TABLE "public"."clean_minor"
  ADD CONSTRAINT "clean_minor_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id);

ALTER TABLE "public"."clean_permission"
  ADD CONSTRAINT "clean_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."cobe_permission"
  ADD CONSTRAINT "cobe_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."congregation"
  ADD CONSTRAINT "congregation_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."congregation_admin"
  ADD CONSTRAINT "congregation_admin_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."congregation_admin"
  ADD CONSTRAINT "congregation_admin_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."congregation_admin"
  ADD CONSTRAINT "congregation_admin_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."data_share_session"
  ADD CONSTRAINT "data_share_session_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."data_share_session_participant"
  ADD CONSTRAINT "data_share_session_participant_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.data_share_session(id) ON DELETE CASCADE;

ALTER TABLE "public"."data_share_session_participant"
  ADD CONSTRAINT "data_share_session_participant_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."data_share_session"
  ADD CONSTRAINT "data_share_session_created_by_device_id_fkey" FOREIGN KEY (created_by_device_id) REFERENCES public.device(id) ON DELETE CASCADE;

ALTER TABLE "public"."data_share_session_participant"
  ADD CONSTRAINT "data_share_session_participant_device_id_fkey" FOREIGN KEY (device_id) REFERENCES public.device(id) ON DELETE CASCADE;

ALTER TABLE "public"."device"
  ADD CONSTRAINT "device_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."device_trust"
  ADD CONSTRAINT "device_trust_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."device_trust"
  ADD CONSTRAINT "device_trust_trusted_device_id_fkey" FOREIGN KEY (trusted_device_id) REFERENCES public.device(id) ON DELETE CASCADE;

ALTER TABLE "public"."device_trust"
  ADD CONSTRAINT "device_trust_trusted_user_id_fkey" FOREIGN KEY (trusted_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."do_not_call"
  ADD CONSTRAINT "do_not_call_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."elder_permission"
  ADD CONSTRAINT "elder_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."elder_permission"
  ADD CONSTRAINT "elder_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."elder_permission"
  ADD CONSTRAINT "elder_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."event"
  ADD CONSTRAINT "event_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id);

ALTER TABLE "public"."event_permission"
  ADD CONSTRAINT "event_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_permission"
  ADD CONSTRAINT "event_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."event_permission"
  ADD CONSTRAINT "event_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."group"
  ADD CONSTRAINT "group_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."clean_major"
  ADD CONSTRAINT "clean_major_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public."group"(id);

ALTER TABLE "public"."clean_minor"
  ADD CONSTRAINT "clean_minor_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public."group"(id);

ALTER TABLE "public"."map"
  ADD CONSTRAINT "map_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_checkout_map"
  ADD CONSTRAINT "map_checkout_map_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.map(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_checkout_publisher"
  ADD CONSTRAINT "map_checkout_publisher_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_checkout_map"
  ADD CONSTRAINT "map_checkout_map_map_checkout_publisher_id_fkey" FOREIGN KEY (map_checkout_publisher_id) REFERENCES public.map_checkout_publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_log"
  ADD CONSTRAINT "map_log_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.map(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_master"
  ADD CONSTRAINT "map_master_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_tag"
  ADD CONSTRAINT "map_tag_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_tag_assignment"
  ADD CONSTRAINT "map_tag_assignment_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.map(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_tag_assignment"
  ADD CONSTRAINT "map_tag_assignment_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.map_tag(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_attendance"
  ADD CONSTRAINT "meeting_attendance_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_attendance_permission"
  ADD CONSTRAINT "meeting_attendance_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_attendance_permission"
  ADD CONSTRAINT "meeting_attendance_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_attendance_permission"
  ADD CONSTRAINT "meeting_attendance_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."midweek_assignment"
  ADD CONSTRAINT "midweek_assignment_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."ministerial_servant_permission"
  ADD CONSTRAINT "ministerial_servant_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."ministerial_servant_permission"
  ADD CONSTRAINT "ministerial_servant_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."ministerial_servant_permission"
  ADD CONSTRAINT "ministerial_servant_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."ministry_schedule"
  ADD CONSTRAINT "ministry_schedule_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."not_at_home"
  ADD CONSTRAINT "not_at_home_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."publisher"
  ADD CONSTRAINT "publisher_auth_id_fkey" FOREIGN KEY (auth_id) REFERENCES auth.users(id);

ALTER TABLE "public"."publisher"
  ADD CONSTRAINT "publisher_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id);

ALTER TABLE "public"."publisher"
  ADD CONSTRAINT "publisher_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public."group"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "public"."av_assignment"
  ADD CONSTRAINT "av_assignment_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."av_participation"
  ADD CONSTRAINT "av_participation_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."group"
  ADD CONSTRAINT "group_assistant_id_fkey" FOREIGN KEY (assistant_id) REFERENCES public.publisher(id);

ALTER TABLE "public"."group"
  ADD CONSTRAINT "group_overseer_id_fkey" FOREIGN KEY (overseer_id) REFERENCES public.publisher(id);

ALTER TABLE "public"."map_checkout_publisher"
  ADD CONSTRAINT "map_checkout_publisher_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."map_log"
  ADD CONSTRAINT "map_log_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."midweek_assignment"
  ADD CONSTRAINT "midweek_assignment_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."midweek_participation"
  ADD CONSTRAINT "midweek_particpation_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."publisher"
  ADD CONSTRAINT "publisher_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.publisher(id) ON DELETE SET NULL;

ALTER TABLE "public"."regular_pioneer"
  ADD CONSTRAINT "regular_pioneer_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."regular_pioneer"
  ADD CONSTRAINT "regular_pioneer_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."regular_pioneer"
  ADD CONSTRAINT "regular_pioneer_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."reminder_permission"
  ADD CONSTRAINT "reminder_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."reminder_permission"
  ADD CONSTRAINT "reminder_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."report"
  ADD CONSTRAINT "report_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."report"
  ADD CONSTRAINT "report_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public."group"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "public"."report_permission"
  ADD CONSTRAINT "report_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."report_permission"
  ADD CONSTRAINT "report_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."report_permission"
  ADD CONSTRAINT "report_permission_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public."group"(id) ON DELETE CASCADE;

ALTER TABLE "public"."secretary_permission"
  ADD CONSTRAINT "secretary_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."secretary_permission"
  ADD CONSTRAINT "secretary_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."secretary_permission"
  ADD CONSTRAINT "secretary_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."service_overseer_permission"
  ADD CONSTRAINT "service_overseer_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."service_overseer_permission"
  ADD CONSTRAINT "service_overseer_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."service_overseer_permission"
  ADD CONSTRAINT "service_overseer_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."speaker_assignment"
  ADD CONSTRAINT "outgoing_speaker_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."speaker_availability"
  ADD CONSTRAINT "speaker_availability_speaker_id_fkey" FOREIGN KEY (speaker_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."speaker_outline"
  ADD CONSTRAINT "speaker_outline_outline_id_fkey" FOREIGN KEY (outline_id) REFERENCES public.outline(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."speaker_assignment"
  ADD CONSTRAINT "outgoing_speaker_outline_id_speaker_id_fkey" FOREIGN KEY (outline_id, speaker_id) REFERENCES public.speaker_outline(outline_id, speaker_id) ON DELETE CASCADE;

ALTER TABLE "public"."speaker_outline"
  ADD CONSTRAINT "speaker_outline_speaker_d_fkey" FOREIGN KEY (speaker_id) REFERENCES public.publisher(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."speaker_permission"
  ADD CONSTRAINT "speaker_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."speaker_permission"
  ADD CONSTRAINT "speaker_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."speaker_permission"
  ADD CONSTRAINT "speaker_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."street"
  ADD CONSTRAINT "street_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."do_not_call"
  ADD CONSTRAINT "do_not_call_street_id_fkey" FOREIGN KEY (street_id) REFERENCES public.street(id);

ALTER TABLE "public"."not_at_home"
  ADD CONSTRAINT "not_at_home_street_id_fkey" FOREIGN KEY (street_id) REFERENCES public.street(id) ON DELETE CASCADE;

ALTER TABLE "public"."suburb"
  ADD CONSTRAINT "suburb_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id);

ALTER TABLE "public"."do_not_call"
  ADD CONSTRAINT "do_not_call_suburb_id_fkey" FOREIGN KEY (suburb_id) REFERENCES public.suburb(id);

ALTER TABLE "public"."not_at_home"
  ADD CONSTRAINT "not_at_home_suburb_id_fkey" FOREIGN KEY (suburb_id) REFERENCES public.suburb(id) ON DELETE CASCADE;

ALTER TABLE "public"."street"
  ADD CONSTRAINT "street_suburb_id_fkey" FOREIGN KEY (suburb_id) REFERENCES public.suburb(id) ON DELETE CASCADE;

ALTER TABLE "public"."territory_servant_permission"
  ADD CONSTRAINT "territory_servant_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."territory_servant_permission"
  ADD CONSTRAINT "territory_servant_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."territory_servant_permission"
  ADD CONSTRAINT "territory_servant_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."watchtower_permission"
  ADD CONSTRAINT "watchtower_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."watchtower_permission"
  ADD CONSTRAINT "watchtower_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."watchtower_permission"
  ADD CONSTRAINT "watchtower_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."weekend_assignment"
  ADD CONSTRAINT "weekend_assignment_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."weekend_assignment"
  ADD CONSTRAINT "weekend_assignment_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."weekend_participation"
  ADD CONSTRAINT "weekend_particpation_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.publisher(id) ON DELETE CASCADE;

ALTER TABLE "public"."weekend_permission"
  ADD CONSTRAINT "weekend_permission_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."weekend_permission"
  ADD CONSTRAINT "weekend_permission_congregation_id_fkey" FOREIGN KEY (congregation_id) REFERENCES public.congregation(id) ON DELETE CASCADE;

ALTER TABLE "public"."weekend_permission"
  ADD CONSTRAINT "weekend_permission_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

CREATE VIEW "public"."do_not_call_view" AS  SELECT dnc.id,
    dnc.coordinates,
    dnc.congregation_id,
    dnc.suburb_id,
    dnc.street_id,
    dnc.house_number,
    dnc.unit_number,
    dnc.notes,
    dnc.match_data,
    dnc.created_at,
    dnc.updated_at,
    s.name AS street_name,
    sub.name AS suburb_name,
        CASE
            WHEN ((dnc.unit_number IS NOT NULL) AND (dnc.unit_number <> ''::text)) THEN concat(dnc.unit_number, '/', dnc.house_number, ' ', s.name, ', ', sub.name)
            ELSE concat(dnc.house_number, ' ', s.name, ', ', sub.name)
        END AS full_address,
    dnc.coordinates[1] AS longitude,
    dnc.coordinates[2] AS latitude
   FROM ((public.do_not_call dnc
     LEFT JOIN public.street s ON ((dnc.street_id = s.id)))
     LEFT JOIN public.suburb sub ON ((dnc.suburb_id = sub.id)));

CREATE VIEW "public"."midweek_meeting_detail_view" AS  SELECT mmd.week_id,
    c.id AS congregation_id,
    COALESCE(jsonb_object_agg(COALESCE(ma.assignment_id, 'null'::text),
        CASE
            WHEN (p.id IS NOT NULL) THEN jsonb_build_object('id', p.id, 'first_name', p.first_name, 'display_name', p.display_name, 'last_name', p.last_name)
            ELSE NULL::jsonb
        END) FILTER (WHERE ((ma.assignment_id IS NOT NULL) OR (p.id IS NOT NULL))), NULL::jsonb) AS participants,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'description', e.description, 'type', e.type, 'address', e.address, 'coordinates', e.coordinates, 'all_day', e.all_day, 'start_time', e.start_time, 'start_date', e.start_date, 'end_time', e.end_time, 'end_date', e.end_date)), '[]'::jsonb) AS "coalesce"
           FROM public.event e
          WHERE ((e.congregation_id = c.id) AND ((e.start_date <= (mmd.week_id + '6 days'::interval)) AND (COALESCE(e.end_date, e.start_date) >= mmd.week_id)))) AS events,
    row_to_json(mmd.*) AS meeting_data
   FROM (((public.congregation c
     CROSS JOIN public.midweek_meeting_data mmd)
     LEFT JOIN public.midweek_assignment ma ON (((mmd.week_id = ma.week_id) AND (c.id = ma.congregation_id))))
     LEFT JOIN public.publisher p ON ((ma.participant_id = p.id)))
  GROUP BY mmd.week_id, c.id;

CREATE VIEW "public"."midweek_participant_view" AS  SELECT p.id,
    p.congregation_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.middle_name,
    p.gender,
    p.standing,
    p.type,
    COALESCE(participation_data.participation, ARRAY[]::text[]) AS participation,
    COALESCE(assignment_data.midweek_assignment, ARRAY[]::json[]) AS midweek_assignment
   FROM ((public.publisher p
     LEFT JOIN ( SELECT midweek_participation.participant_id,
            array_agg(DISTINCT midweek_participation.participation_id) AS participation
           FROM public.midweek_participation
          GROUP BY midweek_participation.participant_id) participation_data ON ((p.id = participation_data.participant_id)))
     LEFT JOIN ( SELECT distinct_assignments.participant_id,
            array_agg(json_build_object('week_id', distinct_assignments.week_id, 'assignment_id', distinct_assignments.assignment_id)) AS midweek_assignment
           FROM ( SELECT DISTINCT midweek_assignment.participant_id,
                    midweek_assignment.week_id,
                    midweek_assignment.assignment_id
                   FROM public.midweek_assignment) distinct_assignments
          GROUP BY distinct_assignments.participant_id) assignment_data ON ((p.id = assignment_data.participant_id)));

CREATE VIEW "public"."not_at_home_view" AS  SELECT na.id,
    na.coordinates,
    na.congregation_id,
    na.house_number,
    na.unit_number,
    na.visit_log,
    na.write,
    na.match_data,
    na.created_at,
    s.name AS street_name,
    sub.name AS suburb_name,
        CASE
            WHEN ((na.unit_number IS NOT NULL) AND (na.unit_number <> ''::text)) THEN concat(na.unit_number, '/', na.house_number, ' ', s.name, ', ', sub.name)
            ELSE concat(na.house_number, ' ', s.name, ', ', sub.name)
        END AS full_address,
        CASE
            WHEN (array_length(na.coordinates, 1) >= 2) THEN na.coordinates[1]
            ELSE NULL::double precision
        END AS longitude,
        CASE
            WHEN (array_length(na.coordinates, 1) >= 2) THEN na.coordinates[2]
            ELSE NULL::double precision
        END AS latitude
   FROM ((public.not_at_home na
     LEFT JOIN public.street s ON ((na.street_id = s.id)))
     LEFT JOIN public.suburb sub ON ((na.suburb_id = sub.id)))
  WHERE ((na.coordinates IS NOT NULL) AND (array_length(na.coordinates, 1) >= 2) AND (na.coordinates[1] IS NOT NULL) AND (na.coordinates[2] IS NOT NULL));

CREATE VIEW "public"."publisher_view" AS  SELECT publisher.id,
    publisher.first_name,
    publisher.middle_name,
    publisher.last_name,
    publisher.display_name,
    publisher.congregation_id,
    publisher.standing,
    publisher.type,
    publisher.gender,
    publisher.family_id,
    row_to_json(congregation.*) AS congregation,
    array_agg(DISTINCT jsonb_build_object('id', o.id, 'theme', o.theme)) FILTER (WHERE (o.id IS NOT NULL)) AS outline,
    array_agg(DISTINCT midweek_participation.participation_id) AS midweek_participation,
    array_agg(DISTINCT jsonb_build_object('week_id', ma.week_id, 'assignment_id', ma.assignment_id)) FILTER (WHERE ((ma.week_id IS NOT NULL) AND (ma.assignment_id IS NOT NULL))) AS midweek_assignment,
    array_agg(DISTINCT weekend_participation.participation_id) AS weekend_participation,
    array_agg(DISTINCT jsonb_build_object('week_id', wa.week_id, 'assignment_id', wa.assignment_id)) FILTER (WHERE ((wa.week_id IS NOT NULL) AND (wa.assignment_id IS NOT NULL))) AS weekend_assignment,
    array_agg(DISTINCT av_participation.participation_id) AS av_participation,
    array_agg(DISTINCT jsonb_build_object('week_id', ava.week_id, 'assignment_id', ava.assignment_id)) FILTER (WHERE ((ava.week_id IS NOT NULL) AND (ava.assignment_id IS NOT NULL))) AS av_assignment
   FROM (((((((((public.publisher
     LEFT JOIN public.midweek_assignment ma ON ((publisher.id = ma.participant_id)))
     LEFT JOIN public.midweek_participation ON ((publisher.id = midweek_participation.participant_id)))
     LEFT JOIN public.weekend_assignment wa ON ((publisher.id = wa.participant_id)))
     LEFT JOIN public.weekend_participation ON ((publisher.id = weekend_participation.participant_id)))
     LEFT JOIN public.av_assignment ava ON ((publisher.id = ava.participant_id)))
     LEFT JOIN public.av_participation ON ((publisher.id = av_participation.participant_id)))
     LEFT JOIN public.speaker_outline so ON ((publisher.id = so.speaker_id)))
     LEFT JOIN public.outline o ON ((so.outline_id = o.id)))
     LEFT JOIN public.congregation ON ((publisher.congregation_id = congregation.id)))
  GROUP BY publisher.id, congregation.*;

CREATE VIEW "public"."speaker_assignment_view" AS  SELECT speaker_assignment.week_id,
    speaker_assignment.speaker_id,
    congregation.name,
    publisher.first_name,
    publisher.last_name,
    outline.theme,
    outline.id AS outline_id
   FROM (((public.speaker_assignment
     LEFT JOIN public.congregation ON ((congregation.id = speaker_assignment.congregation_id)))
     LEFT JOIN public.publisher ON ((publisher.id = speaker_assignment.speaker_id)))
     LEFT JOIN public.outline ON ((outline.id = speaker_assignment.outline_id)));

CREATE VIEW "public"."speaker_view" AS  SELECT p.id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.middle_name,
    COALESCE(c.congregation_id, p.congregation_id) AS congregation_id,
    p.standing,
    p.type,
    row_to_json(c.*) AS congregation,
    (c.congregation_id IS NULL) AS is_local,
    sa.availability,
    json_agg(DISTINCT jsonb_build_object('week_id', sas.week_id, 'outline', row_to_json(sao.*), 'congregation', row_to_json(sac.*))) FILTER (WHERE (sas.week_id IS NOT NULL)) AS assignment,
    json_agg(DISTINCT jsonb_build_object('id', soo.id, 'theme', soo.theme)) FILTER (WHERE (soo.id IS NOT NULL)) AS outline
   FROM (((((((public.publisher p
     LEFT JOIN public.congregation c ON ((p.congregation_id = c.id)))
     LEFT JOIN public.speaker_availability sa ON ((p.id = sa.speaker_id)))
     LEFT JOIN public.speaker_assignment sas ON ((p.id = sas.speaker_id)))
     LEFT JOIN public.congregation sac ON ((sas.congregation_id = sac.id)))
     LEFT JOIN public.outline sao ON ((sas.outline_id = sao.id)))
     LEFT JOIN public.speaker_outline so ON ((p.id = so.speaker_id)))
     LEFT JOIN public.outline soo ON ((so.outline_id = soo.id)))
  WHERE (so.outline_id IS NOT NULL)
  GROUP BY p.id, p.congregation_id, p.first_name, p.last_name, c.*, c.congregation_id, sa.availability;

CREATE VIEW "public"."week_view" AS  WITH event_weeks AS (
         SELECT e.congregation_id,
            (generate_series(((date_trunc('week'::text, (e.start_date)::timestamp without time zone))::date)::timestamp with time zone, ((date_trunc('week'::text, (COALESCE(e.end_date, e.start_date))::timestamp without time zone))::date)::timestamp with time zone, '7 days'::interval))::date AS week_id
           FROM public.event e
        ), midweek_weeks AS (
         SELECT ma.congregation_id,
            ma.week_id
           FROM public.midweek_assignment ma
        ), weekend_weeks AS (
         SELECT wa.congregation_id,
            wa.week_id
           FROM public.weekend_assignment wa
        ), speaker_weeks AS (
         SELECT sa.congregation_id,
            sa.week_id
           FROM public.speaker_assignment sa
        ), midweek_meeting_weeks AS (
         SELECT c.id AS congregation_id,
            mmd.week_id
           FROM (public.congregation c
             CROSS JOIN public.midweek_meeting_data mmd)
        ), clean_major_weeks AS (
         SELECT cm.congregation_id,
            cm.week_id
           FROM public.clean_major cm
        ), clean_minor_weeks AS (
         SELECT cmn.congregation_id,
            cmn.week_id
           FROM public.clean_minor cmn
        ), av_weeks AS (
         SELECT av.congregation_id,
            av.week_id
           FROM public.av_assignment av
        ), all_weeks AS (
         SELECT event_weeks.congregation_id,
            event_weeks.week_id
           FROM event_weeks
        UNION
         SELECT midweek_weeks.congregation_id,
            midweek_weeks.week_id
           FROM midweek_weeks
        UNION
         SELECT weekend_weeks.congregation_id,
            weekend_weeks.week_id
           FROM weekend_weeks
        UNION
         SELECT speaker_weeks.congregation_id,
            speaker_weeks.week_id
           FROM speaker_weeks
        UNION
         SELECT midweek_meeting_weeks.congregation_id,
            midweek_meeting_weeks.week_id
           FROM midweek_meeting_weeks
        UNION
         SELECT clean_major_weeks.congregation_id,
            clean_major_weeks.week_id
           FROM clean_major_weeks
        UNION
         SELECT clean_minor_weeks.congregation_id,
            clean_minor_weeks.week_id
           FROM clean_minor_weeks
        UNION
         SELECT av_weeks.congregation_id,
            av_weeks.week_id
           FROM av_weeks
        )
 SELECT congregation_id,
    week_id
   FROM all_weeks aw
  GROUP BY congregation_id, week_id;

CREATE VIEW "public"."av_assignment_view" AS  SELECT base_weeks.week_id,
    base_weeks.congregation_id,
    COALESCE(jsonb_object_agg(COALESCE(av_assignment.assignment_id, 'null'::text),
        CASE
            WHEN (p.id IS NOT NULL) THEN row_to_json(p.*)
            ELSE NULL::json
        END) FILTER (WHERE ((av_assignment.assignment_id IS NOT NULL) OR (p.id IS NOT NULL))), NULL::jsonb) AS assignment,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'description', e.description, 'type', e.type, 'address', e.address, 'coordinates', e.coordinates, 'all_day', e.all_day, 'start_time', e.start_time, 'start_date', e.start_date, 'end_time', e.end_time, 'end_date', e.end_date)), '[]'::jsonb) AS "coalesce"
           FROM public.event e
          WHERE ((e.congregation_id = base_weeks.congregation_id) AND ((e.start_date <= (base_weeks.week_id + '6 days'::interval)) AND (COALESCE(e.end_date, e.start_date) >= base_weeks.week_id)))) AS events
   FROM ((public.week_view base_weeks
     LEFT JOIN public.av_assignment ON ((base_weeks.week_id = av_assignment.week_id)))
     LEFT JOIN public.publisher p ON ((av_assignment.participant_id = p.id)))
  GROUP BY base_weeks.week_id, base_weeks.congregation_id;

CREATE VIEW "public"."weekend_meeting_detail_view" AS  SELECT base_weeks.congregation_id,
    base_weeks.week_id,
    COALESCE(json_object_agg(assignment_data.assignment_id, assignment_data.assignment_obj) FILTER (WHERE (assignment_data.assignment_obj IS NOT NULL)), '{}'::json) AS assignment,
    COALESCE((min((public_talk_data.public_talk_obj)::text))::json, '{}'::json) AS public_talk,
    COALESCE((jsonb_agg(DISTINCT (outgoing_data.outgoing_obj)::jsonb) FILTER (WHERE (outgoing_data.outgoing_obj IS NOT NULL)))::json, '[]'::json) AS outgoing,
    COALESCE(events_data.events, '[]'::jsonb) AS event
   FROM ((((public.week_view base_weeks
     LEFT JOIN ( SELECT wa.congregation_id,
            wa.week_id,
            wa.assignment_id,
            json_build_object('participant_id', wa.participant_id, 'first_name', p.first_name, 'middle_name', p.middle_name, 'last_name', p.last_name, 'display_name', p.display_name, 'standing', p.standing, 'type', p.type, 'gender', p.gender) AS assignment_obj
           FROM (public.weekend_assignment wa
             LEFT JOIN public.publisher p ON ((wa.participant_id = p.id)))
          WHERE (wa.assignment_id = ANY (ARRAY['reader'::text, 'chairman'::text]))) assignment_data ON (((base_weeks.congregation_id = assignment_data.congregation_id) AND (base_weeks.week_id = assignment_data.week_id))))
     LEFT JOIN ( SELECT sa.congregation_id,
            sa.week_id,
            json_build_object('speaker_id', sa.speaker_id, 'outline', json_build_object('id', sa.outline_id, 'theme', o.theme), 'speaker', json_build_object('first_name', p.first_name, 'middle_name', p.middle_name, 'last_name', p.last_name, 'display_name', p.display_name, 'standing', p.standing, 'type', p.type, 'gender', p.gender), 'congregation', json_build_object('id', c.id, 'name', c.name)) AS public_talk_obj
           FROM (((public.speaker_assignment sa
             LEFT JOIN public.publisher p ON ((sa.speaker_id = p.id)))
             LEFT JOIN public.outline o ON ((sa.outline_id = o.id)))
             LEFT JOIN public.congregation c ON ((p.congregation_id = c.id)))) public_talk_data ON (((base_weeks.congregation_id = public_talk_data.congregation_id) AND (base_weeks.week_id = public_talk_data.week_id))))
     LEFT JOIN ( SELECT p.congregation_id,
            sa.week_id,
            json_build_object('speaker_id', sa.speaker_id, 'outline', json_build_object('id', sa.outline_id, 'theme', o.theme), 'destination_congregation', c.name, 'speaker', json_build_object('first_name', p.first_name, 'middle_name', p.middle_name, 'last_name', p.last_name, 'display_name', p.display_name, 'standing', p.standing, 'type', p.type, 'gender', p.gender), 'outline', json_build_object('id', o.id, 'theme', o.theme)) AS outgoing_obj
           FROM (((public.speaker_assignment sa
             LEFT JOIN public.publisher p ON ((sa.speaker_id = p.id)))
             LEFT JOIN public.outline o ON ((sa.outline_id = o.id)))
             LEFT JOIN public.congregation c ON ((sa.congregation_id = c.id)))
          WHERE (sa.congregation_id <> p.congregation_id)) outgoing_data ON (((base_weeks.congregation_id = outgoing_data.congregation_id) AND (base_weeks.week_id = outgoing_data.week_id))))
     LEFT JOIN ( SELECT w.congregation_id,
            w.week_id,
            jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'description', e.description, 'type', e.type, 'address', e.address, 'coordinates', e.coordinates, 'all_day', e.all_day, 'start_date', e.start_date, 'start_time', e.start_time, 'end_date', e.end_date, 'end_time', e.end_time)) AS events
           FROM (public.week_view w
             JOIN public.event e ON (((e.congregation_id = w.congregation_id) AND (e.start_date <= (w.week_id + '6 days'::interval)) AND (COALESCE(e.end_date, e.start_date) >= w.week_id))))
          GROUP BY w.congregation_id, w.week_id) events_data ON (((base_weeks.congregation_id = events_data.congregation_id) AND (base_weeks.week_id = events_data.week_id))))
  GROUP BY base_weeks.congregation_id, base_weeks.week_id, events_data.events
  ORDER BY base_weeks.congregation_id, base_weeks.week_id;

CREATE VIEW "public"."weekend_participant_view" AS  SELECT p.id,
    p.congregation_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.middle_name,
    p.gender,
    p.standing,
    p.type,
    COALESCE(participation_data.participation, ARRAY[]::text[]) AS participation,
    COALESCE(assignment_data.weekend_assignment, ARRAY[]::json[]) AS weekend_assignment
   FROM ((public.publisher p
     LEFT JOIN ( SELECT weekend_participation.participant_id,
            array_agg(DISTINCT weekend_participation.participation_id) AS participation
           FROM public.weekend_participation
          GROUP BY weekend_participation.participant_id) participation_data ON ((p.id = participation_data.participant_id)))
     LEFT JOIN ( SELECT distinct_assignments.participant_id,
            array_agg(json_build_object('week_id', distinct_assignments.week_id, 'assignment_id', distinct_assignments.assignment_id)) AS weekend_assignment
           FROM ( SELECT DISTINCT weekend_assignment.participant_id,
                    weekend_assignment.week_id,
                    weekend_assignment.assignment_id
                   FROM public.weekend_assignment) distinct_assignments
          GROUP BY distinct_assignments.participant_id) assignment_data ON ((p.id = assignment_data.participant_id)));

CREATE UNIQUE INDEX do_not_call_coalesce_house_number_street_id_suburb_id_idx ON public.do_not_call
  USING btree (COALESCE(unit_number, ''::text), house_number, street_id, suburb_id);

CREATE INDEX idx_auth_otp_log_created ON public.auth_otp_log USING btree (created_at);

CREATE INDEX idx_auth_otp_log_email ON public.auth_otp_log USING btree (email);

CREATE INDEX idx_auth_otp_log_user_id ON public.auth_otp_log USING btree (user_id);

CREATE INDEX regular_pioneer_congregation_id_idx ON public.regular_pioneer USING btree (congregation_id);

CREATE INDEX regular_pioneer_publisher_id_idx ON public.regular_pioneer USING btree (publisher_id);

CREATE INDEX report_group_id_idx ON public.report USING btree (group_id);

CREATE UNIQUE INDEX unique_not_at_home_combination ON public.not_at_home USING btree (COALESCE(unit_number, ''::text), house_number, street_id, suburb_id);

CREATE TRIGGER update_clean_permission_updated_at
  BEFORE UPDATE ON public.clean_permission
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER map_checkout_publisher_updated_at
  BEFORE UPDATE ON public.map_checkout_publisher
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_attendance_permission_updated_at
  BEFORE UPDATE ON public.meeting_attendance_permission
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER regular_pioneer_check_overlap
  BEFORE INSERT OR UPDATE ON public.regular_pioneer
  FOR EACH ROW
  EXECUTE FUNCTION public.regular_pioneer_check_overlap();

CREATE TRIGGER regular_pioneer_set_congregation
  BEFORE INSERT OR UPDATE ON public.regular_pioneer
  FOR EACH ROW
  EXECUTE FUNCTION public.regular_pioneer_set_congregation();

CREATE TRIGGER regular_pioneer_sync_type
  AFTER INSERT OR DELETE OR UPDATE ON public.regular_pioneer
  FOR EACH ROW
  EXECUTE FUNCTION public.regular_pioneer_sync_type();

CREATE TRIGGER regular_pioneer_updated_at
  BEFORE UPDATE ON public.regular_pioneer
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_permission_updated_at
  BEFORE UPDATE ON public.report_permission
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_secretary_permission_updated_at
  BEFORE UPDATE ON public.secretary_permission
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "auth_otp_log_delete_admin" ON "public"."auth_otp_log"
  FOR DELETE
  TO PUBLIC
  USING (public.is_super_admin());

CREATE POLICY "auth_otp_log_insert_deny" ON "public"."auth_otp_log"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (false);

CREATE POLICY "auth_otp_log_select_admin" ON "public"."auth_otp_log"
  FOR SELECT
  TO PUBLIC
  USING (public.is_super_admin());

CREATE POLICY "auth_otp_log_select_own" ON "public"."auth_otp_log"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "auth_otp_log_update_admin" ON "public"."auth_otp_log"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "auth_otp_log_update_own" ON "public"."auth_otp_log"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "auth_user_delete" ON "public"."auth_user"
  FOR DELETE
  TO PUBLIC
  USING (public.is_super_admin());

CREATE POLICY "auth_user_insert" ON "public"."auth_user"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (false);

CREATE POLICY "auth_user_select_super_admins_public" ON "public"."auth_user"
  FOR SELECT
  TO PUBLIC
  USING ((is_super_admin = true));

CREATE POLICY "auth_user_select" ON "public"."auth_user"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = auth_user_id) OR public.is_super_admin()));

CREATE POLICY "auth_user_update" ON "public"."auth_user"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = auth_user_id))
  WITH CHECK ((auth.uid() = auth_user_id));

CREATE POLICY "clean_major_delete" ON "public"."clean_major"
  FOR DELETE
  TO PUBLIC
  USING (public.can_edit_clean_tables(congregation_id));

CREATE POLICY "clean_major_insert" ON "public"."clean_major"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.can_edit_clean_tables(congregation_id));

CREATE POLICY "clean_major_select" ON "public"."clean_major"
  FOR SELECT
  TO PUBLIC
  USING (public.can_read_clean_tables(congregation_id));

CREATE POLICY "clean_major_update" ON "public"."clean_major"
  FOR UPDATE
  TO PUBLIC
  USING (public.can_edit_clean_tables(congregation_id));

CREATE POLICY "clean_minor_delete" ON "public"."clean_minor"
  FOR DELETE
  TO PUBLIC
  USING (public.can_edit_clean_tables(congregation_id));

CREATE POLICY "clean_minor_insert" ON "public"."clean_minor"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.can_edit_clean_tables(congregation_id));

CREATE POLICY "clean_minor_select" ON "public"."clean_minor"
  FOR SELECT
  TO PUBLIC
  USING (public.can_read_clean_tables(congregation_id));

CREATE POLICY "clean_minor_update" ON "public"."clean_minor"
  FOR UPDATE
  TO PUBLIC
  USING (public.can_edit_clean_tables(congregation_id));

CREATE POLICY "clean_permission_delete" ON "public"."clean_permission"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = clean_permission.congregation_id)))))));

CREATE POLICY "clean_permission_insert" ON "public"."clean_permission"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = clean_permission.congregation_id)))))));

CREATE POLICY "clean_permission_select" ON "public"."clean_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = clean_permission.congregation_id)))))));

CREATE POLICY "clean_permission_update" ON "public"."clean_permission"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = clean_permission.congregation_id)))))));

CREATE POLICY "congregation_admin_delete_super_admin" ON "public"."congregation_admin"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.auth_user
  WHERE ((auth_user.auth_user_id = auth.uid()) AND (auth_user.is_super_admin = true)))));

CREATE POLICY "congregation_admin_insert_super_admin" ON "public"."congregation_admin"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.auth_user
  WHERE ((auth_user.auth_user_id = auth.uid()) AND (auth_user.is_super_admin = true)))));

CREATE POLICY "congregation_admin_select_all" ON "public"."congregation_admin"
  FOR SELECT
  TO PUBLIC
  USING (((EXISTS ( SELECT 1
   FROM public.auth_user
  WHERE ((auth_user.auth_user_id = auth.uid()) AND (auth_user.is_super_admin = true)))) OR (auth_user_id = auth.uid())));

CREATE POLICY "data_share_session_delete_owner" ON "public"."data_share_session"
  FOR DELETE
  TO PUBLIC
  USING ((created_by = auth.uid()));

CREATE POLICY "data_share_session_insert_owner" ON "public"."data_share_session"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((created_by = auth.uid()));

CREATE POLICY "data_share_session_select_owner" ON "public"."data_share_session"
  FOR SELECT
  TO PUBLIC
  USING ((created_by = auth.uid()));

CREATE POLICY "data_share_session_select_participant" ON "public"."data_share_session"
  FOR SELECT
  TO PUBLIC
  USING (public.is_user_session_participant(id, auth.uid()));

CREATE POLICY "data_share_session_update_owner" ON "public"."data_share_session"
  FOR UPDATE
  TO PUBLIC
  USING ((created_by = auth.uid()))
  WITH CHECK ((created_by = auth.uid()));

CREATE POLICY "data_share_session_participant_delete_owner" ON "public"."data_share_session_participant"
  FOR DELETE
  TO PUBLIC
  USING (public.is_session_created_by_user(session_id, auth.uid()));

CREATE POLICY "data_share_session_participant_insert_own" ON "public"."data_share_session_participant"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "data_share_session_participant_select_owner" ON "public"."data_share_session_participant"
  FOR SELECT
  TO PUBLIC
  USING (public.is_session_created_by_user(session_id, auth.uid()));

CREATE POLICY "data_share_session_participant_select_own" ON "public"."data_share_session_participant"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "device_delete_own" ON "public"."device"
  FOR DELETE
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "device_insert_own" ON "public"."device"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "device_select_own" ON "public"."device"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

CREATE POLICY "device_select_trusted" ON "public"."device"
  FOR SELECT
  TO PUBLIC
  USING ((id IN ( SELECT device_trust.trusted_device_id
   FROM public.device_trust
  WHERE (device_trust.owner_id = auth.uid()))));

CREATE POLICY "device_update_own" ON "public"."device"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "device_trust_delete_own" ON "public"."device_trust"
  FOR DELETE
  TO PUBLIC
  USING ((owner_id = auth.uid()));

CREATE POLICY "device_trust_insert_own" ON "public"."device_trust"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "device_trust_select_own" ON "public"."device_trust"
  FOR SELECT
  TO PUBLIC
  USING ((owner_id = auth.uid()));

CREATE POLICY "device_trust_update_own" ON "public"."device_trust"
  FOR UPDATE
  TO PUBLIC
  USING ((owner_id = auth.uid()))
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "Admins can manage event permissions" ON "public"."event_permission"
  FOR ALL
  TO PUBLIC
  USING (((congregation_id IN ( SELECT congregation_admin.congregation_id
   FROM public.congregation_admin
  WHERE (congregation_admin.auth_user_id = auth.uid()))) OR (auth.uid() IN ( SELECT auth_user.auth_user_id
   FROM public.auth_user
  WHERE (auth_user.is_super_admin = true)))));

CREATE POLICY "Users can read event permissions in congregation" ON "public"."event_permission"
  FOR SELECT
  TO PUBLIC
  USING (((congregation_id IN ( SELECT congregation_admin.congregation_id
   FROM public.congregation_admin
  WHERE (congregation_admin.auth_user_id = auth.uid()))) OR (auth_user_id = auth.uid())));

CREATE POLICY "Users can read own event permissions" ON "public"."event_permission"
  FOR SELECT
  TO PUBLIC
  USING ((auth_user_id = auth.uid()));

CREATE POLICY "map_checkout_map_delete" ON "public"."map_checkout_map"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.map_checkout_publisher mcp
     JOIN public.congregation_admin ca ON ((ca.congregation_id = mcp.congregation_id)))
  WHERE ((mcp.id = map_checkout_map.map_checkout_publisher_id) AND (ca.auth_user_id = auth.uid()))))));

CREATE POLICY "map_checkout_map_insert" ON "public"."map_checkout_map"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.map_checkout_publisher mcp
     JOIN public.congregation_admin ca ON ((ca.congregation_id = mcp.congregation_id)))
  WHERE ((mcp.id = map_checkout_map.map_checkout_publisher_id) AND (ca.auth_user_id = auth.uid()))))));

CREATE POLICY "map_checkout_map_select" ON "public"."map_checkout_map"
  FOR SELECT
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.map_checkout_publisher mcp
     JOIN public.congregation_admin ca ON ((ca.congregation_id = mcp.congregation_id)))
  WHERE ((mcp.id = map_checkout_map.map_checkout_publisher_id) AND (ca.auth_user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.map_checkout_publisher mcp
     JOIN public.publisher p ON ((p.id = mcp.publisher_id)))
  WHERE ((mcp.id = map_checkout_map.map_checkout_publisher_id) AND (p.auth_id = auth.uid()))))));

CREATE POLICY "map_checkout_map_update" ON "public"."map_checkout_map"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.map_checkout_publisher mcp
     JOIN public.congregation_admin ca ON ((ca.congregation_id = mcp.congregation_id)))
  WHERE ((mcp.id = map_checkout_map.map_checkout_publisher_id) AND (ca.auth_user_id = auth.uid()))))));

CREATE POLICY "map_checkout_publisher_delete" ON "public"."map_checkout_publisher"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = map_checkout_publisher.congregation_id)))))));

CREATE POLICY "map_checkout_publisher_insert" ON "public"."map_checkout_publisher"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = map_checkout_publisher.congregation_id)))))));

CREATE POLICY "map_checkout_publisher_select" ON "public"."map_checkout_publisher"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() IN ( SELECT p.auth_id
   FROM public.publisher p
  WHERE (p.id = map_checkout_publisher.publisher_id))) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = map_checkout_publisher.congregation_id)))))));

CREATE POLICY "map_checkout_publisher_update" ON "public"."map_checkout_publisher"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = map_checkout_publisher.congregation_id)))))));

CREATE POLICY "meeting_attendance_delete" ON "public"."meeting_attendance"
  FOR DELETE
  TO PUBLIC
  USING (public.can_edit_meeting_attendance_tables(congregation_id));

CREATE POLICY "meeting_attendance_insert" ON "public"."meeting_attendance"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.can_edit_meeting_attendance_tables(congregation_id));

CREATE POLICY "meeting_attendance_select" ON "public"."meeting_attendance"
  FOR SELECT
  TO PUBLIC
  USING (public.can_read_meeting_attendance_tables(congregation_id));

CREATE POLICY "meeting_attendance_update" ON "public"."meeting_attendance"
  FOR UPDATE
  TO PUBLIC
  USING (public.can_edit_meeting_attendance_tables(congregation_id));

CREATE POLICY "meeting_attendance_permission_delete" ON "public"."meeting_attendance_permission"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = meeting_attendance_permission.congregation_id)))))));

CREATE POLICY "meeting_attendance_permission_insert" ON "public"."meeting_attendance_permission"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = meeting_attendance_permission.congregation_id)))))));

CREATE POLICY "meeting_attendance_permission_select" ON "public"."meeting_attendance_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = meeting_attendance_permission.congregation_id)))))));

CREATE POLICY "meeting_attendance_permission_update" ON "public"."meeting_attendance_permission"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = meeting_attendance_permission.congregation_id)))))));

CREATE POLICY "ministerial_servant_permission_delete" ON "public"."ministerial_servant_permission"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = ministerial_servant_permission.congregation_id)))))));

CREATE POLICY "ministerial_servant_permission_insert" ON "public"."ministerial_servant_permission"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = ministerial_servant_permission.congregation_id)))))));

CREATE POLICY "ministerial_servant_permission_select" ON "public"."ministerial_servant_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = ministerial_servant_permission.congregation_id)))))));

CREATE POLICY "ministerial_servant_permission_update" ON "public"."ministerial_servant_permission"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = ministerial_servant_permission.congregation_id)))))));

CREATE POLICY "ministry_schedule_delete" ON "public"."ministry_schedule"
  FOR DELETE
  TO PUBLIC
  USING (public.can_edit_ministry_schedule_tables(congregation_id));

CREATE POLICY "ministry_schedule_insert" ON "public"."ministry_schedule"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.can_edit_ministry_schedule_tables(congregation_id));

CREATE POLICY "ministry_schedule_select" ON "public"."ministry_schedule"
  FOR SELECT
  TO PUBLIC
  USING (public.can_read_ministry_schedule_tables(congregation_id));

CREATE POLICY "ministry_schedule_update" ON "public"."ministry_schedule"
  FOR UPDATE
  TO PUBLIC
  USING (public.can_edit_ministry_schedule_tables(congregation_id));

CREATE POLICY "regular_pioneer_delete" ON "public"."regular_pioneer"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = regular_pioneer.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.secretary_permission sp
  WHERE ((sp.auth_user_id = auth.uid()) AND (sp.congregation_id = regular_pioneer.congregation_id) AND (sp.can_edit = true))))));

CREATE POLICY "regular_pioneer_insert" ON "public"."regular_pioneer"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = regular_pioneer.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.secretary_permission sp
  WHERE ((sp.auth_user_id = auth.uid()) AND (sp.congregation_id = regular_pioneer.congregation_id) AND (sp.can_edit = true))))));

CREATE POLICY "regular_pioneer_select" ON "public"."regular_pioneer"
  FOR SELECT
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = regular_pioneer.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.publisher p
  WHERE ((p.auth_id = auth.uid()) AND (p.congregation_id = regular_pioneer.congregation_id))))));

CREATE POLICY "regular_pioneer_update" ON "public"."regular_pioneer"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = regular_pioneer.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.secretary_permission sp
  WHERE ((sp.auth_user_id = auth.uid()) AND (sp.congregation_id = regular_pioneer.congregation_id) AND (sp.can_edit = true))))))
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = regular_pioneer.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.secretary_permission sp
  WHERE ((sp.auth_user_id = auth.uid()) AND (sp.congregation_id = regular_pioneer.congregation_id) AND (sp.can_edit = true))))));

CREATE POLICY "Allow congregation admins and super admins to manage reminder_p" ON "public"."reminder_permission"
  FOR ALL
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = reminder_permission.congregation_id))))));

CREATE POLICY "Allow users to read their own reminder_permission" ON "public"."reminder_permission"
  FOR SELECT
  TO PUBLIC
  USING ((auth_user_id = auth.uid()));

CREATE POLICY "report_delete_policy" ON "public"."report"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = report.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.report_permission rp
  WHERE ((rp.auth_user_id = auth.uid()) AND (rp.group_id = report.group_id) AND (rp.can_edit = true)))) OR (EXISTS ( SELECT 1
   FROM public.publisher p
  WHERE ((p.auth_id = auth.uid()) AND (p.id = report.confidential_id))))));

CREATE POLICY "report_insert_policy" ON "public"."report"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = report.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.report_permission rp
  WHERE ((rp.auth_user_id = auth.uid()) AND (rp.group_id = report.group_id) AND (rp.can_edit = true)))) OR (EXISTS ( SELECT 1
   FROM public.publisher p
  WHERE ((p.auth_id = auth.uid()) AND (p.id = report.confidential_id))))));

CREATE POLICY "report_select_policy" ON "public"."report"
  FOR SELECT
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = report.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.report_permission rp
  WHERE ((rp.auth_user_id = auth.uid()) AND (rp.group_id = report.group_id) AND (rp.can_read = true)))) OR (EXISTS ( SELECT 1
   FROM public.publisher p
  WHERE ((p.auth_id = auth.uid()) AND (p.id = report.confidential_id))))));

CREATE POLICY "report_update_policy" ON "public"."report"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = report.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.report_permission rp
  WHERE ((rp.auth_user_id = auth.uid()) AND (rp.group_id = report.group_id) AND (rp.can_edit = true)))) OR (EXISTS ( SELECT 1
   FROM public.publisher p
  WHERE ((p.auth_id = auth.uid()) AND (p.id = report.confidential_id))))))
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = report.congregation_id)))) OR (EXISTS ( SELECT 1
   FROM public.report_permission rp
  WHERE ((rp.auth_user_id = auth.uid()) AND (rp.group_id = report.group_id) AND (rp.can_edit = true)))) OR (EXISTS ( SELECT 1
   FROM public.publisher p
  WHERE ((p.auth_id = auth.uid()) AND (p.id = report.confidential_id))))));

CREATE POLICY "report_permission_delete" ON "public"."report_permission"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.congregation_admin ca
     JOIN public."group" g ON ((g.congregation_id = ca.congregation_id)))
  WHERE ((ca.auth_user_id = auth.uid()) AND (g.id = report_permission.group_id)))))));

CREATE POLICY "report_permission_insert" ON "public"."report_permission"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.congregation_admin ca
     JOIN public."group" g ON ((g.congregation_id = ca.congregation_id)))
  WHERE ((ca.auth_user_id = auth.uid()) AND (g.id = report_permission.group_id)))))));

CREATE POLICY "report_permission_select" ON "public"."report_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.congregation_admin ca
     JOIN public."group" g ON ((g.congregation_id = ca.congregation_id)))
  WHERE ((ca.auth_user_id = auth.uid()) AND (g.id = report_permission.group_id)))))));

CREATE POLICY "report_permission_update" ON "public"."report_permission"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.congregation_admin ca
     JOIN public."group" g ON ((g.congregation_id = ca.congregation_id)))
  WHERE ((ca.auth_user_id = auth.uid()) AND (g.id = report_permission.group_id)))))));

CREATE POLICY "Secretary permission: admins can manage" ON "public"."secretary_permission"
  FOR ALL
  TO PUBLIC
  USING ((public.is_super_admin() OR public.is_congregation_admin(auth.uid())));

CREATE POLICY "Secretary permission: users can read own" ON "public"."secretary_permission"
  FOR SELECT
  TO PUBLIC
  USING ((auth_user_id = auth.uid()));

CREATE POLICY "speaker_assignment_delete" ON "public"."speaker_assignment"
  FOR DELETE
  TO PUBLIC
  USING (public.can_edit_speaker_tables(congregation_id));

CREATE POLICY "speaker_assignment_insert" ON "public"."speaker_assignment"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.can_edit_speaker_tables(congregation_id));

CREATE POLICY "speaker_assignment_select" ON "public"."speaker_assignment"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "speaker_assignment_update" ON "public"."speaker_assignment"
  FOR UPDATE
  TO PUBLIC
  USING (public.can_edit_speaker_tables(congregation_id));

CREATE POLICY "speaker_permission_delete" ON "public"."speaker_permission"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = speaker_permission.congregation_id)))))));

CREATE POLICY "speaker_permission_insert" ON "public"."speaker_permission"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = speaker_permission.congregation_id)))))));

CREATE POLICY "speaker_permission_select" ON "public"."speaker_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = speaker_permission.congregation_id)))))));

CREATE POLICY "speaker_permission_update" ON "public"."speaker_permission"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = speaker_permission.congregation_id)))))));

CREATE POLICY "Congregation admins can manage permissions" ON "public"."watchtower_permission"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = watchtower_permission.congregation_id)))));

CREATE POLICY "Users can read own congregation permissions" ON "public"."watchtower_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = watchtower_permission.congregation_id))))));

CREATE POLICY "weekend_assignment_delete" ON "public"."weekend_assignment"
  FOR DELETE
  TO PUBLIC
  USING (public.can_edit_weekend_tables(congregation_id));

CREATE POLICY "weekend_assignment_insert" ON "public"."weekend_assignment"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.can_edit_weekend_tables(congregation_id));

CREATE POLICY "weekend_assignment_select" ON "public"."weekend_assignment"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "weekend_assignment_update" ON "public"."weekend_assignment"
  FOR UPDATE
  TO PUBLIC
  USING (public.can_edit_weekend_tables(congregation_id));

CREATE POLICY "weekend_permission_delete" ON "public"."weekend_permission"
  FOR DELETE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = weekend_permission.congregation_id)))))));

CREATE POLICY "weekend_permission_insert" ON "public"."weekend_permission"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = weekend_permission.congregation_id)))))));

CREATE POLICY "weekend_permission_select" ON "public"."weekend_permission"
  FOR SELECT
  TO PUBLIC
  USING (((auth_user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = weekend_permission.congregation_id)))))));

CREATE POLICY "weekend_permission_update" ON "public"."weekend_permission"
  FOR UPDATE
  TO PUBLIC
  USING ((public.is_super_admin(auth.uid()) OR (public.is_congregation_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.congregation_admin ca
  WHERE ((ca.auth_user_id = auth.uid()) AND (ca.congregation_id = weekend_permission.congregation_id)))))));

COMMENT ON EXTENSION "moddatetime" IS 'functions for tracking last modification time';

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';

COMMENT ON EXTENSION "pgjwt" IS 'JSON Web Token API for Postgresql';

GRANT EXECUTE ON FUNCTION "public"."can_edit_clean_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_edit_meeting_attendance_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_edit_ministry_schedule_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_edit_speaker_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_edit_weekend_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_read_clean_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_read_meeting_attendance_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_read_ministry_schedule_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_read_speaker_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_read_weekend_tables"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."create_publisher_auth_user"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_user_congregation_id"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_congregation_admin"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_congregation_admin_for_group"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_secretary"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_session_created_by_user"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_super_admin"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_super_admin"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_user_session_participant"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."regular_pioneer_check_overlap"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."regular_pioneer_set_congregation"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."regular_pioneer_sync_type"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."send_email_hook"(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."send_email_hook"(jsonb) TO "postgres", "service_role", "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "public"."sync_publisher_regular_pioneer_type"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."validate_share_code"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON SCHEMA "public" FROM "supabase_auth_admin";

GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."auth_otp_log" TO "anon", "authenticated", "postgres", "service_role";

GRANT INSERT ON TABLE "public"."auth_otp_log" TO "supabase_auth_admin";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."auth_user" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."av_assignment" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."av_overseer_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."av_participation" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clam_overseer_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clean_major" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clean_minor" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clean_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cobe_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."congregation" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."congregation_admin" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."data_share_session" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."data_share_session_participant"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."device" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."device_trust" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."do_not_call" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."elder_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."event_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."group" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_checkout_map" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_checkout_publisher" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_log" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_master" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_tag" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."map_tag_assignment" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meeting_attendance" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."meeting_attendance_permission"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."midweek_assignment" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."midweek_meeting_data" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."midweek_participation" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."ministerial_servant_permission"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ministry_schedule" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."not_at_home" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."outline" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."publisher" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."regular_pioneer" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reminder_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."secretary_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_overseer_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."speaker_assignment" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."speaker_availability" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."speaker_outline" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."speaker_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."street" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."suburb" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."territory_servant_permission"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."watchtower_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weekend_assignment" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weekend_participation" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weekend_permission" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."av_assignment_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."do_not_call_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."midweek_meeting_detail_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."midweek_participant_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."not_at_home_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."publisher_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."speaker_assignment_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."speaker_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."week_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weekend_meeting_detail_view" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."weekend_participant_view" TO "anon", "authenticated", "postgres", "service_role";

SELECT
  cron.schedule_in_database('auth_otp_log_cleanup', '*/5 * * * *', 'DELETE FROM public.auth_otp_log WHERE created_at < now() - interval ''10 minutes''', 'postgres', NULL, true);

ALTER TABLE "public"."auth_user"
  ADD CONSTRAINT "auth_user_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.auth_user(auth_user_id);

