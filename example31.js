/*********************************************************************        
University of Maribor ************************************************
Faculty of Organizational Sciences ***********************************
Cybernetics & Decision Support Systems Laboratory ********************
Andrej Škraba ********************************************************
*********************************************************************/

var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0",function(){
    console.log("Priključitev na Arduino");
    console.log("Firmware: " + board.firmware.name + "-" + board.firmware.version.major + "." + board.firmware.version.minor); // izpišemo verzijo Firmware
    console.log("Omogočimo pine");
    board.pinMode(13, board.MODES.OUTPUT);   
     
     board.pinMode(0, board.MODES.ANALOG); // enable analog pin 0
    board.pinMode(1, board.MODES.ANALOG); // enable analog pin 1
    board.pinMode(2, board.MODES.OUTPUT); // direction of DC motor
    board.pinMode(3, board.MODES.PWM); // PWM of motor
    board.pinMode(4, board.MODES.OUTPUT); // direction of DC motor
});

var fs  = require("fs");

var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem')
};

var https = require("https").createServer(options, handler) // tu je pomemben argument "handler", ki je kasneje uporabljen -> "function handler (req, res); v tej vrstici kreiramo server! (http predstavlja napo aplikacijo - app)
  , io  = require("socket.io").listen(https, { log: false })
  , url = require("url");

send404 = function(res) {
    res.writeHead(404);
    res.write("404");
    res.end();
}

//process.setMaxListeners(0); 

//********************************************************************************************************
// Simple routing ****************************************************************************************
//********************************************************************************************************
function handler (req, res) { // handler za "response"; ta handler "handla" le datoteko index.html
    var path = url.parse(req.url).pathname; // parsamo pot iz url-ja
    
    switch(path) {
    
    case ('/') : // v primeru default strani

    fs.readFile(__dirname + "/example31.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani pwmbutton...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
     
    break;    
            
    default: send404(res);
            
    }
}
//********************************************************************************************************
//********************************************************************************************************

var desiredValue1 = 512; // desired value var
var actualValue = 0; // actual value var

var Kp = 0.55; // proportional factor of PID controller
var Ki = 0.008; // integral factor of PID controller
var Kd = 0.15; // differential factor of PID controller


var factor = 0.3; // proportional factor that deterimes speed of res.
var pwm = 0; // set pwm as global variable
var pwmLimit = 254; // to limit value of the pwm that is sent to the motor

var err = 0; // error
var errSum = 0; // sum of errors as integral
var dErr = 0; // difference of error
var lastErr = 0; // to keep the value of previous error to estimate derivative
var KpE = 0; // multiplication of Kp x error
var KiIedt = 0; // multiplication of Ki x integ. of error
var KdDe_dt = 0; // multiplication of Kd x differential of err.

var errSumAbs = 0; // sum of absolute errors as performance measure

var controlAlgorithmStartedFlag = 0; // variable for indicating weather the Alg has benn sta.
var intervalCtrl; // var for setInterval in global scope

//********************************************************************************************************

https.listen(8080); // določimo na katerih vratih bomo poslušali | vrata 80 sicer uporablja LAMP | lahko določimo na "router-ju" (http je glavna spremenljivka, t.j. aplikacija oz. app)

var sendValueViaSocket = function(){}; // var for sending messages
var sendStaticMsgViaSocket = function(){}; // for sending static messages.

console.log("Use (S) httpS! - System Start - Use (S) httpS!"); // na konzolo zapišemo sporočilo (v terminal)

var sendDataToClient = 1; // flag to send data to the client

var STARTctrlFW = 0; // flag for control algorithm start
board.on("ready", function(){
    
board.analogRead(0, function(value){
    desiredValue = value; // continuous read of analog pin 0
});

board.analogRead(1, function(value){
    actualValue = value; // continuous read of analog pin 1
});

io.sockets.on("connection", function(socket) {  // od oklepaja ( dalje imamo argument funkcije on -> ob 'connection' se prenese argument t.j. funkcija(socket) 
                                                // ko nekdo pokliče IP preko "browser-ja" ("browser" pošlje nekaj node.js-u) se vzpostavi povezava = "connection" oz.
                                                // je to povezava = "connection" oz. to smatramo kot "connection"
                                                // v tem primeru torej želi client nekaj poslati (ko nekdo z browserjem dostopi na naš ip in port)
                                                // ko imamo povezavo moramo torej izvesti funkcijo: function (socket)
                                                // pri tem so argument podatki "socket-a" t.j. argument = socket
                                                // ustvari se socket_id
    
    socket.on("left", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
       desiredValue1+=100;
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        console.log("вперед"); 
        console.log(desiredValue1);
        
    });
    
	socket.on("center", function(data) {
	    desiredValue1-=100;
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
      console.log("назад");
       console.log(desiredValue1);
      
    });
    
    socket.on("right", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
    });
    
     socket.emit("messageToClient", "Srv connected, board OK");
    socket.emit("staticMsgToClient", "Srv connected, board OK");
    

    setInterval(sendValues, 40, socket); // on 40ms trigerr func. sendValues
    
    socket.on("startControlAlgorithm", function(numberOfControlAlgorithm){
      console.log("Start");
         var Kp1 = 0.55; // proportional factor of PID controller
           var Ki1 = 0.008; // integral factor of PID controller
           var Kd1 = 0.15; // differential factor of PID controller
      numberOfControlAlgorithm={"ctrlAlgNo": 2, "Kp1": Kp1, "Ki1": Ki1, "Kd1": Kd1};
       startControlAlgorithm(numberOfControlAlgorithm); 
       console.log("Start");
       
       
    });
    
    socket.on("stopControlAlgorithm", function(){
        console.log("Stop");
       stopControlAlgorithm(); 
    });
    
    sendValueViaSocket = function (value) {
        io.sockets.emit("messageToClient", value);
    };
    
    sendStaticMsgViaSocket = function(value) {
        io.sockets.emit("staticMsgToClient", value);  
    };

});
}); // end of board.on ready

