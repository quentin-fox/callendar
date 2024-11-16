export default function TableFooterButtons(props: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row justify-center gap-4 p-8">
      {props.children}
    </div>
  );
}
