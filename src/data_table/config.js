import createBulkColumnType from "./column_types/bulk";
import createBaseColumnType from "./column_types/base";

class Config {
  constructor() {
    this.columnTypes = [
      createBulkColumnType(),
      createBaseColumnType()
    ];
  }

  addColumnType(columnType) {
    this.columnTypes.push(columnType);
  }
}

export default Config;
