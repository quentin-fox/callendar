import { test } from "node:test";
import assert from "node:assert";
import { slugify } from "./url";

test("slugify", () => {
  const result = slugify(" Hello    World!! ");
  assert(result === "hello-world");
});
