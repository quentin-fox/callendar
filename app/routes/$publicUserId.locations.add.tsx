import { ActionFunctionArgs, json, redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";
import { isError } from "@/helpers/result";
import { Form, Link, useActionData } from "@remix-run/react";
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

export const action = async ({
  params,
  request,
  context,
}: ActionFunctionArgs) => {
  const publicUserId = params.publicUserId;
  invariant(publicUserId);

  const formData = await request.formData();

  const title = formData.get("title");

  invariant(typeof title === "string");

  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);
  const listLocations = models.locations.list.bind(null, DB);
  const insertLocation = models.locations.insert.bind(null, DB);

  const result = await services.locations.insert(
    listOneUser,
    listLocations,
    insertLocation,
    {
      publicUserId,
      title,
    },
  );

  if (isError(result)) {
    return json({ error: result.error }, { status: 400 });
  }

  return redirect("/" + publicUserId + "/locations");
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <AlertDialog defaultOpen>
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
