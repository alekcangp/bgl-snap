checkFlask();
async function checkFlask() {
    try { 
      const result = await ethereum.request({
        method: 'wallet_enable',
        params: [{}]
      })
    } catch (e) {
    if (e.code != -32602) {
      document.getElementById('connect').style.display = 'none'; 
      document.getElementById('content').style.borderWidth = '1px'; 
      document.getElementById('unavailable').style.display = 'block';
      if (window.ethereum==undefined) {document.getElementById('dis').style.display = 'none';}
    }
    }
}
    const fee = 10000;
    const snapId = `npm:bgl-snap`;
    const connectButton = document.getElementById('connect')
    const queryAddress = document.getElementById('addressInput');
    const queryAmount = document.getElementById('amountInput');
    const maxButton = document.getElementById('max');
    const sendButton = document.getElementById('send')
    var WIF = '', ADDRESS = '', BALANCE = '', apiUtxo = [], newTx = '', toAddress = '', toAmount = '', run = false;
//////////////
    jsbtc.asyncInit(window);
/////////////
    connectButton.addEventListener('click', connect)
    queryAddress.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { 
        sendTx()
      }
    })
    queryAmount.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { 
        sendTx()
      }
    })

    maxButton.addEventListener('click', setMax);
    sendButton.addEventListener('click', sendTx)

/////////////////////////////

    // here we get permissions to interact with and install the snap
    async function connect () {
      const result = await ethereum.request({
        method: 'wallet_enable',
        params: [{
          wallet_snap: { [snapId]: {} },
        }]
      })

      if(result) { 
        // user is now connected, enable the dApp UI
        var elements = document.getElementsByClassName("disconnected");
        for (var i = 0; i < elements.length; i++) { 
          var el = elements.item(i); 
          el.style.display = 'none'; 
        }
        document.getElementById('content').style.borderWidth = '1px'; 
        elements = document.getElementsByClassName("connected"); 
        for (i = 0; i < elements.length; i++) { 
          var el = elements.item(i); 
          el.style.display = 'block'; 
        }
        //document.getElementById('addressInput').focus(); 
        getEntropy();
      } 
    }
//////////////////////////////////
    function setMax() {
      var sum = BALANCE - fee, res = 0;
      if (sum > 0) {res = (BALANCE - fee) / 1e8}
      document.getElementById('amountInput').value = res
    }
/////////////////////////////////
    async function getNotify (mes) {
      try {
        const response = await ethereum.request({
          method: 'wallet_invokeSnap',
          params: [snapId, {
            method: 'notify',
            params: {
              type: 'inApp',
              message: mes,
              },
          }]
        })
      } catch (err) {
        console.error(err)
        alert('Problem happened: ' + err.message || err)
      }
    }
////////////////////////////////////
    async function getConfirm () {
      try {
          const response = await ethereum.request({
            method: 'wallet_invokeSnap',
            params: [snapId, {
              method: 'confirm', 
              params: {
                promt: 'Sign Bitgesell Transaction',
                description: `Please verify this ongoing Transaction from ${document.domain}`,
                textAreaContent: `From: ${ADDRESS}         To: ${toAddress}       Amount: ${toAmount/1e8}           Fee: 0.0001           ChangeAddress: ${ADDRESS}`,
              },
            }]
          })
          run = response;
      } catch (err) {
        console.error(err); alert(err)
      }
    }

////////////////////////////////////////

    async function getEntropy () {
      document.getElementById("fox").innerHTML = 'Loading...'
      try {
        const response = await ethereum.request({
          method: 'wallet_invokeSnap',
          params: [snapId, {
            method: 'entropy'
          }]
        })
        //await jsbtc.asyncInit();
        WIF = privateKeyToWif(response.privateKey.slice(2));
        const a = new Address(WIF);
        ADDRESS = a.address;
        document.getElementById("fox").innerHTML = `<a target="blank" href="https://explorer.bglnode.online/address/${ADDRESS}">${ADDRESS}</a>`;
        getBalance()
        setInterval(getBalance, 30000)
      } catch (err) {
        console.error(err)
        alert('Problem happened: ' + err.message || err)
      }
    }
   
//////////////////////////////////

function getBalance() {
  const url = `https://api.bitaps.com/bgl/v1/blockchain/address/state/${ADDRESS}`;
  axios.get(url).then(function(res) {
    BALANCE = res.data.data.balance + res.data.data.pendingReceivedAmount - res.data.data.pendingSentAmount ;
    document.getElementById("balance").innerHTML = `${(BALANCE / 1e8)}`
  }).catch(function(e) {alert(e); run = false})
}

////////////////////////////////////

function checkForm() {
  try {
 mes = '';
 toAddress = document.getElementById('addressInput').value;
 toAmount = document.getElementById('amountInput').value * 1e8;
 if (Number.isNaN(toAmount) || toAmount <= 0) {mes += 'Amount is not valid. '}
 else if (BALANCE < toAmount + fee) {mes += 'Insufficient balance.'}
 const isValid = isAddressValid(toAddress);
 if (!isValid) {mes += 'Address is not valid.' }
 if (mes) {run = false; alert(mes);}
  } catch(e){alert(e)}
}

