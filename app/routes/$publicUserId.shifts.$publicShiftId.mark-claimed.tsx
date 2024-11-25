import { ActionFunctionArgs, redirect } from "@remix-run/server-runtime";

import { Form, useActionData } from "@remix-run/react";
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

export const action = async ({ params, context }: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const publicShiftId = params.publicShiftId;
  invariant(publicShiftId);

  const { DB } = context.cloudflare.env;

  const listShiftsByUser = models.shifts.listByUser.bind(null, DB);
  const markShiftClaimed = models.shifts.markClaimed.bind(null, DB);

  const result = await services.shifts.markClaimed(
    listShiftsByUser,
    markShiftClaimed,
    user,
    {
      publicShiftId,
    },
  );

  if (isError(result)) {
    return { error: result.error };
  }

  return redirect(
    "/" + user.publicId + "/shifts?highlightedPublicId=" + publicShiftId,
  );
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Claimed</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want mark this shift as claimed?
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
