'use strict'
/* global describe it */
const chai = require('chai')
chai.use(require('chai-diff'))
chai.config.showDiff = true
const expect = chai.expect
const sinon = require('sinon')
const AWS = require('aws-sdk')
const cli = require('./cli')

const RESULTS = {
  'eu-north-1': {
    'm5.metal': [
      { AvailabilityZone: 'eu-north-1c',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '0.917300',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'eu-north-1b',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '0.917300',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'eu-north-1a',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '0.917300',
        Timestamp: '2019-03-06T00:54:47.000Z' }
    ],
    'm5.24xlarge': [
      { AvailabilityZone: 'eu-north-1a',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '0.957800',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'eu-north-1b',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.457100',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'eu-north-1c',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.457100',
        Timestamp: '2019-03-06T00:54:47.000Z' }
      ]
  },
  'us-east-1': {
    'm5.metal': [
      { AvailabilityZone: 'us-east-1a',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.088200',
        Timestamp: '2019-03-05T22:05:47.000Z' },
      { AvailabilityZone: 'us-east-1f',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.088200',
        Timestamp: '2019-03-05T22:05:47.000Z' },
      { AvailabilityZone: 'us-east-1d',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.088200',
        Timestamp: '2019-03-05T22:05:47.000Z' }
    ],
    'm5.24xlarge': [
      { AvailabilityZone: 'us-east-1a',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '0.957800',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'us-east-1b',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.457100',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'us-east-1c',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.457100',
        Timestamp: '2019-03-06T00:54:47.000Z' }
    ]
  },
  'us-west-2': {
    'm5.metal': [
      { AvailabilityZone: 'us-west-2c',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.081800',
        Timestamp: '2019-03-05T21:40:30.000Z' },
      { AvailabilityZone: 'us-west-2a',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.081800',
        Timestamp: '2019-03-05T21:40:30.000Z' },
      { AvailabilityZone: 'us-west-2b',
        InstanceType: 'm5.metal',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.081800',
        Timestamp: '2019-03-05T21:40:30.000Z' }
    ],
    'm5.24xlarge': [
      { AvailabilityZone: 'us-west-2a',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '0.957800',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'us-west-2b',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.457100',
        Timestamp: '2019-03-06T00:54:47.000Z' },
      { AvailabilityZone: 'us-west-2c',
        InstanceType: 'm5.24xlarge',
        ProductDescription: 'Linux/UNIX',
        SpotPrice: '1.457100',
        Timestamp: '2019-03-06T00:54:47.000Z' }
    ]

  }
}

class EC2Stub {
  constructor (params) {
    this.region = params.region
  }
  
  describeRegions(params = {}, callback) {
    callback(null, {
      Regions: [
        { Endpoint: 'ec2.eu-north-1.amazonaws.com',
          RegionName: 'eu-north-1' },
        { Endpoint: 'ec2.us-east-1.amazonaws.com',
          RegionName: 'us-east-1' },
        { Endpoint: 'ec2.us-west-2.amazonaws.com',
          RegionName: 'us-west-2' }
      ]
    })
  }
  describeSpotPriceHistory(params = {}, callback) {
    const results = {
      NextToken: '',
      SpotPriceHistory: []
    }
    for (let itype of params.InstanceTypes) {
      if (RESULTS[this.region][itype]) {
        results.SpotPriceHistory = results.SpotPriceHistory.concat(RESULTS[this.region][itype])
      }
    }
    callback(null, results)
  }
}

