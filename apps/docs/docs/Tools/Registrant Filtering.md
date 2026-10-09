The Registrant Filtering tool allows tournament hosts to filter registrants based on certain criteria which we maintain.

## Filter Criteria

Filters can be applied against:

- Ruleset
- Current rating
- Peak rating
- Number of verified tournaments played
- Number of verified matches played

We do not support filtering against osu! statistics, such as global rank or badge count, for these reasons:

1. If we do not have a player's osu! data at the time of filtering, it would have to be fetched on-demand, introducing significant slowdowns.
2. As osu! data is only fetched periodically, the filter may check against outdated information.
3. Supporting [BWS](https://osu.ppy.sh/wiki/en/Tournaments/Badge-weighted_seeding) and other custom criteria significantly increases the complexity of the tool, going beyond our scope and introducing too many edge cases.

If you would like to filter using osu! statistics in addition to o!TR statistics, we recommend using one of the publicly-available spreadsheet templates. These spreadsheets typically allow you to enter your own osu! API key to do the data fetching yourself. You can then combine the two filtering methods for a final list of eligible players. See the [Community Resources](https://osu.ppy.sh/community/forums/topics/2012941?n=1) osu! forum post for more information.

## Using the Tool

To use the tool, simply select the ruleset of your tournament, input your filter criteria, and paste a list containing the osu! IDs of all tournament registrants.

A report is then generated for review. Reports can be downloaded as a `.csv` file for import into a spreadsheet. The ID linked to the report can be looked up by anyone using our Filter Report tool.

## Notice to Tournament Hosts

You **must**:

1. Obtain written approval from [osu! support](mailto:tournaments@ppy.sh) before using our tool in an [officially-supported](https://osu.ppy.sh/wiki/en/Tournaments/Official_support) tournament.
2. Post the timestamp and filter report ID on your forum post. The tool will display a one-line template message which you may copy into the post directly.
3. Use our filtering system as intended. It is **expressly prohibited** to alter our filtering result for any reason. We store a detailed record of all inputs and outputs for auditing and verification purposes.

You should **consider**:

1. Saving the most recent public archive from the [public replicas site](https://data.otr.stagec.net) at the time of making the filter request. In the event of a disaster on our end, hosts are expected to provide the dataset to the [Tournament Committee](https://osu.ppy.sh/wiki/en/People/Tournament_Committee) when it comes time to review for badge eligibility.
