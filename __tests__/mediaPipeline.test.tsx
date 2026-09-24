/**
 * Unit tests for the media pipeline normalization helper.
 *
 * These tests validate the core `normalizeImageForRole` contract:
 *  - Invalid file types are rejected with a typed error.
 *  - Oversized files are rejected before any resize attempt.
 *  - Cancellation from the picker is surfaced as a non-error result.
 *  - A valid, under-limit image is normalized (potentially resized) and
 *    the returned metadata reflects the policy for the given role.
 *
 * `expo-image-manipulator` and `expo-file-system` are mocked so the tests
 * run in pure Node without native modules.
 */
import { manipulateAsync } from 'expo-image-manipulator';
import { getInfoAsync } from 'expo-file-system/legacy';
import {
  normalizeImageForRole,
  MediaNormalizationError,
  resolveMimeType,
  resolveMimeTypeAsync,
  sniffBlobMimeType,
  toPickedImage,
} from '../lib/mediaPipeline';
import type { PickedImage } from '../lib/mediaPipeline';
import { mediaErrorMessage } from '../lib/reporting/userMessage';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  manipulateAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

const mockedManipulateAsync = manipulateAsync as jest.Mock;
const mockedGetInfo = getInfoAsync as jest.Mock;

describe('normalizeImageForRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an invalid file type', async () => {
    const picked: PickedImage = { uri: 'file:///tmp/anim.gif', fileSize: 1024 };

    await expect(normalizeImageForRole(picked, 'avatar')).rejects.toMatchObject({
      code: 'invalidType',
      key: 'media.error.invalidType',
    });
    expect(mockedManipulateAsync).not.toHaveBeenCalled();
  });

  it('rejects an oversized file', async () => {
    // avatar max is 4 MB — make the file 5 MB
    const fiveMB = 5 * 1024 * 1024;
    const picked: PickedImage = { uri: 'file:///tmp/huge.jpg', fileSize: fiveMB };

    await expect(normalizeImageForRole(picked, 'avatar')).rejects.toMatchObject({
      code: 'oversized',
      key: 'media.error.oversized',
    });
    // Ensure we rejected before calling manipulate (bytes checked first)
    expect(mockedManipulateAsync).not.toHaveBeenCalled();
  });

  it('resolves to { canceled: true } when the picker result is canceled', async () => {
    const picked: PickedImage = { uri: '', canceled: true };
    const result = await normalizeImageForRole(picked, 'avatar');
    expect(result).toEqual({ canceled: true });
  });

  it('successfully normalizes a valid under-limit image', async () => {
    const picked: PickedImage = {
      uri: 'file:///tmp/photo.jpg',
      fileSize: 2 * 1024 * 1024, // 2 MB
      width: 4000,
      height: 3000,
    };
    mockedGetInfo.mockResolvedValue({
      exists: true,
      uri: 'file:///tmp/photo.jpg',
      size: 2 * 1024 * 1024,
    } as any);
    mockedManipulateAsync.mockResolvedValue({
      uri: 'file:///tmp/photo_normalized.jpg',
      width: 512,
      height: 384,
    });

    // Success path always returns NormalizedImage; widen for assertion ergonomics.
    const result: any = await normalizeImageForRole(picked, 'avatar');

    expect(result.uri).toBe('file:///tmp/photo_normalized.jpg');
    expect(result.width).toBe(512);
    expect(result.height).toBe(384);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.wasResized).toBe(true);
    // manipulateAsync called with resize config (maxEdge for avatar = 512)
    expect(mockedManipulateAsync).toHaveBeenCalledWith(
      'file:///tmp/photo.jpg',
      expect.arrayContaining([
        expect.objectContaining({ resize: expect.any(Object) }),
      ]),
      expect.objectContaining({
        compress: 0.82,
        format: 'jpeg',
      }),
    );
  });

  it('throws MediaNormalizationError with correct shape', () => {
    const err = new MediaNormalizationError('oversized', 'media.error.oversized', {
      mb: 4,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MediaNormalizationError);
    expect(err.code).toBe('oversized');
    expect(err.translationKey).toBe('media.error.oversized');
    expect(err.key).toBe('media.error.oversized');
    expect(err.translationParams).toEqual({ mb: 4 });
  });
});

describe('MIME resolution', () => {
  it('prefers the picker mimeType and normalizes its casing', () => {
    expect(resolveMimeType('blob:http://localhost:8081/abc', 'IMAGE/JPEG')).toBe('image/jpeg');
    expect(resolveMimeType('file:///tmp/photo.jpg', 'image/png')).toBe('image/png');
  });

  it('ignores a picker mimeType that is not an allowed image type', () => {
    expect(resolveMimeType('blob:http://localhost:8081/abc', 'text/plain')).toBeNull();
    expect(resolveMimeType('file:///tmp/anim.gif', 'image/gif')).toBeNull();
  });

  it('reads the mime type declared by a data: URI', () => {
    expect(resolveMimeType('data:image/png;base64,iVBORw0KGgo=')).toBe('image/png');
    expect(resolveMimeType('data:image/gif;base64,R0lGODlh')).toBeNull();
  });

  it('falls back to the file extension', () => {
    expect(resolveMimeType('file:///tmp/PIC.WEBP')).toBe('image/webp');
    // Extension-less blob URL: nothing to read synchronously.
    expect(resolveMimeType('blob:http://localhost:8081/abc')).toBeNull();
  });
});

