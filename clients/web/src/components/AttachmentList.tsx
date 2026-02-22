import { FileText } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { Attachment } from '../types/uiMessage';

interface AttachmentListProps {
  attachments?: Attachment[];
  align?: 'left' | 'right';
}

function dataUrlToBlobUrl(dataUrl: string): string {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], {type: mimeType}));
}

export const AttachmentList = memo(
  function AttachmentList({attachments, align = 'left'}: AttachmentListProps) {
    const blobUrls = useMemo(() => {
      if (!attachments) return [];
      return attachments.map(a => a.url.startsWith('data:') ? dataUrlToBlobUrl(a.url) : a.url);
    }, [attachments]);

    if (!attachments || attachments.length === 0) return null;

    const justifyClass = align === 'right' ? 'justify-end' : 'justify-start';

    return (
      <>
        {attachments.map((attachment, i) => (
          <div key={i} className={`flex ${justifyClass} ${align === 'left' ? 'mt-2' : ''}`}>
            {attachment.mimeType.startsWith('image/')
              ? (
                <a
                  href={blobUrls[i]}
                  download={attachment.fileName
                    || `image.${attachment.mimeType.split('/')[1] || 'png'}`}
                  className='rounded-md overflow-hidden max-w-[85%] border border-vscode-border block'
                >
                  <img
                    src={attachment.url}
                    alt=''
                    className='max-w-full max-h-96 object-contain'
                    loading='eager'
                  />
                </a>
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
