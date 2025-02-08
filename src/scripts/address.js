document.addEventListener('DOMContentLoaded', async function() {
    let apiUrl;
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    let ticker;

    try {
        const response = await fetch('./config/environment.json');
        const config = await response.json();
        const environment = config.environment; // Get the current environment (debug or production)
        apiUrl = config.apiServers[environment][blockchainNetwork];
        if (!apiUrl) {
            throw new Error(`API server not configured for ${blockchainNetwork}`);
        }
        updateLogo(blockchainNetwork);
        if (blockchainNetwork.endsWith("TEST")) {
            ticker = blockchainNetwork.slice(0, -4);
        } else {
            ticker = blockchainNetwork;
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        return;
    }

    // Function to update the logo based on the selected network
    function updateLogo(network) {
        const logoImg = document.getElementById('logo-img');
        switch (network) {
            case 'FAB':
                logoImg.src = 'assets/fab-logo-o.png';
                break;
            case 'LTC':
                logoImg.src = 'assets/ltc-logo.png';
                break;
            case 'DOGE':
                logoImg.src = 'assets/doge-logo.png';
                break;
            case 'BCH':
                logoImg.src = 'assets/bch-logo.png';
                break;
            case 'FABTEST':
                logoImg.src = 'assets/fab-logo-t.png';
                break;
            default:
                logoImg.src = 'assets/fab-logo-o.png';
        }
    }

    // Function to fetch blockchain data
    async function fetchBlockchainData(endpoint) {
        try {
            const response = await fetch(`${apiUrl}${blockchainNetwork}/${endpoint}`);
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async function loadAddressDetails(page = 1, pageSize = 10) {
        const address = getQueryParam('address');
        if (address) {
            document.getElementById('address').textContent = address;

            // Show loading spinner
            const loadingSpinner = document.getElementById('loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.style.display = 'block';
            }

            try {
                // Fetch balance
                const balanceData = await fetchBlockchainData(`balance/${address}`);
                if (balanceData !== null) {
                    document.getElementById('balance').textContent = parseFloat(balanceData.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 });
                    if ( !balanceData.type || balanceData.type === '') {
                        addressTypeElement.classList.add('hidden');
                    } else {
                        addressTypeElement.classList.remove('hidden');
                        document.getElementById('address-type').textContent = balanceData.type;
                    }
                } else {
                    document.getElementById('balance').textContent = 'Not found';
                }

                // Fetch history items with pagination
                const historyData = await fetchBlockchainData(`history/${address}?page=${page}&pageSize=${pageSize}`);
                if (historyData) {
                    await displayHistory(historyData, address);
                    setupHistoryPagination(historyData, page, pageSize);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                // Hide loading spinner
                if (loadingSpinner) {
                    loadingSpinner.style.display = 'none';
                }
            }
        }
    }

    // Function to get query parameter
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Function to display history data
    async function displayHistory(historyData, specificAddress) {
        const historyContainer = document.getElementById('history');
        if (!historyContainer) {
            console.error('History container not found');
            return;
        }
        historyContainer.innerHTML = ''; // Clear previous history items

        const table = document.createElement('table');
        table.className = 'history-table';

        const tbody = document.createElement('tbody');

        for (const item of historyData) {
            const transactionDetails = await fetchBlockchainData(`transaction/${item.txHash}`);
            const row = document.createElement('tr');

            // Get transaction time
            const transactionTime = new Date(transactionDetails.time * 1000).toLocaleString();

            // Filter out coinbase transactions from vin and get amount
            const vinPromises = transactionDetails.vin
                .filter(vin => !vin.coinbase)
                .map(async vin => {
                    const vinDetails = await fetchBlockchainData(`transaction/${vin.txid}`);
                    const vinAddress = vinDetails.vout[vin.vout].scriptPubKey.addresses ? vinDetails.vout[vin.vout].scriptPubKey.addresses.join(', ') : 'n/a';
                    const vinAmount = vinDetails.vout[vin.vout].value;
                    if (vinAddress !== specificAddress) return ''; // Skip if address is different
                    return `
                        <div>
                            <p>-${parseFloat(vinAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${ticker}</p>
                        </div>
                    `;
                });

            const vin = (await Promise.all(vinPromises)).join('');

            const vout = transactionDetails.vout
                .filter(vout => vout.value > 0) // Filter out zero amount vout
                .map(vout => {
                    const voutAddress = vout.scriptPubKey.addresses ? vout.scriptPubKey.addresses.join(', ') : 'n/a';
                    if (voutAddress !== specificAddress) return ''; // Skip if address is different
                    return `
                        <div class="vout">
                            <p>+${parseFloat(vout.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${ticker}</p>
                        </div>
                    `;
                }).join('');

            row.innerHTML = `
                <td class="transaction-cell">
                    <div class="transaction-header">
                        <span><a href="transaction.html?txid=${item.txHash}&network=${blockchainNetwork}">${item.txHash}</a></span>
                        <span>${transactionTime}</span>
                    </div>
                    <div class="confirmations">
                        <span class="greyed-out">Confirmations </span>
                        <span class="black-text">${transactionDetails.confirmations.toLocaleString()}</span>
                    </div>
                    <div class="vin">${vin}</div>
                    <div class="vout">${vout}</div>
                </td>
            `;
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        historyContainer.appendChild(table);
    }

    // Function to setup pagination for history data
    function setupHistoryPagination(historyData, currentPage, pageSize) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) {
            console.error('Pagination container not found');
            return;
        }
        paginationContainer.innerHTML = ''; // Clear previous pagination buttons

        const totalPages = Math.ceil(historyData.total / pageSize);

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.classList.toggle('disabled', currentPage === 1);
        prevButton.addEventListener('click', () => loadAddressDetails(currentPage - 1, pageSize));
        paginationContainer.appendChild(prevButton);

        // Next button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.classList.toggle('disabled', currentPage === totalPages);
        nextButton.addEventListener('click', () => loadAddressDetails(currentPage + 1, pageSize));
        paginationContainer.appendChild(nextButton);
    }

    document.getElementById('logo-link').href = `../index.html?network=${blockchainNetwork}`;
    document.getElementById('ticker').textContent = ticker;

    // Call the function to load address details
    loadAddressDetails();
});
