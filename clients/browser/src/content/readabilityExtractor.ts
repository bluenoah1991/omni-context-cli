import { Readability } from '@mozilla/readability';

function extractPageHtml(): {content: string;} | {error: string;} {
  try {
    const documentClone = document.cloneNode(true) as Document;

    removeNoiseElements(documentClone);
    cleanAttributes(documentClone);

    const content = documentClone.documentElement.outerHTML;

    return {content};
  } catch {
    return {error: 'Content not available'};
  }
}

function extractPageText(): {
  content: string;
  metadata: {
    title: string;
    byline: string | null;
    excerpt: string | null;
    siteName: string | null;
    lang: string | null;
    publishedTime: string | null;
  };
} | {error: string;} {
  try {
    const documentClone = document.cloneNode(true) as Document;

    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article) {
      return {error: 'Content not available'};
    }

    return {
      content: article.textContent || '',
      metadata: {
        title: article.title || '',
        byline: article.byline || null,
        excerpt: article.excerpt || null,
        siteName: article.siteName || null,
        lang: article.lang || null,
        publishedTime: article.publishedTime || null,
      },
    };
  } catch {
    return {error: 'Content not available'};
  }
}

function removeNoiseElements(doc: Document): void {
  const noiseSelectors = [
    'script',
    'style',
    'noscript',
    'iframe',
    'object',
    'embed',
    'svg',
    'canvas',
    'link[rel="stylesheet"]',
    'audio',
    'video',
    'source',
    'track',
  ];

  noiseSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(element => element.remove());
  });

  const allElements = doc.querySelectorAll('*');
  allElements.forEach(element => {
    const style = (element as HTMLElement).style;

    if (style.display === 'none' || style.visibility === 'hidden') {
      element.remove();
    }
  });

  const removeComments = (node: Node) => {
    const children = Array.from(node.childNodes);

    children.forEach(child => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        removeComments(child);
      }
    });
  };

  removeComments(doc);
}

function cleanAttributes(doc: Document): void {
  const attributesToRemove = [
    'style',
    'onclick',
    'ondblclick',
    'onmousedown',
    'onmouseup',
    'onmouseover',
    'onmousemove',
    'onmouseout',
    'onkeypress',
    'onkeydown',
    'onkeyup',
    'onload',
    'onunload',
    'onabort',
    'onerror',
    'onresize',
    'onscroll',
    'onblur',
    'onchange',
    'onfocus',
    'onreset',
    'onselect',
    'onsubmit',
    'ontouchstart',
    'ontouchmove',
    'ontouchend',
    'ontouchcancel',
    'class',
    'data-*',
  ];

  const allElements = doc.querySelectorAll('*');
  allElements.forEach(element => {
    attributesToRemove.forEach(attr => {
      if (attr === 'data-*') {
        Array.from(element.attributes).forEach(attribute => {
          if (attribute.name.startsWith('data-')) {
            element.removeAttribute(attribute.name);
          }
        });
      } else {
        element.removeAttribute(attr);
      }
    });

    const srcAttr = element.getAttribute('src');
    if (srcAttr && srcAttr.startsWith('data:')) {
      element.setAttribute('src', '[base64-image-removed]');
    }

    const bgAttr = element.getAttribute('background');
    if (bgAttr && bgAttr.startsWith('data:')) {
      element.setAttribute('background', '[base64-image-removed]');
    }
  });
}

function extractPageMetadata(): {metadata: Record<string, string>;} | {error: string;} {
  try {
    const metadata: Record<string, string> = {};
    const metaTags = document.head.querySelectorAll('meta[name], meta[property]');

    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');

      if (name && content) {
        metadata[name] = content;
      }
    });

    return {metadata};
  } catch {
    return {error: 'Metadata not available'};
  }
}

(window as any).extractPageHtml = extractPageHtml;
(window as any).extractPageText = extractPageText;
(window as any).extractPageMetadata = extractPageMetadata;
