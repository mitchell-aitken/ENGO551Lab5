var client; // Here's our MQTT client
var map; // This guy will hold our map
var currentLocationMarker; // This marker shows where we are right now

function connectToMQTT() {
    var host = document.getElementById('mqtt_host').value; // 'broker.emqx.io'
    var port = parseInt(document.getElementById('mqtt_port').value); // Should be 8084 for WSS

    // The Paho client expects the host without the protocol and the path
    host = host.replace('wss://', '').replace('/mqtt', ''); // Ensure host is clean

    client = new Paho.MQTT.Client(host, port, "clientId" + new Date().getTime());

    client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: true // Set true if connecting over WSS
    });
}


function onConnect() {
    console.log("Woohoo! Connected to the MQTT broker!");
    document.getElementById('start').disabled = true;
    document.getElementById('end').disabled = false;

    // Time to listen in on a specific topic
    client.subscribe("ENGO551/Mitchell/my_temperature");
}

function onFailure(errorMessage) {
    console.log("Uh-oh, couldn't connect: " + errorMessage.errorMessage);
    // Maybe try reconnecting, or let the user know
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Oops, connection lost: " + responseObject.errorMessage);
        // Should we try to reconnect automatically or just inform the user?
        connectToMQTT(); // Let's try getting back on
    }
}

function onMessageArrived(message) {
    console.log("Message arrived: " + message.payloadString);
    var receivedData = JSON.parse(message.payloadString);
    console.log("Parsed Data: ", receivedData); // Log the parsed data for debugging

    if (receivedData.geometry && receivedData.properties.temperature) {
        // Extract coordinates
        var longitude = receivedData.geometry.coordinates[0];
        var latitude = receivedData.geometry.coordinates[1];
        var temperature = receivedData.properties.temperature;
        console.log("Extracted Coordinates - Latitude: " + latitude + ", Longitude: " + longitude); // Log for debugging
        console.log("Extracted Temperature: " + temperature); // Log for debugging

        // Update marker position with latitude first, then longitude
        currentLocationMarker.setLatLng([latitude, longitude]);

        // Ensure the map centers on the new marker position
        map.setView([latitude, longitude], map.getZoom());

        // Update marker color based on temperature
        var iconColor = getTemperatureColor(temperature);
        var newIcon = L.icon({
            iconUrl: iconColor + '_marker.png', // Ensure the path is correct
            iconSize: [25, 41], // Size of the icon
            iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
            popupAnchor: [1, -34] // Point from which the popup should open relative to the iconAnchor
        });
        currentLocationMarker.setIcon(newIcon);

        // Update the popup content and show it
        currentLocationMarker.bindPopup("Temperature: " + temperature + "°C").openPopup();
    } else {
        console.log("Message does not contain expected data structure."); // Log for debugging
    }
}



function getTemperatureColor(temperature) {
    if (temperature < 10) return 'blue';
    else if (temperature < 30) return 'green';
    else return 'red';
}


function publishLocation() {
    // Fetch our current spot and send it off
    navigator.geolocation.getCurrentPosition(function(position) {
        var geojsonMessage = {
            type: "Feature",
            properties: {
                temperature: Math.random() * 50 - 40 // Cooking up a random temperature
            },
            geometry: {
                type: "Point",
                coordinates: [position.coords.longitude, position.coords.latitude]
            }
        };

        var message = new Paho.MQTT.Message(JSON.stringify(geojsonMessage));
        message.destinationName = "ENGO551/Mitchell/my_temperature";
        client.send(message);
    });
}

// When the user clicks 'start', let's get this party started
document.getElementById('start').addEventListener('click', connectToMQTT);
document.getElementById('end').addEventListener('click', function() {
    client.disconnect();
    console.log("See ya! Disconnected.");
});
document.getElementById('share_status').addEventListener('click', publishLocation);

// Let's set up our map initially
function initMap() {
    map = L.map('map').setView([0, 0], 13); // Starting point

    // Adding the OpenStreetMap layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; OpenStreetMap contributors',
    }).addTo(map);

    // Dropping a pin for our current spot
    currentLocationMarker = L.marker([0, 0]).addTo(map);
}

initMap(); // Let's get the map up and running
