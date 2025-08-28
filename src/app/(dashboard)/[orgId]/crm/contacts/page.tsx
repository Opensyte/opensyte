import { ContactsClient } from "~/components/crm/contacts/contacts-client";
import { CRMPermissionWrapper } from "~/components/shared/wrappers/crm-permission-wrapper";

export default function CRMContactsPage() {
  return (
    <CRMPermissionWrapper>
      <ContactsClient />
    </CRMPermissionWrapper>
  );
}
