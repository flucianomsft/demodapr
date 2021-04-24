// ------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// ------------------------------------------------------------

const express = require('express');
const bodyParser = require('body-parser');
require('isomorphic-fetch');

const app = express();
app.use(bodyParser.json());

// These ports are injected automatically into the container.
const daprPort = process.env.DAPR_HTTP_PORT; 
const daprGRPCPort = process.env.DAPR_GRPC_PORT;
const serverApp = process.env.SERVER_APP;

const stateStoreName = `statestore`;
const stateUrl = `http://localhost:${daprPort}/v1.0/state/${stateStoreName}`;
const serverAppUrl = `http://localhost:${daprPort}/v1.0/invoke/${serverApp}/method`;

const port = 3000;

app.get('/order', (_req, res) => {
    fetch(`${stateUrl}/order`)
        .then((response) => {
            if (!response.ok) {
                throw "Could not get state.";
            }

            return response.text();
        }).then((orders) => {
            res.send(orders);
        }).catch((error) => {
            console.log(error);
            res.status(500).send({message: error});
        });
});

app.post('/neworder', (req, res) => {
    const data = req.body.data;
    const orderId = data.orderId;
    console.log("Got a new order! Order ID: " + orderId);

    const state = [{
        key: "order",
        value: data
    }];

    fetch(stateUrl, {
        method: "POST",
        body: JSON.stringify(state),
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        if (!response.ok) {
            throw "Failed to persist state.";
        }

        console.log("Successfully persisted state.");
        res.status(200).send();
    }).catch((error) => {
        console.log(error);
        res.status(500).send({message: error});
    });
});

app.get('/startspan', (_req, res) => {
    fetch(`${serverAppUrl}/childspan1`)
    .then((response) => {
        console.log(_req.headers.traceparent);
        console.log(serverAppUrl);
        if (!response.ok) {
            throw "Could not call childspan1 "+`${serverAppUrl}/childspan1`+` result code: ${response.status} -  -${response.statusText}`;
        }
        return res.status(200);
    }).then(() => {
        res.send("end-to-end transaction completed");
    }).catch((error) => {
        console.log(error);
        res.status(500).send({message: error});
    });
});

app.get('/childspan1', (_req, res) => {
    fetch(`${serverAppUrl}/childspan2`)
    .then((response) => {
        console.log(_req.headers.traceparent);
        console.log(serverAppUrl);
        if (!response.ok) {
            throw "Could not call childspan2 "+`${serverAppUrl}/childspan2`+` result code: ${response.status} -  -${response.statusText}`;
        }
        return res.status(200);
    }).then(() => {
        res.send();
    }).catch((error) => {
        console.log(error);
        res.status(500).send({message: error});
    });    
});

app.get('/childspan2', (_req, res) => {
    console.log(_req.headers.traceparent);
    res.status(200).send("span2 ok");    
});

app.get('/ports', (_req, res) => {
    console.log("DAPR_HTTP_PORT: " + daprPort);
    console.log("DAPR_GRPC_PORT: " + daprGRPCPort);
    res.status(200).send({DAPR_HTTP_PORT: daprPort, DAPR_GRPC_PORT: daprGRPCPort })
});

app.listen(port, () => console.log(`Node App listening on port ${port}!`));