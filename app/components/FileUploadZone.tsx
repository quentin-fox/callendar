import { useEffect, useRef, useState } from "react";

export function FileUploadZone() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cb = (event: ClipboardEvent) => {
      if (!event.clipboardData?.files) {
        return;
      }

      if (!ref.current) {
        return;
      }

      ref.current.files = event.clipboardData.files;
      setFiles(event.clipboardData.files);
    };

    window.addEventListener("paste", cb);

    return () => {
      window.removeEventListener("paste", cb);
    };
  }, []);

  const onClick = (event: { stopPropagation(): void }) => {
    event.stopPropagation();

    if (!ref.current) {
      return;
    }

    ref.current.click();
  };

  const [files, setFiles] = useState<FileList | null>(null);

  return (
    <button
      type="button"
      className="flex flex-col justify-center items-center rounded-xl border border-dashed border-muted p-8 cursor-pointer w-full hover:border-muted-foreground transition"
      onClick={onClick}
      title="Upload an image"
      onDrop={(event) => {
        event.stopPropagation();
        event.preventDefault();
        setFiles(event.dataTransfer.files);
      }}
      onDragOver={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <label className="text-xl font-bold" htmlFor="image">
        Upload an Image
      </label>
      <input
        type="file"
        name="image"
        ref={ref}
        className="sr-only"
        onChange={(event) => {
          event.preventDefault();
          setFiles(event.target.files);
        }}
      />
      <p className="text-sm text-muted-foreground">
        Click anywhere, paste, or drag-and-drop to upload an image
      </p>
      {!!files && files.length && <p>{files.item(0)?.name}</p>}
    </button>
  );
}
