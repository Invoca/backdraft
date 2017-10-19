# Backdraft
Wrapper around Backbone providing integration with [DataTables](https://www.datatables.net/), as well as other utilities for creating Backbone views and models.
Written as a plugin-based framework, where the DataTables integration is a plugin itself, and Backdraft can be further extended with your own plugins.

## Install

```
npm install backdraft-app
```

## Usage
First, define a new Backdraft app and what plugins it will use:

```javascript
Backdraft.app("TableExample", {
  plugins : ["DataTable"],

  activate : function($el) {
    this.mainRouter = new this.Routers.Main({ $el : $el });
    Backbone.history.start({ });
  }
});
```

Now, everything else gets namespaced within the Backdraft app name:

```javascript
// routers/main.js
Backdraft.app("TableExample", function(app) {
  app.router("Main", {
    routes : {
      "" : "index"
    },

    index : function() {
      var view = new app.Views.Index();
      this.swap(view);
    }
  });

});

// models/book.js
Backdraft.app("TableExample", function(app) {
  app.model("Book", {});
});

// collections/book.js
Backdraft.app("TableExample", function(app) {
  app.collection("Books", {
    model : app.Models.Book
  });
});

// views/book_table.js
Backdraft.app("TableExample", function(app) {
  app.view.dataTable("BookTable", {
    rowClassName : "BookRow",
    paginate : false
  });
});

// views/book_row.js
Backdraft.app("TableExample", function(app) {
  app.view.dataTable.row("BookRow", {
    columns : [
      { bulk : true },
      { attr : "name", title : "Name" },
      { attr : "created_at", title : "Created" }
    ]
  });
});
```

Now create the view that pulls all the pieces together:

```javascript
// views/index.js
Backdraft.app("TableExample", function(app) {
  app.view("Index", {
    render : function() {
      var collection  = new app.Collections.Books();
      var data = [];

      // fake data
      for (var iter = 0; iter < 10; ++iter) {
        data.push({ name : "Book " + (iter + 1) });
      }

      collection.add(data);
      var table = new app.Views.BookTable({ collection : collection });

      this.$el.html(table.render().$el);
      return this;
    }
  });
});
```

Finally, in an HTML page that loads the above scripts, include the dist/backdraft.js file in your assets.
You must also include the required vendor files (jQuery & underscore.js), plus dataTables.js if using the datatables plugin.

Then activate the app at load time:

```html
<html>
  <head>
    ...
  </head>
  <body>
    <div id="example-area"></div>

    <script type="text/javascript">
      Backdraft.app("TableExample").activate($("#example-area"));
    </script>
  </body>
</html>
```

### Important notes
* We're using curly braces ``{{ }}`` for underscore templating instead of angle brackets ``<% %>`` to not conflict with other templating conventions.

### Examples
If you run `grunt`, an local server will be launched with live examples at [localhost:9873](http://localhost:9873).


## Develop & Contribute

### Environment Setup
To develop a Backdraft plugin or modify Backdraft, the following setup needs to be done first (this assumes a Mac running OS 10.9+):

* Install NVM, the Node Version Manager https://github.com/creationix/nvm
 *  ```curl https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | sh```
* Open a new tab in your terminal
* Install Node.js with:
 *  ``` nvm install v7.2.1```
* Set it as the default Node.js version
 * ```nvm alias default 7.2.1```
* Install dependencies

  ```
  cd backdraft
  npm run setup
  npm install
  ```

### Testing

Run the grunt task from the main directory to have the source and test files watched and tests auto-run when any modifications are done

    grunt

You can also specifically run tests with:

    grunt spec

See all available commands with:

    grunt --help

### Contributing

If you'd like to contribute a feature or bugfix: Thanks! To make sure your change has a high chance of being included, please read the following guidelines:

1. Post a [pull request](https://github.com/invoca/backdraft/compare/).
2. Please add tests. We will not accept any patch that is not tested. (It's rare when explicit tests aren't needed.) Please see existing tests for examples and structure.

Thank you to all [the contributors](https://github.com/invoca/backdraft/contributors)!

### Publishing - admins

To publish a new version to NPM (https://www.npmjs.com/package/backdraft-app), do the following

1. Ensure the following are complete:

  * Green build
  * Code Reviewed
  * Tested

1. Update version: `npm version <update_type>` (patch|minor|major)

1. A commit is made with a version bump, so `git push`

1. Publish to NPM registry: `npm publish` (documentation here: https://docs.npmjs.com/getting-started/publishing-npm-packages)

1. If on a branch, ensure this version gets **merged to master**

License
-------
Backdraft is Copyright © 2014-2017 Invoca, Inc. [MIT](https://github.com/Invoca/backdraft/blob/master/LICENSE) license.
