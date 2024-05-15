const webcamElement = document.getElementById('webcam');
const webcam = new Webcam(webcamElement, 'user');
const modelPath = 'models';
let currentStream;
let displaySize;
let canvas; // Corrected variable name
let faceDetection;

const playlists = {
  happy: `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/1HwWXcmPcmXnAilt1JXVB9?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  sad: `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/7aJREJ2W3my7ddRZHNWd3g?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`,
  neutral: `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/7aJREJ2W3my7ddRZHNWd3g?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
}

$("#webcam-switch").change(function () {
  if(this.checked){
      webcam.start()
          .then(result =>{
             cameraStarted();
             webcamElement.style.transform = "";
             console.log("webcam started");
          })
          .catch(err => {
              displayError();
          });
  }
  else {        
      cameraStopped();
      webcam.stop();
      console.log("webcam stopped");
  }        
});

$('#cameraFlip').click(function() {
    webcam.flip();
    webcam.start()
    .then(result =>{ 
      webcamElement.style.transform = "";
    });
});

$("#webcam").bind("loadedmetadata", function () {
  displaySize = { width:this.scrollWidth, height: this.scrollHeight }
});

$("#detection-switch").change(function () {
  if(this.checked){
    toggleControl("box-switch", true);
    toggleControl("landmarks-switch", true);
    toggleControl("expression-switch", true);
    toggleControl("age-gender-switch", true);
    $("#box-switch").prop('checked', true);
    $(".loading").removeClass('d-none');
    Promise.all([
      faceapi.nets.tinyFaceDetector.load(modelPath),
      faceapi.nets.faceLandmark68TinyNet.load(modelPath),
      faceapi.nets.faceExpressionNet.load(modelPath),
      faceapi.nets.ageGenderNet.load(modelPath)
    ]).then(function(){
      createCanvas();
      // startDetection();
    })
  }
  else {
    clearInterval(faceDetection);
    toggleControl("box-switch", false);
    toggleControl("landmarks-switch", false);
    toggleControl("expression-switch", false);
    toggleControl("age-gender-switch", false);
    if(typeof canvas !== "undefined"){
      setTimeout(function() {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      }, 1000);
    }
  }        
});

function createCanvas(){
  if( document.getElementsByTagName("canvas").length == 0 )
  {
    canvas = faceapi.createCanvasFromMedia(webcamElement)
    document.getElementById('webcam-container').append(canvas)
    faceapi.matchDimensions(canvas, displaySize)
  }
}

function toggleControl(id, show){
  if(show){
    $("#"+id).prop('disabled', false);
    $("#"+id).parent().removeClass('disabled');
  }else{
    $("#"+id).prop('checked', false).change();
    $("#"+id).prop('disabled', true);
    $("#"+id).parent().addClass('disabled');
  }
}

function getDominantExpression(expressions) {
  let dominantExpression = null;
  let maxProbability = -Infinity;

  // Iterate through all keys in the expressions object
  for (let key in expressions) {
      if (expressions.hasOwnProperty(key)) {
          // Check if the current probability is greater than the maxProbability
          if (expressions[key] > maxProbability) {
              // Update the maxProbability and dominantExpression
              maxProbability = expressions[key];
              dominantExpression = key;
          }
      }
  }

  // Return the key with the highest probability
  return dominantExpression;
}

function startDetection(){
  faceDetection = setInterval(async () => {
    const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceExpressions().withAgeAndGender()
    const dominantExpression = getDominantExpression(detections[0].expressions);
    console.log("Dominant Expression:", dominantExpression); 
    $("#emotion").html(`Detected Expression: ${dominantExpression}`) // Corrected syntax
    $("#playlist").html(`<div>${playlists[dominantExpression]}</div>`) // Corrected syntax
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    if($("#box-switch").is(":checked")){
      faceapi.draw.drawDetections(canvas, resizedDetections)
    }
    if($("#landmarks-switch").is(":checked")){
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    }
    if($("#expression-switch").is(":checked")){
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    }
    if($("#age-gender-switch").is(":checked")){
      resizedDetections.forEach(result => {
        const { age, gender, genderProbability } = result
        new faceapi.draw.DrawTextField(
          [
            `${faceapi.round(age, 0)} years`,
            `${gender} (${faceapi.round(genderProbability)})`
          ],
          result.detection.box.bottomRight
        ).draw(canvas)
      })
    }


    
    if(!$(".loading").hasClass('d-none')){
      $(".loading").addClass('d-none')
    }
  }, 5000)
}


$("#recommendation-btn").click(function() {
  // Call the startDetection function
  startDetection();
  console.log("button pressed")
});

function cameraStarted(){
  toggleControl("detection-switch", true);
  $("#errorMsg").addClass("d-none");
  if( webcam.webcamList.length > 1){
    $("#cameraFlip").removeClass('d-none');
  }
}

function cameraStopped(){
  toggleControl("detection-switch", false);
  $("#errorMsg").addClass("d-none");
  $("#cameraFlip").addClass('d-none');
}

function displayError(err = '') {}
 
