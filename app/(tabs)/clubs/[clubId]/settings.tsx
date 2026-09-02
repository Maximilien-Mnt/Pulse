import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeScreen } from '@/components/shared/SafeScreen';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { SPORTS, SPORT_LEVELS } from '@/lib/constants';
import { COMMON_COUNTRIES, countryFlag } from '@/utils/countries';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import type { Club } from '@/types';
import type { OpeningHourSlot } from '@/lib/openingHours';
import { ClubOpeningHoursEditor } from '@/components/clubs/ClubOpeningHours';
import { t } from '@/hooks/useTranslation';

const CARD =
  'rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800';

export default function ClubSettings() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [requiredLevels, setRequiredLevels] = useState<Record<string, string>>({});
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [league, setLeague] = useState('');
  const [foundedDate, setFoundedDate] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [extraLink, setExtraLink] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [heroUrls, setHeroUrls] = useState<string[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHourSlot[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();
      if (!mounted) return;
      if (error || !data) {
        Toast.show({ type: 'error', text1: t('error.generic') });
        router.back();
        return;
      }
      if (data.created_by !== userId) {
        Toast.show({ type: 'error', text1: t('clubs.only_owner_can_edit') });
        router.back();
        return;
      }
      setClub(data);
      setName(data.name || '');
      setShortDescription(data.short_description || '');
      setDescription(data.description || '');
      setSports(Array.isArray(data.sports) && data.sports.length ? data.sports : (data.sport ? [data.sport] : []));
      setRequiredLevels((data.required_levels as Record<string, string>) || {});
      setCountry(data.country || '');
      setCity(data.city || '');
      setAddress(data.address || '');
      setPostalCode(data.postal_code || '');
      setContactEmail(data.contact_email || '');
      setPhoneNumber(data.phone_number || '');
      setWebsiteUrl(data.website_url || '');
      setRegistrationUrl(data.registration_url || '');
      setLeague(data.league || '');
      setFoundedDate(data.founded_date || '');
      setAgeMin(data.age_min != null ? String(data.age_min) : '');
      setAgeMax(data.age_max != null ? String(data.age_max) : '');
      setLogoUrl(data.logo_url || null);
      setCoverUrl(data.cover_url || null);
      setHeroUrls(Array.isArray(data.hero_urls) ? data.hero_urls : []);
      setOpeningHours(Array.isArray(data.opening_hours) ? (data.opening_hours as unknown as OpeningHourSlot[]) : []);
      setInstagramUrl((data as any).instagram_url || '');
      setFacebookUrl((data as any).facebook_url || '');
      setTiktokUrl((data as any).tiktok_url || '');
      setExtraLink((data as any).extra_link || '');
      setHydrated(true);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [clubId]);

  const toggleSport = useCallback((s: string) => {
    setSports((prev) => {
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      if (!next.length) setRequiredLevels({});
      else
        setRequiredLevels((rl) => {
          const copy = { ...rl };
          if (!next.includes(s)) delete copy[s];
          return copy;
        });
      return next;
    });
  }, []);

  const setLevelFor = useCallback((sport: string, value: string) => {
    setRequiredLevels((prev) => {
      const copy = { ...prev };
      if (value === 'any') delete copy[sport];
      else copy[sport] = value;
      return copy;
    });
  }, []);

  const pickImage = useCallback(
    async (opts: { multiple?: boolean; current?: string[]; max?: number }) => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: 'error', text1: t('error.permissionPhotos') });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: opts.multiple ?? false,
      });
      if (res.canceled) return;
      const uris = res.assets.map((a) => a.uri);
      if (opts.multiple) {
        const merged = [...(opts.current ?? []), ...uris];
        const capped = opts.max ? merged.slice(0, opts.max) : merged;
        return capped;
      }
      return uris[0] ?? null;
    },
    [],
  );

  const uploadImage = useCallback(
    async (uri: string, folder: string): Promise<string | null> => {
      try {
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error } = await supabase.storage.from('clubs').upload(path, blob);
        if (error) throw error;
        const { data } = supabase.storage.from('clubs').getPublicUrl(path);
        return data.publicUrl;
      } catch {
        Toast.show({ type: 'error', text1: t('error.image_upload_failed') });
        return null;
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!name.trim() || !sports.length) {
      Toast.show({
        type: 'error',
        text1: !name.trim() ? t('clubs.club_name_required') : t('clubs.club_sport_required'),
      });
      return;
    }
    setSaving(true);
    try {
      let newLogo = logoUrl;
      let newCover = coverUrl;
      let newHeroes = heroUrlsWithTemp;

      const { error } = await supabase
        .from('clubs')
        .update({
          name: name.trim(),
          short_description: shortDescription.trim() || null,
          description: description.trim() || null,
          sport: sports[0] || null,
          sports,
          required_level: requiredLevels[sports[0]] || 'any',
          required_levels: requiredLevels,
          country: country.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          postal_code: postalCode.trim() || null,
          contact_email: contactEmail.trim() || null,
          phone_number: phoneNumber.trim() || null,
          website_url: websiteUrl.trim() || null,
          registration_url: registrationUrl.trim() || null,
          league: league.trim() || null,
          founded_date: foundedDate.trim() || null,
          age_min: ageMin ? parseInt(ageMin, 10) : null,
          age_max: ageMax ? parseInt(ageMax, 10) : null,
          instagram_url: instagramUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          tiktok_url: tiktokUrl.trim() || null,
          extra_link: extraLink.trim() || null,
          logo_url: newLogo,
          cover_url: newCover,
          hero_urls: newHeroes,
          opening_hours: openingHours as unknown as any,
        })
        .eq('id', clubId);
      if (error) throw error;
      Toast.show({ type: 'success', text1: t('clubs.club_updated') });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: t('clubs.club_update_failed') });
    } finally {
      setSaving(false);
    }
  }, [
    name, shortDescription, description, sports, requiredLevels, country, city,
    address, postalCode, contactEmail, phoneNumber, websiteUrl, registrationUrl,
    league, foundedDate, ageMin, ageMax, instagramUrl, facebookUrl, tiktokUrl,
    extraLink, logoUrl, coverUrl, heroUrls, openingHours, clubId,
  ]);

  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('clubs.delete_title'),
      t('clubs.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('clubs.delete'),
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.rpc('delete_club_full', {
                p_club_id: clubId,
                p_club_title: t('notifications.club_deleted_title'),
                p_club_body: t('notifications.club_deleted_body', { name: club?.name || '' }),
                p_event_title: t('notifications.event_deleted_title'),
                p_event_body: t('notifications.event_deleted_body', { name: club?.name || '' }),
              });
              if (error) throw error;
              Toast.show({ type: 'success', text1: t('clubs.club_deleted') });
              router.replace('/(tabs)/profile/clubs');
            } catch {
              Toast.show({ type: 'error', text1: t('clubs.club_delete_failed') });
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [clubId, club?.name]);

  if (loading || !hydrated) {
    return (
      <SafeScreen edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="p-2 -ml-2">
              <Icon name="ArrowLeft" size={24} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" className="text-2xl font-bold mt-3 mb-4">
          {t('clubs.edit_club')}
        </Text>

          {/* ---- name ---- */}
          <View className={`${CARD} p-4`}>
            <Text size="sm" weight="semibold" color="muted">
              {t('club_name')} *
            </Text>
            <View className="h-2" />
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t('club_name_placeholder')}
            />
          </View>
          <View className="h-4" />

          {/* ---- short + long description ---- */}
          <View className={`${CARD} p-4`}>
            <Text size="sm" weight="semibold" color="muted">
              {t('short_description')}
            </Text>
            <View className="h-2" />
            <Input
              value={shortDescription}
              onChangeText={setShortDescription}
              placeholder={t('short_description_placeholder')}
            />
            <View className="h-4" />
            <Text size="sm" weight="semibold" color="muted">
              {t('description')}
            </Text>
            <View className="h-2" />
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={t('description_placeholder')}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
          <View className="h-4" />

          {/* ---- sports + required level ---- */}
          <View className={`${CARD} p-4`}>
            <Text size="sm" weight="semibold" color="muted">
              {t('sport_s')} *
            </Text>
            <View className="h-3" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SPORTS.map((s) => {
                const active = sports.includes(s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => toggleSport(s)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-neutral-200 dark:border-neutral-600'
                    }`}
                  >
                    <Text size="sm" color={active ? 'primary' : 'default'}>
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sports.length > 0 && (
              <>
                <View className="h-5" />
                <Text size="sm" weight="semibold" color="muted">
                  {t('required_level_per_sport')}
                </Text>
                <View className="h-3" />
                {sports.map((s) => (
                  <View key={s} className="mb-3">
                    <Text size="xs" weight="medium" className="mb-1.5">
                      {s}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {SPORT_LEVELS.map((lvl) => {
                        const active = (requiredLevels[s] ?? 'any') === lvl.value;
                        return (
                          <Pressable
                            key={lvl.value}
                            onPress={() => setLevelFor(s, lvl.value)}
                            className={`px-2.5 py-1 rounded-full border ${
                              active
                                ? 'bg-primary-500 border-primary-500'
                                : 'border-neutral-200 dark:border-neutral-600'
                            }`}
                          >
                            <Text size="xs">{lvl.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
          <View className="h-4" />

          {/* ---- location ---- */}
          <View className={`${CARD} p-4`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="map-pin" size={16} className="mr-2" />
              <Text size="base" weight="semibold">
                {t('location')}
              </Text>
            </View>

            <Text size="sm" weight="semibold" color="muted">
              {t('country')}
            </Text>
            <View className="h-2" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {COMMON_COUNTRIES.map((c) => {
                const active = country === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCountry(c)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      active
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-neutral-200 dark:border-neutral-600'
                    }`}
                  >
                    <Text>{countryFlag(c)}</Text>
                    <Text size="sm" className="ml-1.5">
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="h-4" />
            <Input
              label={t('city')}
              value={city}
              onChangeText={setCity}
              placeholder={t('city_placeholder')}
            />
            <Input
              label={t('address')}
              value={address}
              onChangeText={setAddress}
              placeholder={t('address_placeholder')}
            />
            <Input
              label={t('postal_code')}
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder={t('postal_code_placeholder')}
              keyboardType="number-pad"
            />
          </View>
          <View className="h-4" />

          {/* ---- contact & links ---- */}
          <View className={`${CARD} p-4`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="mail" size={16} className="mr-2" />
              <Text size="base" weight="semibold">
                {t('contact_links')}
              </Text>
            </View>
            <Input
              label={t('contact_email')}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder={t('contact_email_placeholder')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label={t('phone_number')}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder={t('phone_placeholder')}
              keyboardType="phone-pad"
            />
            <Input
              label={t('website')}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder={t('website_placeholder')}
              autoCapitalize="none"
            />
            <Input
              label={t('external_registration_link')}
              value={registrationUrl}
              onChangeText={setRegistrationUrl}
              placeholder={t('registration_link_placeholder')}
              autoCapitalize="none"
            />
            <Input
              label="Instagram"
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              placeholder="https://instagram.com/..."
              autoCapitalize="none"
            />
            <Input
              label="Facebook"
              value={facebookUrl}
              onChangeText={setFacebookUrl}
              placeholder="https://facebook.com/..."
              autoCapitalize="none"
            />
            <Input
              label="TikTok"
              value={tiktokUrl}
              onChangeText={setTiktokUrl}
              placeholder="https://tiktok.com/..."
              autoCapitalize="none"
            />
            <Input
              label={t('additional_link')}
              value={extraLink}
              onChangeText={setExtraLink}
              placeholder={t('additional_link_placeholder')}
              autoCapitalize="none"
            />
          </View>
          <View className="h-4" />

          {/* ---- details ---- */}
          <View className={`${CARD} p-4`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="info" size={16} className="mr-2" />
              <Text size="base" weight="semibold">
                {t('additional_details')}
              </Text>
            </View>
            <Input
              label={t('league')}
              value={league}
              onChangeText={setLeague}
              placeholder={t('league_placeholder')}
            />
            <Input
              label={t('foundation_date')}
              value={foundedDate}
              onChangeText={setFoundedDate}
              placeholder={t('foundation_date_placeholder')}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('age_min')}
                  value={ageMin}
                  onChangeText={setAgeMin}
                  placeholder="16"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('age_max')}
                  value={ageMax}
                  onChangeText={setAgeMax}
                  placeholder="99"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
          <View className="h-4" />

          {/* ---- opening hours ---- */}
          <View className={`${CARD} p-4`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="clock" size={16} className="mr-2" />
              <Text size="base" weight="semibold">
                {t('opening_hours')}
              </Text>
            </View>
            <ClubOpeningHoursEditor
              value={openingHours}
              onChange={setOpeningHours}
            />
          </View>
          <View className="h-4" />

          {/* ---- images ---- */}
          <View className={`${CARD} p-4`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="image" size={16} className="mr-2" />
              <Text size="base" weight="semibold">
                {t('images')}
              </Text>
            </View>

            <Text size="sm" weight="semibold" color="muted">
              {t('logo')}
            </Text>
            <View className="h-2" />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
                  <Icon name="image" size={24} />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Button
                  title={t('upload_logo')}
                  onPress={pickLogo}
                  variant="outline"
                  size="sm"
                />
              </View>
            </View>

            <View className="h-4" />
            <Text size="sm" weight="semibold" color="muted">
              {t('cover_image')}
            </Text>
            <View className="h-2" />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  className="w-24 h-16 rounded-lg"
                />
              ) : (
                <View className="w-24 h-16 rounded-lg bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
                  <Icon name="image" size={24} />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Button
                  title={t('upload_cover')}
                  onPress={pickCover}
                  variant="outline"
                  size="sm"
                />
              </View>
            </View>

            <View className="h-4" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text size="sm" weight="semibold" color="muted">
                {t('photos')} ({heroUrls.length}/10)
              </Text>
              <Button
                title={t('add_photos')}
                onPress={pickHero}
                variant="outline"
                size="sm"
                disabled={heroUrls.length >= 10}
              />
            </View>
            {heroUrls.length > 0 && (
              <View className="h-2" />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {heroUrls.map((uri, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <Image
                    source={{ uri }}
                    className="w-20 h-20 rounded-lg"
                  />
                  <Pressable
                    onPress={() => removeHero(i)}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                  >
                    <Text size="xs" className="text-white">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
          <View className="h-6" />

          {/* ---- save ---- */}
          <Button
            title={t('save_changes')}
            onPress={handleSave}
            loading={saving}
            disabled={saving || sports.length === 0 || !name.trim()}
          />
          <View className="h-4" />

          {/* ---- delete ---- */}
          <Button
            title={t('delete_club')}
            onPress={() => setShowDelete(true)}
            variant="outline"
            className="border-red-500"
            textClassName="text-red-500"
            disabled={saving}
          />
          <View className="h-6" />
        </ScrollView>

        {/* ---- delete confirmation modal ---- */}
        {showDelete && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
            <View className={`${CARD} p-6 w-full max-w-sm`}>
              <Text size="lg" weight="bold" className="mb-2">
                {t('clubs.delete_title')}
              </Text>
              <Text size="sm" color="muted" className="mb-4">
                {t('clubs.delete_confirm')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('common.cancel')}
                    onPress={() => setShowDelete(false)}
                    variant="outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('clubs.delete')}
                    onPress={handleDelete}
                    loading={saving}
                    disabled={saving}
                    className="border-red-500 bg-red-500"
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </SafeScreen>
  );
}
          <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
            <View className={`${CARD} p-6 w-full max-w-sm`}>
              <Text size="lg" weight="bold" className="mb-2">
                {t('clubs.delete_title')}
              </Text>
              <Text size="sm" color="muted" className="mb-4">
                {t('clubs.delete_confirm')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('common.cancel')}
                    onPress={() => setShowDelete(false)}
                    variant="outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('clubs.delete')}
                    onPress={handleDelete}
                    loading={saving}
                    disabled={saving}
                    className="border-red-500 bg-red-500"
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </SafeScreen>
    );
  }
