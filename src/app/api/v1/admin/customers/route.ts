import { z } from "zod";
import { apiRoute } from "@/server/http";
import { searchCustomers } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "customers.view" }, query: z.object({ q: z.string().max(80).optional() }) }, async ({ query }) => {
  const users = await searchCustomers(query.q);
  return {
    customers: users.map((u) => ({
      id: u.id,
      email: u.email,
      status: u.status,
      name: [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" "),
      card: u.card && { id: u.card.id, number: u.card.number, status: u.card.status, pointsBalance: u.card.pointsBalance, tier: u.card.tier?.name },
      createdAt: u.createdAt,
    })),
  };
});
