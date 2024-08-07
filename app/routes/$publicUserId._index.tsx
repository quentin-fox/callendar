import { useOutletUserContext } from "@/context";

export default function Page() {
  const { user } = useOutletUserContext();

  // design:

  // one full-width card at the top showing the ICS link
  // two full width cards showing # upcoming shifts, # total shifts
  return <h1 className="text-3xl font-bold">Hello {user.firstName}!</h1>;
}
