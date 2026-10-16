import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Interval } from '@/domain/plan';
import { colors } from '@/theme/colors';

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: Math.max(insets.bottom, 20) + 12,
        gap: 16,
      }}
    >
      {children}
    </ScrollView>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator accessibilityLabel={label} />
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 16,
          gap: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text
      accessibilityRole="header"
      style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}
    >
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text
      accessibilityRole="header"
      style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <Text
      style={{
        color: muted ? colors.secondary : colors.text,
        fontSize: 16,
        lineHeight: 23,
      }}
    >
      {children}
    </Text>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text
      accessibilityRole="alert"
      style={{ color: colors.danger, fontSize: 16, lineHeight: 23 }}
    >
      {children}
    </Text>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const filled = kind === 'primary';
  const tint = kind === 'danger' ? colors.danger : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 14,
        borderCurve: 'continuous',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: filled ? tint : 'transparent',
        borderWidth: filled ? 0 : 2,
        borderColor: tint,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: filled ? colors.onAccent : tint,
          fontSize: 17,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 17 }}>{label}</Text>
      <Text style={{ color: colors.secondary, fontSize: 17 }}>
        {value ?? '›'}
      </Text>
    </Pressable>
  );
}

const SEGMENT_OPACITY: Record<Interval['kind'], number> = {
  warmup: 0.3,
  walk: 0.3,
  cooldown: 0.3,
  active: 1,
};

// Proportional bar of a session's intervals. Runs are solid; walks are light.
export function IntervalBar({
  intervals,
  progress,
}: {
  intervals: readonly Interval[];
  progress?: number;
}) {
  const runs = intervals.filter((interval) => interval.kind === 'active');
  return (
    <View
      accessible
      accessibilityLabel={`${runs.length} ${runs.length === 1 ? 'run' : 'runs'} between a warm-up and cool-down walk`}
      style={{ gap: 6 }}
    >
      <View
        style={{
          flexDirection: 'row',
          height: 14,
          borderRadius: 7,
          overflow: 'hidden',
          gap: 2,
        }}
      >
        {intervals.map((interval, index) => (
          <View
            key={index}
            style={{
              flex: interval.seconds,
              backgroundColor: colors.accent,
              opacity: SEGMENT_OPACITY[interval.kind],
            }}
          />
        ))}
      </View>
      {progress !== undefined && (
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.track,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              height: 4,
              backgroundColor: colors.text,
            }}
          />
        </View>
      )}
    </View>
  );
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
