import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import welcomeText from '../../prompts/welcome.txt';
import { addModel, normalizeApiUrl } from '../../services/configManager';
import { Provider } from '../../types/config';
import { colors } from '../theme/colors';
import { FormStep, StepForm } from './StepForm';

type Phase = 'agreement' | 'setup';

interface OnboardingProps {
  onComplete: () => void;
}

function Agreement({onAccept}: {onAccept: () => void;}): React.ReactElement {
  useInput((_, key) => {
    if (key.return) onAccept();
    if (key.escape) process.exit(0);
  });

  return (
    <Box flexDirection='column' paddingX={2} paddingY={1}>
      <Text>{welcomeText.trim()}</Text>
    </Box>
  );
}

function ModelSetup(
  {onComplete, onBack}: {onComplete: () => void; onBack: () => void;},
): React.ReactElement {
  const steps: FormStep[] = [
    {
      type: 'select',
      key: 'provider',
      label: 'API Type',
      options: [{value: 'anthropic', label: 'Anthropic'}, {value: 'openai', label: 'OpenAI'}, {
        value: 'gemini',
        label: 'Gemini',
      }, {value: 'responses', label: 'OpenAI Responses API'}],
    },
    {type: 'text', key: 'model', label: 'Model Name', placeholder: 'e.g. deepseek-chat'},
    {type: 'text', key: 'apiKey', label: 'API Key', mask: true},
    {type: 'text', key: 'apiUrl', label: 'API URL', placeholder: 'e.g. https://api.deepseek.com'},
    {type: 'text', key: 'contextSize', label: 'Context Size (K)', placeholder: 'e.g. 200 for 200K'},
    {type: 'text', key: 'nickname', label: 'Nickname', placeholder: 'Display name for this model'},
  ];

  return (
    <Box flexDirection='column' paddingX={2} paddingY={1}>
      <Box flexDirection='column' marginBottom={1}>
        <Text color={colors.primary} bold>Set up your first model</Text>
        <Text>{' '}</Text>
        <Text color={colors.muted}>
          {'You can also press ESC to exit and configure later via:\n'
            + '  omx --add-provider <provider> --api-key <key>'}
        </Text>
      </Box>
      <StepForm
        steps={steps}
        initialValues={{
          provider: 'anthropic',
          model: '',
          apiKey: '',
          apiUrl: '',
          contextSize: '',
          nickname: '',
        }}
        onSubmit={values => {
          const provider = values.provider as Provider;
          addModel({
            name: values.model,
            nickname: values.nickname,
            provider,
            apiKey: values.apiKey,
            apiUrl: normalizeApiUrl(values.apiUrl, provider),
            contextSize: parseInt(values.contextSize, 10) || 200,
          });
          onComplete();
        }}
        onCancel={onBack}
      />
    </Box>
  );
}

export function Onboarding({onComplete}: OnboardingProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('agreement');

  return (
    <Box flexDirection='column' borderStyle='round' borderColor={colors.primary}>
      {phase === 'agreement'
        ? <Agreement onAccept={() => setPhase('setup')} />
        : <ModelSetup onComplete={onComplete} onBack={() => setPhase('agreement')} />}
    </Box>
  );
}
