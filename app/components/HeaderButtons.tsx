export default function HeaderButtons(props: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-row justify-end gap-4"
      style={{ gridArea: "header-content" }}
    >
      {props.children}
    </div>
  );
}
