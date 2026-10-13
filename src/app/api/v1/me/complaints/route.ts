import { z } from "zod";
import { apiRoute } from "@/server/http";
import { createComplaint, listMyComplaints } from "@/server/services/complaints";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => ({ complaints: await listMyComplaints(user!.id) }));

export const POST = apiRoute(
  {
    auth: "customer",
    body: z.object({
      subject: z.string().trim().min(5, "Temat musi mieć co najmniej 5 znaków.").max(120),
      description: z.string().trim().min(20, "Opisz sprawę (min. 20 znaków).").max(2000),
      transactionId: z.string().max(64).optional(),
    }),
  },
  async ({ user, body }) => ({ complaint: await createComplaint(user!.id, body) }),
);
