export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      auth_otp_log: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          otp: string;
          sent_by_admin_at: string | null;
          sent_by_admin_id: string | null;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          otp: string;
          sent_by_admin_at?: string | null;
          sent_by_admin_id?: string | null;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          otp?: string;
          sent_by_admin_at?: string | null;
          sent_by_admin_id?: string | null;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      auth_user: {
        Row: {
          auth_user_id: string;
          created_at: string;
          created_by: string;
          is_super_admin: boolean;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          created_by?: string;
          is_super_admin?: boolean;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          created_by?: string;
          is_super_admin?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "auth_user_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "auth_user";
            referencedColumns: ["auth_user_id"];
          },
        ];
      };
      av_assignment: {
        Row: {
          assignment_id: string;
          congregation_id: string;
          participant_id: string;
          week_id: string;
        };
        Insert: {
          assignment_id: string;
          congregation_id: string;
          participant_id: string;
          week_id: string;
        };
        Update: {
          assignment_id?: string;
          congregation_id?: string;
          participant_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "av_assignment_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_assignment_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "av_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      av_overseer_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "av_overseer_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_overseer_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      av_participation: {
        Row: {
          participant_id: string;
          participation_id: string;
        };
        Insert: {
          participant_id: string;
          participation_id: string;
        };
        Update: {
          participant_id?: string;
          participation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "av_participation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_participation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_participation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_participation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "av_participation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      clam_overseer_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clam_overseer_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clam_overseer_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      clean_major: {
        Row: {
          congregation_id: string;
          group_id: string;
          week_id: string;
        };
        Insert: {
          congregation_id: string;
          group_id: string;
          week_id: string;
        };
        Update: {
          congregation_id?: string;
          group_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clean_major_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clean_major_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "clean_major_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group";
            referencedColumns: ["id"];
          },
        ];
      };
      clean_minor: {
        Row: {
          congregation_id: string;
          group_id: string;
          week_id: string;
        };
        Insert: {
          congregation_id: string;
          group_id: string;
          week_id: string;
        };
        Update: {
          congregation_id?: string;
          group_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clean_minor_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clean_minor_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "clean_minor_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group";
            referencedColumns: ["id"];
          },
        ];
      };
      clean_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clean_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clean_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      cobe_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cobe_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobe_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      congregation: {
        Row: {
          congregation_id: string | null;
          id: string;
          name: string;
          password: string | null;
        };
        Insert: {
          congregation_id?: string | null;
          id?: string;
          name: string;
          password?: string | null;
        };
        Update: {
          congregation_id?: string | null;
          id?: string;
          name?: string;
          password?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "congregation_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "congregation_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      congregation_admin: {
        Row: {
          auth_user_id: string;
          congregation_id: string;
          created_at: string | null;
          created_by: string | null;
        };
        Insert: {
          auth_user_id: string;
          congregation_id: string;
          created_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          auth_user_id?: string;
          congregation_id?: string;
          created_at?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "congregation_admin_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "congregation_admin_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      data_share_session: {
        Row: {
          created_at: string;
          created_by: string;
          created_by_device_id: string;
          expires_at: string;
          id: string;
          share_code: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          created_by_device_id: string;
          expires_at?: string;
          id?: string;
          share_code: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          created_by_device_id?: string;
          expires_at?: string;
          id?: string;
          share_code?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_share_session_created_by_device_id_fkey";
            columns: ["created_by_device_id"];
            isOneToOne: false;
            referencedRelation: "device";
            referencedColumns: ["id"];
          },
        ];
      };
      data_share_session_participant: {
        Row: {
          device_id: string;
          id: string;
          joined_at: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          device_id: string;
          id?: string;
          joined_at?: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          device_id?: string;
          id?: string;
          joined_at?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_share_session_participant_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "device";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "data_share_session_participant_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "data_share_session";
            referencedColumns: ["id"];
          },
        ];
      };
      device: {
        Row: {
          created_at: string;
          device_name: string;
          id: string;
          last_seen_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_name: string;
          id?: string;
          last_seen_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string;
          id?: string;
          last_seen_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      device_trust: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          owner_id: string;
          trusted_device_id: string | null;
          trusted_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          owner_id: string;
          trusted_device_id?: string | null;
          trusted_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          owner_id?: string;
          trusted_device_id?: string | null;
          trusted_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "device_trust_trusted_device_id_fkey";
            columns: ["trusted_device_id"];
            isOneToOne: false;
            referencedRelation: "device";
            referencedColumns: ["id"];
          },
        ];
      };
      do_not_call: {
        Row: {
          congregation_id: string;
          coordinates: number[];
          created_at: string;
          house_number: string;
          id: string;
          match_data: Json;
          notes: string | null;
          street_id: string;
          suburb_id: string;
          unit_number: string | null;
          updated_at: string;
        };
        Insert: {
          congregation_id: string;
          coordinates: number[];
          created_at?: string;
          house_number: string;
          id?: string;
          match_data: Json;
          notes?: string | null;
          street_id: string;
          suburb_id: string;
          unit_number?: string | null;
          updated_at?: string;
        };
        Update: {
          congregation_id?: string;
          coordinates?: number[];
          created_at?: string;
          house_number?: string;
          id?: string;
          match_data?: Json;
          notes?: string | null;
          street_id?: string;
          suburb_id?: string;
          unit_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "do_not_call_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "do_not_call_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "do_not_call_street_id_fkey";
            columns: ["street_id"];
            isOneToOne: false;
            referencedRelation: "street";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "do_not_call_suburb_id_fkey";
            columns: ["suburb_id"];
            isOneToOne: false;
            referencedRelation: "suburb";
            referencedColumns: ["id"];
          },
        ];
      };
      elder_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "elder_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "elder_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      event: {
        Row: {
          address: string;
          all_day: boolean;
          congregation_id: string;
          coordinates: number[] | null;
          description: string;
          details: Json | null;
          end_date: string | null;
          end_time: string | null;
          id: string;
          name: string;
          start_date: string;
          start_time: string | null;
          type: string | null;
        };
        Insert: {
          address?: string;
          all_day: boolean;
          congregation_id: string;
          coordinates?: number[] | null;
          description?: string;
          details?: Json | null;
          end_date?: string | null;
          end_time?: string | null;
          id?: string;
          name?: string;
          start_date: string;
          start_time?: string | null;
          type?: string | null;
        };
        Update: {
          address?: string;
          all_day?: boolean;
          congregation_id?: string;
          coordinates?: number[] | null;
          description?: string;
          details?: Json | null;
          end_date?: string | null;
          end_time?: string | null;
          id?: string;
          name?: string;
          start_date?: string;
          start_time?: string | null;
          type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      event_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      group: {
        Row: {
          assistant_id: string | null;
          congregation_id: string;
          id: string;
          name: string;
          overseer_id: string | null;
        };
        Insert: {
          assistant_id?: string | null;
          congregation_id?: string;
          id?: string;
          name: string;
          overseer_id?: string | null;
        };
        Update: {
          assistant_id?: string | null;
          congregation_id?: string;
          id?: string;
          name?: string;
          overseer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "group_assistant_id_fkey";
            columns: ["assistant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_assistant_id_fkey";
            columns: ["assistant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_assistant_id_fkey";
            columns: ["assistant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_assistant_id_fkey";
            columns: ["assistant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_assistant_id_fkey";
            columns: ["assistant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "group_overseer_id_fkey";
            columns: ["overseer_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_overseer_id_fkey";
            columns: ["overseer_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_overseer_id_fkey";
            columns: ["overseer_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_overseer_id_fkey";
            columns: ["overseer_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_overseer_id_fkey";
            columns: ["overseer_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      map: {
        Row: {
          blocks: Json | null;
          boundary: Json | null;
          congregation_id: string;
          details: string | null;
          id: string;
          name: string;
          url: string | null;
        };
        Insert: {
          blocks?: Json | null;
          boundary?: Json | null;
          congregation_id: string;
          details?: string | null;
          id?: string;
          name: string;
          url?: string | null;
        };
        Update: {
          blocks?: Json | null;
          boundary?: Json | null;
          congregation_id?: string;
          details?: string | null;
          id?: string;
          name?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "map_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      map_checkout_map: {
        Row: {
          id: string;
          map_checkout_publisher_id: string;
          map_id: string;
        };
        Insert: {
          id?: string;
          map_checkout_publisher_id: string;
          map_id: string;
        };
        Update: {
          id?: string;
          map_checkout_publisher_id?: string;
          map_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "map_checkout_map_map_checkout_publisher_id_fkey";
            columns: ["map_checkout_publisher_id"];
            isOneToOne: false;
            referencedRelation: "map_checkout_publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_checkout_map_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "map";
            referencedColumns: ["id"];
          },
        ];
      };
      map_checkout_publisher: {
        Row: {
          congregation_id: string;
          created_at: string | null;
          id: string;
          max_maps: number;
          publisher_id: string;
          updated_at: string | null;
        };
        Insert: {
          congregation_id: string;
          created_at?: string | null;
          id?: string;
          max_maps?: number;
          publisher_id: string;
          updated_at?: string | null;
        };
        Update: {
          congregation_id?: string;
          created_at?: string | null;
          id?: string;
          max_maps?: number;
          publisher_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "map_checkout_publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_checkout_publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "map_checkout_publisher_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_checkout_publisher_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_checkout_publisher_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_checkout_publisher_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_checkout_publisher_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      map_log: {
        Row: {
          checked_in_at: string | null;
          checked_out_at: string;
          id: string;
          map_id: string;
          notes: string | null;
          publisher_id: string;
        };
        Insert: {
          checked_in_at?: string | null;
          checked_out_at?: string;
          id?: string;
          map_id: string;
          notes?: string | null;
          publisher_id: string;
        };
        Update: {
          checked_in_at?: string | null;
          checked_out_at?: string;
          id?: string;
          map_id?: string;
          notes?: string | null;
          publisher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "map_log_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "map";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_log_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_log_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_log_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_log_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_log_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      map_master: {
        Row: {
          boundary: Json;
          congregation_id: string;
          details: string | null;
        };
        Insert: {
          boundary: Json;
          congregation_id: string;
          details?: string | null;
        };
        Update: {
          boundary?: Json;
          congregation_id?: string;
          details?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "map_master_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: true;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_master_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: true;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      map_tag: {
        Row: {
          congregation_id: string;
          id: string;
          name: string;
        };
        Insert: {
          congregation_id: string;
          id?: string;
          name: string;
        };
        Update: {
          congregation_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "map_tag_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_tag_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      map_tag_assignment: {
        Row: {
          id: string;
          map_id: string;
          tag_id: string;
        };
        Insert: {
          id?: string;
          map_id: string;
          tag_id: string;
        };
        Update: {
          id?: string;
          map_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "map_tag_assignment_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "map";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "map_tag_assignment_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "map_tag";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_attendance: {
        Row: {
          congregation_id: string;
          midweek_in_person_count: number | null;
          midweek_remote_count: number | null;
          week_id: string;
          weekend_in_person_count: number | null;
          weekend_remote_count: number | null;
        };
        Insert: {
          congregation_id: string;
          midweek_in_person_count?: number | null;
          midweek_remote_count?: number | null;
          week_id: string;
          weekend_in_person_count?: number | null;
          weekend_remote_count?: number | null;
        };
        Update: {
          congregation_id?: string;
          midweek_in_person_count?: number | null;
          midweek_remote_count?: number | null;
          week_id?: string;
          weekend_in_person_count?: number | null;
          weekend_remote_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_attendance_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      meeting_attendance_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          can_read: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          can_read?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          can_read?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_attendance_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      midweek_assignment: {
        Row: {
          assignment_id: string;
          congregation_id: string;
          participant_id: string;
          week_id: string;
        };
        Insert: {
          assignment_id: string;
          congregation_id: string;
          participant_id: string;
          week_id: string;
        };
        Update: {
          assignment_id?: string;
          congregation_id?: string;
          participant_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "midweek_assignment_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_assignment_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "midweek_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      midweek_meeting_data: {
        Row: {
          mwb_ayf_count: number;
          mwb_ayf_part1: string;
          mwb_ayf_part1_time: number | null;
          mwb_ayf_part1_title: string | null;
          mwb_ayf_part1_type: string | null;
          mwb_ayf_part2: string;
          mwb_ayf_part2_time: number | null;
          mwb_ayf_part2_title: string | null;
          mwb_ayf_part2_type: string | null;
          mwb_ayf_part3: string;
          mwb_ayf_part3_time: number | null;
          mwb_ayf_part3_title: string | null;
          mwb_ayf_part3_type: string | null;
          mwb_ayf_part4: string | null;
          mwb_ayf_part4_time: number | null;
          mwb_ayf_part4_title: string | null;
          mwb_ayf_part4_type: string | null;
          mwb_lc_cbs: string;
          mwb_lc_cbs_title: string | null;
          mwb_lc_count: number;
          mwb_lc_part1: string;
          mwb_lc_part1_content: string | null;
          mwb_lc_part1_time: number | null;
          mwb_lc_part1_title: string | null;
          mwb_lc_part2: string | null;
          mwb_lc_part2_content: string | null;
          mwb_lc_part2_time: number | null;
          mwb_lc_part2_title: string | null;
          mwb_song_conclude: string | null;
          mwb_song_first: number;
          mwb_song_middle: string | null;
          mwb_tgw_bread: string;
          mwb_tgw_bread_title: string | null;
          mwb_tgw_gems_title: string | null;
          mwb_tgw_talk: string;
          mwb_tgw_talk_title: string | null;
          mwb_week_date_locale: string | null;
          mwb_weekly_bible_reading: string;
          week_id: string;
        };
        Insert: {
          mwb_ayf_count: number;
          mwb_ayf_part1: string;
          mwb_ayf_part1_time?: number | null;
          mwb_ayf_part1_title?: string | null;
          mwb_ayf_part1_type?: string | null;
          mwb_ayf_part2: string;
          mwb_ayf_part2_time?: number | null;
          mwb_ayf_part2_title?: string | null;
          mwb_ayf_part2_type?: string | null;
          mwb_ayf_part3: string;
          mwb_ayf_part3_time?: number | null;
          mwb_ayf_part3_title?: string | null;
          mwb_ayf_part3_type?: string | null;
          mwb_ayf_part4?: string | null;
          mwb_ayf_part4_time?: number | null;
          mwb_ayf_part4_title?: string | null;
          mwb_ayf_part4_type?: string | null;
          mwb_lc_cbs: string;
          mwb_lc_cbs_title?: string | null;
          mwb_lc_count: number;
          mwb_lc_part1: string;
          mwb_lc_part1_content?: string | null;
          mwb_lc_part1_time?: number | null;
          mwb_lc_part1_title?: string | null;
          mwb_lc_part2?: string | null;
          mwb_lc_part2_content?: string | null;
          mwb_lc_part2_time?: number | null;
          mwb_lc_part2_title?: string | null;
          mwb_song_conclude?: string | null;
          mwb_song_first: number;
          mwb_song_middle?: string | null;
          mwb_tgw_bread: string;
          mwb_tgw_bread_title?: string | null;
          mwb_tgw_gems_title?: string | null;
          mwb_tgw_talk: string;
          mwb_tgw_talk_title?: string | null;
          mwb_week_date_locale?: string | null;
          mwb_weekly_bible_reading: string;
          week_id: string;
        };
        Update: {
          mwb_ayf_count?: number;
          mwb_ayf_part1?: string;
          mwb_ayf_part1_time?: number | null;
          mwb_ayf_part1_title?: string | null;
          mwb_ayf_part1_type?: string | null;
          mwb_ayf_part2?: string;
          mwb_ayf_part2_time?: number | null;
          mwb_ayf_part2_title?: string | null;
          mwb_ayf_part2_type?: string | null;
          mwb_ayf_part3?: string;
          mwb_ayf_part3_time?: number | null;
          mwb_ayf_part3_title?: string | null;
          mwb_ayf_part3_type?: string | null;
          mwb_ayf_part4?: string | null;
          mwb_ayf_part4_time?: number | null;
          mwb_ayf_part4_title?: string | null;
          mwb_ayf_part4_type?: string | null;
          mwb_lc_cbs?: string;
          mwb_lc_cbs_title?: string | null;
          mwb_lc_count?: number;
          mwb_lc_part1?: string;
          mwb_lc_part1_content?: string | null;
          mwb_lc_part1_time?: number | null;
          mwb_lc_part1_title?: string | null;
          mwb_lc_part2?: string | null;
          mwb_lc_part2_content?: string | null;
          mwb_lc_part2_time?: number | null;
          mwb_lc_part2_title?: string | null;
          mwb_song_conclude?: string | null;
          mwb_song_first?: number;
          mwb_song_middle?: string | null;
          mwb_tgw_bread?: string;
          mwb_tgw_bread_title?: string | null;
          mwb_tgw_gems_title?: string | null;
          mwb_tgw_talk?: string;
          mwb_tgw_talk_title?: string | null;
          mwb_week_date_locale?: string | null;
          mwb_weekly_bible_reading?: string;
          week_id?: string;
        };
        Relationships: [];
      };
      midweek_participation: {
        Row: {
          is_participant: boolean;
          participant_id: string;
          participation_id: string;
        };
        Insert: {
          is_participant?: boolean;
          participant_id: string;
          participation_id: string;
        };
        Update: {
          is_participant?: boolean;
          participant_id?: string;
          participation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "midweek_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midweek_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      ministerial_servant_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ministerial_servant_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministerial_servant_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      ministry_schedule: {
        Row: {
          conductor: string;
          congregation_id: string;
          day_of_week: number;
          details: string;
          id: string;
          location: string;
          sort_order: number;
          start_time: string;
        };
        Insert: {
          conductor?: string;
          congregation_id: string;
          day_of_week: number;
          details?: string;
          id?: string;
          location?: string;
          sort_order?: number;
          start_time: string;
        };
        Update: {
          conductor?: string;
          congregation_id?: string;
          day_of_week?: number;
          details?: string;
          id?: string;
          location?: string;
          sort_order?: number;
          start_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ministry_schedule_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_schedule_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      not_at_home: {
        Row: {
          congregation_id: string;
          coordinates: number[];
          created_at: string;
          house_number: string;
          id: string;
          match_data: Json;
          street_id: string;
          suburb_id: string;
          unit_number: string | null;
          visit_log: string[];
          write: boolean;
        };
        Insert: {
          congregation_id: string;
          coordinates: number[];
          created_at?: string;
          house_number: string;
          id?: string;
          match_data: Json;
          street_id: string;
          suburb_id: string;
          unit_number?: string | null;
          visit_log: string[];
          write: boolean;
        };
        Update: {
          congregation_id?: string;
          coordinates?: number[];
          created_at?: string;
          house_number?: string;
          id?: string;
          match_data?: Json;
          street_id?: string;
          suburb_id?: string;
          unit_number?: string | null;
          visit_log?: string[];
          write?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "not_at_home_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "not_at_home_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "not_at_home_street_id_fkey";
            columns: ["street_id"];
            isOneToOne: false;
            referencedRelation: "street";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "not_at_home_suburb_id_fkey";
            columns: ["suburb_id"];
            isOneToOne: false;
            referencedRelation: "suburb";
            referencedColumns: ["id"];
          },
        ];
      };
      outline: {
        Row: {
          id: string;
          theme: string;
        };
        Insert: {
          id: string;
          theme: string;
        };
        Update: {
          id?: string;
          theme?: string;
        };
        Relationships: [];
      };
      publisher: {
        Row: {
          archived_at: string | null;
          auth_id: string | null;
          congregation_id: string;
          display_name: string | null;
          family_id: string | null;
          first_name: string;
          gender: string;
          group_id: string | null;
          id: string;
          last_name: string;
          middle_name: string | null;
          standing: string;
          type: string;
        };
        Insert: {
          archived_at?: string | null;
          auth_id?: string | null;
          congregation_id: string;
          display_name?: string | null;
          family_id?: string | null;
          first_name: string;
          gender: string;
          group_id?: string | null;
          id?: string;
          last_name: string;
          middle_name?: string | null;
          standing: string;
          type: string;
        };
        Update: {
          archived_at?: string | null;
          auth_id?: string | null;
          congregation_id?: string;
          display_name?: string | null;
          family_id?: string | null;
          first_name?: string;
          gender?: string;
          group_id?: string | null;
          id?: string;
          last_name?: string;
          middle_name?: string | null;
          standing?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group";
            referencedColumns: ["id"];
          },
        ];
      };
      regular_pioneer: {
        Row: {
          congregation_id: string;
          created_at: string;
          created_by: string | null;
          end_month: string | null;
          id: string;
          publisher_id: string;
          start_month: string;
          updated_at: string;
        };
        Insert: {
          congregation_id: string;
          created_at?: string;
          created_by?: string | null;
          end_month?: string | null;
          id?: string;
          publisher_id: string;
          start_month: string;
          updated_at?: string;
        };
        Update: {
          congregation_id?: string;
          created_at?: string;
          created_by?: string | null;
          end_month?: string | null;
          id?: string;
          publisher_id?: string;
          start_month?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regular_pioneer_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regular_pioneer_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "regular_pioneer_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regular_pioneer_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regular_pioneer_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regular_pioneer_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regular_pioneer_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      reminder_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminder_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminder_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      report: {
        Row: {
          active: boolean;
          aux_pio: boolean;
          bible_studies: number | null;
          comments: string | null;
          confidential_id: string;
          congregation_id: string;
          credit_hours: Json | null;
          date: string;
          group_id: string | null;
          hours: number | null;
          reg_pio: boolean;
          reported_elsewhere: boolean;
          spe_pio: boolean;
        };
        Insert: {
          active: boolean;
          aux_pio?: boolean;
          bible_studies?: number | null;
          comments?: string | null;
          confidential_id?: string;
          congregation_id?: string;
          credit_hours?: Json | null;
          date: string;
          group_id?: string | null;
          hours?: number | null;
          reg_pio?: boolean;
          reported_elsewhere?: boolean;
          spe_pio?: boolean;
        };
        Update: {
          active?: boolean;
          aux_pio?: boolean;
          bible_studies?: number | null;
          comments?: string | null;
          confidential_id?: string;
          congregation_id?: string;
          credit_hours?: Json | null;
          date?: string;
          group_id?: string | null;
          hours?: number | null;
          reg_pio?: boolean;
          reported_elsewhere?: boolean;
          spe_pio?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "report_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "report_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group";
            referencedColumns: ["id"];
          },
        ];
      };
      report_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          can_read: boolean;
          created_at: string | null;
          granted_by: string | null;
          group_id: string;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          can_read?: boolean;
          created_at?: string | null;
          granted_by?: string | null;
          group_id: string;
          id?: string;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          can_read?: boolean;
          created_at?: string | null;
          granted_by?: string | null;
          group_id?: string;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "report_permission_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group";
            referencedColumns: ["id"];
          },
        ];
      };
      secretary_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "secretary_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "secretary_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      service_overseer_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_overseer_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_overseer_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      speaker_assignment: {
        Row: {
          congregation_id: string;
          outline_id: string | null;
          speaker_id: string;
          week_id: string;
        };
        Insert: {
          congregation_id: string;
          outline_id?: string | null;
          speaker_id: string;
          week_id: string;
        };
        Update: {
          congregation_id?: string;
          outline_id?: string | null;
          speaker_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outgoing_speaker_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outgoing_speaker_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "outgoing_speaker_outline_id_speaker_id_fkey";
            columns: ["outline_id", "speaker_id"];
            isOneToOne: false;
            referencedRelation: "speaker_outline";
            referencedColumns: ["outline_id", "speaker_id"];
          },
        ];
      };
      speaker_availability: {
        Row: {
          availability: number;
          speaker_id: string;
        };
        Insert: {
          availability: number;
          speaker_id: string;
        };
        Update: {
          availability?: number;
          speaker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "speaker_availability_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: true;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_availability_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: true;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_availability_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: true;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_availability_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: true;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_availability_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: true;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      speaker_outline: {
        Row: {
          outline_id: string;
          speaker_id: string;
        };
        Insert: {
          outline_id?: string;
          speaker_id: string;
        };
        Update: {
          outline_id?: string;
          speaker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "speaker_outline_outline_id_fkey";
            columns: ["outline_id"];
            isOneToOne: false;
            referencedRelation: "outline";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_outline_outline_id_fkey";
            columns: ["outline_id"];
            isOneToOne: false;
            referencedRelation: "speaker_assignment_view";
            referencedColumns: ["outline_id"];
          },
          {
            foreignKeyName: "speaker_outline_speaker_d_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_outline_speaker_d_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_outline_speaker_d_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_outline_speaker_d_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_outline_speaker_d_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      speaker_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "speaker_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speaker_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      street: {
        Row: {
          congregation_id: string;
          coordinates: number[];
          id: string;
          name: string;
          suburb_id: string;
        };
        Insert: {
          congregation_id: string;
          coordinates: number[];
          id?: string;
          name: string;
          suburb_id: string;
        };
        Update: {
          congregation_id?: string;
          coordinates?: number[];
          id?: string;
          name?: string;
          suburb_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "street_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "street_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "street_suburb_id_fkey";
            columns: ["suburb_id"];
            isOneToOne: false;
            referencedRelation: "suburb";
            referencedColumns: ["id"];
          },
        ];
      };
      suburb: {
        Row: {
          bbox: number[];
          congregation_id: string;
          id: string;
          name: string;
        };
        Insert: {
          bbox: number[];
          congregation_id: string;
          id?: string;
          name: string;
        };
        Update: {
          bbox?: number[];
          congregation_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suburb_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suburb_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      territory_servant_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "territory_servant_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "territory_servant_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      watchtower_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "watchtower_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watchtower_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      weekend_assignment: {
        Row: {
          assignment_id: string;
          congregation_id: string;
          participant_id: string;
          week_id: string;
        };
        Insert: {
          assignment_id: string;
          congregation_id: string;
          participant_id: string;
          week_id: string;
        };
        Update: {
          assignment_id?: string;
          congregation_id?: string;
          participant_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekend_assignment_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_assignment_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "weekend_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_assignment_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      weekend_participation: {
        Row: {
          participant_id: string;
          participation_id: string;
        };
        Insert: {
          participant_id: string;
          participation_id: string;
        };
        Update: {
          participant_id?: string;
          participation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekend_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_particpation_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      weekend_permission: {
        Row: {
          auth_user_id: string;
          can_edit: boolean;
          congregation_id: string;
          created_at: string | null;
          granted_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          can_edit?: boolean;
          congregation_id: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string;
          can_edit?: boolean;
          congregation_id?: string;
          created_at?: string | null;
          granted_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weekend_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekend_permission_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
    };
    Views: {
      av_assignment_view: {
        Row: {
          assignment: Json | null;
          congregation_id: string | null;
          events: Json | null;
          week_id: string | null;
        };
        Relationships: [];
      };
      do_not_call_view: {
        Row: {
          congregation_id: string | null;
          coordinates: number[] | null;
          created_at: string | null;
          full_address: string | null;
          house_number: string | null;
          id: string | null;
          latitude: number | null;
          longitude: number | null;
          match_data: Json | null;
          notes: string | null;
          street_id: string | null;
          street_name: string | null;
          suburb_id: string | null;
          suburb_name: string | null;
          unit_number: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "do_not_call_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "do_not_call_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "do_not_call_street_id_fkey";
            columns: ["street_id"];
            isOneToOne: false;
            referencedRelation: "street";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "do_not_call_suburb_id_fkey";
            columns: ["suburb_id"];
            isOneToOne: false;
            referencedRelation: "suburb";
            referencedColumns: ["id"];
          },
        ];
      };
      midweek_meeting_detail_view: {
        Row: {
          congregation_id: string | null;
          events: Json | null;
          meeting_data: Json | null;
          participants: Json | null;
          week_id: string | null;
        };
        Relationships: [];
      };
      midweek_participant_view: {
        Row: {
          congregation_id: string | null;
          display_name: string | null;
          first_name: string | null;
          gender: string | null;
          id: string | null;
          last_name: string | null;
          middle_name: string | null;
          midweek_assignment: Json[] | null;
          participation: string[] | null;
          standing: string | null;
          type: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      not_at_home_view: {
        Row: {
          congregation_id: string | null;
          coordinates: number[] | null;
          created_at: string | null;
          full_address: string | null;
          house_number: string | null;
          id: string | null;
          latitude: number | null;
          longitude: number | null;
          match_data: Json | null;
          street_name: string | null;
          suburb_name: string | null;
          unit_number: string | null;
          visit_log: string[] | null;
          write: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "not_at_home_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "not_at_home_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
      publisher_view: {
        Row: {
          av_assignment: Json[] | null;
          av_participation: string[] | null;
          congregation: Json | null;
          congregation_id: string | null;
          display_name: string | null;
          family_id: string | null;
          first_name: string | null;
          gender: string | null;
          id: string | null;
          last_name: string | null;
          middle_name: string | null;
          midweek_assignment: Json[] | null;
          midweek_participation: string[] | null;
          outline: Json[] | null;
          standing: string | null;
          type: string | null;
          weekend_assignment: Json[] | null;
          weekend_participation: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "midweek_participant_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "publisher";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "publisher_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "speaker_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "weekend_participant_view";
            referencedColumns: ["id"];
          },
        ];
      };
      speaker_assignment_view: {
        Row: {
          first_name: string | null;
          last_name: string | null;
          name: string | null;
          outline_id: string | null;
          speaker_id: string | null;
          theme: string | null;
          week_id: string | null;
        };
        Relationships: [];
      };
      speaker_view: {
        Row: {
          assignment: Json | null;
          availability: number | null;
          congregation: Json | null;
          congregation_id: string | null;
          display_name: string | null;
          first_name: string | null;
          id: string | null;
          is_local: boolean | null;
          last_name: string | null;
          middle_name: string | null;
          outline: Json | null;
          standing: string | null;
          type: string | null;
        };
        Relationships: [];
      };
      week_view: {
        Row: {
          congregation_id: string | null;
          week_id: string | null;
        };
        Relationships: [];
      };
      weekend_meeting_detail_view: {
        Row: {
          assignment: Json | null;
          congregation_id: string | null;
          event: Json | null;
          outgoing: Json | null;
          public_talk: Json | null;
          week_id: string | null;
        };
        Relationships: [];
      };
      weekend_participant_view: {
        Row: {
          congregation_id: string | null;
          display_name: string | null;
          first_name: string | null;
          gender: string | null;
          id: string | null;
          last_name: string | null;
          middle_name: string | null;
          participation: string[] | null;
          standing: string | null;
          type: string | null;
          weekend_assignment: Json[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "congregation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_congregation_id_fkey";
            columns: ["congregation_id"];
            isOneToOne: false;
            referencedRelation: "midweek_meeting_detail_view";
            referencedColumns: ["congregation_id"];
          },
        ];
      };
    };
    Functions: {
      can_edit_clean_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_edit_meeting_attendance_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_edit_ministry_schedule_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_edit_speaker_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_edit_weekend_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_read_clean_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_read_meeting_attendance_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_read_ministry_schedule_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_read_speaker_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      can_read_weekend_tables: {
        Args: { check_congregation_id: string };
        Returns: boolean;
      };
      create_publisher_auth_user: {
        Args: { p_publisher_id: string };
        Returns: string;
      };
      get_user_congregation_id: {
        Args: { check_user_id: string };
        Returns: string;
      };
      is_congregation_admin: {
        Args: { check_user_id: string };
        Returns: boolean;
      };
      is_congregation_admin_for_group: {
        Args: { check_group_id: string; check_user_id: string };
        Returns: boolean;
      };
      is_secretary: { Args: never; Returns: boolean };
      is_session_created_by_user: {
        Args: { p_session_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean };
      is_user_session_participant: {
        Args: { p_session_id: string; p_user_id: string };
        Returns: boolean;
      };
      send_email_hook: { Args: { event: Json }; Returns: Json };
      sync_publisher_regular_pioneer_type: {
        Args: { p_publisher_id: string };
        Returns: undefined;
      };
      validate_share_code: { Args: { p_share_code: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
