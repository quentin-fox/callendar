import { ActionFunctionArgs, redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";
import * as middleware from "@/middleware/index.server";

import { isError } from "@/helpers/result";
import { Form, useActionData } from "@remix-run/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

export const action = async ({
  params,
  request,
  context,
}: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({
    params,
    context,
  });

  const formData = await request.formData();

  const title = formData.get("title");

  invariant(typeof title === "string");

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const insertLocation = models.locations.insert.bind(null, DB);

  const result = await services.locations.insert(
    listLocations,
    insertLocation,
    user,
    {
      title,
    },
  );

  if (isError(result)) {
    return { error: result.error };
  }

  return redirect(
    "/" + user.publicId + "/locations?highlightedPublicId=" + result.value,
  );
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <RouteAlertDialog onClosePath="../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Location</AlertDialogTitle>
          <AlertDialogDescription>
            Add a new location by title so you can attach it to schedules and
            shifts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="POST">
          <fieldset className="pt-2 pb-4">
            <Label htmlFor="title">Title</Label>
            <Input type="text" name="title" required />
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
