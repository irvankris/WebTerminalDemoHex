let portOpen = false; // tracks whether a port is corrently open
let portPromise; // promise used to wait until port succesfully closed
let holdPort = null; // use this to park a SerialPort object when we change settings so that we don't need to ask the user to select it again
let port; // current SerialPort object
let reader; // current port reader object so we can call .cancel() on it to interrupt port reading

// Do these things when the window is done loading
window.onload = function () {
  // Check to make sure we can actually do serial stuff
  if ("serial" in navigator) {
    // The Web Serial API is supported.
    // Connect event listeners to DOM elements
    document
      .getElementById("openclose_port")
      .addEventListener("click", openClose);
    document.getElementById("change").addEventListener("click", changeSettings);
    document.getElementById("clear").addEventListener("click", clearTerminal);
    document.getElementById("send").addEventListener("click", sendString);
	
	//document.getElementById("term_input").value = "0001aabbee";
	document.getElementById("term_input").value = "47656d62756b62756b";
	
	
    document
      .getElementById("term_input")
      .addEventListener("keydown", detectEnter);

    // Clear the term_window textarea
    clearTerminal();

    // See if there's a prefill query string on the URL
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    // Get the value of "some_key" in eg "https://example.com/?some_key=some_value"
    let preFill = params.prefill; // "some_value"
    if (preFill != null) {
      // If there's a prefill string then pop it into the term_input textarea
      document.getElementById("term_input").value = preFill;
    }
  } else {
    // The Web Serial API is not supported.
    // Warn the user that their browser won't do stupid serial tricks
    alert("The Web Serial API is not supported by your browser");
  }
};


191

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}


function a2hex(str) {
  var arr = [];
  for (var i = 0, l = str.length; i < l; i ++) {
    var hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return arr.join('');
}


function a2hexku(byteku) {
  const key = '0123456789abcdef'
  
  let newHex = ''
  let currentChar = 0
    currentChar = (byteku >> 4)      // First 4-bits for first hex char
    newHex += key[currentChar]         // Add first hex char to string
    currentChar = (byteku & 15)      // Erase first 4-bits, get last 4-bits for second hex char
    newHex += key[currentChar]         // Add second hex char to string
  
  return newHex
}


function fromHex(hex,str){
  try{
    str = decodeURIComponent(hex.replace(/(..)/g,'%$1'))
  }
  catch(e){
    str = hex
    console.log('invalid hex input: ' + hex)
  }
  return str
}


function toHex(str,hex){
  try{
    hex = unescape(encodeURIComponent(str))
    .split('').map(function(v){
      return v.charCodeAt(0).toString(16)
    }).join('')
  }
  catch(e){
    hex = str
    console.log('invalid text input: ' + str)
  }
  return hex
}

const byteToHex = (byte) => {
  const key = '0123456789abcdef'
  let bytes = new Uint8Array(byte)
  let newHex = ''
  let currentChar = 0
  for (let i=0; i<bytes.length; i++) { // Go over each 8-bit byte
    //console.log('h[' + i + '] = ' + bytes[i]); 
    currentChar = (bytes[i] >> 4)      // First 4-bits for first hex char
    newHex += key[currentChar]         // Add first hex char to string
    currentChar = (bytes[i] & 15)      // Erase first 4-bits, get last 4-bits for second hex char
    newHex += key[currentChar]         // Add second hex char to string
  }
  return newHex
}

const hexToByte = (hex) => {
  const key = '0123456789abcdef'
  let newBytes = []
  let currentChar = 0
  let currentByte = 0
  for (let i=0; i<hex.length; i++) {   // Go over two 4-bit hex chars to convert into one 8-bit byte
    currentChar = key.indexOf(hex[i])
    if (i%2===0) { // First hex char
      currentByte = (currentChar << 4) // Get 4-bits from first hex char
    }
    if (i%2===1) { // Second hex char
      currentByte += (currentChar)     // Concat 4-bits from second hex char
      newBytes.push(currentByte)       // Add byte
    }
  }
  return new Uint8Array(newBytes)
}



function byteToHex2(byte) {
  // convert the possibly signed byte (-128 to 127) to an unsigned byte (0 to 255).
  // if you know, that you only deal with unsigned bytes (Uint8Array), you can omit this line
  const unsignedByte = byte & 0xff;

  // If the number can be represented with only 4 bits (0-15), 
  // the hexadecimal representation of this number is only one char (0-9, a-f). 
  if (unsignedByte < 16) {
    return '0' + unsignedByte.toString(16);
  } else {
    return unsignedByte.toString(16);
  }
}

// bytes is an typed array (Int8Array or Uint8Array)
function toHexString(bytes) {
  // Since the .map() method is not available for typed arrays, 
  // we will convert the typed array to an array using Array.from().
  return Array.from(bytes)
    .map(byte => byteToHex2(byte))
    .join('');
}

function byteArrayToHexString(byteArray) {
    var hexString = '';
    var nextHexByte;
    for (var i=0; i<byteArray.byteLength; i++) {
        nextHexByte = byteArray[i].toString(16);    // Integer to base 16
        if (nextHexByte.length < 2) {
            nextHexByte = "0" + nextHexByte;        // Otherwise 10 becomes just a instead of 0a
        }//  w w w.java  2 s  . c  om
        hexString += nextHexByte;
    }
    return hexString;
}


function toUTF8Array(str) {
    var utf8 = [];
    for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
		console.log('z[' + i + '] = ' + charcode);
		console.log('k[' + i + '] = ' + a2hexku(charcode));
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 
                      0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18), 
                      0x80 | ((charcode>>12) & 0x3f), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}

