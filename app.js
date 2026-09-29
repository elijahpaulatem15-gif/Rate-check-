const API_URL = "https://api.frankfurter.dev/v2";
const CRYPTO_API_URL = "https://api.coingecko.com/api/v3/simple/price";

// --------------------------------------------------
// CURRENCY ELEMENTS
// --------------------------------------------------

const amountInput = document.getElementById("amount");
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");

const convertButton = document.getElementById("convertButton");
const swapButton = document.getElementById("swapButton");

const resultValue = document.getElementById("resultValue");
const rateText = document.getElementById("rateText");

let currencies = {};


// --------------------------------------------------
// CRYPTO ELEMENTS
// --------------------------------------------------

const cryptoCurrency =
    document.getElementById("cryptoCurrency");

const cryptoName =
    document.getElementById("cryptoName");

const cryptoPrice =
    document.getElementById("cryptoPrice");

const cryptoChange =
    document.getElementById("cryptoChange");

const cryptoRefreshButton =
    document.getElementById("cryptoRefreshButton");


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

        currencies = {};

        data.forEach(currency => {
            const code = currency.iso_code;
            const name = currency.name;

            if (code && name) {
                currencies[code] = name;
            }
        });

        populateCurrencies();
        convertCurrency();

    } catch (error) {
        console.error("Currency loading error:", error);

        fromCurrency.innerHTML = '<option value="">Currencies unavailable</option>';
        toCurrency.innerHTML = '<option value="">Currencies unavailable</option>';
    }
            }


// --------------------------------------------------
// POPULATE CURRENCY SELECTORS
// --------------------------------------------------

function populateCurrencies() {

    fromCurrency.innerHTML = "";
    toCurrency.innerHTML = "";

    Object.entries(currencies)
        .sort((a, b) =>
            a[0].localeCompare(b[0])
        )
        .forEach(([code, name]) => {

            const optionFrom =
                document.createElement("option");

            optionFrom.value = code;

            optionFrom.textContent =
                `${code} — ${name}`;

            const optionTo =
                document.createElement("option");

            optionTo.value = code;

            optionTo.textContent =
                `${code} — ${name}`;

            fromCurrency.appendChild(
                optionFrom
            );

            toCurrency.appendChild(
                optionTo
            );
        });


    // --------------------------------------------------
    // RESTORE SAVED CURRENCIES
    // --------------------------------------------------

    const savedFrom =
        localStorage.getItem(
            "rateCheckFromCurrency"
        );

    const savedTo =
        localStorage.getItem(
            "rateCheckToCurrency"
        );


    if (
        savedFrom &&
        currencies[savedFrom]
    ) {

        fromCurrency.value =
            savedFrom;

    } else if (currencies.USD) {

        fromCurrency.value =
            "USD";
    }


    if (
        savedTo &&
        currencies[savedTo]
    ) {

        toCurrency.value =
            savedTo;

    } else if (currencies.EUR) {

        toCurrency.value =
            "EUR";

    } else if (currencies.GBP) {

        toCurrency.value =
            "GBP";
    }
}


// --------------------------------------------------
// GET CURRENCY EXCHANGE RATE
// --------------------------------------------------

async function getRate(from, to) {

    if (from === to) {
        return 1;
    }


    const response =
        await fetch(
            `${API_URL}/rate/${from}/${to}`
        );


    if (!response.ok) {
        throw new Error(
            "Unable to fetch exchange rate"
        );
    }


    const data =
        await response.json();


    return data.rate;
}


// --------------------------------------------------
// CONVERT CURRENCY
// --------------------------------------------------

async function convertCurrency() {

    const amount =
        parseFloat(amountInput.value);

    const from =
        fromCurrency.value;

    const to =
        toCurrency.value;


    localStorage.setItem(
        "rateCheckFromCurrency",
        from
    );

    localStorage.setItem(
        "rateCheckToCurrency",
        to
    );


    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {

        resultValue.textContent =
            "Enter an amount";

        rateText.textContent =
            "";

        return;
    }


    resultValue.textContent =
        "Loading...";

    rateText.textContent =
        "Checking the latest market rate...";


    try {

        const rate =
            await getRate(from, to);


        const converted =
            amount * rate;


        resultValue.textContent =
            `${formatNumber(converted)} ${to}`;


        rateText.textContent =
            `1 ${from} = ${formatNumber(rate)} ${to}`;


        saveRateHistory({
            amount: amount,
            from: from,
            to: to,
            rate: rate,
            result: converted
        });


    } catch (error) {

        console.error(error);


        resultValue.textContent =
            "Rate unavailable";


        rateText.textContent =
            "This currency pair is not available from the current data source.";
    }
}


