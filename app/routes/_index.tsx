import { Form, useActionData } from "@remix-run/react";
import {
  ActionFunctionArgs,
  redirect,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";

import { userIdCookie } from "@/cookies.server";

import * as models from "@/models";
import * as services from "@/services";

import { validate } from "uuid";

// components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ErrorAlert from "@/components/ErrorAlert";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isError } from "@/helpers/result";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookieHeader = request.headers.get("Cookie");

  const parsedCookie = await userIdCookie.parse(cookieHeader);

  if (typeof parsedCookie === "string" && validate(parsedCookie)) {
    return redirect("/" + parsedCookie);
  }

  return null;
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const firstName = formData.get("firstName");
  const code = formData.get("code");
  const timeZone = formData.get("timeZone");

  invariant(typeof firstName === "string", "firstName must be a string");
  invariant(typeof code === "string", "code must be a string");
  invariant(typeof timeZone === "string", "timeZone must be a string");

  const { DB } = context.cloudflare.env;

  const insertUser = models.users.insert.bind(null, DB);

  const result = await services.users.insert(insertUser, {
    firstName,
    code,
    timeZone,
  });

  if (isError(result)) {
    return { error: result.error };
  }

  const publicId = result.value;

  const headers = new Headers({
    "Set-Cookie": await userIdCookie.serialize(publicId),
  });

  return redirect("/" + publicId + "/home", { headers });
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-start pt-40 gap-2">
      <Card className="w-full max-w-sm">
        <Form method="POST">
          <CardHeader>
            <CardTitle className="text-2xl">Callendar</CardTitle>
            <CardDescription>
              Enter your first name to get started!
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">First Name</Label>
              <Input
                id="firstName"
                type="text"
                required
                autoComplete="given-name"
                name="firstName"
                minLength={2}
              />
              <Input
                id="timeZone"
                value={Intl.DateTimeFormat().resolvedOptions().timeZone}
                type="hidden"
                name="timeZone"
                readOnly
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Signup Code</Label>
              <Input id="code" type="text" name="code" required minLength={8} />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-6">
            <Button className="w-full" type="submit">
              Sign Up
            </Button>
            {actionData?.error && <ErrorAlert error={actionData.error} />}
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
