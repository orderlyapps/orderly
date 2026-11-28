import { expect, test } from "vite-plus/test";

import {
  authUserSchema,
  clamOverseerPermissionSchema,
  congregationAdminSchema,
  elderPermissionSchema,
  hasClamOverseerPermission,
  hasElderPermission,
  hasReportEditPermission,
  hasReportReadPermission,
  hasSecretaryPermission,
  hasServiceOverseerPermission,
  isCongregationAdminUser,
  isSuperAdminUser,
  midweekParticipationSchema,
  reportPermissionSchema,
  secretaryPermissionSchema,
  serviceOverseerPermissionSchema,
  type AuthUser,
  type ClamOverseerPermission,
  type CongregationAdmin,
  type ElderPermission,
  type ReportPermission,
  type SecretaryPermission,
  type ServiceOverseerPermission,
} from "../src/feature/index.ts";

const authUserId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";
const otherUserId = "99f4d4e5-d4fa-4eb4-a276-3790b7c40000";
const congregationId = "1c74d4e5-d4fa-4eb4-a276-3790b7c41111";
const otherCongregationId = "2c74d4e5-d4fa-4eb4-a276-3790b7c42222";
const groupId = "3c74d4e5-d4fa-4eb4-a276-3790b7c43333";
const otherGroupId = "4c74d4e5-d4fa-4eb4-a276-3790b7c44444";

function permission(overrides: Partial<ClamOverseerPermission>): ClamOverseerPermission {
  return {
    auth_user_id: authUserId,
    congregation_id: congregationId,
    can_edit: true,
    ...overrides,
  };
}

