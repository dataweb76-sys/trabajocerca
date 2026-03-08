const http = require('http')
const fs = require('fs')
const path = require('path')

const port = 7000

const server = http.createServer((req,res)=>{

let filePath = '.' + req.url

if(filePath == './'){
filePath = './index.html'
}

const ext = path.extname(filePath)

let contentType = 'text/html'

if(ext == '.js') contentType = 'text/javascript'
if(ext == '.css') contentType = 'text/css'

fs.readFile(filePath,(err,content)=>{

if(err){
res.writeHead(404)
res.end("Not found")
}else{
res.writeHead(200,{'Content-Type':contentType})
res.end(content)
}

})

})

server.listen(port,()=>{
console.log("Servidor en http://localhost:7000")
})