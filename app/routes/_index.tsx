import { Form, useActionData } from "@remix-run/react";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";

import * as models from "@/models";

import { v4, validate } from "uuid";

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
import { userIdCookie } from "@/cookies.server";
import { cn } from "@/lib/utils";

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

  if (code !== "callmemaybe") {
    return json({ errors: { code: "Invalid code." } }, { status: 400 });
  }

  const { DB } = context.cloudflare.env;

  const insertUser = models.users.insert.bind(null, DB);

  const publicId = v4();
  const createdAt = Date.now();

  await insertUser({
    publicId,
    createdAt,
    firstName,
  });

  const headers = new Headers({
    "Set-Cookie": await userIdCookie.serialize(publicId),
  });

  return redirect("/" + publicId, { headers });
};

export default function Page() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-sm">
        <Form autoComplete="off" action="/?index" method="POST">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
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
              <Input
                id="code"
                type="password"
                name="code"
                className={cn(actionData?.errors.code && "border-destructive")}
                required
                minLength={8}
              />
              {actionData?.errors.code && (
                <Label htmlFor="code" className="text-sm text-destructive">
                  {actionData.errors.code}
                </Label>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              Sign Up
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
