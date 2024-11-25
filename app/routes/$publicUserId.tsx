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

import * as dtos from "@/dtos";
import * as middleware from "@/middleware/index.server";

import { LoaderFunctionArgs } from "@remix-run/server-runtime";
// import { userIdCookie } from "@/cookies.server";

export const loader = async (args: LoaderFunctionArgs) => {
  const userResult = await middleware.user.middleware(args);

  const user: dtos.User = dtos.fromUserEntity(userResult);

  // const headers = new Headers({
  //   "Set-Cookie": await userIdCookie.serialize(user.publicId),
  // });

  return { user };
};

function parseBreadcrumbObject(
  publicUserId: string,
  bc: unknown,
): { title: string; to: string; grid?: boolean }[] {
  if (Array.isArray(bc)) {
    const parse = parseBreadcrumbObject.bind(null, publicUserId);
    return bc.flatMap(parse);
  }

  if (typeof bc !== "object" || !bc) {
    return [];
  }

  if ("title" in bc === false || typeof bc.title !== "string") {
    return [];
  }

  if ("to" in bc === false || typeof bc.to !== "string") {
    return [];
  }

  const grid =
    "grid" in bc && typeof bc.grid === "boolean" ? bc.grid : undefined;

  const { title, to } = bc;

  return [{ title, to: "/" + publicUserId + to, grid }];
}

export default function Page() {
  const matches = useMatches();

  const { user } = useLoaderData<typeof loader>();

  const breadcrumbs = matches.flatMap((match) => {
    if (
      typeof match.handle !== "object" ||
      !match.handle ||
      "breadcrumb" in match.handle === false ||
      typeof match.handle.breadcrumb !== "function"
    ) {
      return [];
    }

    const bc: unknown = match.handle.breadcrumb();

    return parseBreadcrumbObject(user.publicId, bc);
  });

  const grid = breadcrumbs.some((bc) => bc.grid);

  return (
    <div className="flex min-h-screen w-full flex-col items-center">
      <div className="flex flex-col items-stretch w-full md:max-w-5xl p-4 gap-4">
        <NavigationBar user={user} />

        <main
          className="grid flex-col rounded-lg bg-background p-4 gap-4"
          style={{ gridTemplateAreas, gridTemplateRows: "2rem 1fr" }}
        >
          <header className="flex" style={{ gridArea: "breadcrumb" }}>
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
          </header>
          {!!grid && <Outlet context={{ user }} />}
          {!grid && (
            <div style={{ gridArea: "main-content" }}>
              <Outlet context={{ user }} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const gridTemplateAreas = `
  "breadcrumb header-content"
  "main-content main-content"
`;
