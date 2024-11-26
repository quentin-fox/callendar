import { ActionFunctionArgs } from "@remix-run/server-runtime";

import { Form, useActionData, useNavigate } from "@remix-run/react";
import invariant from "tiny-invariant";

import * as models from "@/models";
import * as services from "@/services";

import * as middleware from "@/middleware/index.server";

import { isOk } from "@/helpers/result";

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
import { useEffect } from "react";

export const action = async ({ params, context }: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({
    params,
    context,
  });

  const publicIcsKeyId = params.publicIcsKeyId;
  invariant(publicIcsKeyId);

  const { DB } = context.cloudflare.env;

  const listOneIcsKey = models.icsKeys.listOne.bind(null, DB);
  const removeIcsKey = models.icsKeys.remove.bind(null, DB);

  const result = await services.icsKeys.remove(
    listOneIcsKey,
    removeIcsKey,
    user,
    {
      publicIcsKeyId,
    },
  );

  return result;
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  const navigate = useNavigate();

  useEffect(() => {
    if (!actionData) {
      return;
    }

    if (isOk(actionData)) {
      navigate("../../", { preventScrollReset: true });
    }
  }, [actionData, navigate]);

  return (
    <RouteAlertDialog onClosePath="../../">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove External Subscription Link</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this external subscription link?
            Everyone who has subscribed to this calendar will no longer be able
            to see your shifts.
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
