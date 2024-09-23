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

  const shifts = result.value;

  const stats = {
    upcoming: shifts.length,
    thisMonth: Math.floor(shifts.length / 2),
    allTime: shifts.length,
    nextShiftStart: shifts[0]?.start ?? null,
    byMonth: [
      { label: "Jan 2024", claimed: 10, unclaimed: 5 },
      { label: "Feb 2024", claimed: 8, unclaimed: 3 },
      { label: "Mar 2024", claimed: 6, unclaimed: 2 },
      { label: "Apr 2024", claimed: 4, unclaimed: 1 },
      { label: "May 2024", claimed: 2, unclaimed: 1 },
      { label: "Jun 2024", claimed: 1, unclaimed: 10 },
    ],
  };

  return json({ stats });
};

export default function Page() {
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
          <p className="text-xs text-muted-foreground">
            next shift on {stats.nextShiftStart}
          </p>
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
          <Input readOnly value={`http://callendar.com/ics/someicslinkhere`} />
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
