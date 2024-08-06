import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const publicUserId = params.publicUserId;
  invariant(publicUserId);

  const publicLocationId = params.publicLocationId;
  invariant(publicLocationId);
}
