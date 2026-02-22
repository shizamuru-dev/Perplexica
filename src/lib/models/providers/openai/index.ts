import { UIConfigField } from '@/lib/config/types';
import { getConfiguredModelProviderById } from '@/lib/config/serverRegistry';
import { Model, ModelList, ProviderMetadata } from '../../types';
import OpenAIEmbedding from './openaiEmbedding';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import OpenAILLM from './openaiLLM';
import OpenAI from 'openai';

interface OpenAIConfig {
  apiKey: string;
  baseURL: string;
}

const defaultChatModels: Model[] = [
  {
    name: 'GPT-3.5 Turbo',
    key: 'gpt-3.5-turbo',
  },
  {
    name: 'GPT-4',
    key: 'gpt-4',
  },
  {
    name: 'GPT-4 turbo',
    key: 'gpt-4-turbo',
    supportsVision: true,
  },
  {
    name: 'GPT-4 omni',
    key: 'gpt-4o',
    supportsVision: true,
  },
  {
    name: 'GPT-4o (2024-05-13)',
    key: 'gpt-4o-2024-05-13',
    supportsVision: true,
  },
  {
    name: 'GPT-4 omni mini',
    key: 'gpt-4o-mini',
    supportsVision: true,
  },
  {
    name: 'GPT 4.1 nano',
    key: 'gpt-4.1-nano',
    supportsVision: true,
  },
  {
    name: 'GPT 4.1 mini',
    key: 'gpt-4.1-mini',
    supportsVision: true,
  },
  {
    name: 'GPT 4.1',
    key: 'gpt-4.1',
    supportsVision: true,
  },
  {
    name: 'GPT 5 nano',
    key: 'gpt-5-nano',
    supportsVision: true,
  },
  {
    name: 'GPT 5',
    key: 'gpt-5',
    supportsVision: true,
  },
  {
    name: 'GPT 5 Mini',
    key: 'gpt-5-mini',
    supportsVision: true,
  },
  {
    name: 'GPT 5 Pro',
    key: 'gpt-5-pro',
    supportsVision: true,
  },
  {
    name: 'GPT 5.1',
    key: 'gpt-5.1',
    supportsVision: true,
  },
  {
    name: 'GPT 5.2',
    key: 'gpt-5.2',
    supportsVision: true,
  },
  {
    name: 'GPT 5.2 Pro',
    key: 'gpt-5.2-pro',
    supportsVision: true,
  },
  {
    name: 'o1',
    key: 'o1',
    supportsVision: true,
  },
  {
    name: 'o3',
    key: 'o3',
    supportsVision: true,
  },
  {
    name: 'o3 Mini',
    key: 'o3-mini',
    supportsVision: true,
  },
  {
    name: 'o4 Mini',
    key: 'o4-mini',
    supportsVision: true,
  },
];

const defaultEmbeddingModels: Model[] = [
  {
    name: 'Text Embedding 3 Small',
    key: 'text-embedding-3-small',
  },
  {
    name: 'Text Embedding 3 Large',
    key: 'text-embedding-3-large',
  },
];

const providerConfigFields: UIConfigField[] = [
  {
    type: 'password',
    name: 'API Key',
    key: 'apiKey',
    description: 'Your OpenAI API key',
    required: true,
    placeholder: 'OpenAI API Key',
    env: 'OPENAI_API_KEY',
    scope: 'server',
  },
  {
    type: 'string',
    name: 'Base URL',
    key: 'baseURL',
    description: 'The base URL for the OpenAI API',
    required: true,
    placeholder: 'OpenAI Base URL',
    default: 'https://api.openai.com/v1',
    env: 'OPENAI_BASE_URL',
    scope: 'server',
  },
];

class OpenAIProvider extends BaseModelProvider<OpenAIConfig> {
  constructor(id: string, name: string, config: OpenAIConfig) {
    super(id, name, config);
  }

  private async buildVisionCapMap(): Promise<Map<string, boolean>> {
    const capMap = new Map<string, boolean>();
    try {
      const client = new OpenAI({
        apiKey: this.config.apiKey || 'no-key',
        baseURL: this.config.baseURL,
      });

      const res = await client.models.list();

      for (const m of res.data as any[]) {
        const caps = m.capabilities;
        const supportsVision =
          (Array.isArray(caps) && caps.includes('vision')) ||
          (caps !== null && typeof caps === 'object' && caps.vision === true);
        capMap.set(m.id, supportsVision);
      }
    } catch {
      // If provider doesn't support /v1/models or is unreachable, return empty map
    }
    return capMap;
  }

  private enrichWithVision(models: Model[], capMap: Map<string, boolean>): Model[] {
    return models.map((m) => {
      if (m.supportsVision !== undefined) return m; // already set manually — don't override
      const fromApi = capMap.get(m.key);
      return fromApi ? { ...m, supportsVision: true } : m;
    });
  }

  async getDefaultModels(): Promise<ModelList> {
    if (this.config.baseURL === 'https://api.openai.com/v1') {
      return {
        embedding: defaultEmbeddingModels,
        chat: defaultChatModels,
      };
    }

    return { chat: [], embedding: [] };
  }

  async getModelList(): Promise<ModelList> {
    const defaultModels = await this.getDefaultModels();
    const configProvider = getConfiguredModelProviderById(this.id)!;

    const isCustomURL = this.config.baseURL !== 'https://api.openai.com/v1';
    const hasConfiguredModels =
      configProvider.chatModels.length > 0 ||
      configProvider.embeddingModels.length > 0;

    let configuredChat = configProvider.chatModels;
    let configuredEmbedding = configProvider.embeddingModels;

    if (isCustomURL && hasConfiguredModels) {
      const capMap = await this.buildVisionCapMap();
      configuredChat = this.enrichWithVision(configuredChat, capMap);
      configuredEmbedding = this.enrichWithVision(configuredEmbedding, capMap);
    }

    return {
      embedding: [...defaultModels.embedding, ...configuredEmbedding],
      chat: [...defaultModels.chat, ...configuredChat],
    };
  }

  async loadChatModel(key: string): Promise<BaseLLM<any>> {
    const modelList = await this.getModelList();

    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        'Error Loading OpenAI Chat Model. Invalid Model Selected',
      );
    }

    return new OpenAILLM({
      apiKey: this.config.apiKey,
      model: key,
      baseURL: this.config.baseURL,
    });
  }

  async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
    const modelList = await this.getModelList();
    const exists = modelList.embedding.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        'Error Loading OpenAI Embedding Model. Invalid Model Selected.',
      );
    }

    return new OpenAIEmbedding({
      apiKey: this.config.apiKey,
      model: key,
      baseURL: this.config.baseURL,
    });
  }

  static parseAndValidate(raw: any): OpenAIConfig {
    if (!raw || typeof raw !== 'object')
      throw new Error('Invalid config provided. Expected object');
    if (!raw.apiKey || !raw.baseURL)
      throw new Error(
        'Invalid config provided. API key and base URL must be provided',
      );

    return {
      apiKey: String(raw.apiKey),
      baseURL: String(raw.baseURL),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: 'openai',
      name: 'OpenAI',
    };
  }
}

export default OpenAIProvider;
