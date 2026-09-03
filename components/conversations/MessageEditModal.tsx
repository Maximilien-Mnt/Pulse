// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Edit Modal
//
// Small centered modal to modify a message, mirroring the app's existing
// centered-modal patterns (dark backdrop, rounded card, Cancel / Save).
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

interface MessageEditModalProps {
  visible: boolean;
  initialText: string;
  saving: boolean;
  onClose: () => void;
  onSave: (newText: string) => Promise<void>;
}

export function MessageEditModal({ visible, initialText, saving, onClose, onSave }: MessageEditModalProps) {
  const [text, setText] = useState(initialText);

  // Seed the input each time the modal opens
  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/60 items-center justify-center px-6" onPress={onClose}>
          <Pressable
            className="bg-white dark:bg-neutral-900 rounded-2xl p-5 w-full max-w-md"
            onPress={() => {}}
          >
            <Text variant="subtitle" className="text-text-primary mb-3">
              Modifier le message
            </Text>
            <TextInput
              className="w-full border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 bg-neutral-50 dark:bg-neutral-800 mb-5 max-h-32"
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button title="Annuler" variant="ghost" onPress={onClose} disabled={saving} />
              </View>
              <View className="flex-1">
                <Button
                  title="Enregistrer"
                  variant="secondary"
                  loading={saving}
                  disabled={!text.trim()}
                  onPress={() => void onSave(text.trim())}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}