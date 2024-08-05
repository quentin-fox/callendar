import { userIdCookie } from "@/cookies.server";
import { redirect } from "@remix-run/server-runtime";

export const loader = async () => {
  const headers = new Headers({
    "Set-Cookie": await userIdCookie.serialize("", {
      maxAge: -1,
    }),
  });

  return redirect("/", {
    headers,
  });
};
