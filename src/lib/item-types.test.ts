import { describe, expect, it } from "vitest";

import {
  SYSTEM_TYPE_ORDER,
  SYSTEM_TYPE_STYLES,
  getSystemTypeStyle,
  systemTypeOrderIndex,
  typeNameFromSlug,
  typeSlug,
} from "@/lib/item-types";

describe("SYSTEM_TYPE_STYLES", () => {
  it("has an entry for every type in the canonical order, and no extras", () => {
    expect(Object.keys(SYSTEM_TYPE_STYLES).sort()).toEqual(
      [...SYSTEM_TYPE_ORDER].sort()
    );
  });

  it("uses a unique slug per type, so slug lookups are unambiguous", () => {
    const slugs = SYSTEM_TYPE_ORDER.map((name) => SYSTEM_TYPE_STYLES[name].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("marks only file and image as Pro", () => {
    const pro = SYSTEM_TYPE_ORDER.filter(
      (name) => SYSTEM_TYPE_STYLES[name].isPro
    );
    expect(pro).toEqual(["file", "image"]);
  });
});

describe("systemTypeOrderIndex", () => {
  it("orders types by the canonical system order", () => {
    expect(systemTypeOrderIndex("snippet")).toBe(0);
    expect(systemTypeOrderIndex("link")).toBe(SYSTEM_TYPE_ORDER.length - 1);
  });

  it("sorts an unknown type last", () => {
    expect(systemTypeOrderIndex("mystery")).toBe(SYSTEM_TYPE_ORDER.length);
  });

  it("sorts a shuffled list back into canonical order", () => {
    const shuffled = ["link", "custom", "note", "snippet"];
    const sorted = [...shuffled].sort(
      (a, b) => systemTypeOrderIndex(a) - systemTypeOrderIndex(b)
    );

    expect(sorted).toEqual(["snippet", "note", "link", "custom"]);
  });
});

describe("getSystemTypeStyle", () => {
  it("returns the registered style for a known type", () => {
    expect(getSystemTypeStyle("prompt").label).toBe("Prompts");
  });

  it("falls back rather than returning undefined for an unknown type", () => {
    // A user-defined type has no registry entry, and components index into the
    // result unconditionally — the fallback is what keeps that from throwing.
    const style = getSystemTypeStyle("something-custom");

    expect(style.label).toBe("Items");
    expect(style.icon).toBeTruthy();
    expect(style.iconColor).toBeTruthy();
    expect(style.borderColor).toBeTruthy();
    expect(style.dotColor).toBeTruthy();
  });
});

describe("typeSlug / typeNameFromSlug", () => {
  it("round-trips every system type", () => {
    for (const name of SYSTEM_TYPE_ORDER) {
      expect(typeNameFromSlug(typeSlug(name))).toBe(name);
    }
  });

  it("pluralizes the type name into a URL segment", () => {
    expect(typeSlug("snippet")).toBe("snippets");
    expect(typeSlug("image")).toBe("images");
  });

  it("matches a slug case-insensitively", () => {
    expect(typeNameFromSlug("SNIPPETS")).toBe("snippet");
    expect(typeNameFromSlug("Commands")).toBe("command");
  });

  it("returns null for an unknown slug so the caller can 404", () => {
    // Never fall through to an unfiltered list: /items/bogus must not list
    // everything.
    expect(typeNameFromSlug("bogus")).toBeNull();
    expect(typeNameFromSlug("")).toBeNull();
  });

  it("does not treat the singular type name as a valid slug", () => {
    expect(typeNameFromSlug("snippet")).toBeNull();
  });
});
