/*
p5.multiplayer - CLIENT

This 'client' sketch is intended to be run in either mobile or 
desktop browsers. It sends a basic joystick and button input data 
to a node server via socket.io. This data is then rerouted to a 
'host' sketch, which displays all connected 'clients'.

Navigate to the project's 'public' directory.
Run http-server -c-1 to start server. This will default to port 8080.
Run http-server -c-1 -p80 to start server on open port 80.

*/

//const { text } = require("express");

////////////
// Network Settings
// const serverIp      = 'https://yourservername.herokuapp.com';
// const serverIp      = 'https://yourprojectname.glitch.me';
const serverIp      = '192.168.12.21';
const serverPort    = '3000';
const local         = true;   // true if running locally, false
                              // if running on remote server

// Global variables here. ---->

// Initialize GUI related variables
let gui         = null;
let button      = null;
let joystick    = null;
let joystickRes = 4;
let thisJ       = {x: 0, y: 0};
let prevJ       = {x: 0, y: 0};

//initialize hand-related vars
let video;
let handPose;
let hands=[];
let possibleGangSigns = []; // [{fingers:[], active:{right:false,left:false}}]
let leftScribe = '';
let rightScribe = '';
let castingTimer;

// Initialize Game related variables
let playerColor;
let playerColorDim;

// <----
let image_bg;
let scroll_img;
let spellList = [];

let hp = 100;
let shield = 0;

function preload() {
  handPose = ml5.handPose({flipped: true});
  image_bg = loadImage('img/wizardDesk.jpg');
  scroll_img = loadImage('img/Scroll-PNG-File.png');
  setupClient();
}

function mousePressed() {
  console.log(hands);
}

function gotHands(results){
  hands = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  

  // Client setup here. ---->
  
  //gui = createGui();

  setPlayerColors();

  video = createCapture(VIDEO);
  video.hide();
  handPose.detectStart(video, gotHands);
  background(image_bg,0);

  possibleGangSigns.push(
    {fingers:[0,1], active:{right:false,left:false}}, 
    {fingers:[0,2], active:{right:false,left:false}},
    {fingers:[0,3], active:{right:false,left:false}},
    {fingers:[0,4], active:{right:false,left:false}}
  );

  sendData('playerColor', { 
    r: red(playerColor)/255,
    g: green(playerColor)/255,
    b: blue(playerColor)/255
  });
  noStroke();
  colorMode(HSB,1);
} 

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


function spiral(posX,posY){

  const count = (leftScribe.length >= rightScribe.length ? leftScribe.length : rightScribe.length);
  //const radius =160;
  const radius = (20 * count) <= 160 ?  20 * count: 160;
  
  for(let i =0; i< count; i++){
    const f = i / count;
    const a = f;
    const dist = a * radius;
    const x =  0.5 + cos(a* TWO_PI) * dist;
    const y =  0.5 + sin(a* TWO_PI) * dist;
    const r = 20;

    //Calcul de la couleur
      //main gauche
    if(leftScribe.length > i){
      let hue = Number(leftScribe[i])/4;

      //const trans = 0.6 * sig + 0.25;
      let clr = color(hue, 1, 1, 0.75);
      fill(clr);

      circle(posX + x,posY + y,r);
    } else{
      let clr = color(0,0,0,0);
      fill(clr);

      circle(posX + x,posY + y,r);
    }

      //main droite
    if(rightScribe.length > i){
      let hue = Number(rightScribe[i])/4;

      //const trans = 0.6 * sig + 0.25;
      let clr = color(hue, 1, 1, 0.75);
      fill(clr);

      circle(posX + -x,posY + -y,r);
    } else{
      let clr = color(0,0,0,0);
      fill(clr);

      circle(posX + -x,posY + -y,r);
    }

    

  }
}


function cosn(v) {
  return cos(v * TWO_PI) * 0.5 + 0.5;
}

function invCosn(v) {
  return 1 - cosn(v);
}

function fract(x){
  return x - Math.floor(x);
}


const PHI = (1 + Math.sqrt(5)) / 2;
const dotSize = 60;

let t;
let startFrame = -1;
const frames = 200;
const animationLenght = 3000;

