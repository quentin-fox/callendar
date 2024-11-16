import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as middleware from "@/middleware/index.server";

import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableEmptyCard from "@/components/TableEmptyCard";
import { Button } from "@/components/ui/button";

import { useOutletUserContext } from "@/context";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Locations",
      to: "/locations",
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const user = await middleware.user.middleware({ context, params });

  const listLocations = models.locations.list.bind(null, DB);

  const result = await services.locations.list(listLocations, user);

  if (isError(result)) {
    throw new Error(result.error);
  }

  const locations: dtos.Location[] = result.value.map(
    (location): dtos.Location => ({
      title: location.title,
      publicId: location.publicId,
      createdAt: location.createdAt,
    }),
  );

  return json({ locations });
};

export default function Page() {
  const { locations } = useLoaderData<typeof loader>();

  const { user } = useOutletUserContext();

  return (
    <div className="flex flex-col items-center">
      <Outlet context={{ user }} />
      {locations.length === 0 && (
        <TableEmptyCard.Spacing>
          <TableEmptyCard
            title="No Locations"
            description="Add a location to associate a schedule and/or shift with a hospital, clinic, etc."
          >
            <Link to="add">
              <Button type="button" variant={"default"}>
                Add a Location
              </Button>
            </Link>
          </TableEmptyCard>
        </TableEmptyCard.Spacing>
      )}
      {locations.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64">Title</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.publicId}>
                  <TableCell className="w-64">{location.title}</TableCell>
                  <TableCell>{location.publicId}</TableCell>
                  <TableCell>{location.createdAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <DotsHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <Link to={location.publicId + "/edit"}>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <Link to={location.publicId + "/remove"}>
                          <DropdownMenuItem className="text-destructive">
                            Remove
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Link className="m-8" to="add">
            <Button type="button" variant={"default"}>
              Add a Location
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
