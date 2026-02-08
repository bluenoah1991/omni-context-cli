import { registerTool } from '../services/toolManager';

function getSheet(ctx: Excel.RequestContext, name?: string): Excel.Worksheet {
  return name
    ? ctx.workbook.worksheets.getItem(name)
    : ctx.workbook.worksheets.getActiveWorksheet();
}

export function registerExcelTools(): void {
  registerTool({
    name: 'GetWorkbookProperties',
    description: 'Get workbook properties such as title, author, and creation date.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      const props = ctx.workbook.properties;
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
    name: 'SetWorkbookProperties',
    description: 'Set workbook properties such as title, author, subject.',
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
    return Excel.run(async ctx => {
      const props = ctx.workbook.properties;
      if (args.title !== undefined) props.title = args.title;
      if (args.author !== undefined) props.author = args.author;
      if (args.subject !== undefined) props.subject = args.subject;
      if (args.keywords !== undefined) props.keywords = args.keywords;
      await ctx.sync();
      return {message: 'Workbook properties updated'};
    });
  });

  registerTool({
    name: 'CalculateWorkbook',
    description: 'Recalculate all formulas in the workbook.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      ctx.workbook.application.calculate(Excel.CalculationType.full);
      await ctx.sync();
      return {message: 'Workbook recalculated'};
    });
  });

  registerTool({
    name: 'GetSheetNames',
    description: 'Get the names of all worksheets in the current Excel workbook.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      const sheets = ctx.workbook.worksheets;
      sheets.load('items/name');
      await ctx.sync();
      return {sheets: sheets.items.map(s => s.name)};
    });
  });

  registerTool({
    name: 'AddSheet',
    description: 'Add a new worksheet to the Excel workbook.',
    parameters: {
      properties: {name: {type: 'string', description: 'Optional worksheet name.'}},
      required: [],
    },
  }, async (args: {name?: string;}) => {
    return Excel.run(async ctx => {
      const sheet = ctx.workbook.worksheets.add(args.name);
      sheet.load('name');
      await ctx.sync();
      return {name: sheet.name, message: `Created worksheet "${sheet.name}"`};
    });
  });

  registerTool({
    name: 'DeleteSheet',
    description: 'Delete a worksheet by name.',
    parameters: {
      properties: {name: {type: 'string', description: 'Worksheet name to delete.'}},
      required: ['name'],
    },
  }, async (args: {name: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.worksheets.getItem(args.name).delete();
      await ctx.sync();
      return {message: `Deleted worksheet "${args.name}"`};
    });
  });

  registerTool({
    name: 'RenameSheet',
    description: 'Rename a worksheet.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Current worksheet name.'},
        newName: {type: 'string', description: 'New name.'},
      },
      required: ['name', 'newName'],
    },
  }, async (args: {name: string; newName: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.worksheets.getItem(args.name).name = args.newName;
      await ctx.sync();
      return {message: `Renamed "${args.name}" to "${args.newName}"`};
    });
  });

  registerTool({
    name: 'CopySheet',
    description: 'Create a copy of an existing worksheet.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Name of the worksheet to copy.'},
        newName: {type: 'string', description: 'Optional name for the copy.'},
      },
      required: ['name'],
    },
  }, async (args: {name: string; newName?: string;}) => {
    return Excel.run(async ctx => {
      const copy = ctx.workbook.worksheets.getItem(args.name).copy();
      if (args.newName) copy.name = args.newName;
      copy.load('name');
      await ctx.sync();
      return {name: copy.name, message: `Copied to "${copy.name}"`};
    });
  });

  registerTool({
    name: 'MoveSheet',
    description: 'Move a worksheet to a new position in the workbook.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Worksheet name.'},
        position: {type: 'number', description: '0-based target position.'},
      },
      required: ['name', 'position'],
    },
  }, async (args: {name: string; position: number;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.worksheets.getItem(args.name).position = args.position;
      await ctx.sync();
      return {message: `Sheet "${args.name}" moved to position ${args.position}`};
    });
  });

  registerTool({
    name: 'ActivateSheet',
    description: 'Switch to a specific worksheet by name.',
    parameters: {
      properties: {name: {type: 'string', description: 'Worksheet name.'}},
      required: ['name'],
    },
  }, async (args: {name: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.worksheets.getItem(args.name).activate();
      await ctx.sync();
      return {message: `Activated worksheet "${args.name}"`};
    });
  });

  registerTool({
    name: 'SetSheetVisibility',
    description: 'Show or hide a worksheet.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Worksheet name.'},
        visibility: {
          type: 'string',
          description: '"Visible", "Hidden", or "VeryHidden".',
          enum: ['Visible', 'Hidden', 'VeryHidden'],
        },
      },
      required: ['name', 'visibility'],
    },
  }, async (args: {name: string; visibility: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.worksheets.getItem(args.name).visibility = args.visibility as any;
      await ctx.sync();
      return {message: `Sheet "${args.name}" set to ${args.visibility}`};
    });
  });

  registerTool({
    name: 'SetSheetTabColor',
    description: 'Set the tab color of a worksheet.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Worksheet name.'},
        color: {
          type: 'string',
          description: 'Tab color, e.g. "#FF0000". Use empty string to clear.',
        },
      },
      required: ['name', 'color'],
    },
  }, async (args: {name: string; color: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.worksheets.getItem(args.name).tabColor = args.color;
      await ctx.sync();
      return {message: `Tab color of "${args.name}" set`};
    });
  });

  registerTool({
    name: 'ProtectSheet',
    description: 'Protect a worksheet to prevent editing.',
    parameters: {
      properties: {
        sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'},
        password: {type: 'string', description: 'Optional protection password.'},
      },
      required: [],
    },
  }, async (args: {sheet?: string; password?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.protection.protect({} as any, args.password);
      await ctx.sync();
      return {message: 'Sheet protected'};
    });
  });

  registerTool({
    name: 'UnprotectSheet',
    description: 'Remove protection from a worksheet.',
    parameters: {
      properties: {
        sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'},
        password: {type: 'string', description: 'Protection password.'},
      },
      required: [],
    },
  }, async (args: {sheet?: string; password?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.protection.unprotect(args.password);
      await ctx.sync();
      return {message: 'Sheet unprotected'};
    });
  });

  registerTool({
    name: 'GetSelectedRange',
    description: 'Get the address, values, and formulas of the currently selected range.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      const range = ctx.workbook.getSelectedRange();
      range.load(['address', 'values', 'formulas']);
      await ctx.sync();
      return {address: range.address, values: range.values, formulas: range.formulas};
    });
  });

  registerTool({
    name: 'GetActiveCell',
    description: 'Get the address, value and formula of the currently active cell.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      const cell = ctx.workbook.getActiveCell();
      cell.load(['address', 'values', 'formulas']);
      await ctx.sync();
      return {address: cell.address, value: cell.values[0][0], formula: cell.formulas[0][0]};
    });
  });

  registerTool({
    name: 'SelectRange',
    description: 'Select a range in the Excel UI so the user can see it.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address, e.g. "A1:C10".'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      getSheet(ctx, args.sheet).getRange(args.address).select();
      await ctx.sync();
      return {message: `Selected ${args.address}`};
    });
  });

  registerTool({
    name: 'ReadRange',
    description: 'Read values from a specific range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address, e.g. "A1:C10".'},
        sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const range = getSheet(ctx, args.sheet).getRange(args.address);
      range.load(['address', 'values', 'formulas', 'text']);
      await ctx.sync();
      return {
        address: range.address,
        values: range.values,
        formulas: range.formulas,
        text: range.text,
      };
    });
  });

  registerTool({
    name: 'GetUsedRange',
    description: 'Get the address and values of the used range on a worksheet.',
    parameters: {
      properties: {sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'}},
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const range = ws.getUsedRange();
      range.load(['address', 'values', 'rowCount', 'columnCount']);
      await ctx.sync();
      return {
        address: range.address,
        rows: range.rowCount,
        columns: range.columnCount,
        values: range.values,
      };
    });
  });

  registerTool({
    name: 'WriteRange',
    description: 'Write values to a specific range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address, e.g. "A1:C3".'},
        values: {
          type: 'array',
          description: '2D array of values. Dimensions must match the range.',
        },
        sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'},
      },
      required: ['address', 'values'],
    },
  }, async (args: {address: string; values: unknown[][]; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).values = args.values;
      await ctx.sync();
      return {message: `Wrote values to ${args.address}`};
    });
  });

  registerTool({
    name: 'WriteFormulas',
    description: 'Write formulas to a specific range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        formulas: {
          type: 'array',
          description: '2D array of formula strings, e.g. [["=SUM(A1:A5)"]].',
        },
        sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'},
      },
      required: ['address', 'formulas'],
    },
  }, async (args: {address: string; formulas: string[][]; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).formulas = args.formulas;
      await ctx.sync();
      return {message: `Wrote formulas to ${args.address}`};
    });
  });

  registerTool({
    name: 'ClearRange',
    description: 'Clear the contents, formats, or both from a range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        applyTo: {
          type: 'string',
          description: '"All" (default), "Contents", or "Formats".',
          enum: ['All', 'Contents', 'Formats'],
        },
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; applyTo?: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).clear(args.applyTo as any || 'All');
      await ctx.sync();
      return {message: `Cleared ${args.address}`};
    });
  });

  registerTool({
    name: 'CopyRange',
    description: 'Copy values, formulas, or formatting from one range to another.',
    parameters: {
      properties: {
        source: {type: 'string', description: 'Source range address, e.g. "A1:C3".'},
        destination: {type: 'string', description: 'Destination range address.'},
        copyType: {
          type: 'string',
          description: '"All" (default), "Values", "Formulas", or "Formats".',
          enum: ['All', 'Values', 'Formulas', 'Formats'],
        },
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['source', 'destination'],
    },
  }, async (args: {source: string; destination: string; copyType?: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.destination).copyFrom(
        ws.getRange(args.source),
        (args.copyType as any) || 'All',
      );
      await ctx.sync();
      return {message: `Copied ${args.source} to ${args.destination}`};
    });
  });

  registerTool({
    name: 'InsertRange',
    description: 'Insert blank cells into a range, shifting existing cells down or right.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        shift: {type: 'string', description: '"Down" or "Right".', enum: ['Down', 'Right']},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'shift'],
    },
  }, async (args: {address: string; shift: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).insert(
        args.shift === 'Right' ? Excel.InsertShiftDirection.right : Excel.InsertShiftDirection.down,
      );
      await ctx.sync();
      return {message: `Inserted cells at ${args.address}, shifted ${args.shift.toLowerCase()}`};
    });
  });

  registerTool({
    name: 'DeleteRange',
    description: 'Delete cells from a range, shifting remaining cells up or left.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        shift: {type: 'string', description: '"Up" or "Left".', enum: ['Up', 'Left']},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'shift'],
    },
  }, async (args: {address: string; shift: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).delete(
        args.shift === 'Left' ? Excel.DeleteShiftDirection.left : Excel.DeleteShiftDirection.up,
      );
      await ctx.sync();
      return {message: `Deleted cells at ${args.address}, shifted ${args.shift.toLowerCase()}`};
    });
  });

  registerTool({
    name: 'SetRangeFormat',
    description:
      'Set formatting on a range: font, fill color, number format, borders, alignment, row height and column width.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
        fontName: {type: 'string', description: 'Font name.'},
        fontSize: {type: 'number', description: 'Font size.'},
        fontBold: {type: 'boolean', description: 'Bold.'},
        fontItalic: {type: 'boolean', description: 'Italic.'},
        fontColor: {type: 'string', description: 'Font color, e.g. "#FF0000".'},
        fillColor: {type: 'string', description: 'Cell background color, e.g. "#FFFF00".'},
        numberFormat: {
          type: 'string',
          description: 'Number format string, e.g. "0.00", "#,##0", "yyyy-mm-dd".',
        },
        horizontalAlignment: {type: 'string', description: '"Left", "Center", "Right", "General".'},
        verticalAlignment: {type: 'string', description: '"Top", "Center", "Bottom".'},
        wrapText: {type: 'boolean', description: 'Wrap text.'},
        rowHeight: {type: 'number', description: 'Row height in points.'},
        columnWidth: {type: 'number', description: 'Column width in points.'},
      },
      required: ['address'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const range = ws.getRange(args.address);
      const fmt = range.format;
      if (args.fontName) fmt.font.name = args.fontName;
      if (args.fontSize) fmt.font.size = args.fontSize;
      if (args.fontBold !== undefined) fmt.font.bold = args.fontBold;
      if (args.fontItalic !== undefined) fmt.font.italic = args.fontItalic;
      if (args.fontColor) fmt.font.color = args.fontColor;
      if (args.fillColor) fmt.fill.color = args.fillColor;
      if (args.numberFormat) range.numberFormat = [[args.numberFormat]];
      if (args.horizontalAlignment) fmt.horizontalAlignment = args.horizontalAlignment;
      if (args.verticalAlignment) fmt.verticalAlignment = args.verticalAlignment;
      if (args.wrapText !== undefined) fmt.wrapText = args.wrapText;
      if (args.rowHeight) fmt.rowHeight = args.rowHeight;
      if (args.columnWidth) fmt.columnWidth = args.columnWidth;
      await ctx.sync();
      return {message: `Format applied to ${args.address}`};
    });
  });

  registerTool({
    name: 'SetRangeBorders',
    description: 'Set border style on a range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        side: {
          type: 'string',
          description:
            'Border side: "EdgeTop", "EdgeBottom", "EdgeLeft", "EdgeRight", "InsideHorizontal", "InsideVertical". Omit to set all edges.',
        },
        style: {
          type: 'string',
          description: '"Continuous" (default), "Dash", "DashDot", "Dot", "Double", "None".',
          enum: ['Continuous', 'Dash', 'DashDot', 'DashDotDot', 'Dot', 'Double', 'None'],
        },
        color: {type: 'string', description: 'Border color, e.g. "#000000".'},
        weight: {
          type: 'string',
          description: '"Thin" (default), "Medium", "Thick", "Hairline".',
          enum: ['Thin', 'Medium', 'Thick', 'Hairline'],
        },
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const range = getSheet(ctx, args.sheet).getRange(args.address);
      const sides = args.side ? [args.side] : ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'];
      for (const side of sides) {
        const border = range.format.borders.getItem(side as any);
        border.style = args.style || 'Continuous';
        if (args.color) border.color = args.color;
        if (args.weight) border.weight = args.weight;
      }
      await ctx.sync();
      return {message: `Borders set on ${args.address}`};
    });
  });

  registerTool({
    name: 'AutoFitColumns',
    description: 'Auto-fit the column widths of a range to their content.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address. If omitted, uses the used range.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: [],
    },
  }, async (args: {address?: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const range = args.address ? ws.getRange(args.address) : ws.getUsedRange();
      range.format.autofitColumns();
      range.format.autofitRows();
      await ctx.sync();
      return {message: 'Auto-fit applied'};
    });
  });

  registerTool({
    name: 'MergeCells',
    description: 'Merge a range of cells into a single cell.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        across: {
          type: 'boolean',
          description: 'Merge across rows instead of into one cell. Default: false.',
        },
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; across?: boolean; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).merge(args.across || false);
      await ctx.sync();
      return {message: `Merged ${args.address}`};
    });
  });

  registerTool({
    name: 'UnmergeCells',
    description: 'Unmerge a previously merged range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).unmerge();
      await ctx.sync();
      return {message: `Unmerged ${args.address}`};
    });
  });

  registerTool({
    name: 'SetRangeHyperlink',
    description: 'Set a hyperlink on a cell or range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Cell address, e.g. "A1".'},
        url: {type: 'string', description: 'Hyperlink URL.'},
        textToDisplay: {type: 'string', description: 'Display text for the hyperlink.'},
        screenTip: {type: 'string', description: 'Tooltip text on hover.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'url'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const hyperlink: any = {address: args.url};
      if (args.textToDisplay) hyperlink.textToDisplay = args.textToDisplay;
      if (args.screenTip) hyperlink.screenTip = args.screenTip;
      getSheet(ctx, args.sheet).getRange(args.address).hyperlink = hyperlink;
      await ctx.sync();
      return {message: `Hyperlink set on ${args.address}`};
    });
  });

  registerTool({
    name: 'SortRange',
    description: 'Sort a range by one or more columns.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range to sort.'},
        column: {type: 'number', description: 'Column index to sort by (0-based).'},
        ascending: {type: 'boolean', description: 'Ascending order. Default: true.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'column'],
    },
  }, async (args: {address: string; column: number; ascending?: boolean; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).sort.apply([{
        key: args.column,
        sortOn: Excel.SortOn.value,
        ascending: args.ascending !== false,
      }]);
      await ctx.sync();
      return {message: `Sorted ${args.address} by column ${args.column}`};
    });
  });

  registerTool({
    name: 'SetAutoFilter',
    description: 'Apply auto-filter to a range or table.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address to filter.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      try {
        ws.autoFilter.remove();
        await ctx.sync();
      } catch {}
      ws.autoFilter.apply(ws.getRange(args.address));
      await ctx.sync();
      return {message: `Auto-filter applied to ${args.address}`};
    });
  });

  registerTool({
    name: 'ClearAutoFilter',
    description: 'Remove auto-filter from the active worksheet.',
    parameters: {
      properties: {sheet: {type: 'string', description: 'Worksheet name.'}},
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.autoFilter.remove();
      await ctx.sync();
      return {message: 'Auto-filter cleared'};
    });
  });

  registerTool({
    name: 'SetDataValidation',
    description:
      'Set a data validation rule on a range (e.g. restrict input to a list or number range).',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        type: {
          type: 'string',
          description: '"List", "WholeNumber", "Decimal", "Date", "TextLength".',
        },
        formula1: {
          type: 'string',
          description:
            'Validation value. For List, comma-separated values like "A,B,C". For numbers, the min value.',
        },
        formula2: {type: 'string', description: 'Max value (for number/date ranges).'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'type', 'formula1'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const range = ws.getRange(args.address);
      const ruleObj: any = {};
      if (args.type === 'List') {
        ruleObj.list = {inCellDropDown: true, source: args.formula1};
      } else {
        const key = args.type.charAt(0).toLowerCase() + args.type.slice(1);
        ruleObj[key] = {formula1: args.formula1};
        if (args.formula2) ruleObj[key].formula2 = args.formula2;
      }
      range.dataValidation.rule = ruleObj;
      await ctx.sync();
      return {message: `Data validation set on ${args.address}`};
    });
  });

  registerTool({
    name: 'ClearDataValidation',
    description: 'Clear data validation from a range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).dataValidation.clear();
      await ctx.sync();
      return {message: `Data validation cleared from ${args.address}`};
    });
  });

  registerTool({
    name: 'AddConditionalFormat',
    description: 'Add a cell-value conditional format rule to a range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        rule: {
          type: 'string',
          description: 'Operator: "GreaterThan", "LessThan", "EqualTo", "Between".',
        },
        formula1: {type: 'string', description: 'First value or formula (e.g. "100").'},
        formula2: {type: 'string', description: 'Second value (only for "Between").'},
        fontColor: {type: 'string', description: 'Font color when rule matches.'},
        fillColor: {type: 'string', description: 'Fill color when rule matches.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'rule', 'formula1'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const cf = ws.getRange(args.address).conditionalFormats.add(
        Excel.ConditionalFormatType.cellValue,
      );
      const cvRule: any = {operator: args.rule, formula1: args.formula1};
      if (args.formula2) cvRule.formula2 = args.formula2;
      cf.cellValue.rule = cvRule;
      if (args.fontColor) cf.cellValue.format.font.color = args.fontColor;
      if (args.fillColor) (cf.cellValue.format.fill as any).color = args.fillColor;
      await ctx.sync();
      return {message: `Conditional format added to ${args.address}`};
    });
  });

  registerTool({
    name: 'ClearConditionalFormats',
    description: 'Clear all conditional formatting rules from a range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range address.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.getRange(args.address).conditionalFormats.clearAll();
      await ctx.sync();
      return {message: `Conditional formats cleared from ${args.address}`};
    });
  });

  registerTool({
    name: 'FreezePanes',
    description: 'Freeze rows and/or columns on the active worksheet.',
    parameters: {
      properties: {
        rows: {type: 'number', description: 'Number of rows to freeze from the top. Default: 0.'},
        columns: {
          type: 'number',
          description: 'Number of columns to freeze from the left. Default: 0.',
        },
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: [],
    },
  }, async (args: {rows?: number; columns?: number; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      if (args.rows && args.columns) {
        ws.freezePanes.freezeAt(ws.getCell(args.rows, args.columns));
      } else if (args.rows) {
        ws.freezePanes.freezeRows(args.rows);
      } else if (args.columns) {
        ws.freezePanes.freezeColumns(args.columns);
      }
      await ctx.sync();
      return {message: `Frozen ${args.rows || 0} row(s) and ${args.columns || 0} column(s)`};
    });
  });

  registerTool({
    name: 'UnfreezePanes',
    description: 'Remove all frozen panes from a worksheet.',
    parameters: {
      properties: {sheet: {type: 'string', description: 'Worksheet name.'}},
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.freezePanes.unfreeze();
      await ctx.sync();
      return {message: 'Panes unfrozen'};
    });
  });

  registerTool({
    name: 'GetTables',
    description: 'List all tables in the workbook or a specific worksheet.',
    parameters: {
      properties: {
        sheet: {type: 'string', description: 'Worksheet name. Omit for all tables in workbook.'},
      },
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const tables = args.sheet
        ? ctx.workbook.worksheets.getItem(args.sheet).tables
        : ctx.workbook.tables;
      tables.load(['name', 'id']);
      await ctx.sync();
      return {
        tables: tables.items.map(t => ({name: t.name, id: t.id})),
        count: tables.items.length,
      };
    });
  });

  registerTool({
    name: 'CreateTable',
    description: 'Create a structured table from a range.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Range for the table, e.g. "A1:D5".'},
        hasHeaders: {type: 'boolean', description: 'First row is headers. Default: true.'},
        name: {type: 'string', description: 'Optional table name.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; hasHeaders?: boolean; name?: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const table = ws.tables.add(args.address, args.hasHeaders !== false);
      if (args.name) table.name = args.name;
      table.load('name');
      await ctx.sync();
      return {name: table.name, message: `Table "${table.name}" created`};
    });
  });

  registerTool({
    name: 'DeleteTable',
    description: 'Delete a table by name, converting it back to a normal range.',
    parameters: {
      properties: {name: {type: 'string', description: 'Table name.'}},
      required: ['name'],
    },
  }, async (args: {name: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.tables.getItem(args.name).convertToRange();
      await ctx.sync();
      return {message: `Table "${args.name}" converted to range`};
    });
  });

  registerTool({
    name: 'GetTableData',
    description: 'Read all data (headers + body) from a table by name.',
    parameters: {
      properties: {name: {type: 'string', description: 'Table name.'}},
      required: ['name'],
    },
  }, async (args: {name: string;}) => {
    return Excel.run(async ctx => {
      const table = ctx.workbook.tables.getItem(args.name);
      const headerRange = table.getHeaderRowRange();
      const bodyRange = table.getDataBodyRange();
      headerRange.load('values');
      bodyRange.load('values');
      table.load('name');
      await ctx.sync();
      return {
        name: table.name,
        rows: bodyRange.values.length,
        headers: headerRange.values[0],
        data: bodyRange.values,
      };
    });
  });

  registerTool({
    name: 'AddTableRow',
    description: 'Add one or more rows to a table.',
    parameters: {
      properties: {
        tableName: {type: 'string', description: 'Table name.'},
        values: {type: 'array', description: '2D array of row values to add.'},
      },
      required: ['tableName', 'values'],
    },
  }, async (args: {tableName: string; values: any[][];}) => {
    return Excel.run(async ctx => {
      ctx.workbook.tables.getItem(args.tableName).rows.add(undefined, args.values as any);
      await ctx.sync();
      return {message: `Added ${args.values.length} row(s) to "${args.tableName}"`};
    });
  });

  registerTool({
    name: 'AddTableColumn',
    description: 'Add a column to a table.',
    parameters: {
      properties: {
        tableName: {type: 'string', description: 'Table name.'},
        index: {type: 'number', description: 'Column index to insert at. Omit to append.'},
        values: {
          type: 'array',
          description: '1D array: [header, ...dataValues], e.g. ["Status", "Active", "Inactive"].',
        },
        name: {type: 'string', description: 'Column header. Ignored if values is provided.'},
      },
      required: ['tableName'],
    },
  }, async (args: {tableName: string; index?: number; values?: any[]; name?: string;}) => {
    return Excel.run(async ctx => {
      const table = ctx.workbook.tables.getItem(args.tableName);
      const vals = args.values ? args.values.map(v => [v]) : undefined;
      table.columns.add(args.index, vals as any, args.name);
      await ctx.sync();
      return {message: `Column added to "${args.tableName}"`};
    });
  });

  registerTool({
    name: 'DeleteTableColumn',
    description: 'Delete a column from a table by index.',
    parameters: {
      properties: {
        tableName: {type: 'string', description: 'Table name.'},
        index: {type: 'number', description: '0-based column index.'},
      },
      required: ['tableName', 'index'],
    },
  }, async (args: {tableName: string; index: number;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.tables.getItem(args.tableName).columns.getItemAt(args.index).delete();
      await ctx.sync();
      return {message: `Column ${args.index} deleted from "${args.tableName}"`};
    });
  });

  registerTool({
    name: 'SortTable',
    description: 'Sort a table by a column.',
    parameters: {
      properties: {
        tableName: {type: 'string', description: 'Table name.'},
        column: {type: 'number', description: '0-based column index to sort by.'},
        ascending: {type: 'boolean', description: 'Ascending order. Default: true.'},
      },
      required: ['tableName', 'column'],
    },
  }, async (args: {tableName: string; column: number; ascending?: boolean;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.tables.getItem(args.tableName).sort.apply([{
        key: args.column,
        ascending: args.ascending !== false,
      }]);
      await ctx.sync();
      return {message: `Table "${args.tableName}" sorted by column ${args.column}`};
    });
  });

  registerTool({
    name: 'SetTableColumnFilter',
    description: 'Apply a values filter to a table column, showing only matching rows.',
    parameters: {
      properties: {
        tableName: {type: 'string', description: 'Table name.'},
        columnIndex: {type: 'number', description: '0-based column index.'},
        values: {type: 'array', description: 'Array of values to show.'},
      },
      required: ['tableName', 'columnIndex', 'values'],
    },
  }, async (args: {tableName: string; columnIndex: number; values: string[];}) => {
    return Excel.run(async ctx => {
      ctx.workbook.tables.getItem(args.tableName).columns.getItemAt(args.columnIndex).filter
        .applyValuesFilter(args.values);
      await ctx.sync();
      return {message: `Filter applied to column ${args.columnIndex} of "${args.tableName}"`};
    });
  });

  registerTool({
    name: 'ClearTableFilters',
    description: 'Clear all filters from a table.',
    parameters: {
      properties: {tableName: {type: 'string', description: 'Table name.'}},
      required: ['tableName'],
    },
  }, async (args: {tableName: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.tables.getItem(args.tableName).clearFilters();
      await ctx.sync();
      return {message: `Filters cleared from "${args.tableName}"`};
    });
  });

  registerTool({
    name: 'GetNamedRanges',
    description: 'List all named ranges in the workbook.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      const names = ctx.workbook.names;
      names.load(['name', 'value', 'type']);
      await ctx.sync();
      return {names: names.items.map(n => ({name: n.name, value: n.value, type: n.type}))};
    });
  });

  registerTool({
    name: 'AddNamedRange',
    description: 'Add a named range to the workbook.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Name for the range.'},
        reference: {type: 'string', description: 'Range reference, e.g. "Sheet1!A1:B10".'},
      },
      required: ['name', 'reference'],
    },
  }, async (args: {name: string; reference: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.names.add(args.name, args.reference);
      await ctx.sync();
      return {message: `Named range "${args.name}" added`};
    });
  });

  registerTool({
    name: 'DeleteNamedRange',
    description: 'Delete a named range from the workbook.',
    parameters: {
      properties: {name: {type: 'string', description: 'Named range name.'}},
      required: ['name'],
    },
  }, async (args: {name: string;}) => {
    return Excel.run(async ctx => {
      ctx.workbook.names.getItem(args.name).delete();
      await ctx.sync();
      return {message: `Named range "${args.name}" deleted`};
    });
  });

  registerTool({
    name: 'GetCharts',
    description: 'List all charts on a worksheet.',
    parameters: {
      properties: {sheet: {type: 'string', description: 'Worksheet name. Default: active sheet.'}},
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const charts = ws.charts;
      charts.load(['name', 'chartType', 'title/text']);
      await ctx.sync();
      return {
        charts: charts.items.map(c => ({name: c.name, type: c.chartType, title: c.title.text})),
        count: charts.items.length,
      };
    });
  });

  registerTool(
    {
      name: 'CreateChart',
      description: 'Create a chart from a data range.',
      parameters: {
        properties: {
          dataRange: {type: 'string', description: 'Data range address, e.g. "A1:D5".'},
          chartType: {
            type: 'string',
            description:
              'Chart type: "ColumnClustered", "Line", "Pie", "BarClustered", "Area", "XYScatter", "Doughnut", etc.',
          },
          name: {type: 'string', description: 'Chart name.'},
          title: {type: 'string', description: 'Chart title text.'},
          sheet: {type: 'string', description: 'Worksheet name.'},
        },
        required: ['dataRange', 'chartType'],
      },
    },
    async (
      args: {dataRange: string; chartType: string; name?: string; title?: string; sheet?: string;},
    ) => {
      return Excel.run(async ctx => {
        const ws = getSheet(ctx, args.sheet);
        const chart = ws.charts.add(
          args.chartType as any,
          ws.getRange(args.dataRange),
          Excel.ChartSeriesBy.auto,
        );
        if (args.name) chart.name = args.name;
        if (args.title) chart.title.text = args.title;
        chart.load('name');
        await ctx.sync();
        return {name: chart.name, message: `Chart "${chart.name}" created`};
      });
    },
  );

  registerTool({
    name: 'DeleteChart',
    description: 'Delete a chart by name.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Chart name.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['name'],
    },
  }, async (args: {name: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.charts.getItem(args.name).delete();
      await ctx.sync();
      return {message: `Chart "${args.name}" deleted`};
    });
  });

  registerTool({
    name: 'FormatChart',
    description: 'Configure chart elements: title, legend, axes, and data labels.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Chart name.'},
        title: {type: 'string', description: 'Chart title text. Empty string to hide.'},
        showLegend: {type: 'boolean', description: 'Show or hide the legend.'},
        legendPosition: {
          type: 'string',
          description: '"Top", "Bottom", "Left", "Right".',
          enum: ['Top', 'Bottom', 'Left', 'Right'],
        },
        showDataLabels: {type: 'boolean', description: 'Show or hide data labels.'},
        categoryAxisTitle: {type: 'string', description: 'Category (X) axis title.'},
        valueAxisTitle: {type: 'string', description: 'Value (Y) axis title.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['name'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const chart = getSheet(ctx, args.sheet).charts.getItem(args.name);
      if (args.title !== undefined) {
        chart.title.visible = args.title !== '';
        if (args.title) chart.title.text = args.title;
      }
      if (args.showLegend !== undefined) chart.legend.visible = args.showLegend;
      if (args.legendPosition) chart.legend.position = args.legendPosition;
      if (args.showDataLabels !== undefined) chart.dataLabels.showValue = args.showDataLabels;
      if (args.categoryAxisTitle) {
        chart.axes.categoryAxis.title.text = args.categoryAxisTitle;
        chart.axes.categoryAxis.title.visible = true;
      }
      if (args.valueAxisTitle) {
        chart.axes.valueAxis.title.text = args.valueAxisTitle;
        chart.axes.valueAxis.title.visible = true;
      }
      await ctx.sync();
      return {message: `Chart "${args.name}" formatted`};
    });
  });

  registerTool({
    name: 'SetChartPosition',
    description: 'Position a chart relative to cells on the worksheet.',
    parameters: {
      properties: {
        name: {type: 'string', description: 'Chart name.'},
        startCell: {type: 'string', description: 'Top-left cell, e.g. "E1".'},
        endCell: {type: 'string', description: 'Bottom-right cell, e.g. "L15".'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['name', 'startCell'],
    },
  }, async (args: {name: string; startCell: string; endCell?: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      getSheet(ctx, args.sheet).charts.getItem(args.name).setPosition(args.startCell, args.endCell);
      await ctx.sync();
      return {message: `Chart "${args.name}" repositioned`};
    });
  });

  registerTool({
    name: 'GetShapes',
    description: 'List all shapes on a worksheet.',
    parameters: {
      properties: {sheet: {type: 'string', description: 'Worksheet name.'}},
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const shapes = ws.shapes;
      shapes.load(['name', 'type', 'left', 'top', 'width', 'height']);
      await ctx.sync();
      return {
        shapes: shapes.items.map(s => ({
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

  registerTool({
    name: 'AddShape',
    description: 'Add a geometric shape to a worksheet.',
    parameters: {
      properties: {
        shapeType: {
          type: 'string',
          description:
            'Shape type: "Rectangle", "Oval", "Diamond", "Triangle", "RightArrow", "Star5", etc.',
        },
        left: {type: 'number', description: 'Left position in points.'},
        top: {type: 'number', description: 'Top position in points.'},
        width: {type: 'number', description: 'Width in points.'},
        height: {type: 'number', description: 'Height in points.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['shapeType'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      const shape = ws.shapes.addGeometricShape(args.shapeType as any);
      if (args.left !== undefined) shape.left = args.left;
      if (args.top !== undefined) shape.top = args.top;
      if (args.width !== undefined) shape.width = args.width;
      if (args.height !== undefined) shape.height = args.height;
      shape.load('name');
      await ctx.sync();
      return {name: shape.name, message: `Shape "${args.shapeType}" added`};
    });
  });

  registerTool({
    name: 'DeleteShape',
    description: 'Delete a shape from a worksheet by name.',
    parameters: {
      properties: {
        shapeName: {type: 'string', description: 'Shape name.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['shapeName'],
    },
  }, async (args: {shapeName: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.shapes.getItem(args.shapeName).delete();
      await ctx.sync();
      return {message: `Shape "${args.shapeName}" deleted`};
    });
  });

  registerTool({
    name: 'SetShapeText',
    description: 'Set the text content of a shape on a worksheet.',
    parameters: {
      properties: {
        shapeName: {type: 'string', description: 'Shape name.'},
        text: {type: 'string', description: 'Text to set.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['shapeName', 'text'],
    },
  }, async (args: {shapeName: string; text: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      getSheet(ctx, args.sheet).shapes.getItem(args.shapeName).textFrame.textRange.text = args.text;
      await ctx.sync();
      return {message: `Text set on shape "${args.shapeName}"`};
    });
  });

  registerTool({
    name: 'FormatShape',
    description: 'Set fill color, line color, and line weight on a shape.',
    parameters: {
      properties: {
        shapeName: {type: 'string', description: 'Shape name.'},
        fillColor: {type: 'string', description: 'Fill color, e.g. "#FF0000".'},
        lineColor: {type: 'string', description: 'Line color.'},
        lineWeight: {type: 'number', description: 'Line weight in points.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['shapeName'],
    },
  }, async (args: any) => {
    return Excel.run(async ctx => {
      const shape = getSheet(ctx, args.sheet).shapes.getItem(args.shapeName);
      if (args.fillColor) shape.fill.setSolidColor(args.fillColor);
      if (args.lineColor) shape.lineFormat.color = args.lineColor;
      if (args.lineWeight) shape.lineFormat.weight = args.lineWeight;
      await ctx.sync();
      return {message: `Shape "${args.shapeName}" formatted`};
    });
  });

  registerTool({
    name: 'GetComments',
    description: 'Get all comments in the workbook with their current cell addresses.',
    parameters: {properties: {}, required: []},
  }, async () => {
    return Excel.run(async ctx => {
      const comments = ctx.workbook.comments;
      comments.load(['content', 'authorName', 'creationDate']);
      await ctx.sync();
      const locations = comments.items.map(c => c.getLocation());
      for (const loc of locations) loc.load('address');
      await ctx.sync();
      return {
        comments: comments.items.map((c, i) => ({
          content: c.content,
          author: c.authorName,
          createdAt: c.creationDate,
          cellAddress: locations[i].address,
        })),
        count: comments.items.length,
      };
    });
  });

  registerTool({
    name: 'AddComment',
    description: 'Add a comment to a specific cell.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Cell address, e.g. "A1".'},
        content: {type: 'string', description: 'Comment text.'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address', 'content'],
    },
  }, async (args: {address: string; content: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ctx.workbook.comments.add(ws.getRange(args.address), args.content);
      await ctx.sync();
      return {message: `Comment added to ${args.address}`};
    });
  });

  registerTool({
    name: 'DeleteComment',
    description:
      'Delete a comment by its cell address. Use GetComments first to find current addresses.',
    parameters: {
      properties: {
        address: {type: 'string', description: 'Cell address of the comment, e.g. "A1".'},
        sheet: {type: 'string', description: 'Worksheet name.'},
      },
      required: ['address'],
    },
  }, async (args: {address: string; sheet?: string;}) => {
    return Excel.run(async ctx => {
      const ws = getSheet(ctx, args.sheet);
      ws.comments.getItemByCell(args.address).delete();
      await ctx.sync();
      return {message: `Comment at ${args.address} deleted`};
    });
  });

  registerTool({
    name: 'GetPivotTables',
    description: 'List all PivotTables in the workbook or a specific worksheet.',
    parameters: {
      properties: {sheet: {type: 'string', description: 'Worksheet name. Omit for all.'}},
      required: [],
    },
  }, async (args: {sheet?: string;}) => {
    return Excel.run(async ctx => {
      const pivots = args.sheet
        ? ctx.workbook.worksheets.getItem(args.sheet).pivotTables
        : ctx.workbook.pivotTables;
      pivots.load(['name', 'id']);
      await ctx.sync();
      return {
        pivotTables: pivots.items.map(p => ({name: p.name, id: p.id})),
        count: pivots.items.length,
      };
    });
  });
}
