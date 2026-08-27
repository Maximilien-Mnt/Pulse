import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export type SortOption = {
  value: string;
  label: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  options: ReadonlyArray<SortOption>;
  value: string;
  onSelect: (value: string) => void;
  radiusKm: number;
  onRadiusKm: (km: number) => void;
  isLocationEnabled?: boolean;
  onRequestLocation: () => void;
};

/**
 * Bottom sheet that lists the available ordering options. Selecting "nearby"
 * shows a radius slider (and, when location isn't enabled, a request button)
 * so the user can configure the proximity search directly.
 */
export function SortSheet({
  visible,
  onClose,
  options,
  value,
  onSelect,
  radiusKm,
  onRadiusKm,
  isLocationEnabled = false,
  onRequestLocation,
}: Props) {
  const showRadius = value === "nearby" && isLocationEnabled;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1">
        {/* Backdrop — tapping outside closes the modal */}
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-3xl max-h-[70%] px-4 pt-4 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Trier
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((o) => {
              const isNearby = o.value === "nearby";
              const active = value === o.value;

              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    if (isNearby && !isLocationEnabled) {
                      onRequestLocation();
                      onSelect(o.value);
                    } else {
                      onSelect(o.value);
                      onClose();
                    }
                  }}
                  className={`py-3 border-b border-neutral-100 dark:border-neutral-800 ${
                    active ? "bg-primary/5" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-base text-neutral-900 dark:text-neutral-50">
                        {o.label}
                      </Text>
                      {isNearby && !isLocationEnabled && (
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#64748B"
                          className="ml-2"
                        />
                      )}
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color="#1E6BFF" />
                    ) : null}
                  </View>
                  {isNearby && !isLocationEnabled ? (
                    <Text className="text-xs text-neutral-500 mt-1">
                      Active la localisation pour trier par proximité.
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}

            {/* Radius slider - shown only when "nearby" is selected and location is enabled */}
            {showRadius ? (
              <View className="mt-4 mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Rayon de recherche
                  </Text>
                  <Text className="text-sm text-primary font-medium">
                    {radiusKm} km
                  </Text>
                </View>
                <Slider
                  style={{ width: "100%", height: 40 }}
                  minimumValue={1}
                  maximumValue={100}
                  step={1}
                  value={radiusKm}
                  onValueChange={(km) => onRadiusKm(Math.round(km))}
                  minimumTrackTintColor="#1E6BFF"
                  maximumTrackTintColor="#E2E8F0"
                  thumbTintColor="#1E6BFF"
                />
                <View className="flex-row justify-between">
                  <Text className="text-xs text-neutral-500">1 km</Text>
                  <Text className="text-xs text-neutral-500">100 km</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}