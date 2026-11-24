import { z } from "zod";

export const SECRETARY_PERMISSION_TABLE = "secretary_permission";
export const ELDER_PERMISSION_TABLE = "elder_permission";
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

// Mirrors the Supabase "auth_user" table (one row per signed-in user)
export const authUserSchema = z.object({
  auth_user_id: z.uuid(),
  created_at: z.string(),
  created_by: z.uuid(),
  is_super_admin: z.boolean(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
