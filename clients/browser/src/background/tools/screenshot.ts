import { registerTool } from '../toolManager';
import { getActiveTab } from './utils';

export function registerScreenshotTool(): void {
  registerTool({
    name: 'CaptureScreenshot',
    description:
      'Take a screenshot of the current visible area of the active tab and return it as a base64 image.',
    parameters: {
      properties: {
        format: {
          type: 'string',
          description: 'Image format: "png" or "jpeg". Defaults to "png".',
          enum: ['png', 'jpeg'],
        },
        quality: {
          type: 'number',
          description: 'Image quality for JPEG format (0-100). Defaults to 90.',
          minimum: 0,
          maximum: 100,
        },
      },
      required: [],
    },
  }, async (args: {format?: 'png' | 'jpeg'; quality?: number;}) => {
    const tab = await getActiveTab();
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, {
      format: args.format || 'png',
      quality: args.quality || 90,
    });

    return {success: true, result: 'Screenshot captured', dataUrl};
  });
}
