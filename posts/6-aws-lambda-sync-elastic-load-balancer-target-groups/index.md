# Using AWS Lambda to sync an Elastic Load Balancer's Target Groups

Some of our services at [Homey](https://homey.app) use a public Application Load Balancer to balance load between targets (servers). These are managed by Elastic Beanstalk, which also handles the registering en de-registering of these targets.

Many microservices talk to this load balancer. To optimize latency and save on data-transfer costs, requests between microservices should be routed without leaving the VPC. So adding an internal load balancer is the natural solution, however, AWS does not allow you to have two load balancers use the same target group (a list of registered servers).

I made a Lambda function that runs every 5 minutes to synchronize targets from the external load balancer to the internal load balancer. I'm sharing it because at the time I didn't find anything like it.

```javascript
'use strict';

/*
 * This script does a one-way synchronization between two Target Groups of a Elastic Load Balancer (v2).
 * 
 * We use this to have an internal and external load balancer, where the external load balancer's target
 * groups are managed by Elastic Beanstalk.
 */

const AWS = require('aws-sdk');
const elb = new AWS.ELBv2();

const TARGET_GROUP_INTERNAL = 'arn:aws:elasticloadbalancing:eu-west-1:12345:targetgroup/my-elb-internal/abc123';
const TARGET_GROUP_EXTERNAL = 'arn:aws:elasticloadbalancing:eu-west-1:12345:targetgroup/awseb-AWSEB-AABBCC/def456';

exports.handler = async () => {
    
    // Get internal target groups
    const {
        TargetHealthDescriptions: internalTargets,
    } = await elb.describeTargetHealth({
        TargetGroupArn: TARGET_GROUP_INTERNAL,
    }).promise();
    
    // Get External Target Groups
    const {
        TargetHealthDescriptions: externalTargets,
    } = await elb.describeTargetHealth({
        TargetGroupArn: TARGET_GROUP_EXTERNAL,
    }).promise();
    
    // Remove targets from Internal Target Group if they're not in the external group
    const internalTargetsToRemove = internalTargets.filter(internalTarget => {
        const targetIsFoundInExternal = !!externalTargets.find(externalTarget => {
            return externalTarget.Target.Id === internalTarget.Target.Id;
        });
        return targetIsFoundInExternal === false;
    });
    
    if( internalTargetsToRemove.length ) {
        await elb.deregisterTargets({
            TargetGroupArn: TARGET_GROUP_INTERNAL,
            Targets: internalTargetsToRemove.map(internalTarget => ({
                Id: internalTarget.Target.Id,
            })),
        }).promise();
    }
    
    console.log(`Removed ${internalTargetsToRemove.length} targets.`);
    
    // Add targets to Internal Target Group
    const externalTargetsToAdd = externalTargets.filter(externalTarget => {
        const targetIsFoundInInternal = !!internalTargets.find(internalTarget => {
            return internalTarget.Target.Id === externalTarget.Target.Id;
        });
        return targetIsFoundInInternal === false;
    });

    if( externalTargetsToAdd.length ) {
        await elb.registerTargets({
            TargetGroupArn: TARGET_GROUP_INTERNAL,
            Targets: externalTargetsToAdd.map(externalTarget => ({
                Id: externalTarget.Target.Id,
            })),
        }).promise();
    }
    
    console.log(`Added ${externalTargetsToAdd.length} targets.`);
    
    return {
        statusCode: 200,
    };
};

```

This function is called every 5 minutes using an CloudWatch rule. Make sure the Lambda function has an IAM role that has access to modify ElasticLoadBalancing properties.