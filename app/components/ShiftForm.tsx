import { useState } from "react";

import * as dtos from "@/dtos";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

import { formatInTimeZone } from "date-fns-tz";

type Props = {
  schedules: dtos.Schedule[];
  locations: dtos.Location[];
  shift: dtos.Shift | null;
  user: dtos.User;
};

export default function ShiftForm(props: Props) {
  const [publicScheduleId, setPublicScheduleId] = useState(
    props.shift?.schedule?.publicId,
  );
  const [publicLocationId, setPublicLocationId] = useState(
    props.shift?.location?.publicId,
  );

  const initialDate = props.shift
    ? formatInTimeZone(props.shift.start, props.user.timeZone, "yyyy-MM-dd")
    : undefined;

  const initialStart = props.shift
    ? formatInTimeZone(
        props.shift.start,
        props.user.timeZone,
        "yyyy-MM-dd'T'HH:mm",
      )
    : undefined;

  const initialEnd = props.shift
    ? formatInTimeZone(
        props.shift.end,
        props.user.timeZone,
        "yyyy-MM-dd'T'HH:mm",
      )
    : undefined;

  const [date, setDate] = useState(initialDate);

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  return (
    <div className="flex flex-col gap-4 items-stretch">
      <Tabs
        defaultValue={
          props.shift && !props.shift.schedule ? "location" : "schedule"
        }
      >
        <TabsList className="w-full">
          <TabsTrigger value="schedule" className="flex-1">
            Assign to Schedule
          </TabsTrigger>
          <TabsTrigger value="location" className="flex-1">
            Assign to Location
          </TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <Input
            type="hidden"
            name={"schedule-location-type"}
            value="schedule"
            readOnly
          />
          <fieldset>
            <Label htmlFor="publicScheduleId">Schedule</Label>
            <Select
              name="publicScheduleId"
              required
              value={publicScheduleId}
              onValueChange={setPublicScheduleId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Schedule" />
              </SelectTrigger>
              <SelectContent>
                {props.schedules.map((schedule) => (
                  <SelectItem key={schedule.publicId} value={schedule.publicId}>
                    {schedule.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
        </TabsContent>
        <TabsContent value="location">
          <Input
            type="hidden"
            name={"schedule-location-type"}
            value="location"
            readOnly
          />
          <fieldset>
            <Label htmlFor="publicLocationId">Location</Label>
            <Select
              name="publicLocationId"
              required
              value={publicLocationId}
              onValueChange={setPublicLocationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {props.locations.map((location) => (
                  <SelectItem key={location.publicId} value={location.publicId}>
                    {location.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
        </TabsContent>
      </Tabs>

      <Separator />

      <Tabs
        defaultValue={
          props.shift && props.shift.isAllDay === false ? "timed" : "all-day"
        }
        className="w-[100%]"
      >
        <TabsList className="w-full">
          <TabsTrigger value="all-day" className="flex-1">
            All-Day Shift
          </TabsTrigger>
          <TabsTrigger value="timed" className="flex-1">
            Timed Shift
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all-day">
          <Input type="hidden" name={"type"} value="all-day" readOnly />
          <fieldset>
            <Label htmlFor="date">Date</Label>
            <Input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
          </fieldset>
        </TabsContent>
        <TabsContent value="timed">
          <Input type="hidden" name={"type"} value="timed" readOnly />
          <div className="flex flex-col justify-start gap-4 sm:flex-row sm:justify-between">
            <fieldset className="sm:flex-1">
              <Label htmlFor="start">Start</Label>
              <Input
                type="datetime-local"
                name="start"
                required
                value={start}
                onChange={(e) => setStart(e.currentTarget.value)}
              />
            </fieldset>
            <fieldset className="sm:flex-1">
              <Label htmlFor="end">End</Label>
              <Input
                type="datetime-local"
                name="end"
                required
                value={end}
                onChange={(e) => setEnd(e.currentTarget.value)}
              />
            </fieldset>
          </div>
        </TabsContent>
      </Tabs>

      <fieldset className="items-top flex space-x-2">
        <Checkbox
          id="claimed"
          name="claimed"
          defaultChecked={!!props.shift?.claimedAt}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="claimed"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Shift is Claimed
          </label>
        </div>
      </fieldset>
    </div>
  );
}
