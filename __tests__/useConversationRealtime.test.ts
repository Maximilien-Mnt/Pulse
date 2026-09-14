// ---------------------------------------------------------------------------
// Tests for useConversationRealtime hooks
// ---------------------------------------------------------------------------

import { renderHook, waitFor } from '@testing-library/react-native';
import { useConversationRealtime, mergeNewMessage, reconcileOptimisticMessage } from '../hooks/useConversationRealtime';

// Mock supabase - simple array to store callbacks in order
const storedCallbacks: Array<(...args: any[]) => void> = [];

const mockChannel: any = {
  on: jest.fn((eventType: string, options: any, callback: (...args: any[]) => void) => {
    if (callback) storedCallbacks.push(callback);
    return mockChannel;
  }),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}));

const mockQueryClient: any = {
  getQueryData: jest.fn(() => null),
  setQueryData: jest.fn(),
  cancelQueries: jest.fn(),
  invalidateQueries: jest.fn(),
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}));

describe('useConversationRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel.on.mockClear();
    mockChannel.subscribe.mockClear();
    mockChannel.unsubscribe.mockClear();
    storedCallbacks.length = 0;
  });

  it('creates a stable channel with conversation ID', () => {
    const handlers = {
      onNewMessage: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
    };

    const { unmount } = renderHook(() =>
      useConversationRealtime({ conversationId: 'conv-123', handlers })
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
    unmount();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('cleans up channel on unmount', async () => {
    const handlers = { onNewMessage: jest.fn() };

    const { unmount } = renderHook(() =>
      useConversationRealtime({ conversationId: 'conv-456', handlers })
    );

    unmount();

    await waitFor(() => {
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  it('does not subscribe when disabled', () => {
    const handlers = { onNewMessage: jest.fn() };

    renderHook(() =>
      useConversationRealtime({ conversationId: 'conv-789', handlers, enabled: false })
    );

    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it('handles INSERT events and deduplicates', async () => {
    const handlers = { onNewMessage: jest.fn() };

    renderHook(() =>
      useConversationRealtime({ conversationId: 'conv-dedup', handlers })
    );

    // First callback is for INSERT
    const insertCallback = storedCallbacks[0];
    expect(insertCallback).toBeDefined();

    const mockPayload = {
      new: { id: 'msg-1', body: 'Test message', created_at: new Date().toISOString() },
    };

    if (insertCallback) {
      await insertCallback(mockPayload);
      expect(handlers.onNewMessage).toHaveBeenCalledTimes(1);
      expect(handlers.onNewMessage).toHaveBeenCalledWith(mockPayload.new);

      // Second call with same ID should be deduplicated
      await insertCallback(mockPayload);
      expect(handlers.onNewMessage).toHaveBeenCalledTimes(1);
    }
  });

  it('skips messages already in cache', async () => {
    mockQueryClient.getQueryData.mockReturnValue({
      messages: [{ id: 'existing-msg', body: 'Existing' }],
    } as any);

    const handlers = { onNewMessage: jest.fn() };

    renderHook(() =>
      useConversationRealtime({ conversationId: 'conv-cache', handlers })
    );

    const insertCallback = storedCallbacks[0];
    expect(insertCallback).toBeDefined();

    if (insertCallback) {
      await insertCallback({
        new: { id: 'existing-msg', body: 'Duplicate' },
      });

      expect(handlers.onNewMessage).not.toHaveBeenCalled();
    }
  });
});

describe('mergeNewMessage', () => {
  it('returns same array if message already exists', () => {
    const messages = [{ id: '1', body: 'Existing' }];
    const newMessage = { id: '1', body: 'Duplicate' };

    expect(mergeNewMessage(messages, newMessage)).toBe(messages);
  });

  it('inserts message in chronological order', () => {
    const messages = [
      { id: '1', created_at: '2024-01-01T00:00:00Z' },
      { id: '3', created_at: '2024-01-03T00:00:00Z' },
    ];
    const newMessage = { id: '2', created_at: '2024-01-02T00:00:00Z' };

    const result = mergeNewMessage(messages, newMessage);
    expect(result).toEqual([
      { id: '1', created_at: '2024-01-01T00:00:00Z' },
      { id: '2', created_at: '2024-01-02T00:00:00Z' },
      { id: '3', created_at: '2024-01-03T00:00:00Z' },
    ]);
  });

  it('appends if new message is most recent', () => {
    const messages = [{ id: '1', created_at: '2024-01-01T00:00:00Z' }];
    const newMessage = { id: '2', created_at: '2024-01-02T00:00:00Z' };

    const result = mergeNewMessage(messages, newMessage);
    expect(result).toEqual([
      { id: '1', created_at: '2024-01-01T00:00:00Z' },
      { id: '2', created_at: '2024-01-02T00:00:00Z' },
    ]);
  });
});

describe('reconcileOptimisticMessage', () => {
  it('replaces optimistic message with server message', () => {
    const messages = [
      { id: 'optimistic-1', body: 'Optimistic', _optimistic: true },
      { id: 'real-1', body: 'Real' },
    ];
    const serverMessage = { id: 'optimistic-1', body: 'Confirmed', created_at: '2024-01-01T00:00:00Z' };

    const result = reconcileOptimisticMessage(messages, serverMessage, 'optimistic-1');

    expect(result).toEqual([
      { id: 'optimistic-1', body: 'Confirmed', created_at: '2024-01-01T00:00:00Z', _optimistic: false },
      { id: 'real-1', body: 'Real' },
    ]);
  });

  it('does not modify other messages', () => {
    const messages = [
      { id: '1', body: 'Message 1' },
      { id: '2', body: 'Message 2' },
    ];
    const serverMessage = { id: '3', body: 'Server' };

    const result = reconcileOptimisticMessage(messages, serverMessage, '999');

    expect(result).toEqual(messages);
  });
});
