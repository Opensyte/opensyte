import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Deal, type DealFilters } from '~/types/crm';

interface PipelineState {
  deals: Deal[];
  filters: DealFilters;
  loading: boolean;
  error: string | null;
  setDeals: (deals: Deal[]) => void;
  updateDeal: (deal: Deal) => void;
  addDeal: (deal: Deal) => void;
  removeDeal: (id: string) => void;
  setFilters: (filters: Partial<DealFilters>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// TODO: Remove persist function on syncing prisma

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set) => ({
      deals: [],
      filters: {
        dateRange: null,
        valueRange: null,
        probability: null,
      },
      loading: false,
      error: null,
      setDeals: (deals) => set({ deals }),
      updateDeal: (updatedDeal) =>
        set((state) => ({
          deals: state.deals.map((deal) =>
            deal.id === updatedDeal.id ? updatedDeal : deal
          ),
        })),
      addDeal: (deal) => set((state) => ({ deals: [deal, ...state.deals] })),
      removeDeal: (id) =>
        set((state) => ({
          deals: state.deals.filter((deal) => deal.id !== id),
        })),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'pipeline-storage',
    }
  )
);