import { apiRoute } from "@/server/http";
import { balanceIntegrityCheck } from "@/server/services/reports";

export const GET = apiRoute({ auth: { permission: "reports.view" } }, async () => {
  const issues = await balanceIntegrityCheck();
  return { consistent: issues.length === 0, issues: issues.map((i) => ({ ...i, ledger: Number(i.ledger) })) };
});
