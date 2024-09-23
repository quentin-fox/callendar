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

import { isError } from "@/helpers/result";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import ErrorAlert from "@/components/ErrorAlert";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({
    params,
    context,
  });

  const publicLocationId = params.publicLocationId;
  invariant(publicLocationId);

  const { DB } = context.cloudflare.env;

  const listOneLocation = models.locations.listOne.bind(null, DB);

  const result = await services.locations.listOne(listOneLocation, user, {
    publicLocationId,
  });

  if (isError(result)) {
    throw new Error(result.error);
  }

  const location = result.value;

  return json({ location });
};

export const action = async ({
  params,
  request,
  context,
}: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({
    params,
    context,
  });

  const publicLocationId = params.publicLocationId;
  invariant(publicLocationId);

  const formData = await request.formData();

  const title = formData.get("title");

  invariant(typeof title === "string");

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const updateLocation = models.locations.update.bind(null, DB);

  const result = await services.locations.update(
    listLocations,
    updateLocation,
    user,
    {
      publicLocationId,
      title,
    },
  );

  if (isError(result)) {
    return json({ error: result.error }, { status: 400 });
  }

  return redirect("/" + user.publicId + "/locations");
};

export default function Page() {
  const { location } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Location</AlertDialogTitle>
          <AlertDialogDescription>
            Change the title of the location. This change will be reflected on
            all linked schedules and shifts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST">
          <fieldset className="pt-2 pb-4">
            <Label htmlFor="title">Title</Label>
            <Input
              type="text"
              name="title"
              required
              defaultValue={location.title}
            />
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
    </AlertDialog>
  );
}
