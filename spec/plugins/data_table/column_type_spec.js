import ColumnType from "../../../src/plugins/data_table/column_type";

describe("ColumnType", function() {

  it("should allow getter/setters to be generated", function() {
    const columnType = new ColumnType();

    expect(columnType.configMatcher()).not.toBeDefined();
    expect(columnType.nodeMatcher()).not.toBeDefined();
    expect(columnType.definition()).not.toBeDefined();
    expect(columnType.renderer()).not.toBeDefined();

    const configMatcher = () => {};
    columnType.configMatcher(configMatcher);

    const nodeMatcher = () => {};
    columnType.nodeMatcher(nodeMatcher);

    columnType.definition("duurrrr");

    const renderer = {};
    columnType.renderer(renderer);

    expect(columnType.configMatcher()).toEqual(configMatcher);
    expect(columnType.nodeMatcher()).toEqual(nodeMatcher);
    expect(columnType.definition()).toEqual("duurrrr");
    expect(columnType.renderer()).toEqual(renderer);
  });

});
