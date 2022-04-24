const squashResults = (proResults, youResults, ratio) => {

  let youResultsFiltered = filterResults(youResults);

  let squashedResults = [];

  if (ratio >= 1) {
    for (let i = 0; i < proResults.length; i++) { // number of frames
      squashedResults.push([]);
    }

    // more frames recorded from camera than video
    for (let i = 0; i < proResults.length; i++) { // frame number
      for (let j = 0; j < proResults[i].length; j++) { // landmark number
        squashedResults[i].push({
          x: (youResultsFiltered[Math.ceil(i*ratio)][j].x - youResultsFiltered[Math.floor(i*ratio)][j].x)/ratio + youResultsFiltered[Math.floor(i*ratio)][j].x,
          y: (youResultsFiltered[Math.ceil(i*ratio)][j].y - youResultsFiltered[Math.floor(i*ratio)][j].y)/ratio + youResultsFiltered[Math.floor(i*ratio)][j].y,
        })
      }  
    }
  }   

  return squashedResults;
}

const filterResults = (youResults) => {
  let youResultsFiltered = youResults.map(x => {
    let first = x.poseLandmarks.slice(11, 17);
    let second = x.poseLandmarks.slice(23, 29);

    let returns = [...first, ...second];

    return returns 
  });

  return youResultsFiltered;
}

const findGreatestDifference = (proResults, youResults, ratio) => {

  /*  Pose landmarks:
         0-10 face - X
      0: 11: left_shoudler 
      1: 12: right_shoulder 
      2: 13: left_elbow 
      3: 14: right_elbow
      4: 15: left_wrist
      5: 16: right_wrist
         17: left_pinky - X
         18: right_pinky - X
         19: left_index - X
         20: right_index - X
         21: left_thumb - X
         22: right_thumb - X
      6: 23: left_hip
      7: 24: right_hip
      8: 25: left_knee
      9: 26: right_knee
      10: 27: left_ankle
      11: 28: right_ankle
          29: left_heel - X
          30: right_heel - X
          31: left_foot_index - X
          32: right_foot_index - X
      */

  let youResultsFiltered = filterResults(youResults);

  let cumulativeErrors = [];
  let cumulativeFrameErrors = [];

  if (ratio >= 1) {
    for (let i = 0; i < proResults[0].length; i++) {
      cumulativeErrors.push([0]);
    }

    // more frames recorded from camera than video
    for (let i = 0; i < proResults.length; i++) { // frame number
      let tempFrameError = 0;
      for (let j = 0; j < proResults[i].length; j++) { // landmark number
        let errorX = Math.abs(parseFloat(proResults[i][j].x - _interpolate(youResultsFiltered, i, j, ratio, 'x')));
        let errorY = Math.abs(parseFloat(proResults[i][j].y - _interpolate(youResultsFiltered, i, j, ratio, 'y')));
        cumulativeErrors[j] = Math.abs(parseFloat(cumulativeErrors[j])) + errorX;
        cumulativeErrors[j] = Math.abs(parseFloat(cumulativeErrors[j])) + errorY;
        tempFrameError += errorX + errorY;
      }  
      cumulativeFrameErrors.push(tempFrameError);
    }
  } else {
    for (let i = 0; i < youResultsFiltered[0].length; i++) {
      cumulativeErrors.push([0]);
    }

    // more frames recorded from camera than video
    for (let i = 0; i < youResultsFiltered.length; i++) { // frame number
      let tempFrameError = 0;
      for (let j = 0; j < youResultsFiltered[i].length; j++) { // landmark number
        let errorX = Math.abs(parseFloat(youResultsFiltered[i][j].x - _interpolate(proResults, i, j, ratio, 'x')));
        let errorY = Math.abs(parseFloat(youResultsFiltered[i][j].y - _interpolate(proResults, i, j, ratio, 'y')));
        cumulativeErrors[j] = Math.abs(parseFloat(cumulativeErrors[j])) + errorX;
        cumulativeErrors[j] = Math.abs(parseFloat(cumulativeErrors[j])) + errorY;
        tempFrameError += errorX + errorY;
      }  
      cumulativeFrameErrors.push(tempFrameError);
    }
  }
  //console.log(cumulativeErrors);

  let maxError = cumulativeErrors[0];
  let maxErrorIdx = 0;

  for (let i = 1; i < cumulativeErrors.length; i++) {
    if (cumulativeErrors[i] > maxError) {
      maxError = cumulativeErrors[i];
      maxErrorIdx = i;
    }
    //console.log(`${i}: ${cumulativeErrors[i]}`);
  }
  /*
  const LANDMARK_NAMES = [
    'Left Shoulder',
    'Right Shoulder',
    'Left Elbow',
    'Right Elbow',
    'Left Wrist',
    'Right Wrist',
    'Left Hip',
    'Right Hip',
    'Left Knee',
    'Right Knee',
    'Left Ankle',
    'Right Ankle',
  ]

  let errorsWithNames = cumulativeErrors.map((x, i) => {
    return [x, LANDMARK_NAMES[i]]
  });

  let errorsSorted = errorsWithNames.sort((a,b) => {
    // sort in descending order
    return a[0] < b[0] ? 1 : -1
  });
  

  //console.log("errorsSorted: ", errorsSorted);

  */

  let peakErrorFrames = _findPeaks(cumulativeFrameErrors).sort((a, b) => {
    return a[0] < b[0] ? 1 : -1
  }).slice(0,3).map(x => x[1]);

  let normalizedErrors = _normalizeArray(cumulativeFrameErrors);


  return [maxErrorIdx, peakErrorFrames, normalizedErrors]; // landmark with greatest difference
}

const debounce = (func, timeout = 300) => {
  let timer;
  return (...args) => {
    if (!timer) {
      func.apply(this, args);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, timeout);
  };
}

const _interpolate = (arr, row, col, ratio, key) => {
  if (key === 'x') {
    return (arr[Math.ceil(row*ratio)][col].x - arr[Math.floor(row*ratio)][col].x)/ratio + arr[Math.floor(row*ratio)][col].x;
  } else if (key === 'y') {
    return (arr[Math.ceil(row*ratio)][col].y - arr[Math.floor(row*ratio)][col].y)/ratio + arr[Math.floor(row*ratio)][col].y;
  } else {
    console.warn("Error: invalid key specified in _interpolate");
    return 0
  }
  
}

const _findPeaks = (arr) => {
  var peak;
  return arr.reduce(function(peaks, val, i) {
    if (arr[i+1] > arr[i]) {
      peak = arr[i+1];
    } else if ((arr[i+1] < arr[i]) && (typeof peak === 'number')) {
      peaks.push([peak, i]);
      peak = undefined;
    }
    return peaks;
  }, []);
}
// source: https://stackoverflow.com/questions/25045638/finding-the-local-maxima-in-a-1d-array

const _normalizeArray = (arr) => {
  let normalizeRatio = Math.max.apply(Math, arr) / 100;

  let arrNormalized = arr.map(function (v) {
      return (v / normalizeRatio);
  });

  return arrNormalized;
}

// source: https://stackoverflow.com/questions/13368046/how-to-normalize-a-list-of-positive-numbers-in-javascript

/*

poseDataEagle.map(x => x.map(x => { let y = Object.assign({x: 1-y.x}, x); return y}))

*/

module.exports = {
  squashResults,
  filterResults,
  findGreatestDifference,
  debounce,
}