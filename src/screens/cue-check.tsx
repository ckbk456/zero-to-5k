import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Text } from 'react-native';

import { SessionRuntime, type RuntimeState } from '@modules/session-runtime';
import { useProgram } from '@/session/use-program';
import { withRuntimeLock } from '@/session/controller';
import { useColors } from '@/theme/colors';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Heading,
  Screen,
  formatClock,
} from '@/ui/kit';

const KEY = 'cue-check';

// A real native audio rehearsal, deliberately outside training history.
export function CueCheckScreen() {
  const colors = useColors();
  const { data, error: loadError } = useProgram();
  const [state, setState] = useState<RuntimeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const starting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const refresh = () =>
      void SessionRuntime.getState()
        .then((next) => {
          if (mounted.current) setState(next);
        })
        .catch(() => {
          if (mounted.current)
            setError('The cue player could not be read. Try again.');
        });
    refresh();
    const timer = setInterval(refresh, 500);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      // Never stop a training session owned by another screen.
      void withRuntimeLock(SessionRuntime, async () => {
        const next = await SessionRuntime.getState();
        if (next.sessionKey === KEY) {
          await SessionRuntime.end();
          await SessionRuntime.reset();
        }
      }).catch(() => {});
    };
  }, []);

  async function start() {
    if (!data || starting.current) return;
    starting.current = true;
    setBusy(true);
    setError(null);
    try {
      await withRuntimeLock(SessionRuntime, async () => {
        const previous = await SessionRuntime.getState();
        if (previous.sessionKey === KEY) await SessionRuntime.reset();
        else if (previous.status !== 'idle')
          throw new Error('Finish or save your current session first.');
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
        await SessionRuntime.prepare();
        if (!mounted.current) return;
        const next = await SessionRuntime.start({
          sessionKey: KEY,
          title: 'Try the cues · not a workout',
          segments: [
            { label: 'Walk', durationMs: 10000 },
            { label: 'Race walk', durationMs: 10000 },
            { label: 'Walk', durationMs: 10000 },
          ],
          cues: [
            { atMs: 0, text: 'Walk' },
            { atMs: 10000, text: 'Race walk' },
            { atMs: 20000, text: 'Walk' },
            { atMs: 30000, text: 'Done' },
          ],
          speech: data.settings.speech,
          vibration: data.settings.vibration,
        });
        if (mounted.current) setState(next);
        else {
          await SessionRuntime.end();
          await SessionRuntime.reset();
        }
      });
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'The cues could not start. Try again.',
        );
    } finally {
      starting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await withRuntimeLock(SessionRuntime, async () => {
        const current = await SessionRuntime.getState();
        if (current.sessionKey === KEY) setState(await SessionRuntime.end());
      });
    } catch {
      setError('The cue check could not stop. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const ours = state?.sessionKey === KEY;
  const running =
    ours && (state.status === 'running' || state.status === 'paused');
  const finished = ours && state.status === 'finished';
  const remaining = ours ? Math.max(0, 30 - state.elapsedMs / 1000) : 30;
  return (
    <Screen>
      <Heading>Hear it before you head out</Heading>
      <Body>
        Start your music or podcast, then try this 30-second rehearsal. You can
        stay still. It uses your cue settings and never counts as a workout.
      </Body>
      <Card>
        <Text
          style={{
            color: colors.text,
            fontSize: 64,
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatClock(remaining)}
        </Text>
        <Body>
          {finished
            ? 'Cue check complete. You should have heard Walk, Race walk, Walk, then Done.'
            : 'Walk → Race walk → Walk → Done'}
        </Body>
        {running && state.status === 'paused' && (
          <Body>Paused. Return to the app and resume.</Body>
        )}
        {running && !state.backgroundCapable && (
          <Body>Keep this screen open for cues on this device.</Body>
        )}
      </Card>
      {data && !data.settings.speech && (
        <Body muted>
          Sound is off in Settings. This rehearsal will only vibrate if
          vibration is enabled.
        </Body>
      )}
      {(error || loadError) && <ErrorText>{error ?? loadError}</ErrorText>}
      {running ? (
        <>
          {state.status === 'paused' && (
            <Button
              label="Resume cue check"
              onPress={() =>
                void withRuntimeLock(SessionRuntime, async () => {
                  const current = await SessionRuntime.getState();
                  if (current.sessionKey === KEY)
                    setState(await SessionRuntime.resume());
                }).catch(() => setError('Could not resume. Try again.'))
              }
            />
          )}
          <Button
            label="Stop cue check"
            kind="secondary"
            disabled={busy}
            onPress={() => void stop()}
          />
        </>
      ) : (
        <Button
          label={finished ? 'Try again' : 'Start cue check'}
          disabled={busy || !data || !state}
          onPress={() => void start()}
        />
      )}
      <Body muted>
        Use a comfortable volume and stay aware of traffic. If other audio does
        not return after a cue, pause here and check your audio app before
        training.
      </Body>
    </Screen>
  );
}
