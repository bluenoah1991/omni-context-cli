import { memo } from 'react';
import { removeIDEContext, unwrapUIMessage } from '../utils/messagePreprocessor';

interface UserBlockProps {
  content: string;
}

export const UserBlock = memo(function UserBlock({content}: UserBlockProps) {
  const displayContent = removeIDEContext(unwrapUIMessage(content));

  if (!displayContent.trim()) return null;

  return (
    <div className='flex justify-end'>
      <div className='rounded-md px-3 py-2 max-w-[85%] bg-vscode-element text-vscode-text-header border border-vscode-border'>
        <div className='prose prose-sm prose-invert light:prose-neutral max-w-none whitespace-pre-wrap'>
          {displayContent}
        </div>
      </div>
    </div>
  );
});
