import { ItemView, WorkspaceLeaf } from 'obsidian';
import { startServer } from './main';

export const OMNI_CONTEXT_VIEW_TYPE = 'omni-context-view';

export class OmniContextView extends ItemView {
  private vaultPath: string;
  private closed = false;

  constructor(leaf: WorkspaceLeaf, vaultPath: string) {
    super(leaf);
    this.vaultPath = vaultPath;
  }

  getViewType(): string {
    return OMNI_CONTEXT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'OmniContext';
  }

  getIcon(): string {
    return 'message-circle';
  }

  async onOpen(): Promise<void> {
    this.closed = false;
    this.contentEl.empty();

    const wrapper = this.contentEl.createDiv({cls: 'omni-context-container'});
    const status = wrapper.createDiv({cls: 'omni-context-status'});
    status.createDiv({cls: 'omni-context-spinner'});
    status.createDiv({text: 'Starting server...'});

    try {
      const serverUrl = await startServer(this.vaultPath, text => {
        status.empty();
        status.createDiv({cls: 'omni-context-spinner'});
        status.createDiv({text});
      });
      if (this.closed) return;

      wrapper.empty();
      wrapper.createEl('iframe', {attr: {src: serverUrl}});
    } catch (err) {
      if (this.closed) return;
      wrapper.empty();
      wrapper.createDiv({cls: 'omni-context-error', text: `Failed to start: ${err}`});
    }
  }

  async onClose(): Promise<void> {
    this.closed = true;
  }
}
