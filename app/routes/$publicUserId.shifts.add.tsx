import {
  ActionFunctionArgs,
  json,
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
import ShiftForm from "@/components/ShiftForm";
import { useOutletUserContext } from "@/context";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);

  const [locationsResult, schedulesResult] = await Promise.all([
    services.locations.list(listLocations, user).then(unwrap),
    services.schedules.list(listSchedules, user).then(unwrap),
  ]);

  const locations = locationsResult.map(dtos.fromLocationEntity);
  const schedules = schedulesResult.map((schedule) => {
    const location = locationsResult.find((l) => schedule.locationId === l.id);

    return dtos.fromScheduleEntity(schedule, location ?? null);
  });

  return json({ locations, schedules });
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

  const listLocations = models.locations.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);
  const insertShift = models.shifts.insert.bind(null, DB);

  const formData = await request.formData();

  const scheduleLocationType = formData.get("schedule-location-type");

  invariant(
    scheduleLocationType === "schedule" || scheduleLocationType === "location",
    "schedule-location-type not found",
  );

  let publicScheduleId: string | null;
  let publicLocationId: string | null;

  if (scheduleLocationType === "schedule") {
    const value = formData.get("publicScheduleId");
    invariant(typeof value === "string", "publicScheduleId not found");

    publicScheduleId = value;
    publicLocationId = null;
  } else {
    const value = formData.get("publicLocationId");
    invariant(typeof value === "string", "publicLocationId not found");

    publicLocationId = value;
    publicScheduleId = null;
  }

  let shift:
    | {
        type: "all-day";
        date: string;
      }
    | {
        type: "timed";
        start: string;
        end: string;
      };

  const type = formData.get("type");
  invariant(type === "all-day" || type === "timed", "type not found");

  if (type === "all-day") {
    const date = formData.get("date");
    invariant(typeof date === "string", "date not found");

    shift = {
      type: "all-day",
      date,
    };
  } else {
    const start = formData.get("start");
    invariant(typeof start === "string", "start not found");

    const end = formData.get("end");
    invariant(typeof end === "string", "end not found");

    shift = {
      type: "timed",
      start,
      end,
    };
  }

  const claimedStr = formData.get("claimed");
  invariant(claimedStr === "on" || claimedStr === null, "claimed not found");

  const claimed = claimedStr === "on";

  const result = await services.shifts.insert(
    listLocations,
    listSchedules,
    insertShift,
    user,
    {
      publicLocationId,
      publicScheduleId,
      shift,
      claimed,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  return redirect(
    "/" + user.publicId + "/shifts?highlightedPublicId=" + result.value,
  );
};

export default function Page() {
  const { schedules, locations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const { user } = useOutletUserContext();

  return (
    <RouteAlertDialog onClosePath="../">
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Add Shift</AlertDialogTitle>
          <AlertDialogDescription>
            Add a shift to an existing schedule or to an existing location as a
            standalone shift.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST" className="flex flex-col gap-4">
          <ShiftForm
            schedules={schedules}
            locations={locations}
            shift={null}
            user={user}
          />
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
