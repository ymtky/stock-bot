const fetch = require('node-fetch');

module.exports = ( robot => {
  robot.respond(/(.*)\s(.*)/, msg => {
    Promise.all([fetchCurrentStockData(msg.match[2]), fetchDailyStockData(msg.match[2])]).then(values => {
      const current = values[0]
      //日次データから最新の前日のデータを取り出す
      const dailyLatest = values[1][values[1].length - 1]
      const dailyOneBefore = values[1][values[1].length - 2]
      const yesterday = dailyLatest['DATE'].getMonth() == current['DATE'].getMonth()
        && dailyLatest['DATE'].getDate() == current['DATE'].getDate() ? dailyOneBefore : dailyLatest
      const diff = current['CLOSE'] - yesterday['CLOSE']
      const ratio = Math.round(diff / yesterday['CLOSE'] * 10000) / 100
      const prefix = diff >= 0 ? "+" : ""
      msg.send("現在の株価:" + current['CLOSE'] + "\n前日比:" + prefix + diff + '(' + prefix + ratio + '%)')
    })
  })
})

//最新の株価を取得する
const fetchCurrentStockData = function(code) {
  return fetchStockData(code, 60, '1d').then(values => values[values.length - 1])
}

//日次の株価を取得する
const fetchDailyStockData = function(code) {
  return fetchStockData(code, 86400, '1M').then(values => values)
}

//リクエストを行う
const fetchStockData = function(code, interval, period) {
  const url = "https://www.google.com/finance/getprices"
  const params = {
    'q': code,
    'i': interval,
    'x': 'TYO',
    'p': period
  }
  const uri = url + '?' +  Object.keys(params).map(k => k + '=' + params[k]).join('&')
  return fetch(uri, {method: 'GET'})
    .then(response => response.text())
    .then(text => parseResponse(text, interval))
}

//レスポンスをパースしたオブジェクトに格納する
const parseResponse = function(response, interval) {
  const lines = response.trim().split("\n")
  const prices = lines.slice(8)
  const baseTimastamp = parseInt(prices[0].split(",")[0].slice(1))
  const columns = ['DATE', 'CLOSE', 'HIGH', 'LOW', 'OPEN', 'VOLUME']
  return prices.map(row => {
    let values = {}
    const cols = row.split(',')
    columns.forEach((item, index) => {
      if(item == 'DATE') {
        //date型に変換する
        const elapsed = /^[0-9]+$/g.test(cols[index]) ? cols[index] : 0
        values[item] = new Date((baseTimastamp + interval * elapsed) * 1000)
      } else {
        values[item] = cols[index]
      }
    })
    return values
  })
}
