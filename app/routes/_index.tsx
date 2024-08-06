import { Form, useActionData } from "@remix-run/react";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
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

  invariant(typeof firstName === "string", "firstName must be a string");
  invariant(typeof code === "string", "code must be a string");

  const { DB } = context.cloudflare.env;

  const insertUser = models.users.insert.bind(null, DB);

  const result = await services.users.insert(insertUser, {
    firstName,
    code,
  });

  if (isError(result)) {
    return json({ error: result.error });
  }

  const publicId = result.value;

  return redirect("/" + publicId);
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col h-screen w-screen items-center flex-start pt-40 gap-2">
      <Card className="w-full max-w-sm">
        <Form action="/?index" method="POST">
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
            {actionData?.error && (
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
