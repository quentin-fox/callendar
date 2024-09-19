import { Link, NavLink } from "@remix-run/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { HamburgerMenuIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";

import * as dtos from "@/dtos";

type Props = {
  user: dtos.User;
};

const pages = [
  {
    title: "New Upload",
    to: "uploads/new",
  },
  {
    title: "Schedules",
    to: "schedules",
  },
  {
    title: "Shifts",
    to: "shifts",
  },
  {
    title: "Locations",
    to: "locations",
  },
];

export default function NavigationBar(props: Props) {
  return (
    <nav className="flex flex-row justify-between h-16 p-4 rounded bg-background">
      <Link className="flex flex-row gap-3" to={`/${props.user.publicId}`}>
        <h1 className="text-2xl font-bold">Callendar</h1>
        <Separator orientation="vertical" />
        <h1 className="text-2xl font-bold">{props.user.firstName}</h1>
      </Link>
      <div className="hidden md:flex flex-row justify-end gap-2">
        {pages.map((page) => (
          <NavLink key={page.to} to={page.to}>
            {({ isActive }) => (
              <Button
                type="button"
                variant={"outline"}
                className={cn(isActive && "bg-secondary")}
              >
                {page.title}
              </Button>
            )}
          </NavLink>
        ))}

        <Separator orientation="vertical" />

        <Link to="/logout">
          <Button type="button" variant="outline">
            Logout
          </Button>
        </Link>
      </div>
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <HamburgerMenuIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {pages.map((page) => (
              <DropdownMenuItem key={page.to}>
                <Link to={page.to}>{page.title}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link to="/logout">Logout</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
