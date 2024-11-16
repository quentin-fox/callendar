import { createCookie } from "@remix-run/cloudflare";

export const userIdCookie = createCookie("user_id", {
  secure: true,
  httpOnly: true,
  sameSite: "lax", // so that we can be authenticated on server-side requests
  path: "/",
});
