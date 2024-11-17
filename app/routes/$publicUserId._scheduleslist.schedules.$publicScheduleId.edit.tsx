import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as middleware from "@/middleware/index.server";

import { isError, unwrap } from "@/helpers/result";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import ErrorAlert from "@/components/ErrorAlert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import RouteAlertDialog from "@/components/RouteAlertDialog";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const publicScheduleId = params.publicScheduleId;
  invariant(publicScheduleId);

  const { DB } = context.cloudflare.env;

  const listSchedules = models.schedules.list.bind(null, DB);
  const listLocations = models.locations.list.bind(null, DB);

  const [scheduleResult, locationsResult] = await Promise.all([
    services.schedules
      .listOne(listSchedules, user, { publicScheduleId })
      .then(unwrap),
    services.locations.list(listLocations, user).then(unwrap),
  ]);

  const location = locationsResult.find(
    (l) => l.id === scheduleResult.locationId,
  );

  const schedule: dtos.Schedule = dtos.fromScheduleEntity(
    scheduleResult,
    location ?? null,
  );

  const locations: dtos.Location[] = locationsResult.map(
    dtos.fromLocationEntity,
  );

  return json({ schedule, locations });
};

export const action = async ({
  params,
  request,
  context,
}: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const publicScheduleId = params.publicScheduleId;
  invariant(publicScheduleId);

  const formData = await request.formData();

  const title = formData.get("title");
  invariant(typeof title == "string", "title not found");

  const description = formData.get("description");
  invariant(typeof description == "string", "description not found");

  const isDraftStr = formData.get("isDraft");
  const isDraft = isDraftStr === "on";

  const publicLocationId = formData.get("publicLocationId");
  invariant(typeof publicLocationId === "string", "publicLocationId not found");

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);
  const updateSchedule = models.schedules.update.bind(null, DB);

  const result = await services.schedules.update(
    listLocations,
    listSchedules,
    updateSchedule,
    user,
    {
      publicScheduleId,
      title,
      description,
      publicLocationId,
      isDraft,
    },
  );

  if (isError(result)) {
    return json({ error: result.error }, { status: 400 });
  }

  return redirect("/" + user.publicId + "/schedules");
};

export default function Page() {
  const { schedule, locations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Schedule</AlertDialogTitle>
          <AlertDialogDescription>
            Change the location, title and description of the schedule. You can
            also update if this schedule is a draft, or if it has been
            finalized.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST">
          <fieldset>
            <Label>Location</Label>
            <Select
              name="publicLocationId"
              required
              defaultValue={schedule.location?.publicId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.publicId} value={location.publicId}>
                    {location.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
          <fieldset className="pt-2 pb-4">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              name="title"
              required
              defaultValue={schedule.title}
            />
          </fieldset>
          <fieldset className="pt-2 pb-4">
            <Label htmlFor="title">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={schedule.description}
            />
          </fieldset>
          <fieldset className="items-top flex space-x-2">
            <Checkbox
              id="isDraft"
              name="isDraft"
              defaultChecked={schedule.isDraft}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="isDraft"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Draft
              </label>
              <p className="text-sm text-muted-foreground">
                Leave this checked to indicate that this schedule is likely to
                change in the future.
              </p>
            </div>
          </fieldset>
          <AlertDialogFooter>
            <Link to="..">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </Link>
            <Button type="submit">Submit</Button>
          </AlertDialogFooter>
        </Form>
        {actionData?.error && <ErrorAlert error={actionData.error} />}
      </AlertDialogContent>
    </RouteAlertDialog>
  );
}
