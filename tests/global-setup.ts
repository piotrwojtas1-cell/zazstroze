import { execSync } from "node:child_process";
import "./setup-env";

/** Migracje bazy testowej przed uruchomieniem testów. */
export default function setup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
