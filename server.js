import express from "express";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();
const PORT = 3000;

// Definisci l'URL di base
const BASE_URL = "https://2be0-85-39-149-250.ngrok-free.app/intrasofter/system/ws/wsInnova.asmx";

// Middleware per servire file statici (HTML, CSS, JS)
app.use(express.static("public"));

// Middleware per CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Endpoint per ottenere il token
app.get("/getToken", async (req, res) => {
    try {
        const { username, password } = req.query; // Ottieni username e password dalla query string
        if (!username || !password) {
            throw new Error("Username e password sono obbligatori");
        }

        console.log("Richiesta token con username:", username, "e password:", password); // Debug

        const token = await getToken(username, password); // Passa username e password
        res.json({ token });
    } catch (error) {
        console.error("Errore nel server:", error); // Debug
        res.status(500).json({ error: error.message });
    }
});

// Endpoint per ottenere i dati dei clienti
app.get("/getClientData", async (req, res) => {
    try {
        const token = req.query.token;
        const { clients, contracts } = await getClientData(token);
        res.json({ clients, contracts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint per ottenere i dettagli del cliente
app.get("/getClientDetails", async (req, res) => {
    try {
        const token = req.query.token;
        const clientCode = req.query.clientCode;
        const clientDetails = await getClientDetails(token, clientCode);
        res.json({ clientDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Funzione per ottenere i dettagli del cliente
async function getClientDetails(token, clientCode) {
    const DETAILS_ENDPOINT = "/InnGET"; // Endpoint per ottenere i dettagli del cliente

    // Costruisci l'URL completo utilizzando BASE_URL
    const url = `${BASE_URL}${DETAILS_ENDPOINT}?Token=${encodeURIComponent(token)}&sArchivio=Clienti&sCampi=${encodeURIComponent('["_RUCOD","_RURAG","_RUIND","_RUCAP","_RUCIT","_RUPRO","_RUPIV","_RUCFI","_RUTEL","_RUFAX","_RUEMA","_RUBAN","_RUIBN"]')}&sRicerca=${encodeURIComponent(`[["_RUCOD","${clientCode}"]]`)}`;

    console.log("URL della richiesta (getClientDetails):", url); // Debug

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
            },
        });

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const xmlText = await response.text();
        console.log("Risposta XML (getClientDetails):", xmlText); // Debug

        const result = await parseStringPromise(xmlText);
        console.log("Risposta parsata (getClientDetails):", result); // Debug

        // Verifica che la risposta contenga i dati attesi
        if (!result.string || !result.string[0] || !result.string[0]._) {
            throw new Error("Dettagli del cliente non trovati nella risposta XML.");
        }

        // Estrai i dettagli del cliente dalla stringa JSON
        const clientDetailsString = result.string[0]._;
        const clientDetails = JSON.parse(clientDetailsString);

        // Verifica che i dettagli del cliente siano un array
        if (!Array.isArray(clientDetails) || clientDetails.length < 2) {
            throw new Error("Formato dei dettagli del cliente non valido.");
        }

        // I dettagli del cliente sono nel secondo array
        const clientInfo = clientDetails[1];
        console.log("Dettagli del cliente estratti:", clientInfo); // Debug

        return clientInfo;
    } catch (error) {
        console.error("Errore durante il recupero dei dettagli del cliente:", error);
        throw new Error("Errore durante il recupero dei dettagli del cliente.");
    }
}

// Avvia il server
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});

// Funzione per ottenere il token
async function getToken(username, password) {
    const AUTH_ENDPOINT = "/InnLogin"; // Endpoint per il login

    // Costruisci l'URL completo utilizzando BASE_URL
    const url = `${BASE_URL}${AUTH_ENDPOINT}?Utente=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`;
    console.log("URL della richiesta:", url); // Debug

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "ngrok-skip-browser-warning": "true",
        },
    });

    if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log("Risposta XML:", xmlText); // Debug

    const result = await parseStringPromise(xmlText);
    console.log("Risposta parsata:", result); // Debug

    const token = result.ArrayOfString.string[0];
    if (!token) {
        throw new Error("Token non trovato nella risposta XML");
    }

    return token;
}

// Funzione per ottenere i dati dei clienti
async function getClientData(token) {
    const DATA_ENDPOINT = "/InnExportDati"; // Endpoint per esportare i dati

    // Costruisci l'URL completo utilizzando BASE_URL
    const url = `${BASE_URL}${DATA_ENDPOINT}?Token=${encodeURIComponent(token)}&iStampaId=66&sRicerca=${encodeURIComponent('[["844","SAP"]]')}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "ngrok-skip-browser-warning": "true",
        },
    });

    if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
    }

    const xmlText = await response.text();
    const result = await parseStringPromise(xmlText);
    const clientData = result.ArrayOfString.string[0];
    const contractData = result.ArrayOfString.string[1];

    const clients = JSON.parse(clientData);
    const contracts = JSON.parse(contractData);

    return { clients, contracts };
}