import * as fs from 'fs/promises';
import * as path from 'path';
import { getExtensionForMimeType } from '../../utils/mediaUtils';
import { normalizePath } from '../../utils/wsl';
import { takeMedia } from '../mediaBuffer';
import { registerTool } from '../toolExecutor';

export function registerSaveArtifactTool(): void {
  registerTool({
    name: 'SaveArtifact',
    builtin: true,
    description:
      'Save the most recently generated artifact (image, PDF, etc.) from the conversation to a file. The tool automatically retrieves the latest media output, so you only need to specify the destination path. If the path has no extension, one is inferred from the media type.',
    formatCall: (args: Record<string, unknown>) => String(args.filePath || ''),
    parameters: {
      properties: {
        filePath: {
          type: 'string',
          description:
            'Destination file path. Can be relative or absolute. Parent directories are created automatically. If no extension is provided, one is added based on the media type.',
        },
      },
      required: ['filePath'],
    },
  }, async (args: {filePath: string;}) => {
    const media = takeMedia();
    if (!media) {
      return {result: 'No media available to save', displayText: 'No media available to save'};
    }

    let filePath = await normalizePath(args.filePath);
    if (!path.extname(filePath)) {
      filePath += getExtensionForMimeType(media.mimeType) || '.bin';
    }

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, {recursive: true});
    await fs.writeFile(filePath, Buffer.from(media.data, 'base64'));

    return {result: `Saved ${media.mimeType} to ${filePath}`, displayText: filePath};
  });
}