////////////////////////////////

async function getAddressUtxo() {
  var str="";
//confirmed UTXO
  const url1 = `https://api.bitaps.com/bgl/v1/blockchain/address/utxo/${ADDRESS}`;
	await axios.get(url1).then(function(res) {
    apiUtxo = res.data.data;
  }).catch(function(e) {alert(e + ` Error in get address confirmed UTXO query: ${url1}`)})
// unconfirmed UTXO
  const url2 = `https://explorer.bglnode.online/api/v1/address/${ADDRESS}/txs`;
  await axios.get(url2).then(function(res) {
    var utxom = res.data;
    const arr = utxom.filter(word => word.status.confirmed == false);
    str = JSON.stringify(arr).toString();
    for (var i=0; i < arr.length; i++) {
      var txid = arr[i].txid;
      var index = arr[i].firstSeen;
      for (var t = 0; t < arr[i].vout.length; t++) {
        var out = arr[i].vout[t].scriptpubkey_address;
        var amount = arr[i].vout[t].value;
        if (out == ADDRESS) {
          var sea = txid + '","vout":' + t;
          var pos = str.indexOf(sea);
          if (pos == -1) {
            apiUtxo.push({"txId":txid, "vOut":t, "amount":amount, "txIndex":index})
          }  
        }
      }
    }
  }).catch(function(e) {alert(e + ` Error in get address unconfirmed UTXO query: ${url2}`)})
  
  /*
     const url3 = `https://api.bitaps.com/bgl/v1/blockchain/address/unconfirmed/transactions/${address}`;
    await axios.get(url3).then(function(res) {
    var utxou = res.data.data.list[0];
    var index = utxou.timestamp;
    var pos = str.indexOf(utxou.txId + '","');
          if (pos == -1) {alert(utxou.txId);
            apiUtxo.push({"txId":utxou.txId, "vOut":1, "amount":utxou.amount + utxou.fee + utxou.outputsAmount, "txIndex":index})
            //alert(pos + " " + sea);
          }  
    alert(JSON.stringify(apiUtxo)); 
  }).catch(function(e) {alert(e)})
*/
  //await getBalance();
  //
  //generateTransaction();
}; 

////////////////////////////////

function generateTransaction() {
  var bal = 0;
	const tx = new Transaction();
	if (apiUtxo.length > 0) {
    apiUtxo.sort(function(a,b){ 
  return b.txIndex - a.txIndex
  })
		for (var i=0; i < apiUtxo.length; i++) {
			const utxo = apiUtxo[i];
      bal += utxo.amount;
			tx.addInput({
				txId: utxo.txId,
				vOut: utxo.vOut,
				address: ADDRESS,
			});
      if (bal >= toAmount + fee) { apiUtxo = apiUtxo.slice(0,i+1); break}
		}
   
  const fromAmount = bal - toAmount - fee;
		tx.addOutput({
			value: toAmount,
			address: toAddress,
		});
		if (fromAmount > 0) {
			tx.addOutput({
				value: fromAmount,
				address: ADDRESS,
			});
		}

		for (var i=0; i < apiUtxo.length; i++) {
			const utxo = apiUtxo[i];
			tx.signInput(i, {
				privateKey: WIF,
				value: utxo.amount,
			});
		}
		newTx = tx.serialize();
   // send();
	}
  else {run = false}
};

async function sendTx() {
run = true;
document.getElementById('send').disabled = true;	
await getBalance();
if (run) await checkForm()
if (run) await getConfirm()
if (run) await getAddressUtxo() // get confirmed and unconfirmed outs
if (run) await generateTransaction() // generate and sign tx
if (run) await post()
var txid;
async function post() {
 document.getElementById('txs').innerText = 'Processing...'
 await axios.post("https://explorer.bglnode.online/api/v1/tx", `${newTx}`).then(function(res){
  txid = res.data; 
  }).catch(function(e){  
    axios.post("https://bglnode.online", `{"jsonrpc":"1.0","id":"curltext","method":"sendrawtransaction","params":["${newTx}"]}`).then(function(res){
    txid = res.data.result;
    }).catch(function(e){
      axios.post("https://pool.bitaps.com", `{"jsonrpc":"1.0","id":"curltext","method":"sendrawtransaction","params":["${newTx}"]}`).then(function(res){
      txid = res.data.result;
      }).catch(function(e){alert(e + 'Send Tx'); run = false})  
    })
  })
}

if (run) {
  var mes = `${toAmount/1e8} &rArr; <a target="blank" href="https://explorer.bglnode.online/address/${toAddress}">${toAddress}</a>`
  var str = `${mes} <a target="blank" href="https://explorer.bglnode.online/tx/${txid}">&equiv;</a>`
  getNotify(`Sent ${toAmount/1e8} BGL ${toAddress.slice(0,20)}...`);
} else {str = ""}
setTimeout(() => {
  document.getElementById('txs').innerHTML = str;
  document.getElementById('send').disabled = false;
  getBalance();
}, 7000)
}
}
