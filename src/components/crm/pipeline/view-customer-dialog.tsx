"use client";

import { useEffect, useState } from "react";
import {
  CalendarIcon,
  Phone,
  Mail,
  MapPin,
  User2,
  Building,
} from "lucide-react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import type { Customer } from "~/types/crm";
import { useLeadsStore } from "~/store/crm/leads";

interface ViewCustomerDialogProps {
  customerName: string;
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// This is a sample customer details function. In a real application,
// this would fetch customer data from an API or store
const getCustomerDetails = (
  id: string,
  leads: Customer[],
): Customer | undefined => {
  return leads.find((lead) => lead.id == id);
};

export function ViewCustomerDialog({
  customerName,
  customerId,
  open,
  onOpenChange,
}: ViewCustomerDialogProps) {
  const { leads } = useLeadsStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  // Fetch customer details when the dialog opens
  useEffect(() => {
    if (open && !customer) {
      const customerDetails = getCustomerDetails(customerId, leads);
      setCustomer(customerDetails ?? null);
    }
  }, [open, customer, customerId, customerName, leads]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>

        {customer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {getInitials(`${customer.firstName} ${customer.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {customer.firstName} {customer.lastName}
                </h3>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{customer.company}</span>
                </div>
                <div className="mt-1">
                  <Badge variant="outline">{customer.status}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-4 font-medium">Contact Information</h4>
                  <div className="space-y-3">
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-primary hover:underline"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="text-muted-foreground h-4 w-4" />
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-primary hover:underline"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {customer.position && (
                      <div className="flex items-center gap-2">
                        <User2 className="text-muted-foreground h-4 w-4" />
                        <span>{customer.position}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-4 font-medium">Address Information</h4>
                  <div className="space-y-2">
                    {customer.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                        <div>
                          <p>{customer.address}</p>
                          <p>
                            {customer.city}, {customer.state}{" "}
                            {customer.postalCode}
                          </p>
                          <p>{customer.country}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <h4 className="mb-4 font-medium">Additional Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-muted-foreground block text-sm">
                      Source
                    </span>
                    <Badge variant="secondary">
                      {customer.source?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-sm">
                      Created
                    </span>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{format(customer.createdAt, "PPP")}</span>
                    </div>
                  </div>
                  {customer.notes && (
                    <div>
                      <span className="text-muted-foreground block text-sm">
                        Notes
                      </span>
                      <p className="mt-1">{customer.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
