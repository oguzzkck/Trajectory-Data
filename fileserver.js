//burada gerekli kütüphaneleri ve en basit haliyle http sunucusunu set ediyoruz.
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var fs = require('fs');

http.listen(3000, () => {
  console.log("3000 portu dinleniyor...");
});

//sayfaya gelindiğinde index.html döndürüyoruz.
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/sayfa", (req, res) => {
  res.sendFile(path.join(__dirname + "/sayfa.html"));
});

//connection callbacki yani bir bağlantı gerçekleştiğinde yapılacaklar.
var userCounter = 0;
var points = [];
io.on("connection", (socket) => {



  userCounter = userCounter + 1;
  console.log("Toplam " + userCounter + " kullanıcı aktif. ");

  // İstemciden ham veriyi alır ve parcalar ve istemciye geri gönderir.
  socket.on("message", (text) => {


    var parcala=text.split(/[ ,\n]+/);

    
    for (var i = 0; i < parcala.length-1;i+=7) {

      points.push({
        x:parseFloat(parcala[i]),
        y:parseFloat(parcala[i+1])
      });
    }

    io.emit("show-message", points);

  });

// HamVeri
socket.on("hamveri", (text) => {


  var parcala=text.split(/[ ,\n]+/);


  for (var i = 0; i < parcala.length-1;i+=7) {

    points.push({
      lat:parseFloat(parcala[i]),
      lng:parseFloat(parcala[i+1])
    });
  }

  io.emit("hamverigoster", points);

  // dizinin içini boşaltma
  //points.splice(0,points.length-1);

});

  //bir istemci bağlantısını sonlandırdığında yapılacaklar.
  socket.on("disconnect", () => {
    userCounter = userCounter - 1;
    console.log("Bir kullanıcı ayrıldı.Toplam:"+ userCounter + "kisi aktif.");
  });

  // İstemciden gelen parcalanmış diziyi  indirgeme fonksiyonuna gönderir ve indirgenmiş veriyi istemciye gönderir.
  socket.on("indirgeme",(dizi)=>{
    var zaman1=new Date().getTime();

    var simplified = simplify( dizi ,0.000005,false);

    var indirgenmeorani = (1-(simplified.length/points.length))*100;
    
    var zaman2=new Date().getTime();
    var zaman3 = zaman2-zaman1;
    io.emit("indirgenmis",simplified,indirgenmeorani,zaman3);
    
// dizinin içini boşaltma
//simplified.splice(0,simplified.length-1);

});


// Douglas Peucke Algoritması
// Kaynak: https://gist.github.com/adammiller/826148

function getSqDist(p1, p2) {

  var dx = p1.x - p2.x,
  dy = p1.y - p2.y;

  return dx * dx + dy * dy;
}

    // square distance from a point to a segment
    function getSqSegDist(p, p1, p2) {

      var x = p1.x,
      y = p1.y,
      dx = p2.x - x,
      dy = p2.y - y;

      if (dx !== 0 || dy !== 0) {

        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
          x = p2.x;
          y = p2.y;

        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }

      dx = p.x - x;
      dy = p.y - y;

      return dx * dx + dy * dy;
    }
    // rest of the code doesn't care about point format

    // basic distance-based simplification
    function simplifyRadialDist(points, sqTolerance) {

      var prevPoint = points[0],
      newPoints = [prevPoint],
      point;

      for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
          newPoints.push(point);
          prevPoint = point;
        }
      }

      if (prevPoint !== point) newPoints.push(point);

      return newPoints;
    }

    function simplifyDPStep(points, first, last, sqTolerance, simplified) {
      var maxSqDist = sqTolerance,
      index;

      for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);

        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
      }
    }

    // simplification using Ramer-Douglas-Peucker algorithm
    function simplifyDouglasPeucker(points, sqTolerance) {
      var last = points.length - 1;

      var simplified = [points[0]];
      simplifyDPStep(points, 0, last, sqTolerance, simplified);
      simplified.push(points[last]);

      return simplified;
    }

    // both algorithms combined for awesome performance
    function simplify(points, tolerance, highestQuality) {

      if (points.length <= 2) return points;

      var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

      points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
      points = simplifyDouglasPeucker(points, sqTolerance);

      return points;
    }



  });

