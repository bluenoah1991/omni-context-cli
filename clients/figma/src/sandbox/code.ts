/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, {themeColors: true, width: 480, height: 720});

(async () => {
  const savedUrl = await figma.clientStorage.getAsync('serverUrl');
  figma.ui.postMessage({type: 'init', serverUrl: savedUrl ?? null});
})();

figma.ui.on('message', async msg => {
  if (msg.type === 'toolCall' && msg.requestId) {
    try {
      const result = await handleTool(msg.tool, msg.args ?? {});
      figma.ui.postMessage({responseId: msg.requestId, result});
    } catch (err: any) {
      const errorMsg = err instanceof Error
        ? err.message
        : (typeof err === 'object' ? JSON.stringify(err) : String(err));
      figma.ui.postMessage({responseId: msg.requestId, error: errorMsg});
    }
    return;
  }

  if (msg.type === 'getConfig' && msg.requestId) {
    const value = await figma.clientStorage.getAsync(msg.key);
    figma.ui.postMessage({responseId: msg.requestId, result: value ?? null});
    return;
  }

  if (msg.type === 'setConfig') {
    await figma.clientStorage.setAsync(msg.key, msg.value);
    return;
  }

  if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  }
});

async function handleTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'GetSelection':
      return handleGetSelection();
    case 'GetPageStructure':
      return handleGetPageStructure(args);
    case 'FindNodes':
      return handleFindNodes(args);
    case 'GetNodeById':
      return handleGetNodeById(args);
    case 'CreateRectangle':
      return handleCreateRectangle(args);
    case 'CreateFrame':
      return handleCreateFrame(args);
    case 'CreateText':
      return handleCreateText(args);
    case 'ModifyNode':
      return handleModifyNode(args);
    case 'DeleteNodes':
      return handleDeleteNodes(args);
    case 'SetTextContent':
      return handleSetTextContent(args);
    case 'GetLocalStyles':
      return handleGetLocalStyles();
    case 'GetLocalComponents':
      return handleGetLocalComponents();
    case 'ExportNode':
      return handleExportNode(args);
    case 'CreateEllipse':
      return handleCreateEllipse(args);
    case 'CreateLine':
      return handleCreateLine(args);
    case 'CreateSection':
      return handleCreateSection(args);
    case 'CreateComponent':
      return handleCreateComponent(args);
    case 'GroupNodes':
      return handleGroupNodes(args);
    case 'UngroupNodes':
      return handleUngroupNodes(args);
    case 'CloneNode':
      return handleCloneNode(args);
    case 'MoveNode':
      return handleMoveNode(args);
    case 'InsertImage':
      return handleInsertImage(args);
    case 'GetVariables':
      return handleGetVariables();
    case 'GetPages':
      return handleGetPages();
    case 'SetCurrentPage':
      return handleSetCurrentPage(args);
    case 'SetViewport':
      return handleSetViewport(args);
    case 'BooleanOperation':
      return handleBooleanOperation(args);
    case 'FlattenNode':
      return handleFlattenNode(args);
    case 'Notify':
      return handleNotify(args);
    case 'ListFonts':
      return handleListFonts();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function handleGetSelection() {
  return figma.currentPage.selection.map(n => serializeNode(n, 0, 2));
}

async function handleGetPageStructure(args: {depth?: number; nodeId?: string;}) {
  const depth = args.depth ?? 3;
  const root = args.nodeId ? await figma.getNodeByIdAsync(args.nodeId) : figma.currentPage;
  if (!root) throw new Error('Node not found');
  if (root.type === 'PAGE') {
    return {
      id: root.id,
      name: root.name,
      type: root.type,
      childCount: root.children.length,
      children: root.children.map(c => serializeNode(c as SceneNode, 0, depth)),
    };
  }
  return serializeNode(root as SceneNode, 0, depth);
}

function handleFindNodes(args: {query: string; type?: string;}) {
  const query = args.query.toLowerCase();
  const matches = figma.currentPage.findAll(node => {
    if (!node.name.toLowerCase().includes(query)) return false;
    if (args.type && node.type !== args.type.toUpperCase()) return false;
    return true;
  });
  return matches.slice(0, 100).map(n => serializeNode(n, 0, 1));
}

async function handleGetNodeById(args: {nodeId: string;}) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node) throw new Error('Node not found');
  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return {id: node.id, name: node.name, type: node.type};
  }
  return serializeNode(node as SceneNode, 0, 2);
}

