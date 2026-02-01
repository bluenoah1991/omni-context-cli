import { FileText } from 'lucide-react';
import { memo } from 'react';
import type { Attachment } from '../types/uiMessage';

interface AttachmentListProps {
  attachments?: Attachment[];
  align?: 'left' | 'right';
}

export const AttachmentList = memo(
  function AttachmentList({attachments, align = 'left'}: AttachmentListProps) {
    if (!attachments || attachments.length === 0) return null;

    const justifyClass = align === 'right' ? 'justify-end' : 'justify-start';

    return (
      <>
        {attachments.map((attachment, i) => (
          <div key={i} className={`flex ${justifyClass} ${align === 'left' ? 'mt-2' : ''}`}>
            {attachment.mimeType.startsWith('image/')
              ? (
                <div className='rounded-md overflow-hidden max-w-[85%] border border-vscode-border'>
                  <img
                    src={attachment.url}
                    alt=''
                    className='max-w-full max-h-96 object-contain'
                    loading='lazy'
                  />
                </div>
              )
              : (
                <div className='rounded-md px-3 py-2 bg-vscode-element border border-vscode-border flex items-center gap-2'>
                  <FileText className='w-5 h-5 text-vscode-text-muted' />
                  <span className='text-sm text-vscode-text-muted'>
                    {attachment.fileName || (attachment.mimeType === 'application/pdf'
                      ? 'Untitled PDF'
                      : 'Untitled Document')}
                  </span>
                </div>
              )}
          </div>
        ))}
      </>
    );
  },
);
