import { expect, test } from "vite-plus/test";

import {
  clamOverseerPermissionSchema,
  hasClamOverseerPermission,
  midweekParticipationSchema,
  type ClamOverseerPermission,
} from "../src/feature/index.ts";

const authUserId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";
const otherUserId = "99f4d4e5-d4fa-4eb4-a276-3790b7c40000";
const congregationId = "1c74d4e5-d4fa-4eb4-a276-3790b7c41111";
const otherCongregationId = "2c74d4e5-d4fa-4eb4-a276-3790b7c42222";

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