function handleCreateRectangle(
  args: {x: number; y: number; width: number; height: number; name?: string; color?: string;},
) {
  const rect = figma.createRectangle();
  rect.x = args.x;
  rect.y = args.y;
  rect.resize(args.width, args.height);
  if (args.name) rect.name = args.name;
  if (args.color) rect.fills = [{type: 'SOLID', color: hexToRgb(args.color)}];
  figma.currentPage.appendChild(rect);
  figma.viewport.scrollAndZoomIntoView([rect]);
  return serializeNode(rect, 0, 0);
}

function handleCreateFrame(
  args: {x: number; y: number; width: number; height: number; name?: string; layoutMode?: string;},
) {
  const frame = figma.createFrame();
  frame.x = args.x;
  frame.y = args.y;
  frame.resize(args.width, args.height);
  if (args.name) frame.name = args.name;
  if (args.layoutMode === 'HORIZONTAL' || args.layoutMode === 'VERTICAL') {
    frame.layoutMode = args.layoutMode;
  }
  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
  return serializeNode(frame, 0, 0);
}

async function handleCreateText(
  args: {x: number; y: number; content: string; fontSize?: number; name?: string; color?: string;},
) {
  const text = figma.createText();
  await figma.loadFontAsync({family: 'Inter', style: 'Regular'});
  text.x = args.x;
  text.y = args.y;
  text.characters = args.content;
  if (args.fontSize) text.fontSize = args.fontSize;
  if (args.name) text.name = args.name;
  if (args.color) text.fills = [{type: 'SOLID', color: hexToRgb(args.color)}];
  figma.currentPage.appendChild(text);
  figma.viewport.scrollAndZoomIntoView([text]);
  return serializeNode(text, 0, 0);
}

async function handleModifyNode(args: {nodeId: string; properties: Record<string, any>;}) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
    throw new Error('Node not found or not modifiable');
  }
  const n = node as SceneNode;
  const p = args.properties;

  if (p.x !== undefined && 'x' in n) (n as any).x = p.x;
  if (p.y !== undefined && 'y' in n) (n as any).y = p.y;
  if ((p.width !== undefined || p.height !== undefined) && 'resize' in n) {
    (n as any).resize(p.width ?? (n as any).width, p.height ?? (n as any).height);
  }
  if (p.name !== undefined) n.name = p.name;
  if (p.visible !== undefined) n.visible = p.visible;
  if (p.opacity !== undefined && 'opacity' in n) (n as any).opacity = p.opacity;
  if (p.rotation !== undefined && 'rotation' in n) (n as any).rotation = p.rotation;
  if (p.cornerRadius !== undefined && 'cornerRadius' in n) (n as any).cornerRadius = p.cornerRadius;
  if (p.fills && 'fills' in n) {
    (n as any).fills = p.fills.map((f: any) => ({
      type: 'SOLID' as const,
      color: hexToRgb(f.color),
      opacity: f.opacity ?? 1,
    }));
  }
  if (p.layoutMode && 'layoutMode' in n) {
    (n as any).layoutMode = p.layoutMode;
  }
  if (p.itemSpacing !== undefined && 'itemSpacing' in n) (n as any).itemSpacing = p.itemSpacing;
  if (p.paddingLeft !== undefined && 'paddingLeft' in n) (n as any).paddingLeft = p.paddingLeft;
  if (p.paddingRight !== undefined && 'paddingRight' in n) (n as any).paddingRight = p.paddingRight;
  if (p.paddingTop !== undefined && 'paddingTop' in n) (n as any).paddingTop = p.paddingTop;
  if (p.paddingBottom !== undefined && 'paddingBottom' in n) {
    (n as any).paddingBottom = p.paddingBottom;
  }
  if (p.effects && 'effects' in n) {
    (n as any).effects = p.effects.map((e: any) => {
      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
        const rgb = hexToRgb(e.color || '#000000');
        return {
          type: e.type,
          visible: e.visible !== false,
          blendMode: e.blendMode || 'NORMAL',
          color: {r: rgb.r, g: rgb.g, b: rgb.b, a: e.alpha ?? 0.25},
          offset: {x: e.offsetX ?? 0, y: e.offsetY ?? 4},
          radius: e.radius ?? 4,
          spread: e.spread ?? 0,
        };
      }
      return {type: e.type, visible: e.visible !== false, radius: e.radius ?? 4};
    });
  }
  if (p.constraints && 'constraints' in n) (n as any).constraints = p.constraints;
  if (p.minWidth !== undefined && 'minWidth' in n) (n as any).minWidth = p.minWidth;
  if (p.maxWidth !== undefined && 'maxWidth' in n) (n as any).maxWidth = p.maxWidth;
  if (p.minHeight !== undefined && 'minHeight' in n) (n as any).minHeight = p.minHeight;
  if (p.maxHeight !== undefined && 'maxHeight' in n) (n as any).maxHeight = p.maxHeight;
  if (p.layoutSizingHorizontal && 'layoutSizingHorizontal' in n) {
    (n as any).layoutSizingHorizontal = p.layoutSizingHorizontal;
  }
  if (p.layoutSizingVertical && 'layoutSizingVertical' in n) {
    (n as any).layoutSizingVertical = p.layoutSizingVertical;
  }

  return serializeNode(n, 0, 1);
}

