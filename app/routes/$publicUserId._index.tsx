import { useOutletUserContext } from "@/context";

export default function Page() {
  const { user } = useOutletUserContext();

  return <h1 className="text-3xl font-bold">Hello {user.firstName}!</h1>;
}