// --------------------------------------------------
// SWAP CURRENCIES
// --------------------------------------------------

function swapCurrencies() {

    const currentFrom =
        fromCurrency.value;

    const currentTo =
        toCurrency.value;


    fromCurrency.value =
        currentTo;

    toCurrency.value =
        currentFrom;


    convertCurrency();
}


// --------------------------------------------------
// RATE HISTORY
// --------------------------------------------------

function saveRateHistory(entry) {

    let history =
        JSON.parse(
            localStorage.getItem(
                "rateCheckHistory"
            )
        ) || [];


    history.unshift({

        amount: entry.amount,

        from: entry.from,

        to: entry.to,

        rate: entry.rate,

        result: entry.result
    });


    // Keep latest 10 conversions

    history =
        history.slice(0, 10);


    localStorage.setItem(
        "rateCheckHistory",
        JSON.stringify(history)
    );


    displayRateHistory();
}


// --------------------------------------------------
// DISPLAY RATE HISTORY
// --------------------------------------------------

function displayRateHistory() {

    const historyContainer =
        document.getElementById(
            "rateHistory"
        );


    if (!historyContainer) {
        return;
    }


    const history =
        JSON.parse(
            localStorage.getItem(
                "rateCheckHistory"
            )
        ) || [];


    if (history.length === 0) {

        historyContainer.innerHTML = `
            <p class="history-empty">
                No rate history yet.
            </p>
        `;

        return;
    }


    historyContainer.innerHTML =
        history.map(entry => `

            <div class="history-item">

                <div class="history-main">

                    ${formatNumber(entry.amount)}
                    ${entry.from}
                    →
                    ${formatNumber(entry.result)}
                    ${entry.to}

                </div>

                <div class="history-rate">

                    1 ${entry.from}
                    =
                    ${formatNumber(entry.rate)}
                    ${entry.to}

                </div>

            </div>

        `).join("");
}


// --------------------------------------------------
// CLEAR RATE HISTORY
// --------------------------------------------------

const clearHistoryButton =
    document.getElementById(
        "clearHistory"
    );


if (clearHistoryButton) {

    clearHistoryButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "rateCheckHistory"
            );

            displayRateHistory();
        }
    );
}


// --------------------------------------------------
// CRYPTOCURRENCY RATE
// --------------------------------------------------

async function loadCryptoRate() {

    const cryptoId =
        cryptoCurrency.value;


    if (!cryptoId) {
        return;
    }


    cryptoPrice.textContent =
        "Loading...";

    cryptoChange.textContent =
        "Checking latest rate...";


    try {

        const response =
            await fetch(
                `${CRYPTO_API_URL}?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`
            );


        if (!response.ok) {
            throw new Error(
                "Unable to load cryptocurrency rate"
            );
        }


        const data =
            await response.json();


        const cryptoData =
            data[cryptoId];


        if (!cryptoData) {
            throw new Error(
                "Cryptocurrency data unavailable"
            );
        }


        const price =
            cryptoData.usd;


        const change =
            cryptoData.usd_24h_change;


        const selectedOption =
            cryptoCurrency.options[
                cryptoCurrency.selectedIndex
            ];


        cryptoName.textContent =
            selectedOption.textContent;


        cryptoPrice.textContent =
            `$${formatNumber(price)}`;


        if (
            Number.isFinite(change)
        ) {

            const sign =
                change >= 0
                    ? "+"
                    : "";


            cryptoChange.textContent =
                `${sign}${change.toFixed(2)}% (24h)`;

        } else {

            cryptoChange.textContent =
                "24h change unavailable";
        }


    } catch (error) {

        console.error(error);


        cryptoPrice.textContent =
            "Rate unavailable";


        cryptoChange.textContent =
            "Unable to load cryptocurrency data.";
    }
}


// --------------------------------------------------
// CRYPTOCURRENCY EVENTS
// --------------------------------------------------

if (cryptoRefreshButton) {

    cryptoRefreshButton.addEventListener(
        "click",
        loadCryptoRate
    );
}


if (cryptoCurrency) {

    cryptoCurrency.addEventListener(
        "change",
        loadCryptoRate
    );
}


// --------------------------------------------------
// CONVERTER BUTTON
// --------------------------------------------------

convertButton.addEventListener(
    "click",
    convertCurrency
);


// --------------------------------------------------
// SWAP BUTTON
// --------------------------------------------------

swapButton.addEventListener(
    "click",
    swapCurrencies
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

displayRateHistory();

loadCryptoRate();
