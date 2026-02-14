import { memo } from 'react';
import type { Attachment } from '../types/uiMessage';
import { removeFileContext, removeIDEContext, unwrapUIMessage } from '../utils/messagePreprocessor';
import { AttachmentList } from './AttachmentList';

interface UserBlockProps {
  content: string;
  attachments?: Attachment[];
}

export const UserBlock = memo(function UserBlock({content, attachments}: UserBlockProps) {
  const displayContent = removeFileContext(removeIDEContext(unwrapUIMessage(content)));

  if (!displayContent.trim() && (!attachments || attachments.length === 0)) return null;

  return (
    <>
      {displayContent.trim() && (
        <div className='flex justify-end'>
          <div className='rounded-md px-3 py-2 max-w-[85%] bg-vscode-element text-vscode-text-header border border-vscode-border'>
            <div className='prose prose-sm prose-invert light:prose-neutral max-w-none whitespace-pre-wrap'>
              {displayContent}
            </div>
          </div>
        </div>
      )}
      <AttachmentList attachments={attachments} align='right' />
    </>
  );
});
