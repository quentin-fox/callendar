import { useNavigate, useNavigation } from "@remix-run/react";
import { AlertDialog } from "./ui/alert-dialog";

type Props = {
  onClosePath: string;
  children: React.ReactNode;
};

export default function RouteAlertDialog(props: Props) {
  const navigate = useNavigate();
  const navigation = useNavigation();

  const onOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    if (navigation.state === "idle") {
      navigate(props.onClosePath, { relative: "path" });
    }
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open>
      {props.children}
    </AlertDialog>
  );
}
