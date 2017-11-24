var http = require("http").createServer(handler);
var io = require("socket.io").listen(http); // socket.io for permanent connection between server and client
var fs = require("fs"); // variable for file system
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){ // ACM Abstract Control Model for serial communication with Arduino (could be USB)
    console.log("Connecting to Arduino");
   
});

function handler(req, res){
    fs.readFile(__dirname + "/exampleGraph.html",
    function(err, data){
        if(err){
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Error loading html page.");
        }
        res.writeHead(200);
        res.end(data);
    });
}
/*
http.listen(8080); // server will listen on port 8080

io.sockets.on("connection", function(socket){
    socket.on("commandToArduino", function(commandNo){
      
        
        if(commandNo == "1"){
            board.digitalWrite(13, board.HIGH); // write high on pin 13
            board.digitalWrite(8, board.HIGH); // write high on pin 13
            
        }
        if(commandNo == "0"){
            board.digitalWrite(13, board.LOW); // write low on pin 13
             board.digitalWrite(8, board.LOW); // write low on pin 13
        }
    });
    
});*/