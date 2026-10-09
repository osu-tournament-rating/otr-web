---
title: Home
---
Welcome to the official osu! Tournament Rating (o!TR) documentation! Here you can learn about our API, applications, algorithms, how to contribute, and more.

## Overview

o!TR is a fully-featured rating system & data visualization suite for [osu!](https://osu.ppy.sh/) tournaments and their players. This tool was created to serve the osu! tournament community by providing useful metrics on players' abilities, tournament statistics, and more.

### Goal

Our goal is to rank players based on real-world tournament performance data. We aim to measure relative performance in osu! tournaments across different rank ranges while also providing relevant statistics.

> [!note]
> We do not aim to answer the question of "Who is the best osu! tournament player?". We instead aim to help players interpret performance history, in particular spotting high performers in lower rank ranges.

#### Deranking

For many years, the topic of "sandbagging" or "deranking" has been a hot one. osu! is highly unusual compared to most games in that competitive performance is not considered when determining who is eligible to participate in competitions (outside of [BWS](https://osu.ppy.sh/wiki/en/Tournaments/Badge-weighted_seeding)). In osu!, a player's [global rank](https://osu.ppy.sh/wiki/en/Ranking) (which changes mostly from solo play) is most often used as the barrier for entry. The problem is that this rank can be manipulated by highly skilled players due to how osu!'s current scoring methods work. Omitting the details as to how, it is possible for players to intentionally appear worse than they actually are - either by "deranking" or by not playing online at all.

We aim to solve this problem by assigning each player a number, known as their Tournament Rating (TR). This number moves up and down depending on how one performs compared to others in the same match.

### What makes us different?

#### Active maintenance and data integrity

To ensure validity of competitive data, tournament matches are only counted after match links are manually approved by the o!TR team. Qualifier lobbies, tryouts, scrimmages, and private tournaments are not included in this data. Additionally, any member of the community may submit requests to add tournaments, remove show matches, exclude warmups from matches, and so on. This way, rating is only affected by actual competitive play in a valid tournament, making artificial inflation or deflation more challenging than deranking a play in solo or setting up a fake tournament lobby to manipulate rating.

> [!warning]
> Players would need to intentionally influence the outcome of a match to manipulate their TR.

#### Website interactivity

All collected match data and rating histories are accessible via the o!TR website, along with various statistics and graphs about player performance. This allows us to display leaderboards, tournament and match-specific information, performance statistics across [mods](https://osu.ppy.sh/wiki/en/Gameplay/Game_modifier), and so on. The website is also where users may submit tournament data to be counted or report data to be removed.

#### Fundamental interpretation

There are other third-party tools which analyze tournament players' match performances. For example, [Elitebotix (ETX)](https://osu.ppy.sh/users/31050083) estimates a star rating level that one can play comfortably, and [Skill Issue (SIP)](https://osu.ppy.sh/community/forums/topics/1891677?n=1) measures relative ability across various skills. o!TR is specifically designed to gauge competitive performance.

In contrast to both ETX and SIP, o!TR intentionally does not take map difficulty into account. One effect of this is that players with significantly better o!TR ranking compared to ETX or SIP may likely be playing in tournaments significantly below their skill level.

#### Open-source code

o!TR is open source, compliant with osu! tournament [filtering rules](https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding), and communicates all algorithm changes publicly. This means it can be used for [filtering and seeding](https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding) in badged tournaments. We aim to have an open, compliant tool that meets the osu! community's high transparency standards.

#### Support for other rulesets

Our rating formulas and submission processes are equally applicable to osu!taiko, osu!catch, and osu!mania as osu!. We also separate osu!mania 4k and 7k leaderboards.

### Important note

> [!note]
> Users will notice their past rating history changing with each update to the algorithm. This ripple effect is similar to when osu! updates their [performance points](https://osu.ppy.sh/wiki/en/Performance_points) algorithm. These changes may be frequent during the o!TR public beta as formulas are tweaked and data is audited.
