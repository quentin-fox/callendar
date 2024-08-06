import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";

import invariant from "tiny-invariant";
import { validate } from "uuid";

import * as models from "@/models";

import * as entities from "@/entities";
import * as dtos from "@/dtos";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  if (!validate(publicUserId)) {
    throw new Error("publicUserID must be a valid UUID");
  }

  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);

  const user: entities.User | null = await listOneUser({ publicUserId });

  if (!user) {
    throw new Error("User does not exist.");
  }

  const response: { user: dtos.User } = {
    user: {
      publicId: user.publicId,
      firstName: user.firstName,
    },
  };

  return json(response);
};
