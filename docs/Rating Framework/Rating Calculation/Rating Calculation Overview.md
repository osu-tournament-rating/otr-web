---
tags:
  - math
---

o!TR primarily uses the OpenSkill algorithm[^1], specifically using the Plackett-Luce ranking model. The implementation source code can be found in the [otr-web repository](https://github.com/osu-tournament-rating/otr-web/blob/master/apps/processor/src/model/otr_model.rs). In short, OpenSkill is a system similar to the [Elo](https://en.wikipedia.org/wiki/Elo_rating_system) or [Glicko/Glicko-2](https://en.wikipedia.org/wiki/Glicko_rating_system) rating systems used in games like chess. It assigns each player an approximate rating and volatility, where a higher volatility means more opportunity for the rating to increase or decrease. Rating updates are performed based on relative performance of players in a match.

## Rating

Rating (a.k.a. Tournament Rating or TR) is the number used to quantify an individual's tournament performance. This number, combined with [[Rating Calculation Overview#Volatility|volatility]], is used by the OpenSkill model to determine how likely someone is to come out ahead against someone else in a tournament match. Rating changes are more drastic when lower-rated players perform better than higher-rated players.

The [[Initial Ratings|initial rating]] each player is assigned is not nearly as important as the subsequent adjustments from tournament performance. Like other games with competitive ladders, players will initially see higher fluctuations in their rating until the system becomes more confident in their abilities. Players should not worry about being stuck at a certain range; a better rating will follow from better match performance.

## Volatility

Volatility is the number that determines how confident the model is in one's [[Rating Calculation Overview#Rating|Rating]]. The higher this value, the less confident the model is in one's rating. More precisely, volatility is the standard deviation in the posterior estimate of a player's rating.

> [!example]
> Consider the following:
>
> - Rating is $2000$
> - Volatility is $150$
>
> Based on their performance in tournaments thus far, the model is about $68\%$ sure that this player's true rating is between $1850$ and $2150$ and about $95\%$ sure it is between $1700$ and $2300$. This estimate will increase in accuracy as they play more matches.

Players start off with a high volatility value which decreases as they compete in tournaments and increases due to [[Rating Decay|decay]].

## Ranking & rating calculation

The rating calculation algorithm (that is, the function responsible for changing a player's TR) is a bit complicated, so let's break it down.

Each player receives a single rating update for each match that they play. However, we must account for their scores first on a game-by-game basis. The process for doing this is as follows. First, a snapshot of all players' ratings are stored before the match begins. Then, on a per-game basis, the following occurs:

1. Rank all players who played in the game by their ScoreV2 score. The team for which they play does not matter, and neither does the exact score or score gap.

2. Feed the rankings and rating snapshots into the model (see below for more details).

3. Store the results (changes in rating & volatility) for lookup later. If a player played in the match but did not play in this game, the changes for the game are marked as zero.

The results are then averaged over all games to obtain an overall rating and volatility change, which we call "Method A." However, using these numbers alone would cause specialists who play only a few games (and perform well) to be over-rated compared to generalists. Thus, a second set of overall rating changes are also computed, where not playing a game is now considered tying for last. We call these numbers "Method B."

Finally, these two sets of changes are combined at a weighted average of $90\%$:$10\%$. This result is then scaled by game count so that longer matches have a more substantial impact on rating changes. More concretely, the actual change stored in a player's rating history is

$$
\begin{equation}
    \text{rating change} = \left(\frac{\text{\# games}}{8}\right)^{0.5}\cdot (0.9 \cdot \text{rating change from Method A} + 0.1 \cdot \text{rating change from Method B}).
\end{equation}
$$

Volatility changes are calculated similarly but use a quadratic mean instead.

> [!note]
> This two-part process reflects how match performance is not only determined by raw scores, but also the degree to which players must "fill in" for their team members. Many of the choices of constants, such as the weighting of $90\%$:$10\%$ and the game correction constant $0.5$, are not absolutely essential to the validity of the rating algorithm; we make a particular choice here to have something concrete.
>
> Other weights, such as a higher weight for official tournaments, were considered but decided against in favor of not over-complicating the algorithm.

## Further details

### Rating change formulas

The rating system itself is based on OpenSkill, which is a Bayesian approximation algorithm. Without going too deep into details, the algorithm assigns each player a rating $\mu$ and volatility $\sigma$, which together describe a distribution of predicted "true ratings" for that player.

When players compete against each other, a formula is used to calculate the probability of various outcomes (that is, of various relative rankings). The players' $\mu$ and $\sigma$ values are then adjusted based on how "surprising" the match outcome was.

In our case, this formula comes from the Plackett-Luce model, whose fundamental assumption is "irrelevance of alternatives". Specifically, Plackett-Luce is based on the idea that player A outperforms player B with the same probability, no matter who else is in the lobby. While this assumption is not completely true (as teammates may influence how often one participates), Plackett-Luce is still a model used in real-world ranking systems like poker standings where this assumption does not hold.

Quoting from page 9 of the original paper[^1], rating adjustments are calculated via "the average of the relative rate of change of \[a player's] winning probability with respect to \[their] strength," where the average is taken over the prior distribution. The actual Bayesian inference calculations for these types of models are computationally intensive, and OpenSkill is actually only an **approximation** of the full calculation (the paper discusses why the simplifications are reasonable).

### Choosing model parameters

There are various parameters that can be adjusted when setting up the model (see [the code](https://github.com/injae/openskill-rs/blob/main/src/model/plackett_luce.rs#L12) or page 25 of the paper[^1] for more detailed calculations). In words, $\mu$ and $\sigma$ are the rating and volatility mentioned above, $\beta$ is an "extra volatility" term for calculating head-to-head matchup probabilities, $\kappa$ is used as part of a check that volatility stays positive, and $\tau$ adds a small amount to variance (squared volatility) after each match. Finally, the function $\gamma$ is a dampening factor which causes volatility to decrease less significantly when matchups are large. Intuitively, this can be thought of as not treating a match with $10$ players as affecting rating as much as $9$ separate 1v1s against each opponent.

The Plackett-Luce model allows for arbitrary scalings of parameters, though the OpenSkill documentation recommends that $\sigma$ starts out as $1/3$ of $\mu$. We choose a scaling here so that the distribution looks somewhat similar to chess (solely for aesthetic appeal), though we do choose varying [[Initial Ratings|initial ratings]] based on osu! rank. Other than this, we keep the default scaling of all parameters except the volatility increase factor $\tau$ and dampening factor $\gamma$, which we completely remove. This is because $\tau$ and $\gamma$ do not show up in the original mathematical derivation for this model and were instead included to improve situations where $\sigma$ decreased too rapidly. We instead resolve this issue through [[Rating Decay|decay]].

Remember that different players specialize in different skillsets and have skillcaps at different levels, so please interpret TR not as an absolute skill comparison between two players. In particular, o!TR identifies when people **frequently win** relative to others in their rank range or skill level, so if you see a player with what seems like an unusually high rating, we recommend that you look at their tournament history and check if they're consistently the top performer in their matches.

### Interpretation of Method B

The inclusion of Method B in the rating algorithm should be thought of as a bonus for playing in the lobby, rather than actually asserting that all non-lobby players would tie for last if they were to actually play. It is included in this way so that rating changes are still essentially zero-sum[^2] and to guarantee rating gains to players who top score all games in the lobby. Such a bonus is necessary so that pure specialists are not buffed too much by only showing up for their specific skillsets.

A notable concern with Method B is that in very lopsided matches, specialist players on the dominant team will lose a disproportionate amount of rating when they are benched against lower-performing teams. For example, in the osu! World Cup, even if all eight players on a dominant team would put up very high scores, four of them are always forced to sit out, which negatively impacts their rating changes under Method B. While it is true that the 5th player on the dominant team would typically score higher than the 5th player on the weaker team, those scores do not actually contribute to the team score, and so it makes sense to count them equally as a measure of *performance*.

Remember that the algorithm is designed to filter out "sandbaggers" who are playing in tournaments below their skill level. Players whose rating gains are diminished by Method B are generally not the ones sandbagging the most because they are not the central reason that their team is winning. In contrast, players whose gains are increased by Method B are the all-rounders who have very high lobby participation. For these players, Method A will be the dominant factor as it makes up $90\%$ of the equation.

### Rating update schedule

Ratings will only be recalculated and updated once weekly at Tuesday 12:00 UTC. This time is chosen so that tournament hosts who close registrations during a weekend will have ample time to [filter](https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding) their players using o!TR-tracked statistics (e.g. rating, total tournaments played within a rank range, etc.).

> [!warning]
> Even if a player does not participate in any matches, their rating may still change between updates because of retroactive data changes (e.g. a newly added tournament or a removed warmup).

If your questions are not answered by the information provided here, please [[Contact|contact us]].

[^1]: Weng, Ruby & Lin, Chih-Jen. (2011). A Bayesian Approximation Method for Online Ranking. Journal of Machine Learning Research. 12. 267-300. <https://jmlr.csail.mit.edu/papers/volume12/weng11a/weng11a.pdf>.

[^2]: For example, in a 1v1 between player X with high volatility and player Y with low volatility, X will gain more rating for winning a game than Y loses for losing that same game. But the opposite is true when X loses against Y, so the net change is roughly zero in most situations.
