const Exchange = require('../Exchange');
const WebSocket = require('ws');
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

class Kraken extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'kraken';

		this.mapping = {
			BCHEUR: 'BCHEUR',
			BCHUSD: 'BCHUSD',
			BCHBTC: 'BCHXBT',
			DASHEUR: 'DASHEUR',
			DASHUSD: 'DASHUSD',
			DASHBTC: 'DASHXBT',
			EOSETH: 'EOSETH',
			EOSEUR: 'EOSEUR',
			EOSUSD: 'EOSUSD',
			EOSBTC: 'EOSXBT',
			GNOETH: 'GNOETH',
			GNOEUR: 'GNOEUR',
			GNOUSD: 'GNOUSD',
			GNOBTC: 'GNOXBT',
			USDTUSD: 'USDTZUSD',
			ETCETH: 'XETCXETH',
			ETCBTC: 'XETCXXBT',
			ETCEUR: 'XETCZEUR',
			ETCUSD: 'XETCZUSD',
			ETHBTC: 'XETHXXBT',
			ETHCAD: 'XETHZCAD',
			ETHEUR: 'XETHZEUR',
			ETHGBP: 'XETHZGBP',
			ETHJPY: 'XETHZJPY',
			ETHUSD: 'XETHZUSD',
			ICNETH: 'XICNXETH',
			ICNBTC: 'XICNXXBT',
			LTCBTC: 'XLTCXXBT',
			LTCEUR: 'XLTCZEUR',
			LTCUSD: 'XLTCZUSD',
			MLNETH: 'XMLNXETH',
			MLNBTC: 'XMLNXXBT',
			REPETH: 'XREPXETH',
			REPBTC: 'XREPXXBT',
			REPEUR: 'XREPZEUR',
			REPUSD: 'XREPZUSD',
			BTCCAD: 'XXBTZCAD',
			BTCEUR: 'XXBTZEUR',
			BTCGBP: 'XXBTZGBP',
			BTCJPY: 'XXBTZJPY',
			BTCUSD: 'XXBTZUSD',
			XDGBTC: 'XXDGXXBT',
			XLMBTC: 'XXLMXXBT',
			XLMEUR: 'XXLMZEUR',
			XLMUSD: 'XXLMZUSD',
			XMRBTC: 'XXMRXXBT',
			XMREUR: 'XXMRZEUR',
			XMRUSD: 'XXMRZUSD',
			XRPBTC: 'XXRPXXBT',
			XRPCAD: 'XXRPZCAD',
			XRPEUR: 'XXRPZEUR',
			XRPJPY: 'XXRPZJPY',
			XRPUSD: 'XXRPZUSD',
			ZECBTC: 'XZECXXBT',
			ZECEUR: 'XZECZEUR',
			ZECJPY: 'XZECZJPY',
			ZECUSD: 'XZECZUSD'
		};

		this.options = Object.assign({
			url: 'https://api.kraken.com/0/public/Trades',
			interval: 3000
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

		this.schedule();

		this.emitOpen();
	}

	schedule() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(this.get.bind(this), this.options.interval);
	}

	get() {
		const token = axios.CancelToken;
		this.source = token.source();

		const params = {
			pair: this.pair
		}

		if (this.reference) {
			params.since = this.reference;
		}

		/*const headers = {
			'API-Key': this.options.key,
			'API-Sign': this.getSignature(this.getUrl(), params)
		}*/

		axios.get(this.getUrl(), {
			// headers: headers,
			params: params,
			cancelToken: this.source.token
		})
			.then(response => {
				if (!response.data || (response.data.error && response.data.error.length)) {
					throw new Error(response.data.error.join("\n"));
				}

				this.emitData(this.format(response.data));

				this.schedule();
			})
			.catch(error => {
				if (axios.isCancel(error)) {
					return;
				}

				this.emitError(error);
				this.emitClose();

				return error;
			})
			.then(() => {
				delete this.source;
			})
	}

	disconnect() {
    if (!super.disconnect())  
      return;

		clearTimeout(this.timeout);
		this.source && this.source.cancel();

		delete this.reference;

		this.emitClose();
	}

	format(response) {
		const initial = typeof this.reference === 'undefined';

		if (response.result && response.result[this.pair]) {
			if (response.result.last) {
				this.reference = response.result.last;
			}

			if (!initial) {
				const output = [];
				for (let trade of response.result[this.pair]) {

					output.push([
						this.id + String(trade[2]).replace(/\D/, '') + trade[3] + trade[4], // id
						trade[2] * 1000, // timestamp
						+trade[0], // price
						+trade[1], // volume
						trade[3] === 'b' ? 1 : 0, // is buy
						trade[4] === 'l' ? 1 : 0, // is limit
					]);
				}

				return output;
			}
		}
	}

	getSignature(path, params) {
		const message = qs.stringify(params);
		const secret_buffer = new Buffer(this.options.secret, 'base64');
		const hash = new crypto.createHash('sha256');
		const hmac = new crypto.createHmac('sha512', secret_buffer);
		const hash_digest = hash.update((new Date() * 1000) + message).digest('binary');
		const hmac_digest = hmac.update(path + hash_digest, 'binary').digest('base64');

		return hmac_digest;
	}

}

module.exports = Kraken;