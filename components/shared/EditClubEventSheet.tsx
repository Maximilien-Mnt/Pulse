import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EventHostingSelector } from "@/components/events/EventHostingSelector";
import { isValidLink, normalizeLink } from "@/utils/links";
import { localizeError } from "@/utils/localizeError";
import type { Club, EventRow } from "@/types";
import { t } from "@/hooks/useTranslation";

type Props = {
  visible: boolean;
  onClose: () => void;
  type: "club" | "event";
  data: Club | EventRow | null;
  onSave: (data: any, oldData: any) => void;
  isLoading?: boolean;
};

export function EditClubEventSheet({ visible, onClose, type, data, onSave, isLoading }: Props) {
  const [formData, setFormData] = useState<any>({});
  const [linkError, setLinkError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const isClub = type === "club";
      const eventRow = !isClub ? (data as EventRow) : null;
      setFormData({
        name: data.name || "",
        description: data.description || "",
        short_description: !isClub ? (eventRow?.short_description || "") : "",
        address: isClub ? (data as Club).address || "" : eventRow?.venue_address || "",
        postal_code: !isClub ? eventRow?.postal_code || "" : "",
        contact_email: isClub ? (data as Club).contact_email || "" : eventRow?.contact_email || "",
        website_url: data.website_url || "",
        registration_url: !isClub ? eventRow?.registration_url || "" : "",
        is_external: !isClub ? !!eventRow?.is_external : false,
        required_level: data.required_level || "",
        required_levels: !isClub ? ((eventRow?.required_levels as Record<string, string> | null) ?? {}) : {},
        sports: !isClub ? (eventRow?.sports?.length ? eventRow.sports : eventRow?.sport ? [eventRow.sport] : []) : [],
        league: isClub ? (data as Club).league || "" : eventRow?.league || "",
        founded_date: isClub ? (data as Club).founded_date || "" : "",
        cover_url: isClub ? (data as Club).cover_url || "" : eventRow?.cover_url || "",
        logo_url: isClub ? (data as Club).logo_url || "" : "",
      });
    }
  }, [data, type]);

  const handleSave = () => {
    if (!data) return;
    
    const updateData: any = {};
    const oldData: any = {};

    if (formData.name !== data.name) {
      updateData.name = formData.name;
      oldData.name = data.name;
    }
    if (formData.description !== data.description) {
      updateData.description = formData.description;
      oldData.description = data.description;
    }
    if (type === "event") {
      const event = data as EventRow;
      if (formData.short_description !== (event.short_description ?? "")) {
        updateData.short_description = formData.short_description;
        oldData.short_description = event.short_description;
      }
      if ((formData.postal_code || null) !== (event.postal_code ?? null)) {
        updateData.postal_code = formData.postal_code || null;
        oldData.postal_code = event.postal_code;
      }
      if ((formData.contact_email || null) !== (event.contact_email ?? null)) {
        updateData.contact_email = formData.contact_email || null;
        oldData.contact_email = event.contact_email;
      }
      if ((formData.league || null) !== (event.league ?? null)) {
        updateData.league = formData.league || null;
        oldData.league = event.league;
      }
      if ((formData.cover_url || null) !== (event.cover_url ?? null)) {
        updateData.cover_url = formData.cover_url || null;
        oldData.cover_url = event.cover_url;
      }
      const nextSports: string[] = Array.isArray(formData.sports) ? formData.sports : [];
      if (JSON.stringify(nextSports) !== JSON.stringify(event.sports ?? [])) {
        updateData.sports = nextSports;
        oldData.sports = event.sports;
        if (nextSports.length > 0 && nextSports[0] !== event.sport) {
          updateData.sport = nextSports[0];
          oldData.sport = event.sport;
        }
      }
      const nextLevels: Record<string, string> = formData.required_levels ?? {};
      const trimmedLevels = Object.fromEntries(
        Object.entries(nextLevels).filter(([id, level]) => !!level && nextSports.includes(id))
      );
      if (JSON.stringify(trimmedLevels) !== JSON.stringify(event.required_levels ?? {})) {
        updateData.required_levels = trimmedLevels;
        oldData.required_levels = event.required_levels;
        const nextPrimary = nextSports[0] ? (trimmedLevels[nextSports[0]!] ?? null) : null;
        if (nextPrimary !== (event.required_level ?? null)) {
          updateData.required_level = nextPrimary;
          oldData.required_level = event.required_level;
        }
      }
    }
    if (type === "club") {
      const club = data as Club;
      if (formData.address !== club.address) {
        updateData.address = formData.address || null;
        oldData.address = club.address;
      }
      if (formData.contact_email !== club.contact_email) {
        updateData.contact_email = formData.contact_email || null;
        oldData.contact_email = club.contact_email;
      }
      if (formData.league !== club.league) {
        updateData.league = formData.league || null;
        oldData.league = club.league;
      }
      if (formData.founded_date !== club.founded_date) {
        updateData.founded_date = formData.founded_date || null;
        oldData.founded_date = club.founded_date;
      }
      if (formData.cover_url !== club.cover_url) {
        updateData.cover_url = formData.cover_url || null;
        oldData.cover_url = club.cover_url;
      }
      if (formData.logo_url !== club.logo_url) {
        updateData.logo_url = formData.logo_url || null;
        oldData.logo_url = club.logo_url;
      }
    } else {
      const event = data as EventRow;
      if (formData.address !== event.venue_address) {
        updateData.venue_address = formData.address || null;
        oldData.venue_address = event.venue_address;
      }
      // Registration link is mandatory for events (any hosting mode).
      const nextLink = normalizeLink(String(formData.registration_url ?? ""));
      if (!String(formData.registration_url ?? "").trim() || !isValidLink(String(formData.registration_url ?? ""))) {
        setLinkError(
          !String(formData.registration_url ?? "").trim()
            ? localizeError("validation.registrationLinkRequired") ?? "Registration link required"
            : localizeError("validation.invalidUrl") ?? "Invalid link"
        );
        return;
      }
      if ((nextLink ?? null) !== (event.registration_url ?? null)) {
        updateData.registration_url = nextLink;
        oldData.registration_url = event.registration_url;
      }
      if (formData.contact_email !== (event.contact_email ?? "")) {
        updateData.contact_email = formData.contact_email || null;
        oldData.contact_email = event.contact_email;
      }
      if (formData.website_url && !isValidLink(String(formData.website_url))) {
        setLinkError(localizeError("validation.invalidUrl") ?? "Invalid link");
        return;
      }
    }

    if (formData.website_url !== data.website_url) {
      updateData.website_url = formData.website_url ? normalizeLink(String(formData.website_url)) : null;
      oldData.website_url = data.website_url;
    }
    if (formData.required_level !== data.required_level) {
      updateData.required_level = formData.required_level || null;
      oldData.required_level = data.required_level;
    }

    onSave(updateData, oldData);
  };

  if (!visible || !data) return null;

  const title =
    type === "club" ? t("clubs.edit") : t("events.edit");

  return (
    <View className="absolute inset-0 z-50">
      {/* Backdrop */}
      <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
      
      {/* Bottom Sheet */}
      <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-3xl max-h-[90%]">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="X" size={24} color="text-primary" />
          </Pressable>
        </View>

        {/* Form */}
        <ScrollView className="p-4">
          <Input
            label={t("forms.name")}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder={t("forms.name")}
          />

          <Input
            label={type === "event" ? t("create.event.longDescription") : t("forms.description")}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            placeholder={type === "event" ? t("create.event.longDescriptionPlaceholder") : t("forms.description")}
          />

          {type === "event" && (
            <Input
              label={`${t("create.event.shortDescription")} *`}
              value={formData.short_description}
              onChangeText={(text) => setFormData({ ...formData, short_description: text })}
              multiline
              placeholder={t("create.event.shortDescriptionPlaceholder")}
              maxLength={200}
            />
          )}

          <Input
            label={type === "club" ? t("forms.address") : t("forms.venueAddress")}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder={type === "club" ? t("forms.address") : t("create.event.exactAddressPlaceholder")}
          />

          {type === "event" && (
            <>
              <Input
                label={t("create.event.postalCode")}
                value={formData.postal_code}
                onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                placeholder={t("create.event.postalCodePlaceholder")}
                keyboardType="number-pad"
                maxLength={20}
              />
              <Input
                label={t("create.event.contactEmail")}
                value={formData.contact_email}
                onChangeText={(text) => setFormData({ ...formData, contact_email: text })}
                placeholder="contact@exemple.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label={t("create.event.league")}
                value={formData.league}
                onChangeText={(text) => setFormData({ ...formData, league: text })}
                placeholder={t("create.event.leaguePlaceholder")}
              />
              <Input
                label={t("create.event.coverImage")}
                value={formData.cover_url}
                onChangeText={(text) => setFormData({ ...formData, cover_url: text })}
                placeholder="https://"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                textContentType="URL"
              />
            </>
          )}

          <Input
            label={t("forms.website")}
            value={formData.website_url}
            onChangeText={(text) => setFormData({ ...formData, website_url: text })}
            placeholder="https://"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
          />

          {type === "event" && (
            <EventHostingSelector
              value={formData.is_external ? "external" : "in_app"}
              onChange={(v) => { setFormData({ ...formData, is_external: v === "external" }); setLinkError(undefined); }}
              link={formData.registration_url ?? ""}
              onChangeLink={(text) => setFormData({ ...formData, registration_url: text })}
              linkError={linkError}
            />
          )}

          {type === "club" && (
            <>
              <Input
                label={t("forms.league")}
                value={formData.league}
                onChangeText={(text) => setFormData({ ...formData, league: text })}
                placeholder={t("forms.league")}
              />
              <Input
                label={t("forms.foundedDate")}
                value={formData.founded_date}
                onChangeText={(text) => setFormData({ ...formData, founded_date: text })}
                placeholder="YYYY-MM-DD"
              />
            </>
          )}

          <Button
            title={t("common.save")}
            onPress={handleSave}
            loading={isLoading}
            className="mt-4 mb-6"
          />
        </ScrollView>
      </View>
    </View>
  );
}