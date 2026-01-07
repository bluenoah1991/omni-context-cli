import { Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';

const SHIMMER_WIDTH = 3;
const SHIMMER_INTERVAL = 80;

interface ShimmerTextProps {
  text: string;
}

export function ShimmerText({text}: ShimmerTextProps): React.ReactElement {
  const [shimmerPos, setShimmerPos] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setShimmerPos(prev => (prev + 1) % (text.length + SHIMMER_WIDTH));
    }, SHIMMER_INTERVAL);
    return () => clearInterval(timer);
  }, [text.length]);

  const chars = text.split('').map((char, i) => {
    const distance = shimmerPos - i;
    let color: string = colors.muted;
    if (distance >= 0 && distance < SHIMMER_WIDTH) {
      const intensity = 1 - distance / SHIMMER_WIDTH;
      if (intensity > 0.6) {
        color = colors.text;
      } else if (intensity > 0.3) {
        color = colors.secondary;
      } else {
        color = colors.info;
      }
    }
    return <Text key={i} color={color}>{char}</Text>;
  });

  return <Text>{chars}</Text>;
}
