import { expect, test } from "vite-plus/test";

import {
  groupPublishers,
  isPioneer,
  pioneerBadgeLabel,
  type Publisher,
} from "../src/feature/publisher/index.ts";

const congregationId = "7b15d4e5-d4fa-4eb4-a276-3790b7c4897b";

function publisher(standing: string, type: string): Publisher {
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
