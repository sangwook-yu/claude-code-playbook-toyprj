import { describe, expect, it } from "vitest";

import { dedupeById } from "./dedupe";

describe("dedupeById", () => {
  it("같은 id의 뒤엣것은 버리고 처음 것만 남긴다", () => {
    const result = dedupeById([
      { id: "a", label: "first" },
      { id: "b", label: "only" },
      { id: "a", label: "second" },
    ]);

    expect(result).toEqual([
      { id: "a", label: "first" },
      { id: "b", label: "only" },
    ]);
  });

  it("중복이 없으면 그대로 돌려준다", () => {
    const items = [{ id: "a" }, { id: "b" }];
    expect(dedupeById(items)).toEqual(items);
  });
});
