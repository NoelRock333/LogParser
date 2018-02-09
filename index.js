const fs = require('fs');
const lineReader = require('line-reader');
const papaparse = require('papaparse');
const async = require('async');

let filesContent = [];
let sum = 0;

var failedOrdersCSV = fs.readFileSync('../Downloads/failed_orders.csv', 'utf8');
// console.log(failedOrders);
var failedOrders = papaparse.parse(failedOrdersCSV, { header: true });
console.log(failedOrders.data);

var files = fs.readdirSync('../Downloads/payeezylogs/');

async.eachSeries(files, function iteratee(logFile, callback) {
  readFile('../Downloads/payeezylogs/'+logFile).then(({ size }) => {
    sum += size;
    callback(null);
  });
}, function done() {
  console.log(sum);
  console.log(filesContent.length);
  // console.log(filesContent.length);
  var finalResult = [];
  failedOrders.data.forEach(function(order) {
    filesContent.find(item => {
      // console.log(item.merchant_ref, order.Number);
      if (item.transaction_id && item.merchant_ref == order.Number) {
        finalResult.push(item);
      }
    })
  });
  var csv = papaparse.unparse(finalResult);
  fs.writeFile('./result.csv', csv, function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
});

/*fs.readdirSync('../Downloads/payeezylogs/').forEach(async function(logFile) {
  var result = await readFile('../Downloads/payeezylogs/'+logFile);
  console.log(logFile);
  // console.log(result);
  // var csv = papaparse.unparse(result.completed);
  // fs.writeFile('./' + logFile + '.csv', csv, function (err) {
  //   if (err) throw err;
  //   console.log('Saved!');
  // });

  var csv = papaparse.unparse(result.incomplet);
  fs.writeFile('./' + logFile + '_onlyorders.csv', csv, function (err) {
    if (err) throw err;
    // console.log('only_orders Saved!');
  });
});*/

function readFile(file) {
  // read file line by line
  return new Promise((resolve, reject) => {
    var results = [];
    var resultsIncomplet = [];
    lineReader.eachLine(file, function(line, isLast) {
      if (line.indexOf('{') != -1) {
        var start = line.indexOf('{');
        var end = line.lastIndexOf('}') + 1;
        var object = JSON.parse(line.substring(start, end));
        if (object.transaction_id) {
          var text = line.substring(0, start);
          var regex = /RESPONSE FOR ORDER# (.*?)\:/;
          var order_id = regex.exec(text)[1];
          results.push({
            merchant_ref: order_id,
            transaction_id: object.transaction_id,
            correlation_id: object.correlation_id,
            transaction_tag: object.transaction_tag,
            transaction_status: object.transaction_status,

            method: object.method,
            amount: object.amount,
            currency_code: 'USD'
          })
        } else {
          var regex = /RESPONSE FOR ORDER# (.*?)\:/;
          var order_id = regex.exec(line);
          if (order_id) {
            resultsIncomplet.push({
              merchant_ref: order_id[1]
            });
            var start = line.indexOf('{');
            var end = line.lastIndexOf('}') + 1;
            var object = JSON.parse(line.substring(start, end));
            // console.log(object.transaction_status)
            //console.log(order_id[1], 'sin transaction_id');
          } else {
            // var regex = /REQUEST FOR ORDER# (.*?)\:/;
            // var order_id = regex.exec(line);
            // if (order_id)
            //   console.log(order_id[1]);
            // else 
            //   console.log(line);
          }
        }
      }
      if (isLast) {
        filesContent = [...filesContent, ...results];
        var size = results.length + resultsIncomplet.length;
        resolve({ completed: results, incomplet: resultsIncomplet, size: size });
      }
    });
  });
}
