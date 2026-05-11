const stackArea = document.getElementById("stackArea");

let stackFrames = [];

let methods = [
"main()",
"calculateSum()",
"displayResult()",
"saveData()"
];

function renderStack(){

stackArea.innerHTML="";

stackFrames.forEach(frame => {

const div=document.createElement("div");

div.className="stack-frame";

div.innerText=frame;

stackArea.appendChild(div);

});

}

function pushFrame(){

if(stackFrames.length < methods.length){

stackFrames.push(methods[stackFrames.length]);

renderStack();

}

}

function popFrame(){

if(stackFrames.length>0){

stackFrames.pop();

renderStack();

}

}
const heapArea = document.getElementById("heapArea");

let heapObjects=[];

let objects=[
"Student Object",
"Car Object",
"Account Object",
"Order Object"
];

function renderHeap(){

heapArea.innerHTML="";

heapObjects.forEach(obj=>{

const div=document.createElement("div");

div.className="heap-object";

div.innerText=obj;

heapArea.appendChild(div);

});

}

function createObject(){

if(heapObjects.length < objects.length){

heapObjects.push(objects[heapObjects.length]);

renderHeap();

}

}

function deleteObject(){

if(heapObjects.length>0){

heapObjects.pop();

renderHeap();

}

}