import _ from "underscore";
import BaseFilterMenu from "./base_filter_menu";

class StringFilterMenu extends BaseFilterMenu {
  afterRender() {
    const filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
    // if there are filters in url, enable in UI
    if (filterArray.length > 0) {
      // find the filters that match this filter instance
      const matches = _.where(filterArray, {type: "string", attr: this.attr});
      // if there are filter params for this filter, add them to the markup
      if (matches[0]) {
        this.$el.find("input.filter-string").val(matches[0][matches[0].comparison]);
        this.parentView._toggleIcon(true);
      }
    }
  }

  _onInputChange(event) {
    const filterInput = event.target;
    if (filterInput.value === "") {
      this.filter.value = null;
      this.parentView._toggleIcon(false);
    } else {
      this.filter.value = filterInput.value;
      this.parentView._toggleIcon(true);
    }
    this._updateFilterUrlParams();
  }

  clear() {
    if (this.enabled) {
      this.$("input[type=text]").val("").trigger("change");
    } else {
      this.filter.value = null;
      this.parentView._toggleIcon(false);
      this._updateFilterUrlParams();
    }
  }
}

_.extend(StringFilterMenu.prototype, {
  filterMenuClass: "filter-menu-string",

  menuTemplate: _.template(`
      <div class="filter-text">Show:</div>
      <div class="filter-menu-string-container">
        <input class="filter-string form-control input-sm" type="text" name="filter-string" />
      </div>
      `, null, BaseFilterMenu.DEFAULT_JST_DELIMS)
});

export default StringFilterMenu;