async function handleDeleteNodes(args: {nodeIds: string[];}) {
  let deleted = 0;
  const failedIds: string[] = [];
  for (const id of args.nodeIds) {
    const node = await figma.getNodeByIdAsync(id);
    if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      node.remove();
      deleted++;
    } else {
      failedIds.push(id);
    }
  }
  if (deleted === 0) throw new Error(`No nodes deleted. IDs not found: ${args.nodeIds.join(', ')}`);
  return {
    deleted,
    total: args.nodeIds.length,
    failedIds: failedIds.length > 0 ? failedIds : undefined,
  };
}

async function handleSetTextContent(
  args: {nodeId: string; content: string; fontSize?: number; color?: string;},
) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node) throw new Error(`Node not found: ${args.nodeId}`);
  if (node.type !== 'TEXT') {
    throw new Error(`Node ${args.nodeId} is not a text node (actual type: ${node.type})`);
  }
  const textNode = node as TextNode;

  await loadFontsForTextNode(textNode);
  textNode.characters = args.content;
  if (args.fontSize !== undefined) textNode.fontSize = args.fontSize;
  if (args.color) textNode.fills = [{type: 'SOLID', color: hexToRgb(args.color)}];
  return serializeNode(textNode, 0, 0);
}

async function handleGetLocalStyles() {
  const rawPaint = await figma.getLocalPaintStylesAsync();
  const paintStyles = rawPaint.map(s => ({
    id: s.id,
    name: s.name,
    type: 'PAINT',
    paints: (s.paints as Paint[]).map(serializePaint),
  }));
  const rawText = await figma.getLocalTextStylesAsync();
  const textStyles = rawText.map(s => ({
    id: s.id,
    name: s.name,
    type: 'TEXT',
    fontSize: s.fontSize,
    fontName: s.fontName,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
  }));
  const rawEffect = await figma.getLocalEffectStylesAsync();
  const effectStyles = rawEffect.map(s => ({
    id: s.id,
    name: s.name,
    type: 'EFFECT',
    effects: s.effects.map(e => ({type: e.type, visible: e.visible})),
  }));
  const rawGrid = await figma.getLocalGridStylesAsync();
  const gridStyles = rawGrid.map(s => ({
    id: s.id,
    name: s.name,
    type: 'GRID',
    grids: s.layoutGrids.map(g => ({
      pattern: g.pattern,
      sectionSize: g.sectionSize,
      visible: g.visible,
    })),
  }));
  return {paintStyles, textStyles, effectStyles, gridStyles};
}

function handleGetLocalComponents() {
  const components = figma.currentPage.findAllWithCriteria({types: ['COMPONENT']});
  return components.slice(0, 200).map(c => serializeNode(c, 0, 1));
}

async function handleExportNode(args: {nodeId: string; format?: string; scale?: number;}) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
    throw new Error('Node not found or not exportable');
  }

  const format = (args.format?.toUpperCase() || 'PNG') as 'PNG' | 'SVG' | 'PDF';
  const scale = args.scale || 1;

  const settings: ExportSettings = format === 'SVG'
    ? {format: 'SVG'}
    : format === 'PDF'
    ? {format: 'PDF'}
    : {format: 'PNG', constraint: {type: 'SCALE', value: scale}};

  const bytes = await (node as SceneNode).exportAsync(settings);

  if (format === 'SVG') {
    return {format, mimeType: 'image/svg+xml', data: bytesToString(bytes), encoding: 'text'};
  }
  const mimeType = format === 'PDF' ? 'application/pdf' : 'image/png';
  return {format, mimeType, data: figma.base64Encode(bytes), encoding: 'base64'};
}

