import { AppLoadContext } from "@remix-run/server-runtime";

import invariant from "tiny-invariant";
import { validate } from "uuid";

import * as services from "@/services";
import * as models from "@/models";
import * as entities from "@/entities";

import { Params } from "@remix-run/react";

export const middleware = async ({
  params,
  context,
}: {
  // simplify the required types so it can be used in both actions/loaders w/o issues
  params: Params;
  context: AppLoadContext;
}): Promise<entities.User> => {
  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  if (!validate(publicUserId)) {
    throw new Error("publicUserID must be a valid UUID");
  }

  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);

  const user = await services.users.listOne(listOneUser, {
    publicUserId,
  });

  if (!user) {
    throw new Error("User does not exist.");
  }

  return user;
};
