import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { slugify } from "~/helpers/url";

import * as models from '~/models';

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env; 
  const locations = await models.locations.list(DB);

  return { locations };
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { DB } = context.cloudflare.env; 

  const formData = await request.formData();

  const title = formData.get('title');

  invariant(typeof title === 'string');

  const createdAt = Date.now();

  const slug = slugify(title).substring(0, 30);

  const createdAtCode = Buffer.from(createdAt.toString()).toString('base64');

  const publicId = `loc_${slug}_${createdAtCode}`;

  await models.locations.insert(DB, { createdAt, publicId, title })

  // no redirect, but should reload
  return null;
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div>
    <h1>
      Locations
      </h1>
      <ul>
        {loaderData.locations.map((location) => (
          <li key={location.public_id}>{location.title}</li>
        ))}
      </ul>

      <h1>
        Add New Location
      </h1>

      <Form method="POST">
        <fieldset>
          <label htmlFor="title">Title</label>
          <input type="text" name="title" required />
        </fieldset>
        <button type="submit">
          Submit
        </button>
      </Form>
    </div>
  );
}
