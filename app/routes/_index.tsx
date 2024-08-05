import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";

import invariant from "tiny-invariant";
import { slugify } from "~/helpers/url";

export const action = async ({ request, context }: ActionFunctionArgs) => {
};

export default function Index() {

  return (
    <div>
      <h1>Locations</h1>
      <ul>
        {loaderData.locations.map((location) => (
          <li key={location.public_id}>{location.title}</li>
        ))}
      </ul>

      <h1>Add New Location</h1>

      <Form method="POST">
        <fieldset>
          <label htmlFor="title">Title</label>
          <input type="text" name="title" required />
        </fieldset>
        <button type="submit">Submit</button>
      </Form>
    </div>
  );
}
