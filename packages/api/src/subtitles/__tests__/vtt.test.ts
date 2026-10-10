import { describe, test, expect } from 'bun:test';
import { parseRollingVtt, parseVtt } from '../vtt.js';

const MANUAL_VTT = `WEBVTT
Kind: captions
Language: en

00:00:01.200 --> 00:00:03.360
All right, so here we are, in front of the
elephants

00:00:05.318 --> 00:00:07.974 align:start
Tom &amp; Jerry&#39;s <i>trunks</i>

00:01:02.000 --> 01:00:03.500

`;

const ROLLING_VTT = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:04.390 align:start position:0%
 
[Music]

00:00:04.390 --> 00:00:04.400 align:start position:0%
 
 

00:00:04.400 --> 00:00:06.869 align:start position:0%
 
This<00:00:04.799><c> is</c><00:00:04.960><c> a</c><00:00:05.200><c> three.</c>

00:00:06.869 --> 00:00:06.879 align:start position:0%
This is a three.
 

00:00:06.879 --> 00:00:08.549 align:start position:0%
This is a three.
and<00:00:07.120><c> rendered</c><00:00:07.440><c> at</c>

00:00:08.549 --> 00:00:08.559 align:start position:0%
and rendered at
 
`;

describe('parseVtt', () => {
  test('parses cues, strips tags and decodes entities', () => {
    expect(parseVtt(MANUAL_VTT)).toEqual([
      {
        start: 1.2,
        end: 3.36,
        text: 'All right, so here we are, in front of the\nelephants',
      },
      { start: 5.318, end: 7.974, text: "Tom & Jerry's trunks" },
    ]);
  });

  test('handles CRLF line endings', () => {
    expect(parseVtt(MANUAL_VTT.replace(/\n/g, '\r\n'))).toHaveLength(2);
  });
});

describe('parseRollingVtt', () => {
  test('drops repeated lines and empty transition cues', () => {
    expect(parseRollingVtt(ROLLING_VTT)).toEqual([
      { start: 0, end: 4.39, text: '[Music]' },
      { start: 4.4, end: 6.869, text: 'This is a three.' },
      { start: 6.879, end: 8.549, text: 'and rendered at' },
    ]);
  });

  test('parses hour-long timestamps', () => {
    const vtt = 'WEBVTT\n\n01:02:03.500 --> 01:02:04.000\nhello\n';
    expect(parseRollingVtt(vtt)).toEqual([
      { start: 3723.5, end: 3724, text: 'hello' },
    ]);
  });
});
