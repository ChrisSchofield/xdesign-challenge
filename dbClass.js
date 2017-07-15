
'use strict';

class dbClass { // Creating a class in order to manage DB interactions

  constructor(conn) { // Accepting the MYSQL connection object
    this.connection = conn
  }

  getInfo(table,limit,search) { // This is a method to extract data from the DB, this will be used for the front end and API.

    this.connection.connect()
    var query = "SELECT * FROM " + table + (limit ? " LIMIT " + limit : "")

    this.connection.query(query, (err, res, fields) => {
      if (err) throw err
      console.log(res)
    })

  }

  putInfo(table,object) { // this is a method to place data in the database, after it has been read and formatted from the XML file provided.

    var query = "INSERT INTO " + table + " SET ?"

    this.connection.query(query,object,(err, res, fields) => {
      if (err) throw err
    })

  }

}

module.exports = dbClass
