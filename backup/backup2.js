
window.onload = () => {
    const video  = document.querySelector("#camera");
    const canvas = document.querySelector("#picture");
    const ctx = canvas.getContext("2d");
    
    /** カメラ設定 */
    const constraints = {
      audio: false,
      video: {
        width: 300,
        height: 200,
        facingMode: "user"   // フロントカメラを利用する
        // facingMode: { exact: "environment" }  // リアカメラを利用する場合
      }
    };
  
    /**
     * カメラを<video>と同期
     */
    navigator.mediaDevices.getUserMedia(constraints)
    .then( (stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = (e) => {
        video.play();
      };
    })
    .catch( (err) => {
      console.log(err.name + ": " + err.message);
    });

    /**
     * シャッターボタン
     */
     document.querySelector("#shutter").addEventListener("click", () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let array = getRedPixels();
        //array.sort((a, b) => a.y - b.y);  
        //array.sort((a, b) => a.x - b.x);
        setScore(array);
        setIgnore(array);

        getStartSquare(array, image, 0, array.length - 1);
    });

    function setScore(array) {
      array.sort((a, b) => a.x - b.x);
      let x_average = (array[0].x + array[array.length - 1].x) / 2;
      let x_range = array[array.length - 1].x - array[0].x;

      array.sort((a, b) => a.y - b.y);
      let y_average = (array[0].y + array[array.length - 1].y) / 2;
      let y_range = array[array.length - 1].y - array[0].y;
      
      array.forEach(element => {
        let x_score = x_average - element.x;
        let x_relativeScore = x_score >= 0 ? x_score / x_average :
          x_score / (x_range - x_average);

        let y_score = y_average - element.y;
        let y_relativeScore = y_score >= 0 ? y_score / y_average :
          y_score / (y_range - y_average);  

        element.score = Math.floor(
          (x_relativeScore + y_relativeScore) * 10000) / 100000;  
      });

      array.sort((a, b) => b.score - a.score);
    }

    var finish = false;

    function getStartSquare(array, picture, firstIndex, lastIndex) {
      if (finish) {
        console.log(0);
        return;
      }
      if (firstIndex == lastIndex || lastIndex == 1) {
        console.log(1);
        return;
      }
      if (firstIndex == array.length - 1) {
        console.log(2);
        return;
      }

      let begin = array[firstIndex];
      let end = array[lastIndex];

      if (begin.selected) {
        console.log(3);
        return;
      }

      if (begin.x >= end.x) {
        console.log(4);
        return;
      }

      let dx = getDistance(begin.x, begin.y, end.x, end.y);
      let square = getSquare(begin.x, begin.y, end.x, end.y, dx);
      let half = getSquare(begin.x, begin.y, end.x, end.y, dx / 2);

      let innerPixels = getInnerPixels(half[2].x, half[2].y, half[3].x, half[3].y, dx, array);

      if (isSquare(dx, innerPixels)) {
        finish = true;
        console.log("complete!");
        console.log(array.length);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(picture, 0, 0);  

        drawLine(begin.x, begin.y, end.x, end.y);
        drawLine(begin.x, begin.y, square[2].x, square[2].y);
        drawLine(end.x, end.y, square[3].x, square[3].y);
        drawLine(square[2].x, square[2].y, square[3].x, square[3].y);  
      } else {
        getStartSquare(array, picture, firstIndex, lastIndex - 1);
        getStartSquare(array, picture, firstIndex + 1, lastIndex);
      }
    }

    function compression(array) {
      
    }

    const distance = 10;

    function getNearPixelCount(pixel, array) {
      let x = pixel.x;
      let y = pixel.y;

      let count = 0;
      array.forEach(element => {
        if ((x - element.x <= distance && x - element.x >= -distance) && 
            (y - element.y <= distance && y - element.y >= -distance)) 
            count++;
      });
      return count;
    }

    function setIgnore(array) {
      array.forEach(element => {
        let count = getNearPixelCount(element, array);
        if (count >= 60) 
          element.selected = true;
      });
    }

    const minRatio = 0.8;

    function isSquare(width, array) {
      let area = width ** 2;
      let ratio = array.length / area;
      return ratio >= minRatio;
    }

    function getInnerPixels(x1, y1, x2, y2, width, array) {
      let result = new Array();
      let angle = Math.atan2(y2 - y1, x2 - x1);
      let sn = Math.sin(angle);
      let cs = Math.cos(angle);  

      array.forEach(element => {
        let x = element.x;
        let y = element.y;
        
        if (isHit(x, y, x1, y1, x2, y2, width, sn, cs)) {
       //   ctx.fillStyle = "black";
       //   ctx.fillRect(x, y, 1, 1);  
          result.push(element);
        }
      });

      return result;
    }

    function isHit(px, py, x1, y1, x2, y2, h, sn, cs) {
      let xm1 = x1 - px;
      let ym1 = y1 - py;
      let xm2 = x2 - px;
      let ym2 = y2 - py;
      let xr1 = xm1 * cs + ym1 * sn;
      let yr1 = -xm1 * sn + ym1 * cs;
      let xr2 = xm2 * cs + ym2 * sn;
      let sx = xr1;
      let sy = yr1 - h/2;
      let dx = xr2 - xr1;
      let dy = h;

      return !(sx > 0 || sy > 0 || sx + dx < 0 || sy + dy <= 0);
    }

    function getDistance(x1, y1, x2, y2) {
      return Math.sqrt( Math.pow( x2 - x1, 2 ) + Math.pow( y2 - y1, 2 ) ) ;
    }

    function drawLine(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    function getSquare(x1, y1, x2, y2, distance) {
      const array = new Array({x: x1, y: y1}, {x: x2, y: y2});

      let radian = (90 * ( Math.PI / 180 )) + Math.atan2(y2 - y1, x2 - x1);
      let x3 = x1 + distance * Math.cos(radian) ;
      let y3 = y1 + distance * Math.sin(radian) ;

      let x4 = x2 + distance * Math.cos(radian) ;
      let y4 = y2 + distance * Math.sin(radian) ;
      
      array.push({x: x3, y: y3});
      array.push({x: x4, y: y4});
      
      return array;
    }

    const tol = 1.9;
  
    function isRed(x, y) {
        const imgData = ctx.getImageData(x, y, 1, 1);

        let r = imgData.data[0];
        let g = imgData.data[1];
        let b = imgData.data[2];

        return (r > g && r > b) && (r / g) >= tol && (r / b) >= tol;
    }

    function getRedPixels() {
      const array = new Array();

        for (let i = 0;i < canvas.height;i++) {
            for (let j = 0;j < canvas.width;j++) {
                if (isRed(j, i)) {
                //  ctx.fillStyle = "red";
               //   ctx.fillRect(j, i, 1, 1);  

                  array.push(
                    {x: j, y: i, selected: false, score: 0}
                  );        
                }
            }
        }
        return array;
    }
};
  