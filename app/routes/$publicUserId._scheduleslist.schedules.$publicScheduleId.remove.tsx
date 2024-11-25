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

  const publicScheduleId = params.publicScheduleId;
  invariant(publicScheduleId);

  const { DB } = context.cloudflare.env;

  const listSchedules = models.schedules.list.bind(null, DB);
  const removeSchedule = models.schedules.remove.bind(null, DB);
  const removeShiftsBySchedule = models.shifts.removeBySchedule.bind(null, DB);

  const result = await services.schedules.remove(
    listSchedules,
    removeSchedule,
    removeShiftsBySchedule,
    user,
    {
      publicScheduleId,
    },
  );

  if (isError(result)) {
    return { error: result.error };
  }

  return redirect("/" + user.publicId + "/schedules");
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Schedule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this schedule? It will be removed
            along with all of its shifts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST">
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant={"destructive"} type="submit">
              Remove
            </Button>
          </AlertDialogFooter>
        </Form>
        {actionData?.error && <ErrorAlert error={actionData.error} />}
      </AlertDialogContent>
    </RouteAlertDialog>
  );
}
