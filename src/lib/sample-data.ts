// Sample data for the sales pipeline
import { v4 as uuidv4 } from "uuid";
import type { Deal } from "~/types/crm";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
}

interface FilterOptions {
  searchQuery?: string;
  valueRange?: [number, number] | null;
  probability?: [number, number] | null;
  dealsArray: Deal[];
}

// Customer data
export const customers: Customer[] = [
  {
    id: "cust_1",
    firstName: "John",
    lastName: "Smith",
    company: "Acme Corp",
    email: "john.smith@acme.com",
  },
  {
    id: "cust_2",
    firstName: "Sarah",
    lastName: "Johnson",
    company: "TechGiant Inc",
    email: "sarah.j@techgiant.com",
  },
  {
    id: "cust_3",
    firstName: "Michael",
    lastName: "Brown",
    company: "Brown Enterprises",
    email: "michael@brownent.com",
  },
  {
    id: "cust_4",
    firstName: "Olivia",
    lastName: "Martinez",
    company: "Innovate LLC",
    email: "olivia.m@innovate.co",
  },
  {
    id: "cust_5",
    firstName: "James",
    lastName: "Wilson",
    company: "Wilson Group",
    email: "james@wilsongroup.com",
  },
];

// Deal sample data with proper date to string conversion for Deal type compatibility
export const deals: Deal[] = [
  {
    id: uuidv4(),
    customerId: "cust_1",
    customerName: "John Smith - Acme Corp",
    title: "Annual Software Subscription",
    value: 24000,
    currency: "USD",
    status: "QUALIFIED",
    stage: 2,
    probability: 60,
    expectedCloseDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 14,
    ).toISOString(),
    description: "Renewal of enterprise package with added users",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_2",
    customerName: "Sarah Johnson - TechGiant Inc",
    title: "Enterprise Implementation",
    value: 75000,
    currency: "USD",
    status: "PROPOSAL",
    stage: 3,
    probability: 75,
    expectedCloseDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    description: "Full platform implementation with data migration",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_3",
    customerName: "Michael Brown - Brown Enterprises",
    title: "Consulting Package",
    value: 12500,
    currency: "USD",
    status: "NEW",
    stage: 0,
    probability: 25,
    expectedCloseDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 45,
    ).toISOString(),
    description: "Initial consulting for digital transformation",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_1",
    customerName: "John Smith - Acme Corp",
    title: "Add-on Services",
    value: 8500,
    currency: "USD",
    status: "NEGOTIATION",
    stage: 4,
    probability: 90,
    expectedCloseDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 7,
    ).toISOString(),
    description: "Additional professional services for custom integrations",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_4",
    customerName: "Olivia Martinez - Innovate LLC",
    title: "Starter Package",
    value: 5000,
    currency: "USD",
    status: "CONTACTED",
    stage: 1,
    probability: 40,
    expectedCloseDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 21,
    ).toISOString(),
    description: "Small business starter package with basic features",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_5",
    customerName: "James Wilson - Wilson Group",
    title: "Premium Support Contract",
    value: 35000,
    currency: "USD",
    status: "CLOSED_WON",
    stage: 5,
    probability: 100,
    expectedCloseDate: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    actualCloseDate: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    description: "Annual premium support package with 24/7 availability",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_3",
    customerName: "Michael Brown - Brown Enterprises",
    title: "Training Workshop",
    value: 9000,
    currency: "USD",
    status: "CLOSED_LOST",
    stage: 6,
    probability: 0,
    expectedCloseDate: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 5,
    ).toISOString(),
    actualCloseDate: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(),
    description: "On-site training for team of 10, lost to competitor",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    customerId: "cust_4",
    customerName: "Olivia Martinez - Innovate LLC",
    title: "Custom Development",
    value: 18000,
    currency: "USD",
    status: "QUALIFIED",
    stage: 2,
    probability: 55,
    expectedCloseDate: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 28,
    ).toISOString(),
    description: "Custom module development for specific business needs",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Function to get deals for display
export function getDeals(): Deal[] {
  return deals.map((deal) => ({
    ...deal,
    expectedCloseDate: deal.expectedCloseDate,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    actualCloseDate: deal.actualCloseDate ?? undefined,
  }));
}

// Function to get a deal by ID
export function getDealById(id: string): Deal | undefined {
  return deals.find((deal) => deal.id === id);
}

// Function to get customers for display
export function getCustomers(): Customer[] {
  return customers;
}

// Function to filter deals
export function filterDeals({
  searchQuery,
  valueRange,
  probability,
  dealsArray,
}: FilterOptions): Deal[] {
  return dealsArray.filter((deal) => {
    // Filter by search query (case insensitive)
    if (
      searchQuery &&
      !deal.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !deal.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Filter by value range
    if (
      valueRange &&
      (deal.value < valueRange[0] * 1000 || deal.value > valueRange[1] * 1000)
    ) {
      return false;
    }

    // NOTE: disabling it for now
    // Filter by probability range
    if (
      probability &&
      deal.probability !== undefined &&
      (deal.probability < probability[0] || deal.probability > probability[1])
    ) {
      return false;
    }

    return true;
  });
}
