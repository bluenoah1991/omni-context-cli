import { callSandbox } from '../services/sandboxBridge';
import { registerTool } from '../services/toolManager';

export function registerFigmaTools(): void {
  registerTool({
    name: 'GetSelection',
    description:
      'Get properties of the currently selected nodes in Figma, including IDs, names, types, dimensions, fills, and text content.',
    parameters: {properties: {}, required: []},
  }, args => callSandbox('GetSelection', args));

  registerTool({
    name: 'GetPageStructure',
    description:
      'Get the node tree of the current Figma page. Returns frames, groups, shapes, and text nodes with their properties.',
    parameters: {
      properties: {
        depth: {type: 'number', description: 'Max tree depth to traverse. Default: 3.'},
        nodeId: {type: 'string', description: 'Start from this node instead of the page root.'},
      },
    },
  }, args => callSandbox('GetPageStructure', args));

  registerTool({
    name: 'FindNodes',
    description: 'Search for nodes in the current Figma page by name or type.',
    parameters: {
      properties: {
        query: {
          type: 'string',
          description: 'Name to search for (case-insensitive substring match).',
        },
        type: {
          type: 'string',
          description:
            'Filter by node type (FRAME, TEXT, RECTANGLE, ELLIPSE, GROUP, COMPONENT, INSTANCE, etc.).',
        },
      },
      required: ['query'],
    },
  }, args => callSandbox('FindNodes', args));

  registerTool({
    name: 'GetNodeById',
    description: 'Get detailed properties of a specific Figma node by its ID.',
    parameters: {
      properties: {nodeId: {type: 'string', description: 'The node ID to look up.'}},
      required: ['nodeId'],
    },
  }, args => callSandbox('GetNodeById', args));

  registerTool({
    name: 'CreateRectangle',
    description: 'Create a new rectangle on the current Figma page.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        width: {type: 'number', description: 'Width in pixels.'},
        height: {type: 'number', description: 'Height in pixels.'},
        name: {type: 'string', description: 'Node name.'},
        color: {type: 'string', description: 'Fill color as hex (e.g. #ff0000).'},
      },
      required: ['x', 'y', 'width', 'height'],
    },
  }, args => callSandbox('CreateRectangle', args));

  registerTool({
    name: 'CreateFrame',
    description:
      'Create a new frame on the current Figma page. Frames can contain children and support auto-layout.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        width: {type: 'number', description: 'Width in pixels.'},
        height: {type: 'number', description: 'Height in pixels.'},
        name: {type: 'string', description: 'Frame name.'},
        layoutMode: {type: 'string', description: 'Auto-layout direction: HORIZONTAL or VERTICAL.'},
      },
      required: ['x', 'y', 'width', 'height'],
    },
  }, args => callSandbox('CreateFrame', args));

  registerTool({
    name: 'CreateText',
    description: 'Create a new text node on the current Figma page.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        content: {type: 'string', description: 'The text content.'},
        fontSize: {type: 'number', description: 'Font size in pixels. Default: 14.'},
        name: {type: 'string', description: 'Node name.'},
        color: {type: 'string', description: 'Text color as hex.'},
      },
      required: ['x', 'y', 'content'],
    },
  }, args => callSandbox('CreateText', args));

  registerTool({
    name: 'ModifyNode',
    description: 'Modify properties of an existing Figma node by ID.',
    parameters: {
      properties: {
        nodeId: {type: 'string', description: 'The node ID to modify.'},
        properties: {
          type: 'object',
          description:
            'Properties to change. Supports: x, y, width, height, name, visible, opacity, rotation, cornerRadius, fills (array of {color: hex, opacity?: number}), effects (array of {type, color?, radius?, offsetX?, offsetY?, spread?, alpha?}), constraints ({horizontal, vertical}), minWidth, maxWidth, minHeight, maxHeight, layoutSizingHorizontal (FIXED/HUG/FILL), layoutSizingVertical (FIXED/HUG/FILL).',
        },
      },
      required: ['nodeId', 'properties'],
    },
  }, args => callSandbox('ModifyNode', args));

  registerTool({
    name: 'DeleteNodes',
    description: 'Delete one or more Figma nodes by their IDs.',
    parameters: {
      properties: {
        nodeIds: {
          type: 'array',
          items: {type: 'string'},
          description: 'Array of node IDs to delete.',
        },
      },
      required: ['nodeIds'],
    },
  }, args => callSandbox('DeleteNodes', args));

  registerTool({
    name: 'SetTextContent',
    description: 'Update the text content of a text node.',
    parameters: {
      properties: {
        nodeId: {type: 'string', description: 'The text node ID.'},
        content: {type: 'string', description: 'New text content.'},
        fontSize: {type: 'number', description: 'New font size.'},
        color: {type: 'string', description: 'New text color as hex.'},
      },
      required: ['nodeId', 'content'],
    },
  }, args => callSandbox('SetTextContent', args));

  registerTool({
    name: 'GetLocalStyles',
    description:
      'Get all local paint, text, effect, and grid styles defined in the current Figma file.',
    parameters: {properties: {}, required: []},
  }, args => callSandbox('GetLocalStyles', args));

  registerTool({
    name: 'GetLocalComponents',
    description: 'Get all local components defined in the current Figma file.',
    parameters: {properties: {}, required: []},
  }, args => callSandbox('GetLocalComponents', args));

  registerTool({
    name: 'ExportNode',
    description: 'Export a Figma node as PNG, SVG, or PDF. Returns base64-encoded data.',
    parameters: {
      properties: {
        nodeId: {type: 'string', description: 'The node ID to export.'},
        format: {type: 'string', description: 'Export format: PNG, SVG, or PDF. Default: PNG.'},
        scale: {type: 'number', description: 'Export scale (PNG only). Default: 1.'},
      },
      required: ['nodeId'],
    },
  }, args => callSandbox('ExportNode', args));

  registerTool({
    name: 'CreateEllipse',
    description: 'Create a new ellipse (circle or oval) on the current Figma page.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        width: {type: 'number', description: 'Width in pixels.'},
        height: {type: 'number', description: 'Height in pixels.'},
        name: {type: 'string', description: 'Node name.'},
        color: {type: 'string', description: 'Fill color as hex.'},
      },
      required: ['x', 'y', 'width', 'height'],
    },
  }, args => callSandbox('CreateEllipse', args));

  registerTool({
    name: 'CreateLine',
    description: 'Create a new line on the current Figma page.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position of the start point.'},
        y: {type: 'number', description: 'Y position of the start point.'},
        length: {type: 'number', description: 'Length in pixels.'},
        angle: {type: 'number', description: 'Rotation angle in degrees. Default: 0 (horizontal).'},
        name: {type: 'string', description: 'Node name.'},
        color: {type: 'string', description: 'Stroke color as hex. Default: black.'},
        strokeWeight: {type: 'number', description: 'Stroke thickness. Default: 1.'},
      },
      required: ['x', 'y', 'length'],
    },
  }, args => callSandbox('CreateLine', args));

  registerTool({
    name: 'CreateSection',
    description:
      'Create a new section on the current Figma page. Sections are used to organize regions of the canvas.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        width: {type: 'number', description: 'Width in pixels.'},
        height: {type: 'number', description: 'Height in pixels.'},
        name: {type: 'string', description: 'Section name.'},
      },
      required: ['x', 'y', 'width', 'height'],
    },
  }, args => callSandbox('CreateSection', args));

  registerTool({
    name: 'CreateComponent',
    description: 'Create a new reusable component on the current Figma page.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        width: {type: 'number', description: 'Width in pixels.'},
        height: {type: 'number', description: 'Height in pixels.'},
        name: {type: 'string', description: 'Component name.'},
      },
      required: ['x', 'y', 'width', 'height'],
    },
  }, args => callSandbox('CreateComponent', args));

  registerTool({
    name: 'GroupNodes',
    description: 'Group multiple nodes together.',
    parameters: {
      properties: {
        nodeIds: {
          type: 'array',
          items: {type: 'string'},
          description: 'Array of node IDs to group.',
        },
        name: {type: 'string', description: 'Name for the group.'},
      },
      required: ['nodeIds'],
    },
  }, args => callSandbox('GroupNodes', args));

  registerTool({
    name: 'UngroupNodes',
    description: 'Ungroup a group or frame, moving its children into the parent.',
    parameters: {
      properties: {nodeId: {type: 'string', description: 'The group or frame node ID to ungroup.'}},
      required: ['nodeId'],
    },
  }, args => callSandbox('UngroupNodes', args));

  registerTool({
    name: 'CloneNode',
    description: 'Duplicate an existing node. The clone is placed next to the original.',
    parameters: {
      properties: {
        nodeId: {type: 'string', description: 'The node ID to clone.'},
        offsetX: {type: 'number', description: 'Horizontal offset from the original. Default: 20.'},
        offsetY: {type: 'number', description: 'Vertical offset from the original. Default: 20.'},
      },
      required: ['nodeId'],
    },
  }, args => callSandbox('CloneNode', args));

  registerTool({
    name: 'MoveNode',
    description:
      'Move a node to a different parent (frame, group, page) or reorder it within its current parent.',
    parameters: {
      properties: {
        nodeId: {type: 'string', description: 'The node ID to move.'},
        parentId: {type: 'string', description: 'The target parent node ID.'},
        index: {
          type: 'number',
          description: 'Position index within the parent. Omit to append at end.',
        },
      },
      required: ['nodeId', 'parentId'],
    },
  }, args => callSandbox('MoveNode', args));

  registerTool({
    name: 'InsertImage',
    description:
      'Insert an image onto the canvas. Provide either a URL or base64-encoded image data.',
    parameters: {
      properties: {
        x: {type: 'number', description: 'X position.'},
        y: {type: 'number', description: 'Y position.'},
        url: {type: 'string', description: 'Image URL to fetch.'},
        data: {type: 'string', description: 'Base64-encoded image data (alternative to url).'},
        width: {type: 'number', description: 'Display width. Auto-detected from image if omitted.'},
        height: {
          type: 'number',
          description: 'Display height. Auto-detected from image if omitted.',
        },
        name: {type: 'string', description: 'Node name.'},
      },
      required: ['x', 'y'],
    },
  }, args => callSandbox('InsertImage', args));

  registerTool({
    name: 'GetVariables',
    description:
      'Get all local variables (design tokens) and variable collections in the current file.',
    parameters: {properties: {}, required: []},
  }, args => callSandbox('GetVariables', args));

  registerTool({
    name: 'GetPages',
    description: 'List all pages in the current Figma file with their names and child counts.',
    parameters: {properties: {}, required: []},
  }, args => callSandbox('GetPages', args));

  registerTool({
    name: 'SetCurrentPage',
    description: 'Switch to a different page in the Figma file.',
    parameters: {
      properties: {pageId: {type: 'string', description: 'The page ID to switch to.'}},
      required: ['pageId'],
    },
  }, args => callSandbox('SetCurrentPage', args));

  registerTool({
    name: 'SetViewport',
    description:
      'Navigate the Figma viewport. Scroll and zoom to fit specific nodes, or set an exact center point and zoom level.',
    parameters: {
      properties: {
        nodeIds: {
          type: 'array',
          items: {type: 'string'},
          description: 'Node IDs to scroll into view.',
        },
        x: {type: 'number', description: 'Viewport center X (used when nodeIds is not provided).'},
        y: {type: 'number', description: 'Viewport center Y (used when nodeIds is not provided).'},
        zoom: {type: 'number', description: 'Zoom level (1 = 100%).'},
      },
    },
  }, args => callSandbox('SetViewport', args));

  registerTool({
    name: 'BooleanOperation',
    description:
      'Perform a boolean operation (union, subtract, intersect, exclude) on multiple nodes.',
    parameters: {
      properties: {
        operation: {
          type: 'string',
          description: 'Operation type: UNION, SUBTRACT, INTERSECT, or EXCLUDE.',
        },
        nodeIds: {
          type: 'array',
          items: {type: 'string'},
          description: 'Node IDs to combine (at least 2).',
        },
      },
      required: ['operation', 'nodeIds'],
    },
  }, args => callSandbox('BooleanOperation', args));

  registerTool({
    name: 'FlattenNode',
    description: 'Flatten one or more nodes into a single vector path.',
    parameters: {
      properties: {
        nodeIds: {type: 'array', items: {type: 'string'}, description: 'Node IDs to flatten.'},
      },
      required: ['nodeIds'],
    },
  }, args => callSandbox('FlattenNode', args));

  registerTool({
    name: 'Notify',
    description: 'Show a toast notification in the Figma UI.',
    parameters: {
      properties: {
        message: {type: 'string', description: 'The message to display.'},
        error: {type: 'boolean', description: 'Show as error style. Default: false.'},
        timeout: {type: 'number', description: 'Display duration in milliseconds. Default: 4000.'},
      },
      required: ['message'],
    },
  }, args => callSandbox('Notify', args));

  registerTool({
    name: 'ListFonts',
    description: 'List all available font families and their styles.',
    parameters: {properties: {}, required: []},
  }, args => callSandbox('ListFonts', args));
}
