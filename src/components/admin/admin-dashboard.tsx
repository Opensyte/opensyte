"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { EarlyAccessUserList } from "./early-access-user-list";
import { AddUserForm } from "./add-user-form";
import { AdminNavbar } from "./admin-navbar";
import { Users, UserPlus } from "lucide-react";
import { api } from "~/trpc/react";

export function AdminDashboard() {
  const { data: earlyAccessCodes } = api.admin.getEarlyAccessCodes.useQuery();

  const totalInvitations = earlyAccessCodes?.length ?? 0;
  const usedCodes = earlyAccessCodes?.filter(code => code.isUsed).length ?? 0;
  const pendingInvitations = totalInvitations - usedCodes;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navbar */}
      <AdminNavbar />

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-6">
        {/* Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Add User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Early Access User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddUserForm />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Invitations
                  </span>
                  <span className="font-medium">{totalInvitations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Used Codes
                  </span>
                  <span className="font-medium text-green-600">
                    {usedCodes}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Pending Invitations
                  </span>
                  <span className="font-medium text-yellow-600">
                    {pendingInvitations}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Early Access Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Early Access Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EarlyAccessUserList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
