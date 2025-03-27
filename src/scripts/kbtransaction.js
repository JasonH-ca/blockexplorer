document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified
    let ticker;

    let apiUrl;

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
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Function to get query parameter by name
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Function to format hex string
    function formatHexString(hexString) {
        if (hexString.length <= 66) {
            return hexString;
        }
        const firstLine = hexString.slice(0, 10); // 8 bytes (16 hex characters)
        const rest = hexString.slice(10);
        const regex = /.{1,64}/g; // 32 bytes (64 hex characters) per line
        console.log(rest.match(regex));
        const formattedRest = rest.match(regex).join('\n');
        return `${firstLine}\n${formattedRest}`;
    }

    // Load transaction details
    async function loadTransactionDetails() {
        const txid = getQueryParam('txid');
        if (txid) {
            const transactionData = await fetchBlockchainData(`transaction/${txid}`);
            if (transactionData) {
                const receipt = await fetchBlockchainData(`receipt/${txid}`);
                const blockHeight = parseInt(transactionData.blockNumber, 16);
                const gasLimit = parseInt(transactionData.gas, 16);
                const gasUsed = parseInt(receipt.gasUsed, 16);
                const gasPrice = parseInt(transactionData.gasPrice, 16);
                const gasCost = gasPrice * gasUsed;
                const value = parseInt(transactionData.value, 16) / 1e18;
                const transactionInfoDiv = document.getElementById('transaction-info');
                transactionInfoDiv.innerHTML = `
                    <h2>Transaction Details</h2>
                    <table id="transaction-info-table">
                        <tr>
                            <th>TxID</th>
                            <td>
                                <span class="transaction-id">
                                    ${transactionData.hash}
                                    <button id="copy-button"><i class="fas fa-copy"></i></button>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td>${parseInt(receipt.status, 16) === 1 ? 'Success' : 'Failed'}</td>
                        </tr>
                        <tr>
                            <th>Height</th>
                            <td><a href="kbblock.html?blockNumber=${blockHeight}&network=${blockchainNetwork}">${blockHeight.toLocaleString()}</a></td>
                        </tr>
                        <tr>
                            <th>From</th>
                            <td><a href="kbaddress.html?address=${transactionData.from}&network=${blockchainNetwork}"><span class="monospace">${transactionData.from}</span></a></td>
                        </tr>                        
                        <tr>
                            <th>To</th>
                            <td>${transactionData.to ? `<a href="kbaddress.html?address=${transactionData.to}&network=${blockchainNetwork}"><span class="monospace">${transactionData.to}</span></a>` : 'null'}</td>
                        </tr>
                        <tr>
                            <th>Value</th>
                            <td>${value}</td>
                        </tr>
                        <tr>
                            <th>Gas Price</th>
                            <td>${gasPrice}</td>
                        </tr>
                        <tr>
                            <th>Gas Limit & Usage</th>
                            <td>${gasLimit} | ${gasUsed}(${(gasUsed/gasLimit*100).toLocaleString('en-US',{maximumFractionDigits: 2})}%)</td>
                        </tr>
                        <tr>
                            <th>Nonce</th>
                            <td>${parseInt(transactionData.nonce, 16)}</td>
                        </tr>
                        <tr>
                            <th>Input Data</th>
                            <td><pre class="hex-data">${formatHexString(transactionData.input)}</pre></td>
                        </tr>
                    </table>
                `;

                // Add event listener to copy button
                document.getElementById('copy-button').addEventListener('click', function() {
                    navigator.clipboard.writeText(transactionData.hash).then(() => {
                        alert('Transaction ID copied to clipboard');
                    }).catch(err => {
                        console.error('Failed to copy transaction ID: ', err);
                    });
                });
            } else {
                console.error('Failed to load transaction data');
            }
        }
    }

    document.getElementById('logo-link').href = `../kanban.html?network=${blockchainNetwork}`;

    // Load transaction details on the transaction detail page
    loadTransactionDetails();
});