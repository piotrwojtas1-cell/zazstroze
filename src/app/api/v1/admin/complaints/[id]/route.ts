import { apiRoute } from "@/server/http";
import { complaintUpdateSchema } from "@/server/services/admin-schemas";
import { handleComplaint } from "@/server/services/complaints";

export const PATCH = apiRoute({ auth: { permission: "complaints.manage" }, body: complaintUpdateSchema }, async ({ user, params, body, ipHash }) => ({
  complaint: await handleComplaint(user!, params.id!, body, ipHash),
}));
