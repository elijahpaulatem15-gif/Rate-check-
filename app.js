

const API_URL = "https://api.frankfurter.dev/v2";
const CRYPTO_API_URL = "https://api.coingecko.com/api/v3/simple/price";

let currencies = {};

let fromCurrencySearch;
let toCurrencySearch;

let amountInput;
let fromCurrency;
let toCurrency;
let convertButton;
let swapButton;
let resultValue;
let rateText;

let cryptoCurrency;
let cryptoName;
let cryptoPrice;
let cryptoChange;
let cryptoRefreshButton;

let rateHistory;
let clearHistory;


// ===============================
// START APP
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    amountInput = document.getElementById("amount");
    fromCurrency = document.getElementById("fromCurrency");
    toCurrency = document.getElementById("toCurrency");

fromCurrencySearch = document.getElementById("fromCurrencySearch");
toCurrencySearch = document.getElementById("toCurrencySearch");

if (fromCurrencySearch) {
    fromCurrencySearch.addEventListener("input", populateCurrencies);
}

if (toCurrencySearch) {
    toCurrencySearch.addEventListener("input", populateCurrencies);
}

    convertButton = document.getElementById("convertButton");
    swapButton = document.getElementById("swapButton");

    resultValue = document.getElementById("resultValue");
    rateText = document.getElementById("rateText");

    cryptoCurrency = document.getElementById("cryptoCurrency");
    cryptoName = document.getElementById("cryptoName");
    cryptoPrice = document.getElementById("cryptoPrice");
    cryptoChange = document.getElementById("cryptoChange");
    cryptoRefreshButton =
        document.getElementById("cryptoRefreshButton");

    rateHistory = document.getElementById("rateHistory");
    clearHistory = document.getElementById("clearHistory");


    // Currency buttons
    if (convertButton) {
        convertButton.addEventListener(
            "click",
            convertCurrency
        );
    }

    if (swapButton) {
        swapButton.addEventListener(
            "click",
            swapCurrencies
        );
    }

    if (amountInput) {
        amountInput.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    convertCurrency();
                }
            }
        );
    }


    // Crypto
    if (cryptoCurrency) {
        cryptoCurrency.addEventListener(
            "change",
            loadCryptoRate
        );
    }

    if (cryptoRefreshButton) {
        cryptoRefreshButton.addEventListener(
            "click",
            loadCryptoRate
        );
    }


    // History
    if (clearHistory) {
        clearHistory.addEventListener(
            "click",
            clearRateHistory
        );
    }


    // Start
    loadCurrencies();
    displayRateHistory();
    loadCryptoRate();
});


// ===============================
// LOAD CURRENCIES
// ===============================

async function loadCurrencies() {

    try {

        const response = await fetch(
            "https://api.frankfurter.dev/v2/currencies"
        );

        if (!response.ok) {
            throw new Error(
                "Currency API request failed"
            );
        }

        const data =
            await response.json();

        console.log(
            "Currency API response:",
            data
        );

        if (!Array.isArray(data)) {
            throw new Error(
                "Currency data is not an array"
            );
        }

        currencies = {};

        data.forEach(currency => {

            if (
                currency.iso_code &&
                currency.name
            ) {

                currencies[
                    currency.iso_code
                ] = currency.name;

            }

        });

        console.log(
            "Currencies loaded:",
            currencies
        );

        populateCurrencies();

        if (
            fromCurrency.value &&
            toCurrency.value
        ) {
            await convertCurrency();
        }

    } catch (error) {

        console.error(
            "Currency loading failed:",
            error
        );
        
        alert(
    "Currency loading error: " +
    error.message
);
        
        fromCurrency.innerHTML =
            '<option value="">Currency loading failed</option>';

        toCurrency.innerHTML =
            '<option value="">Currency loading failed</option>';

        resultValue.textContent =
            "—";

        rateText.textContent =
            "Unable to load currency data.";
    }
        }


// ===============================
// POPULATE CURRENCY SELECTORS
// ===============================

function populateCurrencies() {
    if (!fromCurrency || !toCurrency) {
        return;
    }

    const currencyList = Object.entries(currencies)
        .sort((a, b) => a[0].localeCompare(b[0]));

    const fromSearch = (
        fromCurrencySearch?.value || ""
    ).trim().toLowerCase();

    const toSearch = (
        toCurrencySearch?.value || ""
    ).trim().toLowerCase();

    const selectedFrom =
        fromCurrency.value ||
        localStorage.getItem("rateCheckFromCurrency") ||
        "USD";

    const selectedTo =
        toCurrency.value ||
        localStorage.getItem("rateCheckToCurrency") ||
        "EUR";

    const fromList = currencyList.filter(
        ([code, name]) =>
            code.toLowerCase().includes(fromSearch) ||
            name.toLowerCase().includes(fromSearch)
    );

    const toList = currencyList.filter(
        ([code, name]) =>
            code.toLowerCase().includes(toSearch) ||
            name.toLowerCase().includes(toSearch)
    );

    function fillDropdown(select, list, preferred) {
        select.innerHTML = "";

        list.forEach(([code, name]) => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = `${code} — ${name}`;
            select.appendChild(option);
        });

        if (list.some(([code]) => code === preferred)) {
            select.value = preferred;
        } else if (list.length > 0) {
            select.value = list[0][0];
        }
    }

    fillDropdown(fromCurrency, fromList, selectedFrom);
    fillDropdown(toCurrency, toList, selectedTo);
}


