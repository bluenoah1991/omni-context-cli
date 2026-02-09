import { registerTool } from '../services/toolManager';

export function registerWordTools(): void {
  registerTool({
    name: 'GetDocumentText',
    description: 'Get the full text content of the current Word document.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const body = ctx.document.body;
      body.load('text');
      await ctx.sync();
      return {text: body.text};
    });
  });

  registerTool({
    name: 'GetDocumentHtml',
    description: 'Get the full HTML representation of the Word document body.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const html = ctx.document.body.getHtml();
      await ctx.sync();
      return {html: html.value};
    });
  });

  registerTool({
    name: 'GetDocumentOoxml',
    description: 'Get the Office Open XML (OOXML) of the Word document body.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const ooxml = ctx.document.body.getOoxml();
      await ctx.sync();
      return {ooxml: ooxml.value};
    });
  });

  registerTool({
    name: 'GetDocumentProperties',
    description: 'Get built-in document properties such as title, author, subject, and keywords.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const props = ctx.document.properties;
      props.load([
        'title',
        'author',
        'subject',
        'keywords',
        'comments',
        'lastAuthor',
        'creationDate',
        'lastSaveTime',
      ]);
      await ctx.sync();
      return {
        title: props.title,
        author: props.author,
        subject: props.subject,
        keywords: props.keywords,
        comments: props.comments,
        lastAuthor: props.lastAuthor,
        creationDate: props.creationDate,
        lastSaveTime: props.lastSaveTime,
      };
    });
  });

  registerTool({
    name: 'GetParagraphs',
    description: 'Get all paragraphs with text, style name, and list info.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const paragraphs = ctx.document.body.paragraphs;
      paragraphs.load(['text', 'style', 'isListItem']);
      await ctx.sync();
      return {
        paragraphs: paragraphs.items.map((p, i) => ({
          index: i,
          text: p.text,
          style: p.style,
          isListItem: p.isListItem,
        })),
        count: paragraphs.items.length,
      };
    });
  });

  registerTool({
    name: 'GetSections',
    description: 'Get all sections in the document with their header/footer text.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const sections = ctx.document.sections;
      sections.load('items');
      await ctx.sync();
      const result: any[] = [];
      for (let i = 0; i < sections.items.length; i++) {
        const header = sections.items[i].getHeader(Word.HeaderFooterType.primary);
        const footer = sections.items[i].getFooter(Word.HeaderFooterType.primary);
        header.load('text');
        footer.load('text');
        await ctx.sync();
        result.push({index: i, headerText: header.text, footerText: footer.text});
      }
      return {sections: result, count: result.length};
    });
  });

  registerTool({
    name: 'GetStyles',
    description: 'List all available styles in the document with their type.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const styles = ctx.document.getStyles();
      styles.load(['nameLocal', 'type', 'builtIn']);
      await ctx.sync();
      return {
        styles: styles.items.map(s => ({name: s.nameLocal, type: s.type, builtIn: s.builtIn})),
        count: styles.items.length,
      };
    });
  });

  registerTool({
    name: 'SetDocumentProperties',
    description: 'Set built-in document properties such as title, author, subject, and keywords.',
    parameters: {
      properties: {
        title: {type: 'string', description: 'Document title.'},
        author: {type: 'string', description: 'Author name.'},
        subject: {type: 'string', description: 'Subject.'},
        keywords: {type: 'string', description: 'Keywords.'},
        comments: {type: 'string', description: 'Comments.'},
      },
      required: [],
    },
  }, async (args: any) => {
    return Word.run(async ctx => {
      const props = ctx.document.properties;
      if (args.title !== undefined) props.title = args.title;
      if (args.author !== undefined) props.author = args.author;
      if (args.subject !== undefined) props.subject = args.subject;
      if (args.keywords !== undefined) props.keywords = args.keywords;
      if (args.comments !== undefined) props.comments = args.comments;
      await ctx.sync();
      return {message: 'Document properties updated'};
    });
  });

  registerTool({
    name: 'InsertText',
    description: 'Insert text into the Word document at a specified location.',
    parameters: {
      properties: {
        text: {type: 'string', description: 'The text to insert.'},
        location: {
          type: 'string',
          description: '"End" (default), "Start", or "Replace" (replaces selection).',
          enum: ['End', 'Start', 'Replace'],
        },
      },
      required: ['text'],
    },
  }, async (args: {text: string; location?: string;}) => {
    return Word.run(async ctx => {
      const loc = args.location || 'End';
      if (loc === 'Replace') {
        ctx.document.getSelection().insertText(args.text, Word.InsertLocation.replace);
      } else {
        ctx.document.body.insertText(
          args.text,
          loc === 'Start' ? Word.InsertLocation.start : Word.InsertLocation.end,
        );
      }
      await ctx.sync();
      return {message: `Text inserted at ${loc}`};
    });
  });

  registerTool({
    name: 'InsertHtml',
    description: 'Insert HTML content into the Word document at a specified location.',
    parameters: {
      properties: {
        html: {type: 'string', description: 'HTML string to insert.'},
        location: {
          type: 'string',
          description: '"End" (default), "Start", or "Replace".',
          enum: ['End', 'Start', 'Replace'],
        },
      },
      required: ['html'],
    },
  }, async (args: {html: string; location?: string;}) => {
    return Word.run(async ctx => {
      const loc = args.location || 'End';
      if (loc === 'Replace') {
        ctx.document.getSelection().insertHtml(args.html, Word.InsertLocation.replace);
      } else {
        ctx.document.body.insertHtml(
          args.html,
          loc === 'Start' ? Word.InsertLocation.start : Word.InsertLocation.end,
        );
      }
      await ctx.sync();
      return {message: `HTML inserted at ${loc}`};
    });
  });

  registerTool({
    name: 'InsertOoxml',
    description:
      'Insert Office Open XML content into the document. Supports any complex formatting that OOXML can represent.',
    parameters: {
      properties: {
        ooxml: {type: 'string', description: 'OOXML string.'},
        location: {
          type: 'string',
          description: '"End" (default), "Start", or "Replace".',
          enum: ['End', 'Start', 'Replace'],
        },
      },
      required: ['ooxml'],
    },
  }, async (args: {ooxml: string; location?: string;}) => {
    return Word.run(async ctx => {
      const loc = args.location || 'End';
      if (loc === 'Replace') {
        ctx.document.getSelection().insertOoxml(args.ooxml, Word.InsertLocation.replace);
      } else {
        ctx.document.body.insertOoxml(
          args.ooxml,
          loc === 'Start' ? Word.InsertLocation.start : Word.InsertLocation.end,
        );
      }
      await ctx.sync();
      return {message: `OOXML inserted at ${loc}`};
    });
  });

  registerTool({
    name: 'InsertImage',
    description: 'Insert a base64-encoded image into the Word document at a specified location.',
    parameters: {
      properties: {
        base64: {
          type: 'string',
          description: 'Base64-encoded image data (without data URL prefix).',
        },
        location: {
          type: 'string',
          description: '"End" (default), "Start", or "Replace".',
          enum: ['End', 'Start', 'Replace'],
        },
      },
      required: ['base64'],
    },
  }, async (args: {base64: string; location?: string;}) => {
    return Word.run(async ctx => {
      const loc = args.location || 'End';
      if (loc === 'Replace') {
        ctx.document.getSelection().insertInlinePictureFromBase64(
          args.base64,
          Word.InsertLocation.replace,
        );
      } else {
        ctx.document.body.insertInlinePictureFromBase64(
          args.base64,
          loc === 'Start' ? Word.InsertLocation.start : Word.InsertLocation.end,
        );
      }
      await ctx.sync();
      return {message: `Image inserted at ${loc}`};
    });
  });

  registerTool({
    name: 'InsertBreak',
    description: 'Insert a break (page, section, or column) at the end of the document body.',
    parameters: {
      properties: {
        breakType: {
          type: 'string',
          description:
            '"Page" (default), "SectionNext", "SectionContinuous", "SectionEvenPage", "SectionOddPage", "Line".',
        },
      },
      required: [],
    },
  }, async (args: {breakType?: string;}) => {
    return Word.run(async ctx => {
      const typeMap: Record<string, Word.BreakType> = {
        Page: Word.BreakType.page,
        SectionNext: Word.BreakType.sectionNext,
        SectionContinuous: Word.BreakType.sectionContinuous,
        SectionEvenPage: Word.BreakType.sectionEven,
        SectionOddPage: Word.BreakType.sectionOdd,
        Line: Word.BreakType.line,
      };
      const bt = typeMap[args.breakType || 'Page'] || Word.BreakType.page;
      ctx.document.body.insertBreak(bt, Word.InsertLocation.end);
      await ctx.sync();
      return {message: `${args.breakType || 'Page'} break inserted`};
    });
  });

  registerTool(
    {
      name: 'SearchText',
      description: 'Search for text in the Word document and return all matches.',
      parameters: {
        properties: {
          query: {type: 'string', description: 'The text to search for.'},
          matchCase: {type: 'boolean', description: 'Case-sensitive search. Default: false.'},
          matchWholeWord: {type: 'boolean', description: 'Match whole words only. Default: false.'},
          matchWildcards: {
            type: 'boolean',
            description: 'Use wildcard characters. Default: false.',
          },
        },
        required: ['query'],
      },
    },
    async (
      args: {
        query: string;
        matchCase?: boolean;
        matchWholeWord?: boolean;
        matchWildcards?: boolean;
      },
    ) => {
      return Word.run(async ctx => {
        const results = ctx.document.body.search(args.query, {
          matchCase: args.matchCase || false,
          matchWholeWord: args.matchWholeWord || false,
          matchWildcards: args.matchWildcards || false,
        });
        results.load('text');
        await ctx.sync();
        return {matches: results.items.map(r => r.text), count: results.items.length};
      });
    },
  );

  registerTool({
    name: 'SearchAndReplace',
    description: 'Search for text in the document and replace all occurrences.',
    parameters: {
      properties: {
        search: {type: 'string', description: 'Text to find.'},
        replace: {type: 'string', description: 'Replacement text.'},
        matchCase: {type: 'boolean', description: 'Case-sensitive. Default: false.'},
      },
      required: ['search', 'replace'],
    },
  }, async (args: {search: string; replace: string; matchCase?: boolean;}) => {
    return Word.run(async ctx => {
      const results = ctx.document.body.search(args.search, {matchCase: args.matchCase || false});
      results.load('text');
      await ctx.sync();
      const count = results.items.length;
      for (const item of results.items) {
        item.insertText(args.replace, Word.InsertLocation.replace);
      }
      await ctx.sync();
      return {replaced: count, message: `Replaced ${count} occurrence(s)`};
    });
  });

  registerTool({
    name: 'ApplyStyle',
    description:
      'Apply a style to the selected paragraph(s). Use locale-specific names for non-English Word.',
    parameters: {
      properties: {
        styleName: {
          type: 'string',
          description:
            'Built-in style name. English Word uses "Heading1", "Normal", "Title", etc. Localized Word requires native names (e.g. Chinese: "标题 1", "正文", "标题"). Use GetDocumentInfo to check the locale if unsure.',
        },
      },
      required: ['styleName'],
    },
  }, async (args: {styleName: string;}) => {
    return Word.run(async ctx => {
      const range = ctx.document.getSelection();
      range.style = args.styleName;
      await ctx.sync();
      return {message: `Style "${args.styleName}" applied`};
    });
  });

  registerTool({
    name: 'SetFont',
    description: 'Set font properties on the currently selected text.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Font name, e.g. "Arial", "Calibri".'},
        size: {type: 'number', description: 'Font size in points.'},
        bold: {type: 'boolean', description: 'Bold.'},
        italic: {type: 'boolean', description: 'Italic.'},
        underline: {type: 'string', description: 'Underline style: "None", "Single", "Double".'},
        color: {type: 'string', description: 'Font color, e.g. "#FF0000", "Red".'},
        highlightColor: {type: 'string', description: 'Highlight color, e.g. "Yellow", "Cyan".'},
      },
      required: [],
    },
  }, async (args: any) => {
    return Word.run(async ctx => {
      const font = ctx.document.getSelection().font;
      if (args.name) font.name = args.name;
      if (args.size) font.size = args.size;
      if (args.bold !== undefined) font.bold = args.bold;
      if (args.italic !== undefined) font.italic = args.italic;
      if (args.underline) font.underline = args.underline;
      if (args.color) font.color = args.color;
      if (args.highlightColor) font.highlightColor = args.highlightColor;
      await ctx.sync();
      return {message: 'Font properties applied'};
    });
  });

  registerTool({
    name: 'SetParagraphFormat',
    description: 'Set paragraph formatting on the current selection.',
    parameters: {
      properties: {
        alignment: {type: 'string', description: '"Left", "Centered", "Right", "Justified".'},
        lineSpacing: {
          type: 'number',
          description: 'Line spacing in points (e.g. 12 for single, 24 for double at 12pt font).',
        },
        spaceAfter: {type: 'number', description: 'Space after the paragraph in points.'},
        spaceBefore: {type: 'number', description: 'Space before the paragraph in points.'},
        firstLineIndent: {type: 'number', description: 'First line indent in points.'},
        leftIndent: {type: 'number', description: 'Left indent in points.'},
      },
      required: [],
    },
  }, async (args: any) => {
    return Word.run(async ctx => {
      const para = ctx.document.getSelection().paragraphs.getFirst();
      if (args.alignment) para.alignment = args.alignment;
      if (args.lineSpacing) para.lineSpacing = args.lineSpacing;
      if (args.spaceAfter !== undefined) para.spaceAfter = args.spaceAfter;
      if (args.spaceBefore !== undefined) para.spaceBefore = args.spaceBefore;
      if (args.firstLineIndent !== undefined) para.firstLineIndent = args.firstLineIndent;
      if (args.leftIndent !== undefined) para.leftIndent = args.leftIndent;
      await ctx.sync();
      return {message: 'Paragraph formatting applied'};
    });
  });

  registerTool({
    name: 'InsertHyperlink',
    description: 'Add a hyperlink to the currently selected text.',
    parameters: {
      properties: {url: {type: 'string', description: 'The URL for the hyperlink.'}},
      required: ['url'],
    },
  }, async (args: {url: string;}) => {
    return Word.run(async ctx => {
      const range = ctx.document.getSelection();
      range.hyperlink = args.url;
      await ctx.sync();
      return {message: `Hyperlink set to ${args.url}`};
    });
  });

  registerTool({
    name: 'SetHeader',
    description: 'Set the primary header text for a given section (0-based index).',
    parameters: {
      properties: {
        sectionIndex: {type: 'number', description: 'Section index (0-based). Default: 0.'},
        text: {type: 'string', description: 'Header text.'},
      },
      required: ['text'],
    },
  }, async (args: {text: string; sectionIndex?: number;}) => {
    return Word.run(async ctx => {
      const sections = ctx.document.sections;
      sections.load('items');
      await ctx.sync();
      const section = sections.items[args.sectionIndex || 0];
      const header = section.getHeader(Word.HeaderFooterType.primary);
      header.insertText(args.text, Word.InsertLocation.replace);
      await ctx.sync();
      return {message: 'Header set'};
    });
  });

  registerTool({
    name: 'SetFooter',
    description: 'Set the primary footer text for a given section (0-based index).',
    parameters: {
      properties: {
        sectionIndex: {type: 'number', description: 'Section index (0-based). Default: 0.'},
        text: {type: 'string', description: 'Footer text.'},
      },
      required: ['text'],
    },
  }, async (args: {text: string; sectionIndex?: number;}) => {
    return Word.run(async ctx => {
      const sections = ctx.document.sections;
      sections.load('items');
      await ctx.sync();
      const section = sections.items[args.sectionIndex || 0];
      const footer = section.getFooter(Word.HeaderFooterType.primary);
      footer.insertText(args.text, Word.InsertLocation.replace);
      await ctx.sync();
      return {message: 'Footer set'};
    });
  });

  registerTool({
    name: 'GetContentControls',
    description: 'Get all content controls in the document with their tag, title, and text.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const controls = ctx.document.contentControls;
      controls.load(['id', 'tag', 'title', 'text', 'type']);
      await ctx.sync();
      return {
        controls: controls.items.map(c => ({
          id: c.id,
          tag: c.tag,
          title: c.title,
          text: c.text,
          type: c.type,
        })),
        count: controls.items.length,
      };
    });
  });

  registerTool({
    name: 'SetContentControlText',
    description: 'Set the text of a content control identified by its tag.',
    parameters: {
      properties: {
        tag: {type: 'string', description: 'The tag of the content control.'},
        text: {type: 'string', description: 'The text to set.'},
      },
      required: ['tag', 'text'],
    },
  }, async (args: {tag: string; text: string;}) => {
    return Word.run(async ctx => {
      const control = ctx.document.contentControls.getByTag(args.tag).getFirst();
      control.insertText(args.text, Word.InsertLocation.replace);
      await ctx.sync();
      return {message: `Content control "${args.tag}" updated`};
    });
  });

  registerTool({
    name: 'InsertContentControl',
    description: 'Wrap the current selection in a new content control with optional tag and title.',
    parameters: {
      properties: {
        tag: {type: 'string', description: 'Tag for identifying the control.'},
        title: {type: 'string', description: 'Display title.'},
      },
      required: [],
    },
  }, async (args: {tag?: string; title?: string;}) => {
    return Word.run(async ctx => {
      const cc = ctx.document.getSelection().insertContentControl();
      if (args.tag) cc.tag = args.tag;
      if (args.title) cc.title = args.title;
      cc.load('id');
      await ctx.sync();
      return {id: cc.id, message: 'Content control created'};
    });
  });

  registerTool({
    name: 'GetBookmarks',
    description: 'Get all bookmark names in the document.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const bookmarks = ctx.document.body.getRange().getBookmarks(true);
      await ctx.sync();
      return {bookmarks: bookmarks.value};
    });
  });

  registerTool({
    name: 'InsertBookmark',
    description: 'Create a bookmark at the current selection.',
    parameters: {
      properties: {name: {type: 'string', description: 'Bookmark name.'}},
      required: ['name'],
    },
  }, async (args: {name: string;}) => {
    return Word.run(async ctx => {
      ctx.document.getSelection().insertBookmark(args.name);
      await ctx.sync();
      return {message: `Bookmark "${args.name}" created`};
    });
  });

  registerTool({
    name: 'GetComments',
    description: 'Get all comments in the document with author and content.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const comments = ctx.document.body.getComments();
      comments.load(['id', 'authorName', 'content', 'creationDate']);
      await ctx.sync();
      return {
        comments: comments.items.map(c => ({
          id: c.id,
          author: c.authorName,
          content: c.content,
          createdAt: c.creationDate,
        })),
        count: comments.items.length,
      };
    });
  });

  registerTool({
    name: 'AddComment',
    description:
      'Add a comment to the currently selected text. May need a short delay before GetComments reflects it.',
    parameters: {
      properties: {text: {type: 'string', description: 'Comment text.'}},
      required: ['text'],
    },
  }, async (args: {text: string;}) => {
    return Word.run(async ctx => {
      const range = ctx.document.getSelection();
      range.insertComment(args.text);
      await ctx.sync();
      return {message: 'Comment added'};
    });
  });

  registerTool({
    name: 'DeleteComment',
    description: 'Delete a comment by its ID.',
    parameters: {
      properties: {id: {type: 'number', description: 'The comment ID.'}},
      required: ['id'],
    },
  }, async (args: {id: number;}) => {
    return Word.run(async ctx => {
      const comments = ctx.document.body.getComments();
      comments.load('items/id');
      await ctx.sync();
      const target = comments.items.find(c => c.id === String(args.id));
      if (target) {
        target.delete();
        await ctx.sync();
        return {message: `Comment ${args.id} deleted`};
      }
      throw new Error(`Comment ${args.id} not found`);
    });
  });

  registerTool({
    name: 'GetTrackedChanges',
    description: 'Get all tracked changes (revisions) in the document.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const changes = ctx.document.body.getTrackedChanges();
      changes.load(['author', 'date', 'text', 'type']);
      await ctx.sync();
      return {
        changes: changes.items.map(c => ({
          author: c.author,
          date: c.date,
          text: c.text,
          type: c.type,
        })),
        count: changes.items.length,
      };
    });
  });

  registerTool({
    name: 'AcceptAllTrackedChanges',
    description: 'Accept all tracked changes in the document.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const changes = ctx.document.body.getTrackedChanges();
      changes.acceptAll();
      await ctx.sync();
      return {message: 'All tracked changes accepted'};
    });
  });

  registerTool({
    name: 'RejectAllTrackedChanges',
    description: 'Reject all tracked changes in the document.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const changes = ctx.document.body.getTrackedChanges();
      changes.rejectAll();
      await ctx.sync();
      return {message: 'All tracked changes rejected'};
    });
  });

  registerTool({
    name: 'GetFootnotes',
    description: 'Get all footnotes in the document body.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const footnotes = ctx.document.body.footnotes;
      footnotes.load('items');
      await ctx.sync();
      for (const f of footnotes.items) f.body.load('text');
      await ctx.sync();
      return {
        footnotes: footnotes.items.map((f, i) => ({index: i, text: f.body.text})),
        count: footnotes.items.length,
      };
    });
  });

  registerTool({
    name: 'InsertFootnote',
    description: 'Insert a footnote at the current selection.',
    parameters: {
      properties: {text: {type: 'string', description: 'Footnote text.'}},
      required: ['text'],
    },
  }, async (args: {text: string;}) => {
    return Word.run(async ctx => {
      const range = ctx.document.getSelection();
      range.insertFootnote(args.text);
      await ctx.sync();
      return {message: 'Footnote inserted'};
    });
  });

  registerTool({
    name: 'GetEndnotes',
    description: 'Get all endnotes in the document body.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const endnotes = ctx.document.body.endnotes;
      endnotes.load('items');
      await ctx.sync();
      for (const e of endnotes.items) e.body.load('text');
      await ctx.sync();
      return {
        endnotes: endnotes.items.map((e, i) => ({index: i, text: e.body.text})),
        count: endnotes.items.length,
      };
    });
  });

  registerTool({
    name: 'InsertEndnote',
    description: 'Insert an endnote at the current selection.',
    parameters: {
      properties: {text: {type: 'string', description: 'Endnote text.'}},
      required: ['text'],
    },
  }, async (args: {text: string;}) => {
    return Word.run(async ctx => {
      const range = ctx.document.getSelection();
      range.insertEndnote(args.text);
      await ctx.sync();
      return {message: 'Endnote inserted'};
    });
  });

  registerTool({
    name: 'GetTables',
    description: 'Get all tables in the Word document with their row count and header text.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load(['rowCount', 'values']);
      await ctx.sync();
      return {
        tables: tables.items.map((t, i) => ({index: i, rows: t.rowCount, values: t.values})),
        count: tables.items.length,
      };
    });
  });

  registerTool({
    name: 'InsertTable',
    description: 'Insert a table into the Word document at the end of the body.',
    parameters: {
      properties: {
        rows: {type: 'number', description: 'Number of rows.'},
        columns: {type: 'number', description: 'Number of columns.'},
        values: {type: 'array', description: 'Optional 2D array of strings for cell values.'},
      },
      required: ['rows', 'columns'],
    },
  }, async (args: {rows: number; columns: number; values?: string[][];}) => {
    return Word.run(async ctx => {
      const data = args.values
        || Array.from({length: args.rows}, () => Array.from({length: args.columns}, () => ''));
      ctx.document.body.insertTable(args.rows, args.columns, Word.InsertLocation.end, data);
      await ctx.sync();
      return {message: `Inserted ${args.rows}x${args.columns} table`};
    });
  });

  registerTool({
    name: 'GetTableCell',
    description: 'Get the text of a specific cell in a table.',
    parameters: {
      properties: {
        tableIndex: {type: 'number', description: '0-based table index in the document.'},
        rowIndex: {type: 'number', description: '0-based row index.'},
        cellIndex: {type: 'number', description: '0-based cell index.'},
      },
      required: ['tableIndex', 'rowIndex', 'cellIndex'],
    },
  }, async (args: {tableIndex: number; rowIndex: number; cellIndex: number;}) => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load('items');
      await ctx.sync();
      if (args.tableIndex >= tables.items.length) {
        throw new Error(
          `Table index ${args.tableIndex} out of range (0-${tables.items.length - 1})`,
        );
      }
      const cell = tables.items[args.tableIndex].getCell(args.rowIndex, args.cellIndex);
      cell.body.load('text');
      await ctx.sync();
      return {text: cell.body.text};
    });
  });

  registerTool({
    name: 'SetTableCell',
    description: 'Set the text of a specific cell in a table.',
    parameters: {
      properties: {
        tableIndex: {type: 'number', description: '0-based table index.'},
        rowIndex: {type: 'number', description: '0-based row index.'},
        cellIndex: {type: 'number', description: '0-based cell index.'},
        text: {type: 'string', description: 'Text to set.'},
      },
      required: ['tableIndex', 'rowIndex', 'cellIndex', 'text'],
    },
  }, async (args: {tableIndex: number; rowIndex: number; cellIndex: number; text: string;}) => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load('items');
      await ctx.sync();
      if (args.tableIndex >= tables.items.length) {
        throw new Error(
          `Table index ${args.tableIndex} out of range (0-${tables.items.length - 1})`,
        );
      }
      const cell = tables.items[args.tableIndex].getCell(args.rowIndex, args.cellIndex);
      cell.body.insertText(args.text, Word.InsertLocation.replace);
      await ctx.sync();
      return {
        message: `Cell (${args.rowIndex}, ${args.cellIndex}) updated in table ${args.tableIndex}`,
      };
    });
  });

  registerTool({
    name: 'AddTableRows',
    description: 'Add rows to a table at the end or a specific location.',
    parameters: {
      properties: {
        tableIndex: {type: 'number', description: '0-based table index.'},
        count: {type: 'number', description: 'Number of rows to add. Default: 1.'},
        location: {
          type: 'string',
          description: '"End" (default) or "Start".',
          enum: ['End', 'Start'],
        },
      },
      required: ['tableIndex'],
    },
  }, async (args: {tableIndex: number; count?: number; location?: string;}) => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load('items');
      await ctx.sync();
      if (args.tableIndex >= tables.items.length) {
        throw new Error(
          `Table index ${args.tableIndex} out of range (0-${tables.items.length - 1})`,
        );
      }
      const loc = args.location === 'Start' ? Word.InsertLocation.start : Word.InsertLocation.end;
      tables.items[args.tableIndex].addRows(loc, args.count || 1);
      await ctx.sync();
      return {message: `${args.count || 1} row(s) added to table ${args.tableIndex}`};
    });
  });

  registerTool({
    name: 'DeleteTableRows',
    description: 'Delete rows from a table.',
    parameters: {
      properties: {
        tableIndex: {type: 'number', description: '0-based table index.'},
        rowIndex: {type: 'number', description: '0-based index of the first row to delete.'},
        count: {type: 'number', description: 'Number of rows to delete. Default: 1.'},
      },
      required: ['tableIndex', 'rowIndex'],
    },
  }, async (args: {tableIndex: number; rowIndex: number; count?: number;}) => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load('items');
      await ctx.sync();
      if (args.tableIndex >= tables.items.length) {
        throw new Error(
          `Table index ${args.tableIndex} out of range (0-${tables.items.length - 1})`,
        );
      }
      tables.items[args.tableIndex].deleteRows(args.rowIndex, args.count);
      await ctx.sync();
      return {message: `Row(s) deleted from table ${args.tableIndex}`};
    });
  });

  registerTool({
    name: 'AddTableColumns',
    description: 'Add columns to a table. Call GetTables first to confirm the current table index.',
    parameters: {
      properties: {
        tableIndex: {type: 'number', description: '0-based table index.'},
        count: {type: 'number', description: 'Number of columns to add. Default: 1.'},
        location: {
          type: 'string',
          description: '"End" (default) or "Start".',
          enum: ['End', 'Start'],
        },
      },
      required: ['tableIndex'],
    },
  }, async (args: {tableIndex: number; count?: number; location?: string;}) => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load('items');
      await ctx.sync();
      if (args.tableIndex >= tables.items.length) {
        throw new Error(
          `Table index ${args.tableIndex} out of range (0-${tables.items.length - 1})`,
        );
      }
      const loc = args.location === 'Start' ? Word.InsertLocation.start : Word.InsertLocation.end;
      tables.items[args.tableIndex].addColumns(loc, args.count || 1);
      await ctx.sync();
      return {message: `${args.count || 1} column(s) added to table ${args.tableIndex}`};
    });
  });

  registerTool({
    name: 'DeleteTableColumns',
    description: 'Delete columns from a table.',
    parameters: {
      properties: {
        tableIndex: {type: 'number', description: '0-based table index.'},
        columnIndex: {type: 'number', description: '0-based index of the first column to delete.'},
        count: {type: 'number', description: 'Number of columns to delete. Default: 1.'},
      },
      required: ['tableIndex', 'columnIndex'],
    },
  }, async (args: {tableIndex: number; columnIndex: number; count?: number;}) => {
    return Word.run(async ctx => {
      const tables = ctx.document.body.tables;
      tables.load('items');
      await ctx.sync();
      if (args.tableIndex >= tables.items.length) {
        throw new Error(
          `Table index ${args.tableIndex} out of range (0-${tables.items.length - 1})`,
        );
      }
      tables.items[args.tableIndex].deleteColumns(args.columnIndex, args.count);
      await ctx.sync();
      return {message: `Column(s) deleted from table ${args.tableIndex}`};
    });
  });

  registerTool({
    name: 'GetFields',
    description: 'Get all fields in the document body with their code and result text.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const fields = ctx.document.body.fields;
      fields.load(['code', 'result/text', 'type']);
      await ctx.sync();
      return {
        fields: fields.items.map((f, i) => ({
          index: i,
          code: f.code,
          result: f.result?.text,
          type: f.type,
        })),
        count: fields.items.length,
      };
    });
  });

  registerTool({
    name: 'InsertField',
    description: 'Insert a field at the current selection.',
    parameters: {
      properties: {
        type: {
          type: 'string',
          description:
            'Word.FieldType value: "Date", "Page", "NumPages", "Author", "Time", "Title", "FileName", "CreateDate", "SaveDate", "TOC", "Index", "Seq", "Ref", "Hyperlink", etc.',
        },
        switches: {
          type: 'string',
          description: 'Optional field switches, e.g. "\\\\@ \\"yyyy-MM-dd\\"" for date format.',
        },
      },
      required: ['type'],
    },
  }, async (args: {type: string; switches?: string;}) => {
    return Word.run(async ctx => {
      ctx.document.getSelection().insertField(
        Word.InsertLocation.replace,
        args.type as any,
        args.switches,
        true,
      );
      await ctx.sync();
      return {message: 'Field inserted'};
    });
  });

  registerTool({
    name: 'GetCustomProperties',
    description: 'Get all custom document properties.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const props = ctx.document.properties.customProperties;
      props.load(['key', 'value', 'type']);
      await ctx.sync();
      return {properties: props.items.map(p => ({key: p.key, value: p.value, type: p.type}))};
    });
  });

  registerTool({
    name: 'SetCustomProperty',
    description: 'Set a custom document property.',
    parameters: {
      properties: {
        key: {type: 'string', description: 'Property key.'},
        value: {type: 'string', description: 'Property value.'},
      },
      required: ['key', 'value'],
    },
  }, async (args: {key: string; value: string;}) => {
    return Word.run(async ctx => {
      ctx.document.properties.customProperties.add(args.key, args.value);
      await ctx.sync();
      return {message: `Custom property "${args.key}" set`};
    });
  });

  registerTool({
    name: 'GetInlinePictures',
    description: 'Get all inline pictures in the document with their dimensions.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Word.run(async ctx => {
      const pics = ctx.document.body.inlinePictures;
      pics.load(['altTextDescription', 'width', 'height', 'hyperlink']);
      await ctx.sync();
      return {
        pictures: pics.items.map((p, i) => ({
          index: i,
          altText: p.altTextDescription,
          width: p.width,
          height: p.height,
          hyperlink: p.hyperlink,
        })),
        count: pics.items.length,
      };
    });
  });

  registerTool({
    name: 'ResizeInlinePicture',
    description: 'Resize an inline picture by its 0-based index.',
    parameters: {
      properties: {
        index: {type: 'number', description: '0-based picture index.'},
        width: {type: 'number', description: 'New width in points.'},
        height: {type: 'number', description: 'New height in points.'},
      },
      required: ['index'],
    },
  }, async (args: {index: number; width?: number; height?: number;}) => {
    return Word.run(async ctx => {
      const pics = ctx.document.body.inlinePictures;
      pics.load('items');
      await ctx.sync();
      if (args.index >= pics.items.length) {
        throw new Error(`Picture index ${args.index} out of range (0-${pics.items.length - 1})`);
      }
      const pic = pics.items[args.index];
      if (args.width !== undefined) pic.width = args.width;
      if (args.height !== undefined) pic.height = args.height;
      await ctx.sync();
      return {message: `Picture ${args.index} resized`};
    });
  });
}