function controlAlgorithm (parameters) {
    if (parameters.ctrlAlgNo == 1) {
        pwm = parameters.pCoeff*(desiredValue1-actualValue);
        err = desiredValue1-actualValue;
        errSumAbs += Math.abs(err);
        if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
        if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
        if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // direction if > 0
        if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // direction if < 0
        board.analogWrite(3, Math.abs(pwm));
    }
    if (parameters.ctrlAlgNo == 2) {
        err = desiredValue1 - actualValue; // error as difference between desired and actual val.
        errSum += err; // sum of errors | like integral
        errSumAbs += Math.abs(err);
        dErr = err - lastErr; // difference of error
        // we will put parts of expression for pwm to
        // global workspace
        KpE = parameters.Kp1*err;
        KiIedt = parameters.Ki1*errSum;
        KdDe_dt = parameters.Kd1*dErr;
        pwm = KpE + KiIedt + KdDe_dt; // we use above parts
        lastErr = err; // save the value of error for next cycle to estimate the derivative
        if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
        if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
        if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // direction if > 0
        if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // direction if < 0
        board.analogWrite(3, Math.abs(pwm));        
    }
    if (parameters.ctrlAlgNo == 3) {
        err = desiredValue1 - actualValue; // error as difference between desired and actual val.
        errSum += err; // sum of errors | like integral
        errSumAbs += Math.abs(err);
        dErr = err - lastErr; // difference of error
        // we will put parts of expression for pwm to
        // global workspace
        KpE = parameters.Kp2*err;
        KiIedt = parameters.Ki2*errSum;
        KdDe_dt = parameters.Kd2*dErr;
        pwm = KpE + KiIedt + KdDe_dt; // we use above parts
        console.log(parameters.Kp2 + "|" + parameters.Ki2 + "|" + parameters.Kd2);
        lastErr = err; // save the value of error for next cycle to estimate the derivative
        if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
        if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
        if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // direction if > 0
        if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // direction if < 0
        board.analogWrite(3, Math.abs(pwm));        
    }
    

};

function startControlAlgorithm (parameters) {
    if (controlAlgorithmStartedFlag == 0) {
        controlAlgorithmStartedFlag = 1;
        intervalCtrl = setInterval(function(){controlAlgorithm(parameters);}, 30); // call the alg. on 30ms
        console.log("Control algorithm has been started.");
        //sendStaticMsgViaSocket("Control alg " + parameters.ctrlAlgNo + " started | " + json2txt(parameters));
    }

};

function stopControlAlgorithm () {
    clearInterval(intervalCtrl); // clear the interval of control algorihtm
    board.analogWrite(3, 0);
    err = 0; // error as difference between desired and actual val.
    errSum = 0; // sum of errors | like integral
    dErr = 0;
    lastErr = 0; // difference
    pwm = 0;
    
    
    
    controlAlgorithmStartedFlag = 0;
    console.log("Control algorithm has been stopped.");
    sendStaticMsgViaSocket("Stopped.")
};

function sendValues (socket) {
    socket.emit("clientReadValues",
    {
    "desiredValue1": desiredValue1,
    "actualValue": actualValue,
    "pwm": pwm,
    "err": err,
    "errSum": errSum,
    "dErr": dErr,
    "KpE": KpE,
    "KiIedt": KiIedt,
    "KdDe_dt": KdDe_dt,
    "errSumAbs": errSumAbs
    });
};

function json2txt(obj) // function to print out the json names and values
{
  var txt = '';
  var recurse = function(_obj) {
    if ('object' != typeof(_obj)) {
      txt += ' = ' + _obj + '\n';
    }
    else {
      for (var key in _obj) {
        if (_obj.hasOwnProperty(key)) {
          txt += '.' + key;
          recurse(_obj[key]);
        } 
      }
    }
  };
  recurse(obj);
  return txt;
}


