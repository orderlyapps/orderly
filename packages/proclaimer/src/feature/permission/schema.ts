import { z } from "zod";

export const SECRETARY_PERMISSION_TABLE = "secretary_permission";
export const ELDER_PERMISSION_TABLE = "elder_permission";
export const SERVICE_OVERSEER_PERMISSION_TABLE = "service_overseer_permission";
export const REPORT_PERMISSION_TABLE = "report_permission";
export const CONGREGATION_ADMIN_TABLE = "congregation_admin";
export const AUTH_USER_TABLE = "auth_user";

// Mirrors the Supabase "secretary_permission" table: grants a signed-in
// user (auth_user_id) edit rights over a congregation's secretary data
export const secretaryPermissionSchema = z.object({
  auth_user_id: z.uuid(),
  congregation_id: z.uuid(),
  granted_by: z.uuid().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  can_edit: z.boolean(),
});

export type SecretaryPermission = z.infer<typeof secretaryPermissionSchema>;

// Mirrors the Supabase "elder_permission" table: grants a signed-in
// user (auth_user_id) elder access to a congregation's publisher data
export const elderPermissionSchema = z.object({
  auth_user_id: z.uuid(),
  congregation_id: z.uuid(),
  granted_by: z.uuid().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  can_edit: z.boolean(),
});

export type ElderPermission = z.infer<typeof elderPermissionSchema>;

// Mirrors the Supabase "service_overseer_permission" table: grants a
// signed-in user (auth_user_id) edit rights over a congregation's
// service overseer data (e.g. territory maps)
export const serviceOverseerPermissionSchema = z.object({
  auth_user_id: z.uuid(),
  congregation_id: z.uuid(),
  granted_by: z.uuid().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  can_edit: z.boolean(),
});

export type ServiceOverseerPermission = z.infer<typeof serviceOverseerPermissionSchema>;

// Mirrors the Supabase "report_permission" table: grants a signed-in
// user (auth_user_id) read or edit access to reports for a field service group
export const reportPermissionSchema = z.object({
  id: z.uuid(),
  auth_user_id: z.uuid(),
  group_id: z.uuid(),
  can_read: z.boolean(),
  can_edit: z.boolean(),
  granted_by: z.uuid().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type ReportPermission = z.infer<typeof reportPermissionSchema>;

// Mirrors the Supabase "congregation_admin" table: a row marks a
// signed-in user (auth_user_id) as an administrator of a congregation
export const congregationAdminSchema = z.object({
  auth_user_id: z.uuid(),
  congregation_id: z.uuid(),
  created_by: z.uuid().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export type CongregationAdmin = z.infer<typeof congregationAdminSchema>;

// Mirrors the Supabase "auth_user" table (one row per signed-in user)
export const authUserSchema = z.object({
  auth_user_id: z.uuid(),
  created_at: z.string(),
  created_by: z.uuid(),
  is_super_admin: z.boolean(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
