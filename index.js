const exp     = require("express")
const pug     = require("pug")
const x2j     = require("xml2js")
const fs      = require("fs")
const sql     = require("mysql")
const dbClass = require("./dbClass.js")
const extras  = require("./additionalFunctions.js")


// Important variables to keep in memory
let xmlParsed
let connection = new dbClass(
  sql.createConnection({
    host      : "127.0.0.1",
    user      : "xdesign",
    password  : "PasswordExample",
    database  : "xdesign"
  })
)

function readLocalFile(xmlData) {
  fs.readFile(xmlData, 'utf8', (err,xml) => { // Load the XML file to 'xml' variable. utf8 is required or the file will read as bytes.
    if (err) throw err // throw an error in the case the parser can't digest the XML.
    populate(xml)
  })
}

function populate(xml) {
  x2j.parseString(xml, function (err, result) {

    xmlParsed = result.xml.Vehicle // let's keep this in memory in case we need it later.

    for (var vehicle in xmlParsed) {
      var ctx = xmlParsed[vehicle],
          owner = {} // create an empty object to receive owner details.

      for (var property in ctx) {

        // as xml2js read all the properties as strings wrapped in a single index array, check to see if elligible for correction, and, if so, correct.
        ctx[property] = ((typeof ctx[property] == "object" && property !== "$" && property !== "owner") ? ctx[property][0] : ctx[property])

        // for neatness, let's organise owner details into it's own object.
        if (property.includes("owner_")) {
          owner[property.split("owner_")[1]] = ctx[property]
          delete ctx[property] // then remove original
        }

        // in the event that the property is the attributes object extract the attributes and add them as properties to the main object.
        if (property == "$") {
          for (var attr in ctx[property]) {
            ctx[attr] = ctx[property][attr]
          }
          //remove the attributes object as the attributes are now part of the main object.
          delete ctx[property]
        }

        if (property == "has_gps" || property == "is_hgv") ctx[property] = (ctx[property] == "true" ? 1 : 0)

      }

      var uniqueIdentifier = extras.uuid()

      owner.uuid = uniqueIdentifier
      ctx.owner = uniqueIdentifier

      console.log("Car with registration " + ctx.license_plate + " has been populated into the database.")
      console.log("Customer " + owner.name + " has been populated into the database.")
      console.log("---")

      connection.putInfo("customers",owner)
      connection.putInfo("vehicles",ctx)

      if (vehicle == (xmlParsed.length - 1)) {
        console.log("All vehicles scanned.")
      }

    }
  })
}

readLocalFile("./clientdata.xml")

// TODO Check DB for duplicate entries.
// TODO Start building API with Express + Router
// TODO Build the front-end in Semantic UI + Express + PUG
