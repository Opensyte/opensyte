import { createTRPCRouter, publicProcedure } from "../../trpc";
import { CustomerCreateInputSchema } from "prisma/generated/zod";
import { db } from "~/server/db";

export const contactsCrmRoutes = createTRPCRouter({
  createContact: publicProcedure
    .input(CustomerCreateInputSchema)
    .mutation(async ({ input }) => {
      const contact = await db.customer.create({
        data: input,
      });

      return contact;
    }),
});