function spiralAnimation(posX, posY){
  //t = fract((frameCount - startFrame) / frames);
  t = fract((Date.now() - castingTimer) / animationLenght);

  const radAn = Math.sqrt(windowWidth**2 + windowHeight**2)/2;

  const count = 4000 * invCosn(t);
  for(let i =0; i< count; i++){
    //position des points
    const f = i / count;
    const a = i * PHI;
    const dist = f * radAn;
    const x =  posX + cos(a* TWO_PI) * dist;
    const y =  posY + sin(a* TWO_PI) * dist;

    //taille des points
    const sig = pow(cosn(f-t *6),2);
    const r = t * f * dotSize;

    //Calcul de la couleur
    const hue = fract(t + f * 0.5);
    const sat = 1;
    const light = 1;//0.6 * sig + 0.25;
    const clr = color(hue, sat, light);
    fill(clr);


    circle(x,y,r);

  }

}


function draw() {
  background(image_bg,0);

  if(isClientConnected(display=true)) {
    // Client draw here. ----> 
    scale(1,1);
    image(scroll_img,100,20,width/4, 15*height/16);
    spiral(windowWidth*3/4,windowHeight/2);

    drawList();
    drawCoolBars();
    
    translate(windowWidth/2 + video.width /4, windowHeight/2 - video.height /4);
    scale(-0.5,0.5);
    image(video,0,0);
    fill(1);
    spiral();
    

    //drawGui();
    positionHands();
  }
}

function positionHands() {
  if(hands.length > 0) {
    for (let hand of hands) {
      let thumb = hand.thumb_tip;
      let index = hand.index_finger_tip;
      let middle = hand.middle_finger_tip;
      let ring = hand.ring_finger_tip;
      let pinky = hand.pinky_finger_tip;
      let fingers = [thumb, index, middle, ring, pinky];
      let handness = hand.handedness;

      for(let i = 0; i < possibleGangSigns.length ; i++) {
        let signFinger = possibleGangSigns[i].fingers;

        let d = dist(fingers[signFinger[0]].x, fingers[signFinger[0]].y,fingers[signFinger[1]].x,fingers[signFinger[1]].y);

        if (d < 30 && !possibleGangSigns[i].active.right && handness == 'Right') {
          //todo: remplacer i par id
          rightScribe += i; 
          console.log('Right ' + rightScribe);
          possibleGangSigns[i].active.right = true;
        }
        else if(d>30 && handness == 'Right') {
          possibleGangSigns[i].active.right = false;
        }

        if (d < 30 && !possibleGangSigns[i].active.left && handness == 'Left') {
           //todo: remplacer i par id
           leftScribe += i;
           console.log('Left ' + leftScribe);
          possibleGangSigns[i].active.left = true;
        }else if(d>30 && handness == 'Left') {
          possibleGangSigns[i].active.left = false;
        }
      }

      //detecte si le geste de lancement est effectué
      let tumbx = fingers[0].x

      if(handness == 'Right' && 
        fingers[1].x < tumbx && 
        fingers[2].x < tumbx && 
        fingers[3].x < tumbx && 
        fingers[4].x < tumbx && 
        fingers[0].y > fingers[4].y) {   

          
          castSpell();
         
          scale(-2,2);
          spiralAnimation(-video.width /4,video.height /4);
          
          
      } else if(handness == 'Right'){
        castingTimer = null;
        startFrame = frameCount;
      }
    }
  }
}

function castSpell() {
  if(castingTimer == null) {
    console.log('|~~ ----- CASTING RESET TIMER ----- ~~|\n');
    castingTimer = Date.now();
  } 
  else if(Date.now() - castingTimer >= 3000 && (rightScribe != '' && leftScribe != '')) {
    let potentialSpell = {'Right' : rightScribe, 'Left': leftScribe};
    sendData('potentialSpell', potentialSpell);

    rightScribe = [];
    leftScribe = [];
    
    console.log('|~~ ----- CASTING SPELL ----- ~~|\n');
    castingTimer = null;
  }
  else if (Date.now() - castingTimer >= 3000){
    castingTimer = null;
  }
}

function keyPressed() {
  if (key === 'f') {
    let potentialSpell = {'Right' : '1302', 'Left': '0123'};
    sendData('potentialSpell', potentialSpell);
    console.log(potentialSpell);

    rightScribe = [];
    leftScribe = [];
  }
  else if (key === 'g') {
    let potentialSpell = {'Right' : '2301', 'Left': '1023'};
    sendData('potentialSpell', potentialSpell);
    console.log(potentialSpell);

    rightScribe = [];
    leftScribe = [];
  }
  else if (key === 'h') {
    let potentialSpell = {'Right' : '1320', 'Left': '2103'};
    sendData('potentialSpell', potentialSpell);
    console.log(potentialSpell);
    
    rightScribe = [];
    leftScribe = [];
  }
  else if (key === 'j') {
    let potentialSpell = {'Right' : '1230', 'Left': '0312'};
    sendData('potentialSpell', potentialSpell);
    console.log(potentialSpell);

    rightScribe = [];
    leftScribe = [];
  }
  else if (key == 'r') {
    console.log("Resetting hands");
    rightScribe = [];
    leftScribe = [];
  }
  else if (key == 'c') {
    castSpell()
  }
}

