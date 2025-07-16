import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  CustomerInteraction,
  InteractionType,
  Customer,
} from "~/types/crm";

interface InteractionsState {
  // Data state
  interactions: CustomerInteraction[];

  // Data actions
  setInteractions: (interactions: CustomerInteraction[]) => void;
  addInteraction: (interactionData: CustomerInteraction) => void;
  deleteInteraction: (id: string) => void;
  updateInteraction: (id: string, data: Partial<CustomerInteraction>) => void;

  // Query functions
  getInteractionById: (id: string) => CustomerInteraction | undefined;
  getInteractionsByCustomer: (customerId: string) => CustomerInteraction[];
  getFilteredInteractions: (filter: {
    searchTerm?: string;
    type?: InteractionType | "ALL";
    customers?: Customer[];
  }) => CustomerInteraction[];
}

// TODO: Remove persist function on syncing prisma

export const useInteractionsStore = create<InteractionsState>()(
    (set, get) => ({
      // Initial state
      interactions: [],

      // Data actions
      setInteractions: (interactions) => set({ interactions }),

      addInteraction: (data) => {
        const newInteraction: CustomerInteraction = {
          id: uuidv4(),
          customerId: data.customerId,
          type: data.type,
          medium: data.medium,
          subject: data.subject,
          content: data.content,
          scheduledAt: data.scheduledAt ?? undefined,
          completedAt: data.completedAt ?? undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          interactions: [...state.interactions, newInteraction],
        }));

        return newInteraction;
      },

      deleteInteraction: (id) => {
        set((state) => ({
          interactions: state.interactions.filter(
            (interaction) => interaction.id !== id,
          ),
        }));
      },

      updateInteraction: (id, data) => {
        set((state) => ({
          interactions: state.interactions.map((interaction) =>
            interaction.id === id
              ? {
                  ...interaction,
                  ...data,
                  updatedAt: new Date(),
                }
              : interaction,
          ),
        }));
      },

      // Query functions
      getInteractionById: (id) => {
        return get().interactions.find((interaction) => interaction.id === id);
      },

      getInteractionsByCustomer: (customerId) => {
        return get().interactions.filter(
          (interaction) => interaction.customerId === customerId,
        );
      },

      getFilteredInteractions: (filter) => {
        const { interactions } = get();

        return interactions.filter((interaction) => {
          // Filter by search term
          const matchesSearch =
            (!filter.searchTerm ||
              interaction.subject
                ?.toLowerCase()
                .includes(filter.searchTerm.toLowerCase())) ??
            interaction.content
              ?.toLowerCase()
              .includes(filter.searchTerm.toLowerCase());

          // Filter by type
          const matchesType =
            !filter.type ||
            filter.type === "ALL" ||
            interaction.type === filter.type;

          // Filter by customer IDs
          const matchesCustomer =
            !filter.customers?.length ||
            filter.customers.some(
              (customer) => customer.id === interaction.customerId,
            );

          return matchesSearch && matchesType && matchesCustomer;
        });
      },
    }),
);
