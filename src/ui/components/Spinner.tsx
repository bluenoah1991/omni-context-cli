import { Text } from 'ink';
import React, { useEffect, useState } from 'react';

const spinners = {
  dots: {interval: 80, frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']},
  dots2: {interval: 80, frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']},
  line: {interval: 130, frames: ['-', '\\', '|', '/']},
};

type SpinnerType = keyof typeof spinners;

interface SpinnerProps {
  type?: SpinnerType;
}

export function Spinner({type = 'dots'}: SpinnerProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const spinner = spinners[type];
    const timer = setInterval(() => {
      setFrame(previousFrame => {
        const isLastFrame = previousFrame === spinner.frames.length - 1;
        return isLastFrame ? 0 : previousFrame + 1;
      });
    }, spinner.interval);

    return () => {
      clearInterval(timer);
    };
  }, [type]);

  const spinner = spinners[type];
  return <Text>{spinner.frames[frame]}</Text>;
}
