import { DialogListItem } from "./DialogListItem";
import { PanelContainer } from "./PanelContainer";
import { HasOptions } from "./UserInterface";
import { KeyboardControlKeys } from "./Keyboard";

export class UIPanel extends PanelContainer implements HasOptions {
  private caret: Phaser.GameObjects.Text;
  public options: any[] = [];
  private focusedIndex: number = 0;

  constructor(
    dimensions: Coords,
    pos: Coords,
    spriteKey: string,
    scene: Phaser.Scene,
    public escapable: boolean = true,
    id?: string
  ) {
    super(dimensions, pos, spriteKey, scene, id);
  }
  private getNumberOfVisibleOptions() {
    if (this.options.length) {
      return Math.floor(this.panel.height / this.options[0].height);
    }
    return 1;
  }

  private optionsPerPage() {
    if (this.options.length) {
      return Math.ceil(this.panel.height / this.options[0].height);
    }
    return 1;
  }

  private buildPages() {
    return this.options.reduce((acc, p) => {
      if (
        acc.length <= 0 ||
        acc[acc.length - 1].length >= this.optionsPerPage()
      ) {
        acc.push([p]);
      } else {
        acc[acc.length - 1].push(p);
      }
      return acc;
    }, []);
  }
  private pages: DialogListItem[][];
  private currentPageIndex: number = 0;
  private renderPage() {
    let toAdd = this.pages[this.currentPageIndex];
    let lastPlacement = 20;
    toAdd.forEach((o, i) => {
      o.y = i > 0 ? lastPlacement + 40 : lastPlacement;
      lastPlacement = o.y;
      this.add(o);
    });
  }
  private getcurrentPage() {
    return this.pages[this.currentPageIndex];
  }
  private showNextPage() {
    this.currentPageIndex = Math.min(
      this.currentPageIndex + 1,
      this.pages.length - 1
    );
    this.setVisibilityByCurrentPage();
    this.renderPage();
    this.focusOption(0);
    this.setCaret();
  }
  private showPreviousPage() {
    this.currentPageIndex = Math.max(this.currentPageIndex - 1, 0);
    this.setVisibilityByCurrentPage();
    this.renderPage();
    this.focusOption(this.getcurrentPage().length - 1);
    this.setCaret();
  }

  private setVisibilityByCurrentPage() {
    this.pages.forEach((p, i) => {
      p.forEach((x) => x.setVisible(i === this.currentPageIndex));
    });
  }

  public show() {
    this.createCaret();
    this.pages = this.buildPages();
    this.setVisibilityByCurrentPage();

    this.setCaret();
    this.bringToTop(this.caret);
    this.visible = true;
    this.renderPage();
    this.showChildren();
    this.focusOption(0);
  }

  public close() {
    this.destroyCaret();
    this.visible = false;
    this.handleClose();
    this.hideChildren();
  }

  private destroyCaret() {
    this.caret && this.caret.destroy(true);
    delete this.caret;
  }

  public addOption(
    text: string,
    selectCallback: Function,
    focusCallback?: Function
  ): UIPanel {
    const lastItem = <Phaser.GameObjects.Text>(
      this.options[this.options.length - 1]
    );
    // const x = 0;
    // const y = lastItem ? lastItem.y + 40 : 20;
    const toAdd = new DialogListItem(
      this.scene,
      0,
      0,
      text,
      {
        fontFamily: "pixel",
        fontSize: "32px",
        fill: "#000000",
      },
      selectCallback,
      focusCallback
    );
    toAdd.setPadding(30, 0, 0, 0);
    this.options.push(toAdd);
    return this;
  }

  public readjustOptionsForWindow() {
    const startWindow = 0;
    const endWindow = startWindow + this.getNumberOfVisibleOptions();
    const options = [...this.options];
    this.resetOptions();
    //TODO: Items that fit to window turned off for now.
    // If there is aneough space to show all options, skip this behavior.
    let toAdd = options;
    if (options.length >= this.getNumberOfVisibleOptions()) {
      toAdd = options.filter((o, i) => {
        return i >= startWindow && i <= endWindow;
      });
    }
    // const toAdd = options;

    let lastPlacement = 20;
    toAdd.forEach((o, i) => {
      o.y = i > 0 ? lastPlacement + 40 : lastPlacement;
      lastPlacement = o.y;
      this.add(o);
    });
    this.options = options;
  }

  resetOptions() {
    this.remove(this.options);
  }

  public removeOption(name: string) {
    this.options.filter((listItem) => listItem.name !== name);
  }

  public focusOption(index: number) {
    this.getcurrentPage().forEach((option, i) => {
      if (i === index) {
        this.focusedIndex = i;
        option.focused = true;
        option.focus();
      } else {
        option.focused = false;
      }
    });
    this.setCaret();
  }
  public getFocusIndex() {
    const current = this.getcurrentPage().find((opt) => opt.focused);
    return this.getcurrentPage().findIndex((opt) => opt === current);
  }

  public focusNextOption() {
    const index = this.getFocusIndex();
    /** If we're at the bottom of the list */
    if (index + 1 > this.getcurrentPage().length - 1) {
      /** If we're on the last page, do nothing */
      if (this.currentPageIndex === this.pages.length - 1) {
        return;
      }
      return this.showNextPage();
    }

    const toFocus =
      index >= this.getcurrentPage().length - 1 ? index : index + 1;
    this.focusOption(toFocus);
  }

  public focusPreviousOption() {
    const index = this.getFocusIndex();
    /**If we're at the top of the list */
    if (index - 1 < 0) {
      /** If we're on the first page, do nothing */
      if (this.currentPageIndex === 0) {
        return;
      }
      return this.showPreviousPage();
    }
    const toFocus = index <= 0 ? this.getcurrentPage().length - 1 : index - 1;
    this.focusOption(toFocus);
  }

  public getFocusedOption() {
    const option = this.getcurrentPage().find((opt) => opt.focused);
    if (option) {
      return option;
    }
  }

  public selectFocusedOption() {
    const toSelect = this.getFocusedOption();
    if (toSelect && !toSelect.disabled) {
      toSelect.select();
    }
  }

  private createCaret() {
    if (this.caret) {
      return;
    }
    this.caret = this.scene.add.text(-100, -100, ">", {
      fontFamily: "pixel",
      fontSize: "32px",
      fill: "#000000",
    });
    this.add(this.caret);
    //TODO: Refactor to create a correct cursor object
    this.caret.type = "Cursor";
  }

  private setCaret() {
    const focusedOption = this.getFocusedOption();
    if (this.caret && focusedOption) {
      this.caret.x = focusedOption.x + 5;
      this.caret.y = focusedOption.y;
      this.bringToTop(this.caret);
    }
  }

  public onKeyDown(key: KeyboardControlKeys) {
    switch (key) {
      case KeyboardControlKeys.UP:
      case KeyboardControlKeys.LEFT:
        this.scene.sound.play("menu-tick", { volume: 0.1 });
        this.focusPreviousOption();

        break;
      case KeyboardControlKeys.RIGHT:
      case KeyboardControlKeys.DOWN:
        this.scene.sound.play("menu-tick", { volume: 0.1 });
        this.focusNextOption();

        break;
      case KeyboardControlKeys.ESC:
        this.emit("escape-pressed");
        this.parentContainer["traverseBackward"]();
        break;
      case KeyboardControlKeys.SPACE:
        this.scene.sound.play("menu-select", { volume: 0.1 });
        this.selectFocusedOption();
        break;
    }
  }

  public refreshPanel(callback?: Function) {
    this.list = this.list.filter((item) => item.type !== "Text");
    this.options = [];

    callback && callback();
  }
}