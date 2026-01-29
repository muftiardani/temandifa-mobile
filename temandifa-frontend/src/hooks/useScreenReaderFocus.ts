import { useCallback, useRef } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  InteractionManager,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Logger } from "../services/logger";

/**
 * Hook to shift Screen Reader focus to a specific element when screen comes into focus.
 * Usage:
 * const titleRef = useScreenReaderFocus();
 * <Text ref={titleRef}>Page Title</Text>
 */
export const useScreenReaderFocus = () => {
  const elementRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      const focus = () => {
        if (elementRef.current) {
          const reactTag = findNodeHandle(elementRef.current);
          if (reactTag) {
            // Slight delay to ensure transition animation is complete
            // and screen reader is ready to accept focus change
            setTimeout(() => {
              AccessibilityInfo.setAccessibilityFocus(reactTag);
              Logger.info("Accessibility", "Focus set to element", {
                reactTag,
              });
            }, 100);
          }
        }
      };

      InteractionManager.runAfterInteractions(() => {
        focus();
      });
    }, [])
  );

  return elementRef;
};
