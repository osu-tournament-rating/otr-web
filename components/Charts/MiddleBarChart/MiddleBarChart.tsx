'use client';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { array } from 'zod';
import styles from './MiddleBarChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const exampleData = {
  teammateWinLoss: [
    {
      id: 2598,
      osuId: 11646616,
      username: '-Gardevoir-',
      winRate: 0.1935483870967742,
      frequency: 31,
    },
    {
      id: 6729,
      osuId: 15193535,
      username: 'Lamp',
      winRate: 0.3157894736842105,
      frequency: 19,
    },
    {
      id: 8893,
      osuId: 10941597,
      username: 'HFIG',
      winRate: 0.3333333333333333,
      frequency: 3,
    },
    {
      id: 7416,
      osuId: 5009715,
      username: 'Doga',
      winRate: 0.4074074074074074,
      frequency: 27,
    },
    {
      id: 10759,
      osuId: 9008727,
      username: 'lumenaire',
      winRate: 0.45454545454545453,
      frequency: 11,
    },
    {
      id: 1630,
      osuId: 3149395,
      username: 'richp2k',
      winRate: 0.4782608695652174,
      frequency: 46,
    },
    {
      id: 7119,
      osuId: 4722369,
      username: 'Lupa',
      winRate: 0.4827586206896552,
      frequency: 29,
    },
    {
      id: 3737,
      osuId: 12139352,
      username: 'NeoPixel201',
      winRate: 0.48333333333333334,
      frequency: 60,
    },
    {
      id: 5583,
      osuId: 18131614,
      username: 'polski1',
      winRate: 0.4880952380952381,
      frequency: 84,
    },
    {
      id: 5453,
      osuId: 17706086,
      username: 'Kwichi-',
      winRate: 0.5151515151515151,
      frequency: 66,
    },
    {
      id: 4920,
      osuId: 13720351,
      username: 'Mecha',
      winRate: 0.52,
      frequency: 25,
    },
    {
      id: 1980,
      osuId: 3162076,
      username: 'fooooooood',
      winRate: 0.5333333333333333,
      frequency: 30,
    },
    {
      id: 3899,
      osuId: 4426099,
      username: 'oob',
      winRate: 0.5384615384615384,
      frequency: 26,
    },
    {
      id: 3151,
      osuId: 7153533,
      username: 'onkar',
      winRate: 0.5394736842105263,
      frequency: 76,
    },
    {
      id: 1822,
      osuId: 14666725,
      username: 'Sirek',
      winRate: 0.5454545454545454,
      frequency: 33,
    },
    {
      id: 3641,
      osuId: 7989469,
      username: 'Zefkiel',
      winRate: 0.5575221238938053,
      frequency: 113,
    },
    {
      id: 7244,
      osuId: 4529885,
      username: 'Kotonashi',
      winRate: 0.5652173913043478,
      frequency: 23,
    },
    {
      id: 6553,
      osuId: 9878349,
      username: 'FILIPINO',
      winRate: 0.5714285714285714,
      frequency: 56,
    },
    {
      id: 5898,
      osuId: 14255332,
      username: 'gwk',
      winRate: 0.5740740740740741,
      frequency: 108,
    },
    {
      id: 120,
      osuId: 6204231,
      username: 'Unique',
      winRate: 0.578125,
      frequency: 64,
    },
    {
      id: 4605,
      osuId: 10350809,
      username: 'iamanewb',
      winRate: 0.5918367346938775,
      frequency: 98,
    },
    {
      id: 6498,
      osuId: 15950212,
      username: 'Jayyhk',
      winRate: 0.5925925925925926,
      frequency: 27,
    },
    {
      id: 12155,
      osuId: 6478018,
      username: 'Anri17',
      winRate: 0.6,
      frequency: 5,
    },
    {
      id: 6905,
      osuId: 3213430,
      username: 'Graguan',
      winRate: 0.6086956521739131,
      frequency: 23,
    },
    {
      id: 6628,
      osuId: 20630250,
      username: 'Stage my mommy',
      winRate: 0.6133333333333333,
      frequency: 150,
    },
    {
      id: 7108,
      osuId: 7644691,
      username: 'Pangetism',
      winRate: 0.6153846153846154,
      frequency: 26,
    },
    {
      id: 5545,
      osuId: 11740073,
      username: 'dyereflection',
      winRate: 0.6222222222222222,
      frequency: 45,
    },
    {
      id: 7118,
      osuId: 8070299,
      username: 'Khang4',
      winRate: 0.6666666666666666,
      frequency: 12,
    },
    {
      id: 4816,
      osuId: 12090610,
      username: 'Tatze',
      winRate: 0.6829268292682927,
      frequency: 123,
    },
    {
      id: 7608,
      osuId: 6512490,
      username: 'Simonosis',
      winRate: 0.7142857142857143,
      frequency: 14,
    },
    {
      id: 2861,
      osuId: 10287120,
      username: 'Tonatious',
      winRate: 0.875,
      frequency: 48,
    },
  ],
  opponentWinLoss: [
    {
      id: 4063,
      osuId: 13129738,
      username: 'Vladislavich',
      winRate: 0,
      frequency: 4,
    },
    {
      id: 10169,
      osuId: 18373235,
      username: 'AlsoStormy',
      winRate: 0,
      frequency: 3,
    },
    {
      id: 9777,
      osuId: 15183294,
      username: 'ferzis',
      winRate: 0,
      frequency: 2,
    },
    {
      id: 4868,
      osuId: 14887006,
      username: 'FatWolf',
      winRate: 0,
      frequency: 3,
    },
    {
      id: 4251,
      osuId: 11429719,
      username: 'denbin',
      winRate: 0,
      frequency: 2,
    },
    {
      id: 12156,
      osuId: 5402885,
      username: 'XLON',
      winRate: 0,
      frequency: 2,
    },
    {
      id: 3241,
      osuId: 13196066,
      username: 'Batu',
      winRate: 0.058823529411764705,
      frequency: 17,
    },
    {
      id: 9209,
      osuId: 16640072,
      username: 'Lysitea',
      winRate: 0.25,
      frequency: 8,
    },
    {
      id: 7926,
      osuId: 7672254,
      username: 'SharCookie',
      winRate: 0.25,
      frequency: 4,
    },
    {
      id: 3410,
      osuId: 6518510,
      username: '- Juno -',
      winRate: 0.25,
      frequency: 4,
    },
    {
      id: 4144,
      osuId: 16473262,
      username: 'Skyri',
      winRate: 0.25,
      frequency: 4,
    },
    {
      id: 2213,
      osuId: 2800253,
      username: 'fnayR',
      winRate: 0.2608695652173913,
      frequency: 23,
    },
    {
      id: 2999,
      osuId: 11239094,
      username: 'ShuPLe',
      winRate: 0.3125,
      frequency: 16,
    },
    {
      id: 3248,
      osuId: 9319605,
      username: 'Rosaitty',
      winRate: 0.3125,
      frequency: 16,
    },
    {
      id: 7565,
      osuId: 3457063,
      username: 'bemp',
      winRate: 0.3333333333333333,
      frequency: 12,
    },
    {
      id: 1431,
      osuId: 4796773,
      username: 'honeymint',
      winRate: 0.3333333333333333,
      frequency: 21,
    },
    {
      id: 12048,
      osuId: 15928955,
      username: 'JPR',
      winRate: 0.3333333333333333,
      frequency: 6,
    },
    {
      id: 8977,
      osuId: 16832578,
      username: 'MrPolik',
      winRate: 0.3333333333333333,
      frequency: 3,
    },
    {
      id: 7257,
      osuId: 14040540,
      username: 'kiri_',
      winRate: 0.3333333333333333,
      frequency: 9,
    },
    {
      id: 7609,
      osuId: 4432964,
      username: 'Angry',
      winRate: 0.3333333333333333,
      frequency: 3,
    },
    {
      id: 4044,
      osuId: 8186536,
      username: 'Meow_Son',
      winRate: 0.3695652173913043,
      frequency: 46,
    },
    {
      id: 1988,
      osuId: 6951543,
      username: 'HaHaNa',
      winRate: 0.375,
      frequency: 16,
    },
    {
      id: 11884,
      osuId: 11873333,
      username: 'xaeon',
      winRate: 0.38461538461538464,
      frequency: 13,
    },
    {
      id: 8782,
      osuId: 8788898,
      username: 'Shiragi',
      winRate: 0.39473684210526316,
      frequency: 38,
    },
    {
      id: 3378,
      osuId: 16218750,
      username: 'Humsterlol',
      winRate: 0.40625,
      frequency: 32,
    },
    {
      id: 7396,
      osuId: 2779077,
      username: 'Jayson Todd',
      winRate: 0.4166666666666667,
      frequency: 24,
    },
    {
      id: 6448,
      osuId: 10601504,
      username: 'Thoorn',
      winRate: 0.42857142857142855,
      frequency: 14,
    },
    {
      id: 1727,
      osuId: 10212581,
      username: 'Xicyte',
      winRate: 0.43478260869565216,
      frequency: 23,
    },
    {
      id: 4592,
      osuId: 12236584,
      username: 'sampai_',
      winRate: 0.43478260869565216,
      frequency: 23,
    },
    {
      id: 6411,
      osuId: 13627426,
      username: 'mort',
      winRate: 0.4375,
      frequency: 48,
    },
    {
      id: 5252,
      osuId: 11003085,
      username: 'emptypudding',
      winRate: 0.45,
      frequency: 20,
    },
    {
      id: 2489,
      osuId: 6471972,
      username: 'Tesco Meal Deal',
      winRate: 0.45454545454545453,
      frequency: 11,
    },
    {
      id: 5666,
      osuId: 4207965,
      username: 'Nekoraw',
      winRate: 0.45454545454545453,
      frequency: 33,
    },
    {
      id: 3143,
      osuId: 12835025,
      username: 'txFPS',
      winRate: 0.46511627906976744,
      frequency: 43,
    },
    {
      id: 7563,
      osuId: 20276851,
      username: 'wr8th',
      winRate: 0.47058823529411764,
      frequency: 17,
    },
    {
      id: 6554,
      osuId: 11959709,
      username: 'CallMeRed',
      winRate: 0.47619047619047616,
      frequency: 21,
    },
    {
      id: 5226,
      osuId: 13295091,
      username: 'amBad',
      winRate: 0.47619047619047616,
      frequency: 21,
    },
    {
      id: 1941,
      osuId: 3538079,
      username: 'Rainty',
      winRate: 0.4772727272727273,
      frequency: 44,
    },
    {
      id: 1630,
      osuId: 3149395,
      username: 'richp2k',
      winRate: 0.4782608695652174,
      frequency: 46,
    },
    {
      id: 3737,
      osuId: 12139352,
      username: 'NeoPixel201',
      winRate: 0.48333333333333334,
      frequency: 60,
    },
    {
      id: 1940,
      osuId: 2763354,
      username: 'Bunan-',
      winRate: 0.48484848484848486,
      frequency: 33,
    },
    {
      id: 6167,
      osuId: 10459580,
      username: 'Kagami',
      winRate: 0.4880952380952381,
      frequency: 84,
    },
    {
      id: 3169,
      osuId: 10733055,
      username: 'Hammer',
      winRate: 0.48936170212765956,
      frequency: 47,
    },
    {
      id: 2120,
      osuId: 12058601,
      username: 'Brown Guy 2',
      winRate: 0.49230769230769234,
      frequency: 65,
    },
    {
      id: 7568,
      osuId: 12612790,
      username: 'skins1fan1',
      winRate: 0.5,
      frequency: 4,
    },
    {
      id: 1719,
      osuId: 3604693,
      username: '- Dave -',
      winRate: 0.5,
      frequency: 8,
    },
    {
      id: 9072,
      osuId: 10361007,
      username: 'Arutairu',
      winRate: 0.5,
      frequency: 20,
    },
    {
      id: 7251,
      osuId: 12336674,
      username: 'SquidKidNow',
      winRate: 0.5,
      frequency: 4,
    },
    {
      id: 5555,
      osuId: 19606212,
      username: '[darkness]',
      winRate: 0.5,
      frequency: 16,
    },
    {
      id: 7564,
      osuId: 16097417,
      username: 'sakamoto1',
      winRate: 0.5,
      frequency: 2,
    },
    {
      id: 7021,
      osuId: 13942593,
      username: 'TramvaI',
      winRate: 0.5,
      frequency: 8,
    },
    {
      id: 7516,
      osuId: 11688228,
      username: 'updraft',
      winRate: 0.5151515151515151,
      frequency: 33,
    },
    {
      id: 1567,
      osuId: 11613306,
      username: 'AnnoyingManiac',
      winRate: 0.5151515151515151,
      frequency: 33,
    },
    {
      id: 4461,
      osuId: 4010492,
      username: 'Samba',
      winRate: 0.5172413793103449,
      frequency: 58,
    },
    {
      id: 3986,
      osuId: 20435329,
      username: 'begl',
      winRate: 0.5185185185185185,
      frequency: 27,
    },
    {
      id: 6870,
      osuId: 12201636,
      username: 'rety',
      winRate: 0.5254237288135594,
      frequency: 59,
    },
    {
      id: 5523,
      osuId: 11884028,
      username: 'Omores',
      winRate: 0.5294117647058824,
      frequency: 34,
    },
    {
      id: 6913,
      osuId: 12902475,
      username: 'NJ STRONG',
      winRate: 0.5294117647058824,
      frequency: 34,
    },
    {
      id: 6585,
      osuId: 13055978,
      username: 'Po1SoN3SS',
      winRate: 0.5319148936170213,
      frequency: 47,
    },
    {
      id: 4963,
      osuId: 10041480,
      username: 'Litten',
      winRate: 0.5384615384615384,
      frequency: 13,
    },
    {
      id: 3151,
      osuId: 7153533,
      username: 'onkar',
      winRate: 0.5394736842105263,
      frequency: 76,
    },
    {
      id: 4841,
      osuId: 13291701,
      username: 'Yue0428',
      winRate: 0.5483870967741935,
      frequency: 31,
    },
    {
      id: 11887,
      osuId: 16396650,
      username: 'Ayamaki',
      winRate: 0.5483870967741935,
      frequency: 31,
    },
    {
      id: 3812,
      osuId: 13445197,
      username: 'calculus',
      winRate: 0.55,
      frequency: 40,
    },
    {
      id: 6069,
      osuId: 5309981,
      username: 'Mouse Player',
      winRate: 0.55,
      frequency: 40,
    },
    {
      id: 2950,
      osuId: 16626263,
      username: 'hiyah',
      winRate: 0.5512820512820513,
      frequency: 78,
    },
    {
      id: 3685,
      osuId: 9560694,
      username: 'DuoX',
      winRate: 0.5538461538461539,
      frequency: 65,
    },
    {
      id: 7175,
      osuId: 4029900,
      username: 'Ariisu',
      winRate: 0.5555555555555556,
      frequency: 9,
    },
    {
      id: 5327,
      osuId: 9669947,
      username: 'tomatohung',
      winRate: 0.5555555555555556,
      frequency: 18,
    },
    {
      id: 9206,
      osuId: 23865299,
      username: 'AkiyamaMizuki',
      winRate: 0.5555555555555556,
      frequency: 9,
    },
    {
      id: 3641,
      osuId: 7989469,
      username: 'Zefkiel',
      winRate: 0.5575221238938053,
      frequency: 113,
    },
    {
      id: 6751,
      osuId: 18047706,
      username: 'seeeen11l1',
      winRate: 0.5581395348837209,
      frequency: 43,
    },
    {
      id: 5228,
      osuId: 10625776,
      username: 'Chloe Wing Kiu',
      winRate: 0.5609756097560976,
      frequency: 82,
    },
    {
      id: 3003,
      osuId: 15120913,
      username: 'VadimVas',
      winRate: 0.5609756097560976,
      frequency: 41,
    },
    {
      id: 1906,
      osuId: 2355080,
      username: 'Chris Jasorka',
      winRate: 0.5625,
      frequency: 48,
    },
    {
      id: 2250,
      osuId: 9804293,
      username: 'No skip',
      winRate: 0.5625,
      frequency: 16,
    },
    {
      id: 7259,
      osuId: 7023000,
      username: 'Finana Ryugu',
      winRate: 0.5641025641025641,
      frequency: 78,
    },
    {
      id: 5546,
      osuId: 9526124,
      username: 'tights',
      winRate: 0.5652173913043478,
      frequency: 92,
    },
    {
      id: 7244,
      osuId: 4529885,
      username: 'Kotonashi',
      winRate: 0.5652173913043478,
      frequency: 23,
    },
    {
      id: 8533,
      osuId: 11767545,
      username: 'Lemonv2',
      winRate: 0.5666666666666667,
      frequency: 30,
    },
    {
      id: 7233,
      osuId: 14396453,
      username: 'KingBaxter',
      winRate: 0.5686274509803921,
      frequency: 51,
    },
    {
      id: 5246,
      osuId: 10516802,
      username: 'Jotmo',
      winRate: 0.5714285714285714,
      frequency: 49,
    },
    {
      id: 6574,
      osuId: 11526714,
      username: 'ikaenia',
      winRate: 0.5714285714285714,
      frequency: 56,
    },
    {
      id: 6553,
      osuId: 9878349,
      username: 'FILIPINO',
      winRate: 0.5714285714285714,
      frequency: 56,
    },
    {
      id: 4840,
      osuId: 9984860,
      username: 'Yue0429',
      winRate: 0.5757575757575758,
      frequency: 33,
    },
    {
      id: 4966,
      osuId: 14309415,
      username: 'Lexic',
      winRate: 0.5818181818181818,
      frequency: 55,
    },
    {
      id: 1692,
      osuId: 11418478,
      username: 'Sspannish',
      winRate: 0.5909090909090909,
      frequency: 44,
    },
    {
      id: 4062,
      osuId: 13951894,
      username: 'steisha',
      winRate: 0.5909090909090909,
      frequency: 66,
    },
    {
      id: 4605,
      osuId: 10350809,
      username: 'iamanewb',
      winRate: 0.5918367346938775,
      frequency: 98,
    },
    {
      id: 1038,
      osuId: 10659233,
      username: 'BTG4',
      winRate: 0.5945945945945946,
      frequency: 111,
    },
    {
      id: 7536,
      osuId: 10487020,
      username: 'Fractured',
      winRate: 0.5952380952380952,
      frequency: 42,
    },
    {
      id: 4096,
      osuId: 11714674,
      username: 'phuc pinku',
      winRate: 0.6,
      frequency: 15,
    },
    {
      id: 5617,
      osuId: 14040810,
      username: 'gilgamesh815',
      winRate: 0.6,
      frequency: 25,
    },
    {
      id: 5505,
      osuId: 12578000,
      username: 'im a cute bunny',
      winRate: 0.6,
      frequency: 10,
    },
    {
      id: 9650,
      osuId: 16764402,
      username: 'rubrub',
      winRate: 0.6,
      frequency: 5,
    },
    {
      id: 3304,
      osuId: 6795168,
      username: 'kyniia',
      winRate: 0.6,
      frequency: 45,
    },
    {
      id: 3384,
      osuId: 6810671,
      username: 'dawerte',
      winRate: 0.6,
      frequency: 5,
    },
    {
      id: 7688,
      osuId: 12949657,
      username: 'Alu',
      winRate: 0.6031746031746031,
      frequency: 63,
    },
    {
      id: 1253,
      osuId: 10184558,
      username: 'deflateddolphin',
      winRate: 0.6046511627906976,
      frequency: 86,
    },
    {
      id: 2951,
      osuId: 8779023,
      username: 'THE QUEEN',
      winRate: 0.6071428571428571,
      frequency: 56,
    },
    {
      id: 6551,
      osuId: 1433427,
      username: 'myhan3',
      winRate: 0.6078431372549019,
      frequency: 51,
    },
    {
      id: 7581,
      osuId: 1284243,
      username: 'bananaman533',
      winRate: 0.6111111111111112,
      frequency: 18,
    },
    {
      id: 2749,
      osuId: 8084370,
      username: 'Poke714',
      winRate: 0.6136363636363636,
      frequency: 88,
    },
    {
      id: 7260,
      osuId: 12011021,
      username: 'unknownpattern',
      winRate: 0.6153846153846154,
      frequency: 13,
    },
    {
      id: 7108,
      osuId: 7644691,
      username: 'Pangetism',
      winRate: 0.6153846153846154,
      frequency: 26,
    },
    {
      id: 7340,
      osuId: 8666421,
      username: 'thacer',
      winRate: 0.6153846153846154,
      frequency: 13,
    },
    {
      id: 5449,
      osuId: 10728620,
      username: 'Nyura',
      winRate: 0.618421052631579,
      frequency: 76,
    },
    {
      id: 3276,
      osuId: 6867478,
      username: 'Buszek',
      winRate: 0.6185567010309279,
      frequency: 97,
    },
    {
      id: 4091,
      osuId: 10029074,
      username: 'thanh792001',
      winRate: 0.6190476190476191,
      frequency: 84,
    },
    {
      id: 4810,
      osuId: 11536421,
      username: 'zfr',
      winRate: 0.6263736263736264,
      frequency: 91,
    },
    {
      id: 4405,
      osuId: 3257847,
      username: 'MyzeJD',
      winRate: 0.6324786324786325,
      frequency: 117,
    },
    {
      id: 5331,
      osuId: 10644821,
      username: 'ThiPham',
      winRate: 0.6363636363636364,
      frequency: 11,
    },
    {
      id: 7361,
      osuId: 12620242,
      username: 'Kyulke',
      winRate: 0.6363636363636364,
      frequency: 11,
    },
    {
      id: 4959,
      osuId: 9340773,
      username: 'stanol',
      winRate: 0.6486486486486487,
      frequency: 37,
    },
    {
      id: 8976,
      osuId: 10676573,
      username: 'Birchman',
      winRate: 0.660377358490566,
      frequency: 53,
    },
    {
      id: 8709,
      osuId: 17272840,
      username: 'Nutricula',
      winRate: 0.6666666666666666,
      frequency: 12,
    },
    {
      id: 9026,
      osuId: 9082441,
      username: 'Pieris',
      winRate: 0.6666666666666666,
      frequency: 60,
    },
    {
      id: 4531,
      osuId: 4209818,
      username: 'Skyzie',
      winRate: 0.6727272727272727,
      frequency: 55,
    },
    {
      id: 3638,
      osuId: 14800198,
      username: 'stone_bream',
      winRate: 0.673469387755102,
      frequency: 49,
    },
    {
      id: 5073,
      osuId: 16102492,
      username: 'chocheman',
      winRate: 0.68,
      frequency: 25,
    },
    {
      id: 4816,
      osuId: 12090610,
      username: 'Tatze',
      winRate: 0.6829268292682927,
      frequency: 123,
    },
    {
      id: 3116,
      osuId: 9535265,
      username: 'Lanzhou',
      winRate: 0.6875,
      frequency: 16,
    },
    {
      id: 5381,
      osuId: 9728880,
      username: 'Gore_',
      winRate: 0.7111111111111111,
      frequency: 45,
    },
    {
      id: 11890,
      osuId: 9367417,
      username: '-Ryn-',
      winRate: 0.7142857142857143,
      frequency: 7,
    },
    {
      id: 7433,
      osuId: 12045415,
      username: 'FlLlPlNO',
      winRate: 0.75,
      frequency: 36,
    },
    {
      id: 7537,
      osuId: 12727907,
      username: 'Diabolikhaa',
      winRate: 0.75,
      frequency: 12,
    },
    {
      id: 3679,
      osuId: 5837033,
      username: 'goatstuckintree',
      winRate: 0.7777777777777778,
      frequency: 27,
    },
    {
      id: 3720,
      osuId: 5442251,
      username: 'mihari',
      winRate: 0.782608695652174,
      frequency: 46,
    },
    {
      id: 6778,
      osuId: 9529511,
      username: 'WOJT',
      winRate: 0.8,
      frequency: 5,
    },
  ],
};