function handleCreateEllipse(
  args: {x: number; y: number; width: number; height: number; name?: string; color?: string;},
) {
  const ellipse = figma.createEllipse();
  ellipse.x = args.x;
  ellipse.y = args.y;
  ellipse.resize(args.width, args.height);
  if (args.name) ellipse.name = args.name;
  if (args.color) ellipse.fills = [{type: 'SOLID', color: hexToRgb(args.color)}];
  figma.currentPage.appendChild(ellipse);
  figma.viewport.scrollAndZoomIntoView([ellipse]);
  return serializeNode(ellipse, 0, 0);
}

function handleCreateLine(
  args: {
    x: number;
    y: number;
    length: number;
    angle?: number;
    name?: string;
    color?: string;
    strokeWeight?: number;
  },
) {
  const line = figma.createLine();
  line.x = args.x;
  line.y = args.y;
  line.resize(args.length, 0);
  if (args.angle) line.rotation = args.angle;
  if (args.name) line.name = args.name;
  if (args.color) line.strokes = [{type: 'SOLID', color: hexToRgb(args.color)}];
  if (args.strokeWeight) line.strokeWeight = args.strokeWeight;
  figma.currentPage.appendChild(line);
  figma.viewport.scrollAndZoomIntoView([line]);
  return serializeNode(line, 0, 0);
}

function handleCreateSection(
  args: {x: number; y: number; width: number; height: number; name?: string;},
) {
  const section = figma.createSection();
  section.x = args.x;
  section.y = args.y;
  section.resizeWithoutConstraints(args.width, args.height);
  if (args.name) section.name = args.name;
  figma.currentPage.appendChild(section);
  figma.viewport.scrollAndZoomIntoView([section]);
  return {
    id: section.id,
    name: section.name,
    type: section.type,
    x: Math.round(section.x),
    y: Math.round(section.y),
    width: Math.round(section.width),
    height: Math.round(section.height),
  };
}

function handleCreateComponent(
  args: {x: number; y: number; width: number; height: number; name?: string;},
) {
  const component = figma.createComponent();
  component.x = args.x;
  component.y = args.y;
  component.resize(args.width, args.height);
  if (args.name) component.name = args.name;
  figma.currentPage.appendChild(component);
  figma.viewport.scrollAndZoomIntoView([component]);
  return serializeNode(component, 0, 0);
}

async function handleGroupNodes(args: {nodeIds: string[]; name?: string;}) {
  const nodes = await resolveNodes(args.nodeIds);
  if (nodes.length === 0) throw new Error('No nodes provided');
  const parent = nodes[0].parent;
  if (!parent || !('children' in parent)) throw new Error('Nodes must have a valid parent');
  const group = figma.group(nodes, parent as BaseNode & ChildrenMixin);
  if (args.name) group.name = args.name;
  return serializeNode(group, 0, 1);
}

async function handleUngroupNodes(args: {nodeId: string;}) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node || !('children' in node)) throw new Error('Node not found or not a container');
  const children = figma.ungroup(node as SceneNode & ChildrenMixin);
  return children.map(c => serializeNode(c, 0, 0));
}

async function handleCloneNode(args: {nodeId: string; offsetX?: number; offsetY?: number;}) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Node not found');
  const clone = (node as SceneNode).clone();
  if ('x' in clone) {
    (clone as any).x += args.offsetX ?? 20;
    (clone as any).y += args.offsetY ?? 20;
  }
  return serializeNode(clone, 0, 1);
}

async function handleMoveNode(args: {nodeId: string; parentId: string; index?: number;}) {
  const node = await figma.getNodeByIdAsync(args.nodeId);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Node not found');
  const parent = await figma.getNodeByIdAsync(args.parentId);
  if (!parent || !('children' in parent)) throw new Error('Parent not found or not a container');
  const container = parent as BaseNode & ChildrenMixin;
  if (args.index !== undefined) {
    container.insertChild(args.index, node as SceneNode);
  } else {
    container.appendChild(node as SceneNode);
  }
  return serializeNode(node as SceneNode, 0, 0);
}

