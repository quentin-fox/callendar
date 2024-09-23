import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";

import { middleware } from "@/middleware/user.server";

import * as dtos from "@/dtos";

export const loader = async (args: LoaderFunctionArgs) => {
  const user = await middleware(args);

  const response: { user: dtos.User } = {
    user: {
      publicId: user.publicId,
      firstName: user.firstName,
    },
  };

  return json(response);
};