test("clamOverseerPermissionSchema mirrors the table shape", () => {
  const row = permission({});
  expect(clamOverseerPermissionSchema.safeParse(row).success).toBe(true);
  expect(clamOverseerPermissionSchema.safeParse({ ...row, can_edit: "yes" }).success).toBe(false);
  expect(clamOverseerPermissionSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(false);
});

test("midweekParticipationSchema validates participation rows", () => {
  expect(
    midweekParticipationSchema.safeParse({
      participant_id: authUserId,
      participation_id: "bible_reading",
      is_participant: true,
    }).success,
  ).toBe(true);
  expect(
    midweekParticipationSchema.safeParse({
      participant_id: authUserId,
      participation_id: "not_a_part",
      is_participant: true,
    }).success,
  ).toBe(false);
  // is_participant defaults to true when the column is omitted
  const parsed = midweekParticipationSchema.parse({
    participant_id: authUserId,
    participation_id: "apply",
  });
  expect(parsed.is_participant).toBe(true);
});

test("hasClamOverseerPermission requires a matching editable row", () => {
  const rows = [permission({})];
  expect(hasClamOverseerPermission(rows, authUserId, congregationId)).toBe(true);
  expect(hasClamOverseerPermission(rows, otherUserId, congregationId)).toBe(false);
  expect(hasClamOverseerPermission(rows, authUserId, otherCongregationId)).toBe(false);
  expect(hasClamOverseerPermission(rows, undefined, congregationId)).toBe(false);
  expect(hasClamOverseerPermission(rows, authUserId, undefined)).toBe(false);
  expect(hasClamOverseerPermission(undefined, authUserId, congregationId)).toBe(false);
});

test("hasClamOverseerPermission requires can_edit", () => {
  const rows = [
    permission({ can_edit: false }),
    permission({ congregation_id: otherCongregationId, can_edit: true }),
  ];
  expect(hasClamOverseerPermission(rows, authUserId, congregationId)).toBe(false);
  expect(hasClamOverseerPermission(rows, authUserId, otherCongregationId)).toBe(true);
});

function secretaryPermission(overrides: Partial<SecretaryPermission>): SecretaryPermission {
  return {
    auth_user_id: authUserId,
    congregation_id: congregationId,
    can_edit: true,
    ...overrides,
  };
}

test("secretaryPermissionSchema mirrors the table shape", () => {
  const row = secretaryPermission({});
  expect(secretaryPermissionSchema.safeParse(row).success).toBe(true);
  expect(secretaryPermissionSchema.safeParse({ ...row, can_edit: "yes" }).success).toBe(false);
  expect(secretaryPermissionSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(false);
});

test("hasSecretaryPermission requires a matching editable row", () => {
  const rows = [secretaryPermission({})];
  expect(hasSecretaryPermission(rows, authUserId, congregationId)).toBe(true);
  expect(hasSecretaryPermission(rows, otherUserId, congregationId)).toBe(false);
  expect(hasSecretaryPermission(rows, authUserId, otherCongregationId)).toBe(false);
  expect(hasSecretaryPermission(rows, undefined, congregationId)).toBe(false);
  expect(hasSecretaryPermission(rows, authUserId, undefined)).toBe(false);
  expect(hasSecretaryPermission(undefined, authUserId, congregationId)).toBe(false);
});

test("hasSecretaryPermission requires can_edit", () => {
  const rows = [
    secretaryPermission({ can_edit: false }),
    secretaryPermission({ congregation_id: otherCongregationId, can_edit: true }),
  ];
  expect(hasSecretaryPermission(rows, authUserId, congregationId)).toBe(false);
  expect(hasSecretaryPermission(rows, authUserId, otherCongregationId)).toBe(true);
});

function elderPermission(overrides: Partial<ElderPermission>): ElderPermission {
  return {
    auth_user_id: authUserId,
    congregation_id: congregationId,
    can_edit: true,
    ...overrides,
  };
}

test("elderPermissionSchema mirrors the table shape", () => {
  const row = elderPermission({});
  expect(elderPermissionSchema.safeParse(row).success).toBe(true);
  expect(elderPermissionSchema.safeParse({ ...row, can_edit: "yes" }).success).toBe(false);
  expect(elderPermissionSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(false);
});

test("hasElderPermission requires a matching editable row", () => {
  const rows = [elderPermission({})];
  expect(hasElderPermission(rows, authUserId, congregationId)).toBe(true);
  expect(hasElderPermission(rows, otherUserId, congregationId)).toBe(false);
  expect(hasElderPermission(rows, authUserId, otherCongregationId)).toBe(false);
  expect(hasElderPermission(rows, undefined, congregationId)).toBe(false);
  expect(hasElderPermission(rows, authUserId, undefined)).toBe(false);
  expect(hasElderPermission(undefined, authUserId, congregationId)).toBe(false);
});

test("hasElderPermission requires can_edit", () => {
  const rows = [
    elderPermission({ can_edit: false }),
    elderPermission({ congregation_id: otherCongregationId, can_edit: true }),
  ];
  expect(hasElderPermission(rows, authUserId, congregationId)).toBe(false);
  expect(hasElderPermission(rows, authUserId, otherCongregationId)).toBe(true);
});

function serviceOverseerPermission(
  overrides: Partial<ServiceOverseerPermission>,
): ServiceOverseerPermission {
  return {
    auth_user_id: authUserId,
    congregation_id: congregationId,
    can_edit: true,
    ...overrides,
  };
}

test("serviceOverseerPermissionSchema mirrors the table shape", () => {
  const row = serviceOverseerPermission({});
  expect(serviceOverseerPermissionSchema.safeParse(row).success).toBe(true);
  expect(serviceOverseerPermissionSchema.safeParse({ ...row, can_edit: "yes" }).success).toBe(
    false,
  );
  expect(serviceOverseerPermissionSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(
    false,
  );
});

test("hasServiceOverseerPermission requires a matching editable row", () => {
  const rows = [serviceOverseerPermission({})];
  expect(hasServiceOverseerPermission(rows, authUserId, congregationId)).toBe(true);
  expect(hasServiceOverseerPermission(rows, otherUserId, congregationId)).toBe(false);
  expect(hasServiceOverseerPermission(rows, authUserId, otherCongregationId)).toBe(false);
  expect(hasServiceOverseerPermission(rows, undefined, congregationId)).toBe(false);
  expect(hasServiceOverseerPermission(rows, authUserId, undefined)).toBe(false);
  expect(hasServiceOverseerPermission(undefined, authUserId, congregationId)).toBe(false);
});

test("hasServiceOverseerPermission requires can_edit", () => {
  const rows = [
    serviceOverseerPermission({ can_edit: false }),
    serviceOverseerPermission({ congregation_id: otherCongregationId, can_edit: true }),
  ];
  expect(hasServiceOverseerPermission(rows, authUserId, congregationId)).toBe(false);
  expect(hasServiceOverseerPermission(rows, authUserId, otherCongregationId)).toBe(true);
});

function reportPermission(overrides: Partial<ReportPermission>): ReportPermission {
  return {
    id: "5c74d4e5-d4fa-4eb4-a276-3790b7c45555",
    auth_user_id: authUserId,
    group_id: groupId,
    can_read: true,
    can_edit: true,
    ...overrides,
  };
}

test("reportPermissionSchema mirrors the table shape", () => {
  const row = reportPermission({});
  expect(reportPermissionSchema.safeParse(row).success).toBe(true);
  expect(reportPermissionSchema.safeParse({ ...row, can_edit: "yes" }).success).toBe(false);
  expect(reportPermissionSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(false);
  expect(reportPermissionSchema.safeParse({ ...row, group_id: "x" }).success).toBe(false);
});

test("report permission checks require a matching user, group, and flag", () => {
  const rows = [reportPermission({})];
  expect(hasReportReadPermission(rows, authUserId, groupId)).toBe(true);
  expect(hasReportEditPermission(rows, authUserId, groupId)).toBe(true);
  expect(hasReportReadPermission(rows, otherUserId, groupId)).toBe(false);
  expect(hasReportReadPermission(rows, authUserId, otherGroupId)).toBe(false);
  expect(hasReportReadPermission(rows, undefined, groupId)).toBe(false);
  expect(hasReportReadPermission(rows, authUserId, undefined)).toBe(false);
  expect(hasReportReadPermission(undefined, authUserId, groupId)).toBe(false);
  expect(
    hasReportEditPermission([reportPermission({ can_edit: false })], authUserId, groupId),
  ).toBe(false);
  expect(
    hasReportReadPermission([reportPermission({ can_read: false })], authUserId, groupId),
  ).toBe(false);
});

function congregationAdmin(overrides: Partial<CongregationAdmin>): CongregationAdmin {
  return {
    auth_user_id: authUserId,
    congregation_id: congregationId,
    ...overrides,
  };
}

test("congregationAdminSchema mirrors the table shape", () => {
  const row = congregationAdmin({});
  expect(congregationAdminSchema.safeParse(row).success).toBe(true);
  expect(congregationAdminSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(false);
  expect(congregationAdminSchema.safeParse({ ...row, congregation_id: "x" }).success).toBe(false);
});

test("isCongregationAdminUser requires a matching row", () => {
  const rows = [congregationAdmin({})];
  expect(isCongregationAdminUser(rows, authUserId, congregationId)).toBe(true);
  expect(isCongregationAdminUser(rows, otherUserId, congregationId)).toBe(false);
  expect(isCongregationAdminUser(rows, authUserId, otherCongregationId)).toBe(false);
  expect(isCongregationAdminUser(rows, undefined, congregationId)).toBe(false);
  expect(isCongregationAdminUser(rows, authUserId, undefined)).toBe(false);
  expect(isCongregationAdminUser(undefined, authUserId, congregationId)).toBe(false);
});

function authUser(overrides: Partial<AuthUser>): AuthUser {
  return {
    auth_user_id: authUserId,
    created_at: "2026-01-01T00:00:00Z",
    created_by: otherUserId,
    is_super_admin: false,
    ...overrides,
  };
}

test("authUserSchema mirrors the table shape", () => {
  const row = authUser({});
  expect(authUserSchema.safeParse(row).success).toBe(true);
  expect(authUserSchema.safeParse({ ...row, is_super_admin: "yes" }).success).toBe(false);
  expect(authUserSchema.safeParse({ ...row, auth_user_id: "x" }).success).toBe(false);
});

test("isSuperAdminUser requires the user's own super admin row", () => {
  const rows = [authUser({ is_super_admin: true })];
  expect(isSuperAdminUser(rows, authUserId)).toBe(true);
  expect(isSuperAdminUser(rows, otherUserId)).toBe(false);
  expect(isSuperAdminUser(rows, undefined)).toBe(false);
  expect(isSuperAdminUser(undefined, authUserId)).toBe(false);
  expect(isSuperAdminUser([authUser({})], authUserId)).toBe(false);
});
