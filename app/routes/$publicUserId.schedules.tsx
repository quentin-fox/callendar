import { isError } from "@/helpers/result";
import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { validate } from "uuid";

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

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Schedules",
      to: "/schedules",
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);

  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  if (!validate(publicUserId)) {
    throw new Error("publicUserID must be a valid UUID");
  }

  const result = await services.schedules.list(listOneUser, listSchedules, {
    publicUserId,
  });

  if (isError(result)) {
    throw new Error(result.error);
  }

  const schedules: dtos.Schedule[] = result.value.map(
    (schedule): dtos.Schedule => ({
      publicId: schedule.publicId,
      createdAt: schedule.createdAt,
      modifiedAt: schedule.modifiedAt,
      title: schedule.title,
      description: schedule.description,
      location: {
        title: schedule.location.title,
        publicId: schedule.location.publicId,
        createdAt: schedule.location.createdAt,
      },
      isDraft: schedule.isDraft,
      numShifts: schedule.numShifts,
      firstShiftStart: schedule.firstShiftStart,
      lastShiftStart: schedule.lastShiftStart,
    }),
  );

  return json({ schedules });
};

export default function Page() {
  const { schedules } = useLoaderData<typeof loader>();

  const { user } = useOutletUserContext();

  return (
    <div className="flex flex-col items-center">
      <Outlet context={{ user }} />
      {schedules.length === 0 && (
        <TableEmptyCard
          title="No Schedules"
          description="Upload your first schedule to start tracking your shifts."
        >
          <Link to="../uploads/new" relative="path">
            <Button type="button" variant={"default"}>
              Upload a Schedule
            </Button>
          </Link>
        </TableEmptyCard>
      )}
      {schedules.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Location</TableHead>
                <TableHead># Shifts</TableHead>
                <TableHead>First Shift</TableHead>
                <TableHead>Last Shift</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.publicId}>
                  <TableCell>{schedule.title}</TableCell>
                  <TableCell>{schedule.createdAt}</TableCell>
                  <TableCell>{schedule.location.title}</TableCell>
                  <TableCell>{schedule.numShifts}</TableCell>
                  <TableCell>{schedule.firstShiftStart}</TableCell>
                  <TableCell>{schedule.lastShiftStart}</TableCell>
                  <TableCell>
                    {schedule.isDraft ? "Draft" : "Finalized"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <DotsHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <Link to={schedule.publicId + "/edit"}>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <Link to={schedule.publicId + "/remove"}>
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
          <Link className="m-8" to="../uploads/new" relative="path">
            <Button type="button" variant={"default"}>
              Upload a Schedule
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
