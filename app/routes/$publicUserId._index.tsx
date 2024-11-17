import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";

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

import { CopyIcon, CalendarIcon, BellIcon } from "@radix-ui/react-icons";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import { toZonedTime } from "date-fns-tz";
import { addMonths, format, isSameMonth } from "date-fns";
import { useOutletUserContext } from "@/context";

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

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const user = await middleware.user.middleware({ context, params });

  const listShiftsByUser = models.shifts.listByUser.bind(null, DB);

  const result = await services.shifts.listByUser(listShiftsByUser, user);

  if (isError(result)) {
    throw new Error(result.error);
  }

  // this is sorted in ascending order
  const shifts = result.value;

  const now = new Date();

  // now is now, so we don't have to be timeZone aware of it
  const upcoming = shifts.reduce<number>((prev, curr) => {
    const start = new Date(curr.start);

    return start > now ? prev + 1 : prev;
  }, 0);

  // this works because shifts is in ascending order
  // so the first shift whose start is greater than now is the next shift
  const nextShift = shifts.find((shift) => {
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

  const zonedNow = toZonedTime(now, user.timeZone);

  const bins = [
    addMonths(zonedNow, -5),
    addMonths(zonedNow, -4),
    addMonths(zonedNow, -3),
    addMonths(zonedNow, -2),
    addMonths(zonedNow, -1),
    zonedNow,
    addMonths(zonedNow, 1),
    addMonths(zonedNow, 2),
  ];

  // then for each of these bins, figure out how many shifts start times (zoned) are in the same month as them
  // we can be lazy about this

  const byMonth = bins.map((date) => {
    const label = format(date, "MMM yyyy");

    const shiftsInMonth = shifts.filter((shift) => {
      const zonedStart = toZonedTime(shift.start, user.timeZone);

      return isSameMonth(zonedStart, date);
    });

    const claimed = shiftsInMonth.reduce(
      (prev, curr) => (curr.claimed ? prev + 1 : prev),
      0,
    );

    const unclaimed = shiftsInMonth.length - claimed;

    return {
      label,
      claimed,
      unclaimed,
    };
  });

  const stats = {
    upcoming,
    thisMonth: Math.floor(shifts.length / 2),
    allTime: shifts.length,
    nextShiftStart: nextShift?.start ?? null,
    byMonth,
  };

  return json({ stats });
};

export default function Page() {
  const { user } = useOutletUserContext();
  const { stats } = useLoaderData<typeof loader>();

  return (
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
              {format(
                toZonedTime(stats.nextShiftStart, user.timeZone),
                "MMM d",
              )}
            </p>
          )}
          {!stats.nextShiftStart && (
            <p className="text-xs text-muted-foreground">no upcoming shifts</p>
          )}
        </CardContent>
      </Card>
      <Card className="hidden md:flex md:col-span-2">
        <ChartContainer config={chartConfig} className="min-h-[20rem] w-full">
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
          <Input readOnly value={`http://callendar.com/ics/` + user.publicId} />
          <Button
            type="button"
            title="Copy to Clipboard"
            variant={"outline"}
            size={"icon"}
          >
            <CopyIcon />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