describe('Awespottr', function () {
  beforeEach( function (done) {
    this.sandbox = sinon.createSandbox()
    this.sandbox.stub(AWS, 'EC2').callsFake(args => new EC2Stub(args))
    const orig = console.log
    this.consoleout = ''
    this.sandbox.stub(console, 'log').callsFake(a => {
      this.consoleout += a + "\n"
    })
    done()
  })
  it('does an all-region lookup, single instance type', function (done) {
    process.argv = ['node', 'cli.js', 'm5.metal']
    cli.standalone(() => {
      this.sandbox.restore()
      expect(this.consoleout).not.to.be.differentFrom(`Checking spot prices for [m5.metal] instance type(s).

Instance Type    AWS Zone                 Hourly Rate 
---------------- ------------------------ ------------
\u001b[33mm5.metal         eu-north-1a              $0.917300   \u001b[39m
\u001b[33mm5.metal         eu-north-1b              $0.917300   \u001b[39m
\u001b[32mm5.metal         eu-north-1c              $0.917300   \u001b[39m
m5.metal         us-west-2a               $1.081800   
m5.metal         us-west-2b               $1.081800   
m5.metal         us-west-2c               $1.081800   
m5.metal         us-east-1a               $1.088200   
m5.metal         us-east-1d               $1.088200   
m5.metal         us-east-1f               $1.088200   
\u001b[32m
Cheapest hourly rate for [m5.metal] is $0.9173 in zone eu-north-1c\u001b[39m
`)
      done()
    })
  })
  it('does a all-region lookup, multiple instance types', function (done) {
    process.argv = ['node', 'cli.js', 'm5.metal', 'm5.24xlarge', 'm0.fakebox']
    cli.standalone(() => {
      this.sandbox.restore()
      expect(this.consoleout).not.to.be.differentFrom(`Checking spot prices for [m5.metal, m5.24xlarge] instance type(s).

Instance Type    AWS Zone                 Hourly Rate 
---------------- ------------------------ ------------
\u001b[33mm5.metal         eu-north-1a              $0.917300   \u001b[39m
\u001b[33mm5.metal         eu-north-1b              $0.917300   \u001b[39m
\u001b[32mm5.metal         eu-north-1c              $0.917300   \u001b[39m
\u001b[33mm5.24xlarge      eu-north-1a              $0.957800   \u001b[39m
\u001b[33mm5.24xlarge      us-east-1a               $0.957800   \u001b[39m
\u001b[33mm5.24xlarge      us-west-2a               $0.957800   \u001b[39m
m5.metal         us-west-2a               $1.081800   
m5.metal         us-west-2b               $1.081800   
m5.metal         us-west-2c               $1.081800   
m5.metal         us-east-1a               $1.088200   
m5.metal         us-east-1d               $1.088200   
m5.metal         us-east-1f               $1.088200   
m5.24xlarge      eu-north-1b              $1.457100   
m5.24xlarge      eu-north-1c              $1.457100   
m5.24xlarge      us-east-1b               $1.457100   
m5.24xlarge      us-east-1c               $1.457100   
m5.24xlarge      us-west-2b               $1.457100   
m5.24xlarge      us-west-2c               $1.457100   
\u001b[32m
Cheapest hourly rate for [m5.metal, m5.24xlarge] is $0.9173 in zone eu-north-1c\u001b[39m
`)
      done()
    })
  })
  it('does a single-region lookup, single instance type', function (done) {
    process.argv = ['node', 'cli.js', '-r', 'eu-north-1', 'm5.metal']
    cli.standalone(() => {
      this.sandbox.restore()
      expect(this.consoleout).not.to.be.differentFrom(`Checking spot prices for [m5.metal] instance type(s).
Limiting results to region eu-north-1

Instance Type    AWS Zone                 Hourly Rate 
---------------- ------------------------ ------------
\u001b[33mm5.metal         eu-north-1a              $0.917300   \u001b[39m
\u001b[33mm5.metal         eu-north-1b              $0.917300   \u001b[39m
\u001b[32mm5.metal         eu-north-1c              $0.917300   \u001b[39m
\u001b[32m
Cheapest hourly rate for [m5.metal] is $0.9173 in zone eu-north-1c\u001b[39m
`)
      done()
    })
  })
  it('does a single-region lookup, multiple instance types', function (done) {
    process.argv = ['node', 'cli.js', '-r', 'eu-north-1', 'm5.metal', 'm5.24xlarge', 'm0.fakebox']
    cli.standalone(() => {
      this.sandbox.restore()
      expect(this.consoleout).not.to.be.differentFrom(`Checking spot prices for [m5.metal, m5.24xlarge] instance type(s).
Limiting results to region eu-north-1

Instance Type    AWS Zone                 Hourly Rate 
---------------- ------------------------ ------------
\u001b[33mm5.metal         eu-north-1a              $0.917300   \u001b[39m
\u001b[33mm5.metal         eu-north-1b              $0.917300   \u001b[39m
\u001b[32mm5.metal         eu-north-1c              $0.917300   \u001b[39m
\u001b[33mm5.24xlarge      eu-north-1a              $0.957800   \u001b[39m
m5.24xlarge      eu-north-1b              $1.457100   
m5.24xlarge      eu-north-1c              $1.457100   
\u001b[32m
Cheapest hourly rate for [m5.metal, m5.24xlarge] is $0.9173 in zone eu-north-1c\u001b[39m
`)
      done()
    })
  })
  it('does a single-region lookup, multiple instance types, limited to top 3', function (done) {
    process.argv = ['node', 'cli.js', '-n', '3', '-r', 'eu-north-1', 'm5.metal', 'm5.24xlarge', 'm0.fakebox']
    cli.standalone(() => {
      this.sandbox.restore()
      expect(this.consoleout).not.to.be.differentFrom(`Checking spot prices for [m5.metal, m5.24xlarge] instance type(s).
Limiting results to region eu-north-1

Instance Type    AWS Zone                 Hourly Rate 
---------------- ------------------------ ------------
\u001b[33mm5.metal         eu-north-1a              $0.917300   \u001b[39m
\u001b[33mm5.metal         eu-north-1b              $0.917300   \u001b[39m
\u001b[32mm5.metal         eu-north-1c              $0.917300   \u001b[39m
\u001b[32m
Cheapest hourly rate for [m5.metal, m5.24xlarge] is $0.9173 in zone eu-north-1c\u001b[39m
`)
      done()
    })
  })
})
