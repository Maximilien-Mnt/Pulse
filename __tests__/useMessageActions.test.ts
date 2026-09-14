// ---------------------------------------------------------------------------
// Tests for useMessageActions hook - Edit/Delete permission tests
// ---------------------------------------------------------------------------

import { renderHook } from '@testing-library/react-native';
import { useMessageActions } from '../hooks/useMessageActions';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(() => null),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ error: null }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
    })),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(() => 'user-123'),
}));

describe('useMessageActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides canEditMessage function', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    expect(typeof result.current.canEditMessage).toBe('function');
  });

  it('provides canDeleteMessage function', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    expect(typeof result.current.canDeleteMessage).toBe('function');
  });

  it('allows editing recent messages from sender', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    const recentMessage = {
      id: 'msg-1',
      sender_id: 'user-123',
      created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
      is_deleted: false,
    };

    expect(result.current.canEditMessage(recentMessage)).toBe(true);
    expect(result.current.canDeleteMessage(recentMessage)).toBe(true);
  });

  it('prevents editing old messages outside edit window', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    const oldMessage = {
      id: 'msg-2',
      sender_id: 'user-123',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      is_deleted: false,
    };

    expect(result.current.canEditMessage(oldMessage)).toBe(false);
    expect(result.current.canDeleteMessage(oldMessage)).toBe(false);
  });

  it('prevents editing messages from other users', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    const otherUserMessage = {
      id: 'msg-3',
      sender_id: 'user-456', // Different user
      created_at: new Date().toISOString(),
      is_deleted: false,
    };

    expect(result.current.canEditMessage(otherUserMessage)).toBe(false);
    expect(result.current.canDeleteMessage(otherUserMessage)).toBe(false);
  });

  it('prevents editing deleted messages', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    const deletedMessage = {
      id: 'msg-4',
      sender_id: 'user-123',
      created_at: new Date().toISOString(),
      is_deleted: true,
    };

    expect(result.current.canEditMessage(deletedMessage)).toBe(false);
    expect(result.current.canDeleteMessage(deletedMessage)).toBe(false);
  });

  it('prevents actions when user is not authenticated', () => {
    (require('@/stores/authStore').useAuthStore as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    const anyMessage = {
      id: 'msg-5',
      sender_id: 'user-123',
      created_at: new Date().toISOString(),
      is_deleted: false,
    };

    expect(result.current.canEditMessage(anyMessage)).toBe(false);
    expect(result.current.canDeleteMessage(anyMessage)).toBe(false);
  });

  it('provides isPending state', () => {
    const { result } = renderHook(() =>
      useMessageActions('conv-123')
    );

    expect(typeof result.current.isPending).toBe('boolean');
  });
});
