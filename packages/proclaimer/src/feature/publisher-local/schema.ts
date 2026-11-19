import { z } from "zod";

// Mirrors the publisher-local document shape produced by earlier proclaimer
// export files (.ord/.json). Records hold confidential publisher details kept
// on-device rather than in Supabase.

export const versionSchema = z.object({
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const phoneSchema = z.object({
  id: z.string(),
  number: z.string(),
  label: z.string(),
  version: versionSchema,
});

export const addressSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit_number: z.string().optional(),
  house_number: z.string().optional(),
  street: z.string().optional(),
  suburb: z.string().optional(),
  coordinates: z.array(z.number()).min(2).max(3).optional(),
  version: versionSchema,
});

export const emailSchema = z.object({
  id: z.string(),
  address: z.string(),
  label: z.string(),
  version: versionSchema,
});

export const emergencyContactSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  relationship: z.string(),
  email: z.array(emailSchema).optional(),
  phone: z.array(phoneSchema),
  address: z.array(addressSchema).optional(),
  version: versionSchema,
});

export const photoSchema = z.object({
  id: z.string(),
  label: z.string(),
  data: z.string(),
  mime_type: z.string(),
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const versionedStringSchema = z.object({
  value: z.string(),
  version: versionSchema,
});

export const publisherLocalSchema = z.object({
  publisher_id: z.string().min(1),
  confidential_id: z.string(),
  phone: z.array(phoneSchema).optional(),
  address: z.array(addressSchema).optional(),
  email: z.array(emailSchema).optional(),
  emergency_contact: z.array(emergencyContactSchema).optional(),
  photo: z.array(photoSchema).optional(),
  birth_date: versionedStringSchema.optional(),
  baptism_date: versionedStringSchema.optional(),
  version: versionSchema,
});

export type Version = z.infer<typeof versionSchema>;
export type PublisherLocal = z.infer<typeof publisherLocalSchema>;
export type PublisherLocalPhone = NonNullable<PublisherLocal["phone"]>[number];
export type PublisherLocalAddress = NonNullable<PublisherLocal["address"]>[number];
export type PublisherLocalEmail = NonNullable<PublisherLocal["email"]>[number];
export type PublisherLocalEmergencyContact = NonNullable<
  PublisherLocal["emergency_contact"]
>[number];
export type PublisherLocalPhoto = NonNullable<PublisherLocal["photo"]>[number];

export function isPublisherLocalRecord(value: unknown): value is PublisherLocal {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Partial<PublisherLocal>;
  return typeof record.publisher_id === "string" && record.publisher_id.length > 0;
}
