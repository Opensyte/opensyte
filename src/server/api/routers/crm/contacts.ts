import { createTRPCRouter, publicProcedure } from "../../trpc";
import { CustomerModel } from "zod-schema";
import { db } from "~/server/db";

export const contactsCrmRoutes = createTRPCRouter({
  createContact: publicProcedure
    .input(CustomerModel)
    .mutation(async ({ input }) => {
      const contact = await db.customer.create({
        data: input,
      });

      return contact;
    }),
});
