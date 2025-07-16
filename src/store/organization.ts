import { create } from "zustand";

interface Organization {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  plan?: string;
}

interface OrganizationState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  setCurrentOrganization: (organization: Organization | null) => void;
  setOrganizations: (organizations: Organization[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useOrganizationStore = create<OrganizationState>()((set) => ({
  currentOrganization: null,
  organizations: [],
  loading: false,
  setCurrentOrganization: (organization) =>
    set({ currentOrganization: organization }),
  setOrganizations: (organizations) => set({ organizations }),
  setLoading: (loading) => set({ loading }),
}));
