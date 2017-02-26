﻿
var map; // global map
var socket;
var markers = [];
var sosMarkers = [];
var routeMarkers = [];
var zones = [];

function initMap() {
    var odessa = new google.maps.LatLng(46.447416, 30.749160);

    map = new google.maps.Map(document.getElementById('map'), {
        center: odessa,
        zoom: 14
    });

}

// Инициализация ВебСокетов
if (typeof (WebSocket) !== 'undefined') {
    socket = new WebSocket("ws://momiswatching.azurewebsites.net/Subscriptions/MapSubscriptionHandler.ashx");
} else {
    socket = new MozWebSocket("ws://momiswatching.azurewebsites.net/Subscriptions/MapSubscriptionHandler.ashx");
}

socket.onopen = function() {
//	alert("Соединение установлено.");
};

socket.onerror = function(error) {
//	alert("Ошибка " + error.message);
};

socket.onmessage = function (msg) {
    var packet = JSON.parse(msg.data);

    // Добавляем в список девайсов, если его там нет
    if (markers[packet.DeviceId] == null) {

        $.ajax({
            url: '/Index/DeviceRow',
            success: function (data) {

                // Загружаем частичное представление
                $('.rectangle').append(data);

                // Добавляем или обновляем маркер
                addMarker(packet); 

                // Ставим статус "онлайн" в списке девайсов
                $("#" + packet.DeviceId).children(".device_name").children("#status").attr("class", "online");
            }
        });
    }
    else {
        addMarker(packet); // Добавляем или обновляем маркер
        $("#" + packet.DeviceId).children(".device_name").children("#status").attr("class", "online");
    }
};

socket.onclose = function (event) {
    if (event.wasClean) {
        //alert('Соединение закрыто чисто');
    } else {
        alert('[Error] Код: ' + event.code + ' причина: ' + event.reason);
    }
};

// Загрузка последних местоположений девайсов
$.ajax({
    url: '/Index/GetDeviceLastPosition',
    cache: false,
    success: function (packet) {
        for (var i = 0; i < packet.length; i++) {
            addMarker(packet[i]);
        }
    }
});

// TODO Реализовать отображения оффлайн устройств по проверке последнего обновления и их интервалов
// Делаем через некоторое время устройства оффлайн
// Пока что примитивно, но так...
setInterval(function () {

    $("*").children(".device_name").children("#status").attr("class", "offline");

}, 30000);

function addMarker(packet) {

    var myLatLng = { lat: parseFloat(packet.Location.split(';')[0]), lng: parseFloat(packet.Location.split(';')[1]) };

    // Добавляем маркер для этого девайса, если его нет
    //console.log(packet.DeviceId + " " +markers[packet.DeviceId]);
    if (markers[packet.DeviceId] == null) {
        markers[packet.DeviceId] = [];

        // Создаем кастомный пин и даем ему рандомный цвет
        var pinColor = getRandomColor();
        var markerimg = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=•|" + pinColor;

        var pinImage = new google.maps.MarkerImage(markerimg,
            new google.maps.Size(21, 34),
            new google.maps.Point(0, 0),
            new google.maps.Point(10, 34));

        var pinShadow = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
            new google.maps.Size(40, 37),
            new google.maps.Point(0, 0),
            new google.maps.Point(12, 35));

        markers[packet.DeviceId]["marker"] = new google.maps.Marker({
            position: myLatLng,
            animation: google.maps.Animation.DROP,
            map: map,
            icon: pinImage,
            shadow: pinShadow
        });

        // Добавляем мини-маркер в список устройств
        $("#" + packet.DeviceId).children(".device_name").children(".minimarker").attr("src", markerimg);

        // Слушатель нажатия на маркер
        markers[packet.DeviceId]["marker"].addListener('click', function () {
            markers[packet.DeviceId]["marker"].setAnimation(null);

            if (markers[packet.DeviceId]["infoWindow"] != null)
                markers[packet.DeviceId]["infoWindow"].open(map, markers[packet.DeviceId]["marker"]);
        });

    } else {
        // Если есть, то меняем местоположение
        markers[packet.DeviceId]["marker"].setPosition(myLatLng);
    }

    // Если пакет пришел через вебсокеты, то с телефона время не отправляется,
    // поэтому допишем сами
    if (packet.Time == null) {
        var now = new Date;
        var utcTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                            now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

        packet.Time = utcTimestamp;
        

    }
   
    // Сохраняем последний пакет (на всякий случай)
    markers[packet.DeviceId]["lastPacket"] = packet;

    var contentString = ""; // Текст информационного окна

    // Если сигнал SOS - ПРЫГАЕМ!!, добавляем строчку в информационное окно
    if (packet.IsSos == 1) {
        markers[packet.DeviceId]["marker"].setAnimation(google.maps.Animation.BOUNCE);
        contentString += "<img class='device_option' src='/Content/img/sos.png' /> <u style='vertical-align: super;'>SOS Request!</u><br>";
    }
  
    contentString += "Charge: " + packet.Charge + "%<br>"
                   + "Time: " + new Date(parseInt(packet.Time.replace(/\D/g, ''))).toLocaleString();

    markers[packet.DeviceId]["infoWindow"] = new google.maps.InfoWindow({
        content: contentString
    });

}

