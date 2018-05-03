import _ from "underscore";

import View from "../view";

class Row extends View {
  constructor(options) {
    super(options);

    this.columnsConfig = options.columnsConfig;
    this.isTotals = options.totals;
    this.hasUniques = this._hasUniqueValues();
    this.$el.data("row", this);
  }

  render() {
    const cells = this.findCells();
    let node;
    _.each(this.columnsConfig, function(config) {
      node = cells.filter(config.nodeMatcher(config));
      this._invokeRenderer(config, node);
    }, this);
  }

  renderColumnByConfig(config) {
    const node = this.findCells().filter(config.nodeMatcher(config));
    this._invokeRenderer(config, node);
  }

  bulkState(state) {
    // TODO: throw error when no checkbox
    if (!this.checkbox) return;

    if (arguments.length === 1) {
      // setter
      this.checkbox.prop("checked", state).change();
      this.$el.toggleClass("backdraft-selected", state);
    } else {
      // getter
      return this.checkbox.prop("checked");
    }
  }

  findCells() {
    return this.$el.find("td");
  }

  _invokeRenderer(config, node) {
    if (node.length === 1) {
      config.renderer.call(this, node, config);
    } else if (node.length > 1) {
      throw new Error("multiple nodes were matched");
    }
  }

  _hasUniqueValues() {
    let hasUniques = false;

    if (this.isTotals) {
      const columns = this.model.keys();

      _.each(columns, column => {
        if (column && columns.indexOf(`${column}.unique`) !== -1) {
          const columnVal = this.model.get(column);
          if (!(columnVal instanceof Array) && columnVal !== this.model.get(`${column}.unique`)) {
            hasUniques = true;
            return false;
          }
        }
      });
    }

    return hasUniques;
  }
}

Row.prototype.renderers = {};

export default Row;
