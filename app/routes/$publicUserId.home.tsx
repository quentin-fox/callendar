import { unwrap } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";

import * as middleware from "@/middleware/index.server";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  CopyIcon,
  CalendarIcon,
  BellIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { formatInTimeZone } from "date-fns-tz";
import { addMonths } from "date-fns";
import { useOutletUserContext } from "@/context";
import { useToast } from "@/components/ui/use-toast";
import TableFooterButtons from "@/components/TableFooterButtons";

const chartConfig = {
  claimed: {
    label: "Claimed",
    color: "hsl(var(--chart-1))",
  },
  unclaimed: {
    label: "Unclaimed",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export const loader = async ({
  context,
  params,
  request,
}: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const user = await middleware.user.middleware({ context, params });

  const listShiftsByUser = models.shifts.listByUser.bind(null, DB);
  const listIcsKeys = models.icsKeys.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);

  const [shiftsResult, icsKeysResult, schedulesResult] = await Promise.all([
    services.shifts.listByUser(listShiftsByUser, user).then(unwrap),
    services.icsKeys.list(listIcsKeys, user).then(unwrap),
    services.schedules.list(listSchedules, user).then(unwrap),
  ]);

  const now = new Date();

  // now is now, so we don't have to be timeZone aware of it
  const upcoming = shiftsResult.reduce<number>((prev, curr) => {
    const start = new Date(curr.start);

    return start > now ? prev + 1 : prev;
  }, 0);

  // shifts is in descending order, so we need to reverse it first so that it's ascending
  // once ascending, the first shift whose start is greater than now is the next shift
  const nextShift = [...shiftsResult].reverse().find((shift) => {
    const start = new Date(shift.start);

    return start > now;
  });

  // monthly stats are time-zone aware
  // since what could be Nov 1 in UTC
  // could actually be a shift on the previous month
  // we'll count shifts by when they start, not when they end
  // i.e. when do you have to do the miserable job of heading to work

  // and just go for the next 2 months, past 5 months, and current month
  // gives an 8 month window
  // since most schedules aren't known more than 2 months in advance
  // but this gives a good amount of breathing room

  const bins = [
    addMonths(now, -5),
    addMonths(now, -4),
    addMonths(now, -3),
    addMonths(now, -2),
    addMonths(now, -1),
    now,
    addMonths(now, 1),
    addMonths(now, 2),
  ];

  // then for each of these bins, figure out how many shifts start times (zoned) are in the same month as them
  // we can be lazy about this

  const byMonth = bins.map((date) => {
    const label = formatInTimeZone(date, user.timeZone, "MMM yyyy");

    const shiftsInMonth = shiftsResult.filter((shift) => {
      const shiftLabel = formatInTimeZone(
        shift.start,
        user.timeZone,
        "MMM yyyy",
      );

      return shiftLabel === label;
    });

    const claimed = shiftsInMonth.reduce(
      (prev, curr) => (curr.claimedAt ? prev + 1 : prev),
      0,
    );

    const unclaimed = shiftsInMonth.length - claimed;

    return {
      label,
      claimed,
      unclaimed,
    };
  });

  const thisMonth = byMonth[5].claimed + byMonth[5].unclaimed;

  const stats = {
    upcoming,
    thisMonth,
    allTime: shiftsResult.length,
    nextShiftStart: nextShift?.start ?? null,
    byMonth,
  };

  const base = new URL(request.url);

  const icsKeys = icsKeysResult.map((icsKey) => {
    const schedule = icsKey.scheduleId
      ? (schedulesResult.find((s) => s.id === icsKey.scheduleId) ?? null)
      : null;

    return dtos.fromIcsKeyEntity(icsKey, schedule);
  });

  return { stats, origin: base.origin, icsKeys };
};

export default function Page() {
  const { user } = useOutletUserContext();
  const { stats, origin, icsKeys } = useLoaderData<typeof loader>();

  const { toast } = useToast();

  async function copyToClipboard(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    if (!e.currentTarget) {
      return;
    }

    if (e.currentTarget instanceof HTMLButtonElement === false) {
      return;
    }

    await navigator.clipboard.writeText(e.currentTarget.value);
    toast({
      title: "Success",
      description: `Copied to clipboard!`,
      variant: "default",
    });
  }

  return (
    <>
      <Outlet />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex-1">
          <CardHeader className="flex flex-row justify-between">
            <CardTitle className="text-lg">All-Time Shifts</CardTitle>
            <CalendarIcon />
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="text-3xl font-bold">{stats.allTime}</div>
            <p className="text-xs text-muted-foreground">
              {stats.thisMonth} shifts this month
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader className="flex flex-row justify-between">
            <CardTitle className="text-lg">Upcoming Shifts</CardTitle>
            <BellIcon />
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="text-3xl font-bold">{stats.upcoming}</div>
            {stats.nextShiftStart && (
              <p className="text-xs text-muted-foreground">
                next shift on{" "}
                {formatInTimeZone(stats.nextShiftStart, user.timeZone, "MMM d")}
              </p>
            )}
            {!stats.nextShiftStart && (
              <p className="text-xs text-muted-foreground">
                no upcoming shifts
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="hidden md:flex md:col-span-2">
          <ChartContainer config={chartConfig} className="min-h-80 w-full">
            <BarChart accessibilityLayer data={stats.byMonth}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />

              <Bar
                stackId="a"
                dataKey="claimed"
                fill="var(--color-claimed)"
                radius={[0, 0, 4, 4]}
                isAnimationActive={false}
              />
              <Bar
                stackId="a"
                dataKey="unclaimed"
                fill="var(--color-unclaimed)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Link</CardTitle>
            <CardDescription>
              Copy this link to sync your shifts with your Google, Apple, or
              Outlook calendars.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-row gap-2">
            <Input
              readOnly
              value={origin + `/` + user.publicId + "/ics"}
              className="flex-1"
            />
            <Button
              type="button"
              title="Copy to Clipboard"
              variant={"outline"}
              size={"icon"}
              value={origin + "/" + user.publicId + "/ics"}
              onClick={copyToClipboard}
            >
              <CopyIcon />
            </Button>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              External Subscription Links
            </CardTitle>
            <CardDescription>
              If you want to share your call shift calendar with others, create
              an external subscription link. External links will not give others
              the ability to edit your shifts on Callendar, and their view-only
              access to your shifts can be revoked at any point.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {icsKeys.length === 0 && (
              <div className="flex flex-col items-center justify-center">
                <Link to="ics-keys/add" preventScrollReset>
                  <Button type="button" variant={"default"}>
                    Add External Subscription Link
                  </Button>
                </Link>
              </div>
            )}
            {icsKeys.map((icsKey) => (
              <div key={icsKey.publicId} className="flex flex-row gap-2">
                <Input
                  readOnly
                  value={icsKey.title}
                  disabled
                  className="flex-1"
                />
                <Input
                  readOnly
                  value={
                    icsKey.schedule
                      ? "Schedule: " + icsKey.schedule.title
                      : "All Shifts"
                  }
                  disabled
                  className="flex-1"
                />
                <Input
                  readOnly
                  value={origin + `/ics-keys/` + icsKey.publicId}
                  className="flex-1"
                />
                <Button
                  type="button"
                  title="Copy to Clipboard"
                  variant={"outline"}
                  size={"icon"}
                  value={origin + `/ics-keys/` + icsKey.publicId}
                  onClick={copyToClipboard}
                >
                  <CopyIcon />
                </Button>
                <Link to={`ics-keys/${icsKey.publicId}/remove`}>
                  <Button
                    type="button"
                    title="Remove"
                    variant={"outline"}
                    size={"icon"}
                  >
                    <TrashIcon />
                  </Button>
                </Link>
              </div>
            ))}
            {icsKeys.length > 0 && (
              <TableFooterButtons>
                <Link to="ics-keys/add" preventScrollReset>
                  <Button type="button" variant={"default"}>
                    Add External Subscription Link
                  </Button>
                </Link>
              </TableFooterButtons>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
