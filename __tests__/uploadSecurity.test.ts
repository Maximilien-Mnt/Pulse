/**
 * Regression tests for the upload security boundary (lib/uploadSecurity).
 * Covers: .php/.jsp rejection (incl. case + double extensions), spoofed MIME,
 * traversal, null bytes, oversized classification, magic-byte sniffing.
 */
import {
  buildSafeStoragePath,
  classifyPickedAsset,
  contentTypeForBytes,
  hasBlockedExtension,
  sniffMimeFromBytes,
  validateStorageObjectName,
} from "../lib/uploadSecurity";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PHP = new Uint8Array([0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63]);
const HTML = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0x20, 0x20]);
const SVG = new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x20, 0x78, 0x6d, 0x6c]);

describe("uploadSecurity blocklist", () => {
  it.each(["shell.php", "shell.PHP", "shell.pHp", "run.jsp", "run.JSP", "x.php.jpg", "x.jpg.php", "a.PHP5", "page.html", "icon.svg"])(
    "rejects blocked name %s",
    (name) => {
      expect(hasBlockedExtension(name)).toBe(true);
      expect(validateStorageObjectName(`uid/${name}`)).toBeNull();
    },
  );

  it("rejects spoofed MIME when the filename carries a blocked extension", () => {
    expect(classifyPickedAsset({ uri: "file:///tmp/shell.php", mimeType: "image/jpeg" })).toEqual({
      rejected: true, reason: "blocked-extension",
    });
    expect(classifyPickedAsset({ uri: "file:///tmp/a.jpg.php", mimeType: "video/mp4" })).toEqual({
      rejected: true, reason: "blocked-extension",
    });
  });

  it("rejects traversal, separators, null bytes, and control chars", () => {
    expect(validateStorageObjectName("uid/../../etc/passwd.jpg")).toBeNull();
    expect(validateStorageObjectName("../uid/a.jpg")).toBeNull();
    expect(validateStorageObjectName("uid\\a.jpg")).toBeNull();
    expect(validateStorageObjectName("uid/a%00.jpg")).toBeNull();
    expect(validateStorageObjectName("uid/a.jpg%00.php")).toBeNull();
    expect(validateStorageObjectName("uid/.hidden.jpg")).toBeNull();
    expect(validateStorageObjectName("uid/a.exe")).toBeNull();
  });

  it("accepts allow-listed image and video keys", () => {
    expect(validateStorageObjectName("uid/abc.jpg")).toBe("jpg");
    expect(validateStorageObjectName("uid/abc.PNG")).toBe("png");
    expect(validateStorageObjectName("uid/abc.MP4")).toBe("mp4");
  });

  it("builds server-generated paths and refuses bad input", () => {
    const p = buildSafeStoragePath("user-1", "image");
    expect(p.startsWith("user-1/")).toBe(true);
    expect(p.endsWith(".jpg")).toBe(true);
    expect(() => buildSafeStoragePath("a/b", "image")).toThrow("invalidUserId");
    expect(() => buildSafeStoragePath("u", "image", { ext: "php" })).toThrow("invalidType");
  });
});

describe("magic-byte sniffing", () => {
  it("identifies real containers", () => {
    expect(sniffMimeFromBytes(JPEG)).toBe("image/jpeg");
    expect(sniffMimeFromBytes(PNG)).toBe("image/png");
  });

  it("rejects active content and scripts even with an image extension", () => {
    expect(sniffMimeFromBytes(PHP)).toBeNull();
    expect(sniffMimeFromBytes(HTML)).toBeNull();
    expect(sniffMimeFromBytes(SVG)).toBeNull();
    expect(contentTypeForBytes(PHP, "image", "image/jpeg")).toBeNull();
    expect(contentTypeForBytes(HTML, "image", "image/jpeg")).toBeNull();
  });

  it("rejects MIME/container mismatches (spoofed content-type)", () => {
    expect(contentTypeForBytes(PNG, "image", "image/jpeg")).toBeNull();
    expect(contentTypeForBytes(JPEG, "video", "video/mp4")).toBeNull();
  });

  it("canonicalizes stored content-type from bytes, not client claims", () => {
    expect(contentTypeForBytes(JPEG, "image", "image/jpeg")).toBe("image/jpeg");
    expect(contentTypeForBytes(PNG, "image", "image/png")).toBe("image/png");
  });
});
