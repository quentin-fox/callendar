# date-fns-tz

How do the zoned times works with `date-fns-ts`? Everything is stored as a Date, which is internally always UTC, instead of with `moment-timezone`, which has some internal state for timezone.

There are two functions `toZonedTime` and `fromZonedTime` that can be used to convert between the two, but it doesn't always work the way you think it does, especially depending on if they are used on the client vs. on the server.

A "zoned time" is one where the actual UTC timestamp that the Date represents has been shifted so that the UTC timestamp is the same as what the local timestamp would want.

e.g., when running in UTC

```
2024-11-10T05:00:00.000Z -> toZonedTime(America/Toronto) -> 2024-11-10T00:00:00.000Z
```

Notice that it is STILL stored as a UTC timestamp, but has been adjusted by the UTC offset at the given time zone. In this case, `toZonedTime` was called with `America/Toronto`, which is UTC-5. In other words, `toZonedTime` adds the UTC offset to the UTC timestamp, while still keeping it as a UTC timestamp.


It's not just as simple as that though - what happens if we're not running this function in UTC or America/Toronto? Let's try in America/Vancouver (UTC-8)

```
2024-11-10T05:00:00.000Z -> toZonedTime(America/Toronto) -> 2024-11-10T08:00:00.000Z
```

Now it goes up?

It seems like `toZonedTime` is not aware just of the target time zone, but also of the environment's time zone.

The specific math here seems to be 

```
timestamp + (utcOffset, target) - (utcOffset, environment)
5 + (-5) - (-8)
5 - 5 + 8
8
```

So in the previous example, where it seemed like a naive `timestamp + (utcOffset, target)`, it was just because the UTC offset of the environment was 0 (running in UTC).

What is the intuition behind this?

1. The original UTC timestamp was at 05 hours
2. If we're trying to show this in America/Toronto, this should be at 00 hours (`+ UTC-5`)
3. To display a timestamp that is at 00 hours in America/Vancouver, we need to adjust for the UTC offset of America/Vancouver (`- UTC-8`)

So if we're in a browser in America/Vancouver, and we have a UTC timestamp, and want to know how many hours past midnight the UTC timestamp is in Toronto time, we have to trick the browser into adjusting the Date so that the math makes sense in the local time.

If the final timestamp is `2024-11-10T08:00:00.000Z`, then for a browser running in America/Vancouver, doing `date.getHours()` will return 0, which is the correct answer for "what time of day in America/Toronto is this UTC timestamp."

`date-fns` does not just operate on the UTC timestamp of a date - it also takes into account the time zone of its environment (server, browser, etc.).

```typescript

import { isSameDay } from "date-fns"

// question, are these in the same day in America/Toronto? w/o using any time zone adjustments
const d1 = new Date("2024-11-10T07:00:00.000Z")
const d2 = new Date("2024-11-11T01:00:00.000Z")

// if running in America/Toronto
isSameDay(d1, d2) // returns true

// if running in UTC
isSameDay(d1, d2) // returns false

// if running in America/Vancouver
isSameDay(d1, d2) // returns false

```

In America/Toronto, `isSameDay` gets the correct answer, because the environment is already running in the target time zone, so operations on the Date object are automatically converted to the correct time zone.

In UTC, there is no conversion for the UTC-5 we need to get the correct answer, since we're running in UTC, so it thinks the second time stamp is on Nov 11, and does not think the two timestamps are on the same day.

In America/Vancouver, there is an automatic UTC-offset adjustment, but the adjustment is by UTC-8, instead of UTC-5 (like we need for America/Toronto). The second date is adjusted back to Nov 10, but the first date is adjusted so far back it is now Nov 9, so `isSameDay` does not consider them to be on the same day.

Now let's consider how this works with `toZonedTime`


```typescript

import { isSameDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"


// question, are these in the same day in America/Toronto? w/o using any time zone adjustments
const d1 = new Date("2024-11-10T07:00:00.000Z")
const d2 = new Date("2024-11-11T01:00:00.000Z")

// if running in America/Toronto
{
    const dz1 = toZonedTime(d1, "America/Toronto");
    // 2024-11-10T07:00:00.000Z + (UTC-5) - (UTC-5) = 2024-11-10T07:00:00.000Z -> 2am, local to environment

    const dz2 = toZonedTime(d1, "America/Toronto");
    // 2024-11-11T01:00:00.000Z + (UTC-5) - (UTC-5) = 2024-11-11T01:00:00.000Z -> 8pm, local to environment
    isSameDay(dz1, dz2) // returns true, as in America/Toronto these two timestamps are on the same day
}

// if running in UTC
{
    const dz1 = toZonedTime(d1, "America/Toronto");
    // 2024-11-10T07:00:00.000Z + (UTC-5) - (UTC+0) = 2024-11-10T02:00:00.000Z -> 2am, local to environment

    const dz2 = toZonedTime(d1, "America/Toronto");
    // 2024-11-11T01:00:00.000Z + (UTC-5) - (UTC+0) = 2024-11-10T20:00:00.000Z -> 8pm, local to environment

    isSameDay(dz1, dz2) // returns true, as in UTC these two timestamps are on the same day
}

// if running in America/Vancouver
{
    const dz1 = toZonedTime(d1, "America/Toronto");
    // 2024-11-10T07:00:00.000Z + (UTC-5) - (UTC-8) = 2024-11-10T10:00:00.000Z -> 2am, local to environment

    const dz2 = toZonedTime(d1, "America/Toronto");
    // 2024-11-11T01:00:00.000Z + (UTC-5) - (UTC-8) = 2024-11-11T03:00:00.000Z -> 8pm, local to environment

    isSameDay(dz1, dz2) // returns true, as in America/Vancouver, these two timestamps are on the same day
}

```

Things to notice:

1. In our first setup, where we don't use `toZonedTime`, the `isSameDay` functions correctly when the environment is the same as our target time zone (America/Toronto). Calling `toZonedTime` does not affect this, because the two utc offset adjustments will cancel each other out. This means that the `isSameDay` will work exactly the same as before, and still produce the right answer.

```
timestamp + (utcOffset, target) - (utcOffset, environment)
timestamp + (UTC-5) - (UTC-5)
timestamp
```

2. The output timestamp of `toZonedTime`, when converted to the environment's time zone, always gives the same local time for the same target time zone. In all 3 environments, `dz1` was equivalent to `2am` and `dz2` was equivalent to `8pm` in the environment's time zone. Since the `date-fns` functions work relative to the environment's time zone, what `isZonedTime` has done is made it so that `isSameDay` in all 3 time zones were asking the same question: "For this UTC timestamp, after I convert it to the time zone I'm running in, am I on the same day?"

In short:

> We use `toZonedTime` when we have a timestamp stored in UTC, and we want to format or answer questions about its respective time in another target time zone, even when our environment's time zone is different from the target's time zone.
