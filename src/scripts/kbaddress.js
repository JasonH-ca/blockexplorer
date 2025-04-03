document.addEventListener('DOMContentLoaded', async function() {
    let apiUrl;
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    const address = urlParams.get('address');
    const ticker = 'FAB';
    let balanceData;
    let useBase58 = false;
    let tokenSymbol = null;
    let erc20TotalSupply = null;
    let currentPage = 1; // Track the current page
    const pageSize = 10; // Define the page size
    let config, environment;

    try {
        const response = await fetch('./config/environment.json');
        config = await response.json();
        environment = config.environment; // Get the current environment (debug or production)
        apiUrl = config.apiServers[environment][blockchainNetwork];
        if (!apiUrl) {
            throw new Error(`API server not configured for ${blockchainNetwork}`);
        }
        updateLogo(blockchainNetwork);
    } catch (error) {
        //console.error('Error loading configuration:', error);
        return;
    }

    function convertAddressFormat(address) {
        return address;
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
            const tokenDetails = await fetchBlockchainData(`addressinfo/${contractAddress}`);
            if (!tokenDetails) {
                throw new Error('Error fetching ERC20 details');
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

    async function displayERC20History(erc20HistoryData) {
        const erc20HistoryContainer = document.getElementById('erc20-history-table');
        if (!erc20HistoryContainer) {
            console.error('ERC20 history container not found');
            return;
        }

        const tbody = erc20HistoryContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous history items

        for (const item of erc20HistoryData) {
            let myToken = tokenSymbol;
            if (!myToken) {
                myToken = await fetchTokenSymbol(item.contract);
            }
            const from = convertAddressFormat(item.from);
            const to = convertAddressFormat(item.to);
            const shortTxHash = item.txHash.slice(0, 8) + '...' + item.txHash.slice(-6);
            const shortFromAddress = from.slice(0, 8) + '...' + from.slice(-6);
            const shortToAddress = to.slice(0, 8) + '...' + to.slice(-6);
            const fromAddress = item.from === address ? shortFromAddress : `<a href="kbaddress.html?address=${item.from}&network=${blockchainNetwork}">${shortFromAddress}</a>`;
            const toAddress = item.to === address ? shortToAddress : `<a href="kbaddress.html?address=${item.to}&network=${blockchainNetwork}">${shortToAddress}</a>`;

            // Fetch transaction details using TxHash to get the time and method
            const blockDetails = await fetchBlockchainData(`block/${item.blockNumber}`);
            const age = calculateAge(blockDetails.timestamp) + ' ago';
            const method = item.method ? item.method : 'n/a'; // Assuming method is available in history data

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="kbtransaction.html?txid=${item.txHash}&network=${blockchainNetwork}">${shortTxHash}</a></td>
                <td>${method}</td>
                <td><a href="kbblock.html?blockNumber=${item.blockNumber}&network=${blockchainNetwork}">${item.blockNumber.toLocaleString()}</a></td>
                <td>${age}</td>
                <td>${fromAddress}</td>
                <td>${toAddress}</td>
                <td class="right-align">${parseFloat(item.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${myToken}</td>
            `;
            tbody.appendChild(row);
        }
    }

    async function displayERC20Holders(erc20HoldersData, page, pageSize) {
        const erc20HoldersContainer = document.getElementById('holders-table');
        if (!erc20HoldersContainer) {
            console.error('ERC20 holders container not found');
            return;
        }

        const tbody = erc20HoldersContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous holders items

        if (!erc20HoldersData) {
            console.error('Invalid ERC20 holders data');
            return;
        }

        if (!erc20TotalSupply) {
            console.error('Invalid ERC20 total supply');
            return;
        }
        const totalSupply = parseFloat(erc20TotalSupply);

        erc20HoldersData.forEach((item, index) => {
            const rank = (page - 1) * pageSize + index + 1;
            const percentage = (parseFloat(item.balance) / totalSupply) * 100;
            const converted = convertAddressFormat(item.address);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rank}</td>
                <td><a href="kbaddress.html?address=${item.address}&network=${blockchainNetwork}">${converted}</a></td>
                <td>${parseFloat(item.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}</td>
                <td>${percentage.toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    async function displayV2TransferHistory(v2transferhistory) {
        const v2TransferContainer = document.getElementById('v2-transfer-table');
        if (!v2TransferContainer) {
            console.error('v2 transfer history container not found');
            return;
        }

        const tbody = v2TransferContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous history items

        for (const item of v2transferhistory) {
            const from = convertAddressFormat(item.from);
            const to = convertAddressFormat(item.to);
            const shortTxHash = item.txHash.slice(0, 8) + '...' + item.txHash.slice(-6);
            const shortFromAddress = from.slice(0, 8) + '...' + from.slice(-6);
            const shortToAddress = to.slice(0, 8) + '...' + to.slice(-6);
            const fromAddress = item.from === address ? shortFromAddress : `<a href="kbaddress.html?address=${item.from}&network=${blockchainNetwork}">${shortFromAddress}</a>`;
            const toAddress = item.to === address ? shortToAddress : `<a href="kbaddress.html?address=${item.to}&network=${blockchainNetwork}">${shortToAddress}</a>`;

            // Fetch transaction details using TxHash to get the time and method
            const blockDetails = await fetchBlockchainData(`block/${item.blockNumber}`);
            const age = calculateAge(blockDetails.timestamp) + ' ago';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="kbtransaction.html?txid=${item.txHash}&network=${blockchainNetwork}">${shortTxHash}</a></td>
                <td><a href="kbblock.html?blockNumber=${item.blockNumber}&network=${blockchainNetwork}">${item.blockNumber.toLocaleString()}</a></td>
                <td>${age}</td>
                <td>${fromAddress}</td>
                <td>${toAddress}</td>
                <td class="right-align">${parseFloat(item.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${item.token}</td>
            `;
            tbody.appendChild(row);
        }
    }

    async function displayV2CrosschainHistory(v2crosschainhistory) {
        const v2CrosschainContainer = document.getElementById('v2-crosschain-table');
        if (!v2CrosschainContainer) {
            console.error('v2 crosschain history container not found');
            return;
        }

        const tbody = v2CrosschainContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous history items

        for (const item of v2crosschainhistory) {
            const to = convertAddressFormat(item.recipient);
            const shortTxHash = item.request.slice(0, 8) + '...' + item.request.slice(-6);
            const shortToAddress = to.slice(0, 8) + '...' + to.slice(-6);
            const toAddress = to === address ? shortToAddress : `<a href="kbaddress.html?address=${to}&network=${blockchainNetwork}">${shortToAddress}</a>`;
            
            // Fetch transaction details using TxHash to get the time and method
            const blockDetails = await fetchBlockchainData(`block/${item.blockNumber}`);
            const age = calculateAge(blockDetails.timestamp) + ' ago';

            let process;
            if (item.deposit) {
                const txUrl = getTxUrl(item.txHash, blockchainNetwork); // Call getTxUrl to generate the hyperlink
                const shortTxHash = item.txHash.slice(0, 8) + '...' + item.txHash.slice(-6);
                process = `<a href="${txUrl}" target="_blank" class="tx-link">${shortTxHash}</a>`;

                // Add event listener to open the link in a popup window
                setTimeout(() => {
                    const txLink = document.querySelector(`.tx-link[href="${txUrl}"]`);
                    if (txLink) {
                        const openInPopup = (event) => {
                            event.preventDefault(); // Prevent the default link behavior
                            const url = txLink.href;
                            window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                        };

                        // Add event listeners for both click and touchstart
                        txLink.addEventListener('click', openInPopup);
                        txLink.addEventListener('touchstart', openInPopup);
                    }
                }, 0);
            } else {
                const uniqueId = `txHashDropdown-${item.request}`; // Unique ID for each dropdown
                process = `<select class="txHashDropdown" id="${uniqueId}">`;
                item.txHashes.forEach(txHash => {
                    if (txHash.length < 14) {
                        return;
                    }
                    const txUrl = getTxUrl(txHash, item.chain); // Call getTxUrl to generate the hyperlink
                    const shortTxHash = txHash.slice(0, 8) + '...' + txHash.slice(-6);
                    process += `<option value="${txUrl}">${shortTxHash}</option>`;
                });
                process += `</select>`;

                // Add event listeners to handle redirection
                setTimeout(() => {
                    const dropdown = document.getElementById(uniqueId);
                    if (dropdown) {
                        // Open in a new popup window on click
                        dropdown.addEventListener('click', () => {
                            const selectedValue = dropdown.value;
                            if (selectedValue) {
                                window.open(selectedValue, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                            }
                        });

                        // Open in a new popup window on touchstart (for mobile devices)
                        dropdown.addEventListener('touchstart', () => {
                            const selectedValue = dropdown.value;
                            if (selectedValue) {
                                window.open(selectedValue, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                            }
                        });

                        // Open in a new popup window on change (for cases where the user selects a different option)
                        dropdown.addEventListener('change', (event) => {
                            const selectedValue = event.target.value;
                            if (selectedValue) {
                                window.open(selectedValue, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                            }
                        });
                    }
                }, 0);
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${getTxUrl(item.request, item.deposit ? item.chain : blockchainNetwork)}" class="tx-link">${shortTxHash}</a></td>
                <td>${item.deposit ? 'deposit' : 'withdraw'}</td>
                <td><a href="kbblock.html?blockNumber=${item.blockNumber}&network=${blockchainNetwork}">${item.blockNumber.toLocaleString()}</a></td>
                <td>${age}</td>
                <td>${toAddress}</td>
                <td>${item.chain}</td>
                <td>${process}</td>
                <td class="right-align">${parseFloat(item.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${item.token}</td>
            `;
            tbody.appendChild(row);

            // Add event listeners to the first <a> tag to open in a new popup window
            const txLink = row.querySelector('.tx-link');
            if (txLink) {
                const openInPopup = (event) => {
                    event.preventDefault(); // Prevent the default link behavior
                    const url = txLink.href;
                    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                };

                // Add event listeners for both click and touchstart
                txLink.addEventListener('click', openInPopup);
                txLink.addEventListener('touchstart', openInPopup);
            }
        }
    }

    async function displayV3CrosschainHistory(v3crosschainhistory) {
        const v3CrosschainContainer = document.getElementById('v3-crosschain-table');
        if (!v3CrosschainContainer) {
            console.error('v3 crosschain history container not found');
            return;
        }

        const tbody = v3CrosschainContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous history items

        for (const item of v3crosschainhistory) {
            const to = convertAddressFormat(item.recipient);
            const shortTxHash = item.request.slice(0, 8) + '...' + item.request.slice(-6);
            const shortToAddress = to.slice(0, 8) + '...' + to.slice(-6);
            const toAddress = to === address ? shortToAddress : `<a href="kbaddress.html?address=${to}&network=${blockchainNetwork}">${shortToAddress}</a>`;
            
            // Fetch transaction details using TxHash to get the time and method
            const blockDetails = await fetchBlockchainData(`block/${item.blockNumber}`);
            const age = calculateAge(blockDetails.timestamp) + ' ago';

            let process;
            if (item.deposit) {
                const txUrl = getTxUrl(item.txHash, blockchainNetwork); // Call getTxUrl to generate the hyperlink
                const shortTxHash = item.txHash.slice(0, 8) + '...' + item.txHash.slice(-6);
                process = `<a href="${txUrl}" target="_blank" class="tx-link">${shortTxHash}</a>`;

                // Add event listener to open the link in a popup window
                setTimeout(() => {
                    const txLink = document.querySelector(`.tx-link[href="${txUrl}"]`);
                    if (txLink) {
                        const openInPopup = (event) => {
                            event.preventDefault(); // Prevent the default link behavior
                            const url = txLink.href;
                            window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                        };

                        // Add event listeners for both click and touchstart
                        txLink.addEventListener('click', openInPopup);
                        txLink.addEventListener('touchstart', openInPopup);
                    }
                }, 0);
            } else {
                const uniqueId = `txHashDropdown-${item.request}`; // Unique ID for each dropdown
                process = `<select class="txHashDropdown" id="${uniqueId}">`;
                item.txHashes.forEach(txHash => {
                    if (txHash.length < 14) {
                        return;
                    }
                    const txUrl = getTxUrl(txHash, item.chain); // Call getTxUrl to generate the hyperlink
                    const shortTxHash = txHash.slice(0, 8) + '...' + txHash.slice(-6);
                    process += `<option value="${txUrl}">${shortTxHash}</option>`;
                });
                process += `</select>`;

                // Add event listeners to handle redirection
                setTimeout(() => {
                    const dropdown = document.getElementById(uniqueId);
                    if (dropdown) {
                        // Open in a new popup window on click
                        dropdown.addEventListener('click', () => {
                            const selectedValue = dropdown.value;
                            if (selectedValue) {
                                window.open(selectedValue, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                            }
                        });

                        // Open in a new popup window on touchstart (for mobile devices)
                        dropdown.addEventListener('touchstart', () => {
                            const selectedValue = dropdown.value;
                            if (selectedValue) {
                                window.open(selectedValue, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                            }
                        });

                        // Open in a new popup window on change (for cases where the user selects a different option)
                        dropdown.addEventListener('change', (event) => {
                            const selectedValue = event.target.value;
                            if (selectedValue) {
                                window.open(selectedValue, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                            }
                        });
                    }
                }, 0);
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${getTxUrl(item.request, item.deposit ? item.chain : blockchainNetwork)}" class="tx-link">${shortTxHash}</a></td>
                <td>${item.deposit ? 'deposit' : 'withdraw'}</td>
                <td><a href="kbblock.html?blockNumber=${item.blockNumber}&network=${blockchainNetwork}">${item.blockNumber.toLocaleString()}</a></td>
                <td>${age}</td>
                <td>${toAddress}</td>
                <td>${item.chain}</td>
                <td>${process}</td>
                <td class="right-align">${parseFloat(item.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${item.token}</td>
            `;
            tbody.appendChild(row);

            // Add event listeners to the first <a> tag to open in a new popup window
            const txLink = row.querySelector('.tx-link');
            if (txLink) {
                const openInPopup = (event) => {
                    event.preventDefault(); // Prevent the default link behavior
                    const url = txLink.href;
                    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes'); // Open in a new popup window
                };

                // Add event listeners for both click and touchstart
                txLink.addEventListener('click', openInPopup);
                txLink.addEventListener('touchstart', openInPopup);
            }
        }
    }

    // Function to generate transaction URL
    function getTxUrl(txHash, chain) {
        if (chain === 'KANBAN') {
            return `kbtransaction.html?txid=${txHash}&network=${chain}`;
        }
        const txUrl = config.explorers[chain];
        let explorerUrl = "";
        switch (chain) {
            case 'FAB':
            case 'LTC':
            case 'DOGE':
            case 'BCH':
            case 'FABTEST':
                explorerUrl = `transaction.html?txid=${txHash.startsWith('0x') ? txHash.slice(2) : txHash}&network=${chain}`;
                break;
            case 'BTC':
            case 'TRX':
                explorerUrl = `${txUrl}${txHash.startsWith('0x') ? txHash.slice(2) : txHash}`;
                break;

            case 'ETH':
            case 'BSC':
            case 'MATIC':
                explorerUrl = `${txUrl}${txHash}`;
                break;

            default:
                console.error(`Unsupported chain: ${chain}`);
                explorerUrl = "";
                break;
        }
        return explorerUrl;
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
                const addressinfo = await fetchBlockchainData(`addressinfo/${address}`);
                if (balanceData !== null) {
                    document.getElementById('balance').textContent = parseFloat(balanceData.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }) + ' ' + ticker;
                    const addressTypeElement = document.getElementById('address-type'); // Define addressTypeElement                    
                    if (!addressinfo.type || addressinfo.type === 'regular') {
                        addressTypeElement.classList.add('hidden');
                    } else {
                        addressTypeElement.classList.remove('hidden');
                        addressTypeElement.textContent = addressinfo.type;
                    }

                    // Check if the address type is ERC20
                    if (addressinfo.type === 'ERC20') {
                        document.getElementById('erc20-overview').style.display = 'block';
                        document.querySelector('[data-tab="holders"]').style.display = 'inline-block'; // Show the holders tab
                        // Hide the balance dropdown
                        document.getElementById('tokenbal-label').style.display = 'none';
                        document.getElementById('balance-dropdown').style.display = 'none';
                        document.querySelector('[data-tab="v2-transfer"]').style.display = 'none';
                        document.querySelector('[data-tab="v2-crosschain"]').style.display = 'none';
                        document.querySelector('[data-tab="v3-crosschain"]').style.display = 'none';
                        // Fetch and display ERC20 token details
                        const tokenDetails = await fetchERC20Details(address);
                        tokenSymbol = tokenDetails.symbol; // Store the token symbol
                    } else {
                        if ( addressinfo.type === 'contract' ) {
                            document.getElementById('contract-overview').style.display = 'block';
                            const createdElement = document.getElementById('contract-created');
                            createdElement.textContent = addressinfo.createtx;
                            createdElement.href = `kbtransaction.html?txid=${addressinfo.createtx}&network=${blockchainNetwork}`;

                            // Hide the balance dropdown
                            document.getElementById('tokenbal-label').style.display = 'none';
                            document.getElementById('balance-dropdown').style.display = 'none';

                            document.querySelector('[data-tab="erc20-history"]').style.display = 'none';
                            document.querySelector('[data-tab="v2-transfer"]').style.display = 'none';
                            document.querySelector('[data-tab="v2-crosschain"]').style.display = 'none';
                            document.querySelector('[data-tab="v3-crosschain"]').style.display = 'none';
                        }

                        // Populate the balance dropdown for non-ERC20 addresses
                        const tokenBalancesData = await fetchBlockchainData(`erc20balances/address/${address}?page=${page}&pageSize=1000`);
                        const v2BalancesData = await fetchBlockchainData(`v2balances/address/${address}?page=${page}&pageSize=1000`);
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
                        if (!v2BalancesData || v2BalancesData.length === 0) {
                            // Hide the balance dropdown
                            document.getElementById('v2-tokenbal-label').style.display = 'none';
                            document.getElementById('v2-balance-dropdown').style.display = 'none';
                        } else {
                            const balanceDropdown = document.getElementById('v2-balance-dropdown');
                            balanceDropdown.style.display = 'inline-block';
                            balanceDropdown.innerHTML = ''; // Clear previous options
                            v2BalancesData.forEach(balance => {
                                const option = document.createElement('option');
                                option.classList.add('monospace');
                                const name = `${balance.tokenId}:    `;
                                const bal = `${parseFloat(balance.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}`;
                                option.textContent = name + bal;
                                balanceDropdown.appendChild(option);
                            });
                        }
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

    async function loadERC20History(page = 1, pageSize = 10) {
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

            const erc20HistoryData = await fetchBlockchainData(`erc20history/${address}?page=${page}&pageSize=${pageSize}`);
            if (erc20HistoryData) {
                displayERC20History(erc20HistoryData);
            } 
            updateERC20HistoryPagination(erc20HistoryData, page, pageSize);
        } catch (error) {
            console.error('Error fetching ERC20 history:', error);
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

            const erc20HoldersData = await fetchBlockchainData(`erc20balances/contract/${address}?page=${page}&pageSize=${pageSize}`);
            if (erc20HoldersData) {
                displayERC20Holders(erc20HoldersData, page, pageSize);
            } 
            updateERC20HoldersPagination(erc20HoldersData, page, pageSize);
        } catch (error) {
            console.error('Error fetching ERC20 holders:', error);
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

        const tbody = historyContainer.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous history items

        for (const item of historyData) {
            // Fetch block details to get the block time
            const blockDetails = await fetchBlockchainData(`block/${item.blockNumber}`);
            const blockTime = blockDetails ? blockDetails.timestamp : null;
            const transactionTime = blockTime ? calculateAge(blockTime) : 'N/A'; // Assuming you have a function to calculate the age
            const amount = parseFloat(item.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 });

            const shortTxHash = item.txHash.slice(0, 8) + '...' + item.txHash.slice(-6);
            const shortFromAddress = item.from.slice(0, 8) + '...' + item.from.slice(-6);
            const shortToAddress = item.to.slice(0, 8) + '...' + item.to.slice(-6);

            const fromAddress = item.from === specificAddress ? shortFromAddress : `<a href="kbaddress.html?address=${item.from}&network=${blockchainNetwork}">${shortFromAddress}</a>`;
            const toAddress = item.to === specificAddress ? shortToAddress : `<a href="kbaddress.html?address=${item.to}&network=${blockchainNetwork}">${shortToAddress}</a>`;
            const method = item.method ? item.method : 'n/a'; // Assuming method is available in history data

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="kbtransaction.html?txid=${item.txHash}&network=${blockchainNetwork}">${shortTxHash}</a></td>
                <td>${method}</td>
                <td><a href="kbblock.html?blockNumber=${item.blockNumber}&network=${blockchainNetwork}">${item.blockNumber.toLocaleString()}</a></td>
                <td>${transactionTime}</td>
                <td>${fromAddress}</td>
                <td>${toAddress}</td>
                <td>${amount}</td>
            `;
            tbody.appendChild(row);
        }
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

    function updateERC20HistoryPagination(erc20HistoryData, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = erc20HistoryData ? erc20HistoryData.length : 0;
        const prevPageButton = document.getElementById('erc20-prev-page');
        const nextPageButton = document.getElementById('erc20-next-page');
        const pageInfo = document.getElementById('erc20-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    function updateERC20HoldersPagination(erc20HoldersData, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = erc20HoldersData ? erc20HoldersData.length : 0;
        const prevPageButton = document.getElementById('holders-prev-page');
        const nextPageButton = document.getElementById('holders-next-page');
        const pageInfo = document.getElementById('holders-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    function updateV2TransferPagination(v2transferhistory, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = v2transferhistory ? v2transferhistory.length : 0;
        const prevPageButton = document.getElementById('v2t-prev-page');
        const nextPageButton = document.getElementById('v2t-next-page');
        const pageInfo = document.getElementById('v2t-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    function updateV2CrosschainPagination(v2crosschainhistory, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = v2crosschainhistory ? v2crosschainhistory.length : 0;
        const prevPageButton = document.getElementById('v2c-prev-page');
        const nextPageButton = document.getElementById('v2c-next-page');
        const pageInfo = document.getElementById('v2c-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    function updateV3CrosschainPagination(v3crosschainhistory, page, pageSize) {
        currentPage = page; // Update the current page
        const dataLength = v3crosschainhistory ? v3crosschainhistory.length : 0;
        const prevPageButton = document.getElementById('v3c-prev-page');
        const nextPageButton = document.getElementById('v3c-next-page');
        const pageInfo = document.getElementById('v3c-page-info');

        prevPageButton.disabled = page === 1;
        nextPageButton.disabled = dataLength < pageSize;
        pageInfo.textContent = `${page}`;
    }

    async function fetchERC20Details(address) {
        try {
            const tokenDetails = await fetchBlockchainData(`erc20/${address}`);
            if (!tokenDetails) {
                throw new Error('Error fetching ERC20 details');
            }

            erc20TotalSupply = tokenDetails.totalSupply;

            document.getElementById('token-name').textContent = tokenDetails.name;
            document.getElementById('token-symbol').textContent = tokenDetails.symbol;
            document.getElementById('total-supply').textContent = parseFloat(tokenDetails.totalSupply).toLocaleString('en-US') + ' ' + tokenDetails.symbol; 
            document.getElementById('token-contract').textContent = convertAddressFormat(balanceData.address);
            const ownerElement = document.getElementById('owner');
            ownerElement.textContent = convertAddressFormat(tokenDetails.owner);
            ownerElement.href = `kbaddress.html?address=${tokenDetails.owner}&network=${blockchainNetwork}`;
            document.getElementById('decimals').textContent = tokenDetails.decimals;

            const createdElement = document.getElementById('created');
            createdElement.textContent = tokenDetails.createtx;
            createdElement.href = `kbtransaction.html?txid=${tokenDetails.createtx}&network=${blockchainNetwork}`;

            return tokenDetails; // Return token details
        } catch (error) {
            console.error('Error fetching ERC20 details:', error);
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

    document.getElementById('erc20-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadERC20History(currentPage, pageSize);
        }
    });
    document.getElementById('erc20-next-page').addEventListener('click', () => {
        currentPage++;
        loadERC20History(currentPage, pageSize);
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

    document.getElementById('v2t-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadV2Transfer(currentPage, pageSize);
        }
    });
    document.getElementById('v2t-next-page').addEventListener('click', () => {
        currentPage++;
        loadV2Transfer(currentPage, pageSize);
    });

    document.getElementById('v2c-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadV2Crosschain(currentPage, pageSize);
        }
    });
    document.getElementById('v2c-next-page').addEventListener('click', () => {
        currentPage++;
        loadV2Crosschain(currentPage, pageSize);
    });

    document.getElementById('v3c-prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadV3Crosschain(currentPage, pageSize);
        }
    });
    document.getElementById('v3c-next-page').addEventListener('click', () => {
        currentPage++;
        loadV3Crosschain(currentPage, pageSize);
    });

    document.getElementById('logo-link').href = `../kanban.html?network=${blockchainNetwork}`;

    // Tab switching logic
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');

            if (button.dataset.tab === 'history') {
                loadAddressDetails();
            } else if (button.dataset.tab === 'erc20-history') {
                loadERC20History();
            } else if (button.dataset.tab === 'holders') {
                loadHolders();
            } else if (button.dataset.tab === 'v2-transfer') {
                loadV2Transfer();
            } else if (button.dataset.tab === 'v2-crosschain') {
                loadV2Crosschain();
            } else if (button.dataset.tab === 'v3-crosschain') {
                loadV3Crosschain();
            }
        });
    });

    // Function to load v2 transfer content
    async function loadV2Transfer(page = 1, pageSize = 10) {
        // Add your logic to load v2 transfer content here
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

            const v2transferhistory = await fetchBlockchainData(`v2transferhistory/${address}?page=${page}&pageSize=${pageSize}`);
            if (v2transferhistory) {
                displayV2TransferHistory(v2transferhistory);
            } 
            updateV2TransferPagination(v2transferhistory, page, pageSize);
        } catch (error) {
            console.error('Error fetching ERC20 history:', error);
        } finally {
            // Hide loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }

    async function loadV2Crosschain(page = 1, pageSize = 10) {
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

            const v2crosschainhistory = await fetchBlockchainData(`v2crosschain/${address}?page=${page}&pageSize=${pageSize}`);
            if (v2crosschainhistory) {
                displayV2CrosschainHistory(v2crosschainhistory);
            } 
            updateV2CrosschainPagination(v2crosschainhistory, page, pageSize);
        } catch (error) {
            console.error('Error fetching v2 crosschain history:', error);
        } finally {
            // Hide loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }

    async function loadV3Crosschain(page = 1, pageSize = 10) {
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

            const v3crosschainhistory = await fetchBlockchainData(`v3crosschain/${address}?page=${page}&pageSize=${pageSize}`);
            if (v3crosschainhistory) {
                displayV3CrosschainHistory(v3crosschainhistory);
            } 
            updateV3CrosschainPagination(v3crosschainhistory, page, pageSize);
        } catch (error) {
            console.error('Error fetching v2 crosschain history:', error);
        } finally {
            // Hide loading spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    }

    // Event listener for address format toggle
    document.getElementById('address-format').addEventListener('change', (event) => {
        useBase58 = event.target.checked;
        const activeTab = document.querySelector('.tab-button.active').dataset.tab;
        if (activeTab === 'history') {
            loadAddressDetails(currentPage, pageSize);
        } else if (activeTab === 'erc20-history') {
            const address = getQueryParam('address');
            fetchERC20Details(address);
            loadERC20History(currentPage, pageSize);
        } else if (activeTab === 'holders') {
            const address = getQueryParam('address');
            fetchERC20Details(address);
            loadHolders(currentPage, pageSize);
        }
    });

    // Hide holders tab by default
    document.querySelector('[data-tab="holders"]').style.display = 'none';

    // Initial load
    loadAddressDetails(currentPage, pageSize);
});
