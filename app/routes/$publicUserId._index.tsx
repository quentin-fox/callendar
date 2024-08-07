import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { useOutletUserContext } from "@/context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { CopyIcon, CalendarIcon, BellIcon } from "@radix-ui/react-icons";

export default function Page() {
  const { user } = useOutletUserContext();

  // design:

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
  // one full-width card at the top showing the ICS link
  // two full width cards showing # upcoming shifts, # total shifts
  return <h1 className="text-3xl font-bold">Hello {user.firstName}!</h1>;
}