async function handleInsertImage(
  args: {
    x: number;
    y: number;
    url?: string;
    data?: string;
    width?: number;
    height?: number;
    name?: string;
  },
) {
  let image: Image;
  if (args.data) {
    image = figma.createImage(figma.base64Decode(args.data));
  } else if (args.url) {
    try {
      image = await figma.createImageAsync(args.url);
    } catch {
      throw new Error(`Failed to fetch image from ${args.url}`);
    }
  } else {
    throw new Error('Either url or data is required');
  }
  const rect = figma.createRectangle();
  rect.x = args.x;
  rect.y = args.y;
  const size = await image.getSizeAsync();
  rect.resize(args.width ?? size.width, args.height ?? size.height);
  rect.fills = [{type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL'}];
  if (args.name) rect.name = args.name;
  figma.currentPage.appendChild(rect);
  figma.viewport.scrollAndZoomIntoView([rect]);
  return serializeNode(rect, 0, 0);
}

async function handleGetVariables() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  return {
    collections: collections.map(c => ({
      id: c.id,
      name: c.name,
      modes: c.modes,
      variableIds: c.variableIds,
    })),
    variables: variables.map(v => ({
      id: v.id,
      name: v.name,
      resolvedType: v.resolvedType,
      valuesByMode: v.valuesByMode,
    })),
  };
}

function handleGetPages() {
  return figma.root.children.map(page => ({
    id: page.id,
    name: page.name,
    isCurrent: page === figma.currentPage,
  }));
}

async function handleSetCurrentPage(args: {pageId: string;}) {
  const page = await figma.getNodeByIdAsync(args.pageId);
  if (!page || page.type !== 'PAGE') throw new Error('Page not found');
  await figma.setCurrentPageAsync(page as PageNode);
  return {id: page.id, name: page.name};
}

async function handleSetViewport(
  args: {nodeIds?: string[]; x?: number; y?: number; zoom?: number;},
) {
  if (args.nodeIds && args.nodeIds.length > 0) {
    figma.viewport.scrollAndZoomIntoView(await resolveNodes(args.nodeIds));
    if (args.zoom) figma.viewport.zoom = args.zoom;
  } else if (args.x !== undefined && args.y !== undefined) {
    figma.viewport.center = {x: args.x, y: args.y};
    if (args.zoom) figma.viewport.zoom = args.zoom;
  }
  return {center: figma.viewport.center, zoom: figma.viewport.zoom};
}

async function handleBooleanOperation(args: {operation: string; nodeIds: string[];}) {
  const nodes = await resolveNodes(args.nodeIds);
  if (nodes.length < 2) throw new Error('At least 2 nodes required');
  const parent = nodes[0].parent;
  if (!parent || !('children' in parent)) throw new Error('Nodes must have a valid parent');
  const p = parent as BaseNode & ChildrenMixin;
  const op = args.operation.toUpperCase();
  let result: BooleanOperationNode;
  if (op === 'UNION') result = figma.union(nodes, p);
  else if (op === 'SUBTRACT') result = figma.subtract(nodes, p);
  else if (op === 'INTERSECT') result = figma.intersect(nodes, p);
  else if (op === 'EXCLUDE') result = figma.exclude(nodes, p);
  else throw new Error(`Unknown operation: ${args.operation}`);
  return serializeNode(result, 0, 1);
}

async function handleFlattenNode(args: {nodeIds: string[];}) {
  const nodes = await resolveNodes(args.nodeIds);
  const result = figma.flatten(nodes);
  return serializeNode(result, 0, 0);
}

function handleNotify(args: {message: string; timeout?: number; error?: boolean;}) {
  figma.notify(args.message, {timeout: args.timeout ?? 4000, error: args.error ?? false});
  return {notified: true};
}

async function handleListFonts() {
  const fonts = await figma.listAvailableFontsAsync();
  const families = new Map<string, string[]>();
  for (const font of fonts) {
    const styles = families.get(font.fontName.family);
    if (styles) styles.push(font.fontName.style);
    else families.set(font.fontName.family, [font.fontName.style]);
  }
  return Array.from(families.entries()).map(([family, styles]) => ({family, styles}));
}

async function resolveNodes(ids: string[]): Promise<SceneNode[]> {
  const nodes: SceneNode[] = [];
  for (const id of ids) {
    const node = await figma.getNodeByIdAsync(id);
    if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
      throw new Error(`Node not found: ${id}`);
    }
    nodes.push(node as SceneNode);
  }
  return nodes;
}

