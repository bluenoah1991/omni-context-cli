import { registerTool } from '../services/toolManager';

export function registerCommonTools(): void {
  registerTool({
    name: 'GetDocumentInfo',
    description:
      'Get metadata about the current Office document, including host application, platform and file URL.',
    parameters: {properties: {}, required: []},
  }, async () => {
    const host = Office.context.host;
    const hostMap: Record<number, string> = {
      [Office.HostType.Word]: 'Word',
      [Office.HostType.Excel]: 'Excel',
      [Office.HostType.PowerPoint]: 'PowerPoint',
    };
    const info: Record<string, unknown> = {
      host: hostMap[host as number] || 'Unknown',
      platform: Office.context.platform,
    };
    try {
      const props = await new Promise<Office.FileProperties>((resolve, reject) => {
        Office.context.document.getFilePropertiesAsync(result => {
          result.status === Office.AsyncResultStatus.Succeeded
            ? resolve(result.value)
            : reject(result.error);
        });
      });
      if (props.url) info.url = props.url;
    } catch {}
    return info;
  });

  registerTool({
    name: 'GetSelectedText',
    description: 'Get the currently selected text in the Office document.',
    parameters: {properties: {}, required: []},
  }, async () => {
    const text = await new Promise<string>((resolve, reject) => {
      Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, result => {
        result.status === Office.AsyncResultStatus.Succeeded
          ? resolve(result.value as string)
          : reject(result.error);
      });
    });
    return {text};
  });

  registerTool({
    name: 'SetSelectedData',
    description:
      'Write text or HTML content into the current selection, replacing what is selected.',
    parameters: {
      properties: {
        data: {type: 'string', description: 'The text or HTML to insert.'},
        coercionType: {
          type: 'string',
          description: 'Type of data: "Text" (default) or "Html".',
          enum: ['Text', 'Html'],
        },
      },
      required: ['data'],
    },
  }, async (args: {data: string; coercionType?: string;}) => {
    const type = args.coercionType === 'Html' ? Office.CoercionType.Html : Office.CoercionType.Text;
    await new Promise<void>((resolve, reject) => {
      Office.context.document.setSelectedDataAsync(args.data, {coercionType: type}, result => {
        result.status === Office.AsyncResultStatus.Succeeded ? resolve() : reject(result.error);
      });
    });
    return {message: 'Data written to selection'};
  });

  registerTool({
    name: 'SaveSetting',
    description: 'Save a key-value setting into the document. Settings persist with the document.',
    parameters: {
      properties: {
        key: {type: 'string', description: 'Setting key.'},
        value: {type: 'string', description: 'Setting value.'},
      },
      required: ['key', 'value'],
    },
  }, async (args: {key: string; value: string;}) => {
    Office.context.document.settings.set(args.key, args.value);
    await new Promise<void>((resolve, reject) => {
      Office.context.document.settings.saveAsync(result => {
        result.status === Office.AsyncResultStatus.Succeeded ? resolve() : reject(result.error);
      });
    });
    return {message: `Setting "${args.key}" saved`};
  });

  registerTool({
    name: 'GetSetting',
    description: 'Read a setting previously stored in the document.',
    parameters: {
      properties: {key: {type: 'string', description: 'Setting key.'}},
      required: ['key'],
    },
  }, async (args: {key: string;}) => {
    const value = Office.context.document.settings.get(args.key);
    return {key: args.key, value: value ?? null};
  });
}
