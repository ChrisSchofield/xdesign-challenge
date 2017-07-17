
'use strict';

class dbClass { // Creating a class in order to manage DB interactions

  constructor(conn) { // Accepting the MYSQL connection object
    this.connection = conn
  }

  getInfo(table,search,limit,offset) { // This is a method to extract data from the DB, this will be used for the front end and API.

    if (search && typeof search == "object") var searchString = " WHERE " + Object.keys(search)[0] + " = '" + Object.values(search)[0] + "'"
    else if (search && typeof search == "string") {
      var searchString = " WHERE ",
          propArray = ["model","type","vehicleUsage","manufacturer","license_plate","transmission","fuel_type","colour"]
      for (var x = 0;x<propArray.length;x++) {
        searchString += propArray[x] + " LIKE '" + search + "'"
        if (x<(propArray.length - 1)) searchString += " OR "
      }
    }

    var query = "SELECT * FROM " + table + (search ? searchString : "") + (limit ? " LIMIT " + limit : "") + (offset ? " OFFSET " + (offset*6) : "")

    var res = this.connection.query(query)

    return res

  }

  putInfo(table,object) { // this is a method to place data in the database, after it has been read and formatted from the XML file provided.

    var keys = Object.keys(object);
    var values = Object.values(object);

    var query = "INSERT INTO " + table + " (" + keys.join(", ")
        query += ") VALUES ('" + values.join("', '") + "')"

    var res = this.connection.query(query)

    return res

  }

  existsInDB(table,object) { // To ensure duplicate data is avoided.

    var keys = Object.keys(object);
    var values = Object.values(object);

    var string = "";

    for (var x=0;x<keys.length;x++) {
      if (keys[x] !== "uuid") {
        string += keys[x] + " = '" + values[x] + "'"
        if (x<(keys.length-1)) string += " AND " // -1 because of the zero index
      }
    }

    var query = "SELECT * FROM " + table + " WHERE " + string
    // console.log(query)

    var res = this.connection.query(query)

    return res

  }

}

module.exports = dbClass
