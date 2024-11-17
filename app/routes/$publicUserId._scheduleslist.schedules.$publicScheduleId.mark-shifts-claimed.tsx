import { ActionFunctionArgs, json, redirect } from "@remix-run/server-runtime";

import { Form, Link, useActionData } from "@remix-run/react";
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

  const publicScheduleId = params.publicScheduleId;
  invariant(publicScheduleId);

  const { DB } = context.cloudflare.env;

  const listSchedules = models.schedules.list.bind(null, DB);
  const markShiftsClaimedBySchedule = models.shifts.markClaimedBySchedule.bind(
    null,
    DB,
  );

  const result = await services.shifts.markClaimedBySchedule(
    listSchedules,
    markShiftsClaimedBySchedule,
    user,
    {
      publicScheduleId,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  return redirect("/" + user.publicId + "/schedules");
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Shifts Claimed</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want mark all the shifts in this schedule as
            claimed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST">
          <AlertDialogFooter>
            <Link to="..">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </Link>
            <Button type="submit">Confirm</Button>
          </AlertDialogFooter>
        </Form>
        {actionData?.error && <ErrorAlert error={actionData.error} />}
      </AlertDialogContent>
    </RouteAlertDialog>
  );
}
