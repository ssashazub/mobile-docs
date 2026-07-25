import { useLayoutEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

type ModalSheetAnimation = {
  backdrop: Animated.Value;
  sheet: Animated.Value;
};

export function useModalSheetAnimation(
  visible: boolean,
  closedOffset: number
): ModalSheetAnimation {
  const [backdrop] = useState(() => new Animated.Value(0));
  const [sheet] = useState(() => new Animated.Value(closedOffset));
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useLayoutEffect(() => {
    animation.current?.stop();

    if (visible) {
      backdrop.setValue(0);
      sheet.setValue(closedOffset);

      animation.current = Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheet, {
          toValue: 0,
          damping: 22,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]);
    } else {
      animation.current = Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheet, {
          toValue: closedOffset,
          duration: 180,
          useNativeDriver: true,
        }),
      ]);
    }

    animation.current.start();

    return () => {
      animation.current?.stop();
    };
  }, [backdrop, closedOffset, sheet, visible]);

  return { backdrop, sheet };
}
