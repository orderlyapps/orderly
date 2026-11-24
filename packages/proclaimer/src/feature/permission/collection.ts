import { createSupabaseTableCollection } from "../backend/collections.ts";
import {
  AUTH_USER_TABLE,
  CONGREGATION_ADMIN_TABLE,
  ELDER_PERMISSION_TABLE,
  SECRETARY_PERMISSION_TABLE,
  SERVICE_OVERSEER_PERMISSION_TABLE,
  authUserSchema,
  congregationAdminSchema,
  elderPermissionSchema,
  secretaryPermissionSchema,
  serviceOverseerPermissionSchema,
  type AuthUser,
  type CongregationAdmin,
  type ElderPermission,
  type SecretaryPermission,
  type ServiceOverseerPermission,
} from "./schema.ts";

export function createSecretaryPermissionCollection() {
  return createSupabaseTableCollection<SecretaryPermission>({
    table: SECRETARY_PERMISSION_TABLE,
    id: SECRETARY_PERMISSION_TABLE,
    keyColumns: ["auth_user_id", "congregation_id"],
    schema: secretaryPermissionSchema,
  });
}

export type SecretaryPermissionCollection = ReturnType<typeof createSecretaryPermissionCollection>;

let defaultSecretaryPermissionCollection: SecretaryPermissionCollection | null = null;

export function getSecretaryPermissionCollection(): SecretaryPermissionCollection {
  if (!defaultSecretaryPermissionCollection) {
    defaultSecretaryPermissionCollection = createSecretaryPermissionCollection();
  }
  return defaultSecretaryPermissionCollection;
}

export function createElderPermissionCollection() {
  return createSupabaseTableCollection<ElderPermission>({
    table: ELDER_PERMISSION_TABLE,
    id: ELDER_PERMISSION_TABLE,
    keyColumns: ["auth_user_id", "congregation_id"],
    schema: elderPermissionSchema,
  });
}

export type ElderPermissionCollection = ReturnType<typeof createElderPermissionCollection>;

let defaultElderPermissionCollection: ElderPermissionCollection | null = null;

export function getElderPermissionCollection(): ElderPermissionCollection {
  if (!defaultElderPermissionCollection) {
    defaultElderPermissionCollection = createElderPermissionCollection();
  }
  return defaultElderPermissionCollection;
}

export function createServiceOverseerPermissionCollection() {
  return createSupabaseTableCollection<ServiceOverseerPermission>({
    table: SERVICE_OVERSEER_PERMISSION_TABLE,
    id: SERVICE_OVERSEER_PERMISSION_TABLE,
    keyColumns: ["auth_user_id", "congregation_id"],
    schema: serviceOverseerPermissionSchema,
  });
}

export type ServiceOverseerPermissionCollection = ReturnType<
  typeof createServiceOverseerPermissionCollection
>;

let defaultServiceOverseerPermissionCollection: ServiceOverseerPermissionCollection | null = null;

export function getServiceOverseerPermissionCollection(): ServiceOverseerPermissionCollection {
  if (!defaultServiceOverseerPermissionCollection) {
    defaultServiceOverseerPermissionCollection = createServiceOverseerPermissionCollection();
  }
  return defaultServiceOverseerPermissionCollection;
}

export function createCongregationAdminCollection() {
  return createSupabaseTableCollection<CongregationAdmin>({
    table: CONGREGATION_ADMIN_TABLE,
    id: CONGREGATION_ADMIN_TABLE,
    keyColumns: ["auth_user_id", "congregation_id"],
    schema: congregationAdminSchema,
  });
}

export type CongregationAdminCollection = ReturnType<typeof createCongregationAdminCollection>;

let defaultCongregationAdminCollection: CongregationAdminCollection | null = null;

export function getCongregationAdminCollection(): CongregationAdminCollection {
  if (!defaultCongregationAdminCollection) {
    defaultCongregationAdminCollection = createCongregationAdminCollection();
  }
  return defaultCongregationAdminCollection;
}

export function createAuthUserCollection() {
  return createSupabaseTableCollection<AuthUser>({
    table: AUTH_USER_TABLE,
    id: AUTH_USER_TABLE,
    idColumn: "auth_user_id",
    schema: authUserSchema,
  });
}

export type AuthUserCollection = ReturnType<typeof createAuthUserCollection>;

let defaultAuthUserCollection: AuthUserCollection | null = null;

export function getAuthUserCollection(): AuthUserCollection {
  if (!defaultAuthUserCollection) {
    defaultAuthUserCollection = createAuthUserCollection();
  }
  return defaultAuthUserCollection;
}

export async function resetPermissionCollectionsForTesting(): Promise<void> {
  const collections = [
    defaultSecretaryPermissionCollection,
    defaultElderPermissionCollection,
    defaultServiceOverseerPermissionCollection,
    defaultCongregationAdminCollection,
    defaultAuthUserCollection,
  ];
  defaultSecretaryPermissionCollection = null;
  defaultElderPermissionCollection = null;
  defaultServiceOverseerPermissionCollection = null;
  defaultCongregationAdminCollection = null;
  defaultAuthUserCollection = null;
  await Promise.all(
    collections
      .filter((collection): collection is NonNullable<typeof collection> => collection !== null)
      .map((collection) => collection.cleanup().catch(() => {})),
  );
}
