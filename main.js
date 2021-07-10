
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
        facingMode: "user"
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
        setScore(array);
     //  array.sort((a, b) => a.x - b.x);
     // array.sort((a, b) => a.y - b.y);

        getStartSquare(array, image, 0, array.length - 1);
    });

    /**
     * 処理速度の高速化のために各赤いピクセルに対して得点を設定
     * 赤いピクセルがX座標・Y座標が中央から離れているほど配列の両端に整列される
     * （多分改良する）
     * @param {Array} array 整列する赤いピクセルの配列
     */
    function setScore(array) {
      array.sort((a, b) => a.x - b.x); // X座標でソート
      let x_median = (array[0].x + array[array.length - 1].x) / 2; // X座標の中央値
      let x_range = array[array.length - 1].x - array[0].x; // X座標の範囲

      array.sort((a, b) => a.y - b.y); // Y座標でソート
      let y_median = (array[0].y + array[array.length - 1].y) / 2; // Y座標の中央値
      let y_range = array[array.length - 1].y - array[0].y; // Y座標の範囲
      
      array.forEach(element => {
        let x_diff = x_median - element.x; // 中央値からの差分
        let x_relativeScore = x_diff >= 0 ? x_diff / x_median :
          x_diff / (x_range - x_median); // 中央値からの相対的な距離(中央から何％離れているかみたいな。X座標が中央から離れるほど絶対値が大きくなる)

        let y_diff = y_median - element.y; // 中央値からの差分
        let y_relativeScore = y_diff >= 0 ? y_diff / y_median :
          y_diff / (y_range - y_median); // 中央値からの相対的な距離


        let sum = 
        x_relativeScore < 0 ? x_relativeScore - y_relativeScore :
        x_relativeScore + y_relativeScore;

        element.score = Math.floor(
          (sum) * 10000) / 100000;  

        element.x_diff = x_relativeScore;
        element.y_diff = y_relativeScore;
      });

      array.sort((a, b) => b.score - a.score);
     // array.forEach(element => console.log(element.x_diff + ", " + element.y_diff + ", " + element.score));
    }

    var finish = false;

    /**
     * 赤い正方形を見つける
     * @param {Array} array 赤いピクセルの配列
     * @param {image} picture 画像
     * @param {number} firstIndex スコア配列の始めのインデックス
     * @param {number} lastIndex スコア配列の後ろのインデックス
     */
    function getStartSquare(array, picture, firstIndex, lastIndex) {
      if (finish || firstIndex == lastIndex || lastIndex == 0) return; // スコア配列を両端から探索していって、ぶつかったら処理終了
      if (firstIndex == array.length - 1) return;

      let begin = array[firstIndex]; // 上辺の始点
      let end = array[lastIndex]; // 上辺の終点

      if (begin.selected) {
        console.log(3);
        return;
      }

      let dx = getDistance(begin.x, begin.y, end.x, end.y); // 上辺の始点から上辺の終点までの距離
      let square = getSquare(begin.x, begin.y, end.x, end.y, dx); // 上辺と始点と上辺の終点と、残りの二点を推測した点を持つ配列
      let half = getSquare(begin.x, begin.y, end.x, end.y, dx / 2); // square を半分にした長方形の四点を持つ配列

      if (isSquare(half[2].x, half[2].y, half[3].x, half[3].y, dx, array)) {
        finish = true;
        console.log("complete!");

      //  ctx.clearRect(0, 0, canvas.width, canvas.height);
      //  ctx.putImageData(picture, 0, 0);  

        // 枠線描画
        array.forEach(element => {

          for (let i = element.x;i < element.x + element.power;i++) {
            ctx.fillStyle = "red";
            ctx.fillRect(i, element.y, 1, 1);    
          }
          ctx.fillStyle = "black";
          ctx.fillRect(element.x, element.y, 1, 1);    

        });

        drawLine(begin.x, begin.y, end.x, end.y);
        drawLine(begin.x, begin.y, square[2].x, square[2].y);
        drawLine(end.x, end.y, square[3].x, square[3].y);
        drawLine(square[2].x, square[2].y, square[3].x, square[3].y); 
        console.log(dx);   
      } else {
        // 正方形でなかったら再探索
        getStartSquare(array, picture, firstIndex, lastIndex - 1);
        getStartSquare(array, picture, firstIndex + 1, lastIndex);
      }
    }

    const minRatio = 0.8; // 正方形であると判断する最低割合

    /**
     * 正方形であるか判断する
     * @param {number} x1 中央の線の始点X
     * @param {number} y1 中央の線の始点Y
     * @param {number} x2 中央の線の終点X
     * @param {number} y2 中央の線の終点Y
     * @param {number} width 中央の線から赤いピクセルを探索する幅
     * @param {Array} array 赤いピクセルたち
     * @return {boolean} 正方形であればtrue
     */ 
    function isSquare(x1, y1, x2, y2, width, array) {
      let angle = Math.atan2(y2 - y1, x2 - x1); // 中央の線の傾き
      let sn = Math.sin(angle); // 
      let cs = Math.cos(angle);  

      let count = 0; // 矩形領域内に含まれる赤いピクセルの数
      array.forEach(element => {
        let x = element.x;
        let y = element.y;
        
        for (let i = x;i < x + element.power;i++) {
          if (isHit(i, y, x1, y1, x2, y2, width, sn, cs)) count++;
        }
      });

      // 赤いピクセルが領域内を占める割合
      let area = width ** 2;
      let ratio = count / area;
      return (ratio >= minRatio);
      //if (!(ratio >= minRatio)) return false;

      /*
      outsideCount = 0;
      array.forEach(element => {
        let x = element.x;
        let y = element.y;
        
        for (let i = x;i < x + element.power;i++) {
          if (isHit(i, y, x1 - (width * 0.2), y1, x2 + (width * 0.2), y2, width * 1.2, sn, cs)) {
         //   ctx.fillStyle = "black";
         //   ctx.fillRect(i, y, 1, 1);    
            outsideCount++;  
          }
        }
      });

      let outsideArea = ((width * 1.2) ** 2) - area;
      let outsideRatio = (outsideCount - count) / outsideArea;
      console.log(x1);
      console.log(x1 - (width * 0.2));
      console.log(x2);
      console.log(x2 + (width * 0.2));

      drawLine(x1 - (width * 0.2), y1, x2 + (width * 0.2), y2);

      return !(outsideRatio >= 0.4);
      */
    }

    /**
     * 回転した矩形領域内に特定の点が含まれるかを判断
     * @param {number} px 点のX座標
     * @param {number} py 点のY座標
     * @param {number} x1 直線の始点X
     * @param {number} y1 直線の始点Y
     * @param {number} x2 直線の終点X
     * @param {number} y2 直線の終点Y
     * @param {number} h 直線から判定する幅
     * @param {number} sn 直線の傾きに対するsin
     * @param {number} cs 直線の傾きに対するcos
     * @return {boolean} 正方形れあればtrue
     */
    function isHit(px, py, x1, y1, x2, y2, h, sn, cs) {
      // 直線を原点に平行移動する
      let xm1 = x1 - px;
      let ym1 = y1 - py;
      let xm2 = x2 - px;
      let ym2 = y2 - py;
      // 直線の傾きを0°にする
      let xr1 = xm1 * cs + ym1 * sn;
      let yr1 = -xm1 * sn + ym1 * cs;
      let xr2 = xm2 * cs + ym2 * sn;
      // 直線から領域内判定のための幅を持たせる
      let sx = xr1;
      let sy = yr1 - h/2;
      let dx = xr2 - xr1;
      let dy = h;

      return !(sx > 0 || sy > 0 || sx + dx < 0 || sy + dy <= 0);
    }

    /**
     * 二点間の距離を求める
     * @param {number} x1 始点X 
     * @param {number} y1 始点Y
     * @param {number} x2 終点X
     * @param {number} y2 終点Y
     * @return {number} 二点間の距離
     */
    function getDistance(x1, y1, x2, y2) {
      return Math.sqrt( Math.pow( x2 - x1, 2 ) + Math.pow( y2 - y1, 2 ) ) ;
    }

    /**
     * 直線描画
     * @param {number} x1 始点X
     * @param {number} y1 始点Y
     * @param {number} x2 終点X
     * @param {number} y2 終点Y
     */
    function drawLine(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    /**
     * 上辺の二点から残りの二点を推測した正方形の頂点を持つ配列を取得する
     * @param {number} x1 上辺の始点X
     * @param {number} y1 上辺の始点Y
     * @param {number} x2 上辺の終点X
     * @param {number} y2 上辺の終点Y
     * @param {number} distance 上辺の始点から終点までの距離
     * @return {Array} 正方形の頂点を持つ配列
     */
    function getSquare(x1, y1, x2, y2, distance) {
      const array = new Array({x: x1, y: y1}, {x: x2, y: y2});

      let radian = (90 * (Math.PI / 180)) + Math.atan2(y2 - y1, x2 - x1);
      // 下辺の始点
      let x3 = x1 + distance * Math.cos(radian) ;
      let y3 = y1 + distance * Math.sin(radian) ;

      // 下辺の終点
      let x4 = x2 + distance * Math.cos(radian) ;
      let y4 = y2 + distance * Math.sin(radian) ;
      
      array.push({x: x3, y: y3});
      array.push({x: x4, y: y4});
      
      return array;
    }

    const tol = 2.3; // rのg・bに対する倍率
  
    /**
     * ピクセルが赤色であるか判定する
     * @param {number} x ピクセルのX座標
     * @param {number} y ピクセルのY座標
     * @return {number} rgbでrがg・bのtol倍以上だったらtrue
     */
    function isRed(x, y) {
        const imgData = ctx.getImageData(x, y, 1, 1);

        let r = imgData.data[0];
        let g = imgData.data[1];
        let b = imgData.data[2];

        return (r > g && r > b) && (r / g) >= tol && (r / b) >= tol;
    }

    /**
     * 撮った写真内の赤いピクセルを取得
     * 配列の軽量化のため、赤いピクセルが連続している場合はその数をpowerとして持たせる
     * @return {Array} 赤いピクセルの配列
     */
    function getRedPixels() {
      const array = new Array();

      let last = false;
      for (let i = 0;i < canvas.height;i++) {
          for (let j = 0;j < canvas.width;j++) {
              if (!isRed(j, i)) {
                last = false;
                continue;
              }

              if (!last) {
                array.push(
                  {x: j, y: i, score: 0, power: 0}
                );          
              }

              if (!isRed(j + 1, i)) {
                array.push(
                  {x: j, y: i, score: 0, power: 1}
                );          
                last = false;
                continue;
              }

              last = true;
              array[array.length - 1].power++;
          }
      }
      return array;
    }
};
  