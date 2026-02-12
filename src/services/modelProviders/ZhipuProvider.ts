import { ModelConfig } from '../../types/config';
import { ModelProvider } from '../modelProvider';

const MODELS: Array<{name: string; displayName: string;}> = [
  {name: 'glm-5', displayName: 'GLM-5'},
  {name: 'glm-4.7', displayName: 'GLM-4.7'},
  {name: 'glm-4.6v', displayName: 'GLM-4.6V'},
  {name: 'glm-4.7-flash', displayName: 'GLM-4.7-Flash'},
  {name: 'glm-4.7-flashx', displayName: 'GLM-4.7-FlashX'},
];

export const ZhipuProvider: ModelProvider = {
  id: 'zhipu',
  name: 'Zhipu Coding Plan',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    return MODELS.map(model => ({
      id: `anthropic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: model.name,
      nickname: `Zhipu ${model.displayName}`,
      provider: 'anthropic' as const,
      apiKey,
      apiUrl: 'https://open.bigmodel.cn/api/anthropic/v1/messages',
      contextSize: 200,
    }));
  },
};
