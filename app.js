// ENGO 551 JS Code Lab 5 Mitchell Aitken

var client; // Here's our MQTT client
var map; // This guy will hold our map
var currentLocationMarker; // This marker shows where we are right now

function connectToMQTT() {
    var host = document.getElementById('mqtt_host').value; // 'broker.emqx.io'
    var port = parseInt(document.getElementById('mqtt_port').value); // Should be 8084 for WSS

    // Initialize the MQTT Client
    client = new Paho.MQTT.Client(host, port, "clientId" + new Date().getTime());

    // set the callback function for when messages are received
    client.onMessageArrived = onMessageArrived;
    client.onConnectionLost = onConnectionLost;

    // Connect the client, providing the onSuccess and onFailure callback handlers
    client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: true // Set to true if connecting over WSS
    });
}


function onConnect() {
    console.log("Woohoo! Connected to the MQTT broker!");
    document.getElementById('start').disabled = true;
    document.getElementById('end').disabled = false;

    // listen in on a specific topic
    client.subscribe("ENGO551/Mitchell/my_temperature");
}

// function to show cant connect, and connections lost
function onFailure(errorMessage) {
    console.log("Uh-oh, couldn't connect: " + errorMessage.errorMessage);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Connection lost:", responseObject.errorMessage);

        // add  delay before reconnecting
        setTimeout(() => {
            console.log("Attempting to reconnect...");
            connectToMQTT(); // tries to connect again
        }, 5000); // Reconnect after 5 seconds
    }
}


function onMessageArrived(message) {
    console.log("New message in town: " + message.payloadString);
    var receivedData = JSON.parse(message.payloadString);

    if (receivedData.geometry && receivedData.properties.temperature) {
        var coords = receivedData.geometry.coordinates;
        var temperature = receivedData.properties.temperature;

        console.log("Latitude: " + coords[1] + ", Longitude: " + coords[0] + ", Temperature: " + temperature);

        // update marker position with latitude first, then longitude
        currentLocationMarker.setLatLng([coords[1], coords[0]]);

        // make the map center on the new marker position
        map.setView([coords[1], coords[0]], map.getZoom());

        // Update marker color based on temperature
        updateMarkerIconAndPopup(temperature);
    } else {
        console.error("Received data does not contain geometry and temperature properties.");
    }
}

function updateMarkerIconAndPopup(temperature) {
    var iconColor = getTemperatureColor(temperature);

    // calls  a function to create a custom icon based on the color
    var newIcon = createCustomIcon(iconColor);
    currentLocationMarker.setIcon(newIcon);
    currentLocationMarker.bindPopup("Temperature: " + temperature + "°C").openPopup();
}

// function to create a custom icon (based on color)
function createCustomIcon(color) {
    return L.divIcon({
        className: 'custom-color-marker',
        html: "<div style='background-color: " + color + "; width: 10px; height: 10px; border-radius: 50%;'></div>",
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });
}

function getTemperatureColor(temperature) {
    if (temperature < 10) {
        // t below 10
        console.log("Temperature Colour Blue");
        return 'blue';
    } else if (temperature >= 10 && temperature < 30) {
        // between 10 and 30 (inclusive of 10, but exclusive of 30)
        console.log("Temperature Colour Green");
        return 'green';
    } else {
        // 30 and above (inclusive of 30 up to 60, and theoretically beyond)
        console.log("Temperature Colour Red");
        return 'red';
    }
}


function publishLocation() {
    // Fetch our current spot and send it off
    navigator.geolocation.getCurrentPosition(function(position) {
        var geojsonMessage = {
            type: "Feature",
            properties: {
                temperature: parseFloat((Math.random() * 50 - 10).toFixed(2)) // Generates a random temperature between -10 and 40, rounded to 2 decimal places
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

// when the user clicks 'start', let's get this party started
document.getElementById('start').addEventListener('click', connectToMQTT);
document.getElementById('end').addEventListener('click', function() {
    client.disconnect();
    console.log("See ya! Disconnected.");
});
document.getElementById('share_status').addEventListener('click', publishLocation);

function publishMessage() {
    var topic = document.getElementById('publish_topic').value;
    var messageContent = document.getElementById('publish_message').value;

    if (!topic) {
        alert("Please enter a topic.");
        return;
    }

    var message = new Paho.MQTT.Message(messageContent);
    message.destinationName = topic;
    client.send(message);
}

document.getElementById('publish').addEventListener('click', publishMessage);


// initial map set up
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
