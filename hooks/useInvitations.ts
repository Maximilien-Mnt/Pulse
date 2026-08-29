import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useTranslation } from '@/hooks/useTranslation';

const db = supabase as unknown as {
  from: (table: string) => any;
};

type InviteType = 'club' | 'event';

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 24; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function useCreateInvitation() {
  const userId = useAuthStore((s) => s.userId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      type,
      targetId,
      maxUses = 10,
      expiresInDays = 7,
    }: {
      type: InviteType;
      targetId: string;
      maxUses?: number;
      expiresInDays?: number;
    }) => {
      if (!userId) throw new Error(t('auth.notAuthenticated'));
      const token = generateToken();
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await db.from('invitation_tokens').insert({
        token,
        type,
        target_id: targetId,
        created_by: userId,
        expires_at: expiresAt,
        max_uses: maxUses,
      });
      if (error) throw error;

      const link = Linking.createURL(`join/${type}/${targetId}`, {
        queryParams: { token },
      });
      return { token, link };
    },
  });
}

export function useRedeemInvitation() {
  const userId = useAuthStore((s) => s.userId);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      type,
      targetId,
      token,
    }: {
      type: InviteType;
      targetId: string;
      token: string;
    }) => {
      if (!userId) throw new Error(t('auth.notAuthenticated'));

      const { data: invite, error: inviteErr } = await db
        .from('invitation_tokens')
        .select('*')
        .eq('token', token)
        .eq('type', type)
        .eq('target_id', targetId)
        .maybeSingle();

      if (inviteErr) throw inviteErr;
      if (!invite) throw new Error(t('invitations.invalidLink'));
      if (new Date(invite.expires_at) < new Date()) throw new Error(t('auth.linkExpired'));
      if (invite.uses_count >= invite.max_uses) throw new Error(t('invitations.maxUsesReached'));

      if (type === 'club') {
        const { error } = await supabase
          .from('club_members')
          .upsert({ club_id: targetId, user_id: userId }, { onConflict: 'club_id,user_id' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_participants')
          .upsert({ event_id: targetId, user_id: userId }, { onConflict: 'event_id,user_id' });
        if (error) throw error;
      }

      await db
        .from('invitation_tokens')
        .update({ uses_count: invite.uses_count + 1 })
        .eq('id', invite.id);

      return { type, targetId };
    },
  });
}
