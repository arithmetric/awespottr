#!/usr/bin/env node

var _ = require('lodash');
var AWS = require('aws-sdk');
var chalk = require('chalk');
var moment = require('moment');
var program = require('commander');

var ec2Type = false;
var awsRegions = {};
var zones = {};
var lowPrice = false;
var lowZone = false;

program
  .version('0.3.0')
  .usage('[options] <EC2 instance types ...>')
  .option('-r, --region <AWS region>', 'Limit to the given region')
  .action(function(type) {
    ec2Type = type;
  })
  .parse(process.argv);

console.log('Checking spot prices for ' + ec2Type + ' instance type.');

function getRegions() {
  return new Promise(function(resolve, reject) {
    var ec2 = new AWS.EC2({apiVersion: '2016-04-01', region: 'us-west-2'});
    ec2.describeRegions({}, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        return reject(err);
      }

      var promises = [];
      if (data && data.Regions) {
        _.each(data.Regions, function(region) {
          if (region.RegionName && !awsRegions.hasOwnProperty(region.RegionName)) {
            awsRegions[region.RegionName] = {};
            promises.push(getRegionSpots(region.RegionName));
          }
        })
      }
      return Promise.all(promises).then(resolve);
    });
  });
}

function getRegionSpots(regionName) {
  return new Promise(function(resolve, reject) {
    var ec2 = new AWS.EC2({apiVersion: '2016-04-01', region: regionName});
    var params = {
      InstanceTypes: [ec2Type],
      ProductDescriptions: ['Linux/UNIX', 'Linux/UNIX (Amazon VPC)'],
      StartTime: moment().subtract(4, 'hours').utc().toDate()
    };
    ec2.describeSpotPriceHistory(params, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        return reject(err);
      }

      if (data && data.SpotPriceHistory) {
        _.each(data.SpotPriceHistory, function(sdata) {
          if (sdata.SpotPrice && sdata.Timestamp && sdata.AvailabilityZone) {
            var sdate = moment(sdata.Timestamp);
            if (!zones.hasOwnProperty(sdata.AvailabilityZone) || zones[sdata.AvailabilityZone].lastDate < sdate) {
              zones[sdata.AvailabilityZone] = {
                lastDate: sdate,
                lastPrice: sdata.SpotPrice,
                zone: sdata.AvailabilityZone
              };
              if (!lowPrice || Number(sdata.SpotPrice) < lowPrice) {
                lowPrice = Number(sdata.SpotPrice);
                lowZone = sdata.AvailabilityZone;
              }
            }
          }
        });
      }
      resolve();
    });
  });
}

function handleResults() {
  console.log('\n' + _.padEnd('AWS Zone', 24) + ' ' + _.padEnd('Hourly Rate', 12));
  console.log(_.pad('', 24, '-') + ' ' + _.pad('', 12, '-'));
  var sortedZones = _.values(zones);
  sortedZones = _.sortBy(sortedZones, function(val) { return Number(val.lastPrice); }, 'zone');
  _.each(sortedZones, function(data) {
    var msg = _.padEnd(data.zone, 24) + ' ' + _.padEnd('$' + data.lastPrice, 12);
    if (data.zone === lowZone || data.lastPrice === lowPrice) {
      msg = chalk.green(msg);
    } else if (lowPrice * 1.1 >= data.lastPrice) {
      msg = chalk.yellow(msg);
    }
    console.log(msg);
  });
  console.log(chalk.green('\nCheapest hourly rate for ' + ec2Type + ' is $' + lowPrice + ' in zone ' + lowZone));
}

if (program.region) {
  console.log('Limiting results to region ' + program.region);
  getRegionSpots(program.region)
    .then(handleResults)
    .catch(function(err) {
      console.log('error', err);
    });
} else {
  getRegions(program.region)
    .then(handleResults)
    .catch(function(err) {
      console.log('error', err);
    });
}
