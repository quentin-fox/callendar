import { createCookie } from "@remix-run/cloudflare";

export const userIdCookie = createCookie("user_id", {
  secure: false,
  httpOnly: true,
  sameSite: "strict",
  path: "/",
});