function serializeNode(node: SceneNode, depth: number, maxDepth: number): any {
  const result: any = {id: node.id, name: node.name, type: node.type, visible: node.visible};

  if ('x' in node) {
    result.x = Math.round((node as any).x);
    result.y = Math.round((node as any).y);
  }
  if ('width' in node) {
    result.width = Math.round((node as any).width);
    result.height = Math.round((node as any).height);
  }
  if ('rotation' in node) result.rotation = (node as any).rotation;
  if ('opacity' in node) result.opacity = (node as any).opacity;

  if ('fills' in node) {
    const fills = (node as any).fills;
    if (Array.isArray(fills)) result.fills = fills.map(serializePaint);
  }
  if ('strokes' in node) {
    const strokes = (node as any).strokes;
    if (Array.isArray(strokes) && strokes.length > 0) result.strokes = strokes.map(serializePaint);
  }
  if ('strokeWeight' in node) {
    const sw = (node as any).strokeWeight;
    if (typeof sw === 'number' && sw > 0) result.strokeWeight = sw;
  }
  if ('cornerRadius' in node) {
    const cr = (node as any).cornerRadius;
    if (typeof cr === 'number' && cr > 0) result.cornerRadius = cr;
  }

  if ('effects' in node) {
    const effects = (node as any).effects;
    if (Array.isArray(effects) && effects.length > 0) result.effects = effects.map(serializeEffect);
  }
  if ('constraints' in node) result.constraints = (node as any).constraints;
  if ('minWidth' in node) {
    const v = (node as any).minWidth;
    if (v !== null && v > 0) result.minWidth = v;
  }
  if ('maxWidth' in node) {
    const v = (node as any).maxWidth;
    if (v !== null && v !== Infinity) result.maxWidth = v;
  }
  if ('minHeight' in node) {
    const v = (node as any).minHeight;
    if (v !== null && v > 0) result.minHeight = v;
  }
  if ('maxHeight' in node) {
    const v = (node as any).maxHeight;
    if (v !== null && v !== Infinity) result.maxHeight = v;
  }

  if (node.type === 'TEXT') {
    const t = node as TextNode;
    result.characters = t.characters;
    if (t.fontSize !== figma.mixed) result.fontSize = t.fontSize;
    if (t.fontName !== figma.mixed) result.fontName = t.fontName;
    if (t.textAlignHorizontal) result.textAlignHorizontal = t.textAlignHorizontal;
  }

  if ('layoutMode' in node) {
    const f = node as FrameNode;
    if (f.layoutMode !== 'NONE') {
      result.layoutMode = f.layoutMode;
      result.itemSpacing = f.itemSpacing;
      result.paddingLeft = f.paddingLeft;
      result.paddingRight = f.paddingRight;
      result.paddingTop = f.paddingTop;
      result.paddingBottom = f.paddingBottom;
      result.layoutSizingHorizontal = f.layoutSizingHorizontal;
      result.layoutSizingVertical = f.layoutSizingVertical;
    }
  }

  if (node.type === 'INSTANCE') {
    const inst = node as InstanceNode;
    if (inst.mainComponent) {
      result.componentName = inst.mainComponent.name;
      result.componentId = inst.mainComponent.id;
    }
  }

  if ('children' in node) {
    const container = node as ChildrenMixin & SceneNode;
    result.childCount = container.children.length;
    if (depth < maxDepth) {
      result.children = container.children.map(c =>
        serializeNode(c as SceneNode, depth + 1, maxDepth)
      );
    }
  }

  return result;
}

function serializeEffect(effect: Effect): any {
  const base: any = {type: effect.type, visible: effect.visible};
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    const s = effect as DropShadowEffect;
    base.color = rgbToHex(s.color);
    base.alpha = s.color.a;
    base.offset = s.offset;
    base.radius = s.radius;
    if (s.spread) base.spread = s.spread;
  } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    base.radius = (effect as BlurEffect).radius;
  }
  return base;
}

function serializePaint(paint: Paint): any {
  const base: any = {type: paint.type, visible: paint.visible !== false};
  if (paint.type === 'SOLID') {
    base.color = rgbToHex(paint.color);
    if (paint.opacity !== undefined && paint.opacity !== 1) base.opacity = paint.opacity;
  }
  return base;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function rgbToHex(c: RGB): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function bytesToString(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  }
  return chunks.join('');
}

async function loadFontsForTextNode(textNode: TextNode): Promise<void> {
  if (textNode.characters.length === 0) {
    await figma.loadFontAsync({family: 'Inter', style: 'Regular'});
    return;
  }
  const fontName = textNode.fontName;
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
    return;
  }
  const loaded = new Set<string>();
  for (let i = 0; i < textNode.characters.length; i++) {
    const font = textNode.getRangeFontName(i, i + 1) as FontName;
    const key = `${font.family}:${font.style}`;
    if (!loaded.has(key)) {
      loaded.add(key);
      await figma.loadFontAsync(font);
    }
  }
}
