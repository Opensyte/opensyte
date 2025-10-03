import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding workflow templates and agency data...");

  // Note: This seed script creates sample workflow templates
  // In a real implementation, these would be created through the template installation system

  console.log("📝 Creating sample organization...");
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-1" },
    update: {},
    create: {
      id: "seed-org-1",
      name: "Sample Agency",
      industry: "Digital Marketing",
      description: "A sample agency for testing workflow templates",
    },
  });

  console.log("👥 Creating sample customers...");
  const customer1 = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      organizationId: org.id,
      type: "CUSTOMER",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      company: "Acme Corp",
      position: "CEO",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "seed-customer-2" },
    update: {},
    create: {
      id: "seed-customer-2",
      organizationId: org.id,
      type: "CUSTOMER",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "+1234567891",
      company: "Tech Solutions Inc",
      position: "Marketing Director",
    },
  });

  console.log("💰 Creating sample retainer clients...");
  await prisma.retainerClient.upsert({
    where: { id: "seed-retainer-1" },
    update: {},
    create: {
      id: "seed-retainer-1",
      organizationId: org.id,
      customerId: customer1.id,
      amount: 5000,
      currency: "USD",
      frequency: "MONTHLY",
      startDate: new Date("2025-01-01"),
      nextInvoiceDate: new Date("2025-11-01"),
      isActive: true,
      autoInvoice: true,
    },
  });

  console.log("📄 Creating sample contracts...");
  await prisma.contract.upsert({
    where: { id: "seed-contract-1" },
    update: {},
    create: {
      id: "seed-contract-1",
      organizationId: org.id,
      customerId: customer2.id,
      name: "Annual Marketing Services Agreement",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      value: 60000,
      currency: "USD",
      status: "ACTIVE",
      renewalNotified: false,
    },
  });

  console.log("✅ Seed data created successfully");
}

main()
  .catch(e => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