// ===============================
// GET EXCHANGE RATE
// ===============================

async function getRate(from, to) {

    if (!from || !to) {
        throw new Error(
            "Currency not selected."
        );
    }

    // Same currency
    if (from === to) {
        return 1;
    }

    const response = await fetch(
        `${API_URL}/rate/${from}/${to}`,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Unable to fetch exchange rate: ${response.status}`
        );
    }

    const data =
        await response.json();

    if (
        !data ||
        typeof data.rate !== "number"
    ) {
        throw new Error(
            "Invalid exchange rate."
        );
    }

    return data.rate;
}


// ===============================
// CONVERT CURRENCY
// ===============================

async function convertCurrency() {

    if (
        !amountInput ||
        !fromCurrency ||
        !toCurrency ||
        !resultValue ||
        !rateText
    ) {
        return;
    }

    const amount =
        parseFloat(
            amountInput.value
        );

    const from =
        fromCurrency.value;

    const to =
        toCurrency.value;


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


    if (!from || !to) {

        resultValue.textContent =
            "Select currencies";

        rateText.textContent =
            "";

        return;
    }


    // Save selections
    localStorage.setItem(
        "rateCheckFromCurrency",
        from
    );

    localStorage.setItem(
        "rateCheckToCurrency",
        to
    );


    resultValue.textContent =
        "Loading...";

    rateText.textContent =
        "Checking the latest market rate...";


    try {

        const rate =
            await getRate(
                from,
                to
            );

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

        console.error(
            "Conversion error:",
            error
        );

        resultValue.textContent =
            "Rate unavailable";

        rateText.textContent =
            "This currency pair is not available from the current data source.";
    }
}


// ===============================
// SWAP CURRENCIES
// ===============================

function swapCurrencies() {

    if (
        !fromCurrency ||
        !toCurrency
    ) {
        return;
    }

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


// ===============================
// FORMAT NUMBERS
// ===============================

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


// ===============================
// RATE HISTORY
// ===============================

function saveRateHistory(item) {

    try {

        let history =
            JSON.parse(
                localStorage.getItem(
                    "rateCheckHistory"
                ) || "[]"
            );

        history.unshift({
            ...item,
            date: new Date().toISOString()
        });

        // Keep latest 10
        history =
            history.slice(0, 10);

        localStorage.setItem(
            "rateCheckHistory",
            JSON.stringify(history)
        );

        displayRateHistory();

    } catch (error) {

        console.error(
            "Could not save history:",
            error
        );
    }
}


// ===============================
// DISPLAY HISTORY
// ===============================

function displayRateHistory() {

    if (!rateHistory) {
        return;
    }

    try {

        const history =
            JSON.parse(
                localStorage.getItem(
                    "rateCheckHistory"
                ) || "[]"
            );


        if (
            !Array.isArray(history) ||
            history.length === 0
        ) {

            rateHistory.innerHTML =
                "<p>No rate history yet.</p>";

            return;
        }


        rateHistory.innerHTML =
            history.map(item => {

                return `
                    <div class="history-item">

                        <strong>
                            ${formatNumber(item.amount)}
                            ${item.from}
                            →
                            ${formatNumber(item.result)}
                            ${item.to}
                        </strong>

                        <span>
                            1 ${item.from}
                            =
                            ${formatNumber(item.rate)}
                            ${item.to}
                        </span>

                    </div>
                `;

            }).join("");


    } catch (error) {

        console.error(
            "Could not display history:",
            error
        );
    }
}


// ===============================
// CLEAR HISTORY
// ===============================

function clearRateHistory() {

    localStorage.removeItem(
        "rateCheckHistory"
    );

    displayRateHistory();
}


// ===============================
// CRYPTOCURRENCY
// ===============================

async function loadCryptoRate() {

    if (
        !cryptoCurrency ||
        !cryptoName ||
        !cryptoPrice ||
        !cryptoChange
    ) {
        return;
    }

    const coin =
        cryptoCurrency.value;


    if (!coin) {
        return;
    }


    cryptoPrice.textContent =
        "Loading...";

    cryptoChange.textContent =
        "Checking latest price...";


    try {

        const response = await fetch(
            `${CRYPTO_API_URL}?ids=${encodeURIComponent(coin)}&vs_currencies=usd&include_24hr_change=true`,
            {
                cache: "no-store"
            }
        );


        if (!response.ok) {
            throw new Error(
                `Crypto API error: ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            !data[coin] ||
            typeof data[coin].usd !== "number"
        ) {
            throw new Error(
                "Cryptocurrency data unavailable."
            );
        }


        const price =
            data[coin].usd;

        const change =
            data[coin].usd_24h_change;


        const selectedOption =
            cryptoCurrency.options[
                cryptoCurrency.selectedIndex
            ];


        const name =
            selectedOption
                ? selectedOption.textContent
                : coin;


        cryptoName.textContent =
            name;


        cryptoPrice.textContent =
            `$${formatNumber(price)}`;


        if (Number.isFinite(change)) {

            const sign =
                change >= 0
                    ? "+"
                    : "";

            cryptoChange.textContent =
                `${sign}${formatNumber(change)}% (24h)`;

        } else {

            cryptoChange.textContent =
                "24h change unavailable";
        }


    } catch (error) {

        console.error(
            "Crypto loading error:",
            error
        );

        cryptoName.textContent =
            "Cryptocurrency";

        cryptoPrice.textContent =
            "Price unavailable";

        cryptoChange.textContent =
            "Unable to load latest rate.";
    }
                          }
