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
