import { useMemo, useRef, type ReactElement, type ReactNode } from 'react';
import type {
  ModelCatalog,
  ModelCatalogModel,
  ModelProviderGroup,
  ModelSelection,
} from '@deepseek-ai/dsh-api-session-controller/types';
import type { RenderFactorySlot } from '@deepseek-ai/dsh-client-ui-slots';
import type { ModelCatalogView, ModelRouteView } from './bridge.js';

export type AssistantModelPickResult =
  | { ok: true; value: undefined }
  | { ok: false; error: { code: string; message: string } };

export interface AssistantModelDirectoryState {
  current: ModelSelection | null;
  retainedEffort?: string;
  routable: boolean | null;
  groups: readonly ModelProviderGroup[];
  failures: readonly { id: string; name: string; message: string }[];
  status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error';
  pending: ModelSelection | null;
  error: string | null;
}

export interface AssistantModelPickerInputs {
  state: AssistantModelDirectoryState;
  load: () => void;
  select: (selection: ModelSelection) => Promise<AssistantModelPickResult>;
  available?: boolean;
  locked?: boolean;
  requestSignIn?: () => Promise<boolean>;
  waitForSignedInModel?: (selection: ModelSelection, timeoutMs?: number) => Promise<boolean>;
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotFactoryMap {
    'model.select': {
      scope: 'root';
      props: AssistantModelPickerInputs;
    };
  }
}

export function assistantModelGroups(catalog: ModelCatalogView | undefined): ModelProviderGroup[] {
  const groups: {
    id: string;
    name: string;
    models: ModelCatalogModel[];
    requiresSignIn: boolean;
  }[] = [];
  for (const entry of catalog?.models ?? []) {
    const model: ModelCatalogModel = {
      id: entry.model,
      name: entry.modelName,
      ...(entry.efforts.length === 0
        ? {}
        : {
            reasoning: {
              efforts: entry.efforts.map((effort) => ({ id: effort.id, name: effort.name })),
              ...(entry.defaultEffort === undefined ? {} : { defaultEffort: entry.defaultEffort }),
            },
          }),
    };
    const last = groups.at(-1);
    if (last !== undefined && last.id === entry.provider) {
      last.models.push(model);
      if (entry.credential !== undefined) last.requiresSignIn = true;
      continue;
    }
    groups.push({
      id: entry.provider,
      name: entry.providerName,
      models: [model],
      requiresSignIn: entry.credential !== undefined,
    });
  }
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    models: group.models,
    ...(group.requiresSignIn ? { requiresSignIn: true } : {}),
  }));
}

export function assistantModelState(
  catalog: ModelCatalogView | undefined,
  route: ModelRouteView | undefined,
  status: 'loading' | 'ready' | 'unavailable',
  busy: boolean,
  pending: ModelSelection | null,
  error: string | undefined,
  sessionCatalog?: ModelCatalog | undefined,
): AssistantModelDirectoryState {
  const groups = sessionCatalog?.groups ?? assistantModelGroups(catalog);
  const group = groups.find((candidate) => candidate.id === route?.provider);
  const model = group?.models.find((candidate) => candidate.id === route?.model);
  const effortName =
    route?.reasoningEffort === undefined
      ? undefined
      : (model?.reasoning?.efforts.find((effort) => effort.id === route.reasoningEffort)?.name ??
        route.reasoningEffort);
  return {
    current:
      route === undefined
        ? null
        : {
            provider: route.provider,
            model: route.model,
            ...(route.reasoningEffort === undefined
              ? {}
              : { reasoningEffort: route.reasoningEffort }),
          },
    ...(effortName === undefined ? {} : { retainedEffort: effortName }),
    routable: true,
    groups,
    failures: sessionCatalog?.failures ?? [],
    status: busy
      ? 'selecting'
      : status === 'loading'
        ? 'loading'
        : status === 'unavailable'
          ? 'error'
          : 'ready',
    pending: busy ? pending : null,
    error: error ?? null,
  };
}

export interface AssistantModelPickerProps {
  catalog: ModelCatalogView | undefined;
  sessionCatalog?: ModelCatalog | undefined;
  route: ModelRouteView | undefined;
  status: 'loading' | 'ready' | 'unavailable';
  busy: boolean;
  error: string | undefined;
  disabled: boolean;
  onPick: (route: ModelRouteView) => Promise<AssistantModelPickResult>;
  onLoad: () => void;
  requestSignIn?: (() => Promise<boolean>) | undefined;
  waitForSignedInModel?:
    | ((selection: ModelSelection, timeoutMs?: number) => Promise<boolean>)
    | undefined;
  renderFactorySlot: RenderFactorySlot | undefined;
  fallback: ReactNode;
}

export function AssistantModelPicker({
  catalog,
  sessionCatalog,
  route,
  status,
  busy,
  error,
  disabled,
  onPick,
  onLoad,
  requestSignIn,
  waitForSignedInModel,
  renderFactorySlot,
  fallback,
}: AssistantModelPickerProps): ReactElement {
  const pending = useRef<ModelSelection | null>(null);
  const state = useMemo(
    () => assistantModelState(catalog, route, status, busy, pending.current, error, sessionCatalog),
    [catalog, sessionCatalog, route, status, busy, error],
  );
  if (renderFactorySlot === undefined) return <>{fallback}</>;
  return (
    <>
      {renderFactorySlot(
        'model.select',
        {
          state,
          load: onLoad,
          select: async (selection) => {
            pending.current = selection;
            try {
              return await onPick({
                provider: selection.provider,
                model: selection.model,
                ...(selection.reasoningEffort === undefined
                  ? {}
                  : { reasoningEffort: selection.reasoningEffort }),
              });
            } finally {
              pending.current = null;
            }
          },
          available: true,
          locked: disabled,
          ...(requestSignIn === undefined ? {} : { requestSignIn }),
          ...(waitForSignedInModel === undefined ? {} : { waitForSignedInModel }),
        },
        { fallback },
      )}
    </>
  );
}
