import type { PublisherLocalCollection } from "./collection.ts";
import type { MissingContactField } from "./missing.ts";
import { formatPhoneNumber } from "./phone.ts";
import type {
  PublisherLocal,
  PublisherLocalAddress,
  PublisherLocalEmail,
  PublisherLocalEmergencyContact,
  PublisherLocalPhone,
} from "./schema.ts";
import { isQuotaExceededError } from "./transfer.ts";
import { createVersion, touchVersion } from "./version.ts";

export interface PhoneDetailInput {
  number: string;
  label: string;
}

export interface EmailDetailInput {
  address: string;
  label: string;
}

export interface AddressDetailInput {
  label: string;
  unit_number: string;
  house_number: string;
  street: string;
  suburb: string;
}

export interface EmergencyContactDetailInput {
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
  email: string;
}

export type ContactDetailInput =
  | PhoneDetailInput
  | EmailDetailInput
  | AddressDetailInput
  | EmergencyContactDetailInput;

export type ContactDetailItem =
  | PublisherLocalPhone
  | PublisherLocalEmail
  | PublisherLocalAddress
  | PublisherLocalEmergencyContact;

/** Builds the stored item for one missing contact field from form input. */
export function buildContactDetailItem(
  field: MissingContactField["key"],
  input: ContactDetailInput,
): ContactDetailItem {
  const version = createVersion();
  const id = crypto.randomUUID();
  switch (field) {
    case "phone": {
      const { number, label } = input as PhoneDetailInput;
      return { id, number: formatPhoneNumber(number.trim()), label: label.trim(), version };
    }
    case "email": {
      const { address, label } = input as EmailDetailInput;
      return { id, address: address.trim(), label: label.trim(), version };
    }
    case "address": {
      const addr = input as AddressDetailInput;
      return {
        id,
        label: addr.label.trim(),
        unit_number: addr.unit_number.trim() || undefined,
        house_number: addr.house_number.trim() || undefined,
        street: addr.street.trim() || undefined,
        suburb: addr.suburb.trim() || undefined,
        version,
      };
    }
    case "emergency_contact": {
      const contact = input as EmergencyContactDetailInput;
      const phone = contact.phone.trim();
      const email = contact.email.trim();
      return {
        id,
        first_name: contact.first_name.trim(),
        last_name: contact.last_name.trim(),
        relationship: contact.relationship.trim(),
        phone: phone
          ? [
              {
                id: crypto.randomUUID(),
                number: formatPhoneNumber(phone),
                label: "",
                version: createVersion(),
              },
            ]
          : [],
        email: email
          ? [{ id: crypto.randomUUID(), address: email, label: "", version: createVersion() }]
          : undefined,
        version,
      };
    }
  }
}

/**
 * Applies form input to a stored detail, keeping its id and refreshing only
 * `updated_*` version metadata so merges can tell it changed.
 */
export function applyContactDetailInput(
  field: MissingContactField["key"],
  item: ContactDetailItem,
  input: ContactDetailInput,
): ContactDetailItem {
  switch (field) {
    case "phone": {
      const phone = item as PublisherLocalPhone;
      const { number, label } = input as PhoneDetailInput;
      return {
        ...phone,
        number: formatPhoneNumber(number.trim()),
        label: label.trim(),
        version: touchVersion(phone.version),
      };
    }
    case "email": {
      const email = item as PublisherLocalEmail;
      const { address, label } = input as EmailDetailInput;
      return {
        ...email,
        address: address.trim(),
        label: label.trim(),
        version: touchVersion(email.version),
      };
    }
    case "address": {
      const stored = item as PublisherLocalAddress;
      const addr = input as AddressDetailInput;
      return {
        ...stored,
        label: addr.label.trim(),
        unit_number: addr.unit_number.trim() || undefined,
        house_number: addr.house_number.trim() || undefined,
        street: addr.street.trim() || undefined,
        suburb: addr.suburb.trim() || undefined,
        version: touchVersion(stored.version),
      };
    }
    case "emergency_contact": {
      const contact = item as PublisherLocalEmergencyContact;
      const next = input as EmergencyContactDetailInput;
      const phone = next.phone.trim();
      const email = next.email.trim();
      const firstPhone = contact.phone[0];
      const firstEmail = contact.email?.[0];
      // The form edits the primary phone/email — entries beyond the first are
      // preserved rather than dropped.
      const extraPhones = contact.phone.slice(1);
      const extraEmails = (contact.email ?? []).slice(1);
      return {
        ...contact,
        first_name: next.first_name.trim(),
        last_name: next.last_name.trim(),
        relationship: next.relationship.trim(),
        phone: phone
          ? [
              firstPhone
                ? {
                    ...firstPhone,
                    number: formatPhoneNumber(phone),
                    version: touchVersion(firstPhone.version),
                  }
                : {
                    id: crypto.randomUUID(),
                    number: formatPhoneNumber(phone),
                    label: "",
                    version: createVersion(),
                  },
              ...extraPhones,
            ]
          : extraPhones,
        email: email
          ? [
              firstEmail
                ? {
                    ...firstEmail,
                    address: email,
                    version: touchVersion(firstEmail.version),
                  }
                : {
                    id: crypto.randomUUID(),
                    address: email,
                    label: "",
                    version: createVersion(),
                  },
              ...extraEmails,
            ]
          : extraEmails.length > 0
            ? extraEmails
            : undefined,
        version: touchVersion(contact.version),
      };
    }
  }
}