export default function MiddleBarChart() {
  const [font, setFont] = useState('');
  const [color, setColor] = useState('');

  /* get variables of colors from CSS */
  useEffect(() => {
    setFont(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-families'
      )
    );
    setColor([
      getComputedStyle(document.documentElement).getPropertyValue(
        '--green-400'
      ),
      getComputedStyle(document.documentElement).getPropertyValue('--red-400'),
    ]);
  }, []);

  const graphColors = (array) => {
    let colors = array.map((number) =>
      Number(number[1]) <= 0 ? `hsla(${color[1]})` : `hsla(${color[0]})`
    );

    return colors;
  };

  /* var labels = ['Akinari', 'worst hr player', 'Koba', 'Arge']; */
  /* var dataScores: any[] = [-70, 20, 50, 66]; */

  /* let propicIDs: number[] = ['4001304', '14106450', '4448118', '11215030'];
   */

  var labels = [
    exampleData.teammateWinLoss[2].username,
    exampleData.teammateWinLoss[3].username,
    exampleData.teammateWinLoss[10].username,
    exampleData.teammateWinLoss[14].username,
    exampleData.teammateWinLoss[15].username,
    exampleData.teammateWinLoss[16].username,
    exampleData.teammateWinLoss[17].username,
    exampleData.teammateWinLoss[18].username,
    exampleData.teammateWinLoss[19].username,
    exampleData.teammateWinLoss[20].username,
    exampleData.teammateWinLoss[21].username,
    exampleData.teammateWinLoss[22].username,
    exampleData.teammateWinLoss[23].username,
    exampleData.teammateWinLoss[24].username,
    exampleData.teammateWinLoss[25].username,
    exampleData.teammateWinLoss[26].username,
    exampleData.teammateWinLoss[27].username,
    exampleData.teammateWinLoss[28].username,
  ];

  let propicIDs: number[] = [
    exampleData.teammateWinLoss[0].osuId,
    exampleData.teammateWinLoss[3].osuId,
    exampleData.teammateWinLoss[10].osuId,
    exampleData.teammateWinLoss[14].osuId,
    exampleData.teammateWinLoss[15].osuId,
    exampleData.teammateWinLoss[16].osuId,
    exampleData.teammateWinLoss[17].osuId,
    exampleData.teammateWinLoss[18].osuId,
    exampleData.teammateWinLoss[19].osuId,
    exampleData.teammateWinLoss[20].osuId,
    exampleData.teammateWinLoss[21].osuId,
    exampleData.teammateWinLoss[22].osuId,
    exampleData.teammateWinLoss[23].osuId,
    exampleData.teammateWinLoss[24].osuId,
    exampleData.teammateWinLoss[25].osuId,
    exampleData.teammateWinLoss[26].osuId,
    exampleData.teammateWinLoss[27].osuId,
    exampleData.teammateWinLoss[28].osuId,
  ];

  var dataScores: any[] = [
    [0, -50],
    [0, (exampleData.teammateWinLoss[3].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[10].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[14].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[15].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[16].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[17].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[18].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[19].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[20].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[21].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[22].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[23].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[24].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[25].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[26].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[27].winRate * 100).toFixed(0)],
    [0, (exampleData.teammateWinLoss[28].winRate * 100).toFixed(0)],
  ];

  const options = {
    elements: {
      bar: {
        borderWidth: 0,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        position: 'right' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          precision: 1,
          stepSize: 0.2,
        },
      },
      y: {
        ticks: {
          font: {
            size: 12,
            family: font,
          },
          precision: 0,
          /* stepSize: 5, */
        },
        /* grace: '20%', */
        /* min: -minMax,
        max: minMax, */
        max: 100,
        min: -100,
        /* suggestedMax: minMax,
        suggestedMin: -minMax, */
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'W/L',
        data: dataScores,
        propicIDs: propicIDs,
        backgroundColor: graphColors(dataScores),
        beginAtZero: false,
        padding: 10,
      },
    ],
  };

  const playerImage = {
    id: 'playerImage',
    beforeDatasetsDraw(chart, args, plugin) {
      const { ctx, data } = chart;

      data.datasets[0].propicIDs.forEach((image, index) => {
        const xPos = chart.getDatasetMeta(0).data[index].x;
        const yPos = chart.getDatasetMeta(0).data[index].y;

        const valueNumber = data.datasets[0].data[index];

        const chartImage = new (Image as any)();

        chartImage.src = `http://s.ppy.sh/a/${image}`;

        ctx.drawImage(
          chartImage,
          xPos - 15,
          valueNumber[1] >= valueNumber[0]
            ? yPos - 40
            : /* (yPos / 50 - 0.2) * (100 - valueNumber[1]) + 10.2 + 10 */ yPos +
                10,
          30,
          30
        );
      });
    },
  };

  return (
    <div className={styles.middleBarChart}>
      <Bar data={data} options={options} plugins={[playerImage]} />
    </div>
  );
}
