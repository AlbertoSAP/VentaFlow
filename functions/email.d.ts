export function adminEmailsFromSnapshots(
  admins: Record<string, unknown> | null | undefined,
  vendorEmails: Record<string, string | null | undefined>,
): string[];

export function buildNewVendorEmail(vendor: {
  name?: string;
  email?: string;
  created?: number;
}): { subject: string; text: string };