function deviceClicked(marker) {
    // Слушатель нажатия на девайс в списке

    markers[marker]["marker"].setAnimation(google.maps.Animation.DROP);
    map.panTo(markers[marker]["marker"].position);
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function openSecondScreen() {
    $('#home').fadeOut();
    $('#third_screen').fadeOut();
    $('#second_screen').fadeIn();
}
function openFirstScreen() {
    $('#second_screen').fadeOut();
    $('#third_screen').fadeOut();
    $('#home').fadeIn();
}
function openThirdScreen() {
    $('#home').fadeOut();
    $('#second_screen').fadeOut();
    $('#third_screen').fadeIn();
}

function sosf(img) {
    if (img.classList.contains("disabled")) {
        img.classList.remove("disabled");

        sosMarkers[img.parentNode.id] = [];

        $.ajax({
            url: '/Index/GetSosMarkers',
            data: { "id": img.parentNode.id },
            cache: false,
            success: function (packet) {

                for (var i = 0; i < packet.length; i++) {

                    var current = packet[i];
                    sosMarkers[current.DeviceId][i] = [];

                    var myLatLng = {
                        lat: parseFloat(current.Location.split(';')[0]),
                        lng: parseFloat(current.Location.split(';')[1])
                    };

                    sosMarkers[current.DeviceId][i]["marker"] = new google.maps.Marker({
                        position: myLatLng,
                        //animation: google.maps.Animation.DROP,
                        map: map,
                        icon: markers[current.DeviceId]["marker"].icon
                    });

                    sosMarkers[current.DeviceId][i]["marker"].setOpacity(0.7);

                    // Слушатель нажатия на маркер
                    sosMarkers[current.DeviceId][i]["marker"].addListener('click',
                        function () {

                            var marker;
                            for (var i = 0; i < sosMarkers[img.parentNode.id].length; i++) {
                                if (sosMarkers[img.parentNode.id][i]["marker"] == this) {
                                    marker = sosMarkers[img.parentNode.id][i];
                                }
                            }

                            if (marker["infoWindow"] != null)
                                marker["infoWindow"].open(map, marker["marker"]);
                        });

                    var contentString =
                        "<img class='device_option' src='/Content/img/sos.png' /> <u style='vertical-align: super;'>SOS Request!</u><br>" + "Charge: " + current.Charge + "%<br>"
                        + "Time: " + new Date(parseInt(current.Time.replace(/\D/g, ''))).toLocaleString();

                    sosMarkers[current.DeviceId][i]["infoWindow"] = new google.maps.InfoWindow({
                        content: contentString
                    });

                }

            }
        });

    } else {
        img.classList.add("disabled");

        // Удаление маркеров
        for (var i = 0; i < sosMarkers[img.parentNode.id].length; i++) {

            sosMarkers[img.parentNode.id][i]["marker"].setMap(null);
            sosMarkers[img.parentNode.id][i]["marker"] = null;
            sosMarkers[img.parentNode.id][i] = null;
        }
    }
}

function zonesf(img) {
    if (img.classList.contains("disabled")) {
        img.classList.remove("disabled");

        $.ajax({
            url: '/Index/GetZones',
            data: { "id": img.parentNode.id },
            cache: false,
            success: function (packet) {

                if (packet == "") return;

                packet = JSON.parse(packet);
                console.log(packet.center);
                console.log(packet.radius);

                var color = markers[img.parentNode.id]["marker"].icon.url.split('|')[1];
                var coordArr = (packet.center).split(";");
                var coord = { lat: parseFloat(coordArr[0]), lng: parseFloat(coordArr[1]) };
                zones[img.parentNode.id] = new google.maps.Circle({
                    strokeColor: '#' + color,
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    fillColor: '#' + color,
                    fillOpacity: 0.35,
                    map: map,
                    center: coord,
                    radius: parseInt(packet.radius)
                });

            }
        });

    } else {
        img.classList.add("disabled");

        if (zones[img.parentNode.id] != null) {
            zones[img.parentNode.id].setMap(null);
            zones[img.parentNode.id] = null;
        }
    }
}

function positionf(img) {
    if (img.classList.contains("disabled")) {
        img.classList.remove("disabled");

        routeMarkers[img.parentNode.id] = [];

        $.ajax({
            url: '/Index/GetMarkers',
            data: { "id": img.parentNode.id },
            cache: false,
            success: function (packet) {

                for (var i = 0; i < packet.length; i++) {

                    var current = packet[i];
                    routeMarkers[current.DeviceId][i] = [];

                    var myLatLng = { lat: parseFloat(current.Location.split(';')[0]), lng: parseFloat(current.Location.split(';')[1]) };

                    routeMarkers[current.DeviceId][i]["marker"] = new google.maps.Marker({
                        position: myLatLng,
                        //animation: google.maps.Animation.DROP,
                        map: map,
                        icon: markers[current.DeviceId]["marker"].icon
                    });

                    routeMarkers[current.DeviceId][i]["marker"].setOpacity(0.7);

                    // Слушатель нажатия на маркер
                    routeMarkers[current.DeviceId][i]["marker"].addListener('click', function () {

                        var marker;
                        for (var i = 0; i < routeMarkers[img.parentNode.id].length; i++) {
                            if (routeMarkers[img.parentNode.id][i]["marker"] == this) {
                                marker = routeMarkers[img.parentNode.id][i];
                            }
                        }

                        if (marker["infoWindow"] != null)
                            marker["infoWindow"].open(map, marker["marker"]);
                    });

                    var contentString = ""; // Текст информационного окна

                    // Если сигнал SOS - добавляем строчку в информационное окно
                    if (current.IsSos == 1) {
                        contentString += "<img class='device_option' src='/Content/img/sos.png' /> <u style='vertical-align: super;'>SOS Request!</u><br>";
                    }

                    contentString += "Charge: " + current.Charge + "%<br>"
                                   + "Time: " + new Date(parseInt(current.Time.replace(/\D/g, ''))).toLocaleString();
                    routeMarkers[current.DeviceId][i]["infoWindow"] = new google.maps.InfoWindow({
                        content: contentString
                    });
                }

                // Рисуем линию на карте

                var line = [];

                routeMarkers[img.parentNode.id].forEach(function (item, i, arr) {
                    var coor = item["marker"].position;
                    line.push(coor);
                });

                var color = routeMarkers[img.parentNode.id][0]["marker"].icon.url.split('|')[1];

                routeMarkers[img.parentNode.id]["path"] = new google.maps.Polyline({
                    path: line,
                    geodesic: true,
                    strokeColor: '#' + color,
                    strokeOpacity: 1.0,
                    strokeWeight: 3
                });

                routeMarkers[img.parentNode.id]["path"].setMap(map);

            }
        });

    } else {
        img.classList.add("disabled");

        // Удаление маркеров и линии

        routeMarkers[img.parentNode.id]["path"].setMap(null);
        routeMarkers[img.parentNode.id]["path"] = null;

        for (var i = 0; i < routeMarkers[img.parentNode.id].length; i++) {

            routeMarkers[img.parentNode.id][i]["marker"].setMap(null);
            routeMarkers[img.parentNode.id][i]["marker"] = null;
            routeMarkers[img.parentNode.id][i] = null;
        }
    }
}

function addActionZone() {
    $('#zones').append('<li><div style="position: relative;margin: 0px 0px 0 200px;" onClick="delActiveZone(this);" id="close" ><p >-</p> </div><a href="#"><b>Name:</b></a><input type="text" class="rounded"><a href="#">Center:</a><input type="text" class="rounded"><a href="#">Radius:</a><input type="text" class="rounded"></li>');
}

function delActiveZone(div) {
    div.parentElement.remove();
}