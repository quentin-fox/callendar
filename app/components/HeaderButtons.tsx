export default function HeaderButtons(props: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-row justify-end items-center gap-4"
      style={{ gridArea: "header-content" }}
    >
      {props.children}
    </div>
  );
}
