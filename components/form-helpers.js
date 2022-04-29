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
  let numberOfTotalLandmarks = 0;
  const ACCEPTANCE_ERROR = 0.1; // 10%
  let numberOfErrorLandmarks = 0;

  let resultsA = [];
  let resultsB = [];

  if (ratio >= 1) { // more frames recorded from webcam than in pro video
    resultsA = [...proResults]; // number of frames in results A < number of frames in results B
    resultsB = [...youResultsFiltered];
  } else { // more frames in pro video than recorded from webcam
    resultsA = [...youResultsFiltered];
    resultsB = [...proResults];
  }

  for (let i = 0; i < resultsA[0].length; i++) {
    cumulativeErrors.push([0]);
  }
  numberOfTotalLandmarks = resultsA.length * resultsA[0].length;

  // more frames recorded from camera than video
  for (let i = 0; i < resultsA.length; i++) { // frame number
    let tempFrameError = 0;
    for (let j = 0; j < resultsA[i].length; j++) { // landmark number
      let errorX = Math.abs(parseFloat(resultsA[i][j].x - _interpolate(resultsB, i, j, ratio, 'x')));
      let errorY = Math.abs(parseFloat(resultsA[i][j].y - _interpolate(resultsB, i, j, ratio, 'y')));
      cumulativeErrors[j] = Math.abs(parseFloat(cumulativeErrors[j])) + errorX;
      cumulativeErrors[j] = Math.abs(parseFloat(cumulativeErrors[j])) + errorY;
      tempFrameError += errorX + errorY;
      if (errorX + errorY > ACCEPTANCE_ERROR) {
        numberOfErrorLandmarks++;
      }
    }  
    cumulativeFrameErrors.push(tempFrameError);
  }

  let accuracyScore = 1.0 - numberOfErrorLandmarks/numberOfTotalLandmarks;

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

  return [maxErrorIdx, peakErrorFrames, normalizedErrors, accuracyScore]; // landmark with greatest difference
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


/*! canvas-to-bmp version 1.0 ALPHA
    (c) 2015 Ken "Epistemex" Fyrstenberg
    MIT License (this header required)
*/

var CanvasToBMP = {

  /**
   * Convert a canvas element to ArrayBuffer containing a BMP file
   * with support for 32-bit (alpha).
   *
   * Note that CORS requirement must be fulfilled.
   *
   * @param {HTMLCanvasElement} canvas - the canvas element to convert
   * @return {ArrayBuffer}
   */
  toArrayBuffer: function(canvas) {

    var w = canvas.width,
        h = canvas.height,
        w4 = w * 4,
        idata = canvas.getContext("2d").getImageData(0, 0, w, h),
        data32 = new Uint32Array(idata.data.buffer), // 32-bit representation of canvas

        stride = Math.floor((32 * w + 31) / 32) * 4, // row length incl. padding
        pixelArraySize = stride * h,                 // total bitmap size
        fileLength = 122 + pixelArraySize,           // header size is known + bitmap

        file = new ArrayBuffer(fileLength),          // raw byte buffer (returned)
        view = new DataView(file),                   // handle endian, reg. width etc.
        pos = 0, x, y = 0, p, s = 0, a, v;

    // write file header
    setU16(0x4d42);          // BM
    setU32(fileLength);      // total length
    pos += 4;                // skip unused fields
    setU32(0x7a);            // offset to pixels

    // DIB header
    setU32(108);             // header size
    setU32(w);
    setU32(-h >>> 0);        // negative = top-to-bottom
    setU16(1);               // 1 plane
    setU16(32);              // 32-bits (RGBA)
    setU32(3);               // no compression (BI_BITFIELDS, 3)
    setU32(pixelArraySize);  // bitmap size incl. padding (stride x height)
    setU32(2835);            // pixels/meter h (~72 DPI x 39.3701 inch/m)
    setU32(2835);            // pixels/meter v
    pos += 8;                // skip color/important colors
    setU32(0xff0000);        // red channel mask
    setU32(0xff00);          // green channel mask
    setU32(0xff);            // blue channel mask
    setU32(0xff000000);      // alpha channel mask
    setU32(0x57696e20);      // " win" color space

    // bitmap data, change order of ABGR to BGRA
    while (y < h) {
      p = 0x7a + y * stride; // offset + stride x height
      x = 0;
      while (x < w4) {
        v = data32[s++];                     // get ABGR
        a = v >>> 24;                        // alpha channel
        view.setUint32(p + x, (v << 8) | a); // set BGRA
        x += 4;
      }
      y++
    }

    return file;

    // helper method to move current buffer position
    function setU16(data) {view.setUint16(pos, data, true); pos += 2}
    function setU32(data) {view.setUint32(pos, data, true); pos += 4}
  },

  /**
   * Converts a canvas to BMP file, returns a Blob representing the
   * file. This can be used with URL.createObjectURL().
   * Note that CORS requirement must be fulfilled.
   *
   * @param {HTMLCanvasElement} canvas - the canvas element to convert
   * @return {Blob}
   */
  toBlob: function(canvas) {
    return new Blob([this.toArrayBuffer(canvas)], {
      type: "image/bmp"
    });
  },

  /**
   * Converts the canvas to a data-URI representing a BMP file.
   * Note that CORS requirement must be fulfilled.
   *
   * @param canvas
   * @return {string}
   */
  toDataURL: function(canvas) {
    var buffer = new Uint8Array(this.toArrayBuffer(canvas)),
        bs = "", i = 0, l = buffer.length;
    while (i < l) bs += String.fromCharCode(buffer[i++]);
    return "data:image/bmp;base64," + btoa(bs);
  }
};

module.exports = {
  squashResults,
  filterResults,
  findGreatestDifference,
  debounce,
  CanvasToBMP,
}