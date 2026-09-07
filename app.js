const API_URL = "https://api.frankfurter.dev/v2";

const amountInput = document.getElementById("amount");
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");

const convertButton = document.getElementById("convertButton");
const swapButton = document.getElementById("swapButton");

const resultValue = document.getElementById("resultValue");
const rateText = document.getElementById("rateText");

const sspMarketRate = document.getElementById("sspMarketRate");
const sspBlackRate = document.getElementById("sspBlackRate");
const blackMarketRate = document.getElementById("blackMarketRate");
const saveBlackRate = document.getElementById("saveBlackRate");
const rateDifference = document.getElementById("rateDifference");

let currencies = {};


// --------------------------------------------------
// LOAD CURRENCIES
// --------------------------------------------------

async function loadCurrencies() {

    try {

        const response = await fetch(`${API_URL}/currencies`);

        if (!response.ok) {
            throw new Error("Unable to load currencies");
        }
const data = await response.json();

currencies = Object.fromEntries(
  data.map(currency => [
    currency.iso_code,
    currency.name
  ])
);
        

        populateCurrencies();

        // Load initial exchange rate
        convertCurrency();

    } catch (error) {

        console.error(error);

        resultValue.textContent = "Unable to load";
        rateText.textContent = "Please check your internet connection.";

    }

}


// --------------------------------------------------
// POPULATE CURRENCY SELECTORS
// --------------------------------------------------

function populateCurrencies() {

    fromCurrency.innerHTML = "";
    toCurrency.innerHTML = "";

    Object.entries(currencies)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([code, name]) => {

            const optionFrom = document.createElement("option");
            optionFrom.value = code;
            optionFrom.textContent = `${code} — ${name}`;

            const optionTo = document.createElement("option");
            optionTo.value = code;
            optionTo.textContent = `${code} — ${name}`;

            fromCurrency.appendChild(optionFrom);
            toCurrency.appendChild(optionTo);

        });


    // Default currencies

    if (currencies.USD) {
        fromCurrency.value = "USD";
    }

    /*
       Frankfurter may not provide SSP.
       If SSP is unavailable, we keep USD as the
       fallback until a dedicated SSP data source
       is added.
    */

    if (currencies.SSP) {
        toCurrency.value = "SSP";
    } else if (currencies.EUR) {
        toCurrency.value = "EUR";
    }

}


// --------------------------------------------------
// GET EXCHANGE RATE
// --------------------------------------------------

async function async function getRate(from, to) {
    if (from === to) {
        return 1;
    }

    const response = await fetch(
        `${API_URL}/rate/${from}/${to}`
    );

    if (!response.ok) {
        throw new Error("Unable to fetch exchange rate");
    }

    const data = await response.json();

    return data.rate;
}

    const data = await response.json();

    if (!data.rates || data.rates[to] === undefined) {
        throw new Error("Rate not available");
    }

    return data.rates[to];

}


// --------------------------------------------------
// CONVERT CURRENCY
// --------------------------------------------------

async function convertCurrency() {

    const amount = parseFloat(amountInput.value);

    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (!amount || amount < 0) {

        resultValue.textContent = "Enter an amount";
        rateText.textContent = "";

        return;
    }


    resultValue.textContent = "Loading...";
    rateText.textContent = "Checking the latest market rate...";


    try {

        const rate = await getRate(from, to);

        const converted = amount * rate;


        resultValue.textContent =
            `${formatNumber(converted)} ${to}`;


        rateText.textContent =
            `1 ${from} = ${formatNumber(rate)} ${to}`;


        // If USD → SSP is being displayed,
        // update the South Sudan section.

        if (from === "USD" && to === "SSP") {

            updateSouthSudanRate(rate);

        }

    } catch (error) {

        console.error(error);

        resultValue.textContent = "Rate unavailable";

        rateText.textContent =
            "This currency pair is not available from the current data source.";

    }

}


// --------------------------------------------------
// SOUTH SUDAN RATE
// --------------------------------------------------

function updateSouthSudanRate(rate) {

    if (!rate) return;

    sspMarketRate.textContent =
        `${formatNumber(rate)} SSP`;

    calculateDifference(rate);

}


// --------------------------------------------------
// BLACK MARKET RATE
// --------------------------------------------------

function loadSavedBlackMarketRate() {

    const savedRate =
        localStorage.getItem("rateCheckBlackMarketSSP");

    if (savedRate) {

        blackMarketRate.value = savedRate;

        sspBlackRate.textContent =
            `${formatNumber(parseFloat(savedRate))} SSP`;

    }

}


saveBlackRate.addEventListener("click", async function () {

    const value = parseFloat(blackMarketRate.value);

    if (!value || value <= 0) {

        alert("Please enter a valid black-market rate.");

        return;
    }


    localStorage.setItem(
        "rateCheckBlackMarketSSP",
        value
    );


    sspBlackRate.textContent =
        `${formatNumber(value)} SSP`;


    // Get current market rate so we can
    // calculate the difference.

    try {

        const marketRate =
            await getRate("USD", "SSP");

        calculateDifference(marketRate);

    } catch (error) {

        console.log(
            "Market rate unavailable for comparison."
        );

    }

});


// --------------------------------------------------
// CALCULATE BLACK MARKET DIFFERENCE
// --------------------------------------------------

function calculateDifference(marketRate) {

    const blackRate =
        parseFloat(blackMarketRate.value);


    if (!marketRate || !blackRate) {

        rateDifference.textContent = "—";

        return;
    }


    const difference =
        blackRate - marketRate;


    const percentage =
        (difference / marketRate) * 100;


    rateDifference.textContent =
        `${formatNumber(difference)} SSP (${percentage.toFixed(2)}%)`;

}


// --------------------------------------------------
// SWAP CURRENCIES
// --------------------------------------------------

swapButton.addEventListener("click", function () {

    const currentFrom =
        fromCurrency.value;

    const currentTo =
        toCurrency.value;


    fromCurrency.value = currentTo;
    toCurrency.value = currentFrom;


    convertCurrency();

});


// --------------------------------------------------
// BUTTON
// --------------------------------------------------

convertButton.addEventListener(
    "click",
    convertCurrency
);


// --------------------------------------------------
// ENTER KEY
// --------------------------------------------------

amountInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            convertCurrency();

        }

    }
);


// --------------------------------------------------
// NUMBER FORMATTER
// --------------------------------------------------

function formatNumber(number) {

    if (!Number.isFinite(number)) {
        return "—";
    }


    return new Intl.NumberFormat(
        "en-US",
        {
            maximumFractionDigits: 4
        }
    ).format(number);

}


// --------------------------------------------------
// START APPLICATION
// --------------------------------------------------

loadCurrencies();

loadSavedBlackMarketRate();
