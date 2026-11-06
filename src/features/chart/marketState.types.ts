import type { Time } from 'lightweight-charts';

export interface MarketStateOverlay {
  marketStructure: {
    number: number;
    score: number;
    time: Time;
    eventPrice: {
      time: Time;
      type: 'high' | 'low';
      price: number;
    };
    event: 'bos' | 'choch';
    bias: 'BULLISH' | 'BEARISH';
  };
  pois: {
    startTime: Time;
    endTime: Time | null;
    high: number;
    low: number;
    score: number;
    type: 'ORDER_BLOCK' | 'FVG';
    direction: 'BULLISH' | 'BEARISH';
  }[];
}
