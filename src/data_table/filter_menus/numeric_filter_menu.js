import _ from "underscore";
import BaseFilterMenu from "./base_filter_menu";

class NumericFilterMenu extends BaseFilterMenu {
  _onInputChange(event) {
    event.stopImmediatePropagation();
    const filterType = event.target.getAttribute('data-filter-type');
    const filterValue = event.target.value;
    if (filterValue === "") {
      this.filter[filterType] = null;
      this.parentView._toggleIcon(false);
    } else {
      this.filter[filterType] = filterValue;
      this.parentView._toggleIcon(true);
    }
    this._updateFilterUrlParams();
  }

  _onSelectChange(event) {
    event.stopImmediatePropagation();
    const target = $(event.target);
    const filterElementId = target.data('filter-id');
    const previousFilterType = target.data('previous-value');
    const filterType = target.val();
    this.filter[filterType] = this.filter[previousFilterType];
    delete this.filter[previousFilterType];
    target.data('previous-value', filterType);
    this.$(`#${filterElementId}`).attr('data-filter-type', filterType).trigger("change");
    this._updateFilterUrlParams();
  }

  afterRender() {
    // populate filter fields
    const filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
    // if there are filters in the url...
    if (filterArray.length > 0) {
      // find the filters that match this filter instance
      const matches = _.where(filterArray, {type: "numeric", attr: this.attr});
      // if there are url params for this filter...
      if (matches[0]) {
        // change the comparison type on the select dropdown
        this.$el.find("[data-filter-id=first-filter]").val(matches[0].comparison);
        // change the value of the input field
        this.$el.find("input#first-filter").val(matches[0].value).attr("data-filter-type", matches[0].comparison);

        this.parentView._toggleIcon(true);
      }
      if (matches[1]) {
        // change the comparison type on the second select dropdown
        this.$el.find("[data-filter-id=second-filter]").val(matches[1].comparison);
        // change the value of the input second field
        this.$el.find("input#second-filter").val(matches[1].value).attr("data-filter-type", matches[1].comparison);

        this.parentView._toggleIcon(true);
      }
    }
  }

  clear() {
    if (this.enabled) {
      this.$("input[type=text]").val("").trigger("change");
      this.$("select[data-filter-id=first-filter]").val("gt").trigger("change");
      this.$("select[data-filter-id=second-filter]").val("lt").trigger("change");
    } else {
      this.filter.lt = null;
      this.filter.gt = null;
      this.filter.eq = null;

      this.parentView._toggleIcon(false);
      this._updateFilterUrlParams();
    }
  }
}

_.extend(NumericFilterMenu.prototype, {
  filterMenuClass: "filter-menu-numeric",

  menuTemplate: _.template(`
      <div class="filter-text">Show items with value that:</div> 
      <div class="filter-menu-numeric-container"> 
        <select class="filter-type form-control" data-filter-id="first-filter" data-previous-value="gt">
          <option selected value="gt">is greater than</option> 
          <option value="lt">is less than</option> 
          <option value="eq">is equal to</option> 
        </select> 
        <input id="first-filter" class="filter-value form-control" type="text" data-filter-type="gt" /> 
        <div class="filter-text">and</div> 
        <select class="filter-type form-control" data-filter-id="second-filter" data-previous-value="lt">
          <option value="gt">is greater than</option> 
          <option selected value="lt">is less than</option> 
          <option value="eq">is equal to</option> 
        </select> 
        <input id="second-filter" class="filter-value form-control" type="text" data-filter-type="lt" /> 
      </div> 
    `, null, BaseFilterMenu.DEFAULT_JST_DELIMS)
});

export default NumericFilterMenu;
