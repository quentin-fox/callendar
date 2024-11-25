import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";
import * as middleware from "@/middleware/index.server";
import * as dtos from "@/dtos";

import { isError, unwrap } from "@/helpers/result";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Button } from "@/components/ui/button";

import {
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import ErrorAlert from "@/components/ErrorAlert";
import RouteAlertDialog from "@/components/RouteAlertDialog";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);

  const [locationsResult, schedulesResult] = await Promise.all([
    services.locations.list(listLocations, user).then(unwrap),
    services.schedules.list(listSchedules, user).then(unwrap),
  ]);

  const schedules = schedulesResult.map((schedule) => {
    const location = locationsResult.find((l) => schedule.locationId === l.id);

    return dtos.fromScheduleEntity(schedule, location ?? null);
  });

  return { schedules };
};

export const action = async ({
  params,
  context,
  request,
}: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({
    params,
    context,
  });

  const { DB } = context.cloudflare.env;

  const listSchedules = models.schedules.list.bind(null, DB);
  const insertIcsKey = models.icsKeys.insert.bind(null, DB);

  const formData = await request.formData();

  const publicScheduleId = formData.get("publicScheduleId");
  invariant(
    typeof publicScheduleId === "string" || publicScheduleId === null,
    "publicScheduleId not found",
  );

  const title = formData.get("title");
  invariant(typeof title === "string", "title not found");

  const result = await services.icsKeys.insert(
    listSchedules,
    insertIcsKey,
    user,
    {
      publicScheduleId,
      title,
    },
  );

  if (isError(result)) {
    return { error: result.error };
  }

  return redirect("/" + user.publicId + "/home");
};

export default function Page() {
  const { schedules } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../../">
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Add External Subscription Link</AlertDialogTitle>
          <AlertDialogDescription>
            Add a new external subscription link. By default, it will allow the
            person that subscribes to this link to view all your shifts, but you
            can restrict it to just have view access for a single schedule.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST" className="flex flex-col gap-4">
          <fieldset className="pt-2 pb-4">
            <Label htmlFor="title">Title</Label>
            <Input type="text" name="title" required />
          </fieldset>

          <fieldset>
            <Label htmlFor="publicScheduleId">Schedule</Label>
            <Select name="publicScheduleId">
              <SelectTrigger>
                <SelectValue placeholder="Schedule" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.publicId} value={schedule.publicId}>
                    {schedule.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="submit">Submit</Button>
          </AlertDialogFooter>
        </Form>
        {actionData?.error && <ErrorAlert error={actionData.error} />}
      </AlertDialogContent>
    </RouteAlertDialog>
  );
}
