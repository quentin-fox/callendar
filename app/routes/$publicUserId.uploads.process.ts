import { isError } from "@/helpers/result";

import * as services from "@/services";
import * as dtos from "@/dtos";
import * as entities from "@/entities";
import * as adapters from "@/adapters";

import {
  ActionFunctionArgs,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";

export const action = async ({ request }: ActionFunctionArgs) => {
  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5_000_000,
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const name = formData.get("name");
  invariant(typeof name === "string");

  const extra = formData.get("extra");
  invariant(typeof extra === "string" || extra === null);

  const images = formData.getAll("images[]");

  // to be uploaded to claude
  const contents: { data: string; mediaType: entities.ValidMediaType }[] =
    await Promise.all(
      images.flatMap((image) => {
        if (image instanceof File === false) {
          return [];
        }

        const matchingValidMediaType = entities.validMediaTypes.find(
          (mt) => mt === image.type,
        );

        if (!matchingValidMediaType) {
          return [];
        }

        return image.arrayBuffer().then((buffer) => {
          const data = Buffer.from(buffer).toString("base64");
          return {
            data,
            mediaType: matchingValidMediaType,
          };
        });
      }),
    );

  const generateShifts = adapters.mock.generateShifts;

  const result = await services.uploads.process(generateShifts, {
    name,
    extra,
    contents,
  });

  if (isError(result)) {
    return {
      shifts: null,
      receivedAt: Date.now(),
      error: result.error.join("\n"),
    };
  }

  if (result.value.length === 0) {
    return {
      shifts: null,
      receivedAt: Date.now(),
      error: "No shifts could be created. Please try uploading another image.",
    };
  }

  const shifts: (dtos.AllDayShiftOutput | dtos.TimedShiftOutput)[] =
    result.value;

  return { shifts, receivedAt: Date.now(), error: null };
};