// Messages can be sent from a host to all connected clients
function onReceiveData (data) {
  // Input data processing here. --->

  if (data.type === 'timestamp') {
    print(data.timestamp);
  }
  if(data.type === 'spellList'){
    spellList = data.data;
    console.log(data.data);
  }
  if (data.type === 'updatePlayerStats'){
    hp = data.data['hp'];
    shield = data.data['shield'];
    console.log(data);
  }
  // <----

  /* Example:
     if (data.type === 'myDataType') {
       processMyData(data);
     }

     Use `data.type` to get the message type sent by host.
  */
}

////////////
// GUI setup
function setPlayerColors() {
  let hue = random(0, 360);
  colorMode(HSB);
  playerColor = color(hue, 100, 100);
  playerColorDim = color(hue, 100, 75);
  colorMode(RGB);
}

function setupUI() {
  // Temp variables for calculating GUI object positions
  let jX, jY, jW, jH, bX, bY, bW, bH;
  
  // Rudimentary calculation based on portrait or landscape 
  if (width < height) {
    jX = 0.05*width;
    jY = 0.05*height;
    jW = 0.9*width;
    jH = 0.9*width;
    
    bX = 0.05*windowWidth;
    bY = 0.75*windowHeight;
    bW = 0.9*windowWidth;
    bH = 0.2*windowHeight;
  }
  else {
    jX = 0.05*width;
    jY = 0.05*height;
    jW = 0.9*height;
    jH = 0.9*height;
    
    bX = 0.75*windowWidth;
    bY = 0.05*windowHeight;
    bW = 0.2*windowWidth;
    bH = 0.9*windowHeight;
  }
  
  // Create joystick and button, stylize with player colors
  joystick = createJoystick("Joystick", jX, jY, jW, jH);
  joystick.setStyle({
    handleRadius:     joystick.w*0.2, 
    fillBg:           color(0), 
    fillBgHover:      color(0), 
    fillBgActive:     color(0), 
    strokeBg:         playerColor, 
    strokeBgHover:    playerColor, 
    strokeBgActive:   playerColor, 
    fillHandle:       playerColorDim, 
    fillHandleHover:  playerColorDim, 
    fillHandleActive: playerColor,
    strokeHandleHover:  color(255),
    strokeHandleActive: color(255)
  });
  joystick.onChange = onJoystickChange;
  
  button = createButton("Interact", bX, bY, bW, bH);
  button.setStyle({
    textSize: 40,
    fillBg: playerColorDim,
    fillBgHover: playerColorDim,
    fillBgActive: playerColor
  });
  button.onPress = onButtonPress;
}

////////////
// Input processing
function onJoystickChange() {  
  thisJ.x = floor(joystick.val.x*joystickRes)/joystickRes;
  thisJ.y = floor(joystick.val.y*joystickRes)/joystickRes;
  
  if (thisJ.x != prevJ.x || thisJ.y != prevJ.y) {
    let data = {
      joystickX: thisJ.x,
      joystickY: thisJ.y
    }
    sendData('joystick', data);
  }
  
  prevJ.x = thisJ.x;
  prevJ.y = thisJ.y;
}

function onButtonPress() {
  let data = {
    button: button.val
  }
  
  sendData('button', data);
}

/// Add these lines below sketch to prevent scrolling on mobile
function touchMoved() {
  // do some stuff
  return false;
}
function drawVeryConciseSpellExplanationForTheClientYesThereIsIronyInThisName(spell,index){
  let clr = color(1,0,0,1);
  fill(clr);
  text(spell['name'] + ' Left: ' + spell['pos_gauche']+ ' Right: ' + spell['pos_droite'],150,200 + index * 20);
}
function drawList(){
  noStroke();
  textSize(15);
  spellList.forEach(drawVeryConciseSpellExplanationForTheClientYesThereIsIronyInThisName);
}

async function drawCoolBars(){
  let posX = windowWidth/3;
  let posY = windowHeight * 3 / 4;

  //rouge dessous
  let clr = color(1,1,1);
  fill(clr);
  rect(posX,posY, posX, 30,8);

  //barre de vie
  clr = color(0.33,1,1);
  fill(clr);
  rect(posX,posY, posX * hp/100, 30,8);

  //barre shield
  clr = color(0.1,1,1);
  fill(clr);
  rect(posX,posY - 20, posX * shield/100 , 10,8);

}