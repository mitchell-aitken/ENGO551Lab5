var client; // Here's our MQTT client
var map; // This guy will hold our map
var currentLocationMarker; // This marker shows where we are right now

function connectToMQTT() {
    // Grabbing the host and port the user typed in
    var host = document.getElementById('mqtt_host').value;
    var port = parseInt(document.getElementById('mqtt_port').value);

    // Setting up our MQTT client. It's like dialing into the MQTT world!
    client = new Paho.MQTT.Client(host, port, "clientId" + new Date().getTime());

    // When stuff happens, these functions get called
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // Alright, let's make the connection!
    client.connect({
        onSuccess: onConnect, // What to do once we're in
        onFailure: onFailure, // What to do if we can't get in
        useSSL: true // Securing our connection if we can
    });
}

function onConnect() {
    console.log("Woohoo! Connected to the MQTT broker!");
    document.getElementById('start').disabled = true;
    document.getElementById('end').disabled = false;

    // Time to listen in on a specific topic
    client.subscribe("<your course code>/<your name>/my_temperature");
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
    console.log("New message in town: " + message.payloadString);
    // Got a new message, let's handle it (maybe update our map?)
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
        message.destinationName = "<your course code>/<your name>/my_temperature";
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
