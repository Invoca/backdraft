var DataTableFilter = (function(options) {
  var Base = Backdraft.plugin("Base");

  var DEFAULT_JST_DELIMS = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  var DataTableFilterMenu = Base.View.extend({
    filterMenuClass: "",

    menuTemplate: _.template(''), // to be overridden by subclasses
    parentMenuTemplate: _.template('\
      <div class="filterMenu <%= filterMenuClass %>">\
        <%= menuTemplate %>\
        <button class="btn btn-sm btn-filter" name="button" type="submit" title="">Apply</button>\
        <button class="btn btn-primary btn-sm btn-clear pull-right" name="button" type="submit" title="">Clear</button>\
      </div>\
      ', null, DEFAULT_JST_DELIMS),

    errorTemplate: _.template('\
      <span class="text-danger error-text">\
        <%= errorCopy %>\
      </span>\
    ', null, DEFAULT_JST_DELIMS),

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.parentView = options.parentView;
      this.enabled = true;
    },

    events: {
      "click input": "_onInputClick",
      "change input": "_onInputChange"
    },

    render: function () {
      this.beforeRender();

      this.$el.html(this.parentMenuTemplate({
        filterMenuClass: this.filterMenuClass,
        menuTemplate: this.menuTemplate({
          filter: this.filter,
          attr: this.attr,
          title: this.title,
          parentView: this.parentView
        })
      }));

      this.afterRender();

      // Bind button clicks
      this.$('.btn-filter').click(_.bind(this.parentView._onFilterClick, this.parentView));
      this.$('.btn-clear').click(_.bind(this.parentView._onClearClick, this.parentView));

      // Bind "enter" key
      this.$('.filterMenu').keyup(_.bind(function(event) {
        var key = event.keyCode || event.which;
        if (key === 13) {
          this.parentView._onFilterClick.call(this.parentView);
        }
      }, this));

      return this;
    },

    beforeRender: function () {
      // to be optionally implemented by subclasses
    },

    afterRender: function () {
      // to be optionally implemented by subclasses
    },

    _onInputClick: function (event) {
      event.target.focus();
      event.stopImmediatePropagation();
    },

    _onInputChange: function (event) {
      // to be implemented by subclasses
    },

    _updateFilterUrlParams: function() {
      // get url parameters into an array
      var params=[];
      // if there are already parameters there, get them
      var urlArray = window.location.href.split("?");
      if (urlArray[1]) {
        params = $.deparam(urlArray[1]);
      }
      // get the filter settings
      var filteringSettings = this.parent.table._getFilteringSettings();

      // if there are active filters, put them in the filter_json param
      if (JSON.parse(filteringSettings).length>0) {
        params.filter_json = filteringSettings;
      }
      // otherwise delete the filter_json param to keep a clean uri
      else {
        delete params.filter_json;
      }
      // Delete ext_filter_json from the url, we're deprecating it
      delete params.ext_filter_json;

      // if history is supported, add it to the url
      if (history.replaceState) {
        var state = { params: params };
        var url =  urlArray[0] + "?" + jQuery.param(params);
        history.replaceState(state, window.document.title, url);
      }
    },

    disableFilter: function(errorMessage) {
      if (!this.enabled) return;
      this.$('.filterMenu').prepend(this.errorTemplate({ errorCopy: errorMessage }));
      this.$('.btn-filter').prop("disabled", true);
      this.enabled = false;
    },

    enableFilter: function() {
      if (this.enabled) return;
      this.$('.error-text').remove();
      this.$('.btn-filter').prop("disabled", false);
      this.enabled = true;
    }
  });

  var StringFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-string",

    menuTemplate: _.template('\
      <div class="filter-text">Show:</div>\
      <div class="icon-addon addon-sm">\
        <input class="filter-string form-control input-sm" type="text" name="filter-string" />\
        <label for="filter-string" class="glyphicon glyphicon-search"></label>\
      </div>\
      ', null, DEFAULT_JST_DELIMS),

      afterRender: function() {
        var filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
        // if there are filters in url, enable in UI
        if (filterArray.length > 0) {
          // find the filters that match this filter instance
          var matches = _.where(filterArray, {type: "string", attr: this.attr});
          // if there are filter params for this filter, add them to the markup
          if (matches[0]) {
            this.$el.find("input.filter-string").val(matches[0][matches[0].comparison]);
            this.parentView._toggleIcon(true);
          }
        }
      },

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.value === "") {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter.value = filterInput.value;
        this.parentView._toggleIcon(true);
      }
      this._updateFilterUrlParams();
    },

    clear: function() {
      this.$("input[type=text]").val("").trigger("change");
    }
  });

  var NumericFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-numeric",

    menuTemplate: _.template('\
      <div class="filter-text">Show items with value that:</div> \
      <select class="filter-type form-control" data-filter-id="first-filter">\
        <option selected value="gt">is greater than</option> \
        <option value="lt">is less than</option> \
        <option value="eq">is equal to</option> \
      </select> \
      <input id="first-filter" class="filter-value form-control" type="text" data-filter-type="gt" /> \
      <div class="filter-text">and</div> \
      <select class="filter-type form-control" data-filter-id="second-filter">\
        <option value="gt">is greater than</option> \
        <option selected value="lt">is less than</option> \
        <option value="eq">is equal to</option> \
      </select> \
      <input id="second-filter" class="filter-value form-control" type="text" data-filter-type="lt" /> \
    ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      event.stopImmediatePropagation();
      var filterType = event.target.getAttribute('data-filter-type'),
          filterValue = event.target.value;
      if (filterValue === "") {
        this.filter[filterType] = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter[filterType] = filterValue;
        this.parentView._toggleIcon(true);
      }
      this._updateFilterUrlParams();
    },

    afterRender: function() {
      // populate filter fields
      var filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
      // if there are filters in the url...
      if (filterArray.length > 0) {
        // find the filters that match this filter instance
        var matches = _.where(filterArray, {type: "numeric", attr: this.attr});
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

      this.$('.filter-type').bind('change', function(event) {
        var filterElementId = event.target.getAttribute('data-filter-id'),
          filterType = event.target.value;
        $('#'+filterElementId).attr('data-filter-type', filterType);
      });
    },

    clear: function() {
      this.$("input[type=text]").val("").trigger("change");
      this.$("select[data-filter-id=first-filter]").val("gt").trigger("change");
      this.$("select[data-filter-id=second-filter]").val("lt").trigger("change");
    }
  });

  var ListFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-list",

    menuTemplate: _.template('\
      <div class="filter-text">Show:</div>\
      <a class="select-all" href="javascript:;">Select all</a>\
      <ul>\
        <% _.each(filter.options, function(element, index) { %>\
          <li>\
            <label>\
              <input class="list list-item-input" type="checkbox" name="<%= attr %>" value="<%- element %>" /> \
              <%= element %>\
            </label>\
          </li>\
        <% }) %>\
      </ul>\
      ', null, DEFAULT_JST_DELIMS),

    afterRender: function () {
      var filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
      // if there are filters in the url...
      if (filterArray.length > 0) {
        // find the filters that match this filter instance
        var matches = _.where(filterArray, {type: "list", attr: this.attr});

        // if there are url params for this filter...
        if (matches[0]) {
          // go through each of those list values
          matches[0].value.forEach( function(element, index, array) {
            // check it
            this.$el.find('input[value="'+element+'"]').prop("checked", true);
          }.bind(this));
          // make the button show
          this.parentView._toggleIcon(true);
        }
      }

      var listClass;

      if (this.filter.options.length > 30) {
        listClass = "triple";
      } else if (this.filter.options.length > 15) {
        listClass = "double";
      } else {
        listClass = "single";
      }

      this.$("ul").addClass(listClass);
      this.$(".select-all").click(_.bind(this._selectAll, this));
    },

    _selectAll: function(event) {
      this.$('li input:checkbox:not(:checked)').each(_.bind(function(i, el) {
        this.$(el).click();
      }, this));
    },

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.checked) {
        this.filter.value = this.filter.value || [];
        this.filter.value.push(filterInput.value);
        this.parentView._toggleIcon(true);
      }
      // remove filter from column manager if it is defined
      else if (this.filter.value) {
        var index = this.filter.value.indexOf(filterInput.value);
        if (index > -1) {
          this.filter.value.splice(index, 1);
        }
        if (this.filter.value.length === 0) {
          this.filter.value = null;
          this.parentView._toggleIcon(false);
        }
      }
      this._updateFilterUrlParams();
    },

    clear: function() {
      this.$("input[type=checkbox]").attr("checked", false).trigger("change");
    }
  });

  var DataTableFilter = Base.View.extend({
    template: _.template('\
        <div class="toggle-filter-button btn-popover-menu" data-toggle="dropdown">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
      ', null, DEFAULT_JST_DELIMS),

    events: {
      "click .toggle-filter-button": "_onToggleClick",
    },

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.table = options.table;
      this.head = options.head;
      this.filterButtonClass = "filterInactive";

      // decide which filter view based on type, here
      var filterMenu = null;
      switch (this.filter.type) {
        case 'string':
          filterMenu = new StringFilterMenu({column: options.column, parentView: this});
          break;
        case 'numeric':
          filterMenu = new NumericFilterMenu({column: options.column, parentView: this});
          break;
        case 'list':
          filterMenu = new ListFilterMenu({column: options.column, parentView: this});
          break;
      }

      // add as a child (backdraft thing just to keep bookkeeping on subviews)
      this.child("filter-menu", filterMenu);
    },

    render: function () {
      this.$el.html(this.template({
        filterButtonClass: this.filterButtonClass
      }));

      this.$('.toggle-filter-button').popoverMenu({
        content: this.child("filter-menu").render().$el,
        placement: function(popover, trigger) {
          // We can't know the width without rendering to DOM.
          // We can't render to DOM without knowing the width.
          // Thus is life.
          var popoverWidth = 250;

          var triggerLeftPosition = trigger.getBoundingClientRect().left;
          var windowWidth = window.innerWidth;

          if ((triggerLeftPosition + popoverWidth) > windowWidth) {
            return 'left auto';
          }

          return 'bottom';
        }
      });

      return this;
    },

    _toggleIcon: function (enabled) {
      var icon = $(".toggle-filter-button > span", this.$el);
      icon.removeClass("filterActive");
      icon.removeClass("filterInactive");
      if (enabled) {
        icon.addClass("filterActive");
      } else {
        icon.addClass("filterInactive");
      }
    },

    _onToggleClick: function (event) {
      // close popoverMenus except for this one
      $(".toggle-filter-button").not(event.currentTarget).popoverMenu('hide');
      event.stopImmediatePropagation();
    },

    _onFilterClick: function () {
      $("input[type=text]", this.head).trigger("change");
      // Update ajaxsource on datatable
      this._updateAjaxSource();
      this.table.dataTable._fnAjaxUpdate();
      this.$(".toggle-filter-button").popoverMenu('hide');
    },

    _onClearClick: function () {
      this.child("filter-menu").clear();
      this._updateAjaxSource();
      this.table.dataTable._fnAjaxUpdate();
      this.$(".toggle-filter-button").popoverMenu('hide');
    },

    _updateAjaxSource: function() {
      // get ajax url
      var ajaxURL = this.parent.dataTable.fnSettings().sAjaxSource;
      // get the endpoint of ajax url
      var splitUrl = ajaxURL.split("?");
      var endpoint = splitUrl[0];

      // Early exit if no params
      if (!splitUrl[1]) {
        return;
      }

      // get parameters of ajax url
      var params = $.deparam(splitUrl[1]);

      // make ext_filter_json param the same as the current url, now with new filters
      var urlParamString = window.location.href.split("?")[1];
      params.ext_filter_json = $.deparam(urlParamString).ext_filter_json || $.deparam(urlParamString).filter_json;

      // Build new url with old endpoint but new params
      var newURL = endpoint + "?"+ $.param(params);

      // Update datatable ajax source
      this.parent.dataTable.fnSettings().sAjaxSource = newURL;
    },

    disableFilter: function(errorMessage) {
      this.child("filter-menu").disableFilter(errorMessage);
    },

    enableFilter: function() {
      this.child("filter-menu").enableFilter();
    }
  });

  return new DataTableFilter(options);
});