function strtohexku(str) {
    //var utf8 = [];
	let newHex = ''
    console.log('length = ' + str.length);
    for (var i=0; i < str.length; i++) {
        //var charcode = str.charCodeAt(i);
		var charcode = 0; charcode = (str.charAt(i));
		//yield charcode;
        //utf8.push(charcode);
		console.log('z[' + i + '] = ' + (charcode));
		newHex += a2hexku(charcode);
	    console.log('k[' + i + '] = ' + a2hexku(charcode));
	}	
	
    //return utf8;
	  return newHex;
}

function strtohexnya(str) {
    //var utf8 = [];
var bytesku = [];
var charCode;
    console.log('length = ' + str.length);
for (var i = 0; i < str.length; ++i)
{
    charCode = str.charCodeAt(i);
    bytesku.push((charCode & 0xFF00) >> 8);
    bytesku.push(charCode & 0xFF);
}

	    console.log('bytes = ' + bytesku );
}

//UnicodeEncoding encoding = new UnicodeEncoding();
//byte[] bytes = encoding.GetBytes("Hello");



function toUint8Array(str) {
    var utf8 = [];
    for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        utf8.push(charcode);
		console.log('z[' + i + '] = ' + charcode);

	}	
    return utf8;
}


function delayku(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// This function is bound to the "Open" button, which also becomes the "Close" button
// and it detects which thing to do by checking the portOpen variable
async function openClose() {
  // Is there a port open already?
  if (portOpen) {
    // Port's open. Call reader.cancel() forces reader.read() to return done=true
    // so that the read loop will break and close the port
    reader.cancel();
    console.log("attempt to close");
  } else {
    // No port is open so we should open one.
    // We write a promise to the global portPromise var that resolves when the port is closed
    portPromise = new Promise((resolve) => {
      // Async anonymous function to open the port
      (async () => {
        // Check to see if we've stashed a SerialPort object
        if (holdPort == null) {
          // If we haven't stashed a SerialPort then ask the user to select one
          port = await navigator.serial.requestPort();
        } else {
          // If we have stashed a SerialPort then use it and clear the stash
          port = holdPort;
          holdPort = null;
        }
        // Grab the currently selected baud rate from the drop down menu
        var baudSelected = parseInt(document.getElementById("baud_rate").value);
        // Open the serial port with the selected baud rate
        await port.open({ baudRate: baudSelected });

        // Create a textDecoder stream and get its reader, pipe the port reader to it
        
		
		//const textDecoder = new TextDecoderStream();
        
		
        //reader = textDecoder.readable.getReader();
	
        //const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);

        const reader = port.readable.getReader();


        // If we've reached this point then we're connected to a serial port
        // Set a bunch of variables and enable the appropriate DOM elements
        portOpen = true;
        document.getElementById("openclose_port").innerText = "Close";
        document.getElementById("term_input").disabled = false;
        document.getElementById("send").disabled = false;
        document.getElementById("clear").disabled = false;
        document.getElementById("change").disabled = false;

        // NOT SUPPORTED BY ALL ENVIRONMENTS
        // Get port info and display it to the user in the port_info span
        let portInfo = port.getInfo();
        document.getElementById("port_info").innerText =
          "Connected to device with VID " +
          portInfo.usbVendorId +
          " and PID " +
          portInfo.usbProductId;

        // Serial read loop. We'll stay here until the serial connection is ended externally or reader.cancel() is called
        // It's OK to sit in a while(true) loop because this is an async function and it will not block while it's await-ing
        // When reader.cancel() is called by another function, reader will be forced to return done=true and break the loop
		
		
		
// Listen to data coming from the serial device.
        //const reader = port.readable.getReader();

		// Listen to data coming from the serial device.
		while (true) {
		  const { value, done } = await reader.read();
		  //console.log("Receiving !", value);
		  console.log("Receiving !");
		  if (done) {
			// Allow the serial port to be closed later.
			reader.releaseLock();
			break;
		  }
		  
		  
		  
		  
		  
		  // value is a Uint8Array.
		  let convertemp = byteToHex(value);
		  
		  
          //document.getElementById("term_window").value += byteArrayToHexString(value); // write the incoming string to the term_window textarea
          document.getElementById("term_window").value += convertemp; // write the incoming string to the term_window textarea
          //document.getElementById("term_window").value += byteToHex(toUint8Array(value)); // write the incoming string to the term_window textarea


          /* 
		  console.log("Object Value:");
          str = JSON.stringify(value);
          str = JSON.stringify(value, null, 4); // (Optional) beautiful indented output.
          console.log(str);
		  */
		  
          //console.log("Terminal Value:",toUTF8Array(value));		  
		  //console.log("TermHex  Value:",byteToHex(toUTF8Array(value)));
		  console.log("TermHex  Valuek10:",convertemp);
		  //console.log(byteToHex(value));
		  
		}
		

        // If we've reached this point then we're closing the port
        // first step to closing the port was releasing the lock on the reader
        // we did this before exiting the read loop.
        // That should have broken the textDecoder pipe and propagated an error up the chain
        // which we catch when this promise resolves
        await readableStreamClosed.catch(() => {
          /* Ignore the error */
        });
        // Now that all of the locks are released and the decoder is shut down, we can close the port
        await port.close();

        // Set a bunch of variables and disable the appropriate DOM elements
        portOpen = false;
        document.getElementById("openclose_port").innerText = "Open";
        document.getElementById("term_input").disabled = true;
        document.getElementById("send").disabled = true;
        document.getElementById("change").disabled = true;
        document.getElementById("port_info").innerText = "Disconnected";

        console.log("port closed");

        // Resolve the promise that we returned earlier. This helps other functions know the port status
        resolve();
      })();
    });
  }

  return;
}


async function openCloseku() {
  // Is there a port open already?
  if (portOpen) {
    // Port's open. Call reader.cancel() forces reader.read() to return done=true
    // so that the read loop will break and close the port
    reader.cancel();
    console.log("attempt to close");
  } else {
    // No port is open so we should open one.
    // We write a promise to the global portPromise var that resolves when the port is closed
    portPromise = new Promise((resolve) => {
      // Async anonymous function to open the port
      (async () => {
        // Check to see if we've stashed a SerialPort object
        if (holdPort == null) {
          // If we haven't stashed a SerialPort then ask the user to select one
          port = await navigator.serial.requestPort();
        } else {
          // If we have stashed a SerialPort then use it and clear the stash
          port = holdPort;
          holdPort = null;
        }
        // Grab the currently selected baud rate from the drop down menu
        var baudSelected = parseInt(document.getElementById("baud_rate").value);
        // Open the serial port with the selected baud rate
        await port.open({ baudRate: baudSelected });

        // Create a textDecoder stream and get its reader, pipe the port reader to it
        const textDecoder = new TextDecoderStream();
        //const textDecoder = new ReadableStream();
 		
		
        reader = textDecoder.readable.getReader();
		//reader = textDecoder.readable.getReader({ mode: "byob" });
		
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);

        // If we've reached this point then we're connected to a serial port
        // Set a bunch of variables and enable the appropriate DOM elements
        portOpen = true;
        document.getElementById("openclose_port").innerText = "Close";
        document.getElementById("term_input").disabled = false;
        document.getElementById("send").disabled = false;
        document.getElementById("clear").disabled = false;
        document.getElementById("change").disabled = false;

        // NOT SUPPORTED BY ALL ENVIRONMENTS
        // Get port info and display it to the user in the port_info span
        let portInfo = port.getInfo();
        document.getElementById("port_info").innerText =
          "Connected to device with VID " +
          portInfo.usbVendorId +
          " and PID " +
          portInfo.usbProductId;

        // Serial read loop. We'll stay here until the serial connection is ended externally or reader.cancel() is called
        // It's OK to sit in a while(true) loop because this is an async function and it will not block while it's await-ing
        // When reader.cancel() is called by another function, reader will be forced to return done=true and break the loop
		
        while (true) {
          //const { value, done } = await reader.read();
		  var valueku;
          const { value, done } = await reader.read();
		  valueku = value;
		   console.log("Receiving !", valueku);
          if (done) {
            reader.releaseLock(); // release the lock on the reader so the owner port can be closed
            break;
          }

		    /* 
			  function logArrayElements(element, index, array) {
			  console.log('z[' + index + '] = ' + element);
			   //writer.write(String.fromCharCode(element));

			  } 

			  //new Uint8Array(toUTF8Array(value)).forEach(logArrayElements);
			  new Uint8Array(toUint8Array(value)).forEach(logArrayElements);
            */


		  //let convertemp =byteToHex(toUTF8Array(value));
		  let convertemp =strtohexku(valueku);
		  strtohexnya(valueku) ;
		  
          //document.getElementById("term_window").value += byteArrayToHexString(value); // write the incoming string to the term_window textarea
          document.getElementById("term_window").value += convertemp; // write the incoming string to the term_window textarea
          //document.getElementById("term_window").value += byteToHex(toUint8Array(value)); // write the incoming string to the term_window textarea


          /* 
		  console.log("Object Value:");
          str = JSON.stringify(value);
          str = JSON.stringify(value, null, 4); // (Optional) beautiful indented output.
          console.log(str);
		  */
		  
          //console.log("Terminal Value:",toUTF8Array(value));		  
		  //console.log("TermHex  Value:",byteToHex(toUTF8Array(value)));
		  console.log("TermHex  Valuek10:",convertemp);
		  //console.log(byteToHex(value));

        }

        // If we've reached this point then we're closing the port
        // first step to closing the port was releasing the lock on the reader
        // we did this before exiting the read loop.
        // That should have broken the textDecoder pipe and propagated an error up the chain
        // which we catch when this promise resolves
        await readableStreamClosed.catch(() => {
          /* Ignore the error */
        });
        // Now that all of the locks are released and the decoder is shut down, we can close the port
        await port.close();

        // Set a bunch of variables and disable the appropriate DOM elements
        portOpen = false;
        document.getElementById("openclose_port").innerText = "Open";
        document.getElementById("term_input").disabled = true;
        document.getElementById("send").disabled = true;
        document.getElementById("change").disabled = true;
        document.getElementById("port_info").innerText = "Disconnected";

        console.log("port closed");

        // Resolve the promise that we returned earlier. This helps other functions know the port status
        resolve();
      })();
    });
  }

  return;
}

