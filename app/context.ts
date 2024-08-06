import { useOutletContext } from "@remix-run/react";
import * as dtos from "@/dtos";

export const useOutletUserContext = useOutletContext<{ user: dtos.User }>;
