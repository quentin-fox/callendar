import {
  Card,
  CardTitle,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function TableEmptyCard(props: Props) {
  return (
    <div className="flex flex-col items-center">
      <Card className="w-full md:w-[30rem]">
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </CardHeader>
        <CardFooter className="gap-4">{props.children}</CardFooter>
      </Card>
    </div>
  );
}

function Spacing(props: { children: React.ReactNode }) {
  return <div className="py-32">{props.children}</div>;
}

TableEmptyCard.Spacing = Spacing;
