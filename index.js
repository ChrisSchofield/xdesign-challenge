const exp     = require("express")
const pug     = require("pug")
const x2j     = require("xml2js")
const fs      = require("fs")
const sql     = require("promise-mysql")
const parser  = require("body-parser")
const session = require('express-session')

// Own requires
const dbClass = require("./dbClass.js")
const extras  = require("./additionalFunctions.js")


// Important variables to keep in memory
let xmlParsed
let vehicles
let customers
let connection
let api = exp()
let port = 8080
let router = exp.Router()
let authSession = []

sql.createConnection({
  host      : "127.0.0.1",
  user      : "xdesign",
  password  : "PasswordExample",
  database  : "xdesign"
}).then((conn)=>{
  connection = new dbClass(conn)
  if (fs.existsSync("./tmp/clientdata.xml")) {
    readLocalFile("./tmp/clientdata.xml")
    fs.unlink("./tmp/clientdata.xml",() => {
      console.log("Client XML Removed") // Let's tidy up, so that if the server is run again, the same data is not added twice.
    })
  }
  // Once we have a connection, check for XML, and if exists, read.
})

function readLocalFile(xmlData) {
  fs.readFile(xmlData, 'utf8', (err,xml) => { // Load the XML file to 'xml' variable. utf8 is required or the file will read as bytes.
    if (err) throw err // throw an error in the case the parser can't digest the XML.

    populate(xml)
  })
}

function readString(xmlData) {
  populate(xml)
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

        if (property == "usage") { // this name clashes with mySQL
          ctx.vehicleUsage = ctx[property]
          delete ctx[property]
        }

        if (property == "has_gps" || property == "is_hgv") ctx[property] = (ctx[property] == "true" ? 1 : 0)

      }

      var uniqueIdentifier = extras.uuid()

      owner.uuid = uniqueIdentifier
      ctx.owner = uniqueIdentifier

      connection.putInfo("customers",owner).then((response) => {
        // console.log(response)
      })

      connection.putInfo("vehicles",ctx).then((response) => {
        // console.log(response)
      })

      if (vehicle == (xmlParsed.length - 1)) {
        console.log("All vehicles scanned.")
      }
    }

  })
}

// API STUFF

api.set('trust proxy', 1)
api.use(parser.urlencoded({ extended: true }))
api.use(parser.json())
api.use(
  session({
    secret: 'PasswordExample',
    resave: true,
    saveUninitialized: true,
    cookie: {}
  })
)

router.use(function(req, res, next) {
    console.log('An API function has been called')
    console.log(req.sessionID)
    if (req.url == "/auth") next()
    else if (authSession.includes(req.sessionID)) next()
    else res.json({ message: 'Not authorised!' })
});

router.get('/', function(req, res) {
    res.json({ message: 'Please choose a function. Your available endpoints are /vehicles, /vehicles/:id, /customers, /customers/:id.' })
})

router.route('/auth') // Auth function
  .post((req,res) => {
    // I could integrate a token based auth system here with crypto functions, etc. but for now...
    var user = "xDesign",
        pass = "PasswordExample"

    if (req.body.user == user && req.body.pass == pass) {
      res.json({ message: 'Authorised!' })
      authSession.push(req.sessionID); // Add session ID to array of allowed sessions
    } else res.json({ message: 'Not authorised!' }) // deny access if not

  })

//
// API FUNCTIONS
//

router.route('/vehicles') // GET all vehicles
  .get((req,res) => {
    connection.getInfo("vehicles").then((response) => {
      res.json(response);
    })
  })

router.route('/vehicles/:id') // GET specific vehicle
  .get((req,res) => {
    connection.getInfo("vehicles",{id:req.params.id}).then((response) => {
      res.json(response[0]);
    })
  })

router.route('/customers') // GET ALL customers
  .get((req,res) => {
    connection.getInfo("customers").then((response) => {
      res.json(response);
    })
  })

router.route('/customers/:id') // GET specific customer
  .get((req,res) => {
    connection.getInfo("customers",{id:req.params.id}).then((response) => {
      res.json(response[0]);
    })
  })

// API ATTATCH ROUTER & LISTEN

api.use('/api', router) // Attatch API router
api.set('view engine', 'pug') // set renderer to PUG

api.use('/public', exp.static('semantic/dist'))

api.get('/', function (req, res) { // FRONT END
  var offset = (req.query.p ? req.query.p : null)  // check if should be offset
  var searchQ = (req.query.s ? req.query.s : null) // check if should be Searched
  connection.getInfo("vehicles",searchQ,6,offset).then((vehicleResponse) => { // Promises required due to async call (Node don't do Sync)
    connection.getInfo("customers",null,6,offset).then((customerResponse) => {
      connection.getInfo("vehicles",searchQ).then((vehicleResponseAll) => {
        res.render('index', {
          auth: authSession.includes(req.sessionID),
          title: 'Hey',
          message: 'Hello there!',
          vehicles: vehicleResponse,
          customers: customerResponse,
          offset: offset,
          total: Math.ceil(vehicleResponseAll.length / 6),
          search: searchQ
        })
      })
    })
  })
}).post('/', function (req, res) {
  var user = "xDesign",
      pass = "PasswordExample"

  if (req.body.user == user && req.body.pass == pass) { // Auth shares credentials with API
    authSession.push(req.sessionID); // Add session ID to array of allowed sessions
    var error = null
  } else {
    var error = "Failed to log in!"
  }

  var offset = (req.query.p ? req.query.p : null) // check if should be offset
  var searchQ = (req.query.s ? req.query.s : null) // check if should be Searched
  connection.getInfo("vehicles",searchQ,6,offset).then((vehicleResponse) => {
    connection.getInfo("customers",null,6,offset).then((customerResponse) => {
      connection.getInfo("vehicles",searchQ).then((vehicleResponseAll) => {
        res.render('index', {
          auth: authSession.includes(req.sessionID),
          title: 'Hey',
          message: 'Hello there!',
          vehicles: vehicleResponse,
          customers: customerResponse,
          error: error,
          offset: offset,
          total: Math.ceil(vehicleResponseAll.length / 6),
          search: searchQ
        })
      })
    })
  })

})

api.listen(port)
console.log('Listening: ' + port)
