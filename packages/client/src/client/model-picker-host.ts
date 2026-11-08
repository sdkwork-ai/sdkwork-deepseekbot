import { createContext, useContext } from 'react';
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types';
import type { RenderFactorySlot } from '@deepseek-ai/dsh-client-ui-slots';

export interface ModelPickerHost {
  renderFactorySlot?: RenderFactorySlot;
  requestSignIn?: () => Promise<boolean>;
  readCatalog?: () => Promise<ModelCatalog>;
}

export const ModelPickerHostContext = createContext<ModelPickerHost>({});

export function useModelPickerHost(): ModelPickerHost {
  return useContext(ModelPickerHostContext);
}
