import { isError } from "@/helpers/result";
import * as models from "@/models";
import * as services from "@/services";
import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { validate } from "uuid";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Locations",
      to: "/locations",
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);
  const listLocations = models.locations.list.bind(null, DB);

  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  if (!validate(publicUserId)) {
    throw new Error("publicUserID must be a valid UUID");
  }

  const result = await services.locations.list(listOneUser, listLocations, {
    publicUserId,
  });

  if (isError(result)) {
    throw new Error(result.error);
  }

  const locations = result.value;

  return json({ locations });
};

export default function Page() {
  const { locations } = useLoaderData<typeof loader>();

  return <h1># Locations: {locations.length}</h1>;
}
