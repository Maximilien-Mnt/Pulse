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
} from '../lib/mediaPipeline';
import type { PickedImage } from '../lib/mediaPipeline';

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

