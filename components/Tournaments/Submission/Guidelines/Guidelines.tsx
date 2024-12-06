'use client';

import Card from '@/components/Card/Card';
import styles from './Guidelines.module.css';

export default function Guidelines() {
  return (
    <div className={styles.list}>
      <Card
        title="Submission Rules"
        description="Please read the following before submitting. Our goal is to include matches that do not stray too far from the competitive norm, it's important that bad data remains out of our system."
      />
      <Card
        title="What can I submit?"
        description="Only submit matches from tournaments not already in our system. The tournament must be fully completed before its matches can be submitted. If you think a match is missing from a tournament already in the system, please contact us."
      />
      <Card
        title="Is my tournament too gimmicky to be included?"
        description="Tag, relax, and battle-royale styled matches will not be included. Submit bracket-stage and group-stage matches only. Tournaments that do not allow players to play at their full competitive strength or stray too far from the competitive norm will not be included. Please contact us if you are unsure."
      />
      <Card
        title="How are tournaments with multiple tiers / divisions handled?"
        description="Tournaments with multiple tiers across one bracket can be submitted. Multiple divisions should be submitted as separate tournaments if they are not played in the same bracket. In general, one bracket equals one tournament."
      />
      <Card
        title="What about qualifiers?"
        description="Never submit qualifiers or tryouts."
      />
      <Card
        title="Can I submit from any time period?"
        description="Tournaments from any time period can be submitted. However, please ensure what you are submitting is of quality."
      />
      <Card
        title="The tournament I want to submit is missing matches. What do I do?"
        description="If the tournament has not yet concluded, do not submit it yet. If the tournament's history is not properly recorded or maintained, that's okay - submit all that is publicly available. If you're not sure, please contact us."
      />
    </div>
  );
}
