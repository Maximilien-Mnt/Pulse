/**
 * Regression tests for the event media upload helpers.
 *
 * A picked asset must reach the shared media pipeline *whole*. Forwarding only
 * its `uri` made the pipeline guess the MIME type from the file extension, which
 * fails on web — expo-image-picker returns `blob:http://host/<uuid>` there, with
 * no extension — and surfaced as a raw `invalidType` toast when publishing an
 * event. These tests pin the metadata forwarding so that cannot regress.
 */
import { uploadEventCover, uploadEventPhoto, deleteEventMedia } from "@/lib/eventMedia";
import { uploadImageToStorage, removeFromStorageByUrl } from "@/lib/imageUpload";

jest.mock("@/lib/imageUpload", () => ({
  uploadImageToStorage: jest.fn(),
  removeFromStorageByUrl: jest.fn(),
}));

const mockedUpload = uploadImageToStorage as jest.Mock;
const mockedRemoveByUrl = removeFromStorageByUrl as jest.Mock;

const PICKED = {
  uri: "blob:http://localhost:8081/6f9c-uuid",
  mimeType: "image/jpeg",
  width: 4000,
  height: 3000,
  fileSize: 3 * 1024 * 1024,
};

describe("event media uploads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpload.mockResolvedValue(
      "https://cdn.test/storage/v1/object/public/events/user-1/cover.jpg",
    );
  });

  it("forwards the picker metadata for the cover", async () => {
    await uploadEventCover("user-1", PICKED);

    expect(mockedUpload).toHaveBeenCalledTimes(1);
    expect(mockedUpload).toHaveBeenCalledWith({
      bucket: "events",
      path: expect.stringMatching(/^user-1\/cover-\d+\.jpg$/),
      uri: PICKED.uri,
      upsert: true,
      role: "cover",
      pickerMeta: {
        mimeType: "image/jpeg",
        width: 4000,
        height: 3000,
        fileSize: 3 * 1024 * 1024,
      },
    });
  });

  it("forwards the picker metadata for a photo, with its index in the path", async () => {
    await uploadEventPhoto("user-1", PICKED, 2);

    expect(mockedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "events",
        path: expect.stringMatching(/^user-1\/photo-\d+-2\.jpg$/),
        uri: PICKED.uri,
        upsert: true,
        role: "gallery",
        pickerMeta: {
          mimeType: "image/jpeg",
          width: 4000,
          height: 3000,
          fileSize: 3 * 1024 * 1024,
        },
      }),
    );
  });

  it("keeps working when the picker supplies no metadata (native file:// picks)", async () => {
    await uploadEventPhoto("user-1", { uri: "file:///tmp/photo.jpg" }, 0);

    // Nothing is invented: a field the picker did not report stays undefined, and
    // the pipeline then resolves the type from the file:// extension.
    expect(mockedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "file:///tmp/photo.jpg",
        role: "gallery",
        pickerMeta: {
          mimeType: undefined,
          width: undefined,
          height: undefined,
          fileSize: undefined,
        },
      }),
    );
  });

  it("deletes a replaced event image through the events bucket", async () => {
    mockedRemoveByUrl.mockResolvedValue(true);
    const publicUrl = "https://cdn.test/storage/v1/object/public/events/user-1/photo-1-0.jpg";

    await deleteEventMedia(publicUrl);

    expect(mockedRemoveByUrl).toHaveBeenCalledWith(publicUrl, "events");
  });

  it("never throws when cleanup fails", async () => {
    mockedRemoveByUrl.mockRejectedValue(new Error("network"));

    await expect(
      deleteEventMedia("https://cdn.test/storage/v1/object/public/events/user-1/photo-1-0.jpg"),
    ).resolves.toBeUndefined();
  });
});
