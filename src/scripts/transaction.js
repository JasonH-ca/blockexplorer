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
    function formatHexString(hexString, lineLength = 64) {
        const regex = new RegExp(`.{1,${lineLength}}`, 'g');
        return hexString.match(regex).join('\n');
    }

    // Load transaction details
    async function loadTransactionDetails() {
        const txid = getQueryParam('txid');
        if (txid) {
            const transactionData = await fetchBlockchainData(`transaction/${txid}`);
            if (transactionData) {
                const blockData = await fetchBlockchainData(`block/${transactionData.blockhash}`);
                const blockHeight = blockData ? blockData.height : 'Unknown';

                // Check if the transaction is a coinbase transaction
                const isCoinbase = transactionData.vin.some(input => input.coinbase);
                
                let transactionFee = 'n/a';
                if (!isCoinbase) {
                    // Calculate total input value
                    const totalInputValue = await Promise.all(transactionData.vin.map(async input => {
                        if (input.coinbase) {
                            return 0;
                        } else {
                            const vinDetails = await fetchBlockchainData(`transaction/${input.txid}`);
                            return vinDetails.vout[input.vout].value;
                        }
                    })).then(values => values.reduce((acc, val) => acc + parseFloat(val), 0));

                    // Calculate total output value
                    const totalOutputValue = transactionData.vout.reduce((acc, output) => acc + parseFloat(output.value), 0);

                    // Calculate transaction fee
                    transactionFee = totalInputValue - totalOutputValue;
                }

                const transactionInfoDiv = document.getElementById('transaction-info');
                transactionInfoDiv.innerHTML = `
                    <h2>Transaction Details</h2>
                    <table id="transaction-info-table">
                        <tr>
                            <th>TxID</th>
                            <td>
                                <span class="transaction-id">
                                    ${transactionData.txid}
                                    <button id="copy-button"><i class="fas fa-copy"></i></button>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <th>Height</th>
                            <td><a href="block.html?blockNumber=${blockHeight}&network=${blockchainNetwork}">${blockHeight.toLocaleString()}</a></td>
                        </tr>
                        <tr>
                            <th>Time</th>
                            <td>${new Date(transactionData.time * 1000).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <th>Size</th>
                            <td>${transactionData.size} bytes</td>
                        </tr>
                        <tr>
                            <th>Fee</th>
                            <td>${transactionFee !== 'n/a' ? transactionFee.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }) + ` ${ticker}` : 'n/a'}</td>
                        </tr>
                        <tr>
                            <th>Inputs</th>
                            <td>
                                <ul class="no-bullets">
                                ${await Promise.all(transactionData.vin.map(async input => {
                                    if (input.coinbase) {
                                        return `
                                            <li class="input-item">
                                                Coinbase<br>
                                                ${input.value ? `${parseFloat(input.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${ticker}` : ''}
                                            </li>
                                        `;
                                    } else {
                                        const vinDetails = await fetchBlockchainData(`transaction/${input.txid}`);
                                        const vinAddress = vinDetails.vout[input.vout].scriptPubKey.addresses ? vinDetails.vout[input.vout].scriptPubKey.addresses.join(', ') : 'n/a';
                                        const vinAmount = vinDetails.vout[input.vout].value;
                                        return `
                                            <li class="input-item">
                                                <a href="transaction.html?txid=${input.txid}&network=${blockchainNetwork}">${input.txid}</a><br>
                                                <a href="address.html?address=${vinAddress}&network=${blockchainNetwork}">${vinAddress}</a><br>
                                                ${vinAmount ? `${parseFloat(vinAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${ticker}` : ''}
                                            </li>
                                        `;
                                    }
                                })).then(vinItems => vinItems.join(''))}
                                </ul>
                            </td>
                        </tr>
                        <tr>
                            <th>Outputs</th>
                            <td>
                                <ul class="no-bullets">
                                    ${transactionData.vout.map(output => `
                                        <li class="output-item">
                                            ${output.scriptPubKey.addresses ? output.scriptPubKey.addresses.map(address => `<a href="address.html?address=${address}&network=${blockchainNetwork}">${address}</a>`).join(', ') : 'n/a'}<br>
                                            ${output.value ? `${parseFloat(output.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${ticker}` : `${output.scriptPubKey.type === 'call' ? 'call' : ''}`}
                                        </li>
                                    `).join('')}
                                </ul>
                            </td>
                        </tr>
                        <tr>
                            <th>Hex</th>
                            <td><pre class="hex-data">${formatHexString(transactionData.hex)}</pre></td>
                        </tr>
                    </table>
                `;

                // Add event listener to copy button
                document.getElementById('copy-button').addEventListener('click', function() {
                    navigator.clipboard.writeText(transactionData.txid).then(() => {
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

    document.getElementById('logo-link').href = `../index.html?network=${blockchainNetwork}`;

    // Load transaction details on the transaction detail page
    loadTransactionDetails();
});