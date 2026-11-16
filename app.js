
const API_URL = "https://api.frankfurter.dev/v2";
const CRYPTO_API_URL = "https://api.coingecko.com/api/v3/simple/price";

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn("Storage read failed:", error);
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn("Storage save failed:", error);
        return false;
    }
}

function safeStorageRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn("Storage removal failed:", error);
        return false;
    }
}

let currencies = {};

let conversionRequestId = 0;

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

let cryptoRates = {};
let cryptoRatesUpdatedAt = 0;
let cryptoRatesPromise = null;
let cryptoRequestId = 0;

let rateHistory;
let clearHistory;


// ===============================
// START APP
// ===============================


document.addEventListener("DOMContentLoaded", () => {

    amountInput = document.getElementById("amount");
    fromCurrency = document.getElementById("fromCurrency");
    toCurrency = document.getElementById("toCurrency");

    fromCurrencySearch =
        document.getElementById("fromCurrencySearch");

    toCurrencySearch =
        document.getElementById("toCurrencySearch");

    convertButton =
        document.getElementById("convertButton");

    swapButton =
        document.getElementById("swapButton");

    resultValue =
        document.getElementById("resultValue");

    rateText =
        document.getElementById("rateText");

    cryptoCurrency =
        document.getElementById("cryptoCurrency");

    cryptoName =
        document.getElementById("cryptoName");

    cryptoPrice =
        document.getElementById("cryptoPrice");

    cryptoChange =
        document.getElementById("cryptoChange");

    cryptoRefreshButton =
        document.getElementById("cryptoRefreshButton");

    rateHistory =
        document.getElementById("rateHistory");

    clearHistory =
        document.getElementById("clearHistory");


    // Amount persistence

    if (amountInput) {

        const savedAmount =
            safeStorageGet("rateCheckAmount");

        if (savedAmount !== null) {
            amountInput.value = savedAmount;
        }

        amountInput.addEventListener("input", () => {

            safeStorageSet(
                "rateCheckAmount",
                amountInput.value
            );

        });

        amountInput.addEventListener("keydown", event => {

            if (event.key === "Enter") {
                convertCurrency();
            }

        });

    }


    // Currency search

    
    if (fromCurrencySearch) {
        fromCurrencySearch.addEventListener(
            "input",
            () => {
                populateCurrencies();

                if (!fromCurrency.value) {
                    convertCurrency();
                }
            }
        );
    }

    if (toCurrencySearch) {
        toCurrencySearch.addEventListener(
            "input",
            () => {
                populateCurrencies();

                if (!toCurrency.value) {
                    convertCurrency();
                }
            }
        );
    }



    // Save currency selections

    if (fromCurrency) {

        fromCurrency.addEventListener("change", () => {

            safeStorageSet(
                "rateCheckFromCurrency",
                fromCurrency.value
            );

        });

    }

    if (toCurrency) {

        toCurrency.addEventListener("change", () => {

            safeStorageSet(
                "rateCheckToCurrency",
                toCurrency.value
            );

        });

    }


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


    // Cryptocurrency selection

    if (cryptoCurrency) {

        const savedCrypto =
            safeStorageGet("rateCheckCrypto");

        if (
            savedCrypto &&
            [...cryptoCurrency.options].some(
                option => option.value === savedCrypto
            )
        ) {
            cryptoCurrency.value = savedCrypto;
        }

        cryptoCurrency.addEventListener("change", () => {

            safeStorageSet(
                "rateCheckCrypto",
                cryptoCurrency.value
            );

            loadCryptoRate();

        });

    }


    // Manual crypto refresh

    // Prevent frequent manual refresh requests

    let lastCryptoRefreshTime = 0;

    if (cryptoRefreshButton) {

        cryptoRefreshButton.addEventListener(
            "click",
            () => {

                const now = Date.now();

                if (
                    now - lastCryptoRefreshTime < 60000
                ) {
                    return;
                }

                lastCryptoRefreshTime = now;

                loadCryptoRate(true);

            }
        );

    }


    // Clear history

    if (clearHistory) {
        clearHistory.addEventListener(
            "click",
            clearRateHistory
        );
    }


    // Start app

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
            `${API_URL}/currencies`
        );

        if (!response.ok) {
            throw new Error(
                `Currency API error: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Invalid currency data"
            );
        }

        const newCurrencies = {};

        data.forEach(currency => {

            if (
                currency &&
                typeof currency.iso_code === "string" &&
                typeof currency.name === "string" &&
                currency.iso_code.trim() &&
                currency.name.trim()
            ) {

                newCurrencies[currency.iso_code] =
                    currency.name;

            }

        });

        if (
            Object.keys(newCurrencies).length === 0
        ) {
            throw new Error(
                "No valid currencies received"
            );
        }

        currencies = newCurrencies;

        populateCurrencies();

        if (
            fromCurrency &&
            toCurrency &&
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

        if (
            fromCurrency &&
            fromCurrency.options.length === 0
        ) {
            fromCurrency.innerHTML =
                '<option value="">Currency unavailable</option>';
        }

        if (
            toCurrency &&
            toCurrency.options.length === 0
        ) {
            toCurrency.innerHTML =
                '<option value="">Currency unavailable</option>';
        }

        if (resultValue) {
            resultValue.textContent = "—";
        }

        if (rateText) {
            rateText.textContent =
                "Unable to connect to the currency service. Check your internet connection and try again.";
        }

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
        safeStorageGet("rateCheckFromCurrency") ||
        "USD";

    const selectedTo =
        toCurrency.value ||
        safeStorageGet("rateCheckToCurrency") ||
        "EUR";

    let currencyChanged = false;

    function fillDropdown(select, search, preferred) {

        const previousValue = select.value;

        const filteredList = currencyList.filter(
            ([code, name]) =>
                code.toLowerCase().includes(search) ||
                name.toLowerCase().includes(search)
        );

        const exactCodeMatch = currencyList.find(
            ([code]) => code.toLowerCase() === search
        );

        select.innerHTML = "";

        filteredList.forEach(([code, name]) => {

            const option =
                document.createElement("option");

            option.value = code;
            option.textContent = `${code} — ${name}`;

            select.appendChild(option);

        });

        let newSelection = preferred;

        if (exactCodeMatch) {

            newSelection = exactCodeMatch[0];

        } else if (filteredList.length === 1) {

            newSelection = filteredList[0][0];

        }

        if (
            filteredList.some(
                ([code]) => code === newSelection
            )
        ) {

            select.value = newSelection;

        } else if (filteredList.length > 1) {

            const preferredCurrency = currencyList.find(
                ([code]) => code === preferred
            );

            if (preferredCurrency) {

                const option =
                    document.createElement("option");

                option.value = preferredCurrency[0];

                option.textContent =
                    `${preferredCurrency[0]} — ${preferredCurrency[1]}`;

                select.insertBefore(
                    option,
                    select.firstChild
                );

                select.value = preferred;

            }

        }

        if (
            select.value &&
            previousValue !== select.value
        ) {
            currencyChanged = true;
        }

    }

    fillDropdown(
        fromCurrency,
        fromSearch,
        selectedFrom
    );

    fillDropdown(
        toCurrency,
        toSearch,
        selectedTo
    );

    if (currencyChanged) {
        convertCurrency();
    }

}


// ===============================
// GET EXCHANGE RATE
// ===============================


async function getRate(from, to) {

    // Validate currency selections

    if (
        typeof from !== "string" ||
        typeof to !== "string" ||
        !/^[A-Z]{3}$/.test(from) ||
        !/^[A-Z]{3}$/.test(to)
    ) {
        throw new Error(
            "Invalid currency selection."
        );
    }


    // Same currency

    if (from === to) {
        return 1;
    }


    // Fetch exchange rate

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


    // Validate API response

    const data = await response.json();

    if (
        !data ||
        typeof data.rate !== "number" ||
        !Number.isFinite(data.rate) ||
        data.rate <= 0
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

    // Invalidate older conversion requests
    const requestId =
        ++conversionRequestId;

    const amount =
        parseFloat(amountInput.value);

    const from =
        fromCurrency.value;

    const to =
        toCurrency.value;


    // Validate currencies first

    if (!from || !to) {

        resultValue.textContent =
            "Currency unavailable";

        rateText.textContent = "";

        return;
    }


    // Validate amount

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {

        resultValue.textContent =
            "Enter an amount";

        rateText.textContent = "";

        return;
    }


    // Save selections safely

    safeStorageSet(
        "rateCheckFromCurrency",
        from
    );

    safeStorageSet(
        "rateCheckToCurrency",
        to
    );


    resultValue.textContent =
        "Loading...";

    rateText.textContent =
        "Checking the latest market rate...";


    try {

        const rate = await getRate(from, to);

        if (requestId !== conversionRequestId) {
            return;
        }

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

        if (requestId !== conversionRequestId) {
            return;
        }

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

    if (!fromCurrency || !toCurrency) {
        return;
    }

    const currentFrom =
        fromCurrency.value;

    const currentTo =
        toCurrency.value;

    if (!currentFrom || !currentTo) {
        return;
    }

    // Clear search fields

    if (fromCurrencySearch) {
        fromCurrencySearch.value = "";
    }

    if (toCurrencySearch) {
        toCurrencySearch.value = "";
    }

    // Restore complete currency lists

    populateCurrencies();

    // Swap selected currencies

    fromCurrency.value = currentTo;
    toCurrency.value = currentFrom;


    // Save selections safely

    safeStorageSet(
        "rateCheckFromCurrency",
        currentTo
    );

    safeStorageSet(
        "rateCheckToCurrency",
        currentFrom
    );


    // Convert using swapped currencies

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

        let history = JSON.parse(
            localStorage.getItem("rateCheckHistory") || "[]"
        );

        if (!Array.isArray(history)) {
            history = [];
        }

        history.unshift({

            ...item,
            date: new Date().toISOString()

        });

        // Keep latest 10 records

        history = history.slice(0, 10);

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

        const history = JSON.parse(
            localStorage.getItem("rateCheckHistory") || "[]"
        );

        if (!Array.isArray(history)) {
            throw new Error("Invalid history data");
        }

        rateHistory.innerHTML = "";

        const validHistory = history.filter(item => {

            return (
                item &&
                Number.isFinite(item.amount) &&
                typeof item.from === "string" &&
                typeof item.to === "string" &&
                Number.isFinite(item.rate) &&
                Number.isFinite(item.result)
            );

        });

        if (validHistory.length === 0) {

            rateHistory.textContent =
                "No rate history yet.";

            return;
        }

        validHistory.slice(0, 10).forEach(item => {

            const historyItem =
                document.createElement("div");

            historyItem.className =
                "history-item";


            const strong =
                document.createElement("strong");

            strong.textContent =
                `${formatNumber(item.amount)} ${item.from} → ${formatNumber(item.result)} ${item.to}`;


            const span =
                document.createElement("span");

            span.textContent =
                `1 ${item.from} = ${formatNumber(item.rate)} ${item.to}`;


            historyItem.appendChild(strong);
            historyItem.appendChild(span);

            rateHistory.appendChild(historyItem);

        });

    } catch (error) {

        console.error(
            "Could not display history:",
            error
        );

        rateHistory.textContent =
            "Unable to display rate history.";

    }

}


// ===============================
// CLEAR HISTORY
// ===============================


function clearRateHistory() {

    try {

        localStorage.removeItem(
            "rateCheckHistory"
        );

        displayRateHistory();

    } catch (error) {

        console.error(
            "Could not clear rate history:",
            error
        );

        if (rateHistory) {
            rateHistory.textContent =
                "Unable to clear rate history.";
        }

    }

}


// ===============================
// FETCH CRYPTOCURRENCY RATES
// ===============================


async function fetchCryptoRates(forceRefresh = false) {

    const now = Date.now();


    // If a request is already running,
    // reuse it instead of creating another.

    if (cryptoRatesPromise) {
        return cryptoRatesPromise;
    }


    // Use cached prices for 60 seconds
    // unless manual refresh is requested.

    if (
        !forceRefresh &&
        Object.keys(cryptoRates).length > 0 &&
        now - cryptoRatesUpdatedAt < 60000
    ) {
        return cryptoRates;
    }


    // Fetch cryptocurrency prices.

    cryptoRatesPromise = (async () => {

        try {

            const coins = [
                "bitcoin",
                "ethereum",
                "tether",
                "binancecoin",
                "solana",
                "usd-coin",
                "ripple",
                "dogecoin"
            ];


            const response = await fetch(

                `${CRYPTO_API_URL}?ids=${coins.join(",")}&vs_currencies=usd&include_24hr_change=true`,

                {
                    cache: "no-store"
                }

            );


            if (!response.ok) {
                throw new Error(
                    `Crypto API error: ${response.status}`
                );
            }


            const data = await response.json();


            if (
                !data ||
                typeof data !== "object" ||
                Array.isArray(data)
            ) {
                throw new Error(
                    "Invalid cryptocurrency API response"
                );
            }


            cryptoRates = data;

            cryptoRatesUpdatedAt = Date.now();

            return cryptoRates;


        } finally {

            cryptoRatesPromise = null;

        }

    })();


    return cryptoRatesPromise;

}


// ===============================
// LOAD CRYPTOCURRENCY RATE
// ===============================


async function loadCryptoRate(forceRefresh = false) {

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


    // Protect against outdated requests

    const requestId =
        ++cryptoRequestId;


    cryptoPrice.textContent =
        "Loading...";

    cryptoChange.textContent =
        "Checking latest price...";


    try {

        const data =
            await fetchCryptoRates(forceRefresh);


        if (
            requestId !== cryptoRequestId ||
            coin !== cryptoCurrency.value
        ) {
            return;
        }


        if (
            !data[coin] ||
            typeof data[coin].usd !== "number" ||
            !Number.isFinite(data[coin].usd) ||
            data[coin].usd <= 0
        ) {
            throw new Error(
                "Invalid cryptocurrency price data"
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
                change >= 0 ? "+" : "";

            cryptoChange.textContent =
                `${sign}${formatNumber(change)}% (24h)`;

        } else {

            cryptoChange.textContent =
                "24h change unavailable";

        }


    } catch (error) {

        if (
            requestId !== cryptoRequestId ||
            coin !== cryptoCurrency.value
        ) {
            return;
        }

        console.error(
            "Crypto loading error:",
            error
        );

        cryptoName.textContent =
            "Cryptocurrency";

        cryptoPrice.textContent =
            "Price unavailable";

        cryptoChange.textContent =
            error && error.message
                ? `Error: ${error.message}`
                : "Unknown cryptocurrency error.";

    }

}
