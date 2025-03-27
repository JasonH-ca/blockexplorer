bitcoin = require('bitcoinjs-lib');
document.addEventListener('DOMContentLoaded', async function() {
    let apiUrl;
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    const address = urlParams.get('address');
    let ticker;
    let balanceData;
    let useBase58 = true;
    let tokenSymbol = null;
    let frc20TotalSupply = null;
    let currentPage = 1; // Track the current page
    const pageSize = 10; // Define the page size

    // Function to convert address format
    function convertAddressFormat(address) {
        if (!useBase58) {
            const decoded = bitcoin.address.fromBase58Check(address);
            return decoded.hash.toString('hex');
        } else {
            return address;
        }
    }

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
        //console.error('Error loading configuration:', error);
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
            case 'KANBAN':
                logoImg.src = 'assets/kanban.png';
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

    async function fetchTokenSymbol(contractAddress) {
        try {
            const tokenDetails = await fetchBlockchainData(`frc20/${contractAddress}`);
            if (!tokenDetails) {
                throw new Error('Error fetching FRC20 details');
            }
            return tokenDetails.symbol;
        } catch (error) {
            console.error('Error fetching token symbol:', error);
            return '';
        }
    }

    function calculateAge(blockTime) {
        const now = new Date();
        const blockDate = new Date(blockTime * 1000);
        const diff = now - blockDate;

        const diffSeconds = Math.floor(diff / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return diffDays > 1 ? `${diffDays} days` : `${diffDays} day`;
        } else if (diffHours > 0) {
            return diffHours > 1 ? `${diffHours} hrs` : `${diffHours} hr`;
        } else if (diffMinutes > 0) {
            return diffMinutes > 1 ? `${diffMinutes} mins` : `${diffMinutes} min`;
        } else {
            return diffSeconds > 1 ? `${diffSeconds} secs` : `${diffSeconds} sec`;
        }
    }

    async function displayFRC20History(frc20HistoryData) {
        const frc20HistoryContainer = document.getElementById('frc20-history-table');
        if (!frc20HistoryContainer) {
            console.error('FRC20 history container not found');
            return;
        }

        const tbody = frc20HistoryContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous history items

        for (const item of frc20HistoryData) {
            let myToken = tokenSymbol;
            if (!myToken) {
                myToken = await fetchTokenSymbol(item.contract);
            }
            const from = convertAddressFormat(item.from);
            const to = convertAddressFormat(item.to);
            const shortTxHash = item.txHash.slice(0, 6) + '...' + item.txHash.slice(-6);
            const shortFromAddress = from.slice(0, 6) + '...' + from.slice(-6);
            const shortToAddress = to.slice(0, 6) + '...' + to.slice(-6);
            const fromAddress = item.from === address ? shortFromAddress : `<a href="address.html?address=${item.from}&network=${blockchainNetwork}">${shortFromAddress}</a>`;
            const toAddress = item.to === address ? shortToAddress : `<a href="address.html?address=${item.to}&network=${blockchainNetwork}">${shortToAddress}</a>`;

            // Fetch transaction details using TxHash to get the time and method
            const transactionDetails = await fetchBlockchainData(`transaction/${item.txHash}`);
            const age = calculateAge(transactionDetails.time) + ' ago';
            const method = item.method ? item.method : 'n/a'; // Assuming method is available in history data

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="transaction.html?txid=${item.txHash}&network=${blockchainNetwork}">${shortTxHash}</a></td>
                <td>${method}</td>
                <td><a href="block.html?blockNumber=${item.blockNumber}&network=${blockchainNetwork}">${item.blockNumber.toLocaleString()}</a></td>
                <td>${age}</td>
                <td>${fromAddress}</td>
                <td>${toAddress}</td>
                <td class="right-align">${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${myToken}</td>
            `;
            tbody.appendChild(row);
        }
    }

    async function displayFRC20Holders(frc20HoldersData, page, pageSize) {
        const frc20HoldersContainer = document.getElementById('holders-table');
        if (!frc20HoldersContainer) {
            console.error('FRC20 holders container not found');
            return;
        }

        const tbody = frc20HoldersContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous holders items

        if (!frc20HoldersData) {
            console.error('Invalid FRC20 holders data');
            return;
        }

        if (!frc20TotalSupply) {
            console.error('Invalid FRC20 total supply');
            return;
        }
        const totalSupply = parseFloat(frc20TotalSupply);

        frc20HoldersData.forEach((item, index) => {
            const rank = (page - 1) * pageSize + index + 1;
            const percentage = (parseFloat(item.balance) / totalSupply) * 100;
            const converted = convertAddressFormat(item.address);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rank}</td>
                <td><a href="address.html?address=${item.address}&network=${blockchainNetwork}">${converted}</a></td>
                <td>${parseFloat(item.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}</td>
                <td>${percentage.toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    async function loadAddressDetails(page = 1, pageSize = 10) {
        const address = getQueryParam('address');
        const loadingSpinner = document.getElementById('loading-spinner');
        if (address) {
            const formattedAddress = convertAddressFormat(address);
            document.getElementById('address').textContent = formattedAddress;

            // Show loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'block';
            }

            try {
                // Fetch balance
                balanceData = await fetchBlockchainData(`balance/${address}`);
                if (balanceData !== null) {
                    document.getElementById('balance').textContent = parseFloat(balanceData.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 });
                    const addressTypeElement = document.getElementById('address-type'); // Define addressTypeElement
                    if (!balanceData.type || balanceData.type === '') {
                        addressTypeElement.classList.add('hidden');
                    } else {
                        addressTypeElement.classList.remove('hidden');
                        addressTypeElement.textContent = balanceData.type;
                    }

                    // Check if the address type is FRC20
                    if (balanceData.type === 'FRC20') {
                        document.getElementById('frc20-overview').style.display = 'block';
                        document.querySelector('[data-tab="holders"]').style.display = 'inline-block'; // Show the holders tab
                        // Hide the balance dropdown
                        document.getElementById('tokenbal-label').style.display = 'none';
                        document.getElementById('balance-dropdown').style.display = 'none';
                        // Fetch and display FRC20 token details
                        const tokenDetails = await fetchFRC20Details(address);
                        tokenSymbol = tokenDetails.symbol; // Store the token symbol
                    } else if ( blockchainNetwork === 'FAB' || blockchainNetwork === 'FABTEST' ) {
                        // Populate the balance dropdown for non-FRC20 addresses
                        const tokenBalancesData = await fetchBlockchainData(`frc20balances/address/${address}?page=${page}&pageSize=1000`);
                        if (!tokenBalancesData || tokenBalancesData.length === 0) {
                            // Hide the balance dropdown
                            document.getElementById('tokenbal-label').style.display = 'none';
                            document.getElementById('balance-dropdown').style.display = 'none';
                        } else {
                            const balanceDropdown = document.getElementById('balance-dropdown');
                            balanceDropdown.style.display = 'inline-block';
                            balanceDropdown.innerHTML = ''; // Clear previous options
                            tokenBalancesData.forEach(balance => {
                                const option = document.createElement('option');
                                option.value = balance.contract;
                                option.classList.add('monospace');
                                const converted = convertAddressFormat(balance.contract);
                                const name = `${balance.symbol}(${converted.slice(0, 6) + '...'}):    `;
                                const bal = `${parseFloat(balance.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}`;
                                option.textContent = name + bal;
                                balanceDropdown.appendChild(option);
                            });
                        }
                    } else {
                        // Hide the balance dropdown
                        document.getElementById('tokenbal-label').style.display = 'none';
                        document.getElementById('balance-dropdown').style.display = 'none';
                    }
                } else {
                    document.getElementById('balance').textContent = 'Not found';
                }

                try {
                    // Fetch history items with pagination
                    const historyData = await fetchBlockchainData(`history/${address}?page=${page}&pageSize=${pageSize}`);
                    if (historyData) {
                        await displayHistory(historyData, address);
                    } 
                    updateHistoryPagination(historyData, page, pageSize);
                } catch (error) {
                    console.error('Error fetching data:', error);
                } finally { // Hide loading spinner
                    if (loadingSpinner) {
                        loadingSpinner.style.display = 'none';
                    }
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

    async function loadFRC20History(page = 1, pageSize = 10) {
        const address = getQueryParam('address');
        const loadingSpinner = document.getElementById('loading-spinner');
        try {
            const formattedAddress = convertAddressFormat(address);
            const addressTitle = document.getElementById('address');
            if (addressTitle) {
                addressTitle.textContent = formattedAddress;
            }

            // Show loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'block';
            }

            const frc20HistoryData = await fetchBlockchainData(`frc20history/${address}?page=${page}&pageSize=${pageSize}`);
            if (frc20HistoryData) {
                displayFRC20History(frc20HistoryData);
            } 
            updateFRC20HistoryPagination(frc20HistoryData, page, pageSize);
        } catch (error) {
            console.error('Error fetching FRC20 history:', error);
        } finally {
            // Hide loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }

    async function loadHolders(page = 1, pageSize = 10) {
        const address = getQueryParam('address');
        const loadingSpinner = document.getElementById('loading-spinner');
        try {
            const formattedAddress = convertAddressFormat(address);
            document.getElementById('address').textContent = formattedAddress;

            // Show loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'block';
            }

            const frc20HoldersData = await fetchBlockchainData(`frc20balances/contract/${address}?page=${page}&pageSize=${pageSize}`);
            if (frc20HoldersData) {
                displayFRC20Holders(frc20HoldersData, page, pageSize);
            } 
            updateFRC20HoldersPagination(frc20HoldersData, page, pageSize);
        } catch (error) {
            console.error('Error fetching FRC20 holders:', error);
        } finally {
            // Hide loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
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
        const historyContainer = document.getElementById('history-table');
        if (!historyContainer) {
            console.error('History container not found');
            return;
        }
        historyContainer.innerHTML = ''; // Clear previous history items

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

        historyContainer.appendChild(tbody);
    }

    // Function to setup pagination for history data
    function updateHistoryPagination(historyData, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = historyData ? historyData.length : 0;
        const prevPageButton = document.getElementById('prev-page');
        const nextPageButton = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    function updateFRC20HistoryPagination(frc20HistoryData, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = frc20HistoryData ? frc20HistoryData.length : 0;
        const prevPageButton = document.getElementById('frc20-prev-page');
        const nextPageButton = document.getElementById('frc20-next-page');
        const pageInfo = document.getElementById('frc20-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    function updateFRC20HoldersPagination(frc20HoldersData, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = frc20HoldersData ? frc20HoldersData.length : 0;
        const prevPageButton = document.getElementById('holders-prev-page');
        const nextPageButton = document.getElementById('holders-next-page');
        const pageInfo = document.getElementById('holders-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    async function fetchFRC20Details(address) {
        try {
            const tokenDetails = await fetchBlockchainData(`frc20/${address}`);
            if (!tokenDetails) {
                throw new Error('Error fetching FRC20 details');
            }

            frc20TotalSupply = tokenDetails.totalSupply;

            document.getElementById('token-name').textContent = tokenDetails.name;
            document.getElementById('token-symbol').textContent = tokenDetails.symbol;
            document.getElementById('total-supply').textContent = parseFloat(tokenDetails.totalSupply).toLocaleString('en-US') + ' ' + tokenDetails.symbol; 
            document.getElementById('token-contract').textContent = convertAddressFormat(balanceData.address);
            const ownerElement = document.getElementById('owner');
            ownerElement.textContent = convertAddressFormat(tokenDetails.owner);
            ownerElement.href = `address.html?address=${tokenDetails.owner}&network=${blockchainNetwork}`;
            document.getElementById('decimals').textContent = tokenDetails.decimals;

            const createdElement = document.getElementById('created');
            createdElement.textContent = tokenDetails.createtx;
            createdElement.href = `transaction.html?txid=${tokenDetails.createtx}&network=${blockchainNetwork}`;

            return tokenDetails; // Return token details
        } catch (error) {
            console.error('Error fetching FRC20 details:', error);
            return null;
        }
    }

    // Event listeners for pagination buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadAddressDetails(currentPage, pageSize);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        loadAddressDetails(currentPage, pageSize);
    });

    document.getElementById('frc20-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadFRC20History(currentPage, pageSize);
        }
    });

    document.getElementById('frc20-next-page').addEventListener('click', () => {
        currentPage++;
        loadFRC20History(currentPage, pageSize);
    });

    document.getElementById('holders-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadHolders(currentPage, pageSize);
        }
    });

    document.getElementById('holders-next-page').addEventListener('click', () => {
        currentPage++;
        loadHolders(currentPage, pageSize);
    });

    document.getElementById('logo-link').href = `../index.html?network=${blockchainNetwork}`;
    const tickerElement = document.getElementById('ticker');
    if (tickerElement) {
        tickerElement.textContent = ticker;
    }

    // Tab switching logic
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');

            if (button.dataset.tab === 'history') {
                loadAddressDetails();
            } else if (button.dataset.tab === 'frc20-history') {
                loadFRC20History();
            } else if (button.dataset.tab === 'holders') {
                loadHolders();
            }
        });
    });

    // Event listener for address format toggle
    document.getElementById('address-format').addEventListener('change', (event) => {
        useBase58 = event.target.checked;
        const activeTab = document.querySelector('.tab-button.active').dataset.tab;
        if (activeTab === 'history') {
            loadAddressDetails(currentPage, pageSize);
        } else if (activeTab === 'frc20-history') {
            const address = getQueryParam('address');
            fetchFRC20Details(address);
            loadFRC20History(currentPage, pageSize);
        } else if (activeTab === 'holders') {
            const address = getQueryParam('address');
            fetchFRC20Details(address);
            loadHolders(currentPage, pageSize);
        }
    });

    // Hide holders tab by default
    document.querySelector('[data-tab="holders"]').style.display = 'none';

    // Initial load
    loadAddressDetails(currentPage, pageSize);
});
