import { LoaderFunctionArgs } from "@remix-run/server-runtime";

import { middleware } from "@/middleware/user.server";

import * as dtos from "@/dtos";

export const loader = async (args: LoaderFunctionArgs) => {
  const userResult = await middleware(args);

  const user: dtos.User = dtos.fromUserEntity(userResult);

  return { user };
};
