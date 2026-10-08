---
tags:
  - math
---

This page is dedicated to carrying out calculations to demonstrate an example of rating changes from a single match. We will be following the logic described [[Rating Calculation Overview#Ranking & rating calculation|here]], so it is advised to read that page first. This page will focus on detailing the actual calculations used in the paper[^1] which introduces this rating model.

> [!note]
> It is not necessary to understand every calculation on this page to get a good sense of what the rating model is doing. This documentation exists primarily for those who are curious about the mathematics, and also so that the rating assignment process is more transparent than only specifying "the ratings are fed into a model and numbers come out of it."
>
> If you are interested more in the general philosophy of what ratings represent, it is highly recommended to read [[Rating Calculation Overview#Ranking & rating calculation|this page]] instead.

The sample match we will be using is [TYC: (I love happy dreams) vs (ben)](https://otr.stagec.net/matches/128654) ([osu! link](https://osu.ppy.sh/community/matches/112506508)). It was chosen for its relatively short length and smaller format—2v2, team size 3—while still effectively illustrating the main ideas.

We will assume the six players who played in the match had the following ratings and volatilities immediately before this match, and we will calculate their ratings and volatilities after the match ends. **Please note that these values are not the actual ratings of these players; these are sample numbers for illustration purposes.**

|                       Player                       | Rating ($\mu$) | Volatility ($\sigma$) |
| :------------------------------------------------: | :------------: | :-------------------: |
|   [thighhigh](https://osu.ppy.sh/users/25778339)   |     $1300$     |         $280$         |
| [PotjeNutella](https://osu.ppy.sh/users/10926707)  |     $1350$     |         $180$         |
| [Miori Celesta](https://osu.ppy.sh/users/7023000)  |     $1250$     |         $150$         |
|    [CMeFly](https://osu.ppy.sh/users/12195391)     |     $1200$     |         $170$         |
| [Piemanray314](https://osu.ppy.sh/users/14180303)  |     $1100$     |         $280$         |
| [glixh\_hunt3r](https://osu.ppy.sh/users/27298689) |     $1250$     |         $340$         |

Note that all games in this match were verified, so all of them will be used for rating calculation. If there were a game with incorrect lobby sizes (because of a disconnect) or an incorrect beatmap ID (because of a warmup), those would be excluded for the corresponding rejection reasons.

## Method A Calculation

In Method A of calculating rating changes, we first look at the four players of each game and rank their scores from highest to lowest. The teams that the players play for and the mods that they use are irrelevant, since no maps were played with the EZ mod (which would receive a 1.75x multiplier). Thus the rankings are as shown:

| Game |     1st      |      2nd      |      3rd      |      4th      |
| :--: | :----------: | :-----------: | :-----------: | :-----------: |
| $1$  |  thighhigh   | glixh\_hunt3r | Miori Celesta | PotjeNutella  |
| $2$  |    CMeFly    | PotjeNutella  |   thighhigh   | glixh\_hunt3r |
| $3$  | PotjeNutella |   thighhigh   | Miori Celesta | Piemanray314  |
| $4$  | PotjeNutella | Piemanray314  | glixh\_hunt3r |    CMeFly     |
| $5$  |  thighhigh   | Miori Celesta | PotjeNutella  | Piemanray314  |
| $6$  | PotjeNutella |    CMeFly     |   thighhigh   | glixh\_hunt3r |

These rankings are the only information taken into account for rating calculations (individual scores are not considered). For each game, the players who play in it will be given a "game rating change." All games are calculated in the same way, so we will demonstrate this process for the first game.

Here, we follow the notation and logic of Algorithm 4 of the paper (found on page 21 in the link[^1]). The description also references Algorithm 1, which can be found on page 15.

First, we compute an overall uncertainty constant $c$, which is given by

$$c = \sqrt{4\beta^2 + \sigma_{\text{thighhigh}}^2 + \sigma_{\text{glixh\_hunt3r}}^2 + \sigma_{\text{Miori Celesta}}^2 + \sigma_{\text{PotjeNutella}}^2} \approx \boxed{639.45}.$$

Here $\beta = 200$ is a constant specified by our [constants file](https://github.com/osu-tournament-rating/otr-web/blob/master/apps/processor/src/model/constants.rs), and the other four terms in the square roots come from the volatilities of the four players prior to the match. This $c$ is used to compute the predicted probabilities of players placing in various orders. It roughly means that for this game, a difference of $c \approx 639.45$ rating points between two players means the higher-rated player has $e \approx 2.7$ times the chance of placing above the lower-rated player.

Next, we calculate two values $\Omega$ and $\Delta$ for each player in the game. These specify an _additive_ rating change and a _multiplicative_ volatility change, respectively. Instead of repeating all of the formulas from the paper, we will try to work out an example in understandable words.

First, consider the player who placed highest, thighhigh in this case. The model currently thinks the probability that thighhigh will rank highest is

$$p_{\text{thighhigh 1st}} = \frac{e^{\mu_{\text{thighhigh}}/c}}{e^{\mu_{\text{thighhigh}}/c} + e^{\mu_{\text{glixh\_hunt3r}}/c}+ e^{\mu_{\text{Miori Celesta}}/c} + e^{\mu_{\text{PotjeNutella}}/c}} \approx 0.254,$$

where we are plugging in the pre-match ratings from our table above. This is roughly $\frac{1}{4}$ because all four players have similar pre-match ratings. thighhigh's suggested rating change from this game is then

$$\Omega_{\text{thighhigh}} = \frac{\sigma_{\text{thighhigh}}^2}{c} (1 - p_{\text{thighhigh 1st}}) \approx \boxed{91.4},$$

and the factor by which their rating variance (squared volatility) should be decreased is

$$\Delta_{\text{thighhigh}} = \frac{\sigma_{\text{thighhigh}}^2}{c^2}p_{\text{thighhigh 1st}}(1 - p_{\text{thighhigh 1st}}) \approx \boxed{0.036}.$$

We do not include the "variance damping factor" $\gamma_q$ found on page 26 of the paper[^1], because volatility is instead increased by decay outside of matches. Notice that the less likely the model thinks it is for thighhigh to place first, and also the higher their volatility, the higher their suggested rating change.

Next, consider the second-highest-ranking player, glixh\_hunt3r. The model now cares about both the probability of glixh\_hunt3r ranking highest (notice this is slightly lower than $\frac{1}{4}$ because glixh\_hunt3r has the lowest pre-match rating),

$$p_{\text{glixh\_hunt3r 1st}} = \frac{e^{\mu_{\text{glixh\_hunt3r}}/c}}{e^{\mu_{\text{thighhigh}}/c} + e^{\mu_{\text{glixh\_hunt3r}}/c}+ e^{\mu_{\text{Miori Celesta}}/c} + e^{\mu_{\text{PotjeNutella}}/c}} \approx 0.235,$$

as well as the probability of glixh\_hunt3r ranking highest except for thighhigh,

$$p_{\text{glixh\_hunt3r 2nd}} = \frac{e^{\mu_{\text{glixh\_hunt3r}}/c}}{e^{\mu_{\text{glixh\_hunt3r}}/c}+ e^{\mu_{\text{Miori Celesta}}/c} + e^{\mu_{\text{PotjeNutella}}/c}} \approx 0.316.$$

glixh\_hunt3r's suggested rating change from this game is then

$$\Omega_{\text{glixh\_hunt3r}} = \frac{\sigma_{\text{glixh\_hunt3r}}^2}{c} (1 - p_{\text{glixh\_hunt3r 1st}} - p_{\text{glixh\_hunt3r 2nd}}) \approx \boxed{81.2},$$

and their variance decrease factor is

$$\Delta_{\text{glixh\_hunt3r}} = \frac{\sigma_{\text{glixh\_hunt3r}}^2}{c^2}\Big(p_{\text{glixh\_hunt3r 1st}}(1 - p_{\text{glixh\_hunt3r 1st}}) + p_{\text{glixh\_hunt3r 2nd}}(1 - p_{\text{glixh\_hunt3r 2nd}})\Big) \approx \boxed{0.112}.$$

This suggested rating increase is smaller than thighhigh's suggested rating increase, essentially because placing second means the formula for $\Omega$ "subtracts off two probabilities instead of one." But it is not much smaller because glixh\_hunt3r's pre-match volatility is larger than thighhigh's.

> [!note]
> The quantity $p_{\text{glixh\_hunt3r 2nd}}$ is _not_ the overall probability of glixh\_hunt3r placing 2nd among the four players, but instead the probability that _assuming_ thighhigh placed first, glixh\_hunt3r ranks above the other players. We use this slightly less precise language for readability.

Next, to calculate rating changes for the third-highest-ranking player Miori Celesta, the model cares about the probability of Miori Celesta ranking highest, ranking highest except for thighhigh, and also ranking highest except for thighhigh and glixh\_hunt3r. The resulting numbers are

$$p_{\text{Miori Celesta 1st}} \approx 0.235, \quad p_{\text{Miori Celesta 2nd}} \approx 0.316, \quad p_{\text{Miori Celesta 3rd}} \approx 0.461.$$

From this, we get that Miori Celesta's suggested rating change is

$$\Omega_{\text{Miori Celesta}} = \frac{\sigma_{\text{Miori Celesta}}^2}{c} (1 - p_{\text{Miori Celesta 1st}} - p_{\text{Miori Celesta 2nd}} - p_{\text{Miori Celesta 3rd}}) \approx \boxed{-0.4},$$

and their variance decrease factor is

$$\Delta_{\text{Miori Celesta}} = \frac{\sigma_{\text{Miori Celesta}}^2}{c^2}\Big(p_{\text{Miori Celesta 1st}}(1 - p_{\text{Miori Celesta 1st}}) + p_{\text{Miori Celesta 2nd}}(1 - p_{\text{Miori Celesta 2nd}}) + p_{\text{Miori Celesta 3rd}}(1 - p_{\text{Miori Celesta 3rd}})\Big) \approx \boxed{0.035}.$$

Finally, to calculate rating changes for the fourth-highest-ranking player PotjeNutella, we must compute

$$p_{\text{PotjeNutella 1st}} \approx 0.275, \quad p_{\text{PotjeNutella 2nd}} \approx 0.369, \quad p_{\text{PotjeNutella 3rd}} = 0.539, \quad p_{\text{PotjeNutella 4th}} = 1.$$

Using formulas similar to the ones above (just with an extra term each), we then find that

$$\Omega_{\text{PotjeNutella}} \approx \boxed{-59.9}, \quad \Delta_{\text{PotjeNutella}} \approx \boxed{0.054}.$$

Remember that all of this was done just for the first game of the match, but the exact same procedure works for all of the other games in the match. Here are the resulting values of $c$, $\Omega_i$, and $\Delta_i$ for each one, rounded for readability (if a player did not play in a game, then the corresponding cells are left blank):

| Game | $c$     | $\Omega_{\text{thighhigh}}$ | $\Omega_{\text{PotjeNutella}}$ | $\Omega_{\text{Miori Celesta}}$ | $\Omega_{\text{CMeFly}}$ | $\Omega_{\text{Piemanray314}}$ | $\Omega_{\text{glixh\_hunt3r}}$ | $\Delta_{\text{thighhigh}}$ | $\Delta_{\text{PotjeNutella}}$ | $\Delta_{\text{Miori Celesta}}$ | $\Delta_{\text{CMeFly}}$ | $\Delta_{\text{Piemanray314}}$ | $\Delta_{\text{glixh\_hunt3r}}$ |
| :--: | ------- | --------------------------- | ------------------------------ | ------------------------------- | ------------------------ | ------------------------------ | ------------------------------- | --------------------------- | ------------------------------ | ------------------------------- | ------------------------ | ------------------------------ | ------------------------------- |
| $1$  | $639.5$ | $91.4$                      | $-59.9$                        | $-0.4$                          |                          |                                | $81.2$                          | $0.036$                     | $0.054$                        | $0.035$                         |                          |                                | $0.112$                         |
| $2$  | $644.4$ | $-13.5$                     | $18.1$                         |                                 | $34.9$                   |                                | $-184.4$                        | $0.125$                     | $0.034$                        |                                 | $0.012$                  |                                | $0.180$                         |
| $3$  | $609.7$ | $45.4$                      | $37.7$                         | $-5.8$                          |                          | $-116.3$                       |                                 | $0.091$                     | $0.018$                        | $0.040$                         |                          | $0.127$                        |                                 |
| $4$  | $644.4$ |                             | $35.2$                         |                                 | $-47.5$                  | $61.4$                         | $-26.0$                         |                             | $0.016$                        |                                 | $0.046$                  | $0.070$                        | $0.187$                         |
| $5$  | $609.7$ | $94.1$                      | $-15.4$                        | $15.3$                          |                          | $-110.1$                       |                                 | $0.041$                     | $0.060$                        | $0.025$                         |                          | $0.124$                        |                                 |
| $6$  | $644.4$ | $-16.8$                     | $36.2$                         |                                 | $21.1$                   |                                | $-188.9$                        | $0.127$                     | $0.016$                        |                                 | $0.027$                  |                                | $0.182$                         |

## Method B Calculation

In Method B of calculating rating changes, we again begin by ranking scores from highest to lowest, but we now treat any players who did not play a game as tying for last place. This yields the following table:

| Game |     1st      |      2nd      |      3rd      |      4th      | Tied 5th                    |
| :--: | :----------: | :-----------: | :-----------: | :-----------: | --------------------------- |
| $1$  |  thighhigh   | glixh\_hunt3r | Miori Celesta | PotjeNutella  | CMeFly, Piemanray314        |
| $2$  |    CMeFly    | PotjeNutella  |   thighhigh   | glixh\_hunt3r | Miori Celesta, Piemanray314 |
| $3$  | PotjeNutella |   thighhigh   | Miori Celesta | Piemanray314  | CMeFly, glixh\_hunt3r       |
| $4$  | PotjeNutella | Piemanray314  | glixh\_hunt3r |    CMeFly     | thighhigh, Miori Celesta    |
| $5$  |  thighhigh   | Miori Celesta | PotjeNutella  | Piemanray314  | CMeFly, glixh\_hunt3r       |
| $6$  | PotjeNutella |    CMeFly     |   thighhigh   | glixh\_hunt3r | Miori Celesta, Piemanray314 |

We will again demonstrate how game rating changes look by calculating the rating changes for the first game. This time, we have the overall uncertainty factor

$$c = \sqrt{6\beta^2 + \sigma_{\text{thighhigh}}^2 + \sigma_{\text{PotjeNutella}}^2 + \sigma_{\text{Miori Celesta}}^2 + \sigma_{\text{CMeFly}}^2 + \sigma_{\text{Piemanray314}}^2 + \sigma_{\text{glixh\_hunt3r}}^2} \approx \boxed{772.1}.$$

With this, $\Omega$ and $\Delta$ values are calculated for all six players based on the rankings in game 1:

The highest-ranking player, thighhigh, now has

$$p_{\text{thighhigh 1st}} = \frac{e^{\mu_{\text{thighhigh}}/c}}{e^{\mu_{\text{thighhigh}}/c} + e^{\mu_{\text{PotjeNutella}}/c}+ e^{\mu_{\text{Miori Celesta}}/c} + e^{\mu_{\text{CMeFly}}/c} + e^{\mu_{\text{Piemanray314}}/c} + e^{\mu_{\text{glixh\_hunt3r}}/c}} \approx 0.179,$$

so that (very similarly to above)

$$\Omega_{\text{thighhigh}} = \frac{\sigma_{\text{thighhigh}}^2}{c} (1 - p_{\text{thighhigh 1st}}) \approx \boxed{83.4}$$

and

$$\Delta_{\text{thighhigh}} = \frac{\sigma_{\text{thighhigh}}^2}{c^2}p_{\text{thighhigh 1st}}(1 - p_{\text{thighhigh 1st}}) \approx \boxed{0.019}.$$

The calculations for players 2 through 4 are very similar. For the second-highest-ranking player glixh\_hunt3r, we find

$$p_{\text{glixh\_hunt3r 1st}} \approx 0.168, \quad p_{\text{glixh\_hunt3r 2nd}} \approx 0.204,$$

leading to

$$\Omega_{\text{glixh\_hunt3r}} \approx \boxed{94.1}, \quad \Delta_{\text{glixh\_hunt3r}} \approx \boxed{0.059}.$$

For the third-highest-ranking player Miori Celesta,

$$p_{\text{Miori Celesta 1st}} \approx 0.168, \quad p_{\text{Miori Celesta 2nd}} \approx 0.204, \quad p_{\text{Miori Celesta 3rd}} \approx 0.256,$$

leading to

$$\Omega_{\text{Miori Celesta}} = \boxed{10.8}, \quad \Delta_{\text{Miori Celesta}} \approx \boxed{0.019}.$$

For the fourth-highest-ranking player PotjeNutella,

$$p_{\text{PotjeNutella 1st}} \approx 0.191, \quad p_{\text{PotjeNutella 2nd}} \approx 0.232, \quad p_{\text{PotjeNutella 3rd}} \approx 0.292, \quad p_{\text{PotjeNutella 4th}} \approx 0.393,$$

leading to

$$\Omega_{\text{PotjeNutella}} = \boxed{-4.5}, \quad \Delta_{\text{PotjeNutella}} \approx \boxed{0.042}.$$

Finally, the model handles last-place ties by essentially equalizing the rating gains they would have in the different positions. For CMeFly, we have

$$\begin{align*}p_{\text{CMeFly 1st}} &\approx 0.157, \quad p_{\text{CMeFly 2nd}} \approx 0.191, \quad p_{\text{CMeFly 3rd}} \approx 0.240, \\ p_{\text{CMeFly 4th}} &\approx 0.323, \quad p_{\text{CMeFly 5th}} \approx 0.532,\end{align*}$$

and the suggested rating change is then

$$\begin{align*}\Omega_{\text{CMeFly}} = &\frac{\sigma^2_{\text{CMeFly}}}{c}\Big(\frac{1}{2} - p_{\text{CMeFly 1st}} - p_{\text{CMeFly 2nd}} \\&\qquad-\, p_{\text{CMeFly 3rd}}- p_{\text{CMeFly 4th}} - p_{\text{CMeFly 5th}}\Big) \approx \boxed{-35.4}\end{align*}$$

(more generally if there is an $r$-way tie, the $\frac{1}{2}$ becomes a $\frac{1}{r}$), while the suggested variance decrease factor has the same form of formula as before:

$$\begin{align*}\Delta_{\text{CMeFly}} = \frac{\sigma_{\text{CMeFly}}^2}{c^2}\Big(&p_{\text{CMeFly 1st}}(1 - p_{\text{CMeFly 1st}}) + p_{\text{CMeFly 2nd}}(1 - p_{\text{CMeFly 2nd}}) \\ &+ \cdots + p_{\text{CMeFly 5th}}(1 - p_{\text{CMeFly 5th}})\Big) \approx \boxed{0.145}.\end{align*}$$

Similarly, for Piemanray314 we have

$$\begin{align*}p_{\text{Piemanray314 1st}} &\approx 0.138, \quad p_{\text{Piemanray314 2nd}} \approx 0.168, \quad p_{\text{Piemanray314 3rd}} \approx 0.211, \\ p_{\text{Piemanray314 4th}} &\approx 0.284, \quad p_{\text{Piemanray314 5th}} \approx 0.467,\end{align*}$$

and with the same formulas as CMeFly we find

$$\Omega_{\text{Piemanray314}} \approx \boxed{-78.1}, \quad \Delta_{\text{Piemanray314}} \approx \boxed{0.115}.$$

Here is the table of $\Omega_i$ and $\Delta_i$ values under Method B. Note that we no longer have a column for $c$ because it is the same across all games in this method (all six players are considered in all games).

| Game | $\Omega_{\text{thighhigh}}$ | $\Omega_{\text{PotjeNutella}}$ | $\Omega_{\text{Miori Celesta}}$ | $\Omega_{\text{CMeFly}}$ | $\Omega_{\text{Piemanray314}}$ | $\Omega_{\text{glixh\_hunt3r}}$ | $\Delta_{\text{thighhigh}}$ | $\Delta_{\text{PotjeNutella}}$ | $\Delta_{\text{Miori Celesta}}$ | $\Delta_{\text{CMeFly}}$ | $\Delta_{\text{Piemanray314}}$ | $\Delta_{\text{glixh\_hunt3r}}$ |
| :--: | --------------------------- | ------------------------------ | ------------------------------- | ------------------------ | ------------------------------ | ------------------------------- | --------------------------- | ------------------------------ | ------------------------------- | ------------------------ | ------------------------------ | ------------------------------- |
| $1$  | $83.4$                      | $-4.5$                         | $10.8$                          | $-35.4$                  | $-78.1$                        | $94.1$                          | $0.019$                     | $0.042$                        | $0.019$                         | $0.045$                  | $0.115$                        | $0.059$                         |
| $2$  | $34.0$                      | $24.5$                         | $-29.9$                         | $31.5$                   | $-76.8$                        | $3.3$                           | $0.067$                     | $0.018$                        | $0.036$                         | $0.006$                  | $0.115$                        | $0.139$                         |
| $3$  | $60.9$                      | $34.0$                         | $10.5$                          | $-34.6$                  | $17.7$                         | $-152.6$                        | $0.042$                     | $0.008$                        | $0.019$                         | $0.046$                  | $0.084$                        | $0.190$                         |
| $4$  | $-105.4$                    | $34.0$                         | $-27.4$                         | $3.8$                    | $70.2$                         | $56.2$                          | $0.131$                     | $0.008$                        | $0.036$                         | $0.033$                  | $0.034$                        | $0.095$                         |
| $5$  | $83.4$                      | $12.0$                         | $18.3$                          | $-34.1$                  | $18.7$                         | $-150.7$                        | $0.019$                     | $0.029$                        | $0.011$                         | $0.046$                  | $0.083$                        | $0.189$                         |
| $6$  | $33.1$                      | $34.0$                         | $-30.1$                         | $24.3$                   | $-77.5$                        | $2.1$                           | $0.068$                     | $0.008$                        | $0.037$                         | $0.014$                  | $0.116$                        | $0.140$                         |

Comparing to the previous table, we can see that rating changes are typically more positive in Method B for players who played in a game, and they are very negative for players who did not play.

## Overall Changes

Finally, we essentially do a weighted average of all of these numbers to determine the final rating changes for the whole match. For simplicity, we will demonstrate this just for one of the players, Piemanray314.

We first average the values of $\Omega_{\text{Piemanray314}}$ across Methods A and B at a $90\%$:$10\%$ ratio to get an "effective average $\Omega$"

$$
\begin{align*}\Omega_{\text{eff}} = 0.9&\left(\frac{0 + 0 - 116.3 + 61.4 - 110.1 + 0}{6}\right) \\
&+ 0.1\left(\frac{-78.1-76.8+17.7+70.2+18.7-77.5}{6}\right) \approx -26.8.\end{align*}
$$

Similarly, we first obtain an "effective averaged $\Delta$" by calculating

$$
\begin{align*}\Delta_{\text{eff}} = 0.9&\left(\frac{0 + 0 + 0.127 + 0.070 + 0.124 + 0}{6}\right) \\ &+ 0.1\left(\frac{0.115 + 0.115 + 0.084 + 0.034 + 0.083 + 0.116}{6}\right) \approx 0.057.\end{align*}
$$

Finally, Piemanray314's final rating and volatility are calculated by using these effective values to modify the initial rating and volatility:

$$
\begin{align*}\mu_{\text{Piemanray314}}^{\text{new}} &= 1100 + \left(\frac{6}{8}\right)^{0.5} \Omega_{\text{eff}} \approx \boxed{1076.7},\\
\sigma_{\text{Piemanray314}}^{\text{new}} &= 280 \sqrt{1 - \left(\frac{6}{8}\right)^{0.5} \Delta_{\text{eff}}} \approx \boxed{273.0}.\end{align*}
$$

The factor of $\left(\frac{\text{games}}{8}\right)^{0.5}$ increases rating changes for longer games, so because this match ended quickly, the rating changes are slightly dampened. The table below shows the resulting adjustments to ratings and volatilities for all six players of this match, rounded to the nearest tenth.

|                       Player                       |  Rating ($\mu$)   | Volatility ($\sigma$) |
| :------------------------------------------------: | :---------------: | :-------------------: |
|   [thighhigh](https://osu.ppy.sh/users/25778339)   | $1300 \to 1328.8$ |    $280 \to 271.5$    |
| [PotjeNutella](https://osu.ppy.sh/users/10926707)  | $1350 \to 1358.7$ |    $180 \to 177.5$    |
| [Miori Celesta](https://osu.ppy.sh/users/7023000)  | $1250 \to 1250.5$ |    $150 \to 148.8$    |
|    [CMeFly](https://osu.ppy.sh/users/12195391)     | $1200 \to 1200.5$ |    $170 \to 168.8$    |
| [Piemanray314](https://osu.ppy.sh/users/14180303)  | $1100 \to 1076.7$ |    $280 \to 273.0$    |
| [glixh\_hunt3r](https://osu.ppy.sh/users/27298689) | $1250 \to 1206.6$ |    $340 \to 323.0$    |

All players' volatilities have decreased, indicating that the model is slightly more confident about the updated ratings. The player thighhigh's rating has significantly increased due to their relatively high participation and placement among players throughout the match. Note that overall rating changes are not precisely zero-sum due to the differences in players' volatilities.

[^1]: Weng, Ruby & Lin, Chih-Jen. (2011). A Bayesian Approximation Method for Online Ranking. Journal of Machine Learning Research. 12. 267-300. <https://jmlr.csail.mit.edu/papers/volume12/weng11a/weng11a.pdf>.
