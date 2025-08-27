"use client";
import { ContactsClient } from "~/components/crm/contacts/contacts-client";
import { withClientCRMPermissions } from "~/components/shared/client-permission-guard";

export default function CRMContactsPage() {
  return withClientCRMPermissions(<ContactsClient />);
}
