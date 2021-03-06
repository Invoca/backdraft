# Backdraft
Wrapper around Backbone providing integration with [DataTables](https://www.datatables.net/), as well as other utilities for creating Backbone views and models.
Written as a plugin-based framework, where the DataTables integration is a plugin itself, and Backdraft can be further extended with your own plugins.

## Install

```
npm install backdraft-app
```

## Usage
First, define a new Backdraft app:

```javascript
// app.js
import MainRouter from "./main_router";

import App from "backdraft-app/src/app";

class TableExample extends App {
  activate($el) {
    this.mainRouter = new MainRouter({ $el });
    Backbone.history.start({ });
  }
}
```

Define an entry point for creating your app:

```javascript
// main.js
import TableExample from "./app";

Backdraft.app("TableExample", new TableExample());
```

Define the various components of your app:

```javascript
// main_router.js
import IndexView from "./views/index_view";

import Router from "backdraft-app/src/router";

export default class MainRouter extends Router {
  get routes() {
    return {
      "" : "index"
    };
  }

  index() {
    const view = new IndexView();
    this.swap(view);
  }
};

// models/book.js
import Model from "backdraft-app/src/model";

export default class Book extends Model {
};

// collections/books.js
import Book from "../models/book";

import Collection from "backdraft-app/src/collection";

export default class Books extends Collection {
  get model() {
    return Book;
  }
};

// views/book_table_view.js
import BookRowView from "./book_row_view";

import LocalDataTable from "backdraft-app/src/data_table/local_data_table";

export default class BookTableView extends LocalDataTable {
  get rowClass() {
    return BookRowView;
  }
  
  get paginate() {
    return false;
  }
};

// views/book_row_view.js
import Row from "backdraft-app/src/data_table/row";

export default class BookRowView extends Row {
  get columns() {
    return [
      { bulk : true },
      { attr : "name", title : "Name" },
      { attr : "created_at", title : "Created" }
    ];
  }
};
```

Now create the view that pulls all the pieces together:

```javascript
// views/index_view.js
import BookTableView from "./book_table_view";
import Books from "../collections/books";

import View from "backdraft-app/src/view";

export default class IndexView extends View {
  render() {
    const collection  = new Books();
    const data = [];
  
    // fake data
    for (let iter = 0; iter < 10; ++iter) {
      data.push({ name : `Book ${iter + 1}` });
    }
  
    collection.add(data);
    const table = new BookTableView({ collection });
  
    this.$el.html(table.render().$el);
    return this;
  }
}
```

Finally, in an HTML page that loads the above scripts, activate the app at load time:

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

## Legacy Usage

The legacy usage uses the `Backdraft` object to define the components of the application.
 
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

### Examples
If you run `yarn run examples`, a local server will be launched with live examples at [localhost:9888](http://localhost:9888).


## Develop & Contribute

### Environment Setup
To develop a Backdraft plugin or modify Backdraft, the following setup needs to be done first (this assumes a Mac running OS 10.9+):

* Install NVM, the Node Version Manager https://github.com/creationix/nvm
 *  ```curl https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | sh```
* Open a new tab in your terminal
* Install Node.js with:
 *  ``` nvm install v6.11.0```
* Set it as the default Node.js version
 * ```nvm alias default v6.11.0```
* Install Yarn
  https://yarnpkg.com/en/docs/install
* Install dependencies

  ```
  cd backdraft
  yarn run setup
  yarn install
  ```

### Testing

Run the yarn `dev` script from the main directory to have the source and test files watched and tests auto-run when any modifications are done

    yarn run dev

Run the `specs` script to run all the tests and exit

    yarn run specs
    
Use the following two ENV variables to target specific tests:

- `SPEC_FILTER` - target specific tests via [karma-jasmine's --grep feature](https://github.com/karma-runner/karma-jasmine/blob/4f70e5e77831998dc252b2f7ad1353398144588b/README.md#configuration).
    
- `SPEC_FILE_FILTER` - target specific tests by file path. This value must be a regex. For example:

    `SPEC_FILE_FILTER="/data_table.*_spec.js/" yarn run specs`    

See all available commands with:

    yarn run

### Contributing

If you'd like to contribute a feature or bugfix: Thanks! To make sure your change has a high chance of being included, please read the following guidelines:

1. Post a [pull request](https://github.com/invoca/backdraft/compare/).
2. Please add tests. We will not accept any patch that is not tested. (It's rare when explicit tests aren't needed.) Please see existing tests for examples and structure.

Thank you to all [the contributors](https://github.com/invoca/backdraft/contributors)!

### Publishing - admins

To publish a new version to NPM (https://www.npmjs.com/package/backdraft-app), do the following

1. Ensure the following are complete:
  * Tested
  * Green build
  * Code Reviewed

2. Publish new version: `yarn version --new-version <version>`:
  * creates commit with version change
  * tags the commit with the version
  * pushes the commit and tag to Github
  * builds and publishes the node module 

3. If on a branch, ensure this version gets **merged to master**

License
-------
Backdraft is Copyright © 2014-2018 Invoca, Inc. [MIT](https://github.com/Invoca/backdraft/blob/master/LICENSE) license.
