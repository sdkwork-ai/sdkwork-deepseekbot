import { expect, it } from 'vitest';
import type { ModelCatalogView } from '../src/client/bridge.js';
import { assistantModelGroups, assistantModelState } from '../src/client/assistant-model-picker.js';

const catalog: ModelCatalogView = {
  default: { provider: 'deepseek', model: 'deepseek-v41-flash' },
  models: [
    {
      provider: 'deepseek',
      providerName: 'DeepSeek',
      model: 'deepseek-v41-flash',
      modelName: 'DeepSeek-V4.1-Flash',
      efforts: [
        { id: 'low', name: 'Low' },
        { id: 'high', name: 'High' },
      ],
      defaultEffort: 'high',
    },
    {
      provider: 'meituan',
      providerName: 'Meituan',
      model: 'longcat-2-5',
      modelName: 'Meituan: LongCat 2.5 Preview',
      efforts: [],
      credential: 'missing',
    },
    {
      provider: 'meituan',
      providerName: 'Meituan',
      model: 'longcat-flash',
      modelName: 'Meituan: LongCat Flash',
      efforts: [],
      credential: 'missing',
    },
  ],
};

it('groups the bot catalog by provider and carries the sign-in preview', () => {
  const groups = assistantModelGroups(catalog);
  expect(groups.map((group) => group.id)).toEqual(['deepseek', 'meituan']);
  expect(groups[0]).toMatchObject({
    name: 'DeepSeek',
    models: [
      {
        id: 'deepseek-v41-flash',
        name: 'DeepSeek-V4.1-Flash',
        reasoning: {
          defaultEffort: 'high',
          efforts: [
            { id: 'low', name: 'Low' },
            { id: 'high', name: 'High' },
          ],
        },
      },
    ],
  });
  expect(groups[0]?.requiresSignIn).toBeUndefined();
  expect(groups[1]).toMatchObject({
    name: 'Meituan',
    requiresSignIn: true,
    models: [
      { id: 'longcat-2-5', name: 'Meituan: LongCat 2.5 Preview' },
      { id: 'longcat-flash', name: 'Meituan: LongCat Flash' },
    ],
  });
});

it('renders the bot route and its effort name as the picker snapshot', () => {
  const state = assistantModelState(
    catalog,
    { provider: 'deepseek', model: 'deepseek-v41-flash', reasoningEffort: 'high' },
    'ready',
    false,
    null,
    undefined,
  );
  expect(state).toMatchObject({
    current: { provider: 'deepseek', model: 'deepseek-v41-flash', reasoningEffort: 'high' },
    retainedEffort: 'High',
    routable: true,
    status: 'ready',
    pending: null,
    error: null,
  });
});

it('follows the composer lifecycle and keeps the pending selection while busy', () => {
  const pending = { provider: 'deepseek', model: 'deepseek-v41-flash' };
  expect(assistantModelState(catalog, undefined, 'loading', false, null, undefined)).toMatchObject({
    current: null,
    status: 'loading',
    pending: null,
  });
  expect(
    assistantModelState(catalog, undefined, 'unavailable', false, null, 'catalog offline'),
  ).toMatchObject({ status: 'error', error: 'catalog offline' });
  expect(assistantModelState(catalog, pending, 'ready', true, pending, undefined)).toMatchObject({
    status: 'selecting',
    pending,
  });
  expect(assistantModelState(undefined, undefined, 'ready', false, null, undefined).groups).toEqual(
    [],
  );
});
