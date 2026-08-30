import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
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

  useEffect(() => {
    if (data) {
      const isClub = type === "club";
      setFormData({
        name: data.name || "",
        description: data.description || "",
        address: isClub ? (data as Club).address || "" : (data as EventRow).venue_address || "",
        contact_email: isClub ? (data as Club).contact_email || "" : "",
        website_url: data.website_url || "",
        required_level: data.required_level || "",
        league: isClub ? (data as Club).league || "" : "",
        founded_date: isClub ? (data as Club).founded_date || "" : "",
        cover_url: isClub ? (data as Club).cover_url || "" : "",
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
      updateData.short_description = formData.description.slice(0, 100);
      oldData.description = data.description;
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
      if (formData.registration_url !== event.registration_url) {
        updateData.registration_url = formData.registration_url || null;
        oldData.registration_url = event.registration_url;
      }
    }
    
    if (formData.website_url !== data.website_url) {
      updateData.website_url = formData.website_url || null;
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
            label={t("forms.description")}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            placeholder={t("forms.description")}
          />

          <Input
            label={type === "club" ? t("forms.address") : t("forms.venueAddress")}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder={t("forms.address")}
          />

          <Input
            label={t("forms.website")}
            value={formData.website_url}
            onChangeText={(text) => setFormData({ ...formData, website_url: text })}
            placeholder="https://"
            autoCapitalize="none"
          />

          {type === "event" && (
            <Input
              label={t("forms.registrationUrl")}
              value={formData.registration_url}
              onChangeText={(text) => setFormData({ ...formData, registration_url: text })}
              placeholder="https://"
              autoCapitalize="none"
            />
          )}

          <Input
            label={t("forms.requiredLevel")}
            value={formData.required_level}
            onChangeText={(text) => setFormData({ ...formData, required_level: text })}
            placeholder={t("forms.levelExample")}
          />

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