import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http";
import { exportUserData } from "@/server/services/profile";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => {
  const data = await exportUserData(user!.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="zielony-zakatek-moje-dane-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