describe('web blob URL type resolution', () => {
  const realFetch = (globalThis as { fetch?: unknown }).fetch;

  afterEach(() => {
    (globalThis as { fetch?: unknown }).fetch = realFetch;
  });

  it('sniffs the real content type of an extension-less blob URL', async () => {
    const doFetch = jest.fn().mockResolvedValue({ blob: async () => ({ type: 'image/jpeg' }) });

    await expect(
      sniffBlobMimeType('blob:http://localhost:8081/abc', doFetch as unknown as typeof fetch),
    ).resolves.toBe('image/jpeg');
  });

  it('rejects a blob whose real type is not allow-listed', async () => {
    const doFetch = jest.fn().mockResolvedValue({ blob: async () => ({ type: 'image/gif' }) });

    await expect(
      sniffBlobMimeType('blob:http://localhost:8081/abc', doFetch as unknown as typeof fetch),
    ).resolves.toBeNull();
  });

  it('returns null when the blob type cannot be read', async () => {
    const doFetch = jest.fn().mockRejectedValue(new Error('no blob'));

    await expect(
      sniffBlobMimeType('blob:http://localhost:8081/abc', doFetch as unknown as typeof fetch),
    ).resolves.toBeNull();
  });

  it('only reaches for the blob when the sync paths fail', async () => {
    const doFetch = jest.fn().mockResolvedValue({ blob: async () => ({ type: 'image/png' }) });
    const fetchImpl = doFetch as unknown as typeof fetch;

    // Picker metadata wins — no fetch.
    await expect(
      resolveMimeTypeAsync('blob:http://localhost:8081/abc', 'image/jpeg', { doFetch: fetchImpl }),
    ).resolves.toBe('image/jpeg');
    expect(doFetch).not.toHaveBeenCalled();

    // Extension-less blob URL falls through to the sniff.
    await expect(
      resolveMimeTypeAsync('blob:http://localhost:8081/abc', undefined, { doFetch: fetchImpl }),
    ).resolves.toBe('image/png');
    expect(doFetch).toHaveBeenCalledTimes(1);

    // Local files never trigger a fetch.
    await expect(
      resolveMimeTypeAsync('file:///tmp/photo.jpg', undefined, { doFetch: fetchImpl }),
    ).resolves.toBe('image/jpeg');
    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it('normalizes a picked web blob URL that has no file extension', async () => {
    // Regression test for the "invalidType" toast on event/club publishing: a web
    // pick gives `blob:http://host/<uuid>`, so guessing the type from the file
    // extension rejected every image.
    (globalThis as { fetch?: unknown }).fetch = jest
      .fn()
      .mockResolvedValue({ blob: async () => ({ type: 'image/jpeg' }) });

    const result: any = await normalizeImageForRole(
      { uri: 'blob:http://localhost:8081/abc', fileSize: 1024, width: 100, height: 80 },
      'avatar',
    );

    expect(result.mimeType).toBe('image/jpeg');
    expect(result.contentType).toBe('image/jpeg');
    expect(result.uri).toBe('blob:http://localhost:8081/abc');
  });

  it('still rejects an extension-less blob holding an unsupported image', async () => {
    (globalThis as { fetch?: unknown }).fetch = jest
      .fn()
      .mockResolvedValue({ blob: async () => ({ type: 'image/gif' }) });

    await expect(
      normalizeImageForRole({ uri: 'blob:http://localhost:8081/abc', fileSize: 1024 }, 'avatar'),
    ).rejects.toMatchObject({ code: 'invalidType', key: 'media.error.invalidType' });
  });
});

describe('toPickedImage', () => {
  it('keeps the picker metadata', () => {
    expect(
      toPickedImage({
        uri: 'blob:http://localhost:8081/abc',
        mimeType: 'image/jpeg',
        width: 4000,
        height: 3000,
        fileSize: 900,
      }),
    ).toEqual({
      uri: 'blob:http://localhost:8081/abc',
      mimeType: 'image/jpeg',
      width: 4000,
      height: 3000,
      fileSize: 900,
    });
  });

  it('defaults missing picker metadata to null', () => {
    expect(toPickedImage({ uri: 'file:///tmp/a.jpg' })).toEqual({
      uri: 'file:///tmp/a.jpg',
      mimeType: null,
      width: null,
      height: null,
      fileSize: null,
    });
  });
});

describe('mediaErrorMessage', () => {
  it('resolves the translation key carried by a real MediaNormalizationError', () => {
    const err = new MediaNormalizationError('invalidType', 'media.error.invalidType');

    expect(err.message).toBe('invalidType');
    expect(mediaErrorMessage(err)).toBe("Format d'image non supporté");
  });

  it('interpolates the role byte limit for an oversized image', () => {
    const err = new MediaNormalizationError('oversized', 'media.error.oversized', { mb: 8 });

    expect(mediaErrorMessage(err)).toBe('Image trop volumineuse (max 8 Mo)');
  });

  it('returns null for non-media errors', () => {
    expect(mediaErrorMessage(new Error('invalidType'))).toBeNull();
    expect(mediaErrorMessage(null)).toBeNull();
  });
});

