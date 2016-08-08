# awespottr
## Find the cheapest EC2 spot prices across all regions

Usage:

- `node cli.js <ec2 type>`

- `AWS_PROFILE=awespottr node cli.js g2.8xlarge`

Minimal IAM policy:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1470583998000",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeRegions",
                "ec2:DescribeSpotPriceHistory"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

Example output:

```
Checking spot prices for m4.2xlarge instance type.

AWS Zone                 Hourly Rate
------------------------ ------------
eu-west-1b               $0.063000
eu-central-1a            $0.067000
eu-central-1b            $0.072700
ap-northeast-2c          $0.073300
ap-southeast-2b          $0.078100
us-west-2c               $0.078100
ap-southeast-1a          $0.079800
ap-southeast-1b          $0.081200
eu-west-1c               $0.086200
ap-northeast-1a          $0.086600
us-east-1e               $0.088900
ap-northeast-1c          $0.090200
us-west-1c               $0.091600
us-west-1b               $0.096700
ap-northeast-2a          $0.096800
eu-west-1a               $0.099200
ap-southeast-2a          $0.099600
ap-southeast-2c          $0.103100
us-east-1a               $0.178500
ap-south-1a              $0.292000
us-west-2b               $0.390700
ap-south-1b              $0.430000
us-east-1c               $0.479000
us-west-2a               $1.000000
us-east-1d               $1.500000

Cheapest hourly rate for m4.2xlarge is $0.063000 in zone eu-west-1b
```
