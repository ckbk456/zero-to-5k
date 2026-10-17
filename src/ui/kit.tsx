import { useState, type ReactNode } from 'react';
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
import { useColors } from '@/theme/colors';

export function Screen({
  children,
  edgeToEdge,
}: {
  children: ReactNode;
  // Set when the screen has no navigation header above it.
  edgeToEdge?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior={edgeToEdge ? 'never' : 'automatic'}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: edgeToEdge ? insets.top + 24 : 20,
        paddingBottom: Math.max(insets.bottom, 20) + 12,
        gap: 16,
      }}
    >
      {children}
    </ScrollView>
  );
}

export function Loading({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.accent} accessibilityLabel={label} />
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
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 20,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.line,
          padding: 18,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.text,
        fontSize: 30,
        lineHeight: 36,
        fontWeight: '800',
        letterSpacing: -0.5,
      }}
    >
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.text,
        fontSize: 20,
        lineHeight: 26,
        fontWeight: '700',
      }}
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
  const colors = useColors();
  return (
    <Text
      style={{
        color: muted ? colors.secondary : colors.text,
        fontSize: 16,
        lineHeight: 24,
      }}
    >
      {children}
    </Text>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text
      accessibilityRole="alert"
      style={{ color: colors.danger, fontSize: 16, lineHeight: 24 }}
    >
      {children}
    </Text>
  );
}

// A caution in amber with a rule on its left, for advice that is not an error.
export function Note({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
        paddingLeft: 12,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
        {children}
      </Text>
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'lane';

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
  const colors = useColors();
  const look = {
    primary: { fill: colors.accent, ink: colors.onAccent, edge: colors.accent },
    secondary: { fill: 'transparent', ink: colors.accent, edge: colors.line },
    danger: { fill: 'transparent', ink: colors.danger, edge: colors.line },
    // White on the deep-blue stage panel.
    lane: { fill: colors.onLane, ink: colors.lane, edge: colors.onLane },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        borderRadius: 27,
        borderCurve: 'continuous',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: look.fill,
        borderWidth: 1.5,
        borderColor: look.edge,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
      })}
    >
      <Text style={{ color: look.ink, fontSize: 17, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 17 }}>{label}</Text>
      <Text style={{ color: colors.secondary, fontSize: 20 }}>
        {value ?? '›'}
      </Text>
    </Pressable>
  );
}

// "1.5" for 90 seconds, "5" for 5 minutes.
function segmentMinutes(seconds: number): string {
  const minutes = seconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
}

// "28½ min" for 28:30.
export function formatMinutes(seconds: number): string {
  const whole = Math.floor(seconds / 60);
  const half = seconds % 60 >= 30 ? '½' : '';
  return `${whole}${half} min`;
}

const MIN_LABEL_WIDTH = 24;

// Proportional strip of a session's intervals, labelled with minutes where
// they fit, over a bracket with the total. Runs are solid; walks are light.
// The lane tone is for the deep-blue stage panel.
export function IntervalBar({
  intervals,
  progress,
  tone = 'plain',
  showTotal = true,
}: {
  intervals: readonly Interval[];
  progress?: number;
  tone?: 'plain' | 'lane';
  showTotal?: boolean;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const total = intervals.reduce((sum, interval) => sum + interval.seconds, 0);
  const runs = intervals.filter((interval) => interval.kind === 'active');
  const gap = 2;
  const usable = width - gap * (intervals.length - 1);

  const run =
    tone === 'lane'
      ? { fill: colors.onLane, ink: colors.lane }
      : { fill: colors.accent, ink: colors.onAccent };
  const walk =
    tone === 'lane'
      ? { fill: colors.laneWalk, ink: colors.onLane }
      : { fill: colors.walk, ink: colors.text };
  const bracket = tone === 'lane' ? colors.onLaneMuted : colors.secondary;

  return (
    <View
      accessible
      accessibilityLabel={`${formatMinutes(total)}: ${runs.length} ${runs.length === 1 ? 'run' : 'runs'} between a warm-up and cool-down walk`}
      style={{ gap: 8 }}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          height: 34,
          borderRadius: 10,
          borderCurve: 'continuous',
          overflow: 'hidden',
          gap,
        }}
      >
        {intervals.map((interval, index) => {
          const look = interval.kind === 'active' ? run : walk;
          const fits =
            width > 0 && (interval.seconds / total) * usable >= MIN_LABEL_WIDTH;
          return (
            <View
              key={index}
              style={{
                flex: interval.seconds,
                backgroundColor: look.fill,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {fits && (
                <Text
                  numberOfLines={1}
                  style={{
                    color: look.ink,
                    fontSize: 13,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {segmentMinutes(interval.seconds)}
                </Text>
              )}
            </View>
          );
        })}
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
      {showTotal && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{ flex: 1, height: 8, ...bracketSide(bracket, 'left') }}
          />
          <Text
            style={{
              color: tone === 'lane' ? colors.onLane : colors.text,
              fontSize: 15,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatMinutes(total)}
          </Text>
          <View
            style={{ flex: 1, height: 8, ...bracketSide(bracket, 'right') }}
          />
        </View>
      )}
    </View>
  );
}

function bracketSide(color: string, side: 'left' | 'right'): ViewStyle {
  return {
    borderColor: color,
    borderBottomWidth: 1.5,
    ...(side === 'left'
      ? { borderLeftWidth: 1.5, borderBottomLeftRadius: 4 }
      : { borderRightWidth: 1.5, borderBottomRightRadius: 4 }),
  };
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