async function awaitWrite(tx: { isPersisted: { promise: Promise<unknown> } }): Promise<void> {
  try {
    await tx.isPersisted.promise;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error("Not enough storage space on this device to save the contact detail.");
    }
    throw error;
  }
}

/**
 * Appends a newly entered contact detail to the publisher's on-device record,
 * creating the record when the publisher has none yet.
 */
export async function addContactDetail(
  collection: PublisherLocalCollection,
  publisherId: string,
  field: MissingContactField["key"],
  input: ContactDetailInput,
): Promise<void> {
  await collection.preload();
  const item = buildContactDetailItem(field, input);
  if (!collection.get(publisherId)) {
    const record: PublisherLocal = {
      publisher_id: publisherId,
      confidential_id: "",
      version: createVersion(),
    };
    (record as Record<string, unknown>)[field] = [item];
    await awaitWrite(collection.insert(record));
    return;
  }
  const tx = collection.update(publisherId, (draft) => {
    const target = draft as Record<string, unknown>;
    const list = Array.isArray(target[field]) ? (target[field] as unknown[]) : [];
    target[field] = [...list, item];
    draft.version = touchVersion(draft.version);
  });
  await awaitWrite(tx);
}

/**
 * Replaces one stored contact detail in the publisher's on-device record.
 * Details nested inside an emergency contact pass that contact's id as
 * `parentId`.
 */
export async function updateContactDetail(
  collection: PublisherLocalCollection,
  publisherId: string,
  field: MissingContactField["key"],
  itemId: string,
  input: ContactDetailInput,
  parentId?: string,
): Promise<void> {
  await collection.preload();
  const record = collection.get(publisherId);
  const container = parentId
    ? record?.emergency_contact?.find((contact) => contact.id === parentId)
    : record;
  const stored = (container as Record<string, unknown> | undefined)?.[field];
  const found = Array.isArray(stored)
    ? stored.some((item) => (item as { id?: string }).id === itemId)
    : false;
  if (!record || !container || !found) {
    throw new Error("The contact detail could not be found.");
  }
  const tx = collection.update(publisherId, (draft) => {
    const target = parentId
      ? draft.emergency_contact?.find((contact) => contact.id === parentId)
      : draft;
    const items = (target as Record<string, unknown> | undefined)?.[field];
    if (!target || !Array.isArray(items)) {
      return;
    }
    const list = items as ContactDetailItem[];
    const index = list.findIndex((item) => item.id === itemId);
    if (index >= 0) {
      list[index] = applyContactDetailInput(field, list[index] as ContactDetailItem, input);
      draft.version = touchVersion(draft.version);
    }
  });
  await awaitWrite(tx);
}

/**
 * Sets or clears a versioned date field (birth_date / baptism_date) on the
 * publisher's on-device record, creating the record when the publisher has
 * none yet.
 */
export async function updatePublisherLocalDate(
  collection: PublisherLocalCollection,
  publisherId: string,
  field: "birth_date" | "baptism_date",
  value: string | null,
): Promise<void> {
  await collection.preload();
  if (!collection.get(publisherId)) {
    if (!value) {
      return;
    }
    const record: PublisherLocal = {
      publisher_id: publisherId,
      confidential_id: "",
      [field]: { value, version: createVersion() },
      version: createVersion(),
    };
    await awaitWrite(collection.insert(record));
    return;
  }
  const tx = collection.update(publisherId, (draft) => {
    const previous = draft[field];
    draft[field] = value
      ? { value, version: previous ? touchVersion(previous.version) : createVersion() }
      : undefined;
    draft.version = touchVersion(draft.version);
  });
  await awaitWrite(tx);
}
