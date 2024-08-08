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

const chartData = [
  { month: "January", claimed: 10, unclaimed: 5 },
  { month: "February", claimed: 8, unclaimed: 3 },
  { month: "March", claimed: 6, unclaimed: 2 },
  { month: "April", claimed: 4, unclaimed: 1 },
  { month: "May", claimed: 2, unclaimed: 1 },
  { month: "June", claimed: 1, unclaimed: 10 },
];

export default function Page() {
  return (
    <div className="grid gap-4 md:cols-2">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-lg">Upcoming Shifts</CardTitle>
          <BellIcon />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="text-3xl font-bold">5</div>
          <p className="text-xs text-muted-foreground">next shift in 3 days</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-lg">Shifts this Month</CardTitle>
          <CalendarIcon />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="text-3xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">5 unclaimed shifts</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <ChartContainer config={chartConfig} className="min-h-[20rem]">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
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
