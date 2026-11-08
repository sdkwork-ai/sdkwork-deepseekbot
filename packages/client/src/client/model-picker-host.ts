import { createContext, useContext } from 'react';
import type { RenderFactorySlot } from '@deepseek-ai/dsh-client-ui-slots';

export interface ModelPickerHost {
  renderFactorySlot?: RenderFactorySlot;
  requestSignIn?: () => Promise<boolean>;
}

export const ModelPickerHostContext = createContext<ModelPickerHost>({});

export function useModelPickerHost(): ModelPickerHost {
  return useContext(ModelPickerHostContext);
}
