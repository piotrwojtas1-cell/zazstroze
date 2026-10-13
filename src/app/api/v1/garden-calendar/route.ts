import { apiRoute } from "@/server/http";
import { listGardenTasks } from "@/server/services/content";

export const GET = apiRoute({ auth: "public" }, async () => ({ tasks: await listGardenTasks() }));
