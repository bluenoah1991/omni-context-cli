import { registerTool } from '../services/toolManager';

async function getSlide(
  ctx: PowerPoint.RequestContext,
  slideIndex: number,
): Promise<PowerPoint.Slide> {
  const slides = ctx.presentation.slides;
  slides.load('items');
  await ctx.sync();
  if (slideIndex < 0 || slideIndex >= slides.items.length) {
    throw new Error(`Slide index ${slideIndex} out of range (0-${slides.items.length - 1})`);
  }
  return slides.items[slideIndex];
}

async function getShapeByName(
  ctx: PowerPoint.RequestContext,
  slideIndex: number,
  shapeName: string,
): Promise<PowerPoint.Shape> {
  const slide = await getSlide(ctx, slideIndex);
  const shapes = slide.shapes;
  shapes.load(['name']);
  await ctx.sync();
  const target = shapes.items.find(s => s.name === shapeName);
  if (!target) throw new Error(`Shape "${shapeName}" not found on slide ${slideIndex}`);
  return target;
}

export function registerPowerPointTools(): void {
  registerTool({
    name: 'GetSlides',
    description: 'Get information about all slides in the current PowerPoint presentation.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return PowerPoint.run(async ctx => {
      const slides = ctx.presentation.slides;
      slides.load('items');
      await ctx.sync();
      return {
        count: slides.items.length,
        slides: slides.items.map((s, i) => ({index: i, id: s.id})),
      };
    });
  });

  registerTool({
    name: 'AddSlide',
    description: 'Add a new blank slide to the presentation.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return PowerPoint.run(async ctx => {
      ctx.presentation.slides.add();
      const slides = ctx.presentation.slides;
      slides.load('items');
      await ctx.sync();
      return {message: 'Slide added', totalSlides: slides.items.length};
    });
  });

  registerTool({
    name: 'DeleteSlide',
    description: 'Delete a slide by its 0-based index.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: 'The 0-based index of the slide to delete.'},
      },
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      slide.delete();
      await ctx.sync();
      return {message: `Slide ${args.slideIndex} deleted`};
    });
  });

  registerTool({
    name: 'MoveSlide',
    description: 'Move a slide to a new position in the presentation.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based index of the slide to move.'},
        targetIndex: {type: 'number', description: '0-based target position.'},
      },
      required: ['slideIndex', 'targetIndex'],
    },
  }, async (args: {slideIndex: number; targetIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      (slide as any).moveTo(args.targetIndex);
      await ctx.sync();
      return {message: `Slide ${args.slideIndex} moved to position ${args.targetIndex}`};
    });
  });

  registerTool({
    name: 'SelectSlide',
    description: 'Navigate to and select a specific slide by index.',
    parameters: {
      properties: {slideIndex: {type: 'number', description: '0-based slide index.'}},
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      ctx.presentation.setSelectedSlides([slide.id]);
      await ctx.sync();
      return {message: `Selected slide ${args.slideIndex}`};
    });
  });

  registerTool({
    name: 'GetSelectedSlideIndex',
    description: 'Get the index of the currently selected slide.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return PowerPoint.run(async ctx => {
      const selected = ctx.presentation.getSelectedSlides();
      selected.load('items');
      const allSlides = ctx.presentation.slides;
      allSlides.load('items');
      await ctx.sync();
      if (selected.items.length === 0) return {selectedIndex: -1};
      const selectedId = selected.items[0].id;
      const index = allSlides.items.findIndex(s => s.id === selectedId);
      return {selectedIndex: index};
    });
  });

  registerTool({
    name: 'GetSlideText',
    description: 'Get all text content from a specific slide by its 0-based index.',
    parameters: {
      properties: {slideIndex: {type: 'number', description: 'The 0-based index of the slide.'}},
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const shapes = slide.shapes;
      shapes.load('items');
      await ctx.sync();
      const texts: string[] = [];
      for (const shape of shapes.items) {
        try {
          const tr = shape.textFrame.textRange;
          tr.load('text');
          await ctx.sync();
          if (tr.text.trim()) texts.push(tr.text);
        } catch {}
      }
      return {slideIndex: args.slideIndex, texts, content: texts.join('\n')};
    });
  });

  registerTool({
    name: 'GetAllSlidesText',
    description: 'Get text content from every slide in the presentation.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return PowerPoint.run(async ctx => {
      const slides = ctx.presentation.slides;
      slides.load('items');
      await ctx.sync();
      const result: Array<{index: number; texts: string[];}> = [];
      for (let i = 0; i < slides.items.length; i++) {
        const shapes = slides.items[i].shapes;
        shapes.load('items');
        await ctx.sync();
        const texts: string[] = [];
        for (const shape of shapes.items) {
          try {
            const tr = shape.textFrame.textRange;
            tr.load('text');
            await ctx.sync();
            if (tr.text.trim()) texts.push(tr.text);
          } catch {}
        }
        result.push({index: i, texts});
      }
      return {slides: result, count: slides.items.length};
    });
  });

  registerTool({
    name: 'SetSlideText',
    description:
      'Set the text of a specific shape on a slide. Targets the first text shape if shapeIndex is omitted.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        text: {type: 'string', description: 'Text to set.'},
        shapeIndex: {
          type: 'number',
          description: '0-based shape index within the slide. Default: first text shape.',
        },
      },
      required: ['slideIndex', 'text'],
    },
  }, async (args: {slideIndex: number; text: string; shapeIndex?: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const shapes = slide.shapes;
      shapes.load('items');
      await ctx.sync();
      if (args.shapeIndex !== undefined) {
        if (args.shapeIndex < 0 || args.shapeIndex >= shapes.items.length) {
          throw new Error(`Shape index ${args.shapeIndex} out of range`);
        }
        shapes.items[args.shapeIndex].textFrame.textRange.text = args.text;
        await ctx.sync();
        return {message: `Text set on slide ${args.slideIndex}, shape ${args.shapeIndex}`};
      }
      for (const shape of shapes.items) {
        try {
          shape.textFrame.textRange.text = args.text;
          await ctx.sync();
          return {message: `Text set on slide ${args.slideIndex}`};
        } catch {}
      }
      throw new Error(`No text shape found on slide ${args.slideIndex}`);
    });
  });

  registerTool({
    name: 'ExportSlideAsBase64',
    description: 'Export a single slide as a base64-encoded .pptx file.',
    parameters: {
      properties: {slideIndex: {type: 'number', description: '0-based slide index.'}},
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const result = (slide as any).exportAsBase64();
      await ctx.sync();
      return {base64: result.value};
    });
  });

  registerTool({
    name: 'GetSlideImage',
    description: 'Render a slide as a base64-encoded PNG image.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        width: {type: 'number', description: 'Image width in pixels. Default: 960.'},
        height: {type: 'number', description: 'Image height in pixels. Default: 540.'},
      },
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number; width?: number; height?: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const options: any = {};
      if (args.width) options.width = args.width;
      if (args.height) options.height = args.height;
      const result = (slide as any).getImageAsBase64(options);
      await ctx.sync();
      return {base64: result.value};
    });
  });

  registerTool({
    name: 'GetSlideLayout',
    description: 'Get the layout name of a specific slide.',
    parameters: {
      properties: {slideIndex: {type: 'number', description: '0-based slide index.'}},
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const layout = slide.layout;
      layout.load('name');
      await ctx.sync();
      return {slideIndex: args.slideIndex, layoutName: layout.name};
    });
  });

  registerTool({
    name: 'GetSlideMasters',
    description: 'Get information about all slide masters in the presentation.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return PowerPoint.run(async ctx => {
      const masters = ctx.presentation.slideMasters;
      masters.load(['id', 'name']);
      await ctx.sync();
      return {
        masters: masters.items.map(m => ({id: m.id, name: m.name})),
        count: masters.items.length,
      };
    });
  });

  registerTool({
    name: 'ApplySlideLayout',
    description: 'Apply a layout to a slide by layout name.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        layoutName: {
          type: 'string',
          description: 'Layout name, e.g. "Title Slide", "Title and Content", "Blank".',
        },
        masterIndex: {type: 'number', description: '0-based slide master index. Default: 0.'},
      },
      required: ['slideIndex', 'layoutName'],
    },
  }, async (args: {slideIndex: number; layoutName: string; masterIndex?: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const masters = ctx.presentation.slideMasters;
      masters.load('items');
      await ctx.sync();
      const master = masters.items[args.masterIndex ?? 0];
      const layouts = master.layouts;
      layouts.load(['name']);
      await ctx.sync();
      const layout = layouts.items.find(l => l.name === args.layoutName);
      if (!layout) {
        const names = layouts.items.map(l => l.name);
        throw new Error(`Layout "${args.layoutName}" not found. Available: ${names.join(', ')}`);
      }
      (slide as any).applyLayout(layout);
      await ctx.sync();
      return {message: `Layout "${args.layoutName}" applied to slide ${args.slideIndex}`};
    });
  });

  registerTool({
    name: 'GetShapes',
    description: 'Get all shapes on a slide with their name, type, position and size.',
    parameters: {
      properties: {slideIndex: {type: 'number', description: '0-based slide index.'}},
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const shapes = slide.shapes;
      shapes.load(['name', 'type', 'left', 'top', 'width', 'height', 'id']);
      await ctx.sync();
      return {
        shapes: shapes.items.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          left: s.left,
          top: s.top,
          width: s.width,
          height: s.height,
        })),
        count: shapes.items.length,
      };
    });
  });

  registerTool(
    {
      name: 'AddTextBox',
      description: 'Add a text box shape to a slide.',
      parameters: {
        properties: {
          slideIndex: {type: 'number', description: '0-based slide index.'},
          text: {type: 'string', description: 'Text content for the text box.'},
          left: {type: 'number', description: 'Left position in points. Default: 100.'},
          top: {type: 'number', description: 'Top position in points. Default: 100.'},
          width: {type: 'number', description: 'Width in points. Default: 400.'},
          height: {type: 'number', description: 'Height in points. Default: 50.'},
        },
        required: ['slideIndex', 'text'],
      },
    },
    async (
      args: {
        slideIndex: number;
        text: string;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
      },
    ) => {
      return PowerPoint.run(async ctx => {
        const slide = await getSlide(ctx, args.slideIndex);
        const options: PowerPoint.ShapeAddOptions = {
          left: args.left ?? 100,
          top: args.top ?? 100,
          width: args.width ?? 400,
          height: args.height ?? 50,
        };
        const shape = slide.shapes.addTextBox(args.text, options);
        shape.load('id');
        await ctx.sync();
        return {message: 'Text box added', shapeId: shape.id};
      });
    },
  );

  registerTool({
    name: 'AddGeometricShape',
    description: 'Add a geometric shape (rectangle, oval, arrow, etc.) to a slide.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        geometricShapeType: {
          type: 'string',
          description:
            'Shape type: "Rectangle", "Oval", "Triangle", "RightArrow", "Star5", "Diamond", "RoundedRectangle", etc.',
        },
        left: {type: 'number', description: 'Left in points. Default: 100.'},
        top: {type: 'number', description: 'Top in points. Default: 100.'},
        width: {type: 'number', description: 'Width in points. Default: 200.'},
        height: {type: 'number', description: 'Height in points. Default: 150.'},
      },
      required: ['slideIndex', 'geometricShapeType'],
    },
  }, async (args: any) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const options: PowerPoint.ShapeAddOptions = {
        left: args.left ?? 100,
        top: args.top ?? 100,
        width: args.width ?? 200,
        height: args.height ?? 150,
      };
      const shape = slide.shapes.addGeometricShape(args.geometricShapeType as any, options);
      shape.load('id');
      await ctx.sync();
      return {message: `Shape "${args.geometricShapeType}" added`, shapeId: shape.id};
    });
  });

  registerTool({
    name: 'AddLine',
    description: 'Add a line shape to a slide.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        connectorType: {
          type: 'string',
          description: '"Straight" (default), "Elbow", or "Curve".',
          enum: ['Straight', 'Elbow', 'Curve'],
        },
        left: {type: 'number', description: 'Start X. Default: 100.'},
        top: {type: 'number', description: 'Start Y. Default: 100.'},
        width: {type: 'number', description: 'Horizontal extent. Default: 300.'},
        height: {type: 'number', description: 'Vertical extent. Default: 0.'},
      },
      required: ['slideIndex'],
    },
  }, async (args: any) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const options: PowerPoint.ShapeAddOptions = {
        left: args.left ?? 100,
        top: args.top ?? 100,
        width: args.width ?? 300,
        height: args.height ?? 0,
      };
      const shape = slide.shapes.addLine((args.connectorType as any) || 'Straight', options);
      shape.load('id');
      await ctx.sync();
      return {message: 'Line added', shapeId: shape.id};
    });
  });

  registerTool({
    name: 'AddTable',
    description: 'Add a table to a slide.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        rows: {type: 'number', description: 'Number of rows.'},
        columns: {type: 'number', description: 'Number of columns.'},
        left: {type: 'number', description: 'Left position in points. Default: 100.'},
        top: {type: 'number', description: 'Top position in points. Default: 100.'},
        width: {type: 'number', description: 'Width in points. Default: 500.'},
        height: {type: 'number', description: 'Height in points. Default: 300.'},
      },
      required: ['slideIndex', 'rows', 'columns'],
    },
  }, async (args: any) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const options: any = {
        left: args.left ?? 100,
        top: args.top ?? 100,
        width: args.width ?? 500,
        height: args.height ?? 300,
      };
      (slide.shapes as any).addTable(args.rows, args.columns, options);
      await ctx.sync();
      return {message: `${args.rows}x${args.columns} table added to slide ${args.slideIndex}`};
    });
  });

  registerTool({
    name: 'DeleteShape',
    description: 'Delete a shape from a slide by shape name or ID.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Name of the shape to delete.'},
      },
      required: ['slideIndex', 'shapeName'],
    },
  }, async (args: {slideIndex: number; shapeName: string;}) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      target.delete();
      await ctx.sync();
      return {message: `Shape "${args.shapeName}" deleted`};
    });
  });

  registerTool({
    name: 'MoveResizeShape',
    description: 'Move and/or resize a shape on a slide.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        left: {type: 'number', description: 'New left position in points.'},
        top: {type: 'number', description: 'New top position in points.'},
        width: {type: 'number', description: 'New width in points.'},
        height: {type: 'number', description: 'New height in points.'},
      },
      required: ['slideIndex', 'shapeName'],
    },
  }, async (args: any) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      if (args.left !== undefined) target.left = args.left;
      if (args.top !== undefined) target.top = args.top;
      if (args.width !== undefined) target.width = args.width;
      if (args.height !== undefined) target.height = args.height;
      await ctx.sync();
      return {message: `Shape "${args.shapeName}" updated`};
    });
  });

  registerTool({
    name: 'SetShapeFill',
    description: 'Set the fill color of a shape.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        color: {type: 'string', description: 'Fill color, e.g. "#FF0000".'},
      },
      required: ['slideIndex', 'shapeName', 'color'],
    },
  }, async (args: {slideIndex: number; shapeName: string; color: string;}) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      target.fill.setSolidColor(args.color);
      await ctx.sync();
      return {message: `Fill color set on "${args.shapeName}"`};
    });
  });

  registerTool({
    name: 'SetShapeLineFormat',
    description: 'Set the outline/border of a shape.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        color: {type: 'string', description: 'Line color, e.g. "#000000".'},
        weight: {type: 'number', description: 'Line weight in points.'},
      },
      required: ['slideIndex', 'shapeName'],
    },
  }, async (args: {slideIndex: number; shapeName: string; color?: string; weight?: number;}) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      if (args.color) target.lineFormat.color = args.color;
      if (args.weight) target.lineFormat.weight = args.weight;
      await ctx.sync();
      return {message: `Line format set on "${args.shapeName}"`};
    });
  });

  registerTool({
    name: 'SetTextFormat',
    description: 'Set font formatting on text within a shape.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        fontName: {type: 'string', description: 'Font name.'},
        fontSize: {type: 'number', description: 'Font size in points.'},
        fontBold: {type: 'boolean', description: 'Bold.'},
        fontItalic: {type: 'boolean', description: 'Italic.'},
        fontColor: {type: 'string', description: 'Font color, e.g. "#FFFFFF".'},
      },
      required: ['slideIndex', 'shapeName'],
    },
  }, async (args: any) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      const font = target.textFrame.textRange.font;
      if (args.fontName) font.name = args.fontName;
      if (args.fontSize) font.size = args.fontSize;
      if (args.fontBold !== undefined) font.bold = args.fontBold;
      if (args.fontItalic !== undefined) font.italic = args.fontItalic;
      if (args.fontColor) font.color = args.fontColor;
      await ctx.sync();
      return {message: `Text format set on "${args.shapeName}"`};
    });
  });

  registerTool({
    name: 'SetShapeHyperlink',
    description: 'Set a hyperlink on a shape.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        url: {type: 'string', description: 'Hyperlink URL.'},
      },
      required: ['slideIndex', 'shapeName', 'url'],
    },
  }, async (args: {slideIndex: number; shapeName: string; url: string;}) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      (target.textFrame.textRange as any).hyperlink = {url: args.url};
      await ctx.sync();
      return {message: `Hyperlink set on "${args.shapeName}"`};
    });
  });

  registerTool({
    name: 'SetShapeZOrder',
    description: 'Change the z-order (layering) of a shape on a slide.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        position: {
          type: 'string',
          description: '"BringToFront", "SendToBack", "BringForward", "SendBackward".',
          enum: ['BringToFront', 'SendToBack', 'BringForward', 'SendBackward'],
        },
      },
      required: ['slideIndex', 'shapeName', 'position'],
    },
  }, async (args: {slideIndex: number; shapeName: string; position: string;}) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      (target as any).setZOrder(args.position);
      await ctx.sync();
      return {message: `Shape "${args.shapeName}" z-order set to ${args.position}`};
    });
  });

  registerTool({
    name: 'SetShapeRotation',
    description: 'Set the rotation angle of a shape.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        shapeName: {type: 'string', description: 'Shape name.'},
        degrees: {type: 'number', description: 'Rotation in degrees (0-360).'},
      },
      required: ['slideIndex', 'shapeName', 'degrees'],
    },
  }, async (args: {slideIndex: number; shapeName: string; degrees: number;}) => {
    return PowerPoint.run(async ctx => {
      const target = await getShapeByName(ctx, args.slideIndex, args.shapeName);
      (target as any).rotation = args.degrees;
      await ctx.sync();
      return {message: `Shape "${args.shapeName}" rotated to ${args.degrees} degrees`};
    });
  });

  registerTool({
    name: 'GetSlideTags',
    description: 'Get all tags (custom key-value pairs) on a slide.',
    parameters: {
      properties: {slideIndex: {type: 'number', description: '0-based slide index.'}},
      required: ['slideIndex'],
    },
  }, async (args: {slideIndex: number;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      const tags = slide.tags;
      tags.load(['key', 'value']);
      await ctx.sync();
      return {tags: tags.items.map(t => ({key: t.key, value: t.value}))};
    });
  });

  registerTool({
    name: 'SetSlideTag',
    description: 'Set a tag (custom key-value pair) on a slide.',
    parameters: {
      properties: {
        slideIndex: {type: 'number', description: '0-based slide index.'},
        key: {type: 'string', description: 'Tag key.'},
        value: {type: 'string', description: 'Tag value.'},
      },
      required: ['slideIndex', 'key', 'value'],
    },
  }, async (args: {slideIndex: number; key: string; value: string;}) => {
    return PowerPoint.run(async ctx => {
      const slide = await getSlide(ctx, args.slideIndex);
      slide.tags.add(args.key, args.value);
      await ctx.sync();
      return {message: `Tag "${args.key}" set on slide ${args.slideIndex}`};
    });
  });

  registerTool({
    name: 'GetPresentationProperties',
    description: 'Get document properties of the PowerPoint presentation (title, author, etc.).',
    parameters: {properties: {}, required: []},
  }, async () => {
    return PowerPoint.run(async ctx => {
      const props = ctx.presentation.properties;
      props.load(['title', 'author', 'subject', 'keywords', 'creationDate']);
      await ctx.sync();
      return {
        title: props.title,
        author: props.author,
        subject: props.subject,
        keywords: props.keywords,
        creationDate: props.creationDate,
      };
    });
  });

  registerTool({
    name: 'SetPresentationProperties',
    description: 'Set document properties on the PowerPoint presentation.',
    parameters: {
      properties: {
        title: {type: 'string', description: 'Title.'},
        author: {type: 'string', description: 'Author.'},
        subject: {type: 'string', description: 'Subject.'},
        keywords: {type: 'string', description: 'Keywords.'},
      },
      required: [],
    },
  }, async (args: any) => {
    return PowerPoint.run(async ctx => {
      const props = ctx.presentation.properties;
      if (args.title !== undefined) props.title = args.title;
      if (args.author !== undefined) props.author = args.author;
      if (args.subject !== undefined) props.subject = args.subject;
      if (args.keywords !== undefined) props.keywords = args.keywords;
      await ctx.sync();
      return {message: 'Presentation properties updated'};
    });
  });
}
