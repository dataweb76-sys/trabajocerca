const http = require("http")
const fs = require("fs")
const path = require("path")

const port = 7000

http.createServer((req, res) => {

let url = req.url.split("?")[0]

let file = url === "/" ? "index.html" : url.substring(1)

let filePath = path.join(__dirname, file)

let ext = path.extname(filePath)

let contentType = "text/html"

if(ext === ".js") contentType = "text/javascript"
if(ext === ".css") contentType = "text/css"
if(ext === ".json") contentType = "application/json"

fs.readFile(filePath, (err, data) => {

if(err){
res.writeHead(404)
res.end("Not found")
return
}

res.writeHead(200, {"Content-Type": contentType})
res.end(data)

})

}).listen(port)

console.log("Servidor corriendo en http://localhost:7000")