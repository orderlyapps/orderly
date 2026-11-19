import { createSupabaseTableCollection } from "../backend/collections.ts";
import {
  AUTH_USER_TABLE,
  SECRETARY_PERMISSION_TABLE,
  authUserSchema,
  secretaryPermissionSchema,
  type AuthUser,
  type SecretaryPermission,
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
  const collections = [defaultSecretaryPermissionCollection, defaultAuthUserCollection];
  defaultSecretaryPermissionCollection = null;
  defaultAuthUserCollection = null;
  await Promise.all(
    collections
      .filter((collection): collection is NonNullable<typeof collection> => collection !== null)
      .map((collection) => collection.cleanup().catch(() => {})),
  );
}
