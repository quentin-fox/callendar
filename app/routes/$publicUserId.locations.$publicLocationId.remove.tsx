import { ActionFunctionArgs, json, redirect } from "@remix-run/server-runtime";

import { Form, Link, useActionData } from "@remix-run/react";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";

import * as middleware from "@/middleware/index.server";

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
  const user = await middleware.user.middleware({
    params,
    context,
  });

  const publicLocationId = params.publicLocationId;
  invariant(publicLocationId);

  const { DB } = context.cloudflare.env;

  const listOneLocation = models.locations.listOne.bind(null, DB);
  const removeLocation = models.locations.remove.bind(null, DB);

  const result = await services.locations.remove(
    listOneLocation,
    removeLocation,
    user,
    {
      publicLocationId,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  return redirect("/" + user.publicId + "/locations");
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Location</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this location? All related schedules
            and shifts will have their locations removed.
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
