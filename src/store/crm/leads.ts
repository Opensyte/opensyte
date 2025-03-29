import { create } from "zustand";
import type { Customer } from "~/types/crm";
import type { CustomerType, LeadSource, LeadStatus } from "~/types/crm-enums";
import { persist } from "zustand/middleware";

interface ContactsState {
  leads: Customer[];
  filters: {
    type?: CustomerType;
    status?: LeadStatus;
    source?: LeadSource;
    search?: string;
  };
  loading: boolean;
  setLeads: (leads: Customer[]) => void;
  addLead: (Lead: Customer) => void;
  updateLead: (leadId: string, data: Partial<Customer>) => void;
  removeLead: (leadId: string) => void;
  setFilters: (filters: Partial<ContactsState["filters"]>) => void;
  setLoading: (loading: boolean) => void;
}

// TODO: Remove persist function on syncing prisma

export const useLeadsStore = create<ContactsState>()(
  persist(
    (set) => ({
      leads: [],
      filters: {},
      loading: false,
      setLeads: (leads: Customer[]) => set({ leads }),
      addLead: (lead: Customer) =>
        set((state) => ({
          leads: [...state.leads, lead],
        })),
      updateLead: (leadId, data) =>
        set((state) => ({
          leads: state.leads.map((lead) => {
            return lead.id === leadId ? { ...lead, ...data } : lead;
          }),
        })),
      removeLead: (leadId) =>
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== leadId),
        })),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "leads-storage",
    },
  ),
);