// Change settings that require a connection reset.
// Currently this only applies to the baud rate
async function changeSettings() {
  holdPort = port; // stash the current SerialPort object
  reader.cancel(); // force-close the current port
  console.log("changing setting...");
  console.log("waiting for port to close...");
  await portPromise; // wait for the port to be closed
  console.log("port closed, opening with new settings...");
  openClose(); // open the port again (it will grab the new settings while opening the port)
}

// Send a string over the serial port.
// This is easier than listening because we know when we're done sending
async function sendStringku2() {
  console.log("Input Value:");	
  console.log (byteToHex(hexToByte(document.getElementById("term_input").value)));	
  //let outString = document.getElementById("term_input").value; // get the string to send from the term_input textarea
  let outString = hexToByte(document.getElementById("term_input").value); // get the string to send from the term_input textarea
  

  
  document.getElementById("term_input").value = ""; // clear the term_input textarea for the next user input

  // Get a text encoder, pipe it to the SerialPort object, and get a writer
  const textEncoder = new TextEncoderStream();
  const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
  const writer = textEncoder.writable.getWriter();

  // add the outgoing string to the term_window textarea on its own new line denoted by a ">"
  //document.getElementById("term_window").value += "\n>" + outString + "\n";
  document.getElementById("term_window").value += "\n>" + byteToHex(outString) + "\n";


  // write the outString to the writer
  
  
  //tulis ke write nya satu2
  
  
  function logArrayElements(element, index, array) {
	 
   console.log('element  = ' + element);
   //writer.write(String.fromCharCode(element)); 
   writer.write(element);     
  } 
   
  new Uint8Array(outString).forEach(logArrayElements);
  
  
  /*
  let indexku = 0;
  let iku  = 0;
  while (indexku < outString.length) {
	iku = iku+1;
    if (iku<=100) {
     iku=0;
	 await delayku(50);
    }  
	//console.log('a[' + indexku + '] = ' + outString[indexku]);  
    writer.write(String.fromCharCode(outString[indexku]));  
    indexku++;
  } 
  */
  //await writer.write(outString);

  // close the writer since we're done sending for now
  writer.close();
  await writableStreamClosed;
  
  
  
  
  
}


async function sendString() {
  console.log("Input Value:");	
  console.log (byteToHex(hexToByte(document.getElementById("term_input").value)));	
  //let outString = document.getElementById("term_input").value; // get the string to send from the term_input textarea
  let outString = hexToByte(document.getElementById("term_input").value); // get the string to send from the term_input textarea
  

  
  document.getElementById("term_input").value = ""; // clear the term_input textarea for the next user input
  document.getElementById("term_window").value += "\n>" + byteToHex(outString) + "\n";

const writer = port.writable.getWriter();

//const data = new Uint8Array([104, 101, 108, 108, 111]); // hello
await writer.write(outString);
// Allow the serial port to be closed later.
writer.releaseLock();
  
  
  
  
}

// Clear the contents of the term_window textarea
function clearTerminal() {
  document.getElementById("term_window").value = "";
}

// This function in bound to "keydown" in the term_input textarea.
// It intercepts Enter keystrokes and calls the sendString function
function detectEnter(e) {
  var key = e.keyCode;

  // If the user has pressed enter
  if (key == 13) {
    e.preventDefault();
    sendString();
  }
  return;
}


