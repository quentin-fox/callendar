import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";

import { Form, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";
import * as middleware from "@/middleware/index.server";

import { isError } from "@/helpers/result";

import {
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ErrorAlert";
import RouteAlertDialog from "@/components/RouteAlertDialog";
import { nanoid } from "nanoid";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  const publicShiftIds = url.searchParams.getAll("publicShiftId");

  if (publicShiftIds.length === 0) {
    return redirect("/" + publicUserId + "/shifts");
  }

  return { publicShiftIds };
};

export const action = async ({
  params,
  context,
  request,
}: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const url = new URL(request.url);

  const publicShiftIds = url.searchParams.getAll("publicShiftId");

  const { DB } = context.cloudflare.env;

  const listShiftsByUser = models.shifts.listByUser.bind(null, DB);
  const markManyShiftsUnclaimed = models.shifts.markManyUnclaimed.bind(
    null,
    DB,
  );

  const result = await services.shifts.markManyUnclaimed(
    listShiftsByUser,
    markManyShiftsUnclaimed,
    user,
    {
      publicShiftIds,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  const redirectSearchParams = new URLSearchParams(
    publicShiftIds.map((publicShiftId) => [
      "highlightedPublicId",
      publicShiftId,
    ]),
  );

  redirectSearchParams.append("hash", nanoid());

  return redirect(
    "/" + user.publicId + "/shifts?" + redirectSearchParams.toString(),
  );
};

export default function Page() {
  const { publicShiftIds } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {publicShiftIds.length === 1
              ? "Mark Shift Unclaimed"
              : `Mark ${publicShiftIds.length} Shifts Unclaimed`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {publicShiftIds.length === 1
              ? "Are you sure you want to mark this shift as unclaimed?"
              : `Are you sure you want mark these ${publicShiftIds.length} shifts as unclaimed?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST">
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="submit">Confirm</Button>
          </AlertDialogFooter>
        </Form>
        {actionData?.error && <ErrorAlert error={actionData.error} />}
      </AlertDialogContent>
    </RouteAlertDialog>
  );
}
