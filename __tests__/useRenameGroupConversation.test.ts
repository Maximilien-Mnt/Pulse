// ---------------------------------------------------------------------------
// Tests for useRenameGroupConversation
//
// Guards the "rename a club chat" flow: the open conversation header
// (['conv-row', conversationId]) must reflect the new name immediately,
// without waiting for a page refresh.
// ---------------------------------------------------------------------------

import { renderHook } from '@testing-library/react-native';
import { useRenameGroupConversation } from '../hooks/useConversationActions';

// ── supabase mock ──────────────────────────────────────────────────────────
// Mirrors the real chain used by the hook:
//   supabase.from("conversations").update({...}).eq("id", id)  ->  { error }
// (jest requires mock-factory variables to be "mock"-prefixed.)
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ── react-query mock ───────────────────────────────────────────────────────
const mockQueryClient = {
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
  cancelQueries: jest.fn().mockResolvedValue(undefined),
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
  // Expose the mutation config so the test can drive its lifecycle callbacks.
  useMutation: (config: Record<string, unknown>) => config,
}));

type RenameMutationConfig = {
  mutationFn: (vars: { conversationId: string; groupName: string }) => Promise<{
    conversationId: string;
    groupName: string;
  }>;
  onMutate: (vars: { conversationId: string; groupName: string }) => Promise<any>;
  onError: (error: unknown, vars: any, context: any) => void;
  onSuccess: (data: { conversationId: string; groupName: string }) => void;
  onSettled: (data: unknown, error: unknown, vars: any) => void;
};

function getMutation(): RenameMutationConfig {
  return renderHook(() => useRenameGroupConversation()).result.current as unknown as RenameMutationConfig;
}

const HEADER_KEY = ['conv-row', 'conv-1'];
const EXISTING_HEADER = {
  is_group: true,
  group_name: 'Old Club Chat',
  group_photo_url: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
});

describe('useRenameGroupConversation', () => {
  it('trims the name and returns it with the conversation id', async () => {
    const mutation = getMutation();

    const result = await mutation.mutationFn({
      conversationId: 'conv-1',
      groupName: '  New Club Name  ',
    });

    expect(result).toEqual({ conversationId: 'conv-1', groupName: 'New Club Name' });
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockUpdate).toHaveBeenCalledWith({ group_name: 'New Club Name' });
  });

  it('rejects an empty (whitespace-only) name before hitting the network', async () => {
    const mutation = getMutation();

    await expect(
      mutation.mutationFn({ conversationId: 'conv-1', groupName: '   ' })
    ).rejects.toThrow();

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('optimistically writes the new name into the open conversation header cache', async () => {
    mockQueryClient.getQueryData.mockReturnValue(EXISTING_HEADER);
    const mutation = getMutation();

    const context = await mutation.onMutate({ conversationId: 'conv-1', groupName: 'New Name' });

    expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: HEADER_KEY });
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(HEADER_KEY, {
      ...EXISTING_HEADER,
      group_name: 'New Name',
    });
    // The snapshot is handed to onError so a failed rename can roll back.
    expect(context.previous).toBe(EXISTING_HEADER);
  });

  it('does not invent a header cache entry when none is loaded yet', async () => {
    mockQueryClient.getQueryData.mockReturnValue(undefined);
    const mutation = getMutation();

    await mutation.onMutate({ conversationId: 'conv-1', groupName: 'New Name' });

    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
  });

  it('restores the previous header name when the rename fails', async () => {
    mockQueryClient.getQueryData.mockReturnValue(EXISTING_HEADER);
    const mutation = getMutation();

    const context = await mutation.onMutate({ conversationId: 'conv-1', groupName: 'New Name' });
    mockQueryClient.setQueryData.mockClear();

    mutation.onError(new Error('rls denied'), { conversationId: 'conv-1', groupName: 'New Name' }, context);

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(HEADER_KEY, EXISTING_HEADER);
  });

  it('patches the header cache on success (no refetch needed for the title)', () => {
    const mutation = getMutation();

    mutation.onSuccess({ conversationId: 'conv-1', groupName: 'New Name' });

    // The header cache is patched synchronously so the title changes on the spot.
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(HEADER_KEY, expect.any(Function));

    const updater = mockQueryClient.setQueryData.mock.calls[0][1] as (old: any) => any;
    expect(updater(EXISTING_HEADER)).toEqual({ ...EXISTING_HEADER, group_name: 'New Name' });
  });

  it('invalidates the conversation list and the header once the mutation settles', () => {
    const mutation = getMutation();

    mutation.onSettled(null, null, { conversationId: 'conv-1', groupName: 'New Name' });

    // The conversations tab list is refreshed…
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['conversations'] });
    // …and the header is reconciled with the server value.
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: HEADER_KEY });
  });
});
