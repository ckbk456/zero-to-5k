import { useState } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';

import { Body, Button, Card, ErrorText, Heading, Row, Screen } from '@/ui/kit';

export function LearnScreen() {
  const [error, setError] = useState<string | null>(null);
  async function openRules() {
    try {
      await Linking.openURL('https://www.usatf.org/disciplines/race-walking');
    } catch {
      setError('The rules could not open. Try again when you are online.');
    }
  }
  return (
    <Screen>
      <Card>
        <Heading>Start with control, not speed</Heading>
        <Body>
          Choose a level, familiar route. Walk for the warm-up, then practise
          relaxed race walking in the short intervals. Slow down or return to an
          ordinary walk when your movement feels strained.
        </Body>
        <Body>
          Keep your head up, shoulders relaxed and steps comfortable. Avoid
          reaching far ahead with your feet or forcing your knees backward.
          Technique takes practice; a qualified coach can help.
        </Body>
      </Card>
      <Card>
        <Heading>What makes it race walking?</Heading>
        <Body>
          Competition has two rules: maintain contact with the ground as seen by
          the human eye, and keep the advancing leg straight from first contact
          until the body passes upright over it.
        </Body>
        <Body>
          The timer cannot assess either rule. Learning the movement comes
          before chasing 8:00 per km.
        </Body>
        <Row
          label="Official race-walking rules ↗"
          onPress={() => void openRules()}
          last
        />
        {error && <ErrorText>{error}</ErrorText>}
      </Card>
      <Card>
        <Heading>A rhythm that fits your week</Heading>
        <Body>
          Aim for three sessions, with at least a day between them. Go in order:
          from stage 5 the sessions move from shorter bouts to longer stretches.
          A stage can take longer than a week.
        </Body>
        <Body>
          Repeat a session or step back after a break. Missed days do not need
          to be made up. Keep the effort easy enough to talk; the check-in is
          feedback, never a target to push harder.
        </Body>
      </Card>
      <Card>
        <Heading>Your playlist. A little guidance.</Heading>
        <Body>
          Play music or a podcast in your usual app. A short chime and a word
          tell you when to change. Try the cues once with your headphones before
          your first session.
        </Body>
        <Button
          label="Try the cues · 30 seconds"
          kind="secondary"
          onPress={() => router.push('/cue-check')}
        />
      </Card>
      <Card>
        <Heading>Know when to stop</Heading>
        <Body>
          Stop for pain, faintness, chest discomfort or unusual breathlessness.
          Seek urgent help for severe or persistent symptoms. Get individual
          advice about health concerns before starting.
        </Body>
        <Body>
          This is a general fitness plan for healthy adults, not treatment for
          an injury. The curriculum is a draft awaiting independent coach
          review.
        </Body>
      </Card>
      <Body muted>
        The goal is 40 continuous minutes. That covers 5 km at 8:00 per km; your
        distance may differ. Completing your planned time is the achievement.
      </Body>
    </Screen>
  );
}
