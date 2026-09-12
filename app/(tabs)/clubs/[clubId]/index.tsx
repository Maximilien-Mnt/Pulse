import { useState } from 'react';
import { ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/shared/SafeScreen';
import { usePostHog } from 'posthog-react-native';
import { useClubDetail } from '@/hooks/useClubDetail';
import { LeaveClubSheet } from '@/components/clubs/LeaveClubSheet';
import { DeleteClubSheet } from '@/components/profile/DeleteClubSheet';
import { useTranslation } from '@/hooks/useTranslation';
import { ClubActionHeader } from '@/components/clubs/public/ClubActionHeader';
import { ClubHeroBar } from '@/components/clubs/public/ClubHeroBar';
import { ClubIdentity } from '@/components/clubs/public/ClubIdentity';
import { ClubStatTiles } from '@/components/clubs/public/ClubStatTiles';
import { ClubDescriptionCard } from '@/components/clubs/public/ClubDescriptionCard';
import { ClubInfoGrid } from '@/components/clubs/public/ClubInfoGrid';
import { ClubEventsSection } from '@/components/clubs/public/ClubEventsSection';
import { ClubContactLinks } from '@/components/clubs/public/ClubContactLinks';
import { ClubPhotoGallery } from '@/components/clubs/public/ClubPhotoGallery';
import { ClubMembersPreview } from '@/components/clubs/public/ClubMembersPreview';
import { ClubLoadingSkeleton } from '@/components/clubs/public/ClubLoadingSkeleton';
import { ClubNotFoundState } from '@/components/clubs/public/ClubNotFoundState';
import type { LinkRowData } from '@/components/clubs/public/ClubSharedUI';
import type { StatData } from '@/components/clubs/public/ClubStatTiles';
import type { LevelRow } from '@/components/clubs/public/ClubInfoGrid';

export default function ClubDetailScreen() {
  const params = useLocalSearchParams<{ clubId: string; public?: string }>();
  const { clubId } = params;
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const { width: winWidth } = useWindowDimensions();

  const {
    club,
    clubLoading,
    creator,
    members,
    upcomingEvents,
    pastEvents,
    eventsLoading,
    isCreator,
    isMember,
    joinStatus,
    isFavorited,
    favCount,
    isFavPending,
    toggleFavorite,
    joinMut,
  } = useClubDetail(clubId ?? null);

  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  // ── Responsive sizing ─────────────────────────────────────────────────
  const contentMax = winWidth > 900 ? 760 : '100%';
  const isWide = winWidth >= 700;
  const isMd = winWidth >= 500;
  const coverH = winWidth > 500 ? 240 : 180;
  const galleryW = winWidth > 500 ? winWidth - 32 : winWidth - 16;

  // ── Derived display values ────────────────────────────────────────────
  const cover = club?.cover_url ?? club?.hero_urls?.[0];
  const shortDesc = club?.short_description ?? null;
  const sports = club?.sports ?? [];

  const stats: StatData[] = [
    { icon: 'Users', label: 'Membres', value: String(club.member_count ?? members.length), onPress: 'members' },
    { icon: 'Heart', label: 'Favoris', value: String(favCount ?? 0) },
    { icon: 'Calendar', label: 'Événements', value: String(upcomingEvents.length + pastEvents.length) },
  ];

  const levelRows: LevelRow[] = [
    ...(club.required_level ? [{ sport: club.sports?.[0] ?? 'sport', level: club.required_level }] : []),
  ];

  const linkRows: LinkRowData[] = [
    club.registration_url && { icon: 'UserPlus', label: "S'inscrire", value: club.registration_url, url: club.registration_url },
    club.website_url && { icon: 'Globe', label: 'Site web', value: club.website_url, url: club.website_url },
    club.contact_email && { icon: 'Mail', label: 'Email', value: club.contact_email, url: `mailto:${club.contact_email}` },
    club.phone_number && { icon: 'Smartphone', label: 'Téléphone', value: club.phone_number, url: `tel:${club.phone_number}` },
    club.instagram_url && { icon: 'Instagram', label: 'Instagram', value: club.instagram_url, url: club.instagram_url },
    club.facebook_url && { icon: 'Facebook', label: 'Facebook', value: club.facebook_url, url: club.facebook_url },
    club.tiktok_url && { icon: 'Music', label: 'TikTok', value: club.tiktok_url, url: club.tiktok_url },
    club.extra_link && { icon: 'Share2', label: 'Autre lien', value: club.extra_link, url: club.extra_link },
  ].filter((r): r is LinkRowData => !!r);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!club) return;
    try {
      await Share.share({
        message: `Découvre ${club.name} sur Pulse`,
        url: `https://pulse.app/clubs/${club.id}`,
      });
      posthog.capture('club_shared', { club_id: club.id });
    } catch {
      // User cancelled share — no-op
    }
  };

  if (clubLoading) return <ClubLoadingSkeleton />;
  if (!club) return <ClubNotFoundState onBack={() => router.back()} />;

  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]' edges={['top']}>
      {/* ---- Header: back arrow + "Club" label (+ settings for the creator) ---- */}
      <ClubActionHeader clubId={clubId ?? ''} isCreator={isCreator} />

      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
      >
        {/* ---- Hero cover (like & share straddle its bottom-right edge) ---- */}
        <ClubHeroBar
          club={club}
          cover={cover}
          coverH={coverH}
          isFavorited={isFavorited}
          favCount={favCount ?? 0}
          isFavPending={isFavPending}
          onToggle={toggleFavorite}
          onShare={handleShare}
          isCreator={isCreator}
          joinStatus={joinStatus}
          joinMut={joinMut}
          onCreatorAction={() => setShowDeleteSheet(true)}
        />

        {/* ---- Identity: logo, title, short description, badges ---- */}
        <ClubIdentity club={club} shortDesc={shortDesc} sports={sports} />

        {/* ---- Stat tiles: responsive, wrap to any screen width ---- */}
        <ClubStatTiles
          stats={stats}
          isWide={isWide}
          isMd={isMd}
          onMembersPress={() => router.push(`/(tabs)/clubs/${clubId}/members`)}
        />

        {/* ---- Long description + founder ---- */}
        <ClubDescriptionCard club={club} creator={creator} />

        {/* ---- Info sections: 1 column on phones, 2 columns on wide screens ---- */}
        <ClubInfoGrid club={club} isWide={isWide} levelRows={levelRows} />

        {/* ---- Events: always visible, Upcoming / Past tabs, scrollable list ---- */}
        <ClubEventsSection
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
          eventsTab={eventsTab}
          setEventsTab={setEventsTab}
          eventsLoading={eventsLoading}
        />

        {/* ---- Contact & links (includes social networks) ---- */}
        <ClubContactLinks linkRows={linkRows} />

        {/* ---- Photo gallery ---- */}
        {club.hero_urls && club.hero_urls.length > 1 ? (
          <ClubPhotoGallery
            urls={club.hero_urls}
            itemWidth={galleryW}
            itemHeight={Math.min(Math.round(galleryW * 0.42), 200)}
          />
        ) : null}

        {/* ---- Members: card chips that wrap, creator highlighted, "see all" ---- */}
        <ClubMembersPreview club={club} creator={creator} members={members} />
      </ScrollView>
      <LeaveClubSheet
        visible={showLeaveSheet}
        onClose={() => setShowLeaveSheet(false)}
        clubId={club.id}
        clubName={club.name}
        creatorId={club.created_by ?? ''}
      />
      <DeleteClubSheet
        visible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        clubId={club.id}
        clubName={club.name}
      />
    </SafeScreen>
  );
}