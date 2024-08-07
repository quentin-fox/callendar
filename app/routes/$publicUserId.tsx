import { Link, Outlet, useLoaderData, useMatches } from "@remix-run/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import NavigationBar from "@/components/NavigationBar";

import { loader } from "@/loaders/user.server";
export { loader };

export default function Page() {
  const matches = useMatches();

  const { user } = useLoaderData<typeof loader>();

  const breadcrumbs: { title: string; to: string }[] = matches.flatMap(
    (match) => {
      if (
        typeof match.handle !== "object" ||
        !match.handle ||
        "breadcrumb" in match.handle === false ||
        typeof match.handle.breadcrumb !== "function"
      ) {
        return [];
      }

      const bc: unknown = match.handle.breadcrumb();

      if (typeof bc !== "object" || !bc) {
        return [];
      }

      if ("title" in bc === false || typeof bc.title !== "string") {
        return [];
      }

      if ("to" in bc === false || typeof bc.to !== "string") {
        return [];
      }
      const { title, to } = bc;

      return { title, to: "/" + user.publicId + to };
    },
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center">
      <div className="flex flex-col items-stretch w-full md:max-w-[64rem] pt-4 px-4 gap-4">
        <NavigationBar user={user} />

        <main className="flex flex-col rounded-lg bg-background p-4 gap-4">
          <header>
            {breadcrumbs.length > 0 && (
              <Breadcrumb>
                <BreadcrumbList>
                  {[
                    { to: "/" + user.publicId, title: "Home" },
                    ...breadcrumbs,
                  ].flatMap((breadcrumb, index, list) => [
                    index > 0 && <BreadcrumbSeparator key={`${index}-sep`} />,
                    <BreadcrumbItem key={`${index}-item`}>
                      {index < list.length - 1 ? (
                        <BreadcrumbLink asChild>
                          <Link to={breadcrumb.to}>{breadcrumb.title}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>,
                  ])}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </header>
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
