import { ActionFunctionArgs, json, redirect } from "@remix-run/server-runtime";

import { Form, Link, useActionData } from "@remix-run/react";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";
import { isError } from "@/helpers/result";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ErrorAlert";

export const action = async ({ params, context }: ActionFunctionArgs) => {
  const publicUserId = params.publicUserId;
  invariant(publicUserId);

  const publicScheduleId = params.publicScheduleId;
  invariant(publicScheduleId);

  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);
  const removeSchedule = models.schedules.remove.bind(null, DB);
  const removeShiftsBySchedule = models.shifts.removeBySchedule.bind(null, DB);

  const result = await services.schedules.remove(
    listOneUser,
    listSchedules,
    removeSchedule,
    removeShiftsBySchedule,
    {
      publicUserId,
      publicScheduleId,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  return redirect("/" + publicUserId + "/schedules");
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <AlertDialog defaultOpen>
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
            <Link to="..">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </Link>
            <Button variant={"destructive"} type="submit">
              Remove
            </Button>
          </AlertDialogFooter>
        </Form>
        {actionData?.error && <ErrorAlert error={actionData.error} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
