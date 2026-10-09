This page is meant to answer quick questions about how to interpret TR or understand the general trend of rating changes. Everything here is a summarized version of other pages, so please read [[Rating Calculation Overview|the more detailed docs]] if you're curious about the details.

We know the system isn't perfect, and we're happy to chat in [Discord](https://discord.gg/R53AwX2tJA) to take feedback and answer further questions! With that said, please read through this first to gain some insight into how the system is *designed* to function.

## Why is my rating so high / low?

**Earning more score in games** than teammates and opponents will lead to rating gain, regardless of beatmap difficulty. **Sitting out of games** results in a small penalty, meaning all-rounders tend to earn more rating.

o!TR intentionally does not take difficulty of maps into account for determining rating. This is because we wish to measure **performance rather than skill**: "sandbaggers" who play in low-rank-range tournaments will likely have inflated ratings. This makes it sensible for o!TR to be used as a **filtering tool** for tournaments who wish to exclude those sandbaggers.

## Why did I gain / lose rating from a match even when I lost / won?

Only **placements and participation** factor into rating changes; match scorelines and individual game wins/losses do not affect rating gain. Thus, a player who plays and top-scores every map will always gain rating, even if their team loses every pick.

Additionally, higher-rated players may lose rating if they perform **worse than expected**, even if they are still outperforming lower-rated players. One way to think about this is that higher-rated players gain less rating in each game where they place well, and they also lose more rating per game in each game where they place poorly.

## Why are my rating changes larger / smaller than other players?

In addition to rating, we also track players' **volatility**, which measures how confident the system is about a player's rating. Volatility decreases as players compete in matches, and it increases slowly over time. The higher a player's volatility, the more their rating will change each match.

## What are the differences between o!TR and Skill Issue?

Skill Issue evaluates head-to-head matchups similarly to o!TR, but it does so at a more precise level (giving ratings for different mods and skillsets) and also incorporating an estimate of map difficulty into its final rating. So Skill Issue is particularly suitable for purposes like **choosing players for a draft team** or **determining best skillsets for matchups against opposing teams**. Meanwhile, o!TR is particularly suitable for purposes like **filtering out sandbaggers from lower rank ranges**, especially since our manual data verification process only allows actual matches from tournaments to factor into calculations.

## Why is a tournament not being included in my rating calculations?

All data must be submitted to the o!TR database and manually verified before it is included in rating calculations. Some tournaments do not meet the [[Tournament Approval#Acceptance criteria|acceptance criteria]] and thus will not be included, while other tournaments may be "pre-verified" (that is, pending manual review) and will be looked at soon. We only submit tournaments after all matches have concluded.

Feel free to check the list of [tournaments](https://otr.stagec.net/tournaments) on the website and let us know of any inaccuracies or confusing decisions. We're doing our best to keep the most accurate records possible!
