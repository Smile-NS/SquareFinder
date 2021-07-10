
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
       // array.sort((a, b) => b[1] - a[1]);  
        array.sort((a, b) => a[0] - b[0]);

        getStartSquare(array, image, 0, array.length - 1);
    });

    var finish = false;

    function getStartSquare(array, picture, firstIndex, lastIndex) {
      if (finish) return;
      if (firstIndex == lastIndex || lastIndex == 1) return;
      if (firstIndex == array.length - 1) return;

      let begin = array[firstIndex];
      let end = array[lastIndex];

      if (begin[0] >= end[0]) return;

      let dx = getDistance(begin[0], begin[1], end[0], end[1]);
      let square = getSquare(begin[0], begin[1], end[0], end[1], dx);
      let half = getSquare(begin[0], begin[1], end[0], end[1], dx / 2);
      let innerPixels = getInnerPixels(half[2][0], half[2][1], half[3][0], half[3][1], dx, array);

      if (isSquare(dx, innerPixels)) {
        finish = true;
        console.log("complete!");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(picture, 0, 0);  

        drawLine(begin[0], begin[1], end[0], end[1]);
        drawLine(begin[0], begin[1], square[2][0], square[2][1]);
        drawLine(end[0], end[1], square[3][0], square[3][1]);
        drawLine(square[2][0], square[2][1], square[3][0], square[3][1]);  
      } else {
        getStartSquare(array, picture, firstIndex, lastIndex - 1);
        getStartSquare(array, picture, firstIndex + 1, lastIndex);
      }
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
        let x = element[0];
        let y = element[1];
        
        if (isHit(x, y, x1, y1, x2, y2, width, sn, cs)) {
          ctx.fillStyle = "black";
          ctx.fillRect(x, y, 1, 1);  
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
      const array = new Array([x1, y1], [x2, y2]);

      let radian = (90 * ( Math.PI / 180 )) + Math.atan2(y2 - y1, x2 - x1);
      let x3 = x1 + distance * Math.cos(radian) ;
      let y3 = y1 + distance * Math.sin(radian) ;

      let x4 = x2 + distance * Math.cos(radian) ;
      let y4 = y2 + distance * Math.sin(radian) ;
      
      array.push([x3, y3]);
      array.push([x4, y4]);
      
      return array;
    }

    const tol = 1.8;
  
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
                  ctx.fillStyle = "red";
                  ctx.fillRect(j, i, 1, 1);  

                  array.push({x: j, y: i, selected: false});        
                }
            }
        }
        return array;
    }

    const distance = 10;

    function getNearPixelCount(index, array) {
      let x = array[index][0];
      let y = array[index][1];

      let count = 0;
      array.forEach(element => {
        if ((x - element[0] <= distance && x - element[0] >= -distance) && 
            (y - element[1] <= distance && y - element[1] >= -distance)) count++;
      });
      return count;
    }
};
  