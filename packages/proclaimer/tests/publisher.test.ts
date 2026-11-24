import { expect, test } from "vite-plus/test";

import {
  familyHeadLabel,
  familyHeadOptions,
  groupPublishers,
  isActiveElderOrMinisterialServant,
  isPioneer,
  pioneerBadgeLabel,
  publisherStandingLabel,
  publisherStandingOptions,
  publisherTypeLabel,
  publisherTypeOptions,
  type Publisher,
  type PublisherStanding,
  type PublisherType,
} from "../src/feature/publisher/index.ts";

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";

function publisher(standing: PublisherStanding, type: PublisherType): Publisher {
  return {
    first_name: "Test",
    last_name: "Publisher",
    congregation_id: congregationId,
    standing,
    type,
  };
}

test("groupPublishers sorts elders, ministerial servants and pioneers", () => {
  const elder = publisher("elder", "publisher");
  const servant = publisher("ministerial_servant", "publisher");
  const regular = publisher("publisher", "regular_pioneer");
  const special = publisher("elder", "special_pioneer");
  const auxiliary = publisher("ministerial_servant", "continuous_auxiliary");
  const plain = publisher("publisher", "publisher");

  const groups = groupPublishers([elder, servant, regular, special, auxiliary, plain]);

  expect(groups.elders).toEqual([elder, special]);
  expect(groups.ministerialServants).toEqual([servant, auxiliary]);
  expect(groups.pioneers).toEqual([regular, special, auxiliary]);
});

test("groupPublishers returns empty groups when there are no publishers", () => {
  expect(groupPublishers([])).toEqual({ elders: [], ministerialServants: [], pioneers: [] });
});

test("groupPublishers ignores non-pioneer types and other standings", () => {
  const inactive = publisher("publisher", "inactive");
  const speaker = publisher("associate", "speaker");
  const unbaptised = publisher("unbaptised_publisher", "publisher");

  const groups = groupPublishers([inactive, speaker, unbaptised]);

  expect(groups.elders).toEqual([]);
  expect(groups.ministerialServants).toEqual([]);
  expect(groups.pioneers).toEqual([]);
});

test("isPioneer treats missing type as not a pioneer", () => {
  expect(isPioneer({ first_name: "A", last_name: "B" })).toBe(false);
});

test("pioneerBadgeLabel labels auxiliary and special pioneers only", () => {
  expect(pioneerBadgeLabel(publisher("publisher", "continuous_auxiliary"))).toBe("Auxiliary");
  expect(pioneerBadgeLabel(publisher("publisher", "special_pioneer"))).toBe("Special");
  expect(pioneerBadgeLabel(publisher("publisher", "regular_pioneer"))).toBeNull();
  expect(pioneerBadgeLabel(publisher("publisher", "publisher"))).toBeNull();
});

test("publisherStandingLabel and publisherTypeLabel label known values", () => {
  expect(publisherStandingLabel(publisher("elder", "publisher"))).toBe("Elder");
  expect(publisherStandingLabel(publisher("ministerial_servant", "publisher"))).toBe(
    "Ministerial Servant",
  );
  expect(publisherStandingLabel({ first_name: "A", last_name: "B" })).toBeNull();
  expect(publisherTypeLabel(publisher("publisher", "regular_pioneer"))).toBe("Regular Pioneer");
  expect(publisherTypeLabel(publisher("publisher", "removed"))).toBe("Removed");
  expect(publisherTypeLabel({ first_name: "A", last_name: "B" })).toBeNull();
});

test("isActiveElderOrMinisterialServant only matches active elders and ministerial servants", () => {
  expect(isActiveElderOrMinisterialServant(publisher("elder", "publisher"))).toBe(true);
  expect(isActiveElderOrMinisterialServant(publisher("ministerial_servant", "publisher"))).toBe(
    true,
  );
  expect(isActiveElderOrMinisterialServant(publisher("publisher", "publisher"))).toBe(false);
  expect(
    isActiveElderOrMinisterialServant({
      ...publisher("elder", "publisher"),
      archived_at: "2025-01-01T00:00:00+00:00",
    }),
  ).toBe(false);
  expect(isActiveElderOrMinisterialServant(publisher("elder", "removed"))).toBe(false);
});

test("familyHeadLabel resolves another publisher as the head", () => {
  const head = {
    ...publisher("publisher", "publisher"),
    id: "head-1",
    first_name: "John",
    last_name: "Smith",
  };
  const member = { ...publisher("publisher", "publisher"), id: "m-1", family_id: "head-1" };

  expect(familyHeadLabel(member, [head, member])).toBe("Smith, John");
});

test("familyHeadLabel uses the publisher's own id when they are the head", () => {
  const head = {
    ...publisher("publisher", "publisher"),
    id: "head-1",
    first_name: "Jane",
    last_name: "Doe",
    family_id: "head-1",
  };

  expect(familyHeadLabel(head, [head])).toBe("Doe, Jane");
});

test("familyHeadLabel reports None when unset and Unknown when unresolvable", () => {
  const member = { ...publisher("publisher", "publisher"), id: "m-1" };

  expect(familyHeadLabel(member, [member])).toBe("None");
  expect(familyHeadLabel({ ...member, family_id: "missing" }, [member])).toBe("Unknown");
});

test("familyHeadLabel prefers the head's display name", () => {
  const head = {
    ...publisher("publisher", "publisher"),
    id: "head-1",
    first_name: "John",
    last_name: "Smith",
    display_name: "Johnny",
  };
  const member = { ...publisher("publisher", "publisher"), id: "m-1", family_id: "head-1" };

  expect(familyHeadLabel(member, [head, member])).toBe("Smith, Johnny");
});

test("familyHeadOptions offers only heads and the publisher being edited", () => {
  const head = { ...publisher("publisher", "publisher"), id: "head-1", family_id: "head-1" };
  const member = { ...publisher("publisher", "publisher"), id: "m-1", family_id: "head-1" };
  const other = { ...publisher("publisher", "publisher"), id: "m-2", family_id: "head-1" };

  expect(familyHeadOptions(member, [head, member, other])).toEqual([head, member]);
});

test("familyHeadOptions keeps the current head even when they are not a head", () => {
  const assigned = { ...publisher("publisher", "publisher"), id: "h-1", family_id: "other" };
  const member = { ...publisher("publisher", "publisher"), id: "m-1", family_id: "h-1" };
  const head = { ...publisher("publisher", "publisher"), id: "head-1", family_id: "head-1" };

  expect(familyHeadOptions(member, [assigned, member, head])).toEqual([assigned, member, head]);
});

test("familyHeadOptions excludes removed heads unless they are the current head", () => {
  const removedHead = {
    ...publisher("publisher", "removed"),
    id: "removed-1",
    family_id: "removed-1",
  };
  const head = { ...publisher("publisher", "publisher"), id: "head-1", family_id: "head-1" };
  const member = { ...publisher("publisher", "publisher"), id: "m-1" };

  expect(familyHeadOptions(member, [removedHead, head, member])).toEqual([head, member]);
  expect(
    familyHeadOptions({ ...member, family_id: "removed-1" }, [removedHead, head, member]),
  ).toEqual([removedHead, head, member]);
});

test("groupPublishers skips archived and removed publishers", () => {
  const archived = {
    ...publisher("elder", "regular_pioneer"),
    archived_at: "2025-01-01T00:00:00+00:00",
  };
  const removed = publisher("ministerial_servant", "removed");

  const groups = groupPublishers([archived, removed]);

  expect(groups.elders).toEqual([]);
  expect(groups.ministerialServants).toEqual([]);
  expect(groups.pioneers).toEqual([]);
});

test("publisherStandingOptions and publisherTypeOptions expose value/label pairs", () => {
  expect(publisherStandingOptions()).toContainEqual({ value: "elder", label: "Elder" });
  expect(publisherStandingOptions()).toContainEqual({
    value: "ministerial_servant",
    label: "Ministerial Servant",
  });
  expect(publisherTypeOptions()).toContainEqual({
    value: "regular_pioneer",
    label: "Regular Pioneer",
  });
  expect(publisherTypeOptions()).toContainEqual({ value: "removed", label: "Removed" });
});
