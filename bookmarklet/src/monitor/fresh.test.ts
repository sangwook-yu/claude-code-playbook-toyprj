import { describe, expect, it } from "vitest";

import { pickFresh, remember } from "./fresh";

const key = (value: string) => value;

describe("pickFresh", () => {
  it("처음 보는 것만 고른다", () => {
    expect(pickFresh(new Set(["a"]), ["a", "b"], key)).toEqual(["b"]);
  });

  it("모두 이미 본 것이면 아무것도 고르지 않는다", () => {
    expect(pickFresh(new Set(["a", "b"]), ["a", "b"], key)).toEqual([]);
  });

  it("기억이 비어 있으면 모두 새것이다", () => {
    expect(pickFresh(new Set(), ["a", "b"], key)).toEqual(["a", "b"]);
  });
});

describe("remember", () => {
  it("이번에 없는 것은 잊는다", () => {
    const first = remember(["a", "b"], key);
    const second = remember(["b"], key);

    expect([...first].sort()).toEqual(["a", "b"]);
    expect([...second]).toEqual(["b"]);
  });

  it("사라졌다 다시 나타나면 새것으로 본다", () => {
    let seen = remember(["a"], key);
    seen = remember([], key);

    expect(pickFresh(seen, ["a"], key)).toEqual(["a"]);
  });

  it("계속 있는 동안에는 새것이 아니다", () => {
    const seen = remember(["a"], key);

    expect(pickFresh(seen, ["a"], key)).toEqual([]);
  });
});
