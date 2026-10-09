Rating decay exists to handle inactive players. Much like analogous systems in other competitive games, decay addresses the fact that player performance becomes more uncertain and typically declines as time passes.

Every player is assigned a [[Rating Calculation Overview#Rating|rating]] $\mu$ and [[Rating Calculation Overview#Volatility|volatility]] $\sigma$, and decay affects both of these properties.

## Volatility Decay

Every week, all players receive an adjustment which increases their volatility slightly. These adjustments are applied at Wednesday 12:00 UTC to all players after their first match date. More precisely, $\sigma^2$ increases by $500$, up to a maximum of the starting volatility for a new player. Therefore, players who are more active will have their volatility settle at a lower equilibrium.

> [!note]
> On average, player volatility decreases by roughly $2\%$ per match. Therefore, players who play one verified match per week will gradually settle towards a volatility around $112$, which is much lower than the starting volatility of $400$.

## Decay

If a player does not play in any verified tournaments in our dataset for a consecutive period of roughly **six months**, they will begin to decay.

While a player is decaying, their rating decreases by a small constant each week, down to a predetermined minimum. This minimum is set higher for players with higher peak ratings. More precisely, along with the [[Rating Decay#Volatility Decay|volatility decay]] mentioned above, $\mu$ decreases by $3$ points, down to $\frac{1}{2}(1000 + \text{player peak rating})$.

## Concerns

One common concern the o!TR team recognizes is that players may be incentivized to use rating decay or induce poor tournament performance to artificially reduce their TR, defeating the purpose of the system. However, the 6-month period is long enough and the rating decay rate is small enough that this would only make a noticeable difference for players who only participate in one or maybe two tournaments per year, which means isolating from all other tournament play during that period.

Calculable metrics such as player decay status and player volatility will be made available through an API should hosts wish to [filter](https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding) highly volatile players. Furthermore, matches can be manually flagged by the o!TR team to not be included if foul play has been detected, such as players teaming up and underperforming to reduce rating. This is a key advantage of the tournament and match approval system we have in place.
